/* DGX Meu Dia v0.2 — autenticação, banco, agenda, plantas e atualização PWA. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const tz="America/Sao_Paulo";
const day=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp=()=>new Date().toISOString();
const uuid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2);
const displayDate=(s)=>{if(!s)return"—";const p=s.slice(0,10).split("-");return p[2]+"/"+p[1]+"/"+p[0]};
const notify=s=>window.DGXtoast&&window.DGXtoast(s);
const allowed=["dgx_moods_v1","dgx_challenges_v1","dgx_reminders_v1","dgx_notified_v1","dgx_plants_v1","dgx_tasks_v1","dgx_payments_v1","dgx_push_prefs_v1","dgx_podcasts_v1"];
let state={},authenticated=false,writeSerial={},unsaved=0,bootstrapped=false;
function dataRead(key,fallback){return Object.prototype.hasOwnProperty.call(state,key)?state[key]:fallback}
function updateStatus(status){$("appVersion").textContent="v0.5 · "+status}
async function api(url,opts){
 const res=await fetch(url,{credentials:"same-origin",cache:"no-store",...opts});
 let data;try{data=await res.json()}catch(e){data={error:"Resposta inválida do servidor"}}
 if(!res.ok)throw Error(data.error||"Erro "+res.status);
 return data;
}
const post=(url,data)=>api(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
function write(key,value){
 if(!authenticated){notify("Entre em sua conta para salvar.");return}
 if(!allowed.includes(key)){console.warn("Chave não cadastrada",key);return}
 state[key]=JSON.parse(JSON.stringify(value));
 const snapshot=state[key];
 unsaved++;
 updateStatus("salvando");
 const prior=writeSerial[key]||Promise.resolve();
 const next=prior.catch(()=>{}).then(()=>post("/api/data",{key:key,value:snapshot}));
 writeSerial[key]=next;
 next.then(()=>{
  unsaved=Math.max(0,unsaved-1);
  if(!unsaved)updateStatus("nuvem ✓");
 }).catch(err=>{
  unsaved=Math.max(0,unsaved-1);updateStatus("erro ao salvar");
  notify("Falha ao salvar no banco: "+err.message+". Não feche sem tentar novamente.");
  console.error("Erro ao salvar",key,err);
 });
}
window.DGXStore={read:dataRead,write};
function showAuth(title,message,setup){
 document.body.classList.add("locked");
 $("authGate").classList.remove("hide");
 $("authTitle").textContent=title;$("authMessage").textContent=message;
 $("authForm").classList.remove("hide");$("authRetry").classList.add("hide");
 $("setupCodeField").classList.toggle("hide",!setup);
 $("authPassword").value="";
 $("authPasswordLabel").textContent=setup?"Crie uma senha (mínimo 10 caracteres)":"Sua senha";
 $("authPassword").autocomplete=setup?"new-password":"current-password";
 $("authSubmit").textContent=setup?"Criar meu perfil":"Entrar";
 $("authError").textContent="";
 $("authForm").dataset.mode=setup?"setup":"login";
}
async function setLoggedIn(){
 const response=await api("/api/data");
 state=response.data||{};
 authenticated=true;bootstrapped=true;
 $("authGate").classList.add("hide");document.body.classList.remove("locked");
 $("logoutBtn").classList.remove("hide");
 updateStatus("nuvem ✓");
 const hash=location.hash.slice(1);if(hash&&window.DGXgoto&&document.getElementById("page-"+hash))window.DGXgoto(hash);
 if(window.DGXrefresh)window.DGXrefresh();
 drawTasks();drawPlants();if(window.DGXpaymentsRefresh)window.DGXpaymentsRefresh();if(window.DGXpushInit)window.DGXpushInit();if(window.DGXpodcastsInit)window.DGXpodcastsInit();
 // Importação opcional para não perder registros da primeira versão local.
 const toImport=allowed.filter(k=>!Object.prototype.hasOwnProperty.call(state,k)&&localStorage.getItem(k));
 if(toImport.length&&confirm("Encontrei registros feitos em uma versão anterior neste aparelho. Quer importá-los para seu banco de dados?")){
  toImport.forEach(key=>{
   try{write(key,JSON.parse(localStorage.getItem(key)))}catch(e){}
  });
  if(window.DGXrefresh)window.DGXrefresh();drawTasks();drawPlants();if(window.DGXpaymentsRefresh)window.DGXpaymentsRefresh();
 }
}
async function bootstrap(){
 $("authRetry").classList.add("hide");
 try{
  const b=await api("/api/bootstrap");
  const me=await api("/api/me");
  if(me.logged_in){await setLoggedIn();return}
  showAuth(b.configured?"Bem-vindo de volta":"Vamos criar seu acesso",
    b.configured?"Digite sua senha para acessar seus dados em qualquer aparelho.":"Primeiro acesso: informe seu código de ativação e escolha uma senha forte.",!b.configured);
  bootstrapped=true;
 }catch(err){
  $("authTitle").textContent="Sem conexão com seus dados";
  $("authMessage").textContent="Não foi possível acessar o banco. Verifique a conexão e tente novamente.";
  $("authForm").classList.add("hide");
  $("authRetry").classList.remove("hide");
 }
}
$("authRetry").onclick=bootstrap;
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();
 $("authError").textContent="";$("authSubmit").disabled=true;
 const setup=$("authForm").dataset.mode==="setup";
 try{
  await post(setup?"/api/auth/setup":"/api/auth/login",{
   password:$("authPassword").value,
   ...(setup?{setup_code:$("setupCode").value.trim()}:{})
  });
  await setLoggedIn();
 }catch(err){$("authError").textContent=err.message;$("authSubmit").disabled=false}
 finally{$("authSubmit").disabled=false}
});
$("logoutBtn").onclick=async ()=>{
 if(!confirm("Sair da sua conta neste aparelho?"))return;
 try{await post("/api/auth/logout",{})}catch(e){}
 authenticated=false;state={};writeSerial={};unsaved=0;
 $("logoutBtn").classList.add("hide");bootstrap();
};

// Calendário com dois tipos e cores explícitas nos dias.
let viewDate=day(),activeDate=day();
let viewYear=Number(viewDate.slice(0,4)),viewMonth=Number(viewDate.slice(5,7))-1;
function tasks(){return dataRead("dgx_tasks_v1",[])}
function setTasks(v){write("dgx_tasks_v1",v);drawTasks()}
function dateLabel(ymd){const date=new Date(ymd+"T12:00:00");return new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long"}).format(date)}
function sortedTasks(list){return list.slice().sort((a,b)=>(a.date+" "+(a.time||"23:59")).localeCompare(b.date+" "+(b.time||"23:59")))}
function taskBadge(task){return '<span class="task-type '+(task.type==="sme"?"sme":"personal")+'">'+(task.type==="sme"?"SME":"Pessoal")+"</span>"}
function taskHTML(task,modifiable=true){
 return '<div class="task-item'+(task.done?" done":"")+'">'+
   '<input type="checkbox" '+(task.done?"checked":"")+' data-task-check="'+esc(task.id)+'" aria-label="Concluir tarefa">'+
   '<div style="flex:1;min-width:0"><div class="task-main">'+esc(task.title)+'</div>'+
   '<div class="small" style="margin-top:4px">'+(task.time?esc(task.time)+" · ":"")+esc(displayDate(task.date))+'</div>'+
   (task.note?'<div class="small" style="margin-top:5px">'+esc(task.note)+'</div>':"")+
   taskBadge(task)+'</div>'+
   (modifiable?'<button class="roundbtn" data-task-edit="'+esc(task.id)+'" aria-label="Editar tarefa">✎</button><button class="roundbtn" data-task-remove="'+esc(task.id)+'" aria-label="Excluir tarefa">✕</button>':"")+'</div>';
}
function bindTaskButtons(target){
 target.querySelectorAll("[data-task-check]").forEach(b=>b.onchange=()=>setTasks(tasks().map(t=>t.id===b.dataset.taskCheck?{...t,done:b.checked}:t)));
 target.querySelectorAll("[data-task-remove]").forEach(b=>b.onclick=()=>{
  if(confirm("Excluir esta tarefa?"))setTasks(tasks().filter(t=>t.id!==b.dataset.taskRemove));
 });
 target.querySelectorAll("[data-task-edit]").forEach(b=>b.onclick=()=>{
  const task=tasks().find(t=>t.id===b.dataset.taskEdit);if(!task)return;
  $("taskEditId").value=task.id;$("taskTitle").value=task.title;$("taskType").value=task.type;
  $("taskDate").value=task.date;$("taskTime").value=task.time||"";$("taskNote").value=task.note||"";
  $("taskFormTitle").textContent="Editar tarefa";$("taskCancel").classList.remove("hide");$("taskSave").textContent="Salvar alterações";
  window.DGXgoto("calendar");
 });
}
function renderTaskCalendar(){
 const first=new Date(viewYear,viewMonth,1);
 $("calMonth").textContent=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(first);
 const count=new Date(viewYear,viewMonth+1,0).getDate(),start=first.getDay();
 const grouped={};tasks().forEach(task=>(grouped[task.date]||(grouped[task.date]=[])).push(task));
 let html="";
 ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].forEach(x=>html+='<div class="weekhead">'+x+"</div>");
 for(let pad=0;pad<start;pad++)html+='<div></div>';
 for(let number=1;number<=count;number++){
  const date=viewYear+"-"+String(viewMonth+1).padStart(2,"0")+"-"+String(number).padStart(2,"0");
  const matches=grouped[date]||[],a=matches.some(t=>t.type==="pessoal"),b=matches.some(t=>t.type==="sme");
  let color=a&&b?"both":a?"has-personal":b?"has-sme":"";
  html+='<button class="cal-day '+color+(date===activeDate?" selected":"")+'" data-cal-day="'+date+'" aria-label="'+esc(displayDate(date))+'">'+
   '<span>'+(number===Number(day().slice(8))&&date===day()?"<b>"+number+"</b>":number)+'</span>'+
   '<span class="dots">'+(a?'<span class="badge-personal">●</span>':"")+(b?'<span class="badge-sme">●</span>':"")+'</span></button>';
 }
 $("calGrid").innerHTML=html;
 $("calGrid").querySelectorAll("[data-cal-day]").forEach(b=>b.onclick=()=>{
  activeDate=b.dataset.calDay;$("taskDate").value=activeDate;drawTasks();
 });
}
function drawTasks(){
 const taskList=tasks();
 renderTaskCalendar();
 $("calendarSelected").textContent="Selecionado: "+dateLabel(activeDate);
 const selected=sortedTasks(taskList.filter(t=>t.date===activeDate));
 $("selectedTaskCount").textContent=selected.length+" tarefas";
 $("selectedTaskList").innerHTML=selected.length?selected.map(t=>taskHTML(t)).join(""):'<div class="empty">Nenhuma tarefa neste dia.</div>';
 bindTaskButtons($("selectedTaskList"));
 const upcoming=sortedTasks(taskList.filter(t=>t.date>=day()&&!t.done)).slice(0,7);
 $("upcomingTasks").innerHTML=upcoming.length?upcoming.map(t=>taskHTML(t,false)).join(""):'<div class="empty">Você está em dia com sua agenda.</div>';
 bindTaskButtons($("upcomingTasks"));
 const home=sortedTasks(taskList.filter(t=>t.date===day()));
 $("homeTasks").innerHTML=home.length?home.slice(0,5).map(t=>
  '<div class="event"><div class="hori"><div>'+taskBadge(t)+' <strong style="'+(t.done?"text-decoration:line-through":"")+'">'+esc(t.title)+'</strong></div>'+(t.done?"✓":"")+'</div></div>').join(""):'Nenhuma tarefa para hoje.';
}
function resetTaskForm(){
 $("taskForm").reset();$("taskEditId").value="";$("taskDate").value=activeDate;
 $("taskFormTitle").textContent="Adicionar tarefa";$("taskCancel").classList.add("hide");$("taskSave").textContent="Salvar tarefa";
}
$("taskForm").addEventListener("submit",e=>{
 e.preventDefault();
 const title=$("taskTitle").value.trim(),date=$("taskDate").value,editId=$("taskEditId").value;
 if(!title||!date)return notify("Informe atividade e dia.");
 const old=tasks(),existing=old.find(t=>t.id===editId);
 const item={id:editId||uuid(),title:title.slice(0,140),type:$("taskType").value==="sme"?"sme":"pessoal",
  date:date,time:$("taskTime").value,note:$("taskNote").value.trim().slice(0,1000),
  done:existing?!!existing.done:false,created:existing?existing.created:stamp()};
 setTasks(editId?old.map(t=>t.id===editId?item:t):old.concat(item));
 activeDate=date;viewYear=Number(date.slice(0,4));viewMonth=Number(date.slice(5,7))-1;
 resetTaskForm();drawTasks();notify("Tarefa enviada para salvar na nuvem.");
});
$("taskCancel").onclick=resetTaskForm;
$("calPrev").onclick=()=>{viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--}renderTaskCalendar()};
$("calNext").onclick=()=>{viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++}renderTaskCalendar()};
$("taskDate").value=activeDate;

// Plantas e adubações
function plants(){return dataRead("dgx_plants_v1",[])}
function setPlants(v){write("dgx_plants_v1",v);drawPlants()}
function addDays(date,n){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function lastFertilized(plant){return (plant.history||[]).map(h=>h.date).sort().at(-1)||""}
function plantStatus(plant){
 const last=lastFertilized(plant);
 if(!last)return{label:"Nenhuma adubação registrada",color:""};
 const due=addDays(last,Number(plant.interval)||30);
 return{label:(due<day()?"Acompanhamento atrasado · ":due===day()?"Acompanhamento previsto hoje · ":"Próxima referência · ")+displayDate(due),
 color:due<=day()?"#f7bb86":"#8ce0c7"};
}
function drawPlants(){
 const list=plants().slice().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 $("plantsCount").textContent=list.length+" plantas";
 if(!list.length){
  $("plantCards").innerHTML='<div class="empty">Nenhuma planta cadastrada ainda. Comece com sua primeira planta.</div>';
  $("homePlants").textContent="Cadastre uma planta para começar.";
  return;
 }
 $("plantCards").innerHTML=list.map(plant=>{
  const h=(plant.history||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)),status=plantStatus(plant);
  return '<div class="plantcard"><div class="hori"><div class="plantname">🌿 '+esc(plant.name)+'</div>'+
   '<button class="roundbtn" data-plant-remove="'+esc(plant.id)+'" aria-label="Excluir planta">✕</button></div>'+
   '<div class="small" style="margin-top:7px">'+(plant.place?esc(plant.place)+" · ":"")+esc(plant.fertilizer||"Adubo não especificado")+'</div>'+
   '<div class="small" style="margin-top:11px">Última adubação: <b>'+esc(displayDate(lastFertilized(plant)))+'</b></div>'+
   '<div class="small" style="color:'+status.color+';margin:8px 0 14px">'+esc(status.label)+'</div>'+
   '<div class="field"><label>Data da adubação</label><input type="date" data-plant-date="'+esc(plant.id)+'" value="'+day()+'"></div>'+
   '<button class="btn main full" style="margin-top:10px" data-plant-fert="'+esc(plant.id)+'">Registrar adubação</button>'+
   '<div class="small" style="margin-top:12px">Intervalo escolhido: '+plant.interval+' dias · '+h.length+' registros</div>'+
   (h.length?'<div class="small" style="margin-top:6px">Histórico recente: '+h.slice(0,5).map(x=>esc(displayDate(x.date))).join(" · ")+'</div>':"")+
   '</div>';
 }).join("");
 $("plantCards").querySelectorAll("[data-plant-remove]").forEach(b=>b.onclick=()=>{
  const p=plants().find(x=>x.id===b.dataset.plantRemove);
  if(confirm("Excluir "+(p?p.name:"esta planta")+" e seu histórico?"))setPlants(plants().filter(p=>p.id!==b.dataset.plantRemove));
 });
 $("plantCards").querySelectorAll("[data-plant-fert]").forEach(b=>b.onclick=()=>{
  const id=b.dataset.plantFert,chosen=$("plantCards").querySelector('[data-plant-date="'+id+'"]').value;
  if(!chosen)return notify("Escolha a data da adubação.");
  if(chosen>day())return notify("A data não pode ser futura.");
  const newList=plants().map(p=>{
   if(p.id!==id)return p;
   const old=p.history||[];
   if(old.some(h=>h.date===chosen)&&!confirm("Já existe um registro neste dia. Adicionar outro?"))return p;
   return {...p,history:old.concat({id:uuid(),date:chosen,created:stamp()})};
  });
  setPlants(newList);notify("Adubação registrada e enviada ao banco.");
 });
 const withDates=list.map(p=>({plant:p,last:lastFertilized(p)})).sort((a,b)=>a.last.localeCompare(b.last));
 $("homePlants").innerHTML=withDates.slice(0,3).map(x=>'<div class="event"><div class="hori"><strong>'+esc(x.plant.name)+'</strong><span class="small">'+esc(displayDate(x.last))+'</span></div><div class="small">'+esc(plantStatus(x.plant).label)+'</div></div>').join("");
}
$("plantForm").addEventListener("submit",e=>{
 e.preventDefault();
 const name=$("plantName").value.trim(),n=Number($("plantInterval").value);
 if(!name||!Number.isInteger(n)||n<1||n>730)return notify("Verifique o nome e o intervalo.");
 setPlants(plants().concat({id:uuid(),name:name.slice(0,100),place:$("plantPlace").value.trim().slice(0,100),
 fertilizer:$("plantFertilizer").value.trim().slice(0,120),interval:n,history:[],created:stamp()}));
 $("plantForm").reset();$("plantInterval").value="30";notify("Planta cadastrada.");
});

// Atualização automática da PWA: detecta nova versão e propõe atualização sem APK.
if("serviceWorker" in navigator){
 let hadController=!!navigator.serviceWorker.controller;
 let reg=null;
 navigator.serviceWorker.addEventListener("controllerchange",()=>{
  if(hadController)window.location.reload();else hadController=true;
 });
 const offer=worker=>{
  if(!worker)return;
  $("updatePrompt").classList.remove("hide");
  $("updateNow").onclick=()=>worker.postMessage({type:"SKIP_WAITING"});
 };
 window.addEventListener("load",async()=>{
  try{
   reg=await navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"});
   if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
   reg.addEventListener("updatefound",()=>{
    const w=reg.installing;if(!w)return;
    w.addEventListener("statechange",()=>{
     if(w.state==="installed"&&navigator.serviceWorker.controller)offer(w);
    });
   });
   setInterval(()=>reg&&reg.update().catch(()=>{}),60*60*1000);
  }catch(err){console.warn("Sem instalação de PWA",err)}
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&reg)reg.update().catch(()=>{})});
}
window.addEventListener("hashchange",()=>{const page=location.hash.slice(1);if(page&&document.getElementById("page-"+page)&&window.DGXgoto)window.DGXgoto(page)});
bootstrap();
})();
