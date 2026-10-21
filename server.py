"""Relay privado Auralis: 2–4 participantes, torneios e salas tradicionais.

O anfitriao simula as lutas, mas o relay computa os pontos e a classificacao
sempre a partir dos confrontos recebidos. Nao possui acesso ao motor Godot.
"""
import asyncio
import itertools
import json
import os
import secrets
import math
import time
import string
from http import HTTPStatus
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

rooms = {}
clients = {}
ALPHABET = string.ascii_uppercase + string.digits
MAX_MESSAGE = 131072
PROTOCOL_VERSION = 2  # Preserva a compatibilidade dos embates anteriores.
TERRITORY_CAPABILITY = 'territory_v1'
TERRITORY_COMBAT_CAPABILITY = 'territory_combat_v2'
TERRITORY_ECONOMY_CAPABILITY = 'territory_economy_v3'
TERRITORY_LEDGER_CAPABILITY = 'territory_ledger_v4'
TERRITORY_RESUME_CAPABILITY = 'session_resume_v1'
RECONNECT_GRACE_SECONDS = 90.0

def _server_features():
    return [TERRITORY_CAPABILITY, TERRITORY_COMBAT_CAPABILITY,
            TERRITORY_ECONOMY_CAPABILITY, TERRITORY_LEDGER_CAPABILITY,
            TERRITORY_RESUME_CAPABILITY]

async def _expire_paused_room(code, expected_room):
    """Keep an active 2P match for a limited period, then close it cleanly."""
    try:
        await asyncio.sleep(RECONNECT_GRACE_SECONDS)
        room = rooms.get(code)
        if room is not expected_room or all(ws is not None for ws in room['members']):
            return
        rooms.pop(code, None)
        for other in room['members']:
            if other is not None:
                clients.pop(other, None)
                try:
                    await send(other, {'type':'peer_left','reason':'resume_timeout'})
                except ConnectionClosed:
                    pass
    finally:
        if rooms.get(code) is expected_room:
            expected_room['reconnect_timer'] = None

TERRITORY_MAX_BUILDINGS = 128
TERRITORY_MAX_TROOPS = 120
TERRITORY_MAX_VILLAGERS = 160
TERRITORY_KINDS = frozenset(('centro','casa','deposito','academia','fazenda','porto',
    'mercado','cristalizador','serraria','pedreira','moinho','armazem','forja',
    'centro_cristais','quartel'))
TERRITORY_TROOPS = frozenset(('espadachim','guardiao','arqueiro','canhao','balista','ariete'))

def _safe_vector(value):
    return (isinstance(value, list) and len(value) == 2 and
        all(type(n) in (int,float) and math.isfinite(n) and -16.0 <= n <= 256.0 for n in value))

def _valid_realm(realm, owner):
    if not isinstance(realm, dict) or type(realm.get('owner')) is not int or realm['owner'] != owner:
        return False
    buildings, troops = realm.get('buildings'), realm.get('troops')
    if not isinstance(buildings, list) or len(buildings) > TERRITORY_MAX_BUILDINGS:
        return False
    if not isinstance(troops, list) or len(troops) > TERRITORY_MAX_TROOPS:
        return False
    civilians = realm.get('villagers', [])
    if not isinstance(civilians, list) or len(civilians) > TERRITORY_MAX_VILLAGERS:
        return False
    civilian_ids = set()
    for person in civilians:
        if not isinstance(person, dict) or type(person.get('id')) is not int or not 0 <= person['id'] <= 999999:
            return False
        if person['id'] in civilian_ids or not _safe_vector(person.get('pos')) or not _safe_vector(person.get('shelter')):
            return False
        if type(person.get('hp')) not in (float, int) or not math.isfinite(person['hp']) or not 0 <= person['hp'] <= 34:
            return False
        if type(person.get('max_hp')) not in (float, int) or not math.isfinite(person['max_hp']) or not 1 <= person['max_hp'] <= 34:
            return False
        if type(person.get('sheltered')) is not bool:
            return False
        civilian_ids.add(person['id'])
    for b in buildings:
        if not isinstance(b, dict) or type(b.get('kind')) is not str or b['kind'] not in TERRITORY_KINDS or not _safe_vector(b.get('pos')):
            return False
        if type(b.get('level')) is not int or not 1 <= b['level'] <= 3:
            return False
        if type(b.get('health')) not in (int,float) or not math.isfinite(b['health']) or not 0 <= b['health'] <= 100:
            return False
        if type(b.get('done')) is not bool:
            return False
        if 'upgrading' in b and type(b['upgrading']) is not bool:
            return False
    pending = realm.get('pending_build','')
    if type(pending) is not str or (pending and pending not in TERRITORY_KINDS) or len(pending)>32:
        return False
    market_events = realm.get('market_events',[])
    if not isinstance(market_events,list) or len(market_events)>64:
        return False
    receipt_ids = set()
    for event in market_events:
        if not isinstance(event,dict) or type(event.get('id')) is not int or not 1 <= event['id'] <= 999999:
            return False
        if event['id'] in receipt_ids or event.get('resource') not in ('wood','stone','food','crystal') or event.get('side') not in ('buy','sell'):
            return False
        receipt_ids.add(event['id'])
    training = realm.get('training',[])
    if not isinstance(training,list) or len(training)>6:
        return False
    job_ids = set()
    for job in training:
        if not isinstance(job,dict) or type(job.get('ticket')) is not int or not 1 <= job['ticket'] <= 999999:
            return False
        if job['ticket'] in job_ids or job.get('kind') not in TERRITORY_TROOPS:
            return False
        job_ids.add(job['ticket'])
    # Maquinas de cerco exigem Centro e Quartel de nivel 2.
    center_level = max((b['level'] for b in buildings if b['kind'] == 'centro' and b['done']), default=0)
    barracks_level = max((b['level'] for b in buildings if b['kind'] == 'quartel' and b['done']), default=0)
    heavy_unlocked = center_level >= 2 and barracks_level >= 2
    if not heavy_unlocked and any(job.get('kind') in ('canhao','balista','ariete') for job in training):
        return False
    unit_ids = set()
    for unit in troops:
        if not isinstance(unit, dict) or type(unit.get('kind')) is not str or unit['kind'] not in TERRITORY_TROOPS or not _safe_vector(unit.get('pos')):
            return False
        if not heavy_unlocked and unit['kind'] in ('canhao','balista','ariete'):
            return False
        ticket = unit.get('ticket',-1)
        if type(ticket) is not int or not -1 <= ticket <= 999999:
            return False
        if 'id' in unit:
            uid = unit['id']
            if type(uid) is not int or not -1 <= uid <= 999999 or (uid >= 0 and uid in unit_ids):
                return False
            if uid >= 0:
                unit_ids.add(uid)
        if any(type(unit.get(k)) not in (int,float) or not math.isfinite(unit[k]) or not 0 <= unit[k] <= 100000 for k in ('hp','max_hp')):
            return False
    bridge_rows = realm.get('bridge_rows',[])
    if not isinstance(bridge_rows,list) or len(bridge_rows)>72 or any(type(row) is not int or row<0 or row>255 for row in bridge_rows):
        return False
    stock = realm.get('stock')
    if not isinstance(stock, dict):
        return False
    return all(type(stock.get(k)) in (int,float) and math.isfinite(stock[k]) and 0 <= stock[k] <= 1_000_000_000 for k in ('wood','stone','food','crystal','gold'))

def _territory_rate_ok(room, ws, kind, minimum_interval):
    now = time.monotonic()
    key = (ws,kind)
    last = room['territory_last_sent'].get(key, -1e9)
    if now - last < minimum_interval:
        return False
    room['territory_last_sent'][key] = now
    return True


async def send(ws, data):
    await ws.send(json.dumps(data, ensure_ascii=False))

async def broadcast(room, data, skip=None):
    for member in list(room['members']):
        if member is skip:
            continue
        if member is not None:
            await send(member, data)

def seats(room):
    return [{'seat': i, 'name': f'Jogador {i + 1}'} for i in range(len(room['members']))]

def pairs(size):
    return list(itertools.combinations(range(size), 2))

def standings(room):
    n = room['capacity']
    pts = [0] * n
    direct = [[0] * n for _ in range(n)]
    bout_difference = [0] * n
    for record in room['results']:
        a, b = record['a'], record['b']
        bout_difference[a] += record['wins_a'] - record['wins_b']
        bout_difference[b] += record['wins_b'] - record['wins_a']
        if record['winner'] == a:
            pts[a] += 1
            direct[a][b] += 1
        elif record['winner'] == b:
            pts[b] += 1
            direct[b][a] += 1
    def rank_key(i):
        tied = [j for j in range(n) if pts[j] == pts[i] and j != i]
        direct_points = sum(direct[i][j] for j in tied)
        return (-pts[i], -direct_points, -bout_difference[i])
    ordered = sorted(range(n), key=lambda i: (rank_key(i), i))
    rank = []
    for seat in ordered:
        rank.append({'seat': seat, 'points': pts[seat],
                     'direct': sum(direct[seat][j] for j in range(n) if pts[j] == pts[seat] and j != seat),
                     'bout_diff': bout_difference[seat]})
    leaders = [r['seat'] for r in rank if rank_key(r['seat']) == rank_key(rank[0]['seat'])]
    return rank, leaders

async def handler(ws):
    try:
        async for raw in ws:
            if len(raw) > MAX_MESSAGE:
                await send(ws, {'type':'error','message':'Mensagem muito grande'})
                continue
            try:
                msg = json.loads(raw)
            except (ValueError, TypeError):
                continue
            if not isinstance(msg, dict):
                continue
            kind = msg.get('type')
            if ws in clients:
                active_room = rooms.get(clients[ws])
                if (active_room and active_room['started'] and active_room['capacity'] == 2
                        and any(member is None for member in active_room['members'])):
                    # Congela também o relay durante a interrupção. O único
                    # pedido aceito de retorno é feito por um NOVO socket.
                    continue
            if kind == 'resume' and ws not in clients:
                code, seat, token = msg.get('code'), msg.get('seat'), msg.get('token')
                room = rooms.get(code) if type(code) is str else None
                if (room is None or not room['started'] or room['capacity'] != 2 or
                        type(seat) is not int or seat not in (0,1) or
                        type(token) is not str or len(token) < 32 or
                        not secrets.compare_digest(token,room['resume_tokens'][seat]) or
                        room['members'][seat] is not None):
                    await send(ws, {'type':'error','message':'Retorno recusado: sala expirada ou credenciais invalidas'})
                    await ws.close(code=1008)
                    continue
                room['members'][seat] = ws
                clients[ws] = code
                await send(ws,{'type':'server_info','protocol':PROTOCOL_VERSION,'features':_server_features()})
                await send(ws,{'type':'resumed','code':code,'seat':seat,
                               'capacity':room['capacity'], 'started':True})
                if all(member is not None for member in room['members']):
                    task = room.get('reconnect_timer')
                    if task is not None:
                        task.cancel()
                        room['reconnect_timer'] = None
                    await broadcast(room,{'type':'peer_resumed','seat':seat})
                    await broadcast(room,{'type':'paired'})
                    # O cliente que retornou recebe o ultimo estado autoritativo.
                    # Em seguida ambos retomam snapshots e comandos sequenciais.
                    cached = room.get('territory_last_world') if seat == 1 else room.get('territory_last_guest')
                    if cached is not None:
                        await send(ws,cached)
                continue
            if kind == 'create' and ws not in clients:
                capacity = msg.get('capacity', 2)
                if type(capacity) is not int or capacity not in (2, 3, 4):
                    await send(ws, {'type':'error','message':'Sala deve ter 2, 3 ou 4 jogadores'})
                    continue
                code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                while code in rooms:
                    code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                room = {'capacity':capacity, 'members':[ws], 'ready':set(),
                        'started':False, 'plans':{}, 'stage':1, 'results':[],
                        'territory_last_sent':{},'territory_seq':-1,'territory_guest_seq':-1,
                        'territory_command_seq':-1,
                        'resume_tokens':[secrets.token_urlsafe(32) for _ in range(capacity)],
                        'reconnect_timer':None, 'territory_last_world':None,
                        'territory_last_guest':None}
                rooms[code] = room
                clients[ws] = code
                await send(ws, {'type':'server_info', 'protocol':PROTOCOL_VERSION,'features':_server_features()})
                await send(ws, {'type':'created', 'code':code, 'seat':0, 'capacity':capacity, 'resume_token':room['resume_tokens'][0]})
                await broadcast(room, {'type':'members','capacity':capacity,'members':seats(room)})
            elif kind == 'join' and ws not in clients:
                code = str(msg.get('code', '')).strip().upper()
                if len(code) != 6 or any(c not in ALPHABET for c in code):
                    await send(ws, {'type':'error','message':'Codigo de sala invalido'})
                    continue
                room = rooms.get(code)
                if not room or room['started'] or len(room['members']) >= room['capacity']:
                    await send(ws, {'type':'error','message':'Sala inexistente, cheia ou ja iniciada'})
                    continue
                seat = len(room['members'])
                room['members'].append(ws)
                clients[ws] = code
                await send(ws, {'type':'server_info', 'protocol':PROTOCOL_VERSION,'features':_server_features()})
                await send(ws, {'type':'joined','code':code,'seat':seat,'capacity':room['capacity'],'resume_token':room['resume_tokens'][seat]})
                await broadcast(room, {'type':'members','capacity':room['capacity'],'members':seats(room)})
                if len(room['members']) == room['capacity']:
                    await broadcast(room, {'type':'paired'})
            elif kind == 'ready' and ws in clients:
                room = rooms.get(clients[ws])
                if not room or room['started'] or len(room['members']) != room['capacity']:
                    continue
                room['ready'].add(ws)
                await broadcast(room, {'type':'ready_count','ready':len(room['ready']),
                                       'capacity':room['capacity']})
                if len(room['ready']) == room['capacity']:
                    room['started'] = True
                    await broadcast(room, {'type':'start','capacity':room['capacity'],
                                           'members':seats(room)})
            elif kind == 'arena_open' and ws in clients and rooms.get(clients[ws],{}).get('capacity',2) >= 3:
                room = rooms.get(clients[ws])
                if not room or not room['started'] or room['capacity'] < 3 or room['members'][0] is not ws:
                    continue
                stage = msg.get('match')
                if type(stage) is not int or stage != room['stage']:
                    continue
                await broadcast(room,{'type':'arena_open','match':stage},skip=ws)
            elif kind == 'tournament_plan' and ws in clients:
                room = rooms.get(clients[ws])
                if not room or not room['started'] or room['capacity'] < 3:
                    continue
                stage, plan = msg.get('stage'), msg.get('plan')
                if type(stage) is not int or stage != room['stage'] or not isinstance(plan, dict):
                    continue
                if not isinstance(plan.get('lineup'), list) or len(plan['lineup']) > 5:
                    continue
                if not isinstance(plan.get('heroes'), list) or len(plan['heroes']) > 10:
                    continue
                if not isinstance(plan.get('equipment', {}), dict):
                    continue
                seat = room['members'].index(ws)
                if seat not in room['plans']:
                    room['plans'][seat] = plan
                    await broadcast(room, {'type':'tournament_ready_count',
                                           'stage':stage,'ready':len(room['plans']),
                                           'capacity':room['capacity']})
                    if len(room['plans']) == room['capacity']:
                        await broadcast(room, {'type':'tournament_plans','stage':stage,
                            'plans':[{'seat':i,'plan':room['plans'][i]} for i in range(room['capacity'])]})
            elif kind == 'tournament_combat_state' and ws in clients:
                room = rooms.get(clients[ws])
                if not room or not room['started'] or room['capacity'] < 3 or room['members'][0] is not ws:
                    continue
                state = msg.get('state')
                if not isinstance(state,dict) or type(state.get('stage')) is not int or state['stage'] != room['stage']:
                    continue
                if any(type(state.get(k)) is not int for k in ('a','b','bout')):
                    continue
                if (state['a'],state['b']) not in pairs(room['capacity']):
                    continue
                if not 1 <= state['bout'] <= 3 or not isinstance(state.get('units'),list) or len(state['units']) > 10:
                    continue
                await broadcast(room,{'type':'tournament_combat_state','state':state},skip=ws)
            elif kind == 'tournament_stage' and ws in clients:
                room = rooms.get(clients[ws])
                if not room or not room['started'] or room['capacity'] < 3 or room['members'][0] is not ws:
                    continue
                stage = msg.get('stage')
                records = msg.get('results')
                if (type(stage) is not int or stage != room['stage'] or
                        len(room['plans']) != room['capacity'] or not isinstance(records, list) or
                        len(records) != len(pairs(room['capacity']))):
                    continue
                expected = set(pairs(room['capacity']))
                cleaned = []
                for rec in records:
                    if not isinstance(rec, dict):
                        break
                    a, b, wa, wb = rec.get('a'), rec.get('b'), rec.get('wins_a'), rec.get('wins_b')
                    if any(type(v) is not int for v in (a,b,wa,wb)) or (a,b) not in expected:
                        break
                    if (not (0 <= wa <= 2 and 0 <= wb <= 2) or (wa == 2 and wb == 2)
                            or wa + wb > 3 or (wa != 2 and wb != 2 and (wa > 1 or wb > 1))):
                        break
                    expected.remove((a,b))
                    winner = a if wa == 2 else (b if wb == 2 else -1)
                    cleaned.append({'stage':stage,'a':a,'b':b,'wins_a':wa,'wins_b':wb,'winner':winner})
                if expected or len(cleaned) != len(records):
                    await send(ws, {'type':'error','message':'Resultados de torneio invalidos'})
                    continue
                room['results'].extend(cleaned)
                ranking, winners = standings(room)
                await broadcast(room, {'type':'tournament_stage_result','stage':stage,
                    'results':cleaned,'ranking':ranking,'winners':winners,'finished':stage == 5})
                room['stage'] += 1
                room['plans'] = {}
            elif kind in ('territory_guest_state','territory_world_state','territory_command') and ws in clients:
                room = rooms.get(clients[ws])
                if not room or not room['started'] or len(room['members']) != 2:
                    continue
                owner = room['members'].index(ws)
                seq = msg.get('seq')
                if type(seq) is not int or seq < 0 or seq > 2_147_483_647:
                    continue
                if kind == 'territory_guest_state':
                    if owner != 1 or seq <= room['territory_guest_seq']:
                        continue
                    realm = msg.get('realm')
                    if not _valid_realm(realm,1) or not _territory_rate_ok(room,ws,kind,0.30):
                        continue
                    room['territory_guest_seq'] = seq
                    packet = {'type':'territory_guest_state','seq':seq,'realm':realm}
                    room['territory_last_guest'] = packet
                    await send(room['members'][0],packet)
                elif kind == 'territory_world_state':
                    if owner != 0 or seq <= room['territory_seq']:
                        continue
                    state = msg.get('state')
                    if not isinstance(state,dict) or state.get('schema') != 1 or state.get('seq') != seq:
                        continue
                    realms = state.get('realms')
                    if not isinstance(realms,list) or len(realms) not in (1,2) or not _valid_realm(realms[0],0):
                        continue
                    if len(realms) == 2 and not _valid_realm(realms[1],1):
                        continue
                    bridges = state.get('bridges')
                    if not isinstance(bridges,list) or len(bridges)>256 or any(not _safe_vector(b) for b in bridges):
                        continue
                    economy_ack = state.get('economy_ack',-1)
                    if (type(economy_ack) is not int or economy_ack < -1 or
                            economy_ack > room['territory_guest_seq']):
                        continue
                    destroyed = state.get('destroyed_guest_buildings',[])
                    if not isinstance(destroyed,list) or len(destroyed)>128 or any(
                            not isinstance(b,dict) or b.get('kind') not in TERRITORY_KINDS
                            or b.get('kind') == 'centro' or not _safe_vector(b.get('pos')) for b in destroyed):
                        continue
                    loot = state.get('loot',{})
                    if not isinstance(loot,dict) or len(loot)>2 or any(k not in ('0','1') or type(v) is not int or abs(v)>1000000 for k,v in loot.items()):
                        continue
                    if type(state.get('grid_size')) is not int or not 16 <= state['grid_size'] <= 256:
                        continue
                    clock = state.get('clock')
                    if type(clock) not in (int,float) or not math.isfinite(clock) or clock < 0:
                        continue
                    if not _territory_rate_ok(room,ws,kind,0.30):
                        continue
                    room['territory_seq'] = seq
                    packet = {'type':'territory_world_state','seq':seq,'state':state}
                    room['territory_last_world'] = packet
                    await send(room['members'][1],packet)
                else:
                    if owner != 1 or seq <= room['territory_command_seq']:
                        continue
                    verb = msg.get('verb')
                    units = msg.get('units')
                    target = msg.get('target')
                    if type(verb) is not str or verb not in ('move','attack','stop') or not isinstance(units,list) or not 1 <= len(units) <= 120:
                        continue
                    if any(type(i) is not int or not 0 <= i <= 999999 for i in units):
                        continue
                    if len(set(units)) != len(units) or not _safe_vector(target):
                        continue
                    if not _territory_rate_ok(room,ws,kind,0.07):
                        continue
                    room['territory_command_seq'] = seq
                    await send(room['members'][0],{'type':'territory_command','seq':seq,
                        'seat':owner,'verb':verb,'units':units,'target':target})
            elif kind in ('roster','snapshot','round_result','combat_state','arena_open') and ws in clients:
                room = rooms.get(clients[ws])
                if not room or len(room['members']) != 2:
                    continue
                if kind == 'arena_open':
                    if room['members'][0] is not ws or not room['started']:
                        continue
                    number = msg.get('match')
                    if type(number) is not int or not 1 <= number <= 100:
                        continue
                    payload = {'type':'arena_open','match':number}
                elif kind == 'roster':
                    ids = msg.get('ids')
                    if not isinstance(ids,list) or len(ids)!=10:
                        continue
                    payload = {'type':'roster','ids':ids}
                elif kind == 'combat_state':
                    if room['members'][0] is not ws:
                        continue
                    state = msg.get('state')
                    if not isinstance(state,dict) or not all(type(state.get(k)) is int for k in ('match','round','sequence')):
                        continue
                    if not 1 <= state['round'] <= 5 or not isinstance(state.get('fighters'),list) or len(state['fighters'])>10:
                        continue
                    payload = {'type':'combat_state','state':state}
                elif kind == 'round_result':
                    if room['members'][0] is not ws:
                        await send(ws, {'type':'error','message':'Apenas o anfitriao confirma resultados'})
                        continue
                    result = msg.get('result')
                    if not isinstance(result,dict) or not all(type(result.get(k)) is int for k in ('match','round')) or not 1 <= result['round'] <= 5:
                        continue
                    event = result.get('event','')
                    if event not in ('','next_round','match_complete'):
                        continue
                    if event == '' and (type(result.get('winner')) is not int or result['winner'] not in (-1,0,1)):
                        continue
                    if event == 'match_complete' and (type(result.get('blue_wins')) is not int or type(result.get('red_wins')) is not int):
                        continue
                    payload = {'type':'round_result','result':result}
                else:
                    snapshot = msg.get('snapshot')
                    if not isinstance(snapshot,dict):
                        continue
                    payload = {'type':'snapshot','snapshot':snapshot}
                await broadcast(room, payload, skip=ws)
    except ConnectionClosed:
        # Desconexao sem frame de encerramento (queda de rede/Render):
        # liberar a sala normalmente, sem traceback de erro no relay.
        pass
    finally:
        code = clients.pop(ws,None)
        room = rooms.get(code)
        if room is not None:
            try:
                seat = room['members'].index(ws)
            except ValueError:
                seat = -1
            if seat >= 0 and room['started'] and room['capacity'] == 2:
                room['members'][seat] = None
                if room.get('reconnect_timer') is None:
                    room['reconnect_timer'] = asyncio.create_task(_expire_paused_room(code,room))
                for other in room['members']:
                    if other is not None:
                        try:
                            await send(other,{'type':'peer_paused','seat':seat,
                                              'seconds':int(RECONNECT_GRACE_SECONDS)})
                        except ConnectionClosed:
                            pass
            else:
                rooms.pop(code,None)
                task = room.get('reconnect_timer')
                if task is not None:
                    task.cancel()
                for other in room['members']:
                    if other is None or other is ws:
                        continue
                    clients.pop(other,None)
                    try:
                        await send(other, {'type':'peer_left'})
                    except Exception:
                        pass

def health_response(connection, request):
    if request.path in ('/','/healthz') and request.headers.get('Upgrade','').lower()!='websocket':
        return connection.respond(HTTPStatus.OK, f'Auralis relay OK | protocolo {PROTOCOL_VERSION} | salas 2-4\n')
    return None

async def main():
    host = os.getenv('AURALIS_HOST','0.0.0.0')
    port = int(os.getenv('PORT','8765'))
    async with serve(handler,host,port,max_size=MAX_MESSAGE,ping_interval=20,process_request=health_response):
        print(f'Auralis relay listening on {host}:{port}',flush=True)
        await asyncio.Future()

if __name__=='__main__':
    asyncio.run(main())