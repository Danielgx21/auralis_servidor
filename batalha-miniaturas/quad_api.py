"""Orquestrador de partidas ranqueadas de quatro jogadores; preserva /ws e PvP amistoso.
Cada participante tem o próprio tabuleiro; combates ocorrem em pares alternados.
"""
import asyncio
import json
import logging
import random
import secrets
import time
from dataclasses import dataclass, field
from aiohttp import web, WSMsgType
from account_api import COOKIE_NAME
from ranked_quad_matchmaking import WaitingPlayer, choose_group
from ranked_api import tier

# PVP_BLESSING_EFFECTS e os validadores são importados na criação para evitar imports circulares.
SCORE_BY_PLACE = {1:15, 2:5, 3:-5, 4:-15}
HP_START = 70
DAMAGE_BASE = 2
GRACE_SECONDS = 150
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
BOT_TYPES = "guard spear axe bow druid hunter mage cleric golem rogue ghost paladin sentinel toxic shaman frost storm necro shade pyro tide earth spark seraph monk templar oracle".split()
BOT_ITEMS = "sword mail ward focus boots amulet ring orb staff charm shield lance bloodblade bastion windfang divine piercer heart arcana wardsteps hourglass trailboots plagueblade hexstaff thornmail".split()


@dataclass
class QuadSeat:
    user_id: str | None
    name: str
    rating: int
    ws: object = None
    token: str = field(default_factory=lambda:secrets.token_urlsafe(24))
    disconnected_at: float = 0.
    bot: bool = False
    eliminated: bool = False
    hp: int = HP_START
    ready: bool = False
    next_ready: bool = False
    units: list = field(default_factory=list)
    deck: list | None = None
    buffs: dict = field(default_factory=lambda:{'atk':0,'ad':0,'ap':0,'armor':0,'speed':0.,'hp':0})
    blessing_choices: list = field(default_factory=list)
    blessing_used: int = 0
    wins: int = 0
    last_win: bool = False
    placement: int = 0


@dataclass
class QuadGame:
    code: str
    seats: list
    round: int = 1
    phase: str = "prep"
    created: float = field(default_factory=time.monotonic)
    updated: float = field(default_factory=time.monotonic)
    prep_deadline: float = field(default_factory=lambda:time.time()+120)
    pairs: list = field(default_factory=list)
    finished_pairs: set = field(default_factory=set)
    last_frames: dict = field(default_factory=dict)
    placements: list = field(default_factory=list)
    scored: bool = False


class QuadLeague:
    def __init__(self, app, store, ranked, validators):
        self.app=app
        self.store=store
        self.ranked=ranked
        self.validate_deck=validators['deck']
        self.validate_units=validators['units']
        self.validate_survivors=validators['survivors']
        self.damage=validators['damage']
        self.blessings=validators['blessings']
        self.room_limit=validators['max_rooms']
        self.games={}
        self.queues={}
        self.sockets={}
        self.active={}
        self.lock=asyncio.Lock()

    def setup(self):
        with self.store.connection() as con:
            self.store.query(con,"""CREATE TABLE IF NOT EXISTS mini_quad_results (
                match_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES mini_users(id),
                place INTEGER NOT NULL CHECK(place BETWEEN 1 AND 4),
                points_delta INTEGER NOT NULL, created_at BIGINT NOT NULL,
                PRIMARY KEY(match_id,user_id))""")

    async def send(self,seat,message):
        if seat.ws and not seat.ws.closed:
            try:await seat.ws.send_json(message)
            except (ConnectionError,RuntimeError):pass

    async def send_all(self,game,message):
        await asyncio.gather(*(self.send(seat,message) for seat in game.seats if not seat.bot),return_exceptions=True)

    def bot_units(self,game,seat_index):
        seat=game.seats[seat_index]
        seed=int.from_bytes(game.code.encode(),"little")+seat_index*421+game.round*1531
        rng=random.Random(seed)
        max_count=min(6,3+(game.round-1)//3)
        choices=list(seat.deck or BOT_TYPES)
        rng.shuffle(choices)
        group=choices[:max_count]
        units=[]
        for i,typ in enumerate(group):
            star=1
            if game.round>=5 and rng.random()<min(.8,.13+(game.round-5)*.06):star=2
            if game.round>=14 and rng.random()<min(.3,(game.round-13)*.025):star=3
            item_count=min(2, 1 if game.round>=4 else 0)
            if game.round>=9 and rng.random()<.55:item_count=2
            units.append({'type':typ,'star':star,'x':i,'y':5 if i<3 else 4,
                          'items':rng.sample(BOT_ITEMS,item_count)})
        return units

    def make_pairs(self,game):
        alive=[i for i,s in enumerate(game.seats) if not s.eliminated]
        ghost=[i for i,s in enumerate(game.seats) if s.eliminated]
        if len(alive)<=1:return []
        if len(alive)==2:
            a,b=alive
            return [(b,a)] if game.seats[a].bot and not game.seats[b].bot else [(a,b)]
        if len(alive)==3:
            order=alive[game.round%3:]+alive[:game.round%3]
            first=(order[0],order[1]); second=(order[2],ghost[0])
            if game.seats[first[0]].bot and not game.seats[first[1]].bot:first=first[::-1]
            if game.seats[second[0]].bot and not game.seats[second[1]].bot:second=second[::-1]
            return [first,second]
        rotations=[[(0,1),(2,3)],[(0,2),(1,3)],[(0,3),(1,2)]]
        pairs=rotations[(game.round-1)%3]
        return [(b,a) if game.seats[a].bot and not game.seats[b].bot else (a,b) for a,b in pairs]

    def snapshot(self,game):
        return {'type':'quad_state','round':game.round,'phase':game.phase,
                'participants':[{'seat':i,'name':s.name,'hp':s.hp,'isBot':s.bot,
                                 'eliminated':s.eliminated,'wins':s.wins,'place':s.placement}
                                for i,s in enumerate(game.seats)],
                'placements':game.placements[:], 'deadline':int(game.prep_deadline*1000)}

    def pair_for(self,game,seat_idx):
        for index,(a,b) in enumerate(game.pairs):
            if seat_idx in (a,b):return (index,a,b)
        return None

    def pair_metadata(self,game,seat_idx):
        p=self.pair_for(game,seat_idx)
        if not p:return None
        _,a,b=p
        sa,sb=game.seats[a],game.seats[b]
        return {'pairIndex':p[0],'role':0 if seat_idx==a else 1,
                'names':[sa.name,sb.name],'hp':[sa.hp,sb.hp],
                'opponentSeat':b if seat_idx==a else a,
                'connected':[bool(sa.bot or (sa.ws and not sa.ws.closed)),
                             bool(sb.bot or (sb.ws and not sb.ws.closed))]}

    def assign_blessings(self,game):
        if (game.round-1)%4:
            for seat in game.seats:seat.blessing_choices=[]
            return
        for i,seat in enumerate(game.seats):
            if seat.eliminated:continue
            picker=random.Random(game.round*701 + i*29 + int.from_bytes(game.code.encode(),"little"))
            seat.blessing_choices=picker.sample(list(self.blessings),3)
            seat.blessing_used=0
            if seat.bot:
                self.apply_blessing(seat,seat.blessing_choices[0],game.round)

    def apply_blessing(self,seat,choice,round_number):
        if choice not in seat.blessing_choices or seat.blessing_used==round_number:
            raise ValueError("Bênção inválida ou já escolhida.")
        effect=self.blessings[choice]
        if effect:
            key,amount=effect
            seat.buffs[key]=round(seat.buffs.get(key,0)+amount,4)
        seat.blessing_used=round_number

    async def signal_blessing(self,game,seat_idx):
        seat=game.seats[seat_idx]
        if seat.bot:return
        await self.send(seat,{'type':'quad_blessing_offer','round':game.round,
                              'options':seat.blessing_choices,'taken':seat.blessing_used==game.round,
                              'ownBuffs':seat.buffs})

    async def start_match(self,plan):
        if len(self.games)>=self.room_limit:return False
        humans=list(plan.players)
        ids=[p.user_id for p in humans]
        if any(uid not in self.queues or uid in self.active for uid in ids):
            return False
        code=''.join(secrets.choice(ALPHABET) for _ in range(8))
        while code in self.games:code=''.join(secrets.choice(ALPHABET) for _ in range(8))
        seats=[]
        for p in humans:
            data=self.queues[p.user_id]
            seats.append(QuadSeat(user_id=p.user_id,name=data['name'],rating=p.rating,ws=data['ws']))
        for i,bot in enumerate(plan.bots):
            seats.append(QuadSeat(user_id=None,name='Bot '+str(i+1),rating=bot.rating,bot=True))
        game=QuadGame(code,seats)
        self.games[code]=game
        for i,seat in enumerate(seats):
            if seat.bot:seat.deck=random.Random(i+int(time.time())).sample(BOT_TYPES,14)
            else:
                self.queues.pop(seat.user_id,None)
                self.active[seat.user_id]=(code,i)
                self.sockets[seat.ws]=(code,i)
        game.pairs=self.make_pairs(game)
        self.assign_blessings(game)
        for i,seat in enumerate(game.seats):
            if seat.bot:
                seat.units=self.bot_units(game,i)
                seat.ready=True
        for idx,seat in enumerate(seats):
            if seat.bot:continue
            await self.send(seat,{'type':'quad_joined','code':code,'seat':idx,'token':seat.token,
                                  'participants':self.snapshot(game)['participants'],
                                  'round':1,'pair':self.pair_metadata(game,idx),
                                  'blessingOffer':seat.blessing_choices,
                                  'ownBuffs':seat.buffs})
            await self.signal_blessing(game,idx)
        await self.send_all(game,self.snapshot(game))
        return True

    async def match_queue(self):
        now=time.monotonic()
        async with self.lock:
            for uid,entry in list(self.queues.items()):
                if entry['ws'].closed:self.queues.pop(uid,None)
            while True:
                waiting=[WaitingPlayer(uid,entry['rating'],entry['since'])
                         for uid,entry in self.queues.items()]
                plan=choose_group(waiting,now)
                if plan is None:break
                if not await self.start_match(plan):break
            for uid,entry in list(self.queues.items()):
                seconds=int(now-entry['since'])
                await entry['ws'].send_json({'type':'ranked_wait','searchSeconds':seconds,
                    'rating':entry['rating_data'],'playersWaiting':len(self.queues),'targetPlayers':4})

    async def queue(self,ws,request):
        user=await asyncio.to_thread(self.store.from_session,request.cookies.get(COOKIE_NAME,''))
        if not user:
            await ws.send_json({'type':'error','message':'Entre na conta para jogar ranqueado.'})
            return
        uid=user['id']
        async with self.lock:
            if uid in self.active or uid in self.queues:
                await ws.send_json({'type':'error','message':'Você já está em uma fila ou partida.'})
                return
            rank=await asyncio.to_thread(self.ranked.rating,uid)
            self.queues[uid]={'ws':ws,'name':user['displayName'],
                              'rating':rank['points'],'rating_data':rank,'since':time.monotonic()}
            await ws.send_json({'type':'ranked_wait','searchSeconds':0,'rating':rank,
                                'playersWaiting':len(self.queues),'targetPlayers':4})
        await self.match_queue()

    def account_for(self,ws):
        record=self.sockets.get(ws)
        if not record:return None
        code,idx=record
        g=self.games.get(code)
        if not g:return None
        return g,idx

    async def score(self,game):
        if game.scored:return
        game.scored=True
        placements=game.placements[:]
        for i in range(4):
            if i not in placements:placements.append(i)
        updates=[]
        now=int(time.time())
        def save():
            with self.store.connection() as con:
                for place,idx in enumerate(placements,1):
                    seat=game.seats[idx]
                    if seat.bot:continue
                    points_delta=SCORE_BY_PLACE[place]
                    inserted=self.store.query(con,"""INSERT INTO mini_quad_results
                        (match_id,user_id,place,points_delta,created_at) VALUES(?,?,?,?,?)
                        ON CONFLICT(match_id,user_id) DO NOTHING""",
                        (game.code,seat.user_id,place,points_delta,now))
                    if inserted.rowcount!=1:continue
                    self.store.query(con,"""UPDATE mini_ranked_rating SET
                        points=CASE WHEN points+? < 0 THEN 0 ELSE points+? END,
                        wins=wins+?, losses=losses+?,matches=matches+1,updated_at=?
                        WHERE user_id=?""",(points_delta,points_delta,int(place<=2),int(place>2),now,seat.user_id))
                    row=self.store.query(con,"SELECT points,wins,losses,matches FROM mini_ranked_rating WHERE user_id=?",(seat.user_id,)).fetchone()
                    updates.append((idx,place,points_delta,dict(row)))
        try:await asyncio.to_thread(save)
        except Exception:
            game.scored=False
            logging.exception("Falha ao salvar pontuação ranqueada de quatro jogadores")
            return
        for idx,place,delta,stats in updates:
            stats['division']=tier(stats['points'])
            await self.send(game.seats[idx],{'type':'quad_rating','place':place,'delta':delta,'rating':stats})
        for seat in game.seats:
            if seat.user_id:self.active.pop(seat.user_id,None)

    async def final(self,game):
        if game.phase=='done':return
        rest=[i for i,s in enumerate(game.seats) if not s.eliminated]
        rest.sort(key=lambda i:(-game.seats[i].hp,-game.seats[i].wins,i))
        for idx in reversed(rest):
            if idx not in game.placements:game.placements.insert(0,idx)
        game.phase='done'
        game.updated=time.monotonic()
        for place,idx in enumerate(game.placements,1):game.seats[idx].placement=place
        await self.score(game)
        await self.send_all(game,{'type':'quad_final','placements':[
            {'place':place,'seat':idx,'name':game.seats[idx].name,'bot':game.seats[idx].bot}
            for place,idx in enumerate(game.placements,1)]})
        await self.send_all(game,self.snapshot(game))

    async def advance(self,game):
        living=[i for i,s in enumerate(game.seats) if not s.eliminated]
        if len(living)<=1 or not any(not seat.bot and not seat.eliminated for seat in game.seats):
            await self.final(game);return
        game.round+=1
        game.phase='prep'
        game.prep_deadline=time.time()+120
        game.pairs=self.make_pairs(game)
        for i,seat in enumerate(game.seats):
            if seat.bot:
                seat.units=self.bot_units(game,i)
                seat.ready=True
        game.finished_pairs.clear()
        game.last_frames.clear()
        self.assign_blessings(game)
        for i,seat in enumerate(game.seats):
            if seat.eliminated or seat.bot:continue
            seat.ready=False
            seat.next_ready=False
            pair=self.pair_metadata(game,i)
            await self.send(seat,{'type':'quad_next_round','round':game.round,'pair':pair,
                                  'lastWin':seat.last_win,'blessingOffer':seat.blessing_choices,
                                  'ownBuffs':seat.buffs,'participants':self.snapshot(game)['participants']})
            await self.signal_blessing(game,i)
        await self.send_all(game,self.snapshot(game))

    def maybe_finish_placement(self,game):
        eliminated=[]
        for idx,seat in enumerate(game.seats):
            if not seat.eliminated and seat.hp<=0:
                seat.eliminated=True
                eliminated.append(idx)
        eliminated.sort(key=lambda idx:(game.seats[idx].hp,game.seats[idx].wins))
        for idx in eliminated:
            # Guardar eliminados do pior para o melhor. A final inverte.
            game.placements.insert(0,idx)
        return eliminated

    async def resolve_pair(self,game,pair_idx,host_win,survivor_stars):
        if pair_idx in game.finished_pairs:return
        a,b=game.pairs[pair_idx]
        host=game.seats[a]
        guest=game.seats[b]
        winner=a if host_win else b
        loser=b if host_win else a
        # Só os sobreviventes da formação enviada (ou a IA) podem causar dano.
        win_units=game.seats[winner].units
        stars=self.validate_survivors(survivor_stars,win_units)
        damage=self.damage(game.round,stars)
        game.seats[loser].hp=max(0,game.seats[loser].hp-damage)
        game.seats[winner].wins+=1
        game.seats[winner].last_win=True
        game.seats[loser].last_win=False
        game.finished_pairs.add(pair_idx)
        for idx in (a,b):
            seat=game.seats[idx]
            if seat.bot or seat.eliminated:continue
            pair=self.pair_metadata(game,idx)
            await self.send(seat,{'type':'quad_result','round':game.round,'pair':pair,
                                  'hostWin':bool(host_win),'damage':damage,'winnerSeat':winner,
                                  'survivors':stars,'participants':self.snapshot(game)['participants']})
        if len(game.finished_pairs)==len(game.pairs):
            self.maybe_finish_placement(game)
            living=[i for i,s in enumerate(game.seats) if not s.eliminated]
            if len(living)<=1 or not any(not seat.bot and not seat.eliminated for seat in game.seats):
                await self.final(game)
            else:
                game.phase='result'
                await self.send_all(game,self.snapshot(game))
                if all(s.bot or s.eliminated or s.next_ready for s in game.seats):
                    await self.advance(game)

    async def begin_battles(self,game):
        if game.phase!='prep':return
        living=[s for s in game.seats if not s.eliminated]
        if any(not s.ready for s in living):return
        game.phase='combat'
        game.updated=time.monotonic()
        for i,(a,b) in enumerate(game.pairs):
            host,guest=game.seats[a],game.seats[b]
            for idx in (a,b):
                seat=game.seats[idx]
                if seat.bot or seat.eliminated:continue
                await self.send(seat,{'type':'quad_start','round':game.round,
                    'pair':self.pair_metadata(game,idx),
                    'opponentUnits':game.seats[b if idx==a else a].units,
                    'opponentBuffs':game.seats[b if idx==a else a].buffs,
                    'ownBuffs':seat.buffs})
            if host.bot:
                # Host bot: não usa cliente. Resolver por comparação simplificada com pequeno ruído.
                weights=lambda units:sum(u['star']*15+len(u['items'])*6 for u in units)
                host_power=weights(host.units)+random.Random(game.round*31+a).randrange(-8,9)
                guest_power=weights(guest.units)+random.Random(game.round*31+b).randrange(-8,9)
                winner_is_host=host_power>=guest_power
                winning=host.units if winner_is_host else guest.units
                await self.resolve_pair(game,i,winner_is_host,[u['star'] for u in winning])

    async def handle(self,ws,game,idx,event):
        seat=game.seats[idx]
        kind=event.get('type')
        if kind=='quad_blessing':
            try:self.apply_blessing(seat,event.get('id'),game.round)
            except ValueError as e:
                await self.send(seat,{'type':'error','message':str(e)});return
            await self.send(seat,{'type':'quad_blessing_confirmed','round':game.round,
                                  'id':event['id'],'ownBuffs':seat.buffs})
        elif kind=='quad_ready':
            if game.phase!='prep' or seat.eliminated:return
            if (game.round-1)%4==0 and seat.blessing_used!=game.round:
                await self.send(seat,{'type':'error','message':'Escolha a bênção da rodada.'});return
            try:
                units=self.validate_units(event.get('units'),game.round)
                deck=self.validate_deck(event.get('deck'))
                if any(u['type'] not in deck for u in units) or (seat.deck is not None and deck!=seat.deck):
                    raise ValueError('Elenco não permitido.')
            except ValueError as e:
                await self.send(seat,{'type':'error','message':str(e)});return
            seat.deck=deck
            seat.units=units
            seat.ready=True
            game.updated=time.monotonic()
            await self.send(seat,{'type':'quad_ready_confirmed'})
            await self.begin_battles(game)
        elif kind=='quad_frame':
            if game.phase!='combat':return
            pair=self.pair_for(game,idx)
            if not pair or pair[1]!=idx or pair[0] in game.finished_pairs:return
            frame=event.get('frame')
            if not isinstance(frame,dict) or not isinstance(frame.get('allies'),list) or not isinstance(frame.get('enemies'),list):return
            if len(frame['allies'])>12 or len(frame['enemies'])>12:return
            game.last_frames[pair[0]]=frame
            guest=game.seats[pair[2]]
            await self.send(guest,{'type':'quad_frame','frame':frame})
        elif kind=='quad_finish':
            pair=self.pair_for(game,idx)
            if not pair or game.phase!='combat' or pair[1]!=idx or pair[0] in game.finished_pairs:return
            if type(event.get('hostWin')) is not bool:return
            frame=game.last_frames.get(pair[0])
            if not frame or frame.get('tick',0)<2:
                await self.send(seat,{'type':'error','message':'Resultado sem simulação de combate.'});return
            host_win=event['hostWin']
            alive_a=[u for u in frame.get('allies',[]) if isinstance(u,dict) and u.get('hp',0)>0]
            alive_b=[u for u in frame.get('enemies',[]) if isinstance(u,dict) and u.get('hp',0)>0]
            if host_win and not alive_a or not host_win and not alive_b:return
            expected=sorted(u.get('star') for u in (alive_a if host_win else alive_b))
            if expected!=sorted(event.get('survivorStars') or []):return
            try:await self.resolve_pair(game,pair[0],host_win,event.get('survivorStars'))
            except ValueError:pass
        elif kind=='quad_next':
            if game.phase not in ('combat','result') or seat.eliminated:return
            pair=self.pair_for(game,idx)
            if game.phase=='combat' and (not pair or pair[0] not in game.finished_pairs):return
            seat.next_ready=True
            if game.phase=='result' and all(s.bot or s.eliminated or s.next_ready for s in game.seats):
                await self.advance(game)
        elif kind=='quad_leave':
            if game.phase not in ('done',):
                seat.hp=0
                if game.phase=='combat':
                    # Interromper combate do par e atribuir derrota, não contabilizar duas vezes.
                    pair=self.pair_for(game,idx)
                    if pair and pair[0] not in game.finished_pairs:
                        winner=pair[2] if pair[1]==idx else pair[1]
                        winners=game.seats[winner].units
                        await self.resolve_pair(game,pair[0],winner==pair[1],
                                                [u['star'] for u in winners])
                if game.phase in ('prep','result'):
                    self.maybe_finish_placement(game)
                    if sum(not s.eliminated for s in game.seats)<=1 or not any(not s.bot and not s.eliminated for s in game.seats):
                        await self.final(game)
                    else:
                        await self.advance(game)

    async def disconnect(self,ws):
        self.sockets.pop(ws,None)
        for uid,item in list(self.queues.items()):
            if item['ws'] is ws:self.queues.pop(uid,None)
        for game in self.games.values():
            for seat in game.seats:
                if seat.ws is ws:
                    seat.ws=None
                    seat.disconnected_at=time.monotonic()
                    if game.phase not in ('done',):
                        await self.send_all(game,self.snapshot(game))
                    return

    async def reconnect(self,ws,request,code,token):
        game=self.games.get(str(code))
        user=await asyncio.to_thread(self.store.from_session,request.cookies.get(COOKIE_NAME,''))
        if not game or not user:return None
        for i,seat in enumerate(game.seats):
            if seat.user_id==user['id'] and secrets.compare_digest(seat.token,str(token)):
                if seat.ws and not seat.ws.closed or seat.disconnected_at and time.monotonic()-seat.disconnected_at>GRACE_SECONDS:return None
                seat.ws=ws
                seat.disconnected_at=0.
                self.sockets[ws]=(game.code,i)
                await self.send(seat,{'type':'quad_joined','code':game.code,'seat':i,'token':seat.token,
                      'reconnected':True,'round':game.round,'pair':self.pair_metadata(game,i),
                      'participants':self.snapshot(game)['participants'],
                      'blessingOffer':seat.blessing_choices,'ownBuffs':seat.buffs})
                await self.send(seat,self.snapshot(game))
                await self.signal_blessing(game,i)
                return (game,i)
        return None

    async def tick(self):
        await self.match_queue()
        for code,game in list(self.games.items()):
            if game.phase=='done':
                if time.monotonic()-game.updated>120:self.games.pop(code,None)
                continue
            disconnected=[]
            for i,seat in enumerate(game.seats):
                if not seat.bot and not seat.eliminated and seat.disconnected_at and time.monotonic()-seat.disconnected_at>GRACE_SECONDS:
                    disconnected.append(i)
            if disconnected:
                for idx in disconnected:
                    game.seats[idx].hp=0
                self.maybe_finish_placement(game)
                if sum(not s.eliminated for s in game.seats)<=1 or not any(not s.bot and not s.eliminated for s in game.seats):
                    await self.final(game)
                else:
                    await self.advance(game)
            if game.phase=='prep' and time.time()>game.prep_deadline:
                # Igual ao PvP antigo, reiniciar a preparação; não remover elencos.
                game.prep_deadline=time.time()+120
                await self.send_all(game,{'type':'quad_prep_timeout','round':game.round,'deadline':int(game.prep_deadline*1000)})

    async def websocket(self,request):
        ws=web.WebSocketResponse(heartbeat=30,max_msg_size=180000)
        await ws.prepare(request)
        try:
            async for msg in ws:
                if msg.type!=WSMsgType.TEXT:continue
                try:ev=json.loads(msg.data)
                except (ValueError,TypeError):continue
                if not isinstance(ev,dict):continue
                if ev.get('type')=='quad_queue':
                    await self.queue(ws,request);continue
                if ev.get('type')=='quad_cancel':
                    await self.disconnect(ws);await ws.close();break
                if ev.get('type')=='quad_resume':
                    if not await self.reconnect(ws,request,ev.get('code'),ev.get('token')):
                        await ws.send_json({'type':'error','message':'Não foi possível reconectar ao ranqueado.'})
                    continue
                target=self.account_for(ws)
                if target:await self.handle(ws,*target,ev)
                else:await ws.send_json({'type':'error','message':'Você não está numa partida de quatro jogadores.'})
        finally:
            await self.disconnect(ws)
        return ws



def smoke_quad_pairings():
    """Invariantes verificadas no arranque, sem adicionar usuários ao banco."""
    from ranked_quad_matchmaking import WaitingPlayer, choose_group
    now=1000.
    four=[WaitingPlayer(str(i),100+i,now-10) for i in range(4)]
    p=choose_group(four,now)
    assert p and len(p.players)==4 and not p.bots
    p=choose_group([WaitingPlayer('a',100,now-91)],now)
    assert p and len(p.players)==1 and len(p.bots)==3
    p=choose_group([WaitingPlayer('a',100,now-30)],now)
    assert p is None
    assert set(SCORE_BY_PLACE)=={1,2,3,4}
    return True

def install_quad(app,store,ranked,validators):
    smoke_quad_pairings()
    logging.info('Pareamento de 4 jogadores e fallback de bots: invariantes OK')
    league=QuadLeague(app,store,ranked,validators)
    app['mini_quad']=league
    async def startup(_app):
        if store.enabled:await asyncio.to_thread(league.setup)
    app.on_startup.append(startup)

    async def background(_app):
        async def loop():
            while True:
                await asyncio.sleep(2)
                try:await league.tick()
                except Exception:logging.exception("Erro no pareamento/rodadas ranqueadas")
        task=asyncio.create_task(loop())
        yield
        task.cancel()
        try:await task
        except asyncio.CancelledError:pass

    app.cleanup_ctx.append(background)
    app.router.add_get('/ws-quad',league.websocket)
    return league
