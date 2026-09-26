import time
from world import WEAPONS


def new_inventory():
    return {key: {'ammo': w['mag'], 'reserve': w['reserve']} for key, w in WEAPONS.items()}


def inventory_snapshot(player):
    return {key: {'ammo': player['ammo'], 'reserve': player['reserve']} if key == player['weapon'] else dict(slot) for key, slot in player['inventory'].items()}


def equip_weapon(player, weapon, now=None):
    now = time.monotonic() if now is None else now
    if player['hp'] <= 0 or not isinstance(weapon, str) or weapon not in WEAPONS or now < player.get('weapon_ready_at', 0):
        return False
    if weapon == player['weapon']:
        return True
    player['inventory'][player['weapon']] = {'ammo': player['ammo'], 'reserve': player['reserve']}
    slot = player['inventory'][weapon]
    player.update(weapon=weapon, ammo=slot['ammo'], reserve=slot['reserve'], reload_until=0, trigger=False, weapon_ready_at=now+.3)
    player['controls']['fire'] = False
    return True