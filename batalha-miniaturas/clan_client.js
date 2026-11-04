/* Interface e diagnóstico dos clãs duplos. Não altera o sistema de combate. */
(()=>{
'use strict';
if(window.__miniClanClientReady)return;
window.__miniClanClientReady=true;
const css=[
 '.mini-clan-badge{display:inline-flex;align-items:center;justify-content:center;gap:3px;margin:1px 2px 1px 0;padding:2px 5px;border:1px solid var(--clan-color,#d4b881);border-radius:6px;background:#162537ed;color:#f0e5d2;white-space:nowrap;font:800 10px/1.3 system-ui,sans-serif;box-shadow:inset 0 1px #ffffff17}',
 '.shop-group{display:flex;align-items:center;gap:2px 3px;flex-wrap:wrap;line-height:1.35}',
 '.shop-group .mini-clan-badge{font-size:clamp(9px,.8vw,11px);padding:2px 4px}',
 '.shop-inspect-sub .mini-clan-badge{font-size:11px;margin:0 3px 3px 0}',
 '.catalog-sub .mini-clan-badge{font-size:10px;max-width:100%}',
 '.mini-clan-pair{position:absolute;right:-4px;top:33%;z-index:4;display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none;min-width:14px;padding:2px 1px;border-radius:6px;background:#091b2ae5;border:1px solid #cdbd9b5c;font:900 clamp(9px,1.15vw,12px)/1.1 system-ui,sans-serif;box-shadow:0 2px 5px #0008}',
 '.mini-clan-pair img{height:12px}',
 '.cell .mini{overflow:visible}',
 '.trait .trait-counter b{font-variant-numeric:tabular-nums}',
 '.trait.active{border-color:#cfb982bb}',
 '.trait.level2{box-shadow:0 0 13px #d7b67a25,inset 0 0 8px #d7b67a17}',
 '#clan-system-note{font:700 11px/1.4 system-ui,sans-serif;color:#d9ceea;padding:7px 10px;margin:4px 0 8px;border:1px solid #917ca45c;background:#241f3a70;border-radius:9px}',
 '@media(max-width:820px){.mini-clan-pair{right:-3px;top:32%;font-size:9px;padding:1px;min-width:11px}.mini-clan-badge{font-size:9px}}',
 '@media(max-width:420px){.mini-clan-pair{right:-2px;top:40%;font-size:8px;gap:0}.shop-group .mini-clan-badge{font-size:9px}.shop-group{font-size:9px}}'
].join('\n');
const style=document.createElement('style');style.id='mini-dual-clans-css';style.textContent=css;
document.head.appendChild(style);
if(typeof window.renderTraits==='function'){
 const old=window.renderTraits;
 window.renderTraits=function(...args){
  const value=old.apply(this,args);
  const el=document.getElementById('traits');if(!el)return value;
  if(!el.querySelector('#clan-system-note')){
   const note=document.createElement('p');note.id='clan-system-note';
   note.textContent='Cada miniatura pertence a dois clãs · bônus com 3 ou 6 tipos diferentes em campo.';
   el.prepend(note);
  }
  return value;
 };
}
function audit(){
 const units=typeof TYPES==='object'?Object.keys(TYPES):[];
 const groups=typeof GROUPS==='object'?Object.keys(GROUPS):[];
 const counts=Object.fromEntries(groups.map(k=>[k,0]));
 const bad=[];
 for(const type of units){
  const pair=TYPES[type].clans;
  if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]){
   bad.push(type);continue;
  }
  for(const clan of pair)if(clan in counts)counts[clan]++;else bad.push(type);
 }
 let duplicatesCountCorrect=true;
 try{
  const sample=units.slice(0,2);
  if(sample.length===2){
   const actual=countTraits([{type:sample[0]},{type:sample[0]},{type:sample[1]}]);
   duplicatesCountCorrect=sample.every(type=>TYPES[type].clans.every(c=>actual[c]===
      new Set(sample.filter(t=>TYPES[t].clans.includes(c))).size));
  }
 }catch(e){duplicatesCountCorrect=false}
 return {valid:units.length===27&&bad.length===0&&groups.length===6&&
                Object.values(counts).every(n=>n===9)&&duplicatesCountCorrect,
         champions:units.length,clans:groups.length,counts,duplicateSafe:duplicatesCountCorrect,bad};
}
window.__miniClanAudit=audit;
})();
