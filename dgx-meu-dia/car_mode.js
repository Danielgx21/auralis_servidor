/* DGX Meu Dia v0.5 — modo carro com alvos de toque grandes.
  Os comandos de voz do navegador ainda exigem toque e tela ativa. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
function speak(txt){
 if(!("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(txt);u.lang="pt-BR";u.rate=.95;
 speechSynthesis.speak(u);
}
function open(){
 $("carScreen").classList.remove("hide");
 document.body.classList.add("car-active");
 $("carStatus").textContent="Modo Carro ativo. Toque no microfone quando estiver parado.";
}
function close(){
 $("carScreen").classList.add("hide");
 document.body.classList.remove("car-active");
}
$("enterCar").onclick=open;
$("carExit").onclick=close;
$("carHome").onclick=()=>{close();window.DGXgoto("home")};
$("carMic").onclick=()=>{
 $("carStatus").textContent="Ativando microfone... Fale depois do toque.";
 $("micBtn").click();
};
$("carBriefing").onclick=()=>{
 $("carStatus").textContent="Lendo seu resumo do dia.";
 if(window.DGXbriefingStart)window.DGXbriefingStart();else $("readBriefing").click();
};
$("carPodcasts").onclick=()=>{
 const msg=window.DGXpodcastsSpeakLatest?.()||"Seus podcasts estão no menu Podcasts.";
 $("carStatus").textContent=msg;
};
$("carAlerts").onclick=()=>{
 const data=window.DGXStore?.read("dgx_reminders_v1",[])||[];
 const due=data.filter(r=>new Date(r.at)>new Date()).sort((a,b)=>a.at.localeCompare(b.at));
 const msg=due.length?"Você tem "+due.length+" lembretes futuros. O próximo é "+due[0].title+".":"Nenhum lembrete futuro.";
 $("carStatus").textContent=msg;speak(msg);
};
$("carSpotify").onclick=()=>{
 $("carStatus").textContent="Para pedir uma música, toque no microfone e diga o nome da faixa, artista ou playlist.";
 speak("Para pedir uma música, toque no microfone e diga o nome da faixa, artista ou playlist.");
};
$("carViewPodcasts").onclick=()=>{close();window.DGXgoto("podcasts")};
if("MutationObserver" in window){
 const observe=new MutationObserver(()=>{
  if(!$("carScreen").classList.contains("hide")){
   const state=$("voiceStatus").textContent;
   if(state)$("carStatus").textContent=state;
  }
 });
 observe.observe($("voiceStatus"),{childList:true,subtree:true,characterData:true});
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
})();