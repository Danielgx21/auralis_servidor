/* DGX Meu Dia 0.6 — briefing falado para o deslocamento, sem escuta contínua. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="dgx_briefing_prefs_v1", TZ="America/Sao_Paulo";
const names={knowledge:"Conhecimento do dia",weather:"Previsão do tempo",tasks:"Agenda SME e pessoal",payments:"Pagamentos próximos",games:"Corinthians",reminders:"Lembretes",mood:"Lembrete de humor"};
const defaults={knowledge:true,weather:true,tasks:true,payments:true,games:true,reminders:true,mood:false};
const day=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const hour=()=>Number(new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",hour12:false}).format(new Date()));
const read=(key,fallback)=>window.DGXStore?.read(key,fallback)??fallback;
const notify=msg=>window.DGXtoast?.(msg);
const prefs=()=>{
 const p={...defaults,...read(KEY,{})};
 delete p.podcasts; // podcasts permanecem na aba Podcasts, mas saem da narração do resumo
 return p;
};
const currency=cents=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(cents||0)/100);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateAt=(date,relative=false)=>new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
function prettyTime(v){return /^\d{2}:\d{2}$/.test(v||"")?" às "+v.replace(":"," horas e ")+" minutos":"";}
function dayDiff(date){const start=Date.UTC(...day().split("-").map((x,i)=>i===1?Number(x)-1:Number(x)));const end=Date.UTC(...date.split("-").map((x,i)=>i===1?Number(x)-1:Number(x)));return Math.round((end-start)/86400000);}
function safeSentence(s){return String(s??"").replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,200)}
function greeting(){
 const h=hour();
 return (h<12?"Bom dia":h<18?"Boa tarde":"Boa noite")+". Aqui está seu resumo do DGX Meu Dia.";
}
function buildWeather(){
 const data=window.DGXsummaryData?.();
 const current=data?.weather?.current;
 if(!current){return "A previsão do tempo ainda não carregou. Confira no painel ao abrir o aplicativo.";}
 const max=data.weather.daily?.temperature_2m_max?.[0],min=data.weather.daily?.temperature_2m_min?.[0],rain=data.weather.daily?.precipitation_probability_max?.[0];
 const city=$("weatherCity")?.textContent||"sua região";
 let text="Tempo em "+city+": "+Math.round(current.temperature_2m)+" graus agora. "+safeSentence($("weatherDesc")?.textContent)+".";
 if(Number.isFinite(max)&&Number.isFinite(min))text+=" Máxima de "+Math.round(max)+" e mínima de "+Math.round(min)+" graus.";
 if(Number.isFinite(rain))text+=" Chance máxima de precipitação prevista para hoje: "+Math.round(rain)+" por cento.";
 return text;
}
function buildTasks(){
 const list=read("dgx_tasks_v1",[]),today=day();
 const next=list.filter(t=>t&&!t.done&&t.date>=today&&t.date<=offsetDay(today,1)).sort((a,b)=>(a.date+" "+(a.time||"99:99")).localeCompare(b.date+" "+(b.time||"99:99")));
 if(!next.length)return "Você não tem tarefas pendentes cadastradas para hoje nem amanhã.";
 const todayItems=next.filter(t=>t.date===today).slice(0,4),tomorrowItems=next.filter(t=>t.date!==today).slice(0,3);
 const parts=[];
 if(todayItems.length)parts.push("Hoje: "+todayItems.map(t=>safeSentence(t.title)+(t.type==="sme"?", da SME":"") +prettyTime(t.time)).join("; ")+".");
 if(tomorrowItems.length)parts.push("Amanhã: "+tomorrowItems.map(t=>safeSentence(t.title)+(t.type==="sme"?", da SME":"") +prettyTime(t.time)).join("; ")+".");
 if(next.length>7)parts.push("Há outras tarefas na agenda.");
 return "Sua agenda. "+parts.join(" ");
}
function offsetDay(str,n){const d=new Date(str+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function paymentDue(month,dueDay){const [y,m]=month.split("-").map(Number);const last=new Date(Date.UTC(y,m,0)).getUTCDate();return month+"-"+String(Math.min(Math.max(1,Number(dueDay)||1),last)).padStart(2,"0")}
function paymentAmount(p,month){
 const paid=p.paid?.[month];
 const override=p.monthly?.[month];
 return Number.isInteger(override)?override:Number.isInteger(paid?.amountCents)?paid.amountCents:p.amountCents||0;
}
function buildPayments(){
 const all=read("dgx_payments_v1",[]),today=day(),month=today.slice(0,7);
 const open=all.filter(p=>p&&(!p.startMonth||p.startMonth<=month)&&(!p.endMonth||p.endMonth>month)&&!p.paid?.[month]);
 const next=open.map(p=>({...p,deadline:paymentDue(month,p.dueDay)})).filter(p=>dayDiff(p.deadline)<=7).sort((a,b)=>a.deadline.localeCompare(b.deadline));
 if(!next.length)return open.length?"Você tem "+open.length+" contas em aberto, mas nenhuma com vencimento nos próximos sete dias.":"Não há contas pendentes cadastradas neste mês.";
 const amount=next.reduce((n,p)=>n+paymentAmount(p,month),0);
 const details=next.slice(0,4).map(p=>{
  const diff=dayDiff(p.deadline),label=diff<0?"vencida":diff===0?"vence hoje":diff===1?"vence amanhã":"vence em "+diff+" dias";
  return safeSentence(p.title)+", "+label+", valor "+currency(paymentAmount(p,month));
 });
 return "Pagamentos: "+next.length+" contas próximas ou vencidas, somando "+currency(amount)+". "+details.join("; ")+".";
}
function buildGames(){
 const games=(window.DGXsummaryData?.()?.fixtures||[]).filter(g=>new Date(g.date)>new Date()).sort((a,b)=>a.date.localeCompare(b.date));
 if(!games.length)return "Não consegui confirmar um próximo jogo do Corinthians agora.";
 const g=games[0],when=new Date(g.date);
 const str=when.toLocaleString("pt-BR",{timeZone:TZ,weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"});
 return "Corinthians: próximo jogo identificado, "+safeSentence(g.home)+" contra "+safeSentence(g.away)+", "+str+". Os horários podem mudar.";
}
function buildKnowledge(){
 const fact=window.DGXdailyFact?.();
 return fact?"Conhecimento do dia, "+fact.category+". "+fact.title+". "+fact.text:
   "O conhecimento do dia ainda não carregou.";
}
function buildReminders(){
 const reminders=read("dgx_reminders_v1",[]).filter(r=>r&&r.at&&!Number.isNaN(Date.parse(r.at))&&new Date(r.at)>=new Date()&&new Date(r.at)<=new Date(Date.now()+2*86400000)).sort((a,b)=>a.at.localeCompare(b.at));
 if(!reminders.length)return "Nenhum lembrete nos próximos dois dias.";
 return "Lembretes: "+reminders.slice(0,3).map(r=>safeSentence(r.title)+", "+new Date(r.at).toLocaleString("pt-BR",{timeZone:TZ,weekday:"long",hour:"2-digit",minute:"2-digit"})).join("; ")+".";
}
function buildMood(){
 const period=hour()<16?"manha":"noite",done=read("dgx_moods_v1",[]).some(x=>x.day===day()&&x.period===period);
 return done?"Seu humor já foi registrado neste período.":"Você ainda não registrou seu humor "+(period==="manha"?"da manhã.":"da noite.");
}
const funcs={knowledge:buildKnowledge,weather:buildWeather,tasks:buildTasks,payments:buildPayments,games:buildGames,reminders:buildReminders,mood:buildMood};
function sections(){
 const p=prefs();const parts=[greeting()];
 Object.keys(names).forEach(key=>{if(p[key])try{parts.push(funcs[key]())}catch(err){console.warn("Resumo "+key,err)}});
 parts.push("Fim do resumo. Boa viagem.");
 return parts;
}
let chunks=[],index=0,playing=false;
const synth=window.speechSynthesis;
function availableVoices(){
 if(!synth||typeof synth.getVoices!=="function")return [];
 const voices=synth.getVoices();
 const pt=voices.filter(v=>/^pt(?:-|_)/i.test(v.lang));
 return pt.sort((a,b)=>{
  const score=v=>(/^pt[-_]BR$/i.test(v.lang)?12:0)+(/natural|neural|google|microsoft/i.test(v.name)?4:0)+(v.localService?1:0);
  return score(b)-score(a);
 });
}
function chosenVoice(){
 const voices=availableVoices();
 const preferred=prefs().voiceURI;
 if(preferred){
  const exact=voices.find(v=>v.voiceURI===preferred);if(exact)return exact;
 }
 // Deixar de usar a primeira voz-padrão antiga quando outra voz pt-BR estiver disponível.
 return voices.find(v=>!v.default) || voices[0] || null;
}
function currentRate(){
 const rate=Number(prefs().voiceRate);
 return Number.isFinite(rate)&&rate>=.8&&rate<=1.2?rate:1;
}
function applyVoice(utterance){
 const chosen=chosenVoice();
 utterance.lang=chosen?.lang||"pt-BR";
 if(chosen)utterance.voice=chosen;
 utterance.rate=currentRate();
 utterance.pitch=1.04;
}
function speakResponse(text){
 if(!synth||typeof SpeechSynthesisUtterance==="undefined")return false;
 if(playing)stop();
 else synth.cancel();
 const u=new SpeechSynthesisUtterance(String(text||""));
 applyVoice(u);
 synth.speak(u);
 return true;
}
function updateVoiceList(){
 const select=$("dgxVoiceSelect"),label=$("dgxVoiceInfo");
 if(!select)return;
 const voices=availableVoices(),preferred=prefs().voiceURI||"";
 const option=document.createElement("option");
 option.value="";option.textContent="Voz brasileira alternativa (automática)";
 select.replaceChildren(option);
 for(const voice of voices){
  const opt=document.createElement("option");
  opt.value=voice.voiceURI;
  opt.textContent=voice.name+" · "+voice.lang+(voice.default?" (padrão)":"");
  select.appendChild(opt);
 }
 select.value=preferred&&voices.some(v=>v.voiceURI===preferred)?preferred:"";
 $("dgxVoiceSpeed").value=String(currentRate());
 if(label)label.textContent=voices.length>1?
  "Escolha uma das "+voices.length+" vozes de português disponíveis no seu aparelho.":
  voices.length===1?"O Android forneceu uma voz em português. A velocidade e o tom foram ajustados; outras opções dependem do aparelho.":
  "O Android ainda não informou vozes em português. Tentaremos usar a voz padrão do dispositivo.";
}
window.DGXsay=speakResponse;

function renderState(text){
 if($("briefingStatus"))$("briefingStatus").textContent=text;
 if($("carStatus")&&!$("carScreen").classList.contains("hide"))$("carStatus").textContent=text;
 if($("briefingStop"))$("briefingStop").disabled=!playing;
 if($("carBriefingStop"))$("carBriefingStop").disabled=!playing;
}
function stop(){
 playing=false;chunks=[];index=0;
 if("speechSynthesis" in window)speechSynthesis.cancel();
 renderState("Leitura interrompida.");
}
function playNext(){
 if(!playing)return;
 if(index>=chunks.length){playing=false;renderState("Resumo concluído.");return}
 const line=chunks[index++];
 renderState("Lendo "+(index-1)+"/"+(chunks.length-2)+": "+line.slice(0,125));
 const u=new SpeechSynthesisUtterance(line);
 applyVoice(u);
 u.onend=()=>{if(playing)playNext()};
 u.onerror=()=>{if(playing)playNext()};
 speechSynthesis.speak(u);
}
function start(){
 if(!("speechSynthesis" in window)){notify("Seu navegador não disponibiliza voz sintetizada.");return}
 stop();
 // Iniciar imediatamente no mesmo gesto de toque é mais compatível com Android.
 chunks=sections();index=0;playing=true;speechSynthesis.cancel();
 playNext();
}
function renderPrefs(){
 const p=prefs();
 $("briefingPrefs").innerHTML=Object.entries(names).map(([key,label])=>
  '<label class="brief-choice"><input type="checkbox" data-brief-pref="'+key+'" '+(p[key]?"checked":"")+'><span>'+esc(label)+'</span></label>').join("");
 $("briefingPrefs").querySelectorAll("[data-brief-pref]").forEach(input=>input.onchange=()=>{
  const current=prefs();current[input.dataset.briefPref]=input.checked;
  window.DGXStore?.write(KEY,current);notify("Preferência do resumo salva.");
 });
}
window.DGXbriefingStart=start;
window.DGXbriefingStop=stop;
window.DGXbriefingRefresh=()=>{renderPrefs();updateVoiceList()};
$("briefingPlay").onclick=start;
$("briefingStop").onclick=stop;
$("readBriefing").onclick=start;
$("carBriefingStop").onclick=stop;
renderPrefs();
updateVoiceList();
if(synth){
 if(typeof synth.addEventListener==="function")synth.addEventListener("voiceschanged",updateVoiceList);
 else synth.onvoiceschanged=updateVoiceList;
}
$("dgxVoiceSelect").addEventListener("change",()=>{
 const selected=$("dgxVoiceSelect").value;
 window.DGXStore?.write(KEY,{...prefs(),voiceURI:selected});
 notify("Voz escolhida. Toque em Testar voz para ouvir.");
});
$("dgxVoiceSpeed").addEventListener("change",()=>{
 const rate=Number($("dgxVoiceSpeed").value);
 window.DGXStore?.write(KEY,{...prefs(),voiceRate:rate});
 notify("Velocidade de leitura salva.");
});
$("dgxVoiceTest").addEventListener("click",()=>{
 speakResponse("Olá! Eu sou a nova voz do DGX Meu Dia. Aqui estão as informações mais interessantes para o seu dia.");
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing)renderState("A leitura pode ser interrompida pelo Android com a tela bloqueada.")});
})();