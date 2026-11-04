# Inventário e variações de campanha, inseridos na cópia servida do HTML.
def apply_progression_html(html):
    updates = [
  [
    "const DEFAULT_DECK=['guard','spear','bow','druid','mage','cleric','rogue','ghost','pyro','seraph','hunter','frost','earth','monk'];",
    "const DEFAULT_DECK=['guard','spear','bow','druid','mage','cleric','rogue','ghost','pyro','seraph','hunter','frost','earth','monk'];\nlet ownedMiniIds=new Set([\"guard\",\"spear\",\"axe\",\"bow\",\"druid\",\"hunter\",\"mage\",\"cleric\",\"rogue\",\"ghost\",\"paladin\",\"pyro\",\"seraph\",\"frost\",\"earth\",\"monk\",\"tide\"]);\nlet selectedCampaignId='reinos';\nwindow.__miniProgressSync=function(state){\n if(!state||!Array.isArray(state.ownedMinis))return;\n ownedMiniIds=new Set(state.ownedMinis);\n selectedCampaignId=state.selectedCampaign||'reinos';\n if(game&&game.phase==='prep'&&!pvp.active&&game.round===1&&!validDeck(game.deck)){\n  game.deck=DEFAULT_DECK.slice();\n  game.deckConfirmed=false;\n }\n if(document.getElementById('deckGrid')&&!document.getElementById('deckModal')?.classList.contains('hidden')){\n  renderDeckModal();\n }\n updateHomeDeckLabel();\n};\nwindow.__miniCampaignChoose=function(id){\n const state=window.__miniShopState;\n if(!state||(state.ownedCampaigns||[]).indexOf(id)<0)return false;\n if(pvp.active){alert('Encerre a partida atual antes de iniciar outra campanha.');return false;}\n if(game&&game.round>1&&game.phase!=='result'){\n  if(!confirm('Começar uma nova campanha? A jornada solo atual será reiniciada.'))return false;\n }\n selectedCampaignId=id;\n newRun();\n game.campaign.variant=id;\n save();\n return true;\n};\n",
    "inventory state and campaign bridge"
  ],
  [
    "deck.some(id=>!TYPES[id])",
    "deck.some(id=>!TYPES[id]||!ownedMiniIds.has(id))",
    "only owned minis allowed in deck"
  ],
  [
    "if(deck.includes(id))continue;const group=TYPES[id].group;",
    "if(deck.includes(id)||!ownedMiniIds.has(id))continue;const group=TYPES[id].group;",
    "migrate decks without locked minis"
  ],
  [
    "const t=TYPES[k],on=deckDraft.includes(k),disabled=!on&&(deckDraft.length>=DECK_SIZE||n>=MAX_GROUP_DECK);",
    "const t=TYPES[k],on=deckDraft.includes(k),locked=!ownedMiniIds.has(k),disabled=locked||(!on&&(deckDraft.length>=DECK_SIZE||n>=MAX_GROUP_DECK));",
    "deck locked UI"
  ],
  [
    "${esc(t.name)}<small>${t.cost} 🪙 · ${esc(t.skill)}</small>",
    "${locked?'🔒 ':''}${esc(t.name)}<small>${locked?'Adquira na Loja · ':''}${t.cost} 🪙 · ${esc(t.skill)}</small>",
    "deck lock description"
  ],
  [
    "function toggleDeckType(id){if(!deckEditable()||!TYPES[id])return;",
    "function toggleDeckType(id){if(!deckEditable()||!TYPES[id]||!ownedMiniIds.has(id))return;",
    "deck selection gated"
  ],
  [
    "const approved=approvedMiniArt(type);if(approved)return approved;",
    "const approved=approvedMiniArt(type);if(approved){const skin=window.__miniShopSkins?.[type];return skin?approved.replace('class=\"mini-art portrait-exact\"','class=\"mini-art portrait-exact '+skin+'\"'):approved;}",
    "apply selected cosmetic skin to portraits"
  ],
  [
    "const itemList=()=>Object.keys(ITEMS).filter(id=>ITEMS[id].rarity!=='rare');",
    "\nconst cosmeticStyle=document.createElement('style');\ncosmeticStyle.textContent='.mini-art.skin_rogue_crimson{filter:sepia(.35) saturate(1.9) hue-rotate(315deg)}.mini-art.skin_necro_spectral{filter:hue-rotate(55deg) saturate(1.5)}.mini-art.skin_guard_royal{filter:sepia(.25) saturate(1.6)}.mini-art.skin_bow_winter{filter:hue-rotate(155deg) saturate(1.35)}.mini-art.skin_mage_rune{filter:hue-rotate(80deg) saturate(1.5)}.mini-art.skin_seraph_eclipse{filter:hue-rotate(250deg) saturate(1.55)}.deck-unit:disabled{opacity:.5;cursor:not-allowed}';\ndocument.head.append(cosmeticStyle);\nwindow.__miniShopArt=miniArt;\nconst itemList=()=>Object.keys(ITEMS).filter(id=>ITEMS[id].rarity!=='rare');",
    "render shop with real character portraits and skin variations"
  ],
  [
    "camp.mode=CAMPAIGN_MODE;",
    "camp.mode=CAMPAIGN_MODE;\n camp.variant=camp.variant||'reinos';",
    "load campaign variant"
  ],
  [
    "function currentArena(){if(pvp.active)return arenaForRound(game.round);return ARENAS.find(x=>x.id===campaignRegion().arena)||arenaForRound(game.round)}",
    "function currentArena(){if(pvp.active)return arenaForRound(game.round);const variant=game?.campaign?.variant;if(variant==='inverno')return ARENAS.find(x=>x.id==='swamp');if(variant==='sombras'||variant==='cerco')return ARENAS.find(x=>x.id==='ruins');return ARENAS.find(x=>x.id===campaignRegion().arena)||arenaForRound(game.round)}",
    "campaign arena variants"
  ],
  [
    "campaign:{mode:CAMPAIGN_MODE,viewRegion:'valley',bosses:[],relics:[],challenge:false,challengeWins:0},deck:saved",
    "campaign:{mode:CAMPAIGN_MODE,variant:selectedCampaignId,viewRegion:'valley',bosses:[],relics:[],challenge:false,challengeWins:0},deck:saved",
    "new campaigns persist in new run"
  ],
  [
    "const traits=applyTraitBuffs(allies),enemyTraits=applyTraitBuffs(enemies);",
    "const traits=applyTraitBuffs(allies),enemyTraits=applyTraitBuffs(enemies);\n if(!pvp.active){\n  const variant=game?.campaign?.variant;\n  for(const enemy of enemies){\n   if(variant==='inverno')enemy.speed*=1.18;\n   if(variant==='sombras'){enemy.maxHp=Math.round(enemy.maxHp*1.18);enemy.hp=enemy.maxHp;enemy.resist+=2;}\n   if(variant==='cerco'){enemy.maxHp=Math.round(enemy.maxHp*1.12);enemy.hp=enemy.maxHp;enemy.armor+=5;}\n  }\n }",
    "campaign-specific enemy difficulty"
  ],
  [
    "'<header><h2>Campanha dos Reinos</h2><p class=\"campaign-caption\">Uma jornada sem limite de rodadas · 3 vidas · um recorde para superar</p></header>'+",
    "'<header><h2>'+esc(({reinos:'Campanha dos Reinos',inverno:'Inverno Eterno',sombras:'Noite dos Mortos',cerco:'Guerra dos Bastiões'})[camp.variant]||'Campanha dos Reinos')+'</h2><p class=\"campaign-caption\">Campanha '+esc(camp.variant==='reinos'?'clássica':'especial')+' · 3 vidas · inimigos e arenas adaptados</p></header>'+",
    "selected campaign title"
  ]
]
    for before,after,name in updates:
        if html.count(before)!=1:
            raise RuntimeError('Progression patch %s encontrou %s trechos' % (name,html.count(before)))
        html=html.replace(before,after,1)
    return html
