"""Smoke test isolado da Loja; nunca modifica o banco real de jogadores."""
import asyncio
import os
import tempfile
import time

from aiohttp import web
from account_api import AccountStore, AuthError
from storefront import install_storefront, STARTER_MINIS

def smoke():
    with tempfile.TemporaryDirectory(prefix='miniaturas-store-test-') as directory:
        store=AccountStore()
        store.database_url=''
        store.sqlite_path=os.path.join(directory,'shop.sqlite3')
        store.enabled=True
        store.postgres=False
        store.setup()
        app=web.Application()
        install_storefront(app,store)
        store.store_setup()
        now=int(time.time())
        with store.connection() as con:
            for uid,username in [('u1','player'),('u2','daniel')]:
                store.query(con,'''INSERT INTO mini_users(id,username,display_name,avatar,password_hash,created_at,updated_at)
                    VALUES (?,?,?,?,?,?,?)''',(uid,username,username,'guard','test-hash',1793700000 if username=='daniel' else now,now))
        state=store.economy('u1')
        assert state['coins']==240 and state['crystals']==25
        assert len(state['ownedMinis'])==len(STARTER_MINIS)==20
        assert 'necro' not in state['ownedMinis']
        bought=store.economy('u1','buy','mini_sentinel')
        assert bought['coins']==100 and 'sentinel' in bought['ownedMinis']
        assert 'sentinel' in store.store_owned('u1')
        try:
            store.economy('u1','buy','mini_sentinel')
        except AuthError as exc:
            assert exc.status==409
        else:
            raise AssertionError('Duplicate purchase charged account')
        store.store_credit('u1',coins=200,crystals=15)
        ticket=store.economy('u1','buy','ticket_arena')
        assert ticket['tickets']==1 and ticket['coins']==180
        # Personalizações são registradas no banco e validadas pela API.
        try:
            store.economy('u1','equip','arena_cripta')
        except AuthError as exc:
            assert exc.status==403
        else:
            raise AssertionError('Arena não comprada foi equipada')
        store.store_credit('u1',coins=300,crystals=100)
        arena=store.economy('u1','buy','arena_floresta')
        assert 'arena_floresta' in arena['ownedArenas'] and arena['selectedArena']=='padrao'
        arena=store.economy('u1','equip','arena_floresta')
        assert arena['selectedArena']=='arena_floresta'
        effect=store.economy('u1','buy','fx_spawn_portal')
        effect=store.economy('u1','equip','fx_spawn_portal')
        assert effect['equippedEffects']['spawn']=='fx_spawn_portal'
        assert store.economy('u1')['selectedArena']=='arena_floresta'
        try:
            store.economy('u1','buy','arena_floresta')
        except AuthError as exc:
            assert exc.status==409
        else:
            raise AssertionError('Arena comprada em duplicidade')
        off=store.economy('u1','unequip','fx_spawn_portal')
        assert 'spawn' not in off['equippedEffects']
        off=store.economy('u1','unequip','arena_floresta')
        assert off['selectedArena']=='padrao'
        # Os seis emotes iniciais são selecionados; compra/equipamento são autoritativos.
        initial=store.economy('u1')
        assert len(initial['ownedEmotes'])==len(initial['emoteLoadout'])==6
        assert store.social_emote_allowed('u1','emote_risada')
        assert not store.social_emote_allowed(None,'emote_dragao')
        try:
            store.economy('u1','equip','celebrate_rogue')
        except AuthError as exc:
            assert exc.status==403
        else:
            raise AssertionError('Comemoração bloqueada foi equipada')
        store.store_credit('u1',coins=700,crystals=100)
        extra=store.economy('u1','buy','emote_dragao')
        assert 'emote_dragao' in extra['ownedEmotes']
        try:
            store.economy('u1','equip','emote_dragao')
        except AuthError as exc:
            assert exc.status==409
        else:
            raise AssertionError('Aceitou mais de seis emotes equipados')
        store.economy('u1','unequip','emote_risada')
        extra=store.economy('u1','equip','emote_dragao')
        assert len(extra['emoteLoadout'])==6 and 'emote_dragao' in extra['emoteLoadout']
        assert not store.social_emote_allowed('u1','emote_risada')
        assert store.social_emote_allowed('u1','emote_dragao')
        extra=store.economy('u1','buy','celebrate_rogue')
        extra=store.economy('u1','equip','celebrate_rogue')
        assert extra['equippedCelebrations']['rogue']=='celebrate_rogue'
        assert store.economy('u1')['equippedCelebrations']['rogue']=='celebrate_rogue'
        daniel=store.economy('u2')
        assert daniel['unlimited'] and daniel['coins']=='∞' and daniel['crystals']=='∞'
        assert len(daniel['ownedMinis'])==len(STARTER_MINIS)
        for key in ['mini_necro','campaign_inverno','skin_necro_spectral','ticket_royal','arena_cripta','fx_victory_gloria','emote_coroa','celebrate_necro']:
            daniel=store.economy('u2','buy',key)
        daniel=store.economy('u2','equip','campaign_inverno')
        daniel=store.economy('u2','equip','skin_necro_spectral')
        daniel=store.economy('u2','equip','arena_cripta')
        daniel=store.economy('u2','equip','fx_victory_gloria')
        daniel=store.economy('u2','equip','celebrate_necro')
        daniel=store.economy('u2','unequip','emote_surpresa')
        daniel=store.economy('u2','equip','emote_coroa')
        assert 'necro' in daniel['ownedMinis']
        assert 'inverno' in daniel['ownedCampaigns'] and daniel['selectedCampaign']=='inverno'
        assert daniel['equippedSkins']['necro']=='skin_necro_spectral'
        assert daniel['tickets']==1
        assert daniel['equippedCelebrations']['necro']=='celebrate_necro'
        assert 'emote_coroa' in daniel['emoteLoadout']
        assert daniel['selectedArena']=='arena_cripta' and daniel['equippedEffects']['victory']=='fx_victory_gloria'
        assert daniel['coins']=='∞' and daniel['crystals']=='∞'
        assert store.economy('u2')['equippedSkins']['necro']=='skin_necro_spectral'
        return {'regular_starter_minis':len(STARTER_MINIS),'purchases_persisted':True,
                'admin_balances_unlimited':True,'campaign_skin_ticket_saved':True,'arenas_and_fx_saved':True,'emotes_and_hero_victories_saved':True}
