"""Servidor leve de duelos para Batalha de Miniaturas.
Execute: pip install -r requirements.txt && python server.py
Todos os dados são mantidos na memória; nenhuma conta é necessária.
"""
import asyncio
import json
import logging
import os
import secrets
import string
import time
from dataclasses import dataclass, field
from pathlib import Path
from aiohttp import web, WSMsgType

logging.basicConfig(level=logging.INFO)
ROOT = Path(__file__).parent
MAX_ROOMS = 200
ROOM_TTL = 2 * 60 * 60
RECONNECT_GRACE = 150
ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
ALLOWED_TYPES = set('guard spear axe bow druid hunter mage cleric golem rogue ghost paladin sentinel toxic shaman frost storm necro shade pyro tide earth spark seraph monk templar oracle'.split())
ALLOWED_ITEMS=set('sword mail ward focus boots amulet ring orb staff charm shield lance bloodblade bastion windfang divine piercer heart arcana wardsteps'.split())
# This is an authoritative relay for lobby, score and turns; the room creator runs
# the actual combat simulation. It is appropriate for friendly unranked games.
ROOMS = {}

@dataclass
class Room:
    code: str
    clients: list = field(default_factory=lambda: [None, None])
    tokens: list = field(default_factory=lambda: [secrets.token_urlsafe(24), secrets.token_urlsafe(24)])
    claimed: list = field(default_factory=lambda: [False, False])
    disconnected_at: list = field(default_factory=lambda: [0., 0.])
    names: list = field(default_factory=lambda: ['Jogador 1', 'Jogador 2'])
    ready: list = field(default_factory=lambda: [False, False])
    next_ready: list = field(default_factory=lambda: [False, False])
    units: list = field(default_factory=lambda: [[], []])
    wins: list = field(default_factory=lambda: [0, 0])
    series_wins: list = field(default_factory=lambda: [0, 0])
    history: list = field(default_factory=list)
    prep_deadline: float = 0.0
    round: int = 1
    phase: str = 'prep'
    last_winner: int | None = None
    updated: float = field(default_factory=time.monotonic)

    def touch(self):
        self.updated = time.monotonic()

    def message(self):
        return {'type':'state','code':self.code,'round':self.round,'wins':self.wins,
                'names':self.names,'connected':[bool(ws and not ws.closed) for ws in self.clients],
                'ready':self.ready,'phase':self.phase,'seriesWins':self.series_wins,
                'history':self.history[-10:], 'prepDeadline':int(self.prep_deadline*1000), 'paused':any(self.claimed[i] and not self.clients[i] for i in (0,1))}

async def send(ws, data):
    if ws and not ws.closed:
        try:
            await ws.send_json(data)
        except ConnectionError:
            pass

async def broadcast(room, data):
    for ws in room.clients:
        await send(ws, data)

async def error(ws, message):
    await send(ws, {'type':'error','message':message})

def validate_units(raw, round_number):
    max_count = min(6, 3 + (round_number - 1) // 3)
    if not isinstance(raw, list) or not 1 <= len(raw) <= max_count:
        raise ValueError(f'A formação deve ter entre 1 e {max_count} miniaturas.')
    coords = set()
    units = []
    for u in raw:
        if not isinstance(u, dict):
            raise ValueError('Miniatura inválida.')
        typ, star, x, y = u.get('type'), u.get('star'), u.get('x'), u.get('y')
        items = u.get('items',[])
        if typ not in ALLOWED_TYPES or type(star) != int or not 1 <= star <= 3:
            raise ValueError('Tipo ou estrela inválido.')
        if type(x) != int or type(y) != int or not 0 <= x < 6 or y not in (4,5) or (x,y) in coords:
            raise ValueError('Posição fora da área ou ocupada.')
        if not isinstance(items, list) or len(items) > 2 or any(not isinstance(i,str) or i not in ALLOWED_ITEMS for i in items):
            raise ValueError('Equipamento inválido.')
        coords.add((x,y))
        units.append({'type':typ,'star':star,'x':x,'y':y,'items':items})
    return units

async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=30, max_msg_size=180_000)
    await ws.prepare(request)
    room = None
    seat = None
    voluntary = False
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                event = json.loads(msg.data)
                if not isinstance(event,dict):
                    raise ValueError('Mensagem inválida')
                kind = event.get('type')
                if kind in ('create','join','resume'):
                    if room:
                        await error(ws,'Você já entrou em uma sala.');continue
                    name = str(event.get('name','Jogador')).strip()[:24] or 'Jogador'
                    reconnected = kind == 'resume'
                    if kind == 'create':
                        if len(ROOMS) >= MAX_ROOMS:
                            await error(ws,'Servidor cheio. Tente mais tarde.');continue
                        code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                        while code in ROOMS:
                            code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                        room = Room(code)
                        ROOMS[code] = room
                        seat = 0
                    else:
                        code = str(event.get('code','')).upper().strip()
                        candidate = ROOMS.get(code)
                        if not candidate:
                            await error(ws,'Sala não encontrada ou expirada. Confira o código.');continue
                        if kind == 'resume':
                            token=str(event.get('token',''))
                            found=next((i for i in (0,1) if candidate.claimed[i] and secrets.compare_digest(candidate.tokens[i],token)),None)
                            if found is None or candidate.clients[found] is not None or not candidate.disconnected_at[found] or time.monotonic()-candidate.disconnected_at[found]>RECONNECT_GRACE:
                                await error(ws,'Reconexão não autorizada ou expirada.');continue
                            room,seat=candidate,found
                        else:
                            if candidate.phase != 'prep' or candidate.clients[1] is not None or (candidate.claimed[1] and candidate.disconnected_at[1] and time.monotonic()-candidate.disconnected_at[1]<RECONNECT_GRACE):
                                await error(ws,'Esta sala já está ocupada ou reservada para reconexão.');continue
                            room,seat = candidate,1
                            room.tokens[1]=secrets.token_urlsafe(24)
                    room.clients[seat]=ws
                    room.claimed[seat]=True
                    room.disconnected_at[seat]=0.
                    if not reconnected: room.names[seat]=name
                    room.touch()
                    if all(room.clients) and room.phase=='prep' and not room.prep_deadline:room.prep_deadline=time.time()+120
                    await send(ws, {'type':'joined','code':room.code,'seat':seat,'round':room.round,'wins':room.wins,'token':room.tokens[seat],
                                    'reconnected':reconnected,'phase':room.phase,
                                    'names':room.names,'connected':[bool(x and not x.closed) for x in room.clients],
                                    'seriesWins':room.series_wins,'history':room.history[-10:],'prepDeadline':int(room.prep_deadline*1000)})
                    await broadcast(room,room.message())
                elif kind == 'leave':
                    voluntary=True
                    break
                elif not room or seat is None or room.clients[seat] is not ws:
                    await error(ws,'Entre em uma sala primeiro.')
                elif kind == 'ready':
                    if room.phase != 'prep':
                        await error(ws,'A partida não está em preparação.');continue
                    if not all(c and not c.closed for c in room.clients):
                        await error(ws,'Aguardando seu amigo entrar na sala.');continue
                    try:
                        units = validate_units(event.get('units'),room.round)
                    except ValueError as exc:
                        await error(ws,str(exc));continue
                    room.units[seat]=units
                    room.ready[seat]=True
                    room.touch()
                    if all(room.ready):
                        room.prep_deadline=0
                        room.phase='combat'
                        for i,c in enumerate(room.clients):
                            await send(c, {'type':'start','round':room.round,'opponentUnits':room.units[1-i]})
                    else:
                        await broadcast(room,room.message())
                elif kind == 'frame':
                    if room.phase!='combat' or seat!=0:
                        continue
                    frame=event.get('frame')
                    if not isinstance(frame,dict) or not isinstance(frame.get('allies'),list) or not isinstance(frame.get('enemies'),list):
                        continue
                    if len(frame['allies'])>12 or len(frame['enemies'])>12:
                        continue
                    await send(room.clients[1], {'type':'frame','frame':frame})
                elif kind == 'finish':
                    if room.phase != 'combat' or seat!=0 or type(event.get('hostWin'))!=bool:
                        continue
                    room.phase='result'
                    room.last_winner=0 if event['hostWin'] else 1
                    room.wins[room.last_winner]+=1
                    done=max(room.wins)>=3
                    if done:
                        room.phase='done'
                        room.series_wins[room.last_winner]+=1
                        room.history.append({'names':room.names[:], 'score':room.wins[:], 'winner':room.last_winner, 'at':int(time.time())})
                        room.history=room.history[-20:]
                    room.next_ready=[False,False]
                    room.touch()
                    await broadcast(room, {'type':'result','hostWin':event['hostWin'],'wins':room.wins,'done':done,'seriesWins':room.series_wins,'history':room.history[-10:]})
                elif kind == 'next':
                    if room.phase not in ('result','done'):
                        continue
                    room.next_ready[seat]=True
                    room.touch()
                    if all(room.next_ready):
                        rematch=room.phase=='done'
                        room.round=1 if rematch else room.round+1
                        if rematch: room.wins=[0,0]
                        room.ready=[False,False]
                        room.next_ready=[False,False]
                        room.units=[[],[]]
                        room.phase='prep'
                        room.prep_deadline=time.time()+120
                        await broadcast(room, {'type':'nextRound','round':room.round,'wins':room.wins,
                                               'rematch':rematch,'lastWinner':room.last_winner})
                        room.last_winner=None
                    else:
                        await broadcast(room,room.message())
            except (ValueError,TypeError,KeyError) as exc:
                await error(ws, f'Pedido inválido: {str(exc)[:110]}')
    finally:
        if room and seat is not None and room.clients[seat] is ws:
            room.clients[seat]=None
            room.ready[seat]=False
            room.touch()
            if voluntary:
                room.claimed[seat]=False
                room.disconnected_at[seat]=0.
                room.tokens[seat]=secrets.token_urlsafe(24)
                if seat == 0:
                    ROOMS.pop(room.code,None)
                    await send(room.clients[1],{'type':'room_closed'})
                else:
                    room.phase='prep'
                    room.prep_deadline=0
                    room.ready=[False,False]
                    room.units=[[],[]]
                    await broadcast(room,room.message())
            else:
                room.disconnected_at[seat]=time.monotonic()
                if room.phase in ('combat','result','done'):
                    if room.phase == 'result':room.round+=1
                    elif room.phase == 'done':
                        room.round=1;room.wins=[0,0]
                    room.phase='prep'
                    room.prep_deadline=0
                    room.units=[[],[]]
                    room.ready=[False,False]
                    room.next_ready=[False,False]
                await broadcast(room,{'type':'connection_lost','seat':seat,'graceSeconds':RECONNECT_GRACE,'round':room.round,'wins':room.wins})
                await broadcast(room,room.message())
    return ws

async def index(_request):
    return web.FileResponse(ROOT/'index.html', headers={'Cache-Control':'no-store'})

async def health(_request):
    return web.json_response({'ok':True, 'rooms':len(ROOMS)})

async def cleanup(app):
    while True:
        await asyncio.sleep(15)
        cutoff = time.monotonic()-ROOM_TTL
        now=time.monotonic()
        for code,room in list(ROOMS.items()):
            if room.phase=='prep' and room.prep_deadline and time.time()>room.prep_deadline and all(room.clients):
                room.ready=[False,False]
                room.units=[[],[]]
                room.prep_deadline=time.time()+120
                await broadcast(room,{'type':'prep_timeout','message':'Tempo de preparação reiniciado. Confirme sua equipe novamente.'})
                await broadcast(room,room.message())
            host_expired=room.claimed[0] and room.clients[0] is None and room.disconnected_at[0] and now-room.disconnected_at[0]>RECONNECT_GRACE
            all_offline=not any(room.clients)
            if host_expired or (all_offline and room.updated<cutoff):
                ROOMS.pop(code,None)
                if room.clients[1] is not None:
                    await send(room.clients[1],{'type':'room_closed'})

async def background(app):
    task=asyncio.create_task(cleanup(app))
    yield
    task.cancel()
    try:await task
    except asyncio.CancelledError:pass

app=web.Application(client_max_size=220_000)
app.add_routes([web.get('/',index),web.get('/ws',ws_handler),web.get('/health',health)])
app.cleanup_ctx.append(background)
if __name__=='__main__':
    web.run_app(app, host='0.0.0.0', port=int(os.getenv('PORT','8000')))
