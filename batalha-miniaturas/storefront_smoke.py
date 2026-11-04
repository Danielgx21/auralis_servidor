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
        asyncio.run(app.on_startup[0](app))
        now=int(time.time())
        with store.connection() as con:
            for uid,username in [('u1','player'),('u2','daniel')]:
                store.query(con,'''INSERT INTO mini_users(id,username,display_name,avatar,password_hash,created_at,updated_at)
                    VALUES (?,?,?,?,?,?,?)''',(uid,username,username,'guard','test-hash',now,now))
        state=store.economy('u1')
        assert state['coins']==240 and state['crystals']==25
        assert len(state['ownedMinis'])==len(STARTER_MINIS)==17
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
        daniel=store.economy('u2')
        assert daniel['unlimited'] and daniel['coins']=='∞' and daniel['crystals']=='∞'
        assert len(daniel['ownedMinis'])==17
        for key in ['mini_necro','campaign_inverno','skin_necro_spectral','ticket_royal']:
            daniel=store.economy('u2','buy',key)
        daniel=store.economy('u2','equip','campaign_inverno')
        daniel=store.economy('u2','equip','skin_necro_spectral')
        assert 'necro' in daniel['ownedMinis']
        assert 'inverno' in daniel['ownedCampaigns'] and daniel['selectedCampaign']=='inverno'
        assert daniel['equippedSkins']['necro']=='skin_necro_spectral'
        assert daniel['tickets']==1
        assert daniel['coins']=='∞' and daniel['crystals']=='∞'
        assert store.economy('u2')['equippedSkins']['necro']=='skin_necro_spectral'
        return {'regular_starter_minis':17,'purchases_persisted':True,
                'admin_balances_unlimited':True,'campaign_skin_ticket_saved':True}
