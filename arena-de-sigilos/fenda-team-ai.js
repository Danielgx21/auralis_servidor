(function(){
'use strict';
// Coordenador tático da Fenda 4.6. Não move o campeão controlado pelo jogador.
const E=window.FendaEngine,C=window.SigilsCore;
if(!E||!C){console.error('Fenda Team AI: dependências ausentes');return}
const S=E.state,clamp=E.clamp,dist=E.dist,norm=E.norm;
const roles={orun:'tank',vexor:'assassin',lyria:'carry',nyra:'mage',seris:'support'};
let nextScan=0;
const living=(side)=>E.living(side,'hero');
const visibleFoes=(side)=>living(1-side).filter(e=>E.visibleTo(side,e));
const hp=h=>h.hp/Math.max(1,h.maxHp);
const canCast=(h,id)=>h.cooldowns[id]<=.01&&h.mana>=E.skillDef(id).cost&&h.stun<=0&&
  (!E.skillDef(id).ultimate||h.level>=5);
function strength(h){
 const ult=C.heroes[h.id].ultimate;
 return (.54+hp(h)*.69)*(1+h.level*.065)*
  (canCast(h,ult)?1.20:1)*(h.id==='orun'?1.10:h.id==='seris'?1.07:1);
}
function scan(){
 if(S.mode!=='playing'||S.time<nextScan)return;
 nextScan=S.time+.40;
 S.teamAI=S.teamAI||[null,null];
 for(let side=0;side<2;side++){
  const allies=living(side),foes=visibleFoes(side);
  let best=null,bestScore=-Infinity;
  for(const anchor of allies){
   const enemies=foes.filter(e=>dist(anchor,e)<440);
   if(enemies.length<1)continue;
   const center={x:enemies.reduce((v,e)=>v+e.x,0)/enemies.length,
     y:enemies.reduce((v,e)=>v+e.y,0)/enemies.length};
   const friends=allies.filter(a=>dist(a,center)<475);
   const rivals=foes.filter(e=>dist(e,center)<400);
   if(friends.length<2||rivals.length<1||!friends.some(a=>!a.controlled))continue;
   const frontline=friends.some(a=>a.id==='orun');
   const sustain=friends.some(a=>a.id==='seris');
   const dps=friends.some(a=>a.id==='lyria'||a.id==='nyra');
   const synergy=1+(frontline&&dps?0.09:0)+(sustain&&friends.length>=3?0.08:0);
   const alliedPower=friends.reduce((s,a)=>s+strength(a),0)*synergy;
   const enemyPower=rivals.reduce((s,a)=>s+strength(a),0);
   const ratio=alliedPower/Math.max(.1,enemyPower);
   const wave=E.living(side,'minion').some(m=>dist(m,center)<225);
   const enemyTurret=S.structures.some(t=>t.hp>0&&t.side!==side&&
     (t.kind==='tower'||t.kind==='core')&&dist(t,center)<t.range+45&&!wave);
   let mode=ratio<.80?'retreat':ratio>=(enemyTurret?1.57:1.02)?'engage':'hold';
   // Quando o tanque está ausente, uma iniciação 2v2 fica mais conservadora.
   if(mode==='engage'&&!friends.some(a=>a.id==='orun')&&ratio<1.17&&friends.length<3)
     mode='hold';
   const focus=rivals.map(e=>{
    const threatenedCarry=friends.some(a=>['lyria','nyra','seris'].includes(a.id)&&dist(a,e)<135);
    const rolePriority=e.id==='lyria'?34:e.id==='nyra'?29:e.id==='seris'?25:e.id==='vexor'?12:3;
    return {e,score:(1-hp(e))*49+rolePriority+(threatenedCarry?19:0)-dist(e,center)*.07};
   }).sort((a,b)=>b.score-a.score)[0]?.e;
   if(!focus)continue;
   const old=S.teamAI[side],continuity=old&&dist(old.center,center)<310?5:0;
   const score=friends.length*11+rivals.length*9+continuity+(mode==='engage'?6:0);
   if(score<=bestScore)continue;
   bestScore=score;
   best={mode,center,focusUid:focus.uid,
     participants:friends.map(a=>a.uid),allies:friends.length,enemies:rivals.length,
     ratio,towerDive:enemyTurret,synergy,until:S.time+1};
  }
  S.teamAI[side]=best;
 }
}
function move(u,point,dt,factor=1){
 if(!point)return;
 E.moveToward(u,point,dt,factor);
}
function stepBack(u,enemy,dt,distance=135){
 const home=E.HOME[u.side],away=norm(u.x-enemy.x,u.y-enemy.y);
 move(u,{x:clamp(u.x+away.x*distance+(home.x-u.x)*.22,30,E.W-30),
   y:clamp(u.y+away.y*distance+(home.y-u.y)*.22,30,E.H-30)},dt,.94);
}
function defensiveCast(u,friends,nearest){
 if(u.id==='seris'){
  const needsHelp=friends.some(a=>dist(u,a)<190&&hp(a)<.68);
  if(needsHelp&&canCast(u,'seris_ult')&&
     friends.filter(a=>dist(a,u)<190&&hp(a)<.75).length>=2)
    return E.cast(u,'seris_ult');
  if(needsHelp&&canCast(u,'seris_bloom')){
   const wounded=friends.filter(a=>dist(a,u)<295&&hp(a)<.72)
     .sort((a,b)=>hp(a)-hp(b))[0];
   if(wounded)return E.cast(u,'seris_bloom',null,wounded);
  }
  if(needsHelp&&canCast(u,'seris_aegis'))return E.cast(u,'seris_aegis');
 }else if(u.id==='orun'&&dist(u,nearest)<185&&canCast(u,'orun_guard')){
  return E.cast(u,'orun_guard');
 }else if(u.id==='nyra'&&dist(u,nearest)<190&&canCast(u,'nyra_barrier')){
  return E.cast(u,'nyra_barrier');
 }
 return false;
}
function handleBot(u,dt){
 if(S.mode!=='playing'||!u||u.kind!=='hero'||u.controlled||u.hp<=0)return false;
 scan();
 const p=S.teamAI?.[u.side];
 if(!p||S.time>=p.until||!p.participants.includes(u.uid)||dist(u,p.center)>590)return false;
 const friends=living(u.side).filter(a=>dist(a,p.center)<545);
 const enemies=visibleFoes(u.side).filter(e=>dist(e,p.center)<530);
 if(!enemies.length)return false;
 const focus=enemies.find(e=>e.uid===p.focusUid)||
   enemies.slice().sort((a,b)=>dist(u,a)-dist(u,b))[0];
 const nearest=enemies.slice().sort((a,b)=>dist(u,a)-dist(u,b))[0];
 const front=friends.find(a=>a.id==='orun');
 const carry=friends.filter(a=>['lyria','nyra'].includes(a.id))
   .sort((a,b)=>hp(a)-hp(b))[0];
 u.teamFightUntil=S.time+.8;
 u.focusTarget=focus;u.focusUntil=S.time+.8;
 if(p.mode==='retreat'||hp(u)<.30&&u.id!=='orun'){
  u.focusTarget=null;u.focusUntil=0;
  defensiveCast(u,friends,nearest);
  stepBack(u,nearest,dt,175);
  return true;
 }
 if(p.mode==='hold'){
  // Sem vantagem, segurar posição para que o tanque não inicie sozinho.
  if(u.id==='vexor'){
   const guard=front||carry||friends.find(a=>a!==u);
   if(guard&&dist(u,guard)>145)move(u,guard,dt,.72);
  }else if(u.id==='orun'){
   const guard=carry||friends.find(a=>a!==u);
   if(guard&&dist(u,guard)>155)move(u,guard,dt,.70);
   defensiveCast(u,friends,nearest);
  }else if(u.id==='seris'){
   defensiveCast(u,friends,nearest);
   const guard=carry||front;
   if(guard&&dist(u,guard)>150)move(u,guard,dt,.70);
  }else{
   if(dist(u,nearest)<170)stepBack(u,nearest,dt,120);
   else if(front&&dist(u,front)>260)move(u,front,dt,.63);
   if(dist(u,focus)<=E.attackRange(u)+focus.r)E.botUseSkill(u,focus);
  }
  if(p.towerDive){
  const turret=S.structures.filter(t=>t.hp>0&&t.side!==u.side&&
    dist(t,focus)<t.range+60).sort((a,b)=>dist(a,u)-dist(b,u))[0];
  if(turret){
   const v=norm(u.x-turret.x,u.y-turret.y);
   move(u,{x:u.x+v.x*115,y:u.y+v.y*115},dt,.75);
   defensiveCast(u,friends,nearest);
  }
  }
  return true;
 }
 if(u.id==='orun'){
  // Orun é a linha de frente; intercepta investidas no carregador.
  const diver=enemies.find(e=>carry&&dist(e,carry)<155);
  const victim=diver||focus;
  u.focusTarget=victim;
  if(dist(u,victim)>95+victim.r)move(u,victim,dt,.95);
  defensiveCast(u,friends,nearest);
  E.botUseSkill(u,victim);
 }else if(u.id==='vexor'){
  // Vexor não inicia sozinho: espera Orun ou dois aliados pressionarem.
  const opened=front&&dist(front,focus)<183||
    friends.filter(a=>a!==u&&dist(a,focus)<195).length>=2;
  if(!opened){
   const leader=front||carry||friends.find(a=>a!==u);
   if(leader&&dist(u,leader)>108)move(u,leader,dt,.8);
   return true;
  }
  const anchor={x:friends.reduce((s,a)=>s+a.x,0)/friends.length,
    y:friends.reduce((s,a)=>s+a.y,0)/friends.length};
  const vec=norm(focus.x-anchor.x,focus.y-anchor.y);
  const side=u.uid%2?1:-1;
  const flank={x:clamp(focus.x-vec.x*69-vec.y*side*66,30,E.W-30),
    y:clamp(focus.y-vec.y*69+vec.x*side*66,30,E.H-30)};
  if(dist(u,flank)>50&&dist(u,focus)>79)move(u,flank,dt,.94);
  E.botUseSkill(u,focus);
 }else if(u.id==='seris'){
  // Seris acompanha o aliado vulnerável e usa cura/escudo para proteger a linha de trás.
  const protect=friends.filter(a=>a!==u).sort((a,b)=>hp(a)-hp(b))[0]||front;
  if(protect){
   const toward=norm(focus.x-protect.x,focus.y-protect.y);
   const safe={x:protect.x-toward.x*76,y:protect.y-toward.y*76};
   if(dist(u,safe)>72)move(u,safe,dt,.87);
  }
  if(dist(u,nearest)<125)stepBack(u,nearest,dt,90);
  defensiveCast(u,friends,nearest);
  E.botUseSkill(u,focus);
 }else{
  // Lyria e Nyra atacam de trás: kite em aproximação inimiga e acompanham o tanque.
  const ideal=u.id==='lyria'?265:245;
  if(dist(u,nearest)<ideal*.7)stepBack(u,nearest,dt,115);
  else if(dist(u,focus)>ideal+focus.r){
   if(!front||dist(front,u)<350||p.mode==='engage')move(u,focus,dt,.82);
  }else if(front&&dist(u,front)>315)move(u,front,dt,.66);
  defensiveCast(u,friends,nearest);
  E.botUseSkill(u,focus);
 }
 return true;
}
// Mira de magos/atiradores: centra magias de área no maior agrupamento visível.
function aim(u,id,target){
 const p=S.teamAI?.[u.side],def=E.skillDef(id);
 if(!p||S.time>=p.until||u.teamFightUntil<S.time||!target||
   def.aim!=='area'||id==='seris_bloom')return null;
 const enemies=visibleFoes(u.side).filter(e=>dist(u,e)<def.range+e.r);
 if(!enemies.length)return null;
 let best=null,score=-Infinity;
 for(const candidate of enemies){
  const s=enemies.reduce((sum,e)=>sum+(dist(candidate,e)<def.radius+e.r?
    (hp(e)<.45?1.4:1):0),0);
  if(s>score){score=s;best=candidate}
 }
 if(!best)return null;
 const vec=norm(best.x-u.x,best.y-u.y);
 return {x:vec.x,y:vec.y,distance:Math.min(def.range,dist(u,best))};
}
function reset(){nextScan=0;S.teamAI=[null,null]}
window.FendaTeamAI={reset,handleBot,aim,scan};
})();