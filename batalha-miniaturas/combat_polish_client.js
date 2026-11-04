/* Camada audiovisual 2D: complementa o motor atual sem alterar dano, buffs nem turnos. */
(()=>{
'use strict';
if(window.__miniCombatPolish)return;
const original=window.drawBattleFx;
if(typeof original!=='function')return;
const STYLE={
 blade:'#ffce91',pierce:'#ffe7b0',arrow:'#f6daa2',
 arcane:'#c4a1ff',magic:'#c4a1ff',shadow:'#b79be5',
 frost:'#9ce4ff',heal:'#8dffcf',leech:'#dc9ff7',
 poison:'#a8f0a6',holy:'#ffe7aa',shield:'#9ecbff',
 burn:'#ff916b',fire:'#ff916b',storm:'#bcecff'
};
const icon={arcane:'✦',shadow:'☾',frost:'❄',poison:'✣',heal:'✚',shield:'✧',burn:'✹',fire:'✹',storm:'ϟ',holy:'✷'};
const css=[
 '#fxLayer{z-index:19;isolation:isolate}',
 '#fxLayer .mini-fx-polish{position:absolute;z-index:3;pointer-events:none;transform:translate(-50%,-50%);will-change:transform,opacity}',
 '#fxLayer .mini-fx-orb{width:17px;height:17px;border-radius:50%;border:2px solid #ffffffb8;background:radial-gradient(circle,#fff,#fff9 20%,var(--mini-fx-color) 43%,transparent 80%);box-shadow:0 0 13px 4px var(--mini-fx-color),0 0 22px var(--mini-fx-color);filter:drop-shadow(0 0 5px var(--mini-fx-color))}',
 '#fxLayer .mini-fx-orb.mini-fx-arrow{width:25px;height:5px;border-radius:4px;border:1px solid #fff2c9;background:linear-gradient(90deg,#fff9cc,#d6aa7d);box-shadow:0 0 11px #ffd08e}',
 '#fxLayer .mini-fx-orb.mini-fx-healbeam{background:linear-gradient(90deg,#d5fff0,#63e8b4);border-color:#caffea;border-radius:10px;height:8px}',
 '#fxLayer .mini-fx-impact{width:43px;height:43px;border:3px solid var(--mini-fx-color);border-radius:50%;box-shadow:0 0 8px 3px var(--mini-fx-color),inset 0 0 10px var(--mini-fx-color);background:radial-gradient(circle,#ffffff55,transparent 65%);animation:mini-fx-impact .69s ease-out forwards}',
 '#fxLayer .mini-fx-sigil{font:900 28px Georgia,serif;color:var(--mini-fx-color);text-shadow:0 1px 5px #010812,0 0 14px var(--mini-fx-color);animation:mini-fx-sigil .93s ease-out forwards}',
 '#fxLayer .mini-fx-slash{width:48px;height:48px;border:solid var(--mini-fx-color);border-width:5px 0 0 0;border-radius:50%;box-shadow:0 -3px 9px -2px var(--mini-fx-color);animation:mini-fx-swipe .63s ease-out forwards}',
 '#fxLayer .mini-fx-death{width:56px;height:56px;font-size:30px;display:grid;place-items:center;color:var(--mini-fx-color);text-shadow:0 0 18px var(--mini-fx-color);animation:mini-fx-death .9s ease-out forwards}',
 '#board .cell .mini.mini-fx-hit{filter:brightness(1.19)}',
 '#board .cell.mini-fx-hit{outline:2px solid #ffe4b9b8;outline-offset:-2px}',
 '@keyframes mini-fx-impact{0%{opacity:0;scale:.25}24%{opacity:1;scale:.82}100%{opacity:0;scale:2.2}}',
 '@keyframes mini-fx-sigil{0%{opacity:0;transform:translate(-50%,-50%) translateY(12px) scale(.45) rotate(-15deg)}25%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) translateY(-26px) scale(1.3) rotate(18deg)}}',
 '@keyframes mini-fx-swipe{0%{opacity:0;rotate:-90deg;scale:.6}30%{opacity:1;rotate:15deg;scale:1.12}100%{opacity:0;rotate:95deg;scale:1.5}}',
 '@keyframes mini-fx-death{0%{opacity:1;scale:.45}60%{opacity:1;scale:1.2}100%{opacity:0;scale:1.8;filter:blur(4px)}}',
 '@media(prefers-reduced-motion:reduce){#fxLayer .mini-fx-impact,#fxLayer .mini-fx-sigil,#fxLayer .mini-fx-slash,#fxLayer .mini-fx-death{animation:none!important;opacity:1!important}#fxLayer .mini-fx-polish{will-change:auto}}'
].join('\n');
const style=document.createElement('style');style.id='mini-combat-polish-style';style.textContent=css;
document.head.appendChild(style);
const diagnostics={processed:0,projectiles:0,impacts:0,spells:0,lastEvent:0,errors:0};
window.__miniCombatPolish={
 inspect(){return {...diagnostics,ready:true,layer:!!document.getElementById('fxLayer')}}
};
const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const layer=()=>document.getElementById('fxLayer');
function pos(cells,rect,x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=6||y<0||y>=6)return null;
 const cell=cells[y*6+x];
 if(!cell)return null;
 const r=cell.getBoundingClientRect();
 if(r.width<=0||r.height<=0)return null;
 return{x:r.left+r.width/2-rect.left,y:r.top+r.height/2-rect.top,cell};
}
function add(host,kind,p,color,ttl=750){
 const n=document.createElement('span');n.className='mini-fx-polish '+kind;
 n.style.left=p.x+'px';n.style.top=p.y+'px';
 n.style.setProperty('--mini-fx-color',color);
 host.appendChild(n);
 setTimeout(()=>n.remove(),ttl);
 return n;
}
function animateHit(target){
 if(!target?.cell)return;
 const cell=target.cell;cell.classList.add('mini-fx-hit');
 const unit=cell.querySelector('.mini');
 if(unit)unit.classList.add('mini-fx-hit');
 setTimeout(()=>{
  if(cell.isConnected)cell.classList.remove('mini-fx-hit');
  if(unit?.isConnected)unit.classList.remove('mini-fx-hit');
 },270);
}
function launch(host,start,end,styleKey,color,hostRect){
 const isArrow=styleKey==='arrow'||styleKey==='pierce'||styleKey==='blade';
 const isHeal=styleKey==='heal';
 const kind='mini-fx-orb'+(isArrow?' mini-fx-arrow':isHeal?' mini-fx-healbeam':'');
 const ball=add(host,kind,start,color,650);
 const dx=end.x-start.x,dy=end.y-start.y,angle=Math.atan2(dy,dx)*180/Math.PI;
 if(isArrow)ball.style.rotate=angle+'deg';
 if(reduced()){ball.remove();return}
 // Animação Web Animations evita a disparidade entre Chrome desktop e mobile.
 if(typeof ball.animate==='function'){
  const base='translate(-50%,-50%)';
  ball.animate([
   {transform:base+' scale(.7)',opacity:0,offset:0},
   {transform:base+' translate('+(dx*.18)+'px,'+(dy*.18)+'px) scale(1)',opacity:1,offset:.18},
   {transform:base+' translate('+dx+'px,'+dy+'px) scale(1.13)',opacity:1,offset:.88},
   {transform:base+' translate('+dx+'px,'+dy+'px) scale(.3)',opacity:0,offset:1}
  ],{duration:410,easing:'ease-in',fill:'forwards'});
 }else{
  ball.style.transition='transform .4s ease-in,opacity .4s ease-in';
  requestAnimationFrame(()=>{ball.style.transform='translate(-50%,-50%) translate('+dx+'px,'+dy+'px)';ball.style.opacity='0'});
 }
 diagnostics.projectiles++;
}
function drawExtras(events){
 const host=layer(),board=document.getElementById('board');
 if(!host||!board||!events?.length||document.visibilityState==='hidden')return;
 const cells=board.querySelectorAll('.cell'),rect=host.getBoundingClientRect();
 if(cells.length!==36||rect.width<60||rect.height<60)return;
 const limit=window.innerWidth<500?17:30;
 // Restringe elementos simultâneos para não afetar o FPS em batalhas com 20 unidades.
 if(host.querySelectorAll('.mini-fx-polish').length>75)return;
 for(const event of events.slice(0,limit)){
  if(!event||typeof event!=='object'||event.kind==='move')continue;
  const end=pos(cells,rect,event.x,event.y);if(!end)continue;
  const kind=String(event.kind||''),styleKey=String(event.style||'');
  const color=STYLE[styleKey]||(event.damageKind==='magic'?STYLE.arcane:STYLE.blade);
  diagnostics.processed++;diagnostics.lastEvent=Date.now();
  if(kind==='shot'||kind==='heal'&&event.sx!==event.x){
   const start=pos(cells,rect,event.sx,event.sy);
   if(start)launch(host,start,end,kind==='heal'?'heal':styleKey||'arrow',color,rect);
   const ring=add(host,'mini-fx-impact',end,color,740);if(kind==='heal')ring.style.scale='.74';
   diagnostics.impacts++;
   continue;
  }
  if(kind==='strike'){
   add(host,'mini-fx-slash',end,color,690);animateHit(end);diagnostics.impacts++;continue;
  }
  if(kind==='status'||kind==='barrier'){
   add(host,'mini-fx-impact',end,color,720);animateHit(end);diagnostics.impacts++;continue;
  }
  if(kind==='skill'||kind==='aura'||kind==='heal'){
   const sigil=add(host,'mini-fx-sigil',end,color,960);
   sigil.textContent=icon[styleKey]||(kind==='heal'?'✚':'✧');
   diagnostics.spells++;
   if(kind==='aura')add(host,'mini-fx-impact',end,color,700);
   continue;
  }
  if(kind==='death'){
   const glyph=add(host,'mini-fx-death',end,color,920);glyph.textContent='✧';
   diagnostics.impacts++;
  }
 }
}
window.drawBattleFx=function(...args){
 const events=Array.isArray(window.battle?.fx)?window.battle.fx.slice(0,60):
  (typeof battle!=='undefined'&&Array.isArray(battle?.fx)?battle.fx.slice(0,60):[]);
 const result=original.apply(this,args);
 try{drawExtras(events)}catch(err){diagnostics.errors++;if(diagnostics.errors<=2)console.warn('FX 2D:',err)}
 return result;
};
})();
