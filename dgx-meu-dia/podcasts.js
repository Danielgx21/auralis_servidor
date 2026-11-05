/* DGX v0.5 — Podcasts favoritos, episódios RSS e importação opcional da biblioteca Spotify. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const notify=t=>window.DGXtoast?.(t);
const rfmt=s=>{if(!s)return "Data não informada";const d=new Date(s);return Number.isNaN(+d)?"Sem data":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Sao_Paulo"})};
const prefsKey="dgx_podcasts_v1";
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
let latestEpisodes=[],reloadSeq=0;
const watched=()=>window.DGXStore?.read(prefsKey,[])||[];
async function api(url){const r=await fetch(url,{credentials:"same-origin",cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Serviço indisponível");return j}
async function save(list){
 if(list.length>15)throw Error("Nesta versão, é possível acompanhar até 15 podcasts.");
 await window.DGXStore.write(prefsKey,list);
 renderWatched();
 await refreshLatest();
}
function spotifyUrl(item){
 const u=item.spotify||"";
 if(/^https:\/\/open\.spotify\.com\/show\/[a-zA-Z0-9]+(?:\?.*)?$/.test(u))return u;
 return "https://open.spotify.com/search/"+encodeURIComponent(item.name);
}
function safeLink(url){
 try{const u=new URL(url);return u.protocol==="https:"?u.href:""}catch(e){return ""}
}
function renderWatched(){
 const list=watched();
 $("podcastCount").textContent=list.length+" acompanhados";
 $("homePodcastCount").textContent=list.length?list.length+" programas":"Nenhum cadastrado";
 $("podcastSubscriptions").innerHTML=list.length?list.map(p=>'<div class="pod-show"><div style="flex:1;min-width:0"><strong>'+esc(p.name)+'</strong><div class="small">'+esc(p.publisher||"Podcast")+'</div>'+
 '<a href="'+esc(spotifyUrl(p))+'" target="_blank" rel="noopener noreferrer" class="small" style="display:inline-block;margin-top:8px">Abrir no Spotify ↗</a>'+
 (String(p.id).startsWith("spotify:")?'<div class="small" style="margin-top:5px;color:#f2c48f">Exclusivo Spotify · sem avisos automáticos de episódios</div>':"")+'</div>'+
 '<button type="button" class="btn ghost" data-unfollow="'+esc(p.id)+'" aria-label="Deixar de acompanhar '+esc(p.name)+'">Remover</button></div>').join("")
 :'<div class="empty">Escolha seus podcasts favoritos. O DGX verificará novos episódios automaticamente.</div>';
 $("podcastSubscriptions").querySelectorAll("[data-unfollow]").forEach(b=>b.onclick=async()=>{
  if(!confirm("Deixar de acompanhar este podcast?"))return;
  try{await save(watched().filter(p=>String(p.id)!==b.dataset.unfollow));notify("Podcast removido.")}catch(e){notify("Falha ao remover: "+e.message)}
 });
}
async function add(p,spotify=""){
 const list=watched();
 if(list.some(x=>String(x.id)===String(p.id))){notify("Você já acompanha "+p.name);return}
 if(list.length>=15){notify("Limite inicial de 15 podcasts. Remova um para adicionar.");return}
 const item={id:p.id,name:String(p.name||"Podcast").slice(0,150),
  publisher:String(p.publisher||"").slice(0,100),spotify:spotify||""};
 try{await save(list.concat(item));notify("Agora você acompanha "+item.name+".") }
 catch(e){notify("Falha ao salvar: "+e.message)}
}
async function search(term){
 term=String(term||"").trim();if(term.length<2){notify("Digite o nome do podcast.");return}
 $("podcastSearchResults").innerHTML='<div class="sub">Procurando podcasts...</div>';
 try{
  const results=(await api("/api/podcasts/search?q="+encodeURIComponent(term))).results||[];
  $("podcastSearchResults").innerHTML=results.length?results.map((p,i)=>
   '<div class="pod-result"><div style="flex:1;min-width:0"><strong>'+esc(p.name)+'</strong><div class="small">'+esc(p.publisher||"")+'</div></div>'+
   '<button type="button" class="btn main" data-pick="'+i+'">Acompanhar</button></div>').join("")
   :'<div class="empty">Nenhum podcast encontrado. Tente outra grafia.</div>';
  $("podcastSearchResults").querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>add(results[Number(b.dataset.pick)]));
 }catch(e){$("podcastSearchResults").innerHTML='<div class="empty">'+esc(e.message)+'</div>'}
}
async function refreshLatest(){
 const seq=++reloadSeq;
 const list=watched();
 if(!list.length){latestEpisodes=[];drawLatest();return}
 $("podcastLatest").innerHTML='<div class="sub">Buscando episódios mais recentes...</div>';
 const results=await Promise.allSettled(list.map(p=>api("/api/podcasts/episodes?id="+encodeURIComponent(p.id))));
 if(seq!==reloadSeq)return;
 latestEpisodes=[];
 const problems=[];
 results.forEach((r,i)=>{
  if(r.status==="fulfilled"){
   (r.value.episodes||[]).slice(0,5).forEach(ep=>latestEpisodes.push({
    ...ep,show:list[i].name,spotify:spotifyUrl(list[i]),showId:list[i].id
   }));
  }else problems.push(list[i].name);
 });
 latestEpisodes.sort((a,b)=>(b.released||"").localeCompare(a.released||""));
 latestEpisodes=latestEpisodes.slice(0,25);
 drawLatest();
 if(problems.length)notify("Não foi possível consultar: "+problems.slice(0,2).join(", ")+".");
}
function drawLatest(){
 const list=latestEpisodes;
 $("podcastLatest").innerHTML=list.length?list.slice(0,15).map(e=>{
  const url=safeLink(e.url)||safeLink(e.spotify);
  return '<div class="pod-episode"><div class="small" style="font-weight:700;color:#8de2d0">'+esc(e.show)+' · '+esc(rfmt(e.released))+'</div>'+
  '<strong style="display:block;margin:7px 0;font-size:15px;line-height:1.45">'+esc(e.title)+'</strong>'+
  '<div class="actions"><a class="btn" href="'+esc(e.spotify)+'" rel="noopener noreferrer" target="_blank">Spotify · programa ↗</a>'+
  (url?'<a class="btn ghost" href="'+esc(url)+'" rel="noopener noreferrer" target="_blank">Página do episódio ↗</a>':"")+'</div></div>';
 }).join(""):'<div class="empty">Nenhum episódio localizado nos feeds disponíveis.</div>';
 $("homePodcasts").innerHTML=list.length?list.slice(0,3).map(e=>
  '<div class="event"><div class="date">'+esc(e.show)+' · '+esc(rfmt(e.released))+'</div>'+
  '<div class="teams" style="font-size:13px;line-height:1.45">'+esc(e.title)+'</div></div>').join("")
 :'<span class="sub">Os episódios aparecerão aqui quando um programa for acompanhado.</span>';
}
$("podcastSearchForm").addEventListener("submit",e=>{e.preventDefault();search($("podcastSearch").value)});
$("podcastReload").onclick=refreshLatest;
$("podcastImportSpotify").onclick=async()=>{
 const fn=window.DGXSpotify?.savedShows;
 if(!fn){notify("Conecte o Spotify em Voz e permita ler sua biblioteca.");return}
 $("podcastSearchResults").innerHTML='<div class="sub">Consultando seus podcasts salvos no Spotify...</div>';
 try{
  const shows=await fn();
  $("podcastSearchResults").innerHTML=shows.length?shows.slice(0,40).map((p,i)=>
   '<div class="pod-result"><div style="flex:1;min-width:0"><strong>'+esc(p.name)+'</strong>'+
   '<div class="small">Sua biblioteca Spotify · confirme o programa correspondente</div></div>'+
   '<button type="button" class="btn main" data-import="'+i+'">Localizar</button></div>').join("")
   :'<div class="empty">Nenhum programa salvo encontrado no Spotify.</div>';
  $("podcastSearchResults").querySelectorAll("[data-import]").forEach(b=>b.onclick=async()=>{
   const match=shows[Number(b.dataset.import)];
   $("podcastSearch").value=match.name;
   await search(match.name);
   const container=$("podcastSearchResults");
   const addButtons=container.querySelectorAll("[data-pick]");
   // Associação automática apenas se o título corresponder exatamente;
   // caso contrário, o usuário escolhe manualmente para evitar erro.
   if(addButtons.length){
    const resultNames=[...container.querySelectorAll(".pod-result strong")].map(x=>normalize(x.textContent));
    const index=resultNames.findIndex(x=>x===normalize(match.name));
    if(index>=0){
      // Clique automático exato, mas para preservar URL Spotify usamos o mapeamento
      // em uma lista aguardando confirmação explícita abaixo.
      const btn=addButtons[index];
      btn.textContent="Confirmar podcast";
      btn.onclick=async()=>{
        const res=(await api("/api/podcasts/search?q="+encodeURIComponent(match.name))).results||[];
        const candidate=res.find(x=>normalize(x.name)===normalize(match.name));
        if(candidate)await add(candidate,match.spotifyUrl);
      };
    }
   }
   notify("Verifique o nome e toque em Acompanhar para confirmar.");
  });
 }catch(e){$("podcastSearchResults").innerHTML='<div class="empty">'+esc(e.message)+'</div>';notify("Erro no Spotify: "+e.message)}
};
window.DGXpodcastsGetLatest=()=>latestEpisodes.map(e=>({...e}));
window.DGXpodcastsRefresh=refreshLatest;
window.DGXpodcastsInit=()=>{
 renderWatched();
 refreshLatest();
};
window.DGXpodcastsSpeakLatest=()=>{
 const e=latestEpisodes[0];
 const message=e?"Episódio recente: "+e.title+", do podcast "+e.show+". Para ouvir, abra o Spotify quando estiver parado.":
 "Você ainda não tem episódios carregados. Abra Podcasts e acompanhe seus programas favoritos.";
 if(window.speechSynthesis){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.lang="pt-BR";window.speechSynthesis.speak(u)}
 return message;
};
renderWatched();
})();