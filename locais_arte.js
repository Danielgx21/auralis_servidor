'use strict';
/* Visualização das artes reais dos locais; não replica nenhum objeto sobre as cenas. */
(function(){
 if(typeof render!=='function'||typeof app==='undefined')return;
 let zoomOpen=false, zoomLevel=1, zoomFocus={x:.5,y:0};
 function saveCenter(){
  const view=app.querySelector('.locationsArtViewport');if(!view)return;
  zoomFocus={x:(view.scrollLeft+view.clientWidth/2)/Math.max(1,view.scrollWidth),y:(view.scrollTop+view.clientHeight/2)/Math.max(1,view.scrollHeight)};
 }
 function restoreCenter(view){
  const move=()=>{
   if(!view.isConnected)return;
   view.scrollLeft=Math.max(0,view.scrollWidth*zoomFocus.x-view.clientWidth/2);
   view.scrollTop=Math.max(0,view.scrollHeight*zoomFocus.y-view.clientHeight/2);
  };
  move();view.querySelector('img')?.addEventListener('load',move,{once:true});
 }
 const priorRender=render;
 const encode=(value)=>esc(String(value??''));
 function currentImage(){
  const loc=CASES?.[s.caseId]?.scenes?.[s.activeScene];
  if(!loc)return null;
  // A casa, se disponível, usa a composição aprovada do módulo de arte integrado.
  const img=s.caseId==='lago'&&s.activeScene==='casa'?
   'assets/casa_aprovada.webp':loc.image;
  return {title:loc.name,src:img};
 }
 function visualTargets(){
  // O zoom usa as mesmas áreas invisíveis da pintura original.
  const original=app.querySelector('.staticSceneCanvas,.v2SceneFrame');
  if(!original)return '';
  return [...original.querySelectorAll('.staticPhotoTarget[data-static-examine],.v2InvisibleHotspot[data-v2-clue]')].map(node=>{
   const clone=node.cloneNode(false);
   clone.removeAttribute('title');
   clone.setAttribute('data-zoom-hit','1');
   return clone.outerHTML;
  }).join('');
 }
 function environmentalInk(){return typeof window.manualSceneMarks==='function'?window.manualSceneMarks(s.caseId,s.activeScene):'';}
 function viewer(){
  const art=currentImage();if(!art)return '';
  return '<div class="locationsArtOverlay" data-locations-close-outer>'+
   '<section class="locationsArtDialog" role="dialog" aria-modal="true" aria-label="Ilustração do local">'+
   '<header><div><small>PRANCHA DE CAMPO · '+encode(CASES[s.caseId].number)+'</small><h2>'+encode(art.title)+'</h2></div><button type="button" data-locations-close aria-label="Fechar ampliação">×</button></header>'+
   '<div class="locationsArtViewport"><div class="locationsArtZoomPlane" style="width:'+Math.round(zoomLevel*100)+'%;--zoom-factor:'+zoomLevel+'"><img src="'+encode(art.src)+'" alt="Cenário ilustrado: '+encode(art.title)+'" draggable="false"/>'+environmentalInk()+visualTargets()+'</div></div>'+
   '<footer><button type="button" data-locations-zoom="-1" aria-label="Diminuir zoom">−</button><span>Ampliação: '+Math.round(zoomLevel*100)+'%</span><button type="button" data-locations-zoom="1" aria-label="Aumentar zoom">+</button></footer>'+
   '<p>Esta é a pintura do local, preservada. Arraste a imagem ampliada para observar cada canto.</p></section></div>';
 }
 function decorate(){
  if(s.view!=='scene')return;
  const sceneArea=app.querySelector('.landscapeCanvas,.sceneFrame,.casaArteCanvas');
  if(!sceneArea)return;
  const outer=sceneArea.parentElement;
  if(!outer||outer.querySelector('[data-locations-open]'))return;
  const toolbar=document.createElement('div');
  toolbar.className='locationsArtActions';
  toolbar.innerHTML='<button type="button" data-locations-open><span aria-hidden="true">⛶</span> Ver arte do local</button><span>Pintura intacta · amplie sem deslocar objetos</span>';
  sceneArea.insertAdjacentElement('afterend',toolbar);
  if(zoomOpen){
   app.insertAdjacentHTML('beforeend',viewer());
   const view=app.querySelector('.locationsArtViewport');if(view){
    restoreCenter(view);
    view.addEventListener('scroll',()=>{zoomFocus={x:(view.scrollLeft+view.clientWidth/2)/Math.max(1,view.scrollWidth),y:(view.scrollTop+view.clientHeight/2)/Math.max(1,view.scrollHeight)};},{passive:true});
   }
  }
 }
 render=function(){priorRender();decorate()};
 document.addEventListener('click',e=>{
  const hit=e.target.closest('[data-zoom-hit][data-static-examine],[data-zoom-hit][data-v2-clue]');
  if(zoomOpen&&hit&&hit.closest('.locationsArtZoomPlane')){
   e.preventDefault();e.stopImmediatePropagation();
   const key=hit.dataset.staticExamine||hit.dataset.v2Clue;zoomOpen=false;
   app.querySelector('.locationsArtOverlay')?.remove();
   const original=[...app.querySelectorAll('.staticSceneCanvas [data-static-examine],.v2SceneFrame [data-v2-clue]')].find(node=>node.dataset.staticExamine===key||node.dataset.v2Clue===key);
   if(original)original.click();else render();
   return;
  }
  const button=e.target.closest('[data-locations-open],[data-locations-close],[data-locations-zoom],[data-locations-close-outer]');
  if(!button)return;
  const open=button.closest('[data-locations-open]');
  const close=button.closest('[data-locations-close]');
  const change=button.closest('[data-locations-zoom]');
  const outer=button.hasAttribute('data-locations-close-outer')&&e.target===button;
  if(!(open||close||change||outer))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(open){zoomOpen=true;zoomLevel=1;zoomFocus={x:.5,y:0}}
  else if(close||outer){zoomOpen=false}
  else if(change){saveCenter();zoomLevel=Math.max(1,Math.min(3,Math.round((zoomLevel+Number(change.dataset.locationsZoom)*.25)*100)/100))}
  render();
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&zoomOpen){zoomOpen=false;e.preventDefault();render()}
 },true);
 const style=document.createElement('style');
 style.textContent='.locationsArtActions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 14px 20px;flex-wrap:wrap}.locationsArtActions button{background:#203940;color:#ebd5ad;border:1px solid #9f875d;border-radius:7px;font:700 12px system-ui;padding:10px 13px;cursor:pointer}.locationsArtActions span{font:11px/1.5 system-ui;color:#9eaaa5}.locationsArtOverlay{position:fixed;inset:0;z-index:17000;background:#030c12ee;display:flex;align-items:center;justify-content:center;padding:10px;backdrop-filter:blur(5px)}.locationsArtDialog{color:#ecddc4;width:min(650px,100%);max-height:94dvh;display:flex;flex-direction:column;border:1px solid #b3996b;background:#10242b;border-radius:11px;padding:11px;box-shadow:0 15px 50px #000d}.locationsArtDialog header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px}.locationsArtDialog h2{font:normal 23px Georgia,serif;color:#ecd3a9;margin:4px 0}.locationsArtDialog small{font:700 10px system-ui;letter-spacing:.12em;color:#bba47d}.locationsArtDialog header button{font:29px system-ui;border:0;background:transparent;color:#f2d7ac;cursor:pointer}.locationsArtViewport{flex:1;min-height:180px;max-height:68dvh;overflow:auto;background:#07161b;text-align:center;touch-action:pan-x pan-y}.locationsArtViewport img{display:block;height:auto;max-height:none;max-width:none;object-fit:contain;transform:none!important}.locationsArtDialog footer{display:flex;align-items:center;justify-content:center;gap:24px;padding:9px}.locationsArtDialog footer button{height:36px;width:42px;background:#293f40;border:1px solid #907b53;border-radius:5px;color:#ebd5a9;font:25px system-ui;cursor:pointer}.locationsArtDialog footer span{font:12px system-ui}.locationsArtDialog>p{font:11px/1.5 system-ui;color:#b3c0b9;margin:0 8px 8px;text-align:center}@media(max-width:480px){.locationsArtActions>span{font-size:10px}.locationsArtDialog{padding:6px}.locationsArtDialog h2{font-size:20px}}';
 style.textContent += '.locationsArtZoomPlane{position:relative;margin:0;max-width:none!important;line-height:0}.locationsArtZoomPlane>img{display:block;width:100%!important;height:auto;max-width:none!important;pointer-events:none}.locationsArtZoomPlane>.staticPhotoTarget{cursor:crosshair}';
 document.head.appendChild(style);
 render();
})();