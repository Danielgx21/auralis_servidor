/* DGX Meu Dia v0.4 — Comandos Spotify por voz com busca por contexto.
   Reprodução efetiva só após autorização OAuth PKCE e Spotify Premium.
   Sem acesso, abre busca no Spotify (não promete reprodução).
*/
(function(){
"use strict";
const $=id=>document.getElementById(id);
const K_ID="dgx_spotify_client_id_v1",K_TOKEN="dgx_spotify_token_v1";
const K_VER="dgx_spotify_pkce_verifier",K_STATE="dgx_spotify_oauth_state";
const K_LAST="dgx_spotify_last";
const redirect=location.origin+"/";
let statusTimer=null;
function clean(text){return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
function notify(text){if(window.DGXtoast)window.DGXtoast(text);}
function voice(text){$("voiceStatus").textContent=text;$("voiceTranscript").textContent=text; if(window.speechSynthesis){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="pt-BR";u.rate=1;window.speechSynthesis.speak(u);}}
function tokens(){try{return JSON.parse(localStorage.getItem(K_TOKEN))||null}catch(e){return null}}
function clientId(){return localStorage.getItem(K_ID)||""}
function status(){
 const id=clientId(),token=tokens();
 $("spotifyState").textContent=!id?"Spotify não configurado — a busca funciona sem conectar.":token?.refresh_token?"Conta Spotify autorizada (reprodução depende do Premium).":"ID configurado. Falta conectar sua conta Spotify.";
 $("spotifyConnect").disabled=!id;
 $("spotifyDisconnect").classList.toggle("hide",!token);
 $("spotifyClientId").value=id;
}
function base64url(data){return btoa(String.fromCharCode(...new Uint8Array(data))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}
async function authorize(){
 const client=clientId();
 if(!client){notify("Digite o Client ID no painel de Spotify.");return}
 const bytes=crypto.getRandomValues(new Uint8Array(64));
 const verifier=base64url(bytes);
 const state=base64url(crypto.getRandomValues(new Uint8Array(22)));
 const challenge=base64url(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
 sessionStorage.setItem(K_VER,verifier);
 sessionStorage.setItem(K_STATE,state);
 const url=new URL("https://accounts.spotify.com/authorize");
 url.search=new URLSearchParams({
  client_id:client,response_type:"code",redirect_uri:redirect,
  code_challenge_method:"S256",code_challenge:challenge,state,
  scope:"user-read-playback-state user-modify-playback-state user-library-read",
  show_dialog:"false"
 }).toString();
 location.assign(url.href);
}
async function tokenRequest(payload){
 const response=await fetch("https://accounts.spotify.com/api/token",{
  method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams(payload)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.access_token)throw Error(data.error_description||data.error||"Falha de autenticação Spotify");
 return data;
}
function saveToken(data,previous){
 const next={access_token:data.access_token,refresh_token:data.refresh_token||previous?.refresh_token,
  expires_at:Date.now()+Math.max(60,(Number(data.expires_in)||3600)-60)*1000};
 localStorage.setItem(K_TOKEN,JSON.stringify(next));status();return next;
}
async function handleRedirect(){
 const query=new URLSearchParams(location.search);
 if(!query.has("code")&&!query.has("error"))return;
 const code=query.get("code"),state=query.get("state");
 // Remover query imediatamente; não salvar código em histórico do navegador.
 history.replaceState(null,"",location.pathname+location.hash);
 if(!code){notify("Spotify não autorizou a conexão.");return}
 const expected=sessionStorage.getItem(K_STATE),verifier=sessionStorage.getItem(K_VER);
 sessionStorage.removeItem(K_STATE);sessionStorage.removeItem(K_VER);
 if(!state||!expected||state!==expected||!verifier){notify("Autorização recusada: estado inválido.");return}
 try{
  saveToken(await tokenRequest({grant_type:"authorization_code",code,
   redirect_uri:redirect,client_id:clientId(),code_verifier:verifier}),null);
  notify("Spotify conectado. Você pode pedir músicas por voz.");
 }catch(err){notify("Não foi possível conectar Spotify: "+err.message)}
}
async function accessToken(){
 let current=tokens();
 if(!current?.refresh_token)throw Error("Conecte sua conta Spotify em Voz.");
 if(current.access_token&&Date.now()<current.expires_at)return current.access_token;
 const token=await tokenRequest({grant_type:"refresh_token",refresh_token:current.refresh_token,client_id:clientId()});
 return saveToken(token,current).access_token;
}
async function request(path,options={}){
 const access=await accessToken();
 const res=await fetch("https://api.spotify.com/v1"+path,{
  ...options,
  headers:{"Authorization":"Bearer "+access,...(options.headers||{})}
 });
 if(res.status===204)return null;
 let body;try{body=await res.json()}catch(err){body={}}
 if(!res.ok){
  const note=body?.error?.message||"Spotify respondeu "+res.status;
  if(res.status===404)throw Error("Abra o Spotify no celular, inicie uma música e tente novamente. Nenhum dispositivo ativo.");
  if(res.status===403)throw Error("Spotify Premium e permissões da API são necessários. "+note);
  if(res.status===429)throw Error("Limite de consultas do Spotify atingido. Tente novamente depois.");
  throw Error(note);
 }
 return body;
}
function parse(raw){
 const cmd=clean(raw);
 if(/^(?:pausa|pausar|pare|parar|pause)(?: o spotify| a musica| musica)?$/.test(cmd))return {action:"pause"};
 if(/^(?:continue|continuar|retome|retomar|dar play|voltar a tocar|reproduzir novamente)(?: o spotify| a musica)?$/.test(cmd))return {action:"resume"};
 if(/^(?:proxima|proximo|pula|pular|avance)(?: musica| faixa| no spotify)?$/.test(cmd))return {action:"next"};
 if(/^(?:anterior|volte|voltar)(?: musica| faixa| no spotify)?$/.test(cmd))return {action:"previous"};
 if(/^(?:aumenta|aumentar|abaixa|diminuir|reduzir|ajusta|ajustar) (?:o )?volume(?: (?:para|em) (\d{1,3}))?/.test(cmd)){
  const x=cmd.match(/(\d{1,3})/);return {action:"volume",value:x?Math.min(100,Number(x[1])):cmd.includes("aument")?70:30};
 }
 if(!/\b(toca|toque|tocar|coloca|coloque|reproduz|reproduzir|ouvir|ouca|abre|abrir)\b/.test(cmd))return null;
 if(!/\b(spotify|musica|musicas|playlist|album|artista|banda|cantor|cantora|podcast|toca|toque|tocar|coloca|coloque|reproduz|reproduzir|ouvir|ouca)\b/.test(cmd))return null;
 let sentence=String(raw).trim().replace(/^(?:por favor[,\s]*)?(?:quero\s+(?:ouvir|escutar)|pode\s+(?:tocar|colocar)|toca(?:r)?|toque|coloca(?:r)?|coloque|reproduz(?:ir)?|abre|abrir|ouvir|ouca)\s+/i,"");
 sentence=sentence.replace(/\s+(?:no|na|pelo)\s+spotify[.!?]?\s*$/i,"").trim();
 sentence=sentence.replace(/^(?:a|o|uma|um|as|os)\s+/i,"");
 let type="track",query=sentence;
 if(/^(?:playlist|lista de reproducao|lista) (?:de |com |do |da )?/i.test(clean(sentence))){
  type="playlist";query=sentence.replace(/^(?:playlist|lista de reprodução|lista) (?:de |com |do |da )?/i,"");
 }else if(/^(?:album|disco) (?:de |do |da )?/i.test(clean(sentence))){
  type="album";query=sentence.replace(/^(?:álbum|album|disco) (?:de |do |da )?/i,"");
 }else if(/^(?:podcast|programa) (?:de |do |da )?/i.test(clean(sentence))){
  type="show";query=sentence.replace(/^(?:podcast|programa) (?:de |do |da )?/i,"");
 }else if(/^(?:musicas|cancoes|sons|faixas) (?:de |do |da |dos |das )/i.test(clean(sentence))){
  type="artist";query=sentence.replace(/^(?:músicas|musicas|canções|cancoes|sons|faixas) (?:de |do |da |dos |das )/i,"");
 }else if(/^(?:artista|banda|cantor|cantora) /i.test(clean(sentence))){
  type="artist";query=sentence.replace(/^(?:artista|banda|cantor|cantora) (?:de |do |da )?/i,"");
 }else{
  query=sentence.replace(/^(?:a|o|uma|um)?\s*(?:musica|música|canção|cancao) /i,"");
 }
 query=query.trim().replace(/[.!?]+$/g,"");
 if(!query)return null;
 return {action:"play",type,query};
}
async function playThing(spec){
 const q=encodeURIComponent(spec.query);
 const types=spec.type==="show"?"show":spec.type;
 let results;
 try{
  results=await request("/search?"+new URLSearchParams({q:spec.query,type:types,limit:"5",market:"BR"}));
 }catch(e){throw e}
 const key={track:"tracks",playlist:"playlists",album:"albums",artist:"artists",show:"shows"}[spec.type];
 const items=(results?.[key]?.items||[]).filter(x=>x&&x.uri);
 if(!items.length)throw Error("Não encontrei "+spec.query+" no catálogo do Spotify.");
 const match=items[0],title=match.name||spec.query;
 if(spec.type==="show"){
  voice("Encontrei o podcast "+title+". Vou abrir no Spotify para você escolher o episódio.");
  location.assign(match.external_urls?.spotify||"https://open.spotify.com/search/"+encodeURIComponent(spec.query));
  return;
 }
 if(spec.type==="track")await request("/me/player/play",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({uris:[match.uri]})});
 else await request("/me/player/play",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({context_uri:match.uri})});
 voice("Tocando "+title+" no Spotify.");
}
async function handle(raw){
 const spec=parse(raw);
 if(!spec)return false;
 $("voiceTranscript").textContent="Você pediu: "+raw;
 if(spec.action==="play"&&!tokens()?.refresh_token){
  voice("Entendi: "+spec.query+". Vou abrir a busca no Spotify. Para tocar automaticamente, conecte sua conta no painel Spotify.");
  // A busca é a opção possível sem as credenciais do próprio usuário.
  const dest="https://open.spotify.com/search/"+encodeURIComponent(spec.query);
  $("spotifyFallback").href=dest;$("spotifyFallback").classList.remove("hide");
  location.assign(dest);
  return true;
 }
 try{
  if(spec.action==="play")await playThing(spec);
  else if(spec.action==="pause"){await request("/me/player/pause",{method:"PUT"});voice("Spotify pausado.");}
  else if(spec.action==="resume"){await request("/me/player/play",{method:"PUT"});voice("Continuando o Spotify.");}
  else if(spec.action==="next"){await request("/me/player/next",{method:"POST"});voice("Próxima faixa.");}
  else if(spec.action==="previous"){await request("/me/player/previous",{method:"POST"});voice("Faixa anterior.");}
  else if(spec.action==="volume"){await request("/me/player/volume?volume_percent="+spec.value,{method:"PUT"});voice("Volume ajustado.");}
 }catch(e){
  const problem="Não consegui iniciar: "+e.message;
  $("voiceStatus").textContent=problem;
  notify(problem);
  if(spec.action==="play"){
   $("spotifyFallback").href="https://open.spotify.com/search/"+encodeURIComponent(spec.query);
   $("spotifyFallback").classList.remove("hide");
  }
 }
 return true;
}
async function savedShows(){
 const all=[];
 for(let offset=0;offset<100;offset+=50){
  const page=await request("/me/shows?limit=50&offset="+offset);
  const items=(page?.items||[]).map(x=>x.show).filter(x=>x&&x.name);
  items.forEach(show=>all.push({name:show.name,spotifyUrl:show.external_urls?.spotify||""}));
  if(!page?.next||!items.length)break;
 }
 return all;
}
window.DGXSpotify={handle,parse,status,savedShows};
$("spotifySaveId").onclick=()=>{
 const input=$("spotifyClientId").value.trim();
 if(input&&!/^[a-zA-Z0-9]{20,80}$/.test(input)){notify("Client ID inválido.");return}
 if(input!==clientId()){localStorage.removeItem(K_TOKEN)}
 if(input)localStorage.setItem(K_ID,input);else localStorage.removeItem(K_ID);
 status();notify(input?"ID salvo. Agora conecte o Spotify.":"ID removido.");
};
$("spotifyConnect").onclick=()=>authorize().catch(e=>notify(e.message));
$("spotifyDisconnect").onclick=()=>{localStorage.removeItem(K_TOKEN);status();notify("Conta Spotify desconectada do DGX.");};
status();
handleRedirect();
})();