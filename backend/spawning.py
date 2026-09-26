import math
import random
from world import free


def spawn_position(game):
    # Road intersections throughout the map, independent for every player and life.
    points = [(x*80+random.uniform(-4, 4), z*80+random.uniform(-4, 4)) for x in range(-9, 10) for z in range(-9, 10)]
    random.shuffle(points)
    for x, z in points:
        if not free(x, z):
            continue
        if any(p['hp'] > 0 and math.hypot(p['x']-x, p['z']-z) < 10 for p in game.players.values()):
            continue
        if any(e['hp'] > 0 and math.hypot(e['x']-x, e['z']-z) < 20 for e in game.zombies.values()):
            continue
        if any(e['hp'] > 0 and math.hypot(e['x']-x, e['z']-z) < 65 for e in game.bosses.values()):
            continue
        return x, z
    # Finite fallback for an extremely crowded map; preparation protection still applies.
    return next((p for p in points if free(*p)), (0, 0))