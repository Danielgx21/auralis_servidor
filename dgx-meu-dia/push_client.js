/* DGX Meu Dia v0.4: opt-in a Web Push, preferências na nuvem, teste por dispositivo. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const defaults={payments:true,tasks:true,reminders:true,plants:true,corinthians:true,mood:false};
const labels={payments:"Contas mensais",tasks:"Tarefas pessoais e SME",reminders:"Lembretes",plants:"Adubação",corinthians:"Jogos do Corinthians",mood:"Registrar humor"};
const notify=msg=>window.DGXtoast&&window.DGXtoast(msg);
const api=async (path,opts={})=>{
 const res=await fetch(path,{credentials:"same-origin",cache:"no-store",...opts});
 const d=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(d.error||("Falha HTTP "+res.status));
 return d;
};
const post=(path,body)=>api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
function convertKey(input){
 const padding="=".repeat((4-input.length%4)%4);
 const s=atob((input+padding).replace(/-/g,"+").replace(/_/g,"/"));
 return Uint8Array.from(s,c=>c.charCodeAt(0));
}
let cachedConfig=null,subscription=null,loaded=false;
function prefs(){
 const stored=window.DGXStore?.read("dgx_push_prefs_v1",{})||{};
 return {...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>typeof stored[k]==="boolean").map(k=>[k,stored[k]]))};
}
function renderPrefs(){
 const p=prefs();
 $("pushPreferences").innerHTML=Object.keys(labels).map(key=>
  '<label style="display:flex;gap:12px;align-items:center;margin:11px 0;padding:6px 0;cursor:pointer">'+
  '<input type="checkbox" data-push-pref="'+key+'" '+(p[key]?"checked":"")+' style="width:19px;height:19px;accent-color:#63ddbe">'+
  '<span style="font-size:13px">'+labels[key]+'</span></label>').join("");
 $("pushPreferences").querySelectorAll("[data-push-pref]").forEach(input=>input.onchange=()=>{
  const updated={...prefs(),[input.dataset.pushPref]:input.checked};
  if(window.DGXStore)window.DGXStore.write("dgx_push_prefs_v1",updated);
  notify("Preferência enviada para salvar.");
 });
}
function supported(){
 return "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window&&location.protocol==="https:";
}
function display(message){
 $("pushStatus").textContent=message;
 $("pushEnable").disabled=!supported()||!cachedConfig?.public_key;
 $("pushTest").disabled=!subscription;
 $("pushDisable").disabled=!subscription;
 $("pushTest").classList.toggle("hide",!subscription);
 $("pushDisable").classList.toggle("hide",!subscription);
}
async function refresh(){
 renderPrefs();
 if(!supported()){
  display("Este navegador não oferece Web Push. No Android, tente abrir o site no Chrome e instalá-lo na tela inicial.");
  return;
 }
 try{
  cachedConfig=await api("/api/push/config");
  const reg=await navigator.serviceWorker.ready;
  subscription=await reg.pushManager.getSubscription();
  const scheduler=cachedConfig.scheduler?"Agendador automático ativo.":"Agendador ainda não confirmado.";
  display(subscription&&Notification.permission==="granted"?
   "Notificações de fundo ativadas neste dispositivo. "+scheduler:
   Notification.permission==="denied"?"Permissão bloqueada no Android. Libere nas configurações do aplicativo/navegador.":
   "Ative para receber avisos mesmo quando o DGX não está aberto. "+scheduler);
  loaded=true;
 }catch(err){
  display("Não foi possível consultar a configuração push: "+err.message);
 }
}
$("pushEnable").onclick=async()=>{
 if(!supported())return notify("Web Push não suportado neste navegador.");
 $("pushEnable").disabled=true;
 try{
  const p=await Notification.requestPermission();
  if(p!=="granted")throw Error("Permita notificações no Android para continuar.");
  if(!cachedConfig?.public_key)cachedConfig=await api("/api/push/config");
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:convertKey(cachedConfig.public_key)
  });
  await post("/api/push/subscribe",sub.toJSON());
  subscription=sub;
  display("Este aparelho está inscrito. Os avisos serão enviados pelo agendador.");
  notify("Web Push ativado. Toque em 'Testar' para conferir.");
 }catch(err){
  notify("Não foi possível ativar: "+err.message);
 }finally{await refresh();}
};
$("pushTest").onclick=async()=>{
 try{
  $("pushTest").disabled=true;
  const result=await post("/api/push/test",{});
  notify(result.sent?"Teste enviado. Confira as notificações do celular.":"O teste não chegou ao servidor de notificações.");
 }catch(err){notify("Falha no teste: "+err.message)}
 finally{$("pushTest").disabled=false}
};
$("pushDisable").onclick=async()=>{
 if(!subscription)return;
 try{
  await post("/api/push/unsubscribe",{endpoint:subscription.endpoint});
  await subscription.unsubscribe();
  subscription=null;
  notify("Notificações desativadas neste aparelho.");
  await refresh();
 }catch(err){notify("Não foi possível desativar: "+err.message)}
};
window.DGXpushInit=refresh;
window.addEventListener("focus",()=>{if(loaded)refresh()});
})();