"""Movimento independente e taxa real de ações dos combatentes."""
def apply_movement_html(html):
    begin=html.index("function performTurn(actor){")
    a=html.index(" if(!canReachTarget(actor,target)){",begin)
    b=html.index("\n const retreat=!rooted",a)
    if not 100 < b-a < 2200:
        raise RuntimeError("Trecho de movimentação original inesperado")
    html=html[:a]+""" if(!canReachTarget(actor,target)){
   // O movimento ocorre a cada tick; não consome ação de ataque.
   actor.strikes=Math.max(0,actor.strikes-1);
   battle.log=rooted?'Raízes impedem movimento':'Miniatura procura alcance para atacar';
   return;
 }"""+html[b:]
    move="""function advanceBattlePosition(actor){
 if(!battle||actor.hp<=0||(actor.moveMeter||0)<1||actor.root>0||actor.stun>0||actor.freeze>0)return false;
 const opponents=living(actor.side==='player'?'enemy':'player'),team=living(actor.side);
 if(!opponents.length)return false;
 const choices=selectTarget(actor,opponents,team,false);
 const forced=actor.tauntActions>0&&opponents.some(u=>u.id===actor.tauntId);
 const target=(forced||roleOf(actor.type)==='flank')?choices[0]:(choices.find(u=>canReachTarget(actor,u))||choices[0]);
 if(!target||canReachTarget(actor,target))return false;
 let step=pathToTarget(actor,target);
 if(!step&&!forced)for(const alt of choices.slice(1)){step=pathToTarget(actor,alt);if(step)break}
 if(!step)return false;
 actor.x=step.x;actor.y=step.y;actor.moveMeter=Math.max(0,actor.moveMeter-1);
 actor.stats.moves=(actor.stats.moves||0)+1;
 battle.lastAction={id:actor.id,kind:'moving'};
 battle.fx.push({kind:'move',x:actor.x,y:actor.y,id:actor.id});
 return true;
}
"""
    if html.count("function tickBattle(){")!=1:
        raise RuntimeError("Motor de batalha não encontrado")
    html=html.replace("function tickBattle(){",move+"function tickBattle(){",1)
    a=html.index("if(actor.stun<=0",html.index("function tickBattle(){"))
    b=html.index("if(!living('player').length||!living('enemy').length)break",a)
    if b-a>500: raise RuntimeError("Relógio do combate mudou")
    html=html[:a]+"""if(actor.stun<=0&&actor.freeze<=0&&actor.root<=0){
 actor.moveMeter=Math.min(2.15,(actor.moveMeter||0)+(actor.moveSpeed||1)*.55*moveModifier);
 for(let m=0;m<2&&actor.moveMeter>=1&&advanceBattlePosition(actor);m++){}
}
actor.meter=Math.min(3.7,(actor.meter||0)+actor.speed*moveModifier);
for(let n=0;n<2&&actor.hp>0&&actor.meter>=1.85;n++){
 actor.meter-=1.85;performTurn(actor);
 if(!living(actor.side==='player'?'enemy':'player').length)break;
}
"""+html[b:]
    a=html.index("if(actor.stun<=0",html.index("function simOne("))
    b=html.index("if(!allies.some(u=>u.hp>0)||!enemies.some(u=>u.hp>0))break",a)
    if b-a>500: raise RuntimeError("Relógio do simulador mudou")
    html=html[:a]+"""if(actor.stun<=0&&actor.freeze<=0&&actor.root<=0){
      actor.moveMeter=Math.min(2.15,(actor.moveMeter||0)+(actor.moveSpeed||1)*.55*moveModifier);
      for(let m=0;m<2&&actor.moveMeter>=1&&advanceBattlePosition(actor);m++){}
     }
     actor.meter=Math.min(3.7,(actor.meter||0)+actor.speed*moveModifier);
     for(let n=0;n<2&&actor.hp>0&&actor.meter>=1.85;n++){
      actor.meter-=1.85;performTurn(actor);
      if(!allies.some(u=>u.hp>0)||!enemies.some(u=>u.hp>0))break;
     }
     """+html[b:]
    return html
