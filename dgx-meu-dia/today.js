/* DGX Meu Dia v0.9 — visão diária consolidada no Início.
   Tudo é derivado dos dados já existentes (Neon + agenda esportiva). */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const TZ="America/Sao_Paulo";
const ICONS={
 ball:'<circle cx="12" cy="12" r="8.5"/><path d="m9.2 8.6 2.8-1.9 2.8 1.9-1.1 3.2h-3.4zM5.5 13.5l4.2-1.7M14.3 11.8l4.2 1.7M8.7 7l-1.4-2.7M15.3 7l1.4-2.7M9.1 18l2.9-3.2 2.9 3.2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3M8 18h3"/>',
 wallet:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 9h18M16 15h5M6 6V4h12"/>',
 arrow:'<path d="m9 18 6-6-6-6"/>'
};
const icon=(name,size=20)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[name]+'</svg>';
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const localDate=value=>new Intl.DateTimeFormat("sv-SE",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
const fmtHour=value=>new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,hour:"2-digit",minute:"2-digit"}).format(new Date(value));
const money=cents=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(cents)||0)/100);
const get=(key,fallback=[])=>window.DGXStore?.read(key,fallback)??fallback;
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const monthEnd=(year,month)=>new Date(Date.UTC(year,month,0)).getUTCDate();
function addDays(ymd,days){
 const d=new Date(ymd+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
function activeBill(b,month){
 return b&&(!b.startMonth||b.startMonth<=month)&&(!b.endMonth||b.endMonth>month);
}
function billDue(b,month){
 const [y,m]=month.split("-").map(Number),day=Number(b.dueDay)||1;
 return month+"-"+String(Math.min(Math.max(day,1),monthEnd(y,m))).padStart(2,"0");
}
function billAmount(b,month){
 const change=b.monthly?.[month];
 return Number.isSafeInteger(change)?change:(Number.isSafeInteger(b.amountCents)?b.amountCents:0);
}
function gameSummary(day){
 const info=window.DGXsummaryData?.()||{};
 const list=(info.fixtures||[]).filter(g=>{
  try{return localDate(g.date)===day}catch(e){return false}
 }).sort((a,b)=>a.date.localeCompare(b.date));
 if(!list.length)return {heading:"Sem jogo identificado hoje",detail:"Confira a agenda do Timão para próximas partidas.",tone:"neutral",count:0};
 const g=list[0],hour=fmtHour(g.date),isReference=(info.fixtureLabel||"").includes("referência");
 return {
  heading:list.length===1?g.home+" × "+g.away:list.length+" jogos identificados hoje",
  detail:"Hoje às "+hour+(isReference?" · horário de referência, confirme antes":" · horários sujeitos a alterações"),
  tone:"highlight",count:list.length
 };
}
function agendaSummary(day){
 const tasks=get("dgx_tasks_v1").filter(t=>t?.date===day);
 const rems=get("dgx_reminders_v1").filter(r=>typeof r?.at==="string"&&r.at.slice(0,10)===day);
 const sorted=[
  ...tasks.map(t=>({title:String(t.title||"Tarefa"),type:t.type==="sme"?"SME":"Pessoal",time:t.time||"99:99",done:!!t.done})),
  ...rems.map(r=>({title:String(r.title||"Lembrete"),type:"Lembrete",time:r.at.slice(11,16)||"99:99",done:false}))
 ].sort((a,b)=>a.time.localeCompare(b.time));
 if(!sorted.length)return {heading:"Nenhum compromisso hoje",detail:"Sua agenda está livre até o momento.",tone:"neutral",count:0};
 const completed=sorted.filter(x=>x.done).length;
 const detail=sorted.slice(0,3).map(x=>x.type+": "+x.title+(x.time!=="99:99"?" · "+x.time:"")+(x.done?" ✓":"")).join("  •  ");
 return {heading:sorted.length===1?"1 item na agenda":"Hoje: "+sorted.length+" itens na agenda",
  detail:detail+(sorted.length>3?"  •  +"+(sorted.length-3)+" outros":"")+(completed===sorted.length?" · Todos concluídos":""),tone:"highlight",count:sorted.length};
}
function paymentSummary(day){
 const month=day.slice(0,7);
 const bills=get("dgx_payments_v1");
 const pending=bills.filter(b=>activeBill(b,month)&&!b.paid?.[month]).map(b=>({...b,due:billDue(b,month)}));
 const due=pending.filter(b=>b.due===day);
 const overdue=pending.filter(b=>b.due<day);
 if(due.length){
  const total=due.reduce((sum,b)=>sum+billAmount(b,month),0);
  const names=due.slice(0,2).map(b=>b.title).join(" e ");
  return {heading:due.length===1?"1 conta vence hoje":due.length+" contas vencem hoje",
    detail:names+(due.length>2?" e outras":"")+" · "+money(total)+(overdue.length?" · "+overdue.length+" atrasada(s)":""),tone:"attention",count:due.length+overdue.length};
 }
 if(overdue.length){
  return {heading:overdue.length===1?"1 conta está atrasada":overdue.length+" contas estão atrasadas",
    detail:overdue.slice(0,2).map(b=>b.title).join(" e ")+" · Verifique seus pagamentos.",tone:"attention",count:overdue.length};
 }
 // Também avisa quando existe vencimento próximo, sem chamá-lo de "hoje".
 let upcoming=[];
 for(let offset=1;offset<=3;offset++){
  const future=addDays(day,offset),futureMonth=future.slice(0,7);
  const matches=bills.filter(b=>activeBill(b,futureMonth)&&!b.paid?.[futureMonth]&&billDue(b,futureMonth)===future);
  upcoming.push(...matches.map(b=>({bill:b,offset,month:futureMonth})));
 }
 if(upcoming.length){
  upcoming.sort((a,b)=>a.offset-b.offset);
  const item=upcoming[0],when=item.offset===1?"amanhã":"em "+item.offset+" dias";
  return {heading:"Próximo vencimento: "+when,
    detail:item.bill.title+" · "+money(billAmount(item.bill,item.month))+(upcoming.length>1?" · +"+(upcoming.length-1)+" outra(s) conta(s) nos próximos dias":""),tone:"upcoming",count:upcoming.length};
 }
 return {heading:"Nenhuma conta vence hoje",detail:"Sem pagamentos pendentes com vencimento nos próximos 3 dias.",tone:"neutral",count:0};
}
function render(){
 const holder=$("todayOverviewItems");if(!holder)return;
 const d=today();
 $("todayOverviewDate").textContent=new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,weekday:"long",day:"numeric",month:"long"}).format(new Date(d+"T12:00:00-03:00"));
 const rows=[
  {type:"corinthians",label:"Corinthians",target:"corinthians",icon:"ball",...gameSummary(d)},
  {type:"agenda",label:"Compromissos",target:"calendar",icon:"calendar",...agendaSummary(d)},
  {type:"payments",label:"Pagamentos",target:"payments",icon:"wallet",...paymentSummary(d)}
 ];
 const count=rows.filter(r=>r.count>0).length;
 $("todayOverviewCount").textContent=count?count+" área"+(count>1?"s":"")+" com avisos":"Tudo tranquilo";
 holder.innerHTML=rows.map(r=>
  '<button type="button" class="today-item today-'+r.tone+'" data-today-target="'+escape(r.target)+'" aria-label="'+escape(r.label+": "+r.heading)+'">'+
  '<span class="today-item-icon">'+icon(r.icon,20)+'</span>'+
  '<span class="today-item-copy"><span class="today-item-label">'+escape(r.label)+'</span>'+
  '<span class="today-item-title">'+escape(r.heading)+'</span>'+
  '<span class="today-item-detail">'+escape(r.detail)+'</span></span>'+
  '<span class="today-item-chevron">'+icon("arrow",17)+'</span></button>'
 ).join("");
 holder.querySelectorAll("[data-today-target]").forEach(b=>b.onclick=()=>{
  const target=b.dataset.todayTarget;
  if(target==="corinthians")window.DGXhomeOpen?.("corinthians");
  else window.DGXgoto?.(target);
 });
}
window.DGXtodayRefresh=render;
render();
setInterval(render,60000);
window.addEventListener("focus",render);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
})();