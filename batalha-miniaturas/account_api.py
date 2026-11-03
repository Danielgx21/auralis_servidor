"""Contas online de Batalha de Miniaturas (isoladas de outros projetos).

Producao: MINIATURAS_DATABASE_URL=postgresql://... (Postgres dedicado e persistente).
Desenvolvimento: ACCOUNT_DB_PATH=/caminho/persistente/contas.sqlite3.
Sem uma dessas variaveis, todas as rotas de conta retornam 503 (sem dados efemeros).
"""
from __future__ import annotations

import asyncio
import base64
from collections import defaultdict, deque
from contextlib import contextmanager
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlparse

from aiohttp import web

PASSWORD_ROUNDS = 600_000
COOKIE_NAME = 'miniaturas_session'
SESSION_LIFETIME = 30 * 24 * 3600
AVATARS = set('guard spear axe bow druid hunter mage cleric golem rogue ghost paladin sentinel toxic shaman frost storm necro shade pyro tide earth spark seraph monk templar oracle'.split())
TYPE_GROUPS = {'ferro':set('guard spear axe paladin sentinel'.split()),'selva':set('bow druid hunter toxic shaman'.split()),'arcano':set('mage cleric golem frost storm'.split()),'sombra':set('rogue ghost necro shade'.split()),'elemental':set('pyro tide earth spark'.split()),'sagrado':set('seraph monk templar oracle'.split())}
LOGIN_ATTEMPTS = defaultdict(deque)

class AuthError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def normalize_username(s):
    if not isinstance(s,str): raise AuthError('Informe um nome de usuário válido.')
    s=s.strip().lower()
    if not re.fullmatch(r'[a-z0-9][a-z0-9_.-]{2,23}',s):
        raise AuthError('Usuário: de 3 a 24 caracteres, com letras sem acento, números, ponto, _ ou -.')
    return s


def validate_profile_name(s):
    if not isinstance(s,str):raise AuthError('Nome de exibição inválido.')
    s=s.strip()
    if not 2<=len(s)<=32 or any(ord(c)<32 or ord(c)==127 for c in s):
        raise AuthError('Use entre 2 e 32 caracteres no nome exibido.')
    return s


def validate_avatar(s):
    if not isinstance(s,str) or s not in AVATARS:raise AuthError('Selecione um avatar do catálogo.')
    return s


def validate_password(s):
    if not isinstance(s,str) or not 10<=len(s)<=128 or len(s.encode('utf-8'))>256:
        raise AuthError('A senha precisa ter entre 10 e 128 caracteres.')
    return s


def hash_password(password):
    salt=secrets.token_bytes(16)
    digest=hashlib.pbkdf2_hmac('sha256',password.encode('utf-8'),salt,PASSWORD_ROUNDS)
    return f'pbkdf2_sha256${PASSWORD_ROUNDS}${salt.hex()}${digest.hex()}'


def verify_password(password,stored):
    try:
        algorithm, rounds, salt, digest = stored.split('$')
        if algorithm!='pbkdf2_sha256' or not 600_000<=int(rounds)<=2_000_000:return False
        got=hashlib.pbkdf2_hmac('sha256',password.encode('utf-8'),bytes.fromhex(salt),int(rounds))
        return hmac.compare_digest(got,bytes.fromhex(digest))
    except (TypeError,ValueError,AttributeError):return False


class AccountStore:
    def __init__(self):
        self.database_url=os.environ.get('MINIATURAS_DATABASE_URL','').strip()
        self.sqlite_path=os.environ.get('ACCOUNT_DB_PATH','').strip()
        self.enabled=bool(self.database_url or self.sqlite_path)
        self.postgres=bool(self.database_url)
        if self.postgres and not self.database_url.startswith(('postgresql://','postgres://')):
            raise RuntimeError('MINIATURAS_DATABASE_URL deve usar postgresql://')

    @contextmanager
    def connection(self):
        if not self.enabled:raise AuthError('Contas online ainda não configuradas no servidor.',503)
        if self.postgres:
            import psycopg
            from psycopg.rows import dict_row
            con=psycopg.connect(self.database_url,connect_timeout=8,row_factory=dict_row)
        else:
            path=Path(self.sqlite_path)
            path.parent.mkdir(parents=True,exist_ok=True)
            con=sqlite3.connect(str(path),timeout=10)
            con.row_factory=sqlite3.Row
            con.execute('PRAGMA foreign_keys = ON')
            con.execute('PRAGMA busy_timeout = 10000')
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    def query(self,con,sql,params=()):
        if self.postgres:sql=sql.replace('?', '%s')
        return con.execute(sql,params)

    def setup(self):
        if not self.enabled:return
        with self.connection() as con:
            for statement in [
              '''CREATE TABLE IF NOT EXISTS mini_users (
                 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
                 display_name TEXT NOT NULL, avatar TEXT NOT NULL,
                 password_hash TEXT NOT NULL, created_at BIGINT NOT NULL,
                 updated_at BIGINT NOT NULL)''',
              '''CREATE TABLE IF NOT EXISTS mini_sessions (
                 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES mini_users(id) ON DELETE CASCADE,
                 expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL)''',
              '''CREATE TABLE IF NOT EXISTS mini_cloud_progress (
                 user_id TEXT PRIMARY KEY REFERENCES mini_users(id) ON DELETE CASCADE,
                 data TEXT NOT NULL, revision BIGINT NOT NULL,
                 updated_at BIGINT NOT NULL)''',
              '''CREATE TABLE IF NOT EXISTS mini_campaign_records (
                 user_id TEXT PRIMARY KEY REFERENCES mini_users(id) ON DELETE CASCADE,
                 best_wins BIGINT NOT NULL, best_wave BIGINT NOT NULL, updated_at BIGINT NOT NULL)''',
              '''CREATE TABLE IF NOT EXISTS mini_wallets (
                 user_id TEXT PRIMARY KEY REFERENCES mini_users(id) ON DELETE CASCADE,
                 coins BIGINT NOT NULL DEFAULT 0 CHECK(coins>=0),
                 crystals BIGINT NOT NULL DEFAULT 0 CHECK(crystals>=0),
                 banner TEXT NOT NULL DEFAULT 'castelo',
                 owned_banners TEXT NOT NULL DEFAULT '["castelo"]',
                 updated_at BIGINT NOT NULL)''',
              '''CREATE INDEX IF NOT EXISTS mini_sessions_user ON mini_sessions (user_id)'''
            ]:self.query(con,statement)

    def _user_response(self,row):
        return {'id':row['id'],'username':row['username'],'displayName':row['display_name'],'avatar':row['avatar']}

    def register(self,username,display_name,avatar,password):
        username=normalize_username(username)
        display_name=validate_profile_name(display_name)
        avatar=validate_avatar(avatar)
        password=validate_password(password)
        user_id=secrets.token_hex(16)
        password_hash=hash_password(password)
        now=int(time.time())
        with self.connection() as con:
            if self.query(con,'SELECT id FROM mini_users WHERE username=?',(username,)).fetchone():
                raise AuthError('Este nome de usuário já está em uso.',409)
            try:
                self.query(con,'''INSERT INTO mini_users (id,username,display_name,avatar,password_hash,created_at,updated_at)
                              VALUES (?,?,?,?,?,?,?)''',(user_id,username,display_name,avatar,password_hash,now,now))
            except (sqlite3.IntegrityError,Exception) as exc:
                if 'unique' in str(exc).lower() or 'duplicate' in str(exc).lower():
                    raise AuthError('Este nome de usuário já está em uso.',409) from exc
                raise
            row=self.query(con,'SELECT * FROM mini_users WHERE id=?',(user_id,)).fetchone()
            return self._user_response(row)

    def login(self,username,password):
        username=normalize_username(username)
        if not isinstance(password,str) or len(password)>128:raise AuthError('Usuário ou senha incorretos.',401)
        with self.connection() as con:
            user=self.query(con,'SELECT * FROM mini_users WHERE username=?',(username,)).fetchone()
        # Hash falso: evita revelar usuários existentes por tempo de resposta.
        fake='pbkdf2_sha256$600000$fe2d4e182e0c952b9301b42700a10403$30786ea65a8a95584a3b50544863fae0845f0e7da63ffec9943b94c30e26fc4f'
        ok=verify_password(password,user['password_hash'] if user else fake)
        if not user or not ok:raise AuthError('Usuário ou senha incorretos.',401)
        return self._user_response(user)

    def make_session(self,user_id):
        token=secrets.token_urlsafe(36)
        digest=hashlib.sha256(token.encode('ascii')).hexdigest()
        now=int(time.time())
        with self.connection() as con:
            self.query(con,'DELETE FROM mini_sessions WHERE expires_at<?',(now,))
            self.query(con,'INSERT INTO mini_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',
                       (digest,user_id,now+SESSION_LIFETIME,now))
        return token

    def from_session(self,token):
        if not isinstance(token,str) or not 20<len(token)<160:return None
        digest=hashlib.sha256(token.encode('ascii')).hexdigest()
        with self.connection() as con:
            row=self.query(con,'''SELECT u.id,u.username,u.display_name,u.avatar FROM mini_sessions s
                INNER JOIN mini_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?''',
                (digest,int(time.time()))).fetchone()
        return self._user_response(row) if row else None

    def logout(self,token):
        if not token:return
        digest=hashlib.sha256(token.encode('ascii')).hexdigest()
        with self.connection() as con:self.query(con,'DELETE FROM mini_sessions WHERE token_hash=?',(digest,))

    def edit_profile(self,user_id,display_name,avatar):
        display_name=validate_profile_name(display_name)
        avatar=validate_avatar(avatar)
        with self.connection() as con:
            self.query(con,'UPDATE mini_users SET display_name=?,avatar=?,updated_at=? WHERE id=?',
                       (display_name,avatar,int(time.time()),user_id))
            row=self.query(con,'SELECT * FROM mini_users WHERE id=?',(user_id,)).fetchone()
            return self._user_response(row)

    def change_password(self,user_id,old_password,new_password):
        new_password=validate_password(new_password)
        with self.connection() as con:
            row=self.query(con,'SELECT password_hash FROM mini_users WHERE id=?',(user_id,)).fetchone()
        if not row or not isinstance(old_password,str) or not verify_password(old_password,row['password_hash']):
            raise AuthError('Senha atual incorreta.',401)
        pw=hash_password(new_password)
        with self.connection() as con:
            self.query(con,'UPDATE mini_users SET password_hash=?,updated_at=? WHERE id=?',(pw,int(time.time()),user_id))
            self.query(con,'DELETE FROM mini_sessions WHERE user_id=?',(user_id,))
        return self.make_session(user_id)


    def get_campaign_record(self,user_id):
        with self.connection() as con:
            row=self.query(con,'SELECT best_wins,best_wave,updated_at FROM mini_campaign_records WHERE user_id=?',(user_id,)).fetchone()
        return {'bestWins':int(row['best_wins']),'bestWave':int(row['best_wave']),'updatedAt':int(row['updated_at'])} if row else {'bestWins':0,'bestWave':1,'updatedAt':None}

    def put_campaign_record(self,user_id,best_wins,best_wave):
        if not isinstance(best_wins,int) or isinstance(best_wins,bool) or not 0<=best_wins<=1000000:
            raise AuthError('Número de vitórias inválido.')
        if not isinstance(best_wave,int) or isinstance(best_wave,bool) or not 1<=best_wave<=1000001 or best_wins>best_wave:
            raise AuthError('Rodada alcançada inválida.')
        now=int(time.time())
        # O recorde é sempre o maior; tentativas posteriores nunca apagam a melhor marca.
        with self.connection() as con:
            self.query(con,'''INSERT INTO mini_campaign_records(user_id,best_wins,best_wave,updated_at)
                VALUES (?,?,?,?)
                ON CONFLICT (user_id) DO UPDATE SET
                  best_wins=CASE WHEN excluded.best_wins>mini_campaign_records.best_wins
                    THEN excluded.best_wins ELSE mini_campaign_records.best_wins END,
                  best_wave=CASE WHEN excluded.best_wave>mini_campaign_records.best_wave
                    THEN excluded.best_wave ELSE mini_campaign_records.best_wave END,
                  updated_at=?''',(user_id,best_wins,best_wave,now,now))
        return self.get_campaign_record(user_id)

    def get_progress(self,user_id):
        with self.connection() as con:
            row=self.query(con,'SELECT data,revision,updated_at FROM mini_cloud_progress WHERE user_id=?',(user_id,)).fetchone()
        return {'saved':True,'revision':row['revision'],'savedAt':row['updated_at'],'data':json.loads(row['data'])} if row else {'saved':False,'revision':0,'data':None}

    def put_progress(self,user_id,data,expected_revision):
        if not isinstance(expected_revision,int) or isinstance(expected_revision,bool) or expected_revision<0:raise AuthError('Revisão de salvamento inválida.')
        if not isinstance(data,dict):raise AuthError('Dados de progresso inválidos.')
        deck=data.get('deck')
        if not isinstance(deck,list) or len(deck)!=14 or not all(type(x)==str and x in AVATARS for x in deck) or len(set(deck))!=14:
            raise AuthError('Elenco salvo inválido.')
        counts={}
        for t in deck:
            group=next((g for g,members in TYPE_GROUPS.items() if t in members),None)
            counts[group]=counts.get(group,0)+1
            if counts[group]>5:raise AuthError('Elenco excede cinco unidades de uma aliança.')
        if len(counts)<3:raise AuthError('Elenco precisa ter ao menos três alianças.')
        campaign=data.get('campaign')
        if campaign is not None and (not isinstance(campaign,dict) or not isinstance(campaign.get('game'),dict) or not isinstance(campaign.get('nextId'),int)):
            raise AuthError('Salvamento da Campanha inválido.')
        record=data.get('highScore',0)
        if not isinstance(record,int) or record<0 or record>1_000_000:raise AuthError('Recorde inválido.')
        clean={'deck':deck,'campaign':campaign,'highScore':record}
        serialized=json.dumps(clean,ensure_ascii=False,separators=(',',':'))
        if len(serialized.encode('utf-8'))>160_000:raise AuthError('Salvamento maior que o permitido.',413)
        now=int(time.time())
        with self.connection() as con:
            # Atualização condicional e atomicamente versionada, inclusive entre dispositivos.
            if expected_revision==0:
                existing=self.query(con,'SELECT revision FROM mini_cloud_progress WHERE user_id=?',(user_id,)).fetchone()
                if existing:raise AuthError('O progresso online mudou. Recarregue antes de enviar.',409)
                self.query(con,'INSERT INTO mini_cloud_progress (user_id,data,revision,updated_at) VALUES (?,?,?,?)',
                           (user_id,serialized,1,now))
                return {'saved':True,'revision':1,'savedAt':now}
            result=self.query(con,'''UPDATE mini_cloud_progress SET data=?,revision=revision+1,updated_at=?
               WHERE user_id=? AND revision=?''',(serialized,now,user_id,expected_revision))
            if result.rowcount!=1:raise AuthError('O progresso online mudou. Recarregue antes de enviar.',409)
            return {'saved':True,'revision':expected_revision+1,'savedAt':now}


    # Economia cosmética: o navegador não escolhe preços nem edita saldos.
    BANNER_CATALOG = {
        'castelo': ('Estandarte do Castelo', 'free', 0),
        'leao': ('Leão Real', 'coins', 100),
        'espada': ('Espada do Reino', 'coins', 150),
        'dragao': ('Dragão Ancestral', 'crystals', 25),
    }

    def economy(self,user_id,action=None,banner=None):
        now=int(time.time())
        with self.connection() as con:
            row=self.query(con,'SELECT * FROM mini_wallets WHERE user_id=?',(user_id,)).fetchone()
            if not row:
                self.query(con,'''INSERT INTO mini_wallets
                  (user_id,coins,crystals,banner,owned_banners,updated_at)
                  VALUES (?,?,?,?,?,?)''',(user_id,0,0,'castelo','["castelo"]',now))
                row=self.query(con,'SELECT * FROM mini_wallets WHERE user_id=?',(user_id,)).fetchone()
            if action is not None:
                if action not in ('equip','buy') or banner not in self.BANNER_CATALOG:
                    raise AuthError('Operação de personalização inválida.')
                owned=json.loads(row['owned_banners'])
                label,currency,price=self.BANNER_CATALOG[banner]
                if action=='equip':
                    if banner not in owned:raise AuthError('Você ainda não possui esse estandarte.',403)
                    self.query(con,'UPDATE mini_wallets SET banner=?,updated_at=? WHERE user_id=?',(banner,now,user_id))
                else:
                    if banner in owned:raise AuthError('Estandarte já adquirido.',409)
                    if currency=='free':
                        owned.append(banner)
                        self.query(con,'UPDATE mini_wallets SET owned_banners=?,updated_at=? WHERE user_id=?',
                                   (json.dumps(owned),now,user_id))
                    else:
                        field='coins' if currency=='coins' else 'crystals'
                        result=self.query(con,'''UPDATE mini_wallets SET '''+field+'''='''+field+'''-?,owned_banners=?,updated_at=?
                            WHERE user_id=? AND '''+field+'''>=?''',
                            (price,json.dumps(owned+[banner]),now,user_id,price))
                        if result.rowcount!=1:raise AuthError('Saldo insuficiente.',409)
                row=self.query(con,'SELECT * FROM mini_wallets WHERE user_id=?',(user_id,)).fetchone()
            return {'coins':int(row['coins']),'crystals':int(row['crystals']),
                    'banner':row['banner'],'ownedBanners':json.loads(row['owned_banners']),
                    'catalog':[{'id':key,'name':v[0],'currency':v[1],'price':v[2]} for key,v in self.BANNER_CATALOG.items()]}

def request_ip(request):
    # Não confiar em cabeçalhos de IP enviados livremente pelo cliente.
    return request.remote or 'unknown'


def guard_rate_limit(key,limit=8,window=600):
    items=LOGIN_ATTEMPTS[key]
    now=time.monotonic()
    while items and now-items[0]>window:items.popleft()
    if len(items)>=limit:raise AuthError('Muitas tentativas. Tente novamente mais tarde.',429)
    items.append(now)


def guard_origin(request):
    if request.method=='GET':return
    if request.content_type!='application/json' or request.headers.get('X-Game-Request')!='1':
        raise AuthError('Requisição não permitida.',403)
    site=request.headers.get('Sec-Fetch-Site','')
    if site in ('cross-site','same-site'):raise AuthError('Origem não permitida.',403)
    origin=request.headers.get('Origin')
    if origin and urlparse(origin).netloc.lower()!=request.host.lower():
        raise AuthError('Origem não permitida.',403)


async def json_body(request):
    guard_origin(request)
    try:
        body=await request.json()
    except Exception:
        raise AuthError('JSON inválido.')
    if not isinstance(body,dict):raise AuthError('Dados inválidos.')
    return body


def json_error(message,status):return web.json_response({'error':message},status=status,headers={'Cache-Control':'no-store'})


def set_session_cookie(response,request,token):
    https=request.secure or request.headers.get('X-Forwarded-Proto','').lower()=='https'
    response.set_cookie(COOKIE_NAME,token,max_age=SESSION_LIFETIME,httponly=True,samesite='Lax',secure=https,path='/')
    return response


def install_account_api(app):
    store=AccountStore()
    app['mini_account_store']=store
    async def startup(_app):
        await asyncio.to_thread(store.setup)
    app.on_startup.append(startup)

    async def api_handler(request):
        try:
            if not store.enabled:raise AuthError('Contas indisponíveis: falta configurar MINIATURAS_DATABASE_URL no servidor.',503)
            route=request.match_info['action']
            token=request.cookies.get(COOKIE_NAME,'')
            if route=='status' and request.method=='GET':
                return web.json_response({'online':True,'storage':'postgres' if store.postgres else 'sqlite'},headers={'Cache-Control':'no-store'})
            if route=='me' and request.method=='GET':
                user=await asyncio.to_thread(store.from_session,token)
                if not user:raise AuthError('Você não está conectado.',401)
                return web.json_response({'user':user},headers={'Cache-Control':'no-store'})
            if route in ('register','login') and request.method=='POST':
                data=await json_body(request)
                username=normalize_username(data.get('username'))
                guard_rate_limit(('auth',request_ip(request),username),10,600)
                if route=='register':guard_rate_limit(('signup-ip',request_ip(request)),20,3600)
                if route=='register':
                    user=await asyncio.to_thread(store.register,username,data.get('displayName'),data.get('avatar'),data.get('password'))
                else:user=await asyncio.to_thread(store.login,username,data.get('password'))
                LOGIN_ATTEMPTS.pop(('auth',request_ip(request),username),None)
                token=await asyncio.to_thread(store.make_session,user['id'])
                response=web.json_response({'user':user},status=201 if route=='register' else 200)
                response.headers['Cache-Control']='no-store'
                return set_session_cookie(response,request,token)
            user=await asyncio.to_thread(store.from_session,token)
            if not user:raise AuthError('Faça login para continuar.',401)
            if route=='logout' and request.method=='POST':
                await json_body(request)
                await asyncio.to_thread(store.logout,token)
                r=web.json_response({'ok':True});r.del_cookie(COOKIE_NAME,path='/');r.headers['Cache-Control']='no-store';return r
            if route=='profile' and request.method=='POST':
                data=await json_body(request)
                updated=await asyncio.to_thread(store.edit_profile,user['id'],data.get('displayName'),data.get('avatar'))
                return web.json_response({'user':updated},headers={'Cache-Control':'no-store'})
            if route=='password' and request.method=='POST':
                data=await json_body(request)
                new_token=await asyncio.to_thread(store.change_password,user['id'],data.get('currentPassword'),data.get('newPassword'))
                response=web.json_response({'ok':True});response.headers['Cache-Control']='no-store'
                return set_session_cookie(response,request,new_token)

            if route=='economy' and request.method=='GET':
                state=await asyncio.to_thread(store.economy,user['id'])
                return web.json_response(state,headers={'Cache-Control':'no-store'})
            if route=='economy' and request.method=='POST':
                body=await json_body(request)
                state=await asyncio.to_thread(store.economy,user['id'],body.get('action'),body.get('banner'))
                return web.json_response(state,headers={'Cache-Control':'no-store'})
            if route=='record' and request.method=='GET':
                record=await asyncio.to_thread(store.get_campaign_record,user['id'])
                return web.json_response(record,headers={'Cache-Control':'no-store'})
            if route=='record' and request.method=='POST':
                body=await json_body(request)
                record=await asyncio.to_thread(store.put_campaign_record,user['id'],body.get('wins'),body.get('round'))
                return web.json_response(record,headers={'Cache-Control':'no-store'})
            if route=='progress' and request.method=='GET':
                data=await asyncio.to_thread(store.get_progress,user['id'])
                return web.json_response(data,headers={'Cache-Control':'no-store'})
            if route=='progress' and request.method=='PUT':
                data=await json_body(request)
                result=await asyncio.to_thread(store.put_progress,user['id'],data.get('data'),data.get('revision'))
                return web.json_response(result,headers={'Cache-Control':'no-store'})
            raise AuthError('Rota inexistente.',404)
        except AuthError as exc:return json_error(str(exc),exc.status)
        except Exception:
            request.app.logger.exception('Falha interna em conta de jogador')
            return json_error('Erro interno ao processar sua conta.',500)

    app.router.add_route('GET','/api/account/{action}',api_handler)
    app.router.add_route('POST','/api/account/{action}',api_handler)
    app.router.add_route('PUT','/api/account/{action}',api_handler)
    from friends_api import install_friends_api
    install_friends_api(app,store)
    return store
