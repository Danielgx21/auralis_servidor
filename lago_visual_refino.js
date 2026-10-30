'use strict';
// Camada visual não destrutiva: mantém objetos, puzzles, tutorial e multiplayer existentes.
(function(){
const previousHub=hub;
const phaseLabels=['Silêncio antes do chamado','Névoa em ascensão','A voz se manifesta','Eco persistente'];
const sceneNames={lago:'Margem do lago',casa:'Casa do barqueiro',capela:'Capela do sino'};
const descriptions={
 lago:['Água imóvel; a névoa permanece junto ao cais.','Pequenas ondas aparecem sem vento.','Uma voz atravessa a superfície.','O lago devolve fragmentos do chamado.'],
 casa:['O rádio está quieto.','O rádio chia e o espelho parece atrasado.','O mostrador insiste em 00h17.','Os móveis guardam a memória das vozes.'],
 capela:['A pedra do altar está fria.','O sino vibra sem tocar.','Um pacto antigo parece despertar.','A água recua, mas a inscrição permanece.']
};
function t(){if(s.caseId!=='lago')return null;
 if(typeof window.manualWorldMinute==='function'){const tm=window.manualWorldMinute(),idx=tm>=1320||tm<12?0:tm<17?1:tm<20?2:3;return {phase:idx,clock:String(Math.floor(tm/60)).padStart(2,'0')+':'+String(tm%60).padStart(2,'0')+':00'}}
 let now=Date.now();if(!Number.isFinite(s.lagoRefinedEpoch)){s.lagoRefinedEpoch=now;s.lagoRefinedOrigin=10*60+40;persist(false)}
 let elapsed=Math.max(0,Math.floor((now-s.lagoRefinedEpoch)/1000));
 let time=((s.lagoRefinedOrigin||640)+elapsed)%86400;
 let phase=time<12*60?0:time<17*60?1:time<20*60?2:3;
 let hr=Math.floor(time/3600),mn=Math.floor(time%3600/60),sc=time%60;
 return {phase,clock:[hr,mn,sc].map(x=>String(x).padStart(2,'0')).join(':')};
}
function panel(){const q=t(),count=id=>CASES.lago.scenes[id].items.filter(k=>s.evidence.includes(k)).length;return '<section class="refinePanel" aria-label="Situação da madrugada"><div class="refineHeadline"><div><small>RELÓGIO DA INVESTIGAÇÃO</small><strong data-refine-clock>'+q.clock+'</strong></div><span data-refine-phase>'+phaseLabels[q.phase]+'</span></div><p data-refine-desc>'+descriptions.lago[q.phase]+' O tempo continua enquanto você investiga.</p><div class="refineMeter"><i style="width:'+([22,48,87,65][q.phase])+'%" data-refine-meter></i></div><div class="refineGrid">'+Object.keys(sceneNames).map(id=>'<div><small>'+sceneNames[id]+'</small><b>'+count(id)+'/3 pistas</b></div>').join('')+'<div><small>Depoimento de Iria</small><b>'+s.witness.length+'/3 perguntas</b></div></div></section>';}
function adaptCards(html){return html.replace(/<div class="cardList">/,'<div class="cardList refineCardList">').replace(/<button class="locationCard" data-scene="(lago|casa|capela)">/g,(full,id)=>'<button class="locationCard refineLocation" data-scene="'+id+'" data-refine-location="'+id+'">').replace(/<div class="cardCount">([0-9]+\/3 pistas)<\/div>/g,'<div class="cardCount">$1</div>');}
hub=function(){let html=previousHub();if(s.caseId!=='lago')return html;return adaptCards(html).replace('<div class="cardList refineCardList">',panel()+'<div class="cardList refineCardList">')};
let previousRender=render;
render=function(){previousRender();if(s.caseId!=='lago')return;const q=t();
 if(s.view==='scene'||s.view==='witness'){const el=app.querySelector('.lakeSceneHelp,.landscapeHelp,.lakeWitness .notice');if(el){let note=document.createElement('div');note.className='refineSceneStatus';note.innerHTML='<span data-refine-clock>'+q.clock+'</span> · <span data-refine-phase>'+phaseLabels[q.phase]+'</span>';el.insertAdjacentElement('beforebegin',note)}}
};
setInterval(()=>{if(document.hidden||s.caseId!=='lago')return;let q=t();document.querySelectorAll('[data-refine-clock]').forEach(e=>{e.textContent=q.clock});document.querySelectorAll('[data-refine-phase]').forEach(e=>{e.textContent=phaseLabels[q.phase]});const d=document.querySelector('[data-refine-desc]');if(d)d.textContent=descriptions.lago[q.phase]+' O tempo continua enquanto você investiga.';const m=document.querySelector('[data-refine-meter]');if(m)m.style.width=[22,48,87,65][q.phase]+'%';},1000);
render();
})();