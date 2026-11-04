"""PvP ranqueado para Batalha de Miniaturas: fila em memória e elo no PostgreSQL.
O combate continua usando a simulação do cliente do anfitrião; esta primeira versão
não deve ser tratada como antitrapaça de nível competitivo.
"""
import asyncio
import secrets
import time
from aiohttp import web
from account_api import COOKIE_NAME, AuthError, json_error

START_POINTS = 100
POINTS_WIN = 10
POINTS_LOSS = 10

def tier(points):
    if points >= 1000: return "Mestre"
    if points >= 800: return "Diamante"
    if points >= 600: return "Platina"
    if points >= 400: return "Ouro"
    if points >= 200: return "Prata"
    return "Bronze"

class Ranked:
    def __init__(self, store, rooms, room_class, alphabet, max_rooms):
        self.db=store
        self.rooms=rooms
        self.room_class=room_class
        self.alphabet=alphabet
        self.max_rooms=max_rooms
        self.waiting={}
        self.by_socket={}
        self.active={}
        self.lock=asyncio.Lock()

    def setup(self):
        with self.db.connection() as con:
            self.db.query(con, """CREATE TABLE IF NOT EXISTS mini_ranked_rating (
                user_id TEXT PRIMARY KEY REFERENCES mini_users(id) ON DELETE CASCADE,
                points INTEGER NOT NULL DEFAULT 100 CHECK(points >= 0),
                wins INTEGER NOT NULL DEFAULT 0,
                losses INTEGER NOT NULL DEFAULT 0,
                matches INTEGER NOT NULL DEFAULT 0,
                updated_at BIGINT NOT NULL
            )""")
            self.db.query(con, """CREATE TABLE IF NOT EXISTS mini_ranked_matches (
                id TEXT PRIMARY KEY, user_a TEXT NOT NULL REFERENCES mini_users(id),
                user_b TEXT NOT NULL REFERENCES mini_users(id),
                winner_user TEXT NOT NULL REFERENCES mini_users(id),
                reason TEXT NOT NULL,
                finished_at BIGINT NOT NULL
            )""")
            self.db.query(con, "CREATE INDEX IF NOT EXISTS mini_ranked_rating_points ON mini_ranked_rating(points DESC)")

    def rating(self, uid):
        with self.db.connection() as con:
            self.db.query(con, """INSERT INTO mini_ranked_rating(user_id,points,wins,losses,matches,updated_at)
                VALUES(?,100,0,0,0,?) ON CONFLICT(user_id) DO NOTHING""", (uid,int(time.time())))
            row=self.db.query(con, "SELECT points,wins,losses,matches FROM mini_ranked_rating WHERE user_id=?", (uid,)).fetchone()
        return dict(row,division=tier(int(row['points'])))

    def leaders(self):
        with self.db.connection() as con:
            rows=self.db.query(con, """SELECT u.display_name,u.avatar,r.points,r.wins,r.losses
                FROM mini_ranked_rating r JOIN mini_users u ON u.id=r.user_id
                ORDER BY r.points DESC,r.wins DESC,u.username ASC LIMIT 50""").fetchall()
        return [dict(row,division=tier(int(row['points']))) for row in rows]

    def score_match(self, room, winner_seat, reason):
        if not getattr(room,'ranked',False):return None
        ids=room.ranked_ids
        winner=ids[winner_seat]
        now=int(time.time())
        with self.db.connection() as con:
            inserted=self.db.query(con, """INSERT INTO mini_ranked_matches(id,user_a,user_b,winner_user,reason,finished_at)
                VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING""",
                (room.ranked_match_id,ids[0],ids[1],winner,reason,now))
            if inserted.rowcount!=1:
                return None
            for seat,uid in enumerate(ids):
                delta=POINTS_WIN if seat==winner_seat else -POINTS_LOSS
                w=1 if seat==winner_seat else 0
                loss=1-w
                self.db.query(con, """UPDATE mini_ranked_rating
                    SET points=CASE WHEN points+? < 0 THEN 0 ELSE points+? END,
                        wins=wins+?, losses=losses+?, matches=matches+1, updated_at=?
                    WHERE user_id=?""",(delta,delta,w,loss,now,uid))
                # Recompensa real por partida ranqueada, emitida uma só vez junto ao resultado validado.
                if hasattr(self.db,'store_credit'):
                    self.db.store_credit(uid,coins=35 if w else 18,crystals=2 if w else 1,con=con)
            ratings=[]
            for uid in ids:
                row=self.db.query(con,"SELECT points,wins,losses,matches FROM mini_ranked_rating WHERE user_id=?",(uid,)).fetchone()
                ratings.append(dict(row,division=tier(int(row['points']))))
        return ratings

    async def finish(self,room,winner_seat,reason='battle'):
        if not getattr(room,'ranked',False) or getattr(room,'ranked_scored',False):return
        room.ranked_scored=True
        try:
            ratings=await asyncio.to_thread(self.score_match,room,winner_seat,reason)
        except Exception:
            room.ranked_scored=False
            raise
        for uid in room.ranked_ids:self.active.pop(uid,None)
        if ratings:
            for i,ws in enumerate(room.clients):
                if ws and not ws.closed:
                    await ws.send_json({'type':'ranked_rating','rating':ratings[i],
                        'opponentRating':ratings[1-i], 'won':i==winner_seat,
                        'matchId':room.ranked_match_id,'reason':reason})

    async def register(self,request,ws):
        user=await asyncio.to_thread(self.db.from_session,request.cookies.get(COOKIE_NAME,''))
        if not user:raise AuthError('Entre em sua conta para jogar PvP ranqueado.',401)
        uid=user['id']
        rating=await asyncio.to_thread(self.rating,uid)
        async with self.lock:
            if uid in self.active or uid in self.waiting or ws in self.by_socket:
                raise AuthError('Você já está em outra fila ou partida ranqueada.',409)
            now=time.monotonic()
            eligible=[]
            for other_id,other in self.waiting.items():
                if other['ws'].closed or other_id==uid:continue
                age=now-other['since']
                tolerance=25 + 25*int(age//15)
                if abs(other['rating']['points']-rating['points'])<=tolerance:
                    eligible.append((abs(other['rating']['points']-rating['points']),other['since'],other_id,other))
            if not eligible:
                self.waiting[uid]={'ws':ws,'user':user,'rating':rating,'since':now}
                await ws.send_json({'type':'ranked_wait','rating':rating,'searchSeconds':0})
                return None
            if len(self.rooms)>=self.max_rooms:raise AuthError('Servidor cheio. Tente novamente.',503)
            _,_,opponent_id,opponent=min(eligible,key=lambda x:(x[0],x[1]))
            self.waiting.pop(opponent_id,None)
            code=''.join(secrets.choice(self.alphabet) for _ in range(6))
            while code in self.rooms:code=''.join(secrets.choice(self.alphabet) for _ in range(6))
            room=self.room_class(code)
            room.ranked=True
            room.ranked_scored=False
            room.ranked_match_id=secrets.token_hex(16)
            room.ranked_ids=[opponent_id,uid]
            room.clients=[opponent['ws'],ws]
            room.claimed=[True,True]
            room.names=[opponent['user']['displayName'],user['displayName']]
            room.prep_deadline=time.time()+120
            self.rooms[code]=room
            self.active[opponent_id]=code
            self.active[uid]=code
            self.by_socket[opponent['ws']]=(room,0)
            self.by_socket[ws]=(room,1)
            for i,client in enumerate(room.clients):
                data={'type':'joined','ranked':True,'code':code,'seat':i,
                    'round':1,'wins':[0,0],'hp':room.hp,'token':room.tokens[i],
                    'reconnected':False,'phase':'prep','names':room.names,
                    'connected':[True,True],'seriesWins':[0,0],'history':[],
                    'prepDeadline':int(room.prep_deadline*1000),
                    'blessingOffer':[],'blessingTaken':False,'ownBuffs':room.blessing_buffs[i],
                    'rating':opponent['rating'] if i==0 else rating}
                await client.send_json(data)
            for client in room.clients:
                await client.send_json(room.message())
            return (room,1)

    async def stop_queue(self,ws):
        async with self.lock:
            for uid,item in list(self.waiting.items()):
                if item['ws'] is ws:self.waiting.pop(uid,None)
            self.by_socket.pop(ws,None)

    async def maintenance(self):
        now=time.monotonic()
        async with self.lock:
            for uid,entry in list(self.waiting.items()):
                if entry['ws'].closed:
                    self.waiting.pop(uid,None)
                else:
                    try:
                        await entry['ws'].send_json({'type':'ranked_wait','rating':entry['rating'],
                            'searchSeconds':int(now-entry['since'])})
                    except ConnectionError:
                        self.waiting.pop(uid,None)
            # Duas pessoas que esperaram ficam compatíveis com o alargamento da faixa.
            entries=list(self.waiting.items())
            for i,(opponent_id,opponent) in enumerate(entries):
                for uid,second in entries[i+1:]:
                    if len(self.rooms)>=self.max_rooms:return
                    if opponent['ws'].closed or second['ws'].closed:continue
                    age=max(now-opponent['since'],now-second['since'])
                    tolerance=25+25*int(age//15)
                    if abs(opponent['rating']['points']-second['rating']['points'])>tolerance:continue
                    user,ws,rating=second['user'],second['ws'],second['rating']
                    code=''.join(secrets.choice(self.alphabet) for _ in range(6))
                    while code in self.rooms:code=''.join(secrets.choice(self.alphabet) for _ in range(6))
                    room=self.room_class(code)
                    room.ranked=True
                    room.ranked_scored=False
                    room.ranked_match_id=secrets.token_hex(16)
                    room.ranked_ids=[opponent_id,uid]
                    room.clients=[opponent['ws'],ws]
                    room.claimed=[True,True]
                    room.names=[opponent['user']['displayName'],user['displayName']]
                    room.prep_deadline=time.time()+120
                    self.rooms[code]=room
                    self.active[opponent_id]=code
                    self.active[uid]=code
                    self.by_socket[opponent['ws']]=(room,0)
                    self.by_socket[ws]=(room,1)
                    for i,client in enumerate(room.clients):
                        data={'type':'joined','ranked':True,'code':code,'seat':i,
                            'round':1,'wins':[0,0],'hp':room.hp,'token':room.tokens[i],
                            'reconnected':False,'phase':'prep','names':room.names,
                            'connected':[True,True],'seriesWins':[0,0],'history':[],
                            'prepDeadline':int(room.prep_deadline*1000),
                            'blessingOffer':[],'blessingTaken':False,'ownBuffs':room.blessing_buffs[i],
                            'rating':opponent['rating'] if i==0 else rating}
                        await client.send_json(data)
                    for client in room.clients:
                        await client.send_json(room.message())
                    return

    async def forfeit(self,room,loser_seat):
        if not getattr(room,'ranked',False) or room.phase=='done':return
        room.phase='done'
        room.hp[loser_seat]=0
        room.last_winner=1-loser_seat
        await self.finish(room,1-loser_seat,'forfeit')
        for ws in room.clients:
            if ws and not ws.closed:
                await ws.send_json({'type':'ranked_forfeit','winner':room.last_winner,
                                    'hp':room.hp,'message':'O adversário abandonou a partida.'})

def install_ranked(app,store,rooms,room_class,alphabet,max_rooms):
    ranked=Ranked(store,rooms,room_class,alphabet,max_rooms)
    app['mini_ranked']=ranked
    async def setup(_):
        if store.enabled:await asyncio.to_thread(ranked.setup)
    app.on_startup.append(setup)

    async def ranked_me(request):
        try:
            if not store.enabled:raise AuthError('Ranking indisponível.',503)
            user=await asyncio.to_thread(store.from_session,request.cookies.get(COOKIE_NAME,''))
            if not user:raise AuthError('Faça login para consultar seu ranking.',401)
            rating=await asyncio.to_thread(ranked.rating,user['id'])
            return web.json_response({'rating':rating,'displayName':user['displayName']},headers={'Cache-Control':'no-store'})
        except AuthError as exc:return json_error(str(exc),exc.status)
        except Exception:
            request.app.logger.exception('Erro consultando ranking')
            return json_error('Não foi possível consultar o ranking.',500)

    async def leaderboard(request):
        try:
            leaders=await asyncio.to_thread(ranked.leaders)
            return web.json_response({'leaders':leaders},headers={'Cache-Control':'no-store'})
        except Exception:
            request.app.logger.exception('Erro no ranking geral')
            return json_error('Ranking indisponível.',500)

    app.router.add_get('/api/ranked/me',ranked_me)
    app.router.add_get('/api/ranked/leaderboard',leaderboard)
    return ranked
