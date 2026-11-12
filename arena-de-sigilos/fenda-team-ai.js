(function(){
'use strict';
// Coordenador tático da Fenda 4.6. Não move o campeão controlado pelo jogador.
const E=window.FendaEngine,C=window.SigilsCore;
if(!E||!C){console.error('Fenda Team AI: dependências ausentes');return}
const S=E.state,clamp=E.clamp,dist=E.dist,norm=E.norm;
const roles={orun:'tank',vexor:'assassin',lyria:'carry',nyra:'mage',seris:'support',brax:'fighter',zhira:'jungler',rokar:'tank',kaelis:'mage',tessa:'carry',sahra:'assassin',mirielle:'assassin',kaoryn:'carry',darian:'carry',elowen:'support',tharok:'tank',varka:'fighter',iskha:'mage'};
let nextScan=0;
const living=(side)=>E.living(side,'hero');
const visibleFoes=(side)=>living(1-side).filter(e=>E.visibleTo(side,e));
const hp=h=>h.hp/Math.max(1,h.maxHp);
const canCast=(h,id)=>h.stun<=0&&E.skillRank(h,id)>0&&
 ((id==='sahra_ult'&&h.sahraSecondUntil>S.time)||
 (id==='mirielle_distort'&&h.mirrorReturn?.until>S.time)||
 (h.cooldowns[id]<=.01&&(h.mana>=E.skillDef(id).cost||h.manaFreeUntil>S.time)));
// Compara vantagem real: vida, níveis, equipamentos completos e ultimate.
function strength(h){
 const ult=C.heroes[h.id].ultimate,role=roles[h.id];
 const gear=h.items?.filter(id=>E.ITEMS.some(it=>it.id===id&&it.tier===2)).length||0;
 const roleWeight=role==='tank'?1.10:role==='support'?1.07:role==='assassin'&&hp(h)<.38?.87:1;
 return (.47+hp(h)*.78)*(1+h.level*.061+gear*.095)*
  (canCast(h,ult)?1.16:1)*roleWeight;
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
   const frontline=friends.some(a=>['orun','brax','rokar','tharok','varka'].includes(a.id));
   const sustain=friends.some(a=>['seris','elowen'].includes(a.id));
   const dps=friends.some(a=>['lyria','nyra','tessa','kaelis','kaoryn','darian','iskha'].includes(a.id));
   const synergy=1+(frontline&&dps?0.09:0)+(sustain&&friends.length>=3?0.08:0);
   const alliedPower=friends.reduce((s,a)=>s+strength(a),0)*synergy;
   const enemyPower=rivals.reduce((s,a)=>s+strength(a),0);
   const ratio=alliedPower/Math.max(.1,enemyPower);
   const wave=E.living(side,'minion').some(m=>dist(m,center)<225);
   const enemyTurret=S.structures.some(t=>t.hp>0&&t.side!==side&&
     (t.kind==='tower'||t.kind==='core')&&
     dist(t,center)<t.range+70&&
     !E.living(side,'minion').some(m=>dist(m,t)<t.range));
   // Não transformar lutas equilibradas em quatro bots esperando parados.
   // Aposta coordenada apenas com vida e vantagem; debaixo de torre sem
   // sentinelas a equipe recua, mesmo que tenha vantagem numérica.
   let mode=enemyTurret&&ratio<1.55?'retreat':
     ratio<.74?'retreat':ratio>=(enemyTurret?1.55:.96)?'engage':'hold';
   // Quando o tanque está ausente, uma iniciação 2v2 fica mais conservadora.
   if(mode==='engage'&&!friends.some(a=>['orun','brax','rokar','tharok','varka'].includes(a.id))&&ratio<1.10&&friends.length<3)
     mode='hold';
   const focus=rivals.map(e=>{
    const threatenedCarry=friends.some(a=>['lyria','nyra','tessa','kaelis','kaoryn','darian','iskha','seris','elowen'].includes(a.id)&&dist(a,e)<155);
    const priority=roles[e.id]==='carry'?33:roles[e.id]==='mage'?28:
      roles[e.id]==='support'?23:roles[e.id]==='assassin'?18:roles[e.id]==='jungler'?17:5;
    const killChance=hp(e)<.38?17:0,shielded=(e.shield||0)>65?6:0;
    const allyReach=friends.filter(a=>dist(a,e)<E.attackRange(a)+e.r+90).length;
    return {e,score:(1-hp(e))*53+priority+killChance+allyReach*5+
      (threatenedCarry?23:0)-shielded-dist(e,center)*.075};
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
 if(u.id==='elowen'){
  const hurt=friends.filter(a=>dist(u,a)<310&&hp(a)<.77);
  if(canCast(u,'elowen_ult')&&hurt.length>=2){
   const weak=hurt.slice().sort((a,b)=>hp(a)-hp(b))[0],
    v=norm(weak.x-u.x,weak.y-u.y);
   return E.cast(u,'elowen_ult',{x:v.x,y:v.y,distance:Math.min(220,dist(u,weak))});
  }
  if(canCast(u,'elowen_bless')&&hurt.length)
   return E.cast(u,'elowen_bless',null,hurt.slice().sort((a,b)=>hp(a)-hp(b))[0]);
  if(canCast(u,'elowen_glade')&&friends.some(a=>dist(u,a)<160&&hp(a)<.75))
   return E.cast(u,'elowen_glade');
 }else if(u.id==='tharok'){
  if(canCast(u,'tharok_bastion')&&friends.some(a=>a!==u&&dist(u,a)<165&&hp(a)<.82))
   return E.cast(u,'tharok_bastion');
 }else if(u.id==='varka'){
  if(canCast(u,'varka_will')&&hp(u)<.6)return E.cast(u,'varka_will');
 }else if(u.id==='iskha'){
  if(canCast(u,'iskha_frostguard')&&hp(u)<.61)return E.cast(u,'iskha_frostguard');
 }
 if(['seris','elowen'].includes(u.id)){
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
 }else if(u.id==='brax'&&dist(u,nearest)<160&&hp(u)<.70&&canCast(u,'brax_fortify')){
   return E.cast(u,'brax_fortify');
  }else if(u.id==='orun'&&dist(u,nearest)<185&&canCast(u,'orun_guard')){
  return E.cast(u,'orun_guard');
 }else if(u.id==='nyra'&&dist(u,nearest)<190&&canCast(u,'nyra_barrier')){
  return E.cast(u,'nyra_barrier');
 }else if(u.id==='kaelis'&&dist(u,nearest)<190&&canCast(u,'kaelis_veil')){
  return E.cast(u,'kaelis_veil');
 }else if(u.id==='rokar'&&dist(u,nearest)<185){
  if(friends.filter(a=>dist(a,u)<165&&hp(a)<.66).length>=2&&canCast(u,'rokar_ult'))
   return E.cast(u,'rokar_ult');
  if(hp(u)<.72&&canCast(u,'rokar_guard'))return E.cast(u,'rokar_guard');
 }
 return false;
}
// Sai de magias em área antes do impacto, sem alterar ataques certeiros ou controles humanos.
function dodgeTelegraph(u,dt){
 if(u.stun>0||u.dash||u.casting)return false;
 const hazards=S.projectiles.filter(p=>p.kind==='damagearea'&&p.side!==u.side&&p.aoe>0&&
   p.tx!==undefined&&Math.hypot(u.x-p.tx,u.y-p.ty)<p.aoe+u.r+38)
  .concat((S.zones||[]).filter(z=>z.side!==u.side&&
   (z.kind==='arrowstorm'||z.kind==='trap'||z.kind==='icefield')&&
   z.until>S.time&&Math.hypot(u.x-z.x,u.y-z.y)<z.r+u.r+25)
   .map(z=>({tx:z.x,ty:z.y,aoe:z.r,kind:z.kind})));
 const hazard=hazards.sort((a,b)=>Math.hypot(u.x-a.tx,u.y-a.ty)-
  Math.hypot(u.x-b.tx,u.y-b.ty))[0];
 if(!hazard)return false;
 const d=norm(u.x-hazard.tx,u.y-hazard.ty);
 const away={x:d.x||(!d.y?(u.uid%2?1:-1):0),y:d.y};
 E.moveToward(u,{x:clamp(u.x+away.x*140,30,E.W-30),
  y:clamp(u.y+away.y*140,30,E.H-30)},dt,.98);
 u.dodgeAt=S.time;
 return true;
}
function handleBot(u,dt){
 if(S.mode!=='playing'||!u||u.kind!=='hero'||u.controlled||u.hp<=0)return false;
 if(dodgeTelegraph(u,dt))return true;
 scan();
 const p=S.teamAI?.[u.side];
 if(!p||S.time>=p.until||!p.participants.includes(u.uid)||dist(u,p.center)>590)return false;
 const friends=living(u.side).filter(a=>dist(a,p.center)<545);
 const enemies=visibleFoes(u.side).filter(e=>dist(e,p.center)<530);
 if(!enemies.length)return false;
 const focus=enemies.find(e=>e.uid===p.focusUid)||
   enemies.slice().sort((a,b)=>dist(u,a)-dist(u,b))[0];
 const nearest=enemies.slice().sort((a,b)=>dist(u,a)-dist(u,b))[0];
 const front=friends.find(a=>['orun','brax','rokar','tharok','varka'].includes(a.id));
 const carry=friends.filter(a=>['lyria','nyra','tessa','kaelis','kaoryn','darian','iskha'].includes(a.id))
   .sort((a,b)=>hp(a)-hp(b))[0];
 u.teamFightUntil=S.time+.8;
 u.focusTarget=focus;u.focusUntil=S.time+.8;
 if(p.mode==='retreat'||hp(u)<.30&&!['orun','brax','rokar','tharok','varka'].includes(u.id)){
  u.focusTarget=null;u.focusUntil=0;
  defensiveCast(u,friends,nearest);
  stepBack(u,nearest,dt,175);
  return true;
 }
 if(p.mode==='hold'){
  // Se a luta não está realmente ao alcance, devolver o controle
  // para a IA de rota (farm, escolta de tropas e posicionamento).
  const attackReach=E.attackRange(u)+nearest.r;
  if(dist(u,nearest)>attackReach+75&&!p.towerDive)return false;
  // Se há adversário disputando a rota, pressionar e atacar em vez de
  // simplesmente observar o combate a poucos passos.
  if(dist(u,nearest)>attackReach+8&&!p.towerDive){
   move(u,nearest,dt,(['orun','brax','rokar','tharok','varka'].includes(u.id))?.93:.87);
  }
  if(dist(u,nearest)<attackReach+15){
   u.focusTarget=nearest;u.focusUntil=S.time+1.1;
   E.botUseSkill(u,nearest);
  }
  // O tanque aguarda apoio apenas quando necessário; o time todo
  // continua podendo se reposicionar e dar AA no mesmo instante.
  if(['vexor','zhira','sahra','mirielle'].includes(u.id)){
   const guard=front||carry||friends.find(a=>a!==u);
   if(guard&&dist(u,guard)>145)move(u,guard,dt,.72);
  }else if(['orun','brax','rokar','tharok','varka'].includes(u.id)){
   const guard=carry||friends.find(a=>a!==u);
   if(guard&&dist(u,guard)>155)move(u,guard,dt,.70);
   defensiveCast(u,friends,nearest);
  }else if(['seris','elowen'].includes(u.id)){
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
 if(['orun','brax','rokar','tharok','varka'].includes(u.id)){
  // Orun é a linha de frente; intercepta investidas no carregador.
  const diver=enemies.find(e=>carry&&dist(e,carry)<155);
  const victim=diver||focus;
  u.focusTarget=victim;
  if(dist(u,victim)>95+victim.r)move(u,victim,dt,.95);
  defensiveCast(u,friends,nearest);
  E.botUseSkill(u,victim);
 }else if(['vexor','zhira','sahra','mirielle'].includes(u.id)){
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
 }else if(['seris','elowen'].includes(u.id)){
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
  const ideal=u.id==='tessa'?285:['lyria','kaoryn'].includes(u.id)?265:
   u.id==='darian'?255:['nyra','kaelis','iskha'].includes(u.id)?245:222;
  // Carregadores recuam entre ataques, não abandonam o alcance de graça.
  if(dist(u,nearest)<ideal*.68&&u.attackCd>.14)stepBack(u,nearest,dt,112);
  else if(dist(u,focus)>ideal+focus.r+15){
   if(!front||dist(front,u)<365||p.mode==='engage')move(u,focus,dt,.82);
  }else if(front&&dist(u,front)>325&&u.attackCd>.18)move(u,front,dt,.66);
  defensiveCast(u,friends,nearest);
  E.botUseSkill(u,focus);
 }
 return true;
}
// Mira de magos/atiradores: centra magias de área no maior agrupamento visível.
function aim(u,id,target){
 const p=S.teamAI?.[u.side],def=E.skillDef(id);
 if(!p||S.time>=p.until||u.teamFightUntil<S.time||!target||
   def.aim!=='area'||['seris_bloom','elowen_bless','elowen_ult'].includes(id))return null;
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
window.FendaTeamAI={reset,handleBot,aim,scan,dodgeTelegraph,strength};
})();