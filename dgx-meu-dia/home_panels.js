/* DGX Meu Dia v0.8 — cartões retráteis na tela Início.
   Estado de exibição persistente no Neon, com preferência local de apoio. */
(function(){
"use strict";
const HOME_KEY="dgx_home_panels_v1";
const panels=[...document.querySelectorAll("#page-home article[data-home-panel]")];
const names={
 weather:"Previsão do tempo",
 corinthians:"Jogos do Corinthians",
 podcasts:"Podcasts favoritos",
 calendar:"Agenda de hoje",
 payments:"Contas deste mês",
 plants:"Minhas plantas",
 alerts:"Seus avisos",
 mood:"Humor de hoje",
 challenge:"Desafio do dia",
 voice:"Comandos de voz"
};
function localState(){
 try{
  const data=JSON.parse(localStorage.getItem(HOME_KEY)||"{}");
  return data&&typeof data==="object"&&!Array.isArray(data)?data:{};
 }catch(e){return {}}
}
let state=localState();
function persist(){
 try{localStorage.setItem(HOME_KEY,JSON.stringify(state))}catch(e){/* preferências de layout apenas */}
 if(window.DGXStore?.write){
  window.DGXStore.write(HOME_KEY,{...state});
 }
}
function apply(card){
 const key=card.dataset.homePanel;
 const closed=state[key]===true;
 const content=card.querySelector(":scope > .home-panel-content");
 const button=card.querySelector(":scope > .home-panel-head > .home-panel-toggle");
 if(!content||!button)return;
 card.classList.toggle("home-is-collapsed",closed);
 content.hidden=closed;
 button.setAttribute("aria-expanded",String(!closed));
 button.setAttribute("aria-label",(closed?"Expandir ":"Recolher ")+(names[key]||key));
 button.title=closed?"Expandir painel":"Recolher painel";
 button.querySelector(".home-toggle-glyph").textContent=closed?"⌄":"⌃";
}
panels.forEach((card,index)=>{
 const key=card.dataset.homePanel;
 const head=card.firstElementChild;
 if(!head) return;
 const content=document.createElement("div");
 content.className="home-panel-content";
 content.id="home-content-"+key;
 // Preserve o conteúdo original, eventos e IDs; nenhuma informação é apagada.
 while(head.nextSibling)content.appendChild(head.nextSibling);
 card.appendChild(content);
 head.classList.add("home-panel-head");
 const button=document.createElement("button");
 button.type="button";
 button.className="roundbtn home-panel-toggle";
 button.innerHTML='<span class="home-toggle-glyph" aria-hidden="true">⌃</span>';
 button.setAttribute("aria-controls",content.id);
 button.addEventListener("click",()=>{
  state[key]=!Boolean(state[key]);
  apply(card);
  persist();
 });
 head.appendChild(button);
 apply(card);
});
function setAll(closed){
 for(const card of panels){
  state[card.dataset.homePanel]=closed;
  apply(card);
 }
 persist();
}
const shrink=document.getElementById("homeCollapseAll");
const expand=document.getElementById("homeExpandAll");
if(shrink)shrink.addEventListener("click",()=>setAll(true));
if(expand)expand.addEventListener("click",()=>setAll(false));
window.DGXhomeInit=()=>{
 const remote=window.DGXStore?.read(HOME_KEY,null);
 if(remote&&typeof remote==="object"&&!Array.isArray(remote)){
  state={...remote};
  try{localStorage.setItem(HOME_KEY,JSON.stringify(state))}catch(e){}
 }else{
  state=localState();
 }
 panels.forEach(apply);
};
})();