"""Lista persistente de amigos e convites temporarios de PvP."""
import asyncio
import re
import secrets
import time
from aiohttp import web
from account_api import AuthError, COOKIE_NAME, guard_rate_limit, json_body, json_error

class Friends:
    def __init__(self, store):
        self.db=store
        self.online={}
        self.invites={}

    def setup(self):
        with self.db.connection() as con:
            self.db.query(con, """CREATE TABLE IF NOT EXISTS mini_friends (
              user_low TEXT NOT NULL REFERENCES mini_users(id) ON DELETE CASCADE,
              user_high TEXT NOT NULL REFERENCES mini_users(id) ON DELETE CASCADE,
              requester_id TEXT NOT NULL REFERENCES mini_users(id) ON DELETE CASCADE,
              status TEXT NOT NULL CHECK (status IN ('pending','accepted')),
              created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
              PRIMARY KEY(user_low,user_high))""")
            self.db.query(con,"CREATE INDEX IF NOT EXISTS mini_friends_high ON mini_friends(user_high)")

    def pair(self,a,b):
        return (a,b) if a<b else (b,a)

    def relationships(self,uid):
        with self.db.connection() as con:
            rows=self.db.query(con,"""SELECT f.requester_id,f.status,u.id,u.username,u.display_name,u.avatar
                 FROM mini_friends f JOIN mini_users u
                   ON u.id=CASE WHEN f.user_low=? THEN f.user_high ELSE f.user_low END
                 WHERE f.user_low=? OR f.user_high=?
                 ORDER BY f.updated_at DESC LIMIT 120""",(uid,uid,uid)).fetchall()
        return [dict(r) for r in rows]

    def request(self,uid,name):
        name=str(name or '').strip().lower()
        if not re.fullmatch(r'[a-z0-9][a-z0-9_.-]{2,23}',name):
            raise AuthError('Informe o nome de usuario completo do amigo.')
        now=int(time.time())
        with self.db.connection() as con:
            found=self.db.query(con,'SELECT id FROM mini_users WHERE username=?',(name,)).fetchone()
            if not found:raise AuthError('Usuario nao encontrado.',404)
            target=found['id']
            if target==uid:raise AuthError('Voce nao pode adicionar sua propria conta.')
            lo,hi=self.pair(uid,target)
            old=self.db.query(con,'SELECT requester_id,status FROM mini_friends WHERE user_low=? AND user_high=?',(lo,hi)).fetchone()
            if old:
                if old['status']=='accepted':raise AuthError('Voces ja sao amigos.',409)
                if old['requester_id']==uid:raise AuthError('Solicitacao ja enviada.',409)
                self.db.query(con,"UPDATE mini_friends SET status='accepted',updated_at=? WHERE user_low=? AND user_high=?",(now,lo,hi))
                return {'ok':True,'accepted':True}
            self.db.query(con,"""INSERT INTO mini_friends(user_low,user_high,requester_id,status,created_at,updated_at)
                VALUES (?,?,?,'pending',?,?)""",(lo,hi,uid,now,now))
        return {'ok':True,'accepted':False}

    def respond(self,uid,other,accept):
        lo,hi=self.pair(uid,other)
        with self.db.connection() as con:
            r=self.db.query(con,'SELECT requester_id,status FROM mini_friends WHERE user_low=? AND user_high=?',(lo,hi)).fetchone()
            if not r or r['status']!='pending' or r['requester_id']==uid:
                raise AuthError('Solicitacao nao encontrada.',404)
            if accept:
                self.db.query(con,"UPDATE mini_friends SET status='accepted',updated_at=? WHERE user_low=? AND user_high=?",(int(time.time()),lo,hi))
            else:
                self.db.query(con,'DELETE FROM mini_friends WHERE user_low=? AND user_high=?',(lo,hi))
        return {'ok':True}

    def remove(self,uid,other):
        lo,hi=self.pair(uid,other)
        with self.db.connection() as con:
            self.db.query(con,"DELETE FROM mini_friends WHERE user_low=? AND user_high=? AND status='accepted'",(lo,hi))
        for k,v in list(self.invites.items()):
            if {v['from'],v['to']}=={uid,other}:self.invites.pop(k,None)
        return {'ok':True}

    def accepted(self,a,b):
        lo,hi=self.pair(a,b)
        with self.db.connection() as con:
            r=self.db.query(con,"SELECT 1 FROM mini_friends WHERE user_low=? AND user_high=? AND status='accepted'",(lo,hi)).fetchone()
        return bool(r)

    def prune(self):
        now=time.monotonic()
        for uid,t in list(self.online.items()):
            if now-t>40:self.online.pop(uid,None)
        for key,v in list(self.invites.items()):
            if now>v['expires']:self.invites.pop(key,None)

    def snapshot(self,user):
        self.prune()
        uid=user['id'];self.online[uid]=time.monotonic()
        friends=[];incoming=[];outgoing=[]
        for r in self.relationships(uid):
            other={'id':r['id'],'username':r['username'],'displayName':r['display_name'],
                   'avatar':r['avatar'],'online':r['id'] in self.online}
            if r['status']=='accepted':friends.append(other)
            elif r['requester_id']==uid:outgoing.append(other)
            else:incoming.append(other)
        invites=[]
        for v in self.invites.values():
            if uid not in (v['from'],v['to']):continue
            other_id=v['to'] if uid==v['from'] else v['from']
            other=next((p for p in friends if p['id']==other_id),None)
            if other:
                invites.append({'id':v['id'],'direction':'outgoing' if uid==v['from'] else 'incoming',
                                'status':v['status'],'friend':other,
                                'room':v['room'] if uid==v['to'] else None})
        return {'friends':friends,'incoming':incoming,'outgoing':outgoing,'challenges':invites}

    def challenge(self,uid,other):
        self.prune()
        if other==uid:raise AuthError('Escolha outro jogador.')
        if other not in self.online:raise AuthError('Este amigo nao esta online.',409)
        if not self.accepted(uid,other):raise AuthError('Apenas amigos podem se desafiar.',403)
        if any({v['from'],v['to']}=={uid,other} for v in self.invites.values()):
            raise AuthError('Ja existe um convite entre voces.',409)
        key=secrets.token_urlsafe(18)
        self.invites[key]={'id':key,'from':uid,'to':other,'status':'pending',
                           'room':None,'expires':time.monotonic()+120}
        return {'ok':True}

    def answer_challenge(self,uid,key,accept):
        self.prune()
        v=self.invites.get(key)
        if not v or v['to']!=uid or v['status']!='pending':
            raise AuthError('Convite nao encontrado ou expirado.',404)
        if not self.accepted(v['from'],uid):raise AuthError('Amizade nao encontrada.',403)
        if accept:
            v['status']='accepted';v['expires']=time.monotonic()+240
        else:self.invites.pop(key,None)
        return {'ok':True}

    def register_room(self,uid,key,code,token,rooms):
        self.prune()
        v=self.invites.get(key)
        if not v or v['from']!=uid or v['status']!='accepted' or v['room']:
            raise AuthError('Desafio nao aguarda sala.',409)
        if not isinstance(code,str) or not re.fullmatch(r'[A-HJ-NP-Z2-9]{6}',code):
            raise AuthError('Codigo invalido.')
        room=rooms.get(code)
        if not room or not room.clients[0] or not room.claimed[0] or room.clients[1] or room.claimed[1]:
            raise AuthError('Sala indisponivel para este desafio.',409)
        if not isinstance(token,str) or not secrets.compare_digest(token,room.tokens[0]):
            raise AuthError('Sala nao pertence a quem convidou.',403)
        v['room']=code
        return {'ok':True}

def install_friends_api(app,store):
    friends=Friends(store)
    app['mini_friends']=friends
    async def setup(_):
        if store.enabled:await asyncio.to_thread(friends.setup)
    app.on_startup.append(setup)
    async def handler(request):
        try:
            if not store.enabled:raise AuthError('Contas indisponiveis.',503)
            uid=await asyncio.to_thread(store.from_session,request.cookies.get(COOKIE_NAME,''))
            if not uid:raise AuthError('Entre na sua conta para utilizar amigos.',401)
            action=request.match_info['action']
            if action=='state' and request.method=='GET':
                return web.json_response(await asyncio.to_thread(friends.snapshot,uid),headers={'Cache-Control':'no-store'})
            if request.method!='POST':raise AuthError('Rota inexistente.',404)
            body=await json_body(request)
            guard_rate_limit(('friends',uid['id']),30,600)
            other=body.get('userId')
            if action in ('respond','remove','challenge'):
                if not isinstance(other,str) or not 10<=len(other)<=80:raise AuthError('Usuario invalido.')
            if action=='request':out=await asyncio.to_thread(friends.request,uid['id'],body.get('username'))
            elif action=='respond':out=await asyncio.to_thread(friends.respond,uid['id'],other,body.get('accept') is True)
            elif action=='remove':out=await asyncio.to_thread(friends.remove,uid['id'],other)
            elif action=='challenge':out=await asyncio.to_thread(friends.challenge,uid['id'],other)
            elif action=='challenge-respond':out=await asyncio.to_thread(friends.answer_challenge,uid['id'],body.get('id'),body.get('accept') is True)
            elif action=='room':
                rooms=request.app.get('mini_rooms')
                if rooms is None:raise AuthError('Sala indisponivel.',503)
                out=friends.register_room(uid['id'],body.get('id'),body.get('room'),body.get('token'),rooms)
            else:raise AuthError('Rota inexistente.',404)
            return web.json_response(out,headers={'Cache-Control':'no-store'})
        except AuthError as exc:return json_error(str(exc),exc.status)
        except Exception:
            request.app.logger.exception('Falha no sistema de amigos')
            return json_error('Falha ao consultar amigos.',500)
    app.router.add_route('GET','/api/friends/{action}',handler)
    app.router.add_route('POST','/api/friends/{action}',handler)
    return friends
