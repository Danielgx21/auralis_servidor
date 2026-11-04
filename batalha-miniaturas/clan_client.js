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
 '#board .mini .mini-base{width:min(78%,64px);margin:0;flex-shrink:0}',
 '#board .mini-clan-pair{position:absolute;inset:auto 0 10px 0;width:100%;z-index:6;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:1px;pointer-events:none;margin:0;padding:0;background:transparent;border:0;border-radius:0;box-shadow:none;transform:none}',
 '#board .mini-clan-mark{box-sizing:border-box;flex:0 0 17px;width:17px;height:17px;display:grid;place-items:center;border:1.5px solid var(--clan-color,#d4b987);border-radius:50%;background:#101e32f5;color:#fff;font:900 12px/1 system-ui,sans-serif;text-shadow:0 1px 3px #000;box-shadow:0 1px 5px #000b,0 0 4px var(--clan-color,#d4b987);overflow:hidden}',
 // Painel inferior: clã esquerdo | equipamentos | clã direito, sem reduzir retratos.
 '#board .mini .mini-equipped{box-sizing:border-box;position:absolute;left:50%;right:auto;top:auto;bottom:9px;transform:translateX(-50%);z-index:9;display:inline-flex!important;align-items:center;justify-content:center;flex-wrap:nowrap;gap:2px;width:max-content;max-width:calc(100% - 26px);min-height:17px;padding:1px 2px;border:1px solid #ebd39cbb;border-radius:7px;background:#0d2037f5;box-shadow:0 2px 7px #000c;color:#fff2cd;white-space:nowrap;overflow:visible;pointer-events:none}',
 '#board .mini .mini-equipped-item{display:inline-grid;place-items:center;box-sizing:border-box;width:15px;height:15px;min-width:0;flex:0 0 15px;border-radius:4px;background:#293b54;box-shadow:inset 0 0 0 1px #d7bb7770;font:900 12px/1 sans-serif;font-style:normal}',
 '#board .mini.foe .mini-equipped{display:inline-flex!important;border-color:#efbca6c2;background:#36253cf5}',
 '#board .mini .mini-shield{bottom:30px;right:-2px;z-index:7}',
 '#board .mini .status-badge:not(:empty){bottom:30px;left:-2px;z-index:7}',
 '.mini-clan-pair img{height:12px}',
 '.cell .mini{overflow:visible}',
 '.trait .trait-counter b{font-variant-numeric:tabular-nums}',
 '.trait.active{border-color:#cfb982bb}',
 '.trait.level2{box-shadow:0 0 13px #d7b67a25,inset 0 0 8px #d7b67a17}',
 '#clan-system-note{font:700 11px/1.4 system-ui,sans-serif;color:#d9ceea;padding:7px 10px;margin:4px 0 8px;border:1px solid #917ca45c;background:#241f3a70;border-radius:9px}',
 '@media(max-width:820px){#board .mini .mini-base{width:min(78%,64px);margin:0}#board .mini-clan-pair{bottom:9px}#board .mini-clan-mark{flex-basis:15px;width:15px;height:15px;font-size:11px}#board .mini .mini-equipped{gap:1px;max-width:calc(100% - 26px);padding:1px;min-height:15px}#board .mini .mini-equipped-item{width:12px;height:12px;flex-basis:12px;font-size:10px}#board .mini .mini-shield,#board .mini .status-badge:not(:empty){bottom:28px}.mini-clan-badge{font-size:9px}}',
 '@media(max-width:420px){#board .mini .mini-base{width:min(78%,64px);margin:0}#board .mini-clan-pair{bottom:8px}#board .mini-clan-mark{flex-basis:12px;width:12px;height:12px;font-size:10px}#board .mini .mini-equipped{bottom:8px;max-width:calc(100% - 23px);gap:1px;padding:0 1px;border-radius:5px;min-height:13px}#board .mini .mini-equipped-item{width:10px;height:11px;flex-basis:10px;font-size:9px;border-radius:3px}#board .mini .mini-shield,#board .mini .status-badge:not(:empty){bottom:25px}.shop-group .mini-clan-badge{font-size:9px}.shop-group{font-size:9px}}'
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
