/* DGX Meu Dia v0.9 — cartões retráteis com ícones vetoriais compactos. */
(function(){
"use strict";
const HOME_KEY="dgx_home_panels_v1";
const cards=[...document.querySelectorAll("#page-home article[data-home-panel]")];
const names={
 weather:"Previsão do tempo",corinthians:"Jogos do Corinthians",
 podcasts:"Podcasts favoritos",calendar:"Agenda de hoje",
 payments:"Contas deste mês",plants:"Minhas plantas",
 alerts:"Seus avisos",mood:"Humor de hoje",
 challenge:"Desafio do dia",voice:"Comandos de voz"
};
function getLocal(){
 try{
  const item=JSON.parse(localStorage.getItem(HOME_KEY)||"{}");
  return item&&typeof item==="object"&&!Array.isArray(item)?item:{};
 }catch(e){return {}}
}
let state=getLocal();
function save(){
 try{localStorage.setItem(HOME_KEY,JSON.stringify(state))}catch(e){}
 window.DGXStore?.write(HOME_KEY,{...state});
}
function paint(card){
 const key=card.dataset.homePanel,closed=state[key]===true;
 const body=card.querySelector(":scope > .home-panel-content");
 const button=card.querySelector(":scope > .home-panel-head > .home-panel-toggle");
 if(!body||!button)return;
 card.classList.toggle("home-is-collapsed",closed);
 body.hidden=closed;
 button.setAttribute("aria-expanded",String(!closed));
 button.setAttribute("aria-label",(closed?"Expandir ":"Recolher ")+(names[key]||key));
 button.title=closed?"Expandir":"Recolher";
}
const svg='<svg class="home-toggle-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
cards.forEach(card=>{
 const head=card.firstElementChild;
 if(!head)return;
 const key=card.dataset.homePanel;
 const body=document.createElement("div");
 body.className="home-panel-content";
 body.id="home-content-"+key;
 while(head.nextSibling)body.appendChild(head.nextSibling);
 card.appendChild(body);
 // Ações secundárias pertencem ao corpo, não ao cabeçalho retrátil.
 // O DOM move o elemento, preservando os listeners já registrados.
 const action=head.querySelector(":scope > button[data-goto], :scope > button#locateBtn");
 if(action){
  action.classList.add("home-panel-secondary-action");
  body.insertBefore(action,body.firstChild);
 }
 head.classList.add("home-panel-head");
 const button=document.createElement("button");
 button.type="button";
 button.className="home-panel-toggle";
 button.innerHTML=svg;
 button.setAttribute("aria-controls",body.id);
 button.addEventListener("click",()=>{
  state[key]=!(state[key]===true);
  paint(card);save();
 });
 head.appendChild(button);
 paint(card);
});
function all(closed){
 cards.forEach(card=>{state[card.dataset.homePanel]=closed;paint(card)});
 save();
 const menu=document.querySelector(".home-panel-menu");
 if(menu)menu.open=false;
}
document.getElementById("homeCollapseAll")?.addEventListener("click",()=>all(true));
document.getElementById("homeExpandAll")?.addEventListener("click",()=>all(false));
window.DGXhomeOpen=key=>{
 const card=cards.find(c=>c.dataset.homePanel===key);
 if(!card)return;
 state[key]=false;paint(card);save();
 document.getElementById("page-home")?.classList.add("active");
 window.DGXgoto?.("home");
 requestAnimationFrame(()=>card.scrollIntoView({behavior:"smooth",block:"start"}));
};
window.DGXhomeInit=()=>{
 const cloud=window.DGXStore?.read(HOME_KEY,null);
 if(cloud&&typeof cloud==="object"&&!Array.isArray(cloud)){
  state={...cloud};
  try{localStorage.setItem(HOME_KEY,JSON.stringify(state))}catch(e){}
 }else state=getLocal();
 cards.forEach(paint);
};
})();