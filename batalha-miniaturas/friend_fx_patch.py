"""Conserta efeitos visuais nos combates online sem alterar o HTML original.

O anfitrião desenhava FX localmente e esvaziava o buffer antes de transmitir o
frame. O convidado recebia somente o estado das miniaturas e sobrescrevia FX
com [], portanto não via golpes, números de dano, escudos e feitiços.
"""
def apply_friend_fx_html(html: str) -> str:
    patches = [
        (
            "function drawBattleFx(){\n if(!battle?.fx?.length)return;",
            "function drawBattleFx(){\n if(!battle)return;\n if(!battle.fx?.length){battle.lastFxFrame=[];return;}"
        ),
        (
            "const layer=$('fxLayer'),events=battle.fx.splice(0,60),cells=$('board').querySelectorAll('.cell'),layerRect=layer.getBoundingClientRect();",
            "const layer=$('fxLayer'),events=battle.fx.splice(0,60),cells=$('board').querySelectorAll('.cell'),layerRect=layer.getBoundingClientRect();\n battle.lastFxFrame=events.map(ev=>({...ev}));"
        ),
        (
            "pvpSend({type:'frame',frame:{allies,enemies,traits,enemyTraits,round,tick,speed,lastHit,lastAction,log,arena}});",
            "pvpSend({type:'frame',frame:{allies,enemies,traits,enemyTraits,round,tick,speed,lastHit,lastAction,log,arena,fx:(battle.lastFxFrame||[]).slice(0,60)}});"
        ),
        (
            "battle={...f,allies:f.enemies.map(u=>({...u,side:'player',y:5-u.y})),enemies:f.allies.map(u=>({...u,side:'enemy',y:5-u.y})),arena:mirrored,traits:f.enemyTraits,enemyTraits:f.traits,fx:[]};",
            """const mirroredFx=Array.isArray(f.fx)?f.fx.slice(0,60).filter(ev=>ev&&typeof ev==='object').map(ev=>({
  ...ev,y:Number.isInteger(ev.y)?5-ev.y:ev.y,
  sy:Number.isInteger(ev.sy)?5-ev.sy:ev.sy
 })):[];
 battle={...f,allies:f.enemies.map(u=>({...u,side:'player',y:5-u.y})),enemies:f.allies.map(u=>({...u,side:'enemy',y:5-u.y})),arena:mirrored,traits:f.enemyTraits,enemyTraits:f.traits,fx:mirroredFx};"""
        ),
        (
            "game.phase='combat';render();\n}\nfunction pvpSend(msg)",
            "game.phase='combat';render();drawBattleFx();\n}\nfunction pvpSend(msg)"
        )
    ]
    for old, new in patches:
        n=html.count(old)
        if n!=1:
            raise RuntimeError(f"Patch FX incompatível com versão do jogo: {old[:60]} (encontrado {n}x)")
        html=html.replace(old,new,1)
    return html


def verify_friend_fx_patch(html: str) -> None:
    fixed=apply_friend_fx_html(html)
    assert "battle.lastFxFrame=events.map" in fixed
    assert "fx:(battle.lastFxFrame||[]).slice(0,60)" in fixed
    assert "fx:mirroredFx" in fixed
    assert "game.phase='combat';render();drawBattleFx();" in fixed
