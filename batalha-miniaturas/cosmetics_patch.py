"""Eventos puramente visuais sobre a simulação existente; sem mudar regras ou protocolos."""
def apply_cosmetics_html(html: str) -> str:
    patches=[
        ("playSfx('battle');render();if(pvp.active&&pvp.seat===0)pvpSendFrame();schedule();",
         "playSfx('battle');render();document.dispatchEvent(new Event('mini-cosmetic-entry'));if(pvp.active&&pvp.seat===0)pvpSendFrame();schedule();"),
        ("battle.lastFxFrame=events.map(ev=>({...ev}));",
         """battle.lastFxFrame=events.map(ev=>({...ev}));
 const cosmeticDeaths=events.filter(ev=>ev.kind==='death').map(ev=>({x:ev.x,y:ev.y}));
 if(cosmeticDeaths.length)document.dispatchEvent(new CustomEvent('mini-cosmetic-kills',{detail:cosmeticDeaths}));"""),
        ("const oldTick=battle?.tick||0;\n const f=JSON.parse(JSON.stringify(frame));",
         "const oldTick=battle?.tick||0;\n const cosmeticFirstFrame=game.phase!=='combat';\n const f=JSON.parse(JSON.stringify(frame));"),
        ("game.phase='combat';render();drawBattleFx();",
         "game.phase='combat';render();if(cosmeticFirstFrame)document.dispatchEvent(new Event('mini-cosmetic-entry'));drawBattleFx();"),
        ("clearTimeout(clock);game.phase='result';$('fxLayer').replaceChildren();",
         "clearTimeout(clock);game.phase='result';$('fxLayer').replaceChildren();if(win)document.dispatchEvent(new Event('mini-cosmetic-victory'));"),
        ("game.phase='result';game.lastReport=battle?makeReport(battle,iWon):null;",
         "game.phase='result';game.lastReport=battle?makeReport(battle,iWon):null;if(iWon)document.dispatchEvent(new Event('mini-cosmetic-victory'));")
    ]
    for old,new in patches:
        count=html.count(old)
        if count!=1:
            raise RuntimeError(f"Marcador de cosméticos incompatível: {old[:65]} ({count} ocorrências)")
        html=html.replace(old,new,1)
    return html
