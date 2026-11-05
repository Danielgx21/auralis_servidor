/* DGX Meu Dia 0.3 — despesas mensais: vencimentos, pagamento por competência e histórico. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const monthNow=()=>today().slice(0,7);
const moneyCents=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
const dateBR=s=>s?s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4):"—";
const id=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);
const dataKey="dgx_payments_v1";
let view=monthNow();
function parseMoney(text){
 const raw=String(text||"").trim().replace(/^R\$\s*/i,"").replace(/\s/g,"");
 if(!raw)return null;
 // Locale pt-BR: 1.234,56; 1234,56; 1234.56; 1234
 let normalized;
 if(raw.includes(",")){normalized=raw.replace(/\./g,"").replace(",",".");}
 else if(/^\d{1,3}(\.\d{3})+$/.test(raw)){normalized=raw.replace(/\./g,"");}
 else{normalized=raw;}
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(normalized))return null;
 const value=Math.round(Number(normalized)*100);
 return Number.isSafeInteger(value)&&value>=0&&value<=100_000_000_00?value:null;
}
function bills(){return window.DGXStore?window.DGXStore.read(dataKey,[]):[]}
function save(all){window.DGXStore.write(dataKey,all);render()}
function notice(s){window.DGXtoast(s)}
function monthMove(str,offset){const [y,m]=str.split("-").map(Number);const dt=new Date(Date.UTC(y,m-1+offset,1));return dt.toISOString().slice(0,7)}
function dueDate(month,day){
 const [y,m]=month.split("-").map(Number);
 const last=new Date(Date.UTC(y,m,0)).getUTCDate();
 return month+"-"+String(Math.min(Math.max(1,day),last)).padStart(2,"0");
}
function eligible(item,month){
 return (item.startMonth||"1900-01")<=month&&(!item.endMonth||month<item.endMonth);
}
function monthAmount(item,month){
 const alt=item.monthly&&item.monthly[month];
 return Number.isSafeInteger(alt)&&alt>=0?alt:(item.amountCents||0);
}
function paidFor(item,month){return item.paid&&item.paid[month]||null}
function activeItems(month){return bills().filter(b=>eligible(b,month)).sort((a,b)=>a.dueDay-b.dueDay||a.title.localeCompare(b.title,"pt-BR"))}
function compute(month){
 const all=activeItems(month);
 let total=0,paid=0,open=0,late=0;
 all.forEach(b=>{
  const amount=monthAmount(b,month),receipt=paidFor(b,month);
  total+=amount;
  if(receipt){paid+=Number.isSafeInteger(receipt.amountCents)?receipt.amountCents:amount;}
  else{open++;if(dueDate(month,b.dueDay)<today())late++;}
 });
 return{all,total,paid,open,late,remaining:Math.max(0,total-paid)};
}
function statusFor(b,month){
 const receipt=paidFor(b,month);
 if(receipt)return{text:"Pago em "+dateBR(receipt.date),className:"green",row:"paid"};
 const due=dueDate(month,b.dueDay);
 if(due<today())return{text:"Vencido em "+dateBR(due),className:"warn",row:"overdue"};
 if(due===today())return{text:"Vence hoje",className:"warn",row:""};
 return{text:"Em aberto · vence "+dateBR(due),className:"",row:""};
}
function drawList(){
 const info=compute(view);
 $("payMonth").textContent=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(view+"-01T12:00:00Z"));
 $("payTotal").textContent=moneyCents(info.total);
 $("payPaid").textContent=moneyCents(info.paid);
 $("payPending").textContent=moneyCents(info.remaining);
 $("payOpenCount").textContent=String(info.open);
 $("payMonthCount").textContent=info.all.length+" contas";
 $("paymentSummary").textContent=info.all.length?
  "Neste mês há "+info.all.length+" contas cadastradas. "+info.open+" estão abertas"+
  (info.late?" e "+info.late+" já passaram do vencimento":"")+
  ". Total previsto: "+moneyCents(info.total)+". Valor registrado como pago: "+moneyCents(info.paid)+"."
  :"Nenhuma despesa mensal registrada para este mês.";
 $("paymentList").innerHTML=info.all.length?info.all.map(b=>{
  const amount=monthAmount(b,view),receipt=paidFor(b,view),st=statusFor(b,view),due=dueDate(view,b.dueDay);
  const isVariable=!!(b.monthly&&Object.prototype.hasOwnProperty.call(b.monthly,view));
  return '<article class="pay-item '+st.row+'"><input type="checkbox" class="pay-check" data-check="'+esc(b.id)+'" '+(receipt?"checked":"")+' aria-label="'+(receipt?"Desmarcar pagamento de ":"Marcar como paga: ")+esc(b.title)+'">'+
   '<div class="pay-main"><div class="pay-title">'+esc(b.title)+'</div>'+
   '<div class="pay-meta">'+esc(b.category)+' · Dia '+esc(b.dueDay)+' · Venc. '+dateBR(due)+(b.note?' · '+esc(b.note):"")+'</div>'+
   '<span class="pay-badge '+st.className+'">'+esc(st.text)+'</span>'+
   (!receipt?'<div class="pay-date-field"><label for="paid-date-'+esc(b.id)+'">Paguei em:</label><input type="date" data-paid-date="'+esc(b.id)+'" id="paid-date-'+esc(b.id)+'" value="'+today()+'" max="'+today()+'"></div>':"")+
   '</div><div class="pay-tools"><span class="pay-money">'+esc(moneyCents(amount))+'</span>'+
   (isVariable?'<span class="small">Valor ajustado</span>':"")+
   '<div class="pay-inline-actions"><button class="roundbtn" type="button" data-month-value="'+esc(b.id)+'" title="Ajustar valor somente deste mês">R$</button>'+
   '<button class="roundbtn" type="button" data-payment-edit="'+esc(b.id)+'" title="Editar conta">✎</button>'+
   '<button class="roundbtn" type="button" data-payment-remove="'+esc(b.id)+'" title="Excluir conta e histórico">✕</button></div></div></article>';
 }).join(""):'<div class="empty">Nenhuma conta para este mês. Use o formulário para começar.</div>';
}
function drawHistory(){
 const entries=[];
 bills().forEach(b=>Object.entries(b.paid||{}).forEach(([month,p])=>{
  if(!eligible(b,month))return;
  entries.push({title:b.title,month,date:p.date,amount:Number.isSafeInteger(p.amountCents)?p.amountCents:monthAmount(b,month)});
 }));
 entries.sort((a,b)=>(b.date||b.month).localeCompare(a.date||a.month));
 $("paymentHistory").innerHTML=entries.length?entries.slice(0,24).map(x=>
 '<div class="pay-history-row"><div><strong>'+esc(x.title)+'</strong><div class="small">Competência '+esc(x.month.slice(5)+"/"+x.month.slice(0,4))+' · Pago em '+dateBR(x.date)+'</div></div>'+
 '<strong style="white-space:nowrap">'+moneyCents(x.amount)+'</strong></div>'
 ).join(""):'<div class="empty">Ainda não há pagamentos marcados como pagos.</div>';
}
function drawHome(){
 const info=compute(monthNow());
 if(!info.all.length){$("homePayments").textContent="Nenhuma despesa mensal cadastrada ainda.";return;}
 const due=info.all.filter(b=>!paidFor(b,monthNow())).sort((a,b)=>a.dueDay-b.dueDay);
 $("homePayments").innerHTML=
 '<div class="hori" style="margin-bottom:9px"><span class="small">Em aberto</span><strong style="color:#a1efdc">'+moneyCents(info.remaining)+'</strong></div>'+
 (due.length?due.slice(0,3).map(b=>'<div class="event"><div class="hori"><span>'+esc(b.title)+'</span><strong>'+moneyCents(monthAmount(b,monthNow()))+'</strong></div><div class="small">'+esc(statusFor(b,monthNow()).text)+'</div></div>').join(""):'<div class="small">✓ Todas as contas do mês foram marcadas como pagas.</div>')+
 (due.length>3?'<div class="small" style="margin-top:8px">E mais '+(due.length-3)+' conta(s) em aberto.</div>':"");
}
function render(){drawList();drawHistory();drawHome()}
function reset(){
 $("paymentForm").reset();$("paymentEditId").value="";$("paymentDueDay").value="10";
 $("paymentStartMonth").value=monthNow();
 $("paymentFormTitle").textContent="Nova despesa mensal";
 $("paymentSave").textContent="Salvar despesa";
 $("paymentCancel").classList.add("hide");
}
function edit(b){
 $("paymentEditId").value=b.id;$("paymentTitle").value=b.title;
 $("paymentAmount").value=(b.amountCents/100).toFixed(2).replace(".",",");
 $("paymentDueDay").value=String(b.dueDay);$("paymentCategory").value=b.category;
 $("paymentStartMonth").value=b.startMonth||monthNow();$("paymentNote").value=b.note||"";
 $("paymentFormTitle").textContent="Editar despesa";
 $("paymentSave").textContent="Salvar alterações";
 $("paymentCancel").classList.remove("hide");
 if(window.DGXgoto)window.DGXgoto("payments");
 $("paymentTitle").focus();
}
function adjustMonth(b){
 const old=monthAmount(b,view);
 const answer=window.prompt("Valor de "+b.title+" em "+view.slice(5)+"/"+view.slice(0,4)+" (R$). Use vírgula para os centavos:",(old/100).toFixed(2).replace(".",","));
 if(answer===null)return;
 const amount=parseMoney(answer);
 if(amount===null)return notice("Valor inválido. Exemplo: 123,45");
 if(paidFor(b,view)&&!confirm("Esta mensalidade já foi marcada como paga. Atualizar também o valor pago?"))return;
 const updated={...b,monthly:{...(b.monthly||{}),[view]:amount}};
 if(paidFor(b,view))updated.paid={...b.paid,[view]:{...b.paid[view],amountCents:amount}};
 save(bills().map(item=>item.id===b.id?updated:item));
 notice("Valor desta mensalidade ajustado.");
}
$("paymentForm").addEventListener("submit",e=>{
 e.preventDefault();
 const title=$("paymentTitle").value.trim(),amountCents=parseMoney($("paymentAmount").value);
 const dueDay=Number($("paymentDueDay").value),startMonth=$("paymentStartMonth").value;
 if(!title||amountCents===null||!Number.isInteger(dueDay)||dueDay<1||dueDay>31||! /^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)){
  notice("Confira o nome, o valor, o dia do vencimento e o mês inicial.");return;
 }
 const editId=$("paymentEditId").value,existing=bills().find(x=>x.id===editId);
 const value={id:editId||id(),title:title.slice(0,120),amountCents,dueDay,
  category:$("paymentCategory").value,note:$("paymentNote").value.trim().slice(0,1000),startMonth,
  monthly:existing?.monthly||{},paid:existing?.paid||{},created:existing?.created||new Date().toISOString()};
 const all=editId?bills().map(x=>x.id===editId?value:x):bills().concat(value);
 save(all);reset();notice("Conta mensal enviada para o banco.");
});
$("paymentCancel").onclick=reset;
$("payPrev").onclick=()=>{view=monthMove(view,-1);render()};
$("payNext").onclick=()=>{view=monthMove(view,1);render()};
$("paymentList").addEventListener("change",e=>{
 const btn=e.target.closest("[data-check]");if(!btn)return;
 const key=btn.dataset.check,amount=bills().find(b=>b.id===key);
 if(!amount)return;
 if(!btn.checked&&!confirm("Desmarcar o pagamento de "+amount.title+" neste mês?")){btn.checked=true;return}
 const dayInput=$("paymentList").querySelector('[data-paid-date="'+key+'"]');
 const paidOn=dayInput?.value||today();
 if(btn.checked&&(!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)||paidOn>today())){btn.checked=false;return notice("Escolha uma data de pagamento válida.")}
 const updated=bills().map(b=>{
  if(b.id!==key)return b;
  const paid={...(b.paid||{})};
  if(btn.checked)paid[view]={date:paidOn,amountCents:monthAmount(b,view),markedAt:new Date().toISOString()};
  else delete paid[view];
  return {...b,paid};
 });
 save(updated);notice(btn.checked?"Pagamento registrado para "+view.slice(5)+"/"+view.slice(0,4):"Pagamento desmarcado.");
});
$("paymentList").addEventListener("click",e=>{
 const editBtn=e.target.closest("[data-payment-edit]");
 if(editBtn){const b=bills().find(x=>x.id===editBtn.dataset.paymentEdit);if(b)edit(b);return}
 const removeBtn=e.target.closest("[data-payment-remove]");
 if(removeBtn){
  const key=removeBtn.dataset.paymentRemove,b=bills().find(x=>x.id===key);
  if(!b)return;
  if(confirm("Excluir definitivamente "+b.title+" e todos os meses pagos? Esta ação não pode ser desfeita.")){
   save(bills().filter(x=>x.id!==key));
   if($("paymentEditId").value===key)reset();
   notice("Conta excluída.");
  }
  return;
 }
 const valueBtn=e.target.closest("[data-month-value]");
 if(valueBtn){const b=bills().find(x=>x.id===valueBtn.dataset.monthValue);if(b)adjustMonth(b)}
});
function alertBills(){
 if(!window.DGXStore)return;
 const billList=activeItems(monthNow());
 const notified=window.DGXStore.read("dgx_notified_v1",{});
 const now=today();
 billList.forEach(b=>{
  if(paidFor(b,monthNow()))return;
  const due=dueDate(monthNow(),b.dueDay);
  // Apenas no dia ou nos 2 dias anteriores. O alerta do dia é exibido uma vez.
  const days=Math.round((Date.parse(due+"T12:00:00Z")-Date.parse(now+"T12:00:00Z"))/86400000);
  if(days<0||days>2)return;
  const key="bill-"+b.id+"-"+monthNow()+"-"+now;
  if(notified[key])return;
  const message=b.title+" vence "+(days===0?"hoje":days===1?"amanhã":"em 2 dias")+". Valor: "+moneyCents(monthAmount(b,monthNow()));
  notified[key]=Date.now();
  window.DGXStore.write("dgx_notified_v1",notified);
  if("Notification" in window&&Notification.permission==="granted"){
   try{new Notification("Pagamento próximo — DGX Meu Dia",{body:message,tag:key})}catch(e){}
  }
  notice(message);
 });
}
window.DGXpaymentsRefresh=function(){render();alertBills()};
reset();
render();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)alertBills()});
})();