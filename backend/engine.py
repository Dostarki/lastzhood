import asyncio
import logging
import math
import random
import time
import uuid
from world import WEAPONS, free, move, interior_at
from combat import shoot, update_projectiles
from zombies import update_zombies
from enemy_types import spawn_enemies
from enemy_damage import update_statuses
from boss_catalog import initial_bosses, boss_snapshot
from bosses import update_bosses
from network import ClientChannel
from game_settings import GameSettings
from inventory import new_inventory, inventory_snapshot
from spawning import spawn_position
from bots import update_bots, remove_bot


class Game:
    def __init__(self, save_score):
        self.players, self.zombies = {}, {}
        self.events, self.drops = [], []
        self.projectiles, self.fires = [], []
        self.swarms = []
        self.bosses = initial_bosses()
        self.boss_projectiles, self.boss_zones = [], []
        self.save_score = save_score
        self.counter = 0
        self.tasks = set()
        self.tick_seq = 0
        self.tick_ms = 0
        self.tick_overruns = 0
        self.settings = GameSettings().model_dump()
        self.zombie_factor = 1
        self.admission_lock = asyncio.Lock()

    def persist(self, player):
        if player.get('bot'):
            return
        task = asyncio.create_task(self.save_score(dict(player)))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def admit_player(self, session, ws):
        # Called AFTER websocket acceptance: concurrent handshakes cannot overbook.
        async with self.admission_lock:
            if sum(not p.get('bot') for p in self.players.values()) >= 200:
                return None
            if len(self.players) >= 200:
                victim = next((p for p in self.players.values() if p.get('bot')), None)
                if victim is None:
                    return None
                remove_bot(self, victim)
            return self.add_player(session, ws)

    def add_player(self, session, ws, bot=False):
        player = {'id': uuid.uuid4().hex[:12], 'name': session['name'], 'weapon': 'glock18', 'skin': session.get('skin', 'soldier'), 'ws': ws, 'bot': bot}
        if not bot:
            player['channel'] = ClientChannel(ws)
        self.reset(player)
        self.players[player['id']] = player
        self.spawn_zombies(player, 12)
        return player

    def reset(self, p):
        now = time.monotonic()
        x, z = spawn_position(self)
        p['weapon'] = 'glock18'
        p['inventory'] = new_inventory()
        p['weapon_ready_at'] = 0
        for key in ('path', 'next_path', 'roam_until', 'roam_x', 'roam_z'):
            p.pop(key, None)
        p.update(x=x, z=z, angle=0, hp=100, ammo=WEAPONS[p['weapon']]['mag'], reserve=WEAPONS[p['weapon']]['reserve'], aim_distance=20, vx=0, vz=0,
                 score=0, kills=0, pvp=0, stamina=100, reload_until=0, last_shot=0, killer='',
                 protected_until=now+12, awaiting_input=True, input_time=now, born=now, died_at=0, last_spawn=now, trigger=False,
                 statuses={}, input_seq=0, ack_seq=0, controls={'x': 0, 'z': 0, 'fire': False, 'sprint': False})

    def respawn(self, p):
        if p['hp'] > 0 or time.monotonic()-p['died_at'] < 10:
            return False
        old_id = p['id']
        p['id'] = uuid.uuid4().hex[:12]
        self.players.pop(old_id, None)
        self.reset(p)
        self.players[p['id']] = p
        self.spawn_zombies(p, 8)
        return True

    def spawn_zombies(self, p, count):
        if self.zombie_factor:
            spawn_enemies(self, p, max(1, round(count*self.zombie_factor)))

    def set_input(self, p, data):
        try:
            x, z, angle = float(data.get('x', 0)), float(data.get('z', 0)), float(data.get('angle', 0))
            if not all(math.isfinite(v) for v in (x, z, angle)):
                return
        except (TypeError, ValueError, OverflowError):
            return
        length = max(1, math.hypot(x, z))
        seq = data.get('seq', 0)
        if isinstance(seq, int) and not isinstance(seq, bool) and 0 <= seq <= 9007199254740991:
            p['input_seq'] = max(p['input_seq'], seq)
        p['controls'] = {'x': x/length, 'z': z/length, 'fire': data.get('fire') is True, 'sprint': data.get('sprint') is True}
        p['angle'] = angle % math.tau
        if data.get('fire_pressed') is True and data.get('fire') is True:p['trigger']=True
        try:
            distance=float(data.get('aim_distance',20))
            if math.isfinite(distance): p['aim_distance']=max(3,min(110,distance))
        except (ValueError,TypeError): pass
        p['input_time'] = time.monotonic()
        if p['awaiting_input'] and (abs(x)+abs(z) > .05 or data.get('fire') is True):
            p['awaiting_input'] = False
            p['born'] = p['input_time']
            p['protected_until'] = p['input_time']+12
            p['last_spawn'] = p['input_time']
        # Taking an offensive action cancels protection: no invulnerable firing.
        if data.get('fire') is True:
            p['protected_until'] = 0
        w = WEAPONS[p['weapon']]
        if data.get('reload') and not p['reload_until'] and p['ammo'] < w['mag'] and p['reserve'] > 0:
            p['reload_until'] = p['input_time']+w['reload']

    async def send(self, player, data):
        player['channel'].control(data)

    def update(self, dt, now):
        update_bots(self, now)
        living = [p for p in self.players.values() if p['hp'] > 0]
        for p in living:
            if p['awaiting_input']:
                p['protected_until'] = now+12
            c = p['controls'] if now-p['input_time'] < .4 else {'x': 0, 'z': 0, 'fire': False, 'sprint': False}
            running = c['sprint'] and p['stamina'] > 1 and (abs(c['x'])+abs(c['z']) > 0)
            speed = (10 if running else 6)*(.45 if p.get('statuses', {}).get('webbed', {}).get('until', 0) > now else 1)
            p['vx'],p['vz']=c['x']*speed,c['z']*speed
            p['stamina'] = max(0, min(100, p['stamina']+(-22 if running else 13)*dt))
            move(p, c['x']*speed*dt, c['z']*speed*dt)
            p['ack_seq'] = p['input_seq']
            if p['reload_until'] and now >= p['reload_until']:
                amount = min(WEAPONS[p['weapon']]['mag']-p['ammo'], p['reserve'])
                p['ammo'] += amount
                p['reserve'] -= amount
                p['reload_until'] = 0
            if c['fire'] or p['trigger']:
                shoot(self, p, now)
                p['trigger']=False
            if self.zombie_factor and not p['awaiting_input'] and now-p['last_spawn'] > 35/self.zombie_factor:
                nearby = sum((z['x']-p['x'])**2+(z['z']-p['z'])**2 < 3600 for z in self.zombies.values())
                if nearby < 14*self.zombie_factor:
                    self.spawn_zombies(p, 4)
                p['last_spawn'] = now
            # Roadside resupply stations replenish ammo/health once per minute per player.
            sx, sz = round((p['x']-11)/80)*80+11, round(p['z']/80)*80
            if math.hypot(p['x']-sx, p['z']-sz) < 2.6 and now-p.get('supplied', -1000) > 60:
                w=WEAPONS[p['weapon']]
                p['reserve'] = min(w['reserve']*2, p['reserve']+w['mag']*3)
                p['hp'] = min(100, p['hp']+30)
                p['supplied'] = now
                self.events.append({'type': 'supply', 'owner': p['id']})
        update_zombies(self,living,dt,now)
        update_projectiles(self,dt,now)
        update_statuses(self, now)
        update_bosses(self, dt, now)
        for drop in list(self.drops):
            picked = next((p for p in living if math.hypot(p['x']-drop['x'], p['z']-drop['z']) < 2), None)
            if picked:
                w=WEAPONS[picked['weapon']]
                picked['reserve'] = min(w['reserve']*2, picked['reserve']+w['mag'])
                picked['hp'] = min(100, picked['hp']+12)
                self.events.append({'type': 'supply', 'owner': picked['id']})
            if picked or drop['expires'] < now:
                self.drops.remove(drop)

    def snapshot(self, p, now, shared=None):
        def close(e):
            return (e['x']-p['x'])**2+(e['z']-p['z'])**2 < 85**2
        def compact(e, fields):
            return {k: round(e[k], 2) if isinstance(e[k], float) else e[k] for k in fields}
        def actor(e):
            result = compact(e, ['id', 'name', 'weapon', 'skin', 'x', 'z', 'angle', 'hp'])
            result['firing'] = e['hp'] > 0 and not e['reload_until'] and now-e['last_shot'] < .24
            result['running'] = math.hypot(e['vx'], e['vz']) > 6.1
            result['reloading'] = max(0, e['reload_until']-now)
            result['reload_duration'] = WEAPONS[e['weapon']]['reload']
            return result
        me = compact(p, ['id', 'name', 'weapon', 'skin', 'x', 'z', 'angle', 'hp', 'ammo', 'reserve', 'score', 'kills', 'pvp', 'stamina', 'killer','vx','vz'])
        me['interior']=interior_at(p['x'],p['z'])
        me['input_seq'] = p['ack_seq']
        me['inventory'] = inventory_snapshot(p)
        me['respawn_in'] = round(max(0, 10-(now-p['died_at'])), 2) if p['hp'] <= 0 else 0
        me['reload_duration'] = WEAPONS[p['weapon']]['reload']
        me['statuses'] = {kind: round(max(0, effect['until']-now), 1) for kind, effect in p.get('statuses', {}).items() if effect['until'] > now}
        me.update(reloading=max(0, p['reload_until']-now), protected=max(0, p['protected_until']-now), awaiting_input=p['awaiting_input'], survived=0 if p['awaiting_input'] else int((p['died_at'] or now)-p['born']))
        if shared is None:
            shared = self.shared_snapshot(now)
        return {'type': 'state', 'me': me, 'online': len(self.players),
                'seq': self.tick_seq, 'server_time': round(now*1000, 2), 'tick_ms': round(self.tick_ms, 2), 'time_of_day': self.settings['time_of_day'],
                'bosses': shared['bosses'],
                'boss_projectiles': [{k: e[k] for k in ['id', 'owner', 'kind', 'x', 'z', 'y', 'dx', 'dz']} for e in self.boss_projectiles if close(e)],
                'boss_zones': [{k: e[k] for k in ['id', 'owner', 'x', 'z', 'r']} for e in self.boss_zones if close(e)],
                'players': [actor(e) for e in self.players.values() if e['id'] != p['id'] and close(e)],
                'zombies': [{**compact(e, ['id', 'x', 'z', 'angle', 'hp', 'variant', 'mode']), 'enemy_type': e.get('enemy_type', 'normal'), 'runner': e.get('runner', False), 'max_hp': e.get('max_hp', 100), 'pack': e.get('pack', ''), 'attacking': e.get('attack_until', 0) > now} for e in self.zombies.values() if close(e)],
                'swarms': [compact(e, ['id', 'owner', 'target', 'x', 'z']) for e in self.swarms if close(e)],
                'projectiles': [compact(e,['id','kind','owner','x','z','dx','dz','remaining','total']) for e in self.projectiles if close(e)],
                'fires': [{**compact(e,['id','x','z','r']), 'ttl':round(e['until']-now,2)} for e in self.fires if close(e)],
                'drops': [{k: e[k] for k in ('id', 'x', 'z')} for e in self.drops if close(e)],
                'events': [e for e in self.events if 'x' not in e or close(e)],
                'leaders': shared['leaders']}

    def shared_snapshot(self, now):
        return {'bosses': [boss_snapshot(b, now) for b in self.bosses.values()],
                'leaders': [{k: e[k] for k in ('id', 'name', 'score', 'kills', 'pvp')}
                            for e in sorted(self.players.values(), key=lambda e: -e['score'])[:10]]}

    async def run(self):
        previous = time.monotonic()
        while True:
            now = time.monotonic()
            dt, previous = min(now-previous, .1), now
            try:
                self.events = []
                self.update(dt, now)
                self.tick_seq += 1
                shared = self.shared_snapshot(now)
                for p in list(self.players.values()):
                    if not p.get('bot'):
                        p['channel'].offer(self.snapshot(p, now, shared))
                if not self.players:
                    self.zombies.clear()
                    self.drops.clear()
                    self.projectiles.clear()
                    self.fires.clear()
                    self.swarms.clear()
            except Exception:
                logging.exception('World tick failed')
            self.tick_ms = (time.monotonic()-now)*1000
            if self.tick_ms > 50:
                self.tick_overruns += 1
            await asyncio.sleep(max(.001, .05-(time.monotonic()-now)))