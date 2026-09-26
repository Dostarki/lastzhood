from combat import hurt


def damage_player(game, player, amount, name, now):
    if player['hp'] <= 0 or player['awaiting_input'] or player['protected_until'] > now:
        return False
    hurt(game, player, amount, None, now, source_name=name)
    return True


def apply_status(player, kind, source, name, now, duration=5):
    effects = player.setdefault('statuses', {})
    previous = effects.get(kind, {})
    effects[kind] = {'source': source, 'name': name, 'until': now+duration,
                     'next_tick': previous.get('next_tick', now+1), 'damage': 3 if kind == 'bleeding' else 4}


def dismiss_hive(game, owner):
    game.swarms[:] = [s for s in game.swarms if s['owner'] != owner]
    for player in game.players.values():
        poison = player.get('statuses', {}).get('poison')
        if poison and poison['source'] == owner:
            player['statuses'].pop('poison', None)


def update_statuses(game, now):
    for player in game.players.values():
        for kind, effect in list(player.get('statuses', {}).items()):
            source = game.zombies.get(effect['source']) if kind == 'poison' else None
            if player['hp'] <= 0 or now >= effect['until'] or (kind == 'poison' and (not source or source['hp'] <= 0)):
                player['statuses'].pop(kind, None)
                continue
            if now >= effect['next_tick']:
                effect['next_tick'] = now+1
                damage_player(game, player, effect['damage'], effect['name'], now)