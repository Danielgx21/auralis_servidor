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
import tempfile
import hashlib
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
DECK_SIZE=14
MAX_DECK_GROUP=5
PVP_START_HP=70
# Bênçãos PvP: duas escolhas independentes, antes das rodadas 5,9,13...
PVP_BLESSING_EFFECTS={
 'gold':None, 'item':None, 'sword':('ad',2), 'magic':('ap',2),
 'armor':('armor',2), 'speed':('speed',0.06), 'vitality':('hp',14)
}
def pvp_buffs_zero():
 return {'atk':0,'ad':0,'ap':0,'armor':0,'speed':0.0,'hp':0}
def pvp_blessing_round(round_number):
 return round_number>1 and (round_number-1)%4==0
TYPE_GROUPS={'ferro':set('guard spear axe paladin sentinel'.split()),'selva':set('bow druid hunter toxic shaman'.split()),'arcano':set('mage cleric golem frost storm'.split()),'sombra':set('rogue ghost necro shade'.split()),'elemental':set('pyro tide earth spark'.split()),'sagrado':set('seraph monk templar oracle'.split())}
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
    hp: list = field(default_factory=lambda: [PVP_START_HP,PVP_START_HP])
    decks: list = field(default_factory=lambda: [None,None])
    blessing_offers: list = field(default_factory=lambda: [[],[]])
    blessing_taken_round: list = field(default_factory=lambda: [0,0])
    blessing_offer_round: int = 0
    blessing_buffs: list = field(default_factory=lambda: [pvp_buffs_zero(),pvp_buffs_zero()])
    series_wins: list = field(default_factory=lambda: [0, 0])
    history: list = field(default_factory=list)
    prep_deadline: float = 0.0
    round: int = 1
    phase: str = 'prep'
    last_winner: int | None = None
    updated: float = field(default_factory=time.monotonic)

    def start_blessing_round(self):
        if pvp_blessing_round(self.round):
            picker=secrets.SystemRandom()
            self.blessing_offers=[picker.sample(list(PVP_BLESSING_EFFECTS),3) for _ in range(2)]
        else:
            self.blessing_offers=[[],[]]
        self.blessing_taken_round=[0,0]
        self.blessing_offer_round=self.round if pvp_blessing_round(self.round) else 0

    def touch(self):
        self.updated = time.monotonic()

    def message(self):
        return {'type':'state','code':self.code,'round':self.round,'wins':self.wins,
                'names':self.names,'hp':self.hp,'connected':[bool(ws and not ws.closed) for ws in self.clients],
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

def validate_deck(raw):
    if not isinstance(raw,list) or len(raw)!=DECK_SIZE or len(set(str(x) for x in raw))!=DECK_SIZE or any(not isinstance(x,str) or x not in ALLOWED_TYPES for x in raw):
        raise ValueError('Escolha exatamente 14 personagens diferentes.')
    counts={}
    for typ in raw:
        group=next((key for key,types in TYPE_GROUPS.items() if typ in types),None)
        if not group:raise ValueError('Aliança inválida no elenco.')
        counts[group]=counts.get(group,0)+1
        if counts[group]>MAX_DECK_GROUP:raise ValueError('Máximo de cinco personagens por aliança.')
    if len(counts)<3:raise ValueError('Escolha ao menos três alianças.')
    return raw[:]

def calc_pvp_damage(round_number,survivors):
    return min(25,2+(max(1,round_number)-1)//5+sum(survivors))

def validate_survivors(raw,original):
    if not isinstance(raw,list) or len(raw)>len(original) or len(raw)>6 or any(type(star)!=int or star<1 or star>3 for star in raw):
        raise ValueError('Sobreviventes inválidos.')
    from collections import Counter
    counts=Counter(u['star'] for u in original)
    for star in raw:
        counts[star]-=1
        if counts[star]<0:raise ValueError('Estrelas sobreviventes não conferem.')
    return raw

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
                    if pvp_blessing_round(room.round) and room.blessing_offer_round!=room.round:
                        room.start_blessing_round()
                    await send(ws, {'type':'joined','code':room.code,'seat':seat,'round':room.round,'wins':room.wins,'hp':room.hp,'token':room.tokens[seat],
                                    'reconnected':reconnected,'phase':room.phase,
                                    'names':room.names,'connected':[bool(x and not x.closed) for x in room.clients],
                                    'seriesWins':room.series_wins,'history':room.history[-10:],'prepDeadline':int(room.prep_deadline*1000),
                                     'blessingOffer':room.blessing_offers[seat],
                                     'blessingTaken':room.blessing_taken_round[seat]==room.round,
                                     'ownBuffs':room.blessing_buffs[seat]})
                    await broadcast(room,room.message())
                    for i,c in enumerate(room.clients):
                        await send(c,{'type':'blessingOffer','round':room.round,'options':room.blessing_offers[i],
                                      'taken':room.blessing_taken_round[i]==room.round,'ownBuffs':room.blessing_buffs[i]})
                elif kind == 'leave':
                    voluntary=True
                    break
                elif not room or seat is None or room.clients[seat] is not ws:
                    await error(ws,'Entre em uma sala primeiro.')
                elif kind == 'blessing':
                    if room.phase!='prep' or not pvp_blessing_round(room.round):
                        await error(ws,'Não há bênção disponível nesta rodada.');continue
                    blessing_id=event.get('id')
                    if not isinstance(blessing_id,str) or blessing_id not in room.blessing_offers[seat]:
                        await error(ws,'Bênção fora das três opções disponíveis.');continue
                    if room.blessing_taken_round[seat]==room.round:
                        await error(ws,'A bênção desta rodada já foi escolhida.');continue
                    effect=PVP_BLESSING_EFFECTS[blessing_id]
                    if effect:
                        stat,amount=effect
                        room.blessing_buffs[seat][stat]=round(room.blessing_buffs[seat][stat]+amount,4)
                    room.blessing_taken_round[seat]=room.round
                    room.touch()
                    await send(ws,{'type':'blessingConfirmed','id':blessing_id,'round':room.round,'ownBuffs':room.blessing_buffs[seat]})
                elif kind == 'ready':
                    if room.phase != 'prep':
                        await error(ws,'A partida não está em preparação.');continue
                    if pvp_blessing_round(room.round) and room.blessing_taken_round[seat]!=room.round:
                        await error(ws,'Escolha a bênção desta rodada antes de confirmar a equipe.');continue
                    if not all(c and not c.closed for c in room.clients):
                        await error(ws,'Aguardando seu amigo entrar na sala.');continue
                    try:
                        units = validate_units(event.get('units'),room.round)
                        proposed_deck=validate_deck(event.get('deck'))
                        if room.decks[seat] is not None and proposed_deck!=room.decks[seat]:
                            raise ValueError('O elenco fica fixo até acabar a partida.')
                        if any(u['type'] not in proposed_deck for u in units):
                            raise ValueError('Há personagens fora do elenco escolhido.')
                    except ValueError as exc:
                        await error(ws,str(exc));continue
                    room.units[seat]=units
                    if room.decks[seat] is None:room.decks[seat]=proposed_deck
                    room.ready[seat]=True
                    room.touch()
                    if all(room.ready):
                        room.prep_deadline=0
                        room.phase='combat'
                        for i,c in enumerate(room.clients):
                            await send(c, {'type':'start','round':room.round,'opponentUnits':room.units[1-i],
                                           'ownBuffs':room.blessing_buffs[i],
                                           'opponentBuffs':room.blessing_buffs[1-i]})
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
                    survived=validate_survivors(event.get('survivorStars'),room.units[room.last_winner])
                    room.wins[room.last_winner]+=1
                    damage=calc_pvp_damage(room.round,survived)
                    room.hp[1-room.last_winner]=max(0,room.hp[1-room.last_winner]-damage)
                    done=min(room.hp)<=0
                    if done:
                        room.phase='done'
                        room.series_wins[room.last_winner]+=1
                        room.history.append({'names':room.names[:], 'score':room.wins[:], 'hp':room.hp[:], 'winner':room.last_winner, 'at':int(time.time())})
                        room.history=room.history[-20:]
                    room.next_ready=[False,False]
                    room.touch()
                    await broadcast(room, {'type':'result','hostWin':event['hostWin'],'wins':room.wins,'hp':room.hp,'damage':damage,'survivorStars':survived,'done':done,'seriesWins':room.series_wins,'history':room.history[-10:]})
                elif kind == 'next':
                    if room.phase not in ('result','done'):
                        continue
                    room.next_ready[seat]=True
                    room.touch()
                    if all(room.next_ready):
                        rematch=room.phase=='done'
                        room.round=1 if rematch else room.round+1
                        if rematch:
                            room.wins=[0,0]
                            room.hp=[PVP_START_HP,PVP_START_HP]
                            room.decks=[None,None]
                            room.blessing_buffs=[pvp_buffs_zero(),pvp_buffs_zero()]
                        room.start_blessing_round()
                        room.ready=[False,False]
                        room.next_ready=[False,False]
                        room.units=[[],[]]
                        room.phase='prep'
                        room.prep_deadline=time.time()+120
                        for i,c in enumerate(room.clients):
                            await send(c, {'type':'nextRound','round':room.round,'wins':room.wins,'hp':room.hp,
                                           'rematch':rematch,'lastWinner':room.last_winner,
                                           'blessingOffer':room.blessing_offers[i],
                                           'ownBuffs':room.blessing_buffs[i]})
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
                        room.round=1;room.wins=[0,0];room.hp=[PVP_START_HP,PVP_START_HP];room.decks=[None,None];room.blessing_buffs=[pvp_buffs_zero(),pvp_buffs_zero()];room.start_blessing_round()
                    room.phase='prep'
                    if pvp_blessing_round(room.round) and room.blessing_offer_round!=room.round:room.start_blessing_round()
                    room.prep_deadline=0
                    room.units=[[],[]]
                    room.ready=[False,False]
                    room.next_ready=[False,False]
                await broadcast(room,{'type':'connection_lost','seat':seat,'graceSeconds':RECONNECT_GRACE,'round':room.round,'wins':room.wins,'hp':room.hp})
                await broadcast(room,room.message())
    return ws

async def index(_request):
    return web.FileResponse(ROOT/'index.html', headers={'Cache-Control':'no-store'})

# v2.9: trilha de preparação original disponibilizada por arquivo MP3.
# Os fragmentos binários ficam na branch exclusiva do jogo, nunca nos outros jogos.
PREP_AUDIO_PARTS = 13
PREP_AUDIO_SIZE = 3710752
PREP_AUDIO_SHA256 = '26c474648c7a7e2d74c02b92012d487074ba6944f04933f1c8bce27d74c02254'
PREP_AUDIO_CACHE = Path(tempfile.gettempdir()) / 'batalha-miniaturas-preparacao-v29.mp3'

def preparation_music_file():
    if PREP_AUDIO_CACHE.is_file() and PREP_AUDIO_CACHE.stat().st_size == PREP_AUDIO_SIZE:
        return PREP_AUDIO_CACHE
    parts = [ROOT / 'assets' / f'Seven_Measured_Steps_{i:02d}.part' for i in range(PREP_AUDIO_PARTS)]
    if not all(p.is_file() for p in parts):
        raise web.HTTPNotFound(text='Trilha de preparação indisponível no servidor.')
    temporary = PREP_AUDIO_CACHE.with_name(PREP_AUDIO_CACHE.name + '.' + secrets.token_hex(6) + '.tmp')
    try:
        digest = hashlib.sha256()
        with temporary.open('wb') as output:
            for part in parts:
                with part.open('rb') as source:
                    while True:
                        chunk = source.read(65536)
                        if not chunk:
                            break
                        digest.update(chunk)
                        output.write(chunk)
        if temporary.stat().st_size != PREP_AUDIO_SIZE or digest.hexdigest() != PREP_AUDIO_SHA256:
            raise web.HTTPInternalServerError(text='Falha de integridade da trilha de preparação.')
        os.replace(temporary, PREP_AUDIO_CACHE)
    finally:
        temporary.unlink(missing_ok=True)
    return PREP_AUDIO_CACHE

async def preparation_music(_request):
    path = preparation_music_file()
    return web.FileResponse(path, headers={'Cache-Control':'public, max-age=3600', 'Content-Type':'audio/mpeg'})

async def verify_preparation_track(_app):
    track = preparation_music_file()
    with track.open('rb') as source:
        checksum = hashlib.file_digest(source, 'sha256').hexdigest()
    if checksum != PREP_AUDIO_SHA256:
        raise RuntimeError('Trilha MP3 de preparação corrompida após reconstrução.')
    logging.info('Trilha de preparação validada no servidor: %s bytes, SHA-256 OK', track.stat().st_size)

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
app.add_routes([web.get('/',index),web.get('/ws',ws_handler),web.get('/health',health),web.get('/assets/Seven_Measured_Steps.mp3',preparation_music)])
app.on_startup.append(verify_preparation_track)
app.cleanup_ctx.append(background)
if __name__=='__main__':
    web.run_app(app, host='0.0.0.0', port=int(os.getenv('PORT','8000')))
