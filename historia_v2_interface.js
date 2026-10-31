'use strict';
(function install(){
 if(typeof CASES==='undefined'||typeof render!=='function')return;
 window.manualApplyStories?.();
 const ROLE_NAMES={analyst:'Analista',sensitive:'Sensitivo',archivist:'Arquivista',diplomat:'Diplomata',tracker:'Rastreador'};
 const ownRole=()=>net.inGame&&net.mode==='coop';
 const roleIndex=name=>['analyst','sensitive','archivist','diplomat','tracker'].indexOf(name);
 const roleOwner=(role,kind='v2_a')=>{
  if(!ownRole())return -1;
  const exact=roleIndex(role);
  if(exact>=0&&exact<net.size)return exact;
  // Em grupos menores, outra especialidade cobre a função ausente.
  return kind==='v2_b'||kind==='v2_w2'?Math.min(1,net.size-1):0;
 };
 const allowed=(role,kind)=>!ownRole()||net.slot===roleOwner(role,kind);
 const ownerDescription=(role,kind)=>{
  const owner=roleOwner(role,kind);
  if(owner<0)return 'Acesso livre';
  return ROLE_NAMES[role]+(roleIndex(role)>=net.size?' · atribuição ao '+roleAt(owner).name:'');
 };
 const h=x=>esc(String(x??''));
 const caseMode=(id)=>CASES[id]?.v2Mode||'both';
 const canPlay=(id)=>{
  const mode=caseMode(id);
  if(net.online||net.inGame){
   if(mode==='solo')return false;
   if(mode==='coop'&&net.mode!=='coop')return false;
  }else if(mode==='coop')return false;
  return true;
 };
 const modeLabel=id=>({solo:'INVESTIGAÇÃO SOLO',coop:'MISSÃO COOPERATIVA',both:'SOLO OU COOPERATIVO'})[caseMode(id)]||'INVESTIGAÇÃO';
 const baseHub=hub,baseScene=scene,baseWitness=witness,baseCollection=collection,baseRoomMenu=roomMenu,baseBrief=brief,baseChooseCase=chooseCase,baseNewMultiplayerCase=newMultiplayerCase,baseHeader=header;
 header=function(){return baseHeader().replace(/(\d+)\/9\b/g,(_,n)=>n+'/'+Object.keys(CASES[s.caseId].clues).length);};
 const baseRender=render;
 const witnessById=()=>{
  if(!s.activeWitness||s.activeWitness==='original')return null;
  return CASES[s.caseId]?.v2Witnesses?.[s.activeWitness]||null;
 };
 window.manualWitnessWindows=(caseId,key)=>{
  const w=CASES[caseId]?.v2Witnesses?.[key];
  return w?[w.hours]:null;
 };
 function testimonyCard(key,w){
  const can=allowed(w.role,key);
  return '<button type="button" class="locationCard expandedWitnessCard '+(can?'':'v2RoleLocked')+'" data-branch-witness="'+key+'" '+(can?'':'disabled')+'>'+
   '<img src="'+w.image+'" alt="Retrato de '+h(w.name)+'"/><div><div class="cardTitle">'+h(w.name)+'</div>'+
   '<div class="cardSubtitle">'+h(w.job)+'</div>'+
   '<div class="cardCount">'+(can?'Depoimento disponível':'Reservado: '+h(ownerDescription(w.role,key)))+'</div></div></button>';
 }
 hub=function(){
  const template=document.createElement('template');template.innerHTML=baseHub();
  const mode=modeLabel(s.caseId);
  const target=template.content.querySelector('.cardList');
  if(target)target.insertAdjacentHTML('beforebegin','<div class="v2CaseType">'+h(mode)+' · '+Object.keys(CASES[s.caseId].scenes).length+' LOCAIS · '+(1+Object.keys(CASES[s.caseId].v2Witnesses||{}).length)+' TESTEMUNHAS</div>');
  template.content.querySelectorAll('[data-scene]').forEach(button=>{
   const location=CASES[s.caseId].v2Locations?.[button.dataset.scene];
   if(!location)return;
   const can=allowed(location.role,button.dataset.scene);
   if(!can)button.disabled=true;
   button.classList.toggle('v2RoleLocked',!can);
   const count=button.querySelector('.cardCount');
   if(count)count.textContent=can?'Área de investigação':'Acesso: '+ownerDescription(location.role,button.dataset.scene);
  });
  const primary=template.content.querySelector('[data-view="witness"]');
  if(primary){
   const group=primary.closest('.partDivider')||primary.parentElement;
   const witnessMarkup='<div class="v2WitnessHead"><h3>Outros depoimentos</h3><p>Entrevistas diferentes podem se contradizer. Algumas exigem uma especialidade.</p></div>'+
     Object.entries(CASES[s.caseId].v2Witnesses||{}).map(([key,w])=>testimonyCard(key,w)).join('');
   group.insertAdjacentHTML('afterend','<div class="partDivider v2WitnessGroup">'+witnessMarkup+'</div>');
  }
  const caption=template.content.querySelector('.progressTrack + .caption');
  if(caption)caption.textContent=s.evidence.length+' pistas registradas · confira detalhes e depoimentos no diário.';
  const status=template.content.querySelector('.progressFill');
  if(status)status.style.width=Math.round(s.evidence.length/Math.max(1,Object.keys(CASES[s.caseId].clues).length)*100)+'%';
  return template.innerHTML;
 };
 function newScene(){
  const sceneObj=CASES[s.caseId].scenes[s.activeScene],gate=CASES[s.caseId].v2Locations?.[s.activeScene];
  if(!gate||!sceneObj)return baseScene();
  if(!allowed(gate.role,s.activeScene))return '<section class="section"><button class="backBtn" data-view="hub">← Voltar</button><h2>Acesso restrito</h2><p>Esta área é responsabilidade do '+h(ownerDescription(gate.role,s.activeScene))+'. O restante da equipe recebe os resultados compartilhados.</p></section>';
  const buttons=sceneObj.items.map(id=>{
   const clue=CASES[s.caseId].clues[id],done=s.evidence.includes(id);
   const hitW=clue.hitW||16,hitH=clue.hitH||22;
   const left=Math.max(0,Math.min(100-hitW,clue.x-hitW/2));
   const top=Math.max(0,Math.min(100-hitH,clue.y-hitH/2));
   return '<button type="button" class="v2InvisibleHotspot" aria-label="Examinar elemento do cenário" data-v2-clue="'+h(id)+'" style="left:'+left+'%;top:'+top+'%;width:'+hitW+'%;height:'+hitH+'%" '+(done?'data-revisited="1"':'')+'></button>';
  }).join('');
  return '<section class="section v2ScenePage"><div class="sceneIntro"><button class="backBtn" data-view="hub">← Voltar aos locais</button>'+
   '<div class="eyebrow">ARQUIVO '+h(CASES[s.caseId].number)+' · ÁREA DE '+h(ROLE_NAMES[gate.role]||'PESQUISA')+'</div>'+
   '<h2>'+h(sceneObj.name)+'</h2><p>'+h(sceneObj.intro)+'</p></div>'+
   '<div class="sceneFrame v2SceneFrame '+(sceneObj.artMode==='pintura-integrada'?'lagoHdScene':'')+'"><img src="'+sceneObj.image+'" alt="Ilustração do local: '+h(sceneObj.name)+'" draggable="false"/>'+buttons+'</div>'+
   '<p class="v2SceneHint">Observe a imagem ou amplie para examinar os detalhes. Os objetos não se movem. Compare os registros no diário.</p>'+
   '<div class="sceneFoot"><button type="button" class="smallBtn" data-view="dossier">Consultar pistas coletadas</button><button type="button" class="smallBtn" data-view="hub">Outros locais →</button></div></section>';
 }
 scene=function(){return /^v2_[a-z]+$/.test(s.activeScene)?newScene():baseScene()};
 function extraWitness(){
  const w=witnessById();if(!w)return baseWitness();
  if(!allowed(w.role,s.activeWitness))return '<section class="section"><button class="backBtn" data-view="hub">← Voltar</button><h2>Entrevista reservada</h2><p>Este contato exige '+h(ownerDescription(w.role,s.activeWitness))+'.</p></section>';
  const reply=w.ids.includes(s.reply)?CASES[s.caseId].witness.questions[s.reply]:null;
  return '<div class="portraitWrap v2WitnessPortrait" style="background-image:url(&quot;'+w.image+'&quot;)">'+
   '<div class="portraitName">'+h(w.name)+'<span class="micro"> · '+h(w.job)+'</span></div></div>'+
   '<section class="section v2WitnessPage"><button class="backBtn" data-view="hub">← Voltar</button>'+
   '<div class="eyebrow">ENTREVISTA · '+h(ROLE_NAMES[w.role])+'</div><p class="lead">'+h(w.intro)+'</p>'+
   (reply?'<div class="reply"><strong>'+h(w.name)+' responde:</strong><p>'+h(reply.answer)+'</p></div>':'<p class="v2WitnessPrompt">Converse com a testemunha. Compare a versão dela com as outras fontes.</p>')+
   '<div class="eyebrow">Perguntas</div>'+
   w.ids.map((id,i)=>{
    const q=CASES[s.caseId].witness.questions[id];
    return '<button class="option '+(s.witness.includes(id)?'done':'')+'" data-question="'+id+'"><b>0'+(i+1)+'.</b><span>'+h(q.q)+(s.witness.includes(id)?' ✓':'')+'</span></button>';
   }).join('')+
   '<div class="notice">O depoimento não é prova definitiva. Anote contradições no diário.</div>'+
   '<button class="btn outline" data-deep-journal-open="1">✎ Abrir diário</button>'+
   '<button class="btn ghost" data-view="hub">Voltar aos locais</button></section>';
 }
 witness=function(){
  if(s.activeWitness&&s.activeWitness!=='original')return extraWitness();
  const template=document.createElement('template');template.innerHTML=baseWitness();
  const allowedQ=new Set(CASES[s.caseId].v2PrimaryQuestionIds||[]);
  template.content.querySelectorAll('[data-question]').forEach(button=>{if(!allowedQ.has(button.dataset.question))button.remove()});
  return template.innerHTML;
 };
 collection=function(){
  const template=document.createElement('template');template.innerHTML=baseCollection();
  template.content.querySelectorAll('.caseSelect[data-case]').forEach(button=>{
   const id=button.dataset.case;
   const label=modeLabel(id);
   const main=button.querySelector('.caseDifficulty');
   if(main)main.textContent=label+' · '+Math.max(1,CASES[id].minClues||5)+' pistas mínimas';
   if(!canPlay(id)){
    button.disabled=true;button.classList.add('v2ModeLocked');
    const status=button.querySelector('.caseStatus');
    if(status)status.textContent=caseMode(id)==='coop'?'Exclusiva para expedição cooperativa · abrir Multijogador':'Exclusiva para um pesquisador · sair da sala';
   }
  });
  return template.innerHTML;
 };
 roomMenu=function(){
  const template=document.createElement('template');template.innerHTML=baseRoomMenu();
  template.content.querySelectorAll('#caseChoice option').forEach(option=>{
   const type=caseMode(option.value);
   option.dataset.mode=type;
   if(type==='solo')option.disabled=true;
   option.textContent+=type==='coop'?' · GRUPO':type==='solo'?' · SOLO':' · FLEXÍVEL';
  });
  return template.innerHTML;
 };
 brief=function(){
  let html=baseBrief();
  html=html.replace('Examine os cenários, entreviste uma testemunha e apresente uma hipótese. Sua conclusão muda quais desfechos estarão disponíveis.',
    'Explore '+Object.keys(CASES[s.caseId].scenes).length+' locais e ouça '+(1+Object.keys(CASES[s.caseId].v2Witnesses||{}).length)+' testemunhas. Compare provas, anote livremente e identifique a criatura. Em equipe, algumas áreas e entrevistas exigem especialidades diferentes.');
  return html.replace('<span class="micro">OBJETIVO</span><strong>Investigar e decidir</strong>','<span class="micro">OBJETIVO</span><strong>'+h(CASES[s.caseId].v2Report)+'</strong>');
 };
 chooseCase=function(id){if(!canPlay(id))return toast(caseMode(id)==='coop'?'Este caso exige uma equipe cooperativa.':'Este caso é exclusivo para jogar sozinho.');return baseChooseCase(id)};
 newMultiplayerCase=function(id){if(caseMode(id)==='solo')return toast('Esta missão é exclusiva do modo solo.');if(caseMode(id)==='coop'&&net.mode!=='coop')return toast('Esta missão exige cooperação.');return baseNewMultiplayerCase(id)};
 function refreshModeChoices(){
  const mode=document.getElementById('modeChoice')?.value||'coop';
  const opts=[...document.querySelectorAll('#caseChoice option')];
  for(const option of opts){
   if(option.dataset.mode==='solo'||(option.dataset.mode==='coop'&&mode!=='coop'))option.disabled=true;
   else option.disabled=!eligible(option.value);
  }
  const select=document.getElementById('caseChoice');
  if(select&&select.selectedOptions[0]?.disabled){const first=opts.find(el=>!el.disabled);if(first)select.value=first.value}
 }
 document.addEventListener('change',e=>{if(e.target?.id==='modeChoice')refreshModeChoices()},true);
 app.addEventListener('click',ev=>{
  const target=ev.target.closest('[data-branch-witness],[data-v2-clue],[data-question],[data-scene],[data-view="witness"],[data-nominate]');
  if(!target)return;
  if(target.dataset.branchWitness){
   ev.preventDefault();ev.stopImmediatePropagation();
   const id=target.dataset.branchWitness,w=CASES[s.caseId].v2Witnesses?.[id];
   if(!w||!allowed(w.role,id))return toast('Esse depoimento exige outra especialidade da equipe.');
   if(net.inGame&&net.paused)return toast('Aguarde os pesquisadores reconectarem.');
   s.activeWitness=id;move('witness');return;
  }
  if(target.dataset.v2Clue){
   ev.preventDefault();ev.stopImmediatePropagation();
   if(net.inGame&&net.paused)return toast('A investigação está pausada durante a reconexão.');
   const id=target.dataset.v2Clue,g=CASES[s.caseId].v2Locations?.[s.activeScene];
   if(!g||!allowed(g.role,s.activeScene))return toast('Esta área exige outro pesquisador.');
   if(!s.evidence.includes(id)){s.evidence.push(id);persist();if(typeof playEffect==='function')playEffect('find')}
   s.modal=id;render();return;
  }
  if(target.dataset.question){
   const w=witnessById();
   if(w&&!allowed(w.role,s.activeWitness)){
    ev.preventDefault();ev.stopImmediatePropagation();return toast('Outra especialidade deve conduzir este depoimento.');
   }
   return;
  }
  if(target.dataset.scene){
   const loc=CASES[s.caseId].v2Locations?.[target.dataset.scene];
   if(loc&&!allowed(loc.role,target.dataset.scene)){ev.preventDefault();ev.stopImmediatePropagation();return toast('Acesso reservado: '+ownerDescription(loc.role,target.dataset.scene))}
  }
  if(target.dataset.view==='witness')s.activeWitness='original';
  if(target.dataset.nominate&&!canPlay(target.dataset.nominate)){
   ev.preventDefault();ev.stopImmediatePropagation();return toast('Esse arquivo não permite o modo de partida atual.');
  }
 },true);
 const prevRender=render;
 render=function(){prevRender();refreshModeChoices()};
 const css=document.createElement('style');
 css.textContent='.v2CaseType{font:800 10px/1.7 system-ui;letter-spacing:.12em;color:#d6b783;margin:15px 0}.v2RoleLocked{opacity:.52!important;filter:grayscale(.5)}.v2WitnessGroup{padding:18px 0}.v2WitnessHead h3{color:#e9d1a7;font:25px Georgia,serif;margin:4px 0}.v2WitnessHead p{color:#b8c9c8;font-size:12px}.expandedWitnessCard{margin:12px 0;width:100%}.expandedWitnessCard img{object-fit:cover;object-position:center}.v2ScenePage{padding-bottom:125px}.v2SceneFrame{position:relative;overflow:hidden;border:1px solid #877956;border-radius:12px;aspect-ratio:1200/760}.v2SceneFrame>img{width:100%;height:100%;display:block;object-fit:fill;pointer-events:none}.v2InvisibleHotspot{background:transparent!important;border:0!important;box-shadow:none!important;position:absolute;cursor:crosshair;z-index:10;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.v2InvisibleHotspot:focus-visible{outline:2px dashed #f0d4a8}.v2SceneHint{font-size:12px;color:#b9ccc9;margin-top:12px}.v2WitnessPage .option{width:100%}.v2WitnessPrompt{color:#d5c9aa}.v2WitnessPortrait{background-size:cover;background-position:50% 25%}.caseSelect.v2ModeLocked{cursor:not-allowed}.v2ScenePage .sceneFoot{margin-top:15px;display:flex;gap:8px;flex-wrap:wrap}@media(max-width:480px){.v2ScenePage{padding:18px 12px 135px}.v2SceneFrame{margin-left:0;margin-right:0}.v2WitnessGroup .locationCard img{width:82px;height:100px}}';
 document.head.append(css);
 render();
})();
