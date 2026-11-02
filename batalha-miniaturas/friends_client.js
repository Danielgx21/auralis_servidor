/* v2.14 — amizades e convites de PvP, carregado sobre o jogo existente. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let snapshot=null,working=false,hostInvite='',message='',lastPanelHTML='',currentBanner='';
const started=new Set();
async function api(action,data){
 const opts={method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{'X-Game-Request':'1'}};
 if(data!==undefined){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(data);}
 const r=await fetch('/api/friends/'+action,opts),b=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(b.error||'Nao foi possivel contatar o servidor de amigos.');
 return b;
}
function note(s,err){
 message=s;const n=$('mfNote');if(n){n.textContent=s;n.style.color=err?'#ffadb7':'#a4e6ca';}
}
function btn(action,id,label,highlight){
 return '<button class="mfBtn'+(highlight?' mfGold':'')+'" type="button" data-mf="'+esc(action)+'" data-id="'+esc(id)+'">'+label+'</button>';
}
function row(u,buttons){
 return '<div class="mfRow"><span class="mfAv">⚔️</span><div class="mfName"><strong>'+esc(u.displayName)+'</strong><small>@'+esc(u.username)+'</small></div>'+
 (typeof u.online==='boolean'?'<small>'+(u.online?'🟢 Online':'⚪ Offline')+'</small>':'')+(buttons||'')+'</div>';
}
function render(){
 const host=$('realmAccountPanel');if(!host)return;
 let panel=$('miniFriendsPanel');
 if(!panel){panel=document.createElement('section');panel.id='miniFriendsPanel';panel.className='realm-account-card mfPanel';host.insertAdjacentElement('afterend',panel);lastPanelHTML='';}
 if(!snapshot){const html='<h3>👥 Amigos</h3><p>Faça login acima para adicionar amigos e desafiá-los.</p>';if(lastPanelHTML!==html){panel.innerHTML=html;lastPanelHTML=html;}return;}
 if(panel.contains(document.activeElement)&&document.activeElement.tagName==='INPUT')return;
 const friends=snapshot.friends||[],received=snapshot.incoming||[],sent=snapshot.outgoing||[];
 let html='<h3>👥 Amigos e duelos</h3><p>Adicione amigos usando o nome de usuário. Depois que aceitarem, desafie-os para uma partida automática.</p>'+
 '<form id="mfAdd" class="mfAdd"><input id="mfUsername" maxlength="24" required autocomplete="off" placeholder="Nome de usuário do amigo" aria-label="Nome de usuário"><button type="submit" class="mfBtn mfGold">Adicionar</button></form>'+
 '<p id="mfNote" class="mfNote">'+esc(message)+'</p><h4>Meus amigos ('+friends.length+')</h4>';
 if(!friends.length)html+='<p>Você ainda não tem amigos adicionados.</p>';
 friends.forEach(f=>{html+=row(f,btn('challenge',f.id,'⚔️ Desafiar',f.online)+btn('remove',f.id,'Remover',false));});
 if(received.length){html+='<h4>Solicitações recebidas</h4>';received.forEach(f=>{html+=row(f,btn('accept',f.id,'Aceitar',true)+btn('reject',f.id,'Recusar',false));});}
 if(sent.length){html+='<h4>Solicitações enviadas</h4>';sent.forEach(f=>{html+=row(f,'<small>Aguardando resposta</small>');});}
 if(html!==lastPanelHTML){panel.innerHTML=html;lastPanelHTML=html;}
}
function showInvites(){
 let overlay=$('miniFriendInvite');
 if(!overlay){overlay=document.createElement('div');overlay.id='miniFriendInvite';overlay.className='mfInvite';document.body.appendChild(overlay);}
 const inv=(snapshot?.challenges||[]).find(x=>x.direction==='incoming'&&x.status==='pending');
 if(!inv){overlay.hidden=true;currentBanner='';return;}
 overlay.hidden=false;
 if(currentBanner===inv.id)return;
 currentBanner=inv.id;
 overlay.innerHTML='<strong>⚔️ Desafio de '+esc(inv.friend.displayName)+'</strong><p>Quer disputar um duelo amistoso agora?</p>'+
 btn('yes',inv.id,'Aceitar',true)+btn('no',inv.id,'Recusar',false);
}
function isPlaying(){return !!$('pvpLeaveBtn')&&!$('pvpLeaveBtn').hidden;}
function openPvp(){
 if(isPlaying()||!$('homePvp'))return false;
 $('homePvp').click();return true;
}
async function shareRoom(){
 if(!hostInvite)return;
 let saved;try{saved=JSON.parse(sessionStorage.getItem('miniaturas-pvp-online-v2')||'null');}catch{return;}
 const room=($('pvpCode')?.textContent||'').match(/[A-HJ-NP-Z2-9]{6}/)?.[0];
 if(!saved||!room||saved.room!==room||!saved.token)return;
 const id=hostInvite;
 hostInvite='';
 try{await api('room',{id,room,token:saved.token});note('O amigo vai entrar na sala automaticamente.');}
 catch(ex){hostInvite=id;note(ex.message,true);}
}
async function matchInvites(){
 for(const inv of snapshot?.challenges||[]){
  if(inv.status!=='accepted')continue;
  if(inv.direction==='outgoing'&&!inv.room){
   if(hostInvite===inv.id){await shareRoom();return;}
   if(started.has(inv.id)||!openPvp())return;
   started.add(inv.id);hostInvite=inv.id;
   $('pvpCreateBtn')?.click();
   note('Convite aceito. Preparando o duelo...');
   return;
  }
  if(inv.direction==='incoming'&&inv.room&&!started.has(inv.id)){
   if(!openPvp())return;
   started.add(inv.id);
   $('pvpJoinCode').value=inv.room;
   $('pvpJoinBtn').click();
   note('Entrando automaticamente na partida...');
   return;
  }
 }
}
async function refresh(){
 if(working)return;working=true;
 try{snapshot=await api('state');render();showInvites();await matchInvites();}
 catch(ex){if(/conta|login|autentic/i.test(ex.message)){snapshot=null;render();showInvites();}}
 finally{working=false;}
}
document.addEventListener('submit',async ev=>{
 if(ev.target.id!=='mfAdd')return;
 ev.preventDefault();
 const input=$('mfUsername'),username=input.value.trim();
 if(!username)return;
 try{await api('request',{username});input.value='';note('Solicitação enviada.');await refresh();}
 catch(ex){note(ex.message,true);}
});
document.addEventListener('click',async ev=>{
 const b=ev.target.closest('[data-mf]');if(!b)return;
 const action=b.dataset.mf,id=b.dataset.id;
 if(action==='remove'&&!confirm('Remover este amigo?'))return;
 const actions={accept:['respond',{userId:id,accept:true}],reject:['respond',{userId:id,accept:false}],
 remove:['remove',{userId:id}],challenge:['challenge',{userId:id}],
 yes:['challenge-respond',{id,accept:true}],no:['challenge-respond',{id,accept:false}]};
 const item=actions[action];if(!item)return;
 b.disabled=true;
 try{await api(item[0],item[1]);note(action==='challenge'?'Convite enviado. Aguardando resposta.':'Atualizado.');currentBanner='';await refresh();}
 catch(ex){note(ex.message,true);alert(ex.message);}finally{b.disabled=false;}
});
const styles=document.createElement('style');
styles.textContent='.mfPanel{margin:14px 0;padding:16px;border:1px solid #ac885b;border-radius:14px;background:#1b2e43;color:#eef5fa}.mfPanel h3{margin:0 0 8px}.mfPanel h4{color:#efca8a}.mfPanel p{font-size:13px;line-height:1.5;color:#c0d1e1}.mfAdd{display:flex;gap:7px;flex-wrap:wrap}.mfAdd input{min-width:130px;flex:1;background:#102037;color:white;border:1px solid #718ca4;padding:10px;border-radius:10px}.mfBtn{margin:3px;border-radius:9px;border:1px solid #6785a2;background:#315173;color:#fff;padding:9px 11px;cursor:pointer;font:inherit;font-size:13px}.mfGold{background:#69522d;border-color:#d0ac69}.mfRow{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid #6e89a542}.mfAv{font-size:24px}.mfName{flex:1;min-width:100px}.mfName small{display:block;color:#c0d1e1}.mfNote{min-height:18px}.mfInvite{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1500;max-width:420px;margin:auto;padding:18px;background:#20364c;border:2px solid #dfb772;color:white;border-radius:14px;box-shadow:0 10px 40px #0009}.mfInvite[hidden]{display:none}.mfInvite p{margin:8px 0}';
document.head.appendChild(styles);
if($('pvpCode'))new MutationObserver(()=>{shareRoom().catch(()=>{});}).observe($('pvpCode'),{childList:true,subtree:true,characterData:true});
setInterval(refresh,11000);
setInterval(()=>{if(hostInvite)shareRoom().catch(()=>{});if(snapshot)render();},1700);
refresh();
})();