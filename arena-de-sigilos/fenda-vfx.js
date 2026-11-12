(function(){
'use strict';
// Fenda 11.5: cada uma das 72 habilidades tem um tipo visual definido.
const FX_GROUPS={"arrow":["lyria_pierce","lyria_rain","lyria_ult","tessa_shot","tessa_ult","kaoryn_volley","kaoryn_ult","darian_ricochet","darian_ult"],"dash":["lyria_step","vexor_lunge","vexor_ult","orun_charge","brax_grapple","zhira_pounce","rokar_charge","tessa_roll","sahra_flip","sahra_ult","mirielle_distort","kaoryn_stride","darian_dash","tharok_ram","varka_lunge"],"blade":["vexor_whirl","brax_cleave","zhira_strike","sahra_knives","varka_cleave"],"trap":["zhira_trap","tessa_salvo","kaoryn_thorns"],"rune":["vexor_mark","nyra_bolt","nyra_rift","nyra_ult","mirielle_sigil","mirielle_ult","darian_bomb"],"chain":["seris_tether","mirielle_chain"],"frost":["kaelis_lance","kaelis_frost","kaelis_veil","kaelis_ult","iskha_shard","iskha_field","iskha_frostguard","iskha_ult"],"shield":["orun_guard","orun_ult","nyra_barrier","brax_fortify","rokar_guard","rokar_ult","seris_aegis","tharok_bastion","varka_will"],"heal":["seris_bloom","seris_ult","elowen_seed","elowen_bless","elowen_glade","elowen_ult"],"shock":["orun_quake","brax_ult","rokar_pulse","tharok_pulse","tharok_ult"],"aura":["zhira_ult","sahra_shroud","varka_ult"]};
const FX_TYPES=Object.fromEntries(Object.entries(FX_GROUPS).flatMap(([t,ids])=>ids.map(id=>[id,t])));
const TAU=Math.PI*2;
const kind=id=>FX_TYPES[id]||'rune';
const accent=(id,color)=>{
 const k=kind(id);
 return k==='chain'?'#dca8ff':k==='heal'?'#acffdc':
  k==='frost'?'#b7efff':k==='shock'?'#ffe4b0':
  k==='trap'?'#ffe7a2':color||'#eed9ff';
};
function ring(g,x,y,r,col,width=2,fill=null){
 g.beginPath();g.arc(x,y,Math.max(0,r),0,TAU);
 if(fill){g.fillStyle=fill;g.fill()}
 if(col){g.strokeStyle=col;g.lineWidth=width;g.stroke()}
}
function polygon(g,x,y,r,sides=6,rotation=-Math.PI/2){
 g.beginPath();for(let i=0;i<sides;i++){
  const a=rotation+i*TAU/sides,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
  if(!i)g.moveTo(px,py);else g.lineTo(px,py);
 }g.closePath();
}
function sigil(g,x,y,r,style,color,t){
 g.save();g.translate(x,y);g.strokeStyle=color;g.lineWidth=2;
 if(style==='frost'){
  for(let i=0;i<6;i++){
   const a=i*TAU/6+t*.08,px=Math.cos(a),py=Math.sin(a);
   g.beginPath();g.moveTo(0,0);g.lineTo(px*r*.85,py*r*.85);g.stroke();
  }
 }else if(style==='shield'){
  polygon(g,0,0,r*.84,6,Math.PI/6);g.stroke();
  polygon(g,0,0,r*.48,6,Math.PI/6);g.stroke();
 }else if(style==='heal'||style==='aura'){
  for(let i=0;i<5;i++){
   g.save();g.rotate(i*TAU/5+t*.12);
   g.beginPath();g.ellipse(0,-r*.38,r*.13,r*.30,0,0,TAU);g.stroke();g.restore();
  }
 }else if(['arrow','dash','blade'].includes(style)){
  for(let i=0;i<3;i++){
   g.save();g.rotate(i*TAU/3+t*.15);g.beginPath();
   g.moveTo(0,-r*.82);g.lineTo(-r*.18,-r*.50);g.lineTo(r*.18,-r*.50);
   g.closePath();g.stroke();g.restore();
  }
 }else if(style==='chain'){
  for(let i=0;i<4;i++){
   const a=i*TAU/4+t*.2;g.save();g.translate(Math.cos(a)*r*.58,Math.sin(a)*r*.58);
   g.rotate(a);g.beginPath();g.ellipse(0,0,r*.18,r*.11,0,0,TAU);g.stroke();g.restore();
  }
 }else{
  polygon(g,0,0,r*.78,style==='shock'?8:style==='trap'?4:5,t*.14-Math.PI/2);g.stroke();
  if(style==='rune'){polygon(g,0,0,r*.40,3,Math.PI/2);g.stroke();}
 }
 g.restore();
}
function missile(g,p,t,dir,color,radius){
 if(!p.skillId)return false;
 const style=kind(p.skillId),col=accent(p.skillId,color),r=Math.max(5,Math.min(18,radius));
 g.save();g.translate(p.x,p.y);g.rotate(Math.atan2(dir.y,dir.x));
 g.shadowColor=col;g.shadowBlur=10;g.strokeStyle=col;g.fillStyle=col;g.lineWidth=2.5;
 if(style==='chain'){
  for(let i=0;i<6;i++){
   g.beginPath();g.ellipse(-i*(r*.72+4),Math.sin(t*17+i)*2,
    r*.50,r*.30,0,0,TAU);g.stroke();
  }
  polygon(g,r*.65,0,r*.88,4,Math.PI/4);g.fill();
  g.strokeStyle='#fff5ff';g.stroke();
 }else if(style==='arrow'){
  g.beginPath();g.moveTo(r*2,0);g.lineTo(-r*.4,-r*.62);
  g.lineTo(-r*.05,0);g.lineTo(-r*.4,r*.62);g.closePath();g.fill();
  g.beginPath();g.moveTo(-r*1.7,0);g.lineTo(r,0);
  g.lineWidth=1.6;g.strokeStyle='#fffbe4';g.stroke();
  if(p.skillId==='tessa_shot'||p.skillId==='tessa_ult'){
   g.beginPath();g.moveTo(-r*1.4,-r*.38);g.lineTo(-r*1.4,r*.38);g.stroke();
  }
 }else if(style==='frost'){
  polygon(g,0,0,r*1.35,6,Math.PI/6);g.fill();g.strokeStyle='#f8ffff';g.stroke();
 }else if(style==='blade'){
  g.beginPath();g.moveTo(r*1.75,0);g.lineTo(-r,-r*.79);
  g.lineTo(-r*.25,0);g.lineTo(-r,r*.79);g.closePath();g.fill();
 }else if(style==='heal'){
  for(let i=0;i<5;i++){
   const a=i*TAU/5+t*2;ring(g,Math.cos(a)*r*.72,Math.sin(a)*r*.72,r*.34,null,0,col);
  }ring(g,0,0,r*.5,null,0,'#f2fff5');
 }else{
  polygon(g,0,0,r*1.26,style==='rune'?4:5,t*.54);g.fill();
  g.strokeStyle='#fff5ec';g.stroke();
 }
 g.restore();return true;
}
function effect(g,f,t){
 const k=f.kind;
 if(!['abilityCast','abilityArea','abilityImpact','dashTrail','knockUp',
  'chainAttach','chainBreak','chainLock','chargeImpact'].includes(k))return false;
 const a=Math.max(0,Math.min(1,f.life/Math.max(.01,f.maxLife)));
 const col=accent(f.skillId,f.color);
 g.save();g.globalAlpha=.22+a*.62;
 if(k==='dashTrail'){
  g.strokeStyle=col;g.lineWidth=1+4*a;
  g.beginPath();g.moveTo(f.x,f.y);g.lineTo(f.tx,f.ty);g.stroke();
  g.strokeStyle='#fff8e1';g.lineWidth=1.3;
  g.beginPath();g.moveTo(f.x,f.y);g.lineTo(f.tx,f.ty);g.stroke();
 }else if(k==='abilityCast'){
  const ult=f.skillId?.endsWith('_ult'),r=(ult?50:34)+(1-a)*19;
  ring(g,f.x,f.y,r,ult?'#ffdda4':col,ult?3:2);
  sigil(g,f.x,f.y,r*.75,kind(f.skillId),col,t);
  if(ult)ring(g,f.x,f.y,r+8,col,1.4);
 }else if(k==='abilityArea'){
  ring(g,f.x,f.y,f.r,col,2.4);
  sigil(g,f.x,f.y,f.r*.70,kind(f.skillId),col,t);
 }else{
  const r=f.r*(.95+(1-a)*.5);
  ring(g,f.x,f.y,r,col,2.7);
  sigil(g,f.x,f.y,r*.70,
   k==='knockUp'||k==='chargeImpact'?'shock':k.startsWith('chain')?'chain':kind(f.skillId),col,t);
 }
 g.restore();return true;
}
function zones(g,S,E,t){
 for(const z of S.zones||[]){
  if(z.side===1&&!E.isPointVisible(0,z))continue;
  const type=z.kind==='healinggrove'?'heal':z.kind==='icefield'?'frost':
   z.kind==='arrowstorm'?'arrow':z.kind==='trap'?'trap':null;
  if(!type)continue;
  const col=type==='heal'?'#b5ffde':type==='frost'?'#c3f2ff':
   type==='arrow'?'#a1ffe0':'#ffdeab';
  g.save();g.globalAlpha=.40;
  ring(g,z.x,z.y,z.r,col,1.6,type==='heal'?'#74ddb21b':
   type==='frost'?'#9ad8ff1b':'#8cb8a81b');
  sigil(g,z.x,z.y,z.r*.74,type,col,t);
  if(type==='heal'||type==='frost'){
   for(let i=0;i<7;i++){
    const a=i*TAU/7+t*(type==='heal'?.24:.07);
    const px=z.x+Math.cos(a)*z.r*.74,py=z.y+Math.sin(a)*z.r*.74;
    if(type==='heal')ring(g,px,py,3.2,null,0,col);
    else{polygon(g,px,py,5,6,Math.PI/6);g.strokeStyle=col;g.stroke();}
   }
  }
  g.restore();
 }
}
function tether(g,S,E,t){
 for(const target of S.units){
  const source=target.tetherSource;
  if(target.kind!=='hero'||target.hp<=0||target.tetherUntil<=S.time||
     !source||source.hp<=0||source.id!=='mirielle')continue;
  if(source.side===1&&!E.visibleTo(0,source))continue;
  if(target.side===1&&!E.visibleTo(0,target))continue;
  const d=Math.hypot(target.x-source.x,target.y-source.y);
  if(d>385)continue;
  const dx=(target.x-source.x)/Math.max(1,d),dy=(target.y-source.y)/Math.max(1,d);
  const sx=source.x+dx*(source.r+5),sy=source.y+dy*(source.r+5);
  const ex=target.x-dx*(target.r+5),ey=target.y-dy*(target.r+5);
  g.save();g.strokeStyle='#b77cfa';g.lineWidth=5.3;g.globalAlpha=.23;
  g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.stroke();
  g.globalAlpha=.95;g.shadowColor='#d6a4ff';g.shadowBlur=7;
  const length=Math.hypot(ex-sx,ey-sy),angle=Math.atan2(ey-sy,ex-sx);
  const count=Math.max(2,Math.floor(length/16));
  for(let i=0;i<count;i++){
   const q=(i+.5)/count,x=sx+(ex-sx)*q,y=sy+(ey-sy)*q;
   g.save();g.translate(x,y);g.rotate(angle+(i%2?.12:-.12));
   g.beginPath();g.ellipse(0,0,8.1,3.8,0,0,TAU);
   g.strokeStyle=i%3===0?'#fff0ff':'#ce92ff';g.lineWidth=2.3;g.stroke();g.restore();
  }
  g.shadowBlur=0;
  ring(g,source.x,source.y,source.r+7,'#edc2ff',2);
  ring(g,target.x,target.y,target.r+8,'#edc2ff',2.5);
  const progress=Math.max(0,1-(target.tetherUntil-S.time)/1.3);
  g.beginPath();g.arc(target.x,target.y,target.r+14,-Math.PI/2,-Math.PI/2+TAU*progress);
  g.strokeStyle='#fff1ff';g.lineWidth=3;g.stroke();
  g.restore();
 }
}
function status(g,S,E,t){
 for(const u of S.units){
  if(u.kind!=='hero'||u.hp<=0||u.side===1&&!E.visibleTo(0,u))continue;
  if(u.chainRootUntil>S.time){
   g.save();g.globalAlpha=.63+.15*Math.sin(t*12);
   ring(g,u.x,u.y,u.r+11,'#ecc0ff',2.3);
   sigil(g,u.x,u.y,u.r+14,'chain','#edbdff',t);g.restore();
  }
  if(u.airborneUntil>S.time){
   g.save();g.globalAlpha=.75;
   ring(g,u.x,u.y,u.r+22,'#ffdfa2',2.5);
   sigil(g,u.x,u.y,u.r+22,'shock','#ffecb9',t);g.restore();
  }else if(u.stun>.08){
   g.save();g.globalAlpha=.7;
   for(let i=0;i<3;i++){
    const a=i*TAU/3+t*3;
    polygon(g,u.x+Math.cos(a)*(u.r+12),u.y+Math.sin(a)*(u.r+12),4.3,5,a);
    g.fillStyle='#ffe7b0';g.fill();
   }g.restore();
  }else if(u.slow>.2){
   g.save();g.globalAlpha=.25;ring(g,u.x,u.y,u.r+5,'#a8d7ff',1.6);g.restore();
  }
 }
}
window.FendaVFX={FX_TYPES,FX_GROUPS,kind,accent,missile,effect,zones,tether,status};
})();
