'use strict';
/* Manual das Criaturas: Casa do Barqueiro — arte integrada.
 * Carregar APÓS lago_scenery.js. Preserva progresso e regras multiplayer.
 * O cenário de fundo foi preparado sem cortina e sem gaveta; as partes móveis
 * são recortes da mesma imagem aprovada, sem objetos desenhados em duplicidade.
 */
(function(){
 if(typeof scene!=='function'||typeof CASES==='undefined')return;
 const previousScene=scene;
 const path='assets/';
 const approved=path+'casa_aprovada.webp';
 let imageReady=false;
 const preload=new Image();
 preload.onload=()=>{
   imageReady=true;
   if(CASES.lago?.scenes?.casa) CASES.lago.scenes.casa.image=approved;
   if(typeof s!=='undefined'&&s.caseId==='lago'&&s.activeScene==='casa'&&typeof render==='function')render();
 };
 preload.onerror=()=>console.warn('Casa do barqueiro: imagem nova não carregou. O cenário anterior permanece disponível.');
 preload.src=approved;
 const labels={curtain:'Cortina de linho',drawer:'Gaveta com documentos',mirror:'Espelho antigo',radio:'Rádio antigo',papers:'Documentos escondidos'};
 const descriptions={
  curtain:{box:'295 155 163 605'},mirror:{box:'125 198 283 485'},
  radio:{box:'713 585 255 190'},drawer:{box:'567 758 338 224'},papers:{box:'583 755 334 206'}
 };
 function hotspot(id,content,rect,enabled){
   const attrs=enabled?'data-landscape="'+id+'" role="button" tabindex="0"':'aria-disabled="true" style="pointer-events:none"';
   return '<g '+attrs+' aria-label="'+labels[id]+'" class="casaArteObject">'+content+
     '<rect x="'+rect[0]+'" y="'+rect[1]+'" width="'+rect[2]+'" height="'+rect[3]+'" fill="transparent" pointer-events="'+(enabled?'all':'none')+'"/></g>';
 }
 function scenery(){
   const moves=s.lagoMoved||{}, steps=s.lagoSteps||{}, ev=Array.isArray(s.evidence)?s.evidence:[];
   const curtainDx=moves.curtain?96:steps.curtain?24:0;
   const drawerDy=moves.drawer?105:steps.drawer?20:0;
   const mirrorEnabled=!!moves.curtain&&!ev.includes('espelho');
   const radioEnabled=!ev.includes('radio');
   const curtainEnabled=!moves.curtain;
   const drawerEnabled=!moves.drawer;
   const papersEnabled=!!moves.drawer&&!ev.includes('registro');
   const paperHot=papersEnabled?hotspot('papers','',[624,799,227,124],true):'';
   const mirrorHot=hotspot('mirror','',[155,214,226,443],mirrorEnabled);
   const radioHot=hotspot('radio','',[721,595,222,151],radioEnabled);
   const curtainImage='<g transform="translate('+curtainDx+' 0)"><image href="'+path+'casa_curtain.webp" x="302" y="156" width="140" height="601" preserveAspectRatio="none" /></g>';
   // O recorte da gaveta usa a própria arte aprovada; não precisa de arquivo adicional.
   const drawerImage='<g transform="translate(0 '+drawerDy+')"><svg x="588" y="788" width="291" height="158" viewBox="588 788 291 158" overflow="hidden"><image href="'+approved+'" x="0" y="0" width="1122" height="1402" preserveAspectRatio="none"/></svg></g>';
   const curtain=hotspot('curtain',curtainImage,[305+curtainDx,162,135,600],curtainEnabled);
   const drawer=hotspot('drawer',drawerImage,[589,788+drawerDy,286,160],drawerEnabled);
   return '<div class="landscapeCanvas casaArteCanvas" aria-label="Casa do barqueiro, cenário interativo">'+
    '<svg class="landscapeSvg casaArteSvg" viewBox="0 0 1122 1402" xmlns="http://www.w3.org/2000/svg">'+
    '<image href="'+path+'casa_base.webp" x="0" y="0" width="1122" height="1402" preserveAspectRatio="none"/>'+
    paperHot+mirrorHot+curtain+drawer+radioHot+'</svg></div>';
 }
 scene=function(){
   const html=previousScene();
   if(!imageReady||typeof s==='undefined'||s.caseId!=='lago'||s.activeScene!=='casa')return html;
   const match=/<div class="landscapeCanvas[^"]*"[^>]*>[\s\S]*?<\/svg><\/div>/;
   if(!match.test(html))return html;
   let result=html.replace(match,scenery());
   const focused=result.match(/data-landscape-apply="([a-z]+)"/);
   if(focused&&descriptions[focused[1]]){
     const box=descriptions[focused[1]].box;
     const zoom='<div class="landscapeZoom casaArteZoom"><svg viewBox="'+box+'" xmlns="http://www.w3.org/2000/svg"><image href="'+approved+'" x="0" y="0" width="1122" height="1402" /></svg></div>';
     result=result.replace(/<div class="landscapeZoom">[\s\S]*?<\/div>/,zoom);
   }
   return result;
 };
 const style=document.createElement('style');
 style.textContent='.casaArteCanvas{background-image:none!important;aspect-ratio:1122/1402;max-height:none!important}.casaArteSvg{width:100%;height:100%;touch-action:none}.casaArteObject{cursor:grab;touch-action:none}.casaArteObject:active{cursor:grabbing}.casaArteObject:focus-visible{outline:none;filter:drop-shadow(0 0 10px #ebc88a66)}.casaArteZoom{min-height:180px}.casaArteZoom svg{height:min(42vh,310px)!important;max-width:100%;width:100%;transform:none!important}';
 document.head.append(style);
})();