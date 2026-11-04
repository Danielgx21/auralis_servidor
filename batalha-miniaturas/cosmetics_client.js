/* Personalizações da Loja dos Reinos: apenas apresentação, nunca altera atributos. */
(()=>{
'use strict';
const ARENAS=new Set(['arena_castelo','arena_floresta','arena_cripta','arena_glacial']);
const EFFECTS=new Set([
 'fx_spawn_portal','fx_spawn_fumaca','fx_spawn_luz','fx_spawn_gelo',
 'fx_kill_cristal','fx_kill_corte','fx_kill_chama','fx_kill_raio',
 'fx_victory_gloria','fx_victory_nevoa','fx_victory_estrelas','fx_victory_coroa'
]);
const SIGNS={
 fx_spawn_portal:'✧',fx_spawn_fumaca:'☾',fx_spawn_luz:'✦',fx_spawn_gelo:'❄',
 fx_kill_cristal:'◆',fx_kill_corte:'⚔',fx_kill_chama:'✹',fx_kill_raio:'ϟ',
 fx_victory_gloria:'✹',fx_victory_nevoa:'☾',fx_victory_estrelas:'✦',fx_victory_coroa:'♛'
};
let arena='padrao',equipped={};
const style=document.createElement('style');
style.textContent=[
 '#board[data-mini-arena="arena_castelo"]{border-color:#a28a73;background:repeating-linear-gradient(0deg,transparent 0 40px,#dfc2a20e 40px 42px),repeating-linear-gradient(90deg,transparent 0 40px,#dfc2a20e 40px 42px),radial-gradient(ellipse at center,#647178,#34424f 72%,#1c2939)}',
 '#board[data-mini-arena="arena_floresta"]{border-color:#75ae83;background:radial-gradient(circle at 20% 15%,#b9f8a52e,transparent 30%),radial-gradient(circle at 80% 75%,#a2ffb133,transparent 35%),repeating-linear-gradient(135deg,transparent 0 24px,#c7e7a00b 25px 27px),linear-gradient(135deg,#375e50,#172f36)}',
 '#board[data-mini-arena="arena_cripta"]{border-color:#aa80cd;background:radial-gradient(circle at center,#9857b13a,transparent 60%),repeating-linear-gradient(90deg,transparent 0 34px,#c09be016 35px 37px),linear-gradient(145deg,#493d5c,#171c37)}',
 '#board[data-mini-arena="arena_glacial"]{border-color:#a7dff5;background:repeating-linear-gradient(140deg,transparent 0 30px,#c9f5ff20 31px 33px),radial-gradient(circle at 30% 20%,#e3faff55,transparent 55%),linear-gradient(125deg,#619bb7,#203b5c)}',
 '#board[data-mini-arena]:not([data-mini-arena="padrao"]) .cell:not(.terrain-wall){border-color:#e6e9ff32}',
 '#board[data-mini-arena="arena_castelo"] .cell{background-color:#b2b0b008}',
 '#board[data-mini-arena="arena_floresta"] .cell{background-color:#72c68c0c}',
 '#board[data-mini-arena="arena_cripta"] .cell{background-color:#bd81e00c}',
 '#board[data-mini-arena="arena_glacial"] .cell{background-color:#b5e9ff0c}',
 '#newShop .market-card.cosmetics{grid-template-columns:100px minmax(0,1fr)}',
 '#newShop .market-card.cosmetics .market-card-art{width:100px;height:90px;min-height:90px}',
 '#newShop .mini-cosmetic-subtabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}',
 '#newShop .mini-cosmetic-subtabs button{padding:8px 2px;border:1px solid #927c9c;border-radius:9px;background:#263956;color:#e2d9ee;font:700 clamp(10px,2.5vw,13px) Georgia,serif}',
 '#newShop .mini-cosmetic-subtabs button.active{background:#57406a;border-color:#efc483;color:#ffe6b0}',
 '#newShop .mini-preview-btn{background:#304764!important;color:#e7d1ac!important;border-color:#8b9bb4!important;font-size:11px!important;padding:7px!important}',
 '#newShop .mini-cosmetic-art{display:grid;place-items:center;position:relative;isolation:isolate;background:radial-gradient(circle,#405477,#192c45)}',
 '#newShop .mini-cosmetic-art .mini-cosmetic-tiles{width:80%;height:78%;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:2px;transform:rotateX(6deg);border:2px solid #c2a57a;border-radius:4px;overflow:hidden;background:#354c53}',
 '#newShop .mini-cosmetic-tiles span{border:1px solid #ffffff17;background:#ffffff12}',
 '#newShop .mini-cosmetic-art[data-arena="arena_castelo"] .mini-cosmetic-tiles{background:linear-gradient(130deg,#727e8e,#2a3948);border-color:#bea98f}',
 '#newShop .mini-cosmetic-art[data-arena="arena_floresta"] .mini-cosmetic-tiles{background:radial-gradient(circle at 25% 20%,#9de8a5,#215148);border-color:#85c38f}',
 '#newShop .mini-cosmetic-art[data-arena="arena_cripta"] .mini-cosmetic-tiles{background:radial-gradient(circle,#9d69bf,#28233e);border-color:#b39bd8}',
 '#newShop .mini-cosmetic-art[data-arena="arena_glacial"] .mini-cosmetic-tiles{background:linear-gradient(135deg,#dbfaff,#457caa);border-color:#d5f3ff}',
 '#newShop .mini-cosmetic-art .cosmetic-mark{font-size:40px;filter:drop-shadow(0 0 12px #fbdcf4);line-height:1}',
 '.mini-cosmetic-pulse{position:absolute;z-index:9;pointer-events:none;transform:translate(-50%,-50%);width:34px;height:34px;display:grid;place-items:center;color:var(--cos-color,#d6c1ff);font-size:32px;font-weight:bold;text-shadow:0 0 12px var(--cos-color,#d6c1ff);animation:mini-cos-pulse 1.1s ease-out forwards}',
 '.mini-cosmetic-pulse:before,.mini-cosmetic-pulse:after{content:"";position:absolute;inset:-10px;border:3px solid var(--cos-color,#c4a5f0);border-radius:50%;box-shadow:0 0 12px var(--cos-color,#c4a5f0);animation:mini-cos-ring .95s ease-out forwards}',
 '.mini-cosmetic-pulse:after{inset:-20px;border-width:1px;animation-delay:.1s}',
 '.mini-cosmetic-pulse[data-effect*="gelo"]{--cos-color:#b6f1ff}',
 '.mini-cosmetic-pulse[data-effect*="luz"],.mini-cosmetic-pulse[data-effect*="gloria"],.mini-cosmetic-pulse[data-effect*="coroa"]{--cos-color:#ffe1a1}',
 '.mini-cosmetic-pulse[data-effect*="chama"]{--cos-color:#ffb067}',
 '.mini-cosmetic-pulse[data-effect*="raio"]{--cos-color:#94e6ff}',
 '.mini-cosmetic-pulse[data-effect*="cristal"]{--cos-color:#a9f4ef}',
 '.mini-cosmetic-pulse[data-effect*="corte"]{--cos-color:#f38db9}',
 '.mini-cosmetic-victory{position:absolute;inset:0;z-index:12;pointer-events:none;display:grid;place-items:center;overflow:hidden;border-radius:12px}',
 '.mini-cosmetic-victory strong{position:relative;z-index:1;font:900 clamp(18px,5vw,30px) Georgia,serif;letter-spacing:2px;color:var(--cos-color,#f6d99d);text-shadow:0 0 18px #251746,0 1px 2px #142038;animation:mini-cos-victory 2s ease-out forwards}',
 '.mini-cosmetic-victory .mini-cosmetic-star{position:absolute;color:var(--cos-color,#f7e7a1);font-size:23px;left:var(--px);top:var(--py);animation:mini-cos-victory 2s ease-out forwards}',
 '.mini-cosmetic-victory[data-effect="fx_victory_nevoa"]{--cos-color:#cba1ff;background:radial-gradient(ellipse,#60407e66,transparent 75%)}',
 '.mini-cosmetic-victory[data-effect="fx_victory_estrelas"]{--cos-color:#c5edff;background:radial-gradient(ellipse,#46738f44,transparent 75%)}',
 '.mini-cosmetic-victory[data-effect="fx_victory_gloria"]{--cos-color:#ffdc85;background:radial-gradient(ellipse,#b48d3b50,transparent 75%)}',
 '.mini-cosmetic-victory[data-effect="fx_victory_coroa"]{--cos-color:#ffe8a5;background:radial-gradient(ellipse,#8f6e4850,transparent 75%)}',
 '@keyframes mini-cos-ring{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(1.8)}}',
 '@keyframes mini-cos-pulse{0%{opacity:0;scale:.4}28%{opacity:1;scale:1.3}100%{opacity:0;scale:1.65}}',
 '@keyframes mini-cos-victory{0%{opacity:0;transform:translateY(24px) scale(.65)}28%{opacity:1;transform:translateY(0) scale(1.1)}75%{opacity:1}100%{opacity:0;transform:translateY(-25px) scale(1)}}',
 '@media(prefers-reduced-motion:reduce){.mini-cosmetic-pulse,.mini-cosmetic-pulse:before,.mini-cosmetic-pulse:after,.mini-cosmetic-victory strong,.mini-cosmetic-victory .mini-cosmetic-star{animation-duration:.01ms!important}}'
].join('\n');
document.head.appendChild(style);
function refreshArena(){
 const board=document.getElementById('board');
 if(board)board.dataset.miniArena=arena;
}
function applyState(state){
 const owned=new Set(Array.isArray(state?.ownedArenas)?state.ownedArenas:[]);
 const selected=state?.selectedArena;
 arena=ARENAS.has(selected)&&owned.has(selected)?selected:'padrao';
 const fx=new Set(Array.isArray(state?.ownedEffects)?state.ownedEffects:[]);
 const chosen=state?.equippedEffects||{};
 equipped={};
 for(const slot of ['spawn','kill','victory']){
  const id=chosen[slot];
  if(EFFECTS.has(id)&&fx.has(id))equipped[slot]=id;
 }
 refreshArena();
}
const colors={};
function pulseAtCell(x,y,effect){
 if(!EFFECTS.has(effect)||!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>5||y<0||y>5)return;
 const layer=document.getElementById('fxLayer'),board=document.getElementById('board');
 if(!layer||!board)return;
 const cell=board.querySelectorAll('.cell')[y*6+x];
 if(!cell)return;
 const a=cell.getBoundingClientRect(),b=layer.getBoundingClientRect();
 if(!a.width||!b.width)return;
 const glyph=document.createElement('span');
 glyph.className='mini-cosmetic-pulse';
 glyph.dataset.effect=effect;
 glyph.textContent=SIGNS[effect]||'✦';
 glyph.style.left=(a.left+a.width/2-b.left)+'px';
 glyph.style.top=(a.top+a.height/2-b.top)+'px';
 layer.appendChild(glyph);
 setTimeout(()=>glyph.remove(),1150);
}
function entrance(){
 refreshArena();
 const effect=equipped.spawn;
 if(!effect)return;
 const cells=document.querySelectorAll('#board .cell');
 let count=0;
 cells.forEach((cell,i)=>{
  if(count>=12||!cell.querySelector('.mini:not(.foe)'))return;
  count++;
  pulseAtCell(i%6,Math.floor(i/6),effect);
 });
}
function eliminations(event){
 const effect=equipped.kill;
 if(!effect)return;
 const deaths=Array.isArray(event.detail)?event.detail:[];
 deaths.slice(0,12).forEach(item=>pulseAtCell(item.x,item.y,effect));
}
function victory(){
 const effect=equipped.victory;
 if(!effect)return;
 setTimeout(()=>{
  const modal=document.getElementById('modal');
  if(!modal||modal.classList.contains('hidden'))return;
  const body=modal.querySelector('.modal-body');
  if(!body)return;
  body.querySelectorAll('.mini-cosmetic-victory').forEach(n=>n.remove());
  if(getComputedStyle(body).position==='static')body.style.position='relative';
  const mark=document.createElement('div');
  mark.className='mini-cosmetic-victory';mark.dataset.effect=effect;
  const label=document.createElement('strong');
  label.textContent=effect==='fx_victory_coroa'?'♛ VITÓRIA REAL':effect==='fx_victory_nevoa'?'☾ VITÓRIA SOMBRIA':effect==='fx_victory_estrelas'?'✦ VITÓRIA ESTELAR':'✹ GLÓRIA';
  mark.appendChild(label);
  for(let i=0;i<10;i++){
   const star=document.createElement('span');star.className='mini-cosmetic-star';
   star.textContent=SIGNS[effect]||'✦';
   star.style.setProperty('--px',((i*29+11)%90+5)+'%');
   star.style.setProperty('--py',((i*37+13)%76+10)+'%');
   mark.appendChild(star);
  }
  body.appendChild(mark);
  setTimeout(()=>mark.remove(),2150);
 },110);
}
document.addEventListener('mini-cosmetic-entry',entrance);
document.addEventListener('mini-cosmetic-kills',eliminations);
document.addEventListener('mini-cosmetic-victory',victory);
document.addEventListener('mini-shop-state',event=>applyState(event.detail?.state));
function artwork(product){
 const node=document.createElement('div');
 node.className='market-card-art mini-cosmetic-art';
 if(product.kind==='arena'){
  node.dataset.arena=ARENAS.has(product.id)?product.id:'padrao';
  const grid=document.createElement('div');grid.className='mini-cosmetic-tiles';
  for(let i=0;i<16;i++)grid.appendChild(document.createElement('span'));
  node.appendChild(grid);
 }else{
  const glyph=document.createElement('span');glyph.className='cosmetic-mark';
  glyph.textContent=SIGNS[product.id]||'✦';node.appendChild(glyph);
 }
 return node;
}
function preview(product,card){
 const art=card?.querySelector('.mini-cosmetic-art');
 if(!art)return;
 if(product.kind==='arena'){
  art.animate([{filter:'brightness(1)'},{filter:'brightness(1.6)'},{filter:'brightness(1)'}],{duration:800});
  return;
 }
 const spark=document.createElement('span');spark.className='mini-cosmetic-pulse';
 spark.dataset.effect=product.id;
 spark.textContent=SIGNS[product.id]||'✦';
 spark.style.left='50%';spark.style.top='50%';
 art.appendChild(spark);setTimeout(()=>spark.remove(),1150);
}
window.__miniCosmeticsArt=artwork;
window.__miniCosmeticsPreview=preview;
window.__miniCosmeticsApplyState=applyState;
refreshArena();
})();