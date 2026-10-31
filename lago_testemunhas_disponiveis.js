'use strict';
/* Arquivo 001: disponibilidade visual de testemunhas.
 * As bordas verdes utilizam o MESMO horário do mundo usado nas entrevistas.
 * Não alteram a presença nem as permissões definidas pelo jogo. */
(function(){
 if(typeof app==='undefined'||typeof render!=='function')return;
 const DAY=1440,PRIMARY=[[20*60,DAY],[5*60,9*60]];
 const minutes=n=>((Number(n)%DAY)+DAY)%DAY;
 const format=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 const windowsFor=(id)=>{
  if(id==='original')return PRIMARY;
  const list=window.manualWitnessWindows?.('lago',id);
  if(Array.isArray(list)&&list.length)return list;
  const h=CASES.lago?.v2Witnesses?.[id]?.hours;
  return Array.isArray(h)?[h]:[];
 };
 const presentAt=(clock,id)=>{
  const t=minutes(clock);
  return windowsFor(id).some(([a,b])=>{
   const start=minutes(a),end=Number(b)===DAY?DAY:minutes(b);
   return start<end?t>=start&&t<end:t>=start||t<end;
  });
 };
 const nextStart=(clock,id)=>{
  const t=minutes(clock),all=windowsFor(id);
  if(!all.length)return null;
  const ahead=all.map(([start])=>({start:minutes(start),delta:(minutes(start)-t+DAY)%DAY})).sort((a,b)=>a.delta-b.delta);
  return ahead[0]?.start??null;
 };
 // Helper próprio para testar horários de início, limites e virada de dia.
 window.manualWitnessAvailabilityAt=(clock,id)=>presentAt(clock,id);
 function paint(){
  if(s.caseId!=='lago'||s.view!=='hub')return;
  const time=typeof window.manualWorldMinute==='function'?window.manualWorldMinute():null;
  const blocked=!!(s.timeFailed||s.outcome||net.inGame&&net.paused);
  const cards=app.querySelectorAll('button[data-view="witness"].locationCard,button[data-branch-witness].locationCard');
  cards.forEach(button=>{
   const id=button.dataset.branchWitness||'original';
   const person=id==='original'?CASES.lago.witness:CASES.lago.v2Witnesses?.[id];
   if(!person)return;
   const accessible=!button.disabled&&!button.classList.contains('v2RoleLocked')&&!blocked;
   const available=Number.isFinite(time)&&accessible&&presentAt(time,id);
   button.classList.toggle('manualWitnessAvailable',available);
   button.dataset.witnessAvailable=available?'true':'false';
   const status=button.querySelector('.cardCount');
   if(!status)return;
   if(!accessible){
    if(blocked&&!button.disabled&&!button.classList.contains('v2RoleLocked'))status.textContent='Entrevistas suspensas durante a pausa';
    return;
   }
   const ids=id==='original'?CASES.lago.v2PrimaryQuestionIds||['lembranca','barqueiro','promessa']:person.ids||[];
   const asked=ids.filter(k=>s.witness.includes(k)).length;
   let label;
   if(!Number.isFinite(time)){
    label='Horário indisponível';
   }else if(available){
    label='● Disponível agora';
   }else{
    const next=nextStart(time,id);
    label=next===null?'Horário não informado':'Volta às '+format(next);
   }
   const message=label+' · '+asked+'/'+ids.length+' perguntas';
   if(status.textContent!==message)status.textContent=message;
   button.setAttribute('aria-label',person.name+' — '+label+(available?' para entrevista':''));
  });
 }
 window.manualUpdateWitnessCards=paint;
 const priorRender=render;
 render=function(){priorRender();paint();};
 const style=document.createElement('style');
 style.textContent=
  'button.locationCard.manualWitnessAvailable{border:2px solid #4bcc83!important;box-shadow:inset 0 0 0 1px #43a66c,0 0 0 2px #3ebf752b!important;opacity:1!important}' +
  '.manualWitnessAvailable .cardCount{color:#a5edbd!important;font-weight:700}' +
  'button.manualWitnessAvailable:focus-visible{outline:3px solid #a5edbd;outline-offset:3px}' +
  '@media(max-width:600px){button.manualWitnessAvailable{border-width:2px!important}}';
 document.head.appendChild(style);
 setInterval(paint,2000);
 paint();
})();