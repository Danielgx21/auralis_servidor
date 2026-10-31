'use strict';
/* Disponibilidade dos depoimentos para TODOS os arquivos.
 * A borda verde depende do relógio real da investigação, das janelas de
 * presença já usadas pelo bloqueio das perguntas e da permissão de equipe. */
(function(){
 if(typeof app==='undefined'||typeof render!=='function')return;
 const DAY=1440;
 const normalized=t=>((Number(t)%DAY)+DAY)%DAY;
 const hhmm=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 function windowsFor(caseId,key){
  const common=window.manualWitnessWindowsFor?.(caseId,key);
  if(Array.isArray(common))return common;
  const extra=window.manualWitnessWindows?.(caseId,key);
  if(Array.isArray(extra))return extra;
  return [[8*60,17*60]];
 }
 function presentAt(clock,caseId,key){
  const t=normalized(clock);
  return windowsFor(caseId,key).some(([from,to])=>{
   const start=normalized(from),end=Number(to)===DAY?DAY:normalized(to);
   return start<end?t>=start&&t<end:t>=start||t<end;
  });
 }
 function nextStart(clock,caseId,key){
  const t=normalized(clock),win=windowsFor(caseId,key);
  if(!win.length)return null;
  const next=win.map(([from])=>({start:normalized(from),distance:(normalized(from)-t+DAY)%DAY}))
   .sort((a,b)=>a.distance-b.distance)[0];
  return next?.start??null;
 }
 // A validação pode comparar este resultado com o bloqueio do depoimento.
 window.manualWitnessAvailabilityAt=(clock,key,caseId='lago')=>presentAt(clock,caseId,key);
 function paint(){
  if(s.view!=='hub'||!CASES[s.caseId])return;
  const C=CASES[s.caseId];
  const minute=typeof window.manualWorldMinute==='function'?window.manualWorldMinute():null;
  const suspended=!!(s.timeFailed||s.outcome||(net.inGame&&net.paused));
  app.querySelectorAll('button[data-view="witness"].locationCard,button[data-branch-witness].locationCard').forEach(button=>{
   const id=button.dataset.branchWitness||'original';
   const person=id==='original'?C.witness:C.v2Witnesses?.[id];
   if(!person)return;
   const allowed=!button.disabled&&!button.classList.contains('v2RoleLocked');
   const present=Number.isFinite(minute)&&presentAt(minute,s.caseId,id);
   const available=allowed&&!suspended&&present;
   button.classList.toggle('manualWitnessAvailable',available);
   button.dataset.witnessAvailable=available?'true':'false';
   const el=button.querySelector('.cardCount');
   if(!el)return;
   if(!allowed)return; // Preserva o motivo da restrição por especialidade.
   const ids=id==='original'?
     C.v2PrimaryQuestionIds||Object.keys(C.witness.questions).filter(k=>!/^v2_w/.test(k)).slice(0,3):
     person.ids||[];
   const answered=ids.filter(k=>s.witness.includes(k)).length;
   let status;
   if(suspended)status='Entrevistas pausadas';
   else if(!Number.isFinite(minute))status='Horário não informado';
   else if(available)status='● Disponível agora';
   else{
    const next=nextStart(minute,s.caseId,id);
    status=next===null?'Fora do horário':'Volta às '+hhmm(next);
   }
   const label=status+' · '+answered+'/'+ids.length+' perguntas';
   if(el.textContent!==label)el.textContent=label;
   button.setAttribute('aria-label',person.name+' — '+status);
  });
 }
 window.manualUpdateWitnessCards=paint;
 const originalRender=render;
 render=function(){originalRender();paint();};
 const style=document.createElement('style');
 style.textContent='button.locationCard.manualWitnessAvailable{border:2px solid #4bcc83!important;box-shadow:inset 0 0 0 1px #43a66c,0 0 0 2px #3ebf752b!important;opacity:1!important}' +
 '.manualWitnessAvailable .cardCount{color:#a5edbd!important;font-weight:700}' +
 'button.manualWitnessAvailable:focus-visible{outline:3px solid #a5edbd;outline-offset:3px}'+
 '@media(max-width:600px){button.manualWitnessAvailable{border-width:2px!important}}';
 document.head.appendChild(style);
 setInterval(paint,2000);
 paint();
})();