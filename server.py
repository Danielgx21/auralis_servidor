"""Relay privado Auralis: 2–4 participantes, torneios e salas tradicionais.

O anfitriao simula as lutas, mas o relay computa os pontos e a classificacao
sempre a partir dos confrontos recebidos. Nao possui acesso ao motor Godot.
"""
import asyncio
import itertools
import json
import os
import secrets
import string
from http import HTTPStatus
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

rooms = {}
clients = {}
ALPHABET = string.ascii_uppercase + string.digits
MAX_MESSAGE = 131072
PROTOCOL_VERSION = 2  # Compatibilidade de salas e dos cinco embates online.

async def send(ws, data):
    await ws.send(json.dumps(data, ensure_ascii=False))

async def broadcast(room, data, skip=None):
    for member in list(room['members']):
        if member is skip:
            continue
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
            if kind == 'create' and ws not in clients:
                capacity = msg.get('capacity', 2)
                if type(capacity) is not int or capacity not in (2, 3, 4):
                    await send(ws, {'type':'error','message':'Sala deve ter 2, 3 ou 4 jogadores'})
                    continue
                code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                while code in rooms:
                    code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                room = {'capacity':capacity, 'members':[ws], 'ready':set(),
                        'started':False, 'plans':{}, 'stage':1, 'results':[]}
                rooms[code] = room
                clients[ws] = code
                await send(ws, {'type':'server_info', 'protocol':PROTOCOL_VERSION})
                await send(ws, {'type':'created', 'code':code, 'seat':0, 'capacity':capacity})
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
                await send(ws, {'type':'server_info', 'protocol':PROTOCOL_VERSION})
                await send(ws, {'type':'joined','code':code,'seat':seat,'capacity':room['capacity']})
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
        room = rooms.pop(code,None)
        if room:
            for other in room['members']:
                clients.pop(other,None)
                if other is ws:
                    continue
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
