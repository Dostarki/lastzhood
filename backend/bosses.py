import math
import uuid
from world import free, wall_distance
from boss_catalog import BOSS_TYPES, create_boss, boss_snapshot
from boss_combat import safe_landing, area_damage, line_damage, launch_projectile, update_boss_hazards

ROTATIONS = {'hansel': ['laser', 'rockets', 'leap'], 'symbiote': ['web', 'blink', 'slash'],
             'xenomorph': ['leap', 'claw', 'bite', 'tail'], 'ash_titan': ['quake', 'lava', 'slam']}
RANGES = {'laser': 50, 'rockets': 50, 'leap': 48, 'web': 45, 'blink': 40, 'slash': 6, 'claw': 6, 'bite': 4.5, 'tail': 12, 'quake': 15, 'lava': 45, 'slam': 6}
RADII = {'leap': 7, 'slash': 6, 'claw': 6, 'bite': 4.5, 'tail': 2, 'quake': 14, 'lava': 4, 'slam': 6, 'blink': 4, 'laser': 1.2, 'rockets': 3.4, 'web': 3.4}


def begin_attack(boss, kind, target, now):
    x, z = target['x'], target['z']
    if kind in ('leap', 'blink'):
        landing = safe_landing(x, z, boss['radius'])
        if not landing:
            boss['next_attack'] = now+1; return
        x, z = landing
    if kind in ('quake', 'slam', 'slash', 'claw', 'bite'):
        x, z = boss['x'], boss['z']
    windup = 1.1 if kind in ('laser', 'quake') else .85
    boss.update(action=f'windup_{kind}', action_until=now+windup,
                pending={'kind': kind, 'x': x, 'z': z, 'r': RADII[kind], 'from_x': boss['x'], 'from_z': boss['z'], 'start': now})


def resolve_attack(game, boss, now):
    p = boss['pending']; kind = p['kind']
    if kind == 'leap' and boss['action'] != 'leap':
        boss.update(action='leap', action_until=now+1.1)
        p['start'] = now; return
    if kind == 'blink' and boss['action'] != 'liquid':
        boss.update(action='liquid', action_until=now+.45)
        p['start'] = now; return
    if kind == 'leap':
        boss.update(x=p['x'], z=p['z'], y=0.)
        area_damage(game, boss, boss['x'], boss['z'], p['r'], 62 if boss['boss_type'] == 'hansel' else 48, now, 'leap')
    elif kind == 'blink':
        game.events.append({'type': 'boss_impact', 'kind': 'liquid', 'owner': boss['id'], 'x': boss['x'], 'z': boss['z'], 'r': 3})
        boss.update(x=p['x'], z=p['z'])
        area_damage(game, boss, boss['x'], boss['z'], 4, 18, now, 'liquid')
    elif kind == 'laser':
        line_damage(game, boss, p['x'], p['z'], 50, 1.2, 40, now, kind)
    elif kind == 'tail':
        line_damage(game, boss, p['x'], p['z'], 12, 1.7, 45, now, kind)
    elif kind in ('rockets', 'web'):
        for spread in ([-.08, 0, .08] if kind == 'rockets' else [0]):
            launch_projectile(game, boss, 'rocket' if kind == 'rockets' else kind, p['x'], p['z'], spread)
    elif kind == 'lava':
        for dx, dz in [(0, 0), (6, 0), (-3, 5)]:
            x, z = p['x']+dx, p['z']+dz
            if free(x, z):
                game.boss_zones.append({'id': uuid.uuid4().hex[:10], 'owner': boss['id'], 'x': x, 'z': z, 'r': 4, 'until': now+8, 'next_tick': now})
                game.events.append({'type': 'boss_impact', 'kind': 'lava', 'owner': boss['id'], 'x': x, 'z': z, 'r': 4})
    else:
        area_damage(game, boss, boss['x'], boss['z'], p['r'], {'quake': 42, 'slam': 50, 'slash': 38, 'claw': 30, 'bite': 55}[kind], now, kind)
    boss.update(action=kind, action_until=now+.4, pending=None, next_attack=now+(2.2 if boss['boss_type'] == 'xenomorph' else 3.2))


def move_boss(boss, target, dt):
    dx, dz = target['x']-boss['x'], target['z']-boss['z']; d = max(.01, math.hypot(dx, dz))
    step = BOSS_TYPES[boss['boss_type']]['speed']*dt
    nx, nz = boss['x']+dx/d*step, boss['z']+dz/d*step
    if free(nx, nz, boss['radius']):
        boss.update(x=nx, z=nz)
    elif free(nx, boss['z'], boss['radius']):
        boss['x'] = nx
    elif free(boss['x'], nz, boss['radius']):
        boss['z'] = nz


def update_bosses(game, dt, now):
    eligible = [p for p in game.players.values() if p['hp'] > 0 and not p['awaiting_input']]
    for key, boss in list(game.bosses.items()):
        if boss['hp'] <= 0:
            if boss['respawn_at'] and now >= boss['respawn_at']:
                game.bosses[key] = create_boss(boss['boss_type'], boss['generation']+1)
                game.events.append({'type': 'boss_spawn', 'name': boss['name'], 'owner': key})
            continue
        if boss['pending']:
            if boss['action'] == 'leap':
                p = boss['pending']; progress = min(1, (now-p['start'])/1.1)
                boss['x'] = p['from_x']+(p['x']-p['from_x'])*progress
                boss['z'] = p['from_z']+(p['z']-p['from_z'])*progress
                boss['y'] = math.sin(progress*math.pi)*9
            if now >= boss['action_until']:
                resolve_attack(game, boss, now)
            continue
        target = next((p for p in eligible if p['id'] == boss['target_id']), None)
        if not target:
            nearby = [p for p in eligible if math.hypot(p['x']-boss['x'], p['z']-boss['z']) <= 50 and wall_distance(boss['x'], boss['z'], p['x'], p['z']) > .95]
            target = min(nearby, key=lambda p: math.hypot(p['x']-boss['x'], p['z']-boss['z'])) if nearby else None
        boss['target_id'] = target['id'] if target else ''
        if not target:
            boss['action'] = 'idle'; continue
        distance = math.hypot(target['x']-boss['x'], target['z']-boss['z'])
        boss['angle'] = math.atan2(target['x']-boss['x'], target['z']-boss['z'])
        if now < boss['action_until']:
            continue
        if now >= boss['next_attack']:
            rotation = ROTATIONS[boss['boss_type']]
            for offset in range(len(rotation)):
                index = (boss['attack_index']+offset) % len(rotation); kind = rotation[index]
                visible = wall_distance(boss['x'], boss['z'], target['x'], target['z']) > .95
                if distance <= RANGES[kind] and (visible or kind in ('leap', 'blink')):
                    boss['attack_index'] = (index+1) % len(rotation); begin_attack(boss, kind, target, now); break
        if not boss['pending']:
            boss['action'] = 'chase'
            if distance > boss['radius']+1.2:
                move_boss(boss, target, dt)
    update_boss_hazards(game, dt, now)