'use strict';
// Expedições Persistentes v1.0. Salas, identidade e votos passam por servidor WebSocket.
// A lógica de investigação e os salvamentos anteriores continuam no game.js.
const SESSION_KEY='manual_criaturas_expedicao_v10';
const CAMPAIGN_ENDPOINT_KEY='manual_criaturas_servidor_v10';
const campaignLocal=(()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY))||{}}catch{return {}}})();
const cSave=()=>{try{localStorage.setItem(SESSION_KEY,JSON.stringify(campaignLocal))}catch{}};
const cToken=()=>{const bytes=new Uint8Array(24);if(window.crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.random()*256|0;return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')};
const onlineProfile=()=>Object.fromEntries(['wallet','owned','stock','rooms','contracts','paid','dailyPayout','cases','completions','histories','current','economyV1','soundtrack'].filter(k=>saved[k]!==undefined).map(k=>[k,saved[k]]));
let connCampaign=null, campaignRetry=null, campaignStopped=true, campaignBackoff=800;
let campaignStartedAt=0, campaignLastPhase='', campaignRestoring=false;
const webSocketUrl=()=>{
 let custom=(localStorage.getItem(CAMPAIGN_ENDPOINT_KEY)||'').trim().replace(/\/+$/,'');
 if(custom){if(/^https?:\/\//i.test(custom))custom=custom.replace(/^http/i,'ws');return custom.endsWith('/ws')?custom:custom+'/ws'}
 if(location.protocol==='https:'||location.protocol==='http:')return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
 return '';
};
const campaignReady=()=>net.online&&connCampaign?.readyState===WebSocket.OPEN;
const campaignPush=payload=>{if(campaignReady()){try{connCampaign.send(JSON.stringify(payload));return true}catch{}}return false};
const oldRender=render;
render=function(){oldRender();if(isMulti()){
  const banner=document.createElement('div');banner.className='connectionBanner '+(!net.online?'offline':net.paused?'paused':'connected');
  banner.innerHTML=`<span>${!net.online?'◌ Sem conexão · tentando voltar à expedição':net.paused?'◷ Investigação em espera · pesquisador desconectado':'● Sala '+esc(net.room)+' · '+connectedPlayers().length+'/'+net.size+' conectados'}</span><button data-action="${net.online?'go-camp':'reconnect-expedition'}">${net.online?'Sala':'Reconectar'}</button>`;
  app.prepend(banner);
 }};
const oldPersist=persist, oldSaveWallet=saveWallet;
function pushProfile(){if(campaignRestoring||!campaignLocal.active)return;const profile=onlineProfile();const at=Date.now();campaignLocal.profileAt=at;cSave();if(campaignReady())campaignPush({op:'profile',profile,profileUpdated:at})}
persist=function(announce=true){oldPersist(announce);if(!campaignRestoring)pushProfile()};
saveWallet=function(){oldSaveWallet();pushProfile()};
const oldCloseNet=closeNet;
closeNet=function(){campaignStopped=true;clearTimeout(campaignRetry);campaignRetry=null;try{connCampaign?.close(1000,'Saída voluntária')}catch{}connCampaign=null;oldCloseNet();net.paused=false;net.teamUpgrades={};};
const setStoredIdentity=(room,token)=>{campaignLocal.identities=campaignLocal.identities||{};campaignLocal.identities[room]=token;campaignLocal.currentRoom=room;campaignLocal.active=true;cSave()};
const recoverIdentity=()=>campaignLocal.identities?.[net.room]||'';
function campaignConnect(action,attempt=false){
 const endpoint=webSocketUrl();if(!endpoint){net.status='Configure o endereço do servidor para jogar online.';render();return}
 campaignStopped=false;clearTimeout(campaignRetry);campaignRetry=null;
 if(connCampaign&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(connCampaign.readyState))try{connCampaign.close()}catch{}
 let ws;try{ws=new WebSocket(endpoint)}catch(e){net.status='Servidor indisponível: '+e.message;render();return}
 connCampaign=ws;net.status=attempt?'Reconectando à expedição…':'Conectando ao servidor da expedição…';render();
 ws.addEventListener('open',()=>{
   if(campaignStopped||connCampaign!==ws)return;
   campaignBackoff=800;
   const token=campaignLocal.pendingToken||campaignLocal.identities?.[net.room]||cToken();
   campaignLocal.pendingToken=token;cSave();
   ws.send(JSON.stringify({op:action,code:net.room,token,name:net.name,mode:net.mode,size:net.size,caseId:net.caseId,profile:onlineProfile(),profileUpdated:campaignLocal.profileAt||0}));
 });
 ws.addEventListener('message',evt=>{
   if(connCampaign!==ws||campaignStopped)return;
   let msg;try{msg=JSON.parse(evt.data)}catch{return}
   campaignReceive(msg);
 });
 ws.addEventListener('close',()=>{
   if(connCampaign!==ws||campaignStopped)return;
   net.online=false;net.paused=true;net.status='Conexão caiu. Tentando retomar automaticamente com sua identidade original.';render();
   const pause=campaignBackoff+Math.random()*300;campaignBackoff=Math.min(campaignBackoff*1.7,12000);
   campaignRetry=setTimeout(()=>campaignConnect('join',true),pause);
 });
 ws.addEventListener('error',()=>{if(connCampaign===ws){net.status='Servidor indisponível. Nova tentativa automática.';render()}});
}
function applyCloudProfile(remote,remoteAt){
 if(!remote||!Object.keys(remote).length)return;
 if(Number(remoteAt||0)<=Number(campaignLocal.profileAt||0))return;
 campaignRestoring=true;
 try{
   for(const k of ['wallet','owned','stock','rooms','contracts','paid','dailyPayout','cases','completions','histories','current','economyV1','soundtrack'])if(remote[k]!==undefined)saved[k]=remote[k];
   localStorage.setItem(K,JSON.stringify(saved));campaignLocal.profileAt=remoteAt;cSave();
 }finally{campaignRestoring=false}
}
function applyCampaign(state,initial=false){
 if(!state||state.code!==net.room)return;
 const oldPhase=campaignLastPhase,wasCase=net.inGame,oldCase=s.caseId;
 net.mode=state.mode;net.size=state.size;net.players=state.players;net.slot=Number(net.slot);net.playerId='p'+net.slot;
 net.role=net.slot===state.hostSlot?'host':'guest';net.specialty=roleAt(net.slot).id;
 net.online=true;net.status='Expedição restaurada do servidor.';net.inGame=state.phase==='case';
 net.paused=state.players.length!==state.size||state.players.some(p=>!p.connected);
 net.firstFinish=state.firstFinish||null;net.hostSlot=state.hostSlot;net.bank=state.bank||0;net.teamUpgrades=state.upgrades||{};
 net.teamCaseHistory=state.completedCases||[];net.nominees=state.nominees||{};
 net.votes=Object.fromEntries(Object.entries(state.votes?.end||{}).map(([k,v])=>['p'+k,v]));
 net.theoryVotes=Object.fromEntries(Object.entries(state.votes?.theory||{}).map(([k,v])=>['p'+k,v]));
 net.nextVotes=state.votes?.next||{};net.voteRounds=state.round||{theory:0,end:0,next:0};
 if(state.caseId&&CASES[state.caseId])net.caseId=state.caseId;
 const started=state.startedAt||0;
 if(state.phase==='case' && CASES[state.caseId]){
   const existing=campaignLocal.roomRuns?.[net.room]||0;
   if(started!==existing || oldCase!==state.caseId){
     campaignRestoring=true;
     try{
       const recovered=started===existing&&saved.cases?.[state.caseId];
       s=recovered?hydrate(state.caseId):blank(state.caseId);
       s.view=s.outcome||state.team?.outcome?'ending':s.theory||state.team?.theory?'confrontation':s.evidence.length?'hub':'brief';
       saved.current=state.caseId;
       campaignLocal.roomRuns=campaignLocal.roomRuns||{};
       campaignLocal.roomRuns[net.room]=started;cSave();
       oldPersist(false);
     }finally{campaignRestoring=false}
   }else if(initial && !['brief','hub','scene','witness','dossier','theory','confrontation','ending','board','puzzle','interlude','office','shop','contracts','bestiary'].includes(s.view))s.view='hub';
   if(net.mode==='coop'&&state.team){
     mergeTeam(state.team);
     const team=state.team;
     if(team.theory && s.theory!==team.theory){s.theory=team.theory;s.selectedTheory=team.theory;s.view='confrontation'}
     if(team.outcome && s.outcome!==team.outcome){s.outcome=team.outcome;s.dailyOutcomeDate=localDay();s.view='ending';oldPersist(false);pushProfile()}
   }
 }else if(state.phase==='camp'){
   if(initial || oldPhase!=='camp' || !['shop','office','contracts','camp'].includes(s.view))s.view='camp';
 }else if(state.phase==='lobby'){
   if(initial||oldPhase!=='lobby')s.view='room';
 }
 campaignLastPhase=state.phase;
 if(oldPhase!=='camp' && state.phase==='camp')toast('Missão encerrada. A expedição está no Instituto.');
 if(wasCase && state.phase==='case' && oldCase!==state.caseId)toast('Nova investigação iniciada pelo grupo.');
 render();
}
function campaignReceive(msg){
 if(msg.event==='error'){
   net.status=msg.message||'Servidor recusou a operação.';toast(net.status);
   if(/não encontrada|cheia|Identidade inválida/.test(net.status)){campaignStopped=true;clearTimeout(campaignRetry);try{connCampaign?.close()}catch{}}
   render();return;
 }
 if(msg.event==='replaced'){campaignStopped=true;closeNet();toast('Seu pesquisador já se conectou em outro aparelho.');move('roomMenu');return}
 if(msg.event==='welcome'){
   net.slot=msg.slot;net.playerId='p'+msg.slot;
   applyCloudProfile(msg.profile,msg.profileUpdated);
   setStoredIdentity(msg.state.code,campaignLocal.pendingToken);
   net.room=msg.state.code;campaignLocal.pendingToken=null;cSave();
   applyCampaign(msg.state,true);
   if(msg.profileUpdated && Number(msg.profileUpdated)>Number(campaignLocal.profileAt||0))pushProfile();
   return;
 }
 if(msg.event==='state'&&net.slot>=0){applyCampaign(msg.state)}
}
function campaignMakeSession(action){
 const name=(document.getElementById('playerName')?.value||campaignLocal.name||'Pesquisador').trim().slice(0,24);
 const mode=document.getElementById('modeChoice')?.value||'coop';
 const size=Number(document.getElementById('partySize')?.value)||2;
 const id=document.getElementById('caseChoice')?.value||'lago';
 const code=(document.getElementById('roomCode')?.value||new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
 const endpoint=(document.getElementById('serverAddress')?.value||'').trim();
 if(endpoint){localStorage.setItem(CAMPAIGN_ENDPOINT_KEY,endpoint)}
 if(!webSocketUrl()){toast('Informe um endereço de servidor válido.');return}
 if(action==='join'&&code.length!==6){toast('Digite o código de seis caracteres da sala.');return}
 if(action==='create'&&!eligible(id)){toast('Conclua o caso anterior primeiro.');return}
 closeNet();
 net.name=name||'Pesquisador';campaignLocal.name=net.name;
 net.room=action==='join'?code:'';net.mode=mode;net.size=size;net.slot=-1;net.playerId='pending';net.role='guest';net.caseId=id;
 campaignLocal.pendingToken=(action==='join'&&campaignLocal.identities?.[code])||cToken();
 const recovery=(document.getElementById('recoveryKey')?.value||'').trim();
 if(action==='join'&&/^[a-f0-9]{48}$/i.test(recovery))campaignLocal.pendingToken=recovery.toLowerCase();
 cSave();s.view='room';render();campaignConnect(action);
}
makeRoom=function(){campaignMakeSession('create')};
enterRoom=function(){campaignMakeSession('join')};
newMultiplayerCase=function(id){if(!campaignReady()||net.paused)return toast('Aguardem todos retornarem para começar.');if(net.role!=='host')return toast('Somente a coordenação inicia diretamente.');campaignPush({op:'start',caseId:id})};
const originalSendProgress=sendProgress;
sendProgress=function(){if(!net.inGame||!campaignReady())return;campaignPush({op:'progress',caseId:s.caseId,evidence:net.mode==='coop'?s.evidence:[],witness:net.mode==='coop'?s.witness:[],boardSolved:net.mode==='coop'&&s.boardSolved,puzzleSolved:net.mode==='coop'&&s.puzzleSolved,roleContributions:s.roleContributions||{},completed:!!s.outcome,outcome:s.outcome,score:score()})};
voteTheory=function(){if(s.evidence.length<requiredClues()||!s.selectedTheory)return;if(net.inGame&&net.mode==='coop'){
  if(net.paused){toast('Partida pausada enquanto um pesquisador está ausente.');return}
  if(!specialistCanDo()){toast('Registrem os pareceres dos pesquisadores.');return}
  campaignPush({op:'vote',kind:'theory',choice:s.selectedTheory});return;
 }s.theory=s.selectedTheory;move('confrontation')};
voteEnd=function(id){if(!canDo(c().outcomes[id].needs))return;if(net.inGame&&net.mode==='coop'){
  if(net.paused){toast('A votação está pausada até todos retornarem.');return}
  campaignPush({op:'vote',kind:'end',choice:id});return;
 }s.outcome=id;s.dailyOutcomeDate=localDay();move('ending')};
chooseCase=function(id){if(!CASES[id]||!eligible(id))return toast('Arquivo bloqueado.');if(isMulti()){
 if(net.inGame)return toast('Encerrem a missão no Instituto antes de selecionar outra.');
 campaignPush({op:'nominate',caseId:id});toast('Voto enviado para a próxima investigação.');return;
 }setupCase(id,false)};
function campPage(){
 const state=net.teamCaseHistory||[],voters=Object.keys(net.nextVotes||{}).length;
 return `<section class="section roomPage campPage"><div class="eyebrow">♜ Instituto do Véu · sala ${esc(net.room)}</div><h2>Intervalo da expedição</h2><p>${esc(net.status)}. Vocês podem visitar a loja e a sede sem perder seus lugares na sala.</p><div class="expeditionStats"><div><small>COFRE DO GRUPO</small><b>${net.bank||0} ◈</b></div><div><small>MISSÕES ENCERRADAS</small><b>${state.length}</b></div><div><small>ONLINE</small><b>${connectedPlayers().length}/${net.size}</b></div></div>
 <div class="partyRoster">${playerRoster()}</div>
 ${net.paused?'<div class="notice">⏳ Aguardando os integrantes desconectados. A sala e as posições continuam reservadas.</div>':''}
 <h3>Preparação entre missões</h3><div class="prepButtons"><button data-view="shop" class="btn outline">✧ Loja de equipamentos</button><button data-view="office" class="btn outline">♜ Minha sede</button><button data-view="contracts" class="btn outline">▤ Contratos</button></div>
 <h3>Cofre coletivo</h3><p>Além dos seus créditos individuais, a equipe recebe 50 ◈ por missão inédita concluída nesta expedição. Você também pode contribuir voluntariamente.</p>
 <div class="prepButtons"><button data-action="donate-team" class="btn outline" ${saved.wallet<25?'disabled':''}>Depositar 25 ◈</button>${Object.entries(OFFICE_ROOMS).map(([id,r])=>`<button class="btn outline" data-team-upgrade="${id}" ${(net.teamUpgrades||{})[id]||net.bank<r.cost||net.role!=='host'?'disabled':''}>${net.teamUpgrades?.[id]?'✓ '+r.name:r.name+' · '+r.cost+' ◈'}</button>`).join('')}</div>
 <h3>Escolher a próxima investigação</h3><p>Votem no próximo caso. Maioria absoluta após todos votarem inicia a nova missão. Se não houver maioria, a votação recomeça. ${voters}/${net.size} votos.</p>
 <div class="campCaseGrid">${keys.filter(eligible).map(id=>`<button data-nominate="${id}" class="campCase"><img src="${CASES[id].image}" alt=""/><span><b>${esc(CASES[id].number)} · ${esc(CASES[id].short)}</b><small>${esc(difficulty(id))}${net.nextVotes?.[String(net.slot)]===id?' · ✓ Seu voto':''}</small></span></button>`).join('')}</div>
 <button class="btn outline" data-action="show-recovery">🔑 Copiar minha chave de retorno</button><button class="btn outline" data-action="reconnect-expedition">⟳ Atualizar sala / Reconectar</button><button class="btn ghost" data-action="leave-room">Sair mantendo meu progresso</button></section>`;
}
const oldRoom=room;
room=function(){
 const base=oldRoom();
 return base.replace('O anfitrião inicia o caso quando o grupo estiver completo.','A coordenação inicia quando todos estiverem conectados.').replace('Sair da sala','Sair preservando a expedição') + `<section class="section roomPage"><div class="notice">🔒 Identidade permanente: anote sua chave de recuperação para voltar em outro celular. O código da sala sozinho não identifica você.</div><button class="btn outline" data-action="show-recovery">Mostrar minha chave de retorno</button></section>`;
};
const oldRoomMenu=roomMenu;
roomMenu=function(){
 let h=oldRoomMenu();
 h=h.replace('A sala começa apenas quando todos os lugares estiverem ocupados. Requer internet e serviço PeerJS; para jogar de aparelhos diferentes, publique o arquivo HTML num endereço HTTPS.', 'Expedições persistentes: servidor WebSocket obrigatório. Salas mantêm posições e progresso mesmo se o coordenador sair. Para acessar de diferentes celulares, use o endereço publicado do servidor.');
 const extra=`<label class="fieldLabel" for="serverAddress">Servidor online (opcional quando o site e servidor estão no mesmo endereço)</label><input id="serverAddress" class="fieldInput" placeholder="https://seu-servidor.exemplo.com" value="${esc(localStorage.getItem(CAMPAIGN_ENDPOINT_KEY)||'')}"/><label class="fieldLabel" for="recoveryKey">Chave pessoal de recuperação (opcional)</label><input id="recoveryKey" class="fieldInput" placeholder="Somente para recuperar outro aparelho" autocomplete="off"/>`;
 return h.replace('<button class="btn outline" data-action="join">',extra+'<button class="btn outline" data-action="join">') + (campaignLocal.currentRoom?`<section class="section"><button class="btn" data-action="resume-expedition">↻ Retomar expedição ${esc(campaignLocal.currentRoom)}</button></section>`:'');
};
const oldEnding=ending;
ending=function(){let h=oldEnding();if(isMulti())h=h.replace('</section>',`<div class="notice">Esta expedição continua aberta mesmo após o caso. Na próxima etapa vocês podem comprar ferramentas, ampliar o Instituto e votar na próxima investigação.</div><button class="btn" data-action="return-camp" ${net.role==='host'?'':'disabled'}>${net.role==='host'?'♜ Encerrar a missão e ir ao Instituto':'Aguardando a coordenação abrir o intervalo'}</button></section>`);return h};
const oldRenderCampaign=render;
render=function(){if(s.view==='camp'){
 const original=oldRenderCampaign; // preserva a mesma moldura visual das demais telas
 oldRender();app.innerHTML=`<main class="noNav">${campPage()}</main>`;
 if(isMulti()){const banner=document.createElement('div');banner.className='connectionBanner '+(net.paused?'paused':'connected');banner.innerHTML=`<span>${net.paused?'◷ Aguardando reconexão':'● Sala '+esc(net.room)+' · '+connectedPlayers().length+'/'+net.size+' online'}</span>`;app.prepend(banner)}
 }else oldRenderCampaign()};
const oldHandleClick=handleClick;
app.addEventListener('click',evt=>{
 const target=evt.target.closest('[data-team-upgrade],[data-nominate],[data-action]');
 if(!target)return;
 const a=target.dataset.action;
 if(target.dataset.teamUpgrade){evt.stopImmediatePropagation();evt.preventDefault();campaignPush({op:'upgrade',item:target.dataset.teamUpgrade});return}
 if(target.dataset.nominate){evt.stopImmediatePropagation();evt.preventDefault();chooseCase(target.dataset.nominate);return}
 if(['donate-team','return-camp','show-recovery','resume-expedition','reconnect-expedition','leave-room','go-camp'].includes(a)){
   evt.stopImmediatePropagation();evt.preventDefault();
   if(a==='leave-room'){campaignLocal.active=false;cSave();closeNet();s=hydrate(saved.current);move('collection');return}
   if(a==='donate-team'){if(!campaignReady()||net.paused)return toast('Aguardem a reconexão.');if(saved.wallet<25)return toast('Créditos individuais insuficientes.');saved.wallet-=25;saveWallet();campaignPush({op:'donate',amount:25,tx:cToken()});toast('25 créditos enviados ao cofre coletivo.');return}
   if(a==='return-camp'){campaignPush({op:'camp'});return}
   if(a==='show-recovery'){const secret=recoverIdentity();if(!secret)return toast('Aguardando a identidade da sala.');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(secret).then(()=>toast('Chave copiada. Guarde-a em local privado.')).catch(()=>window.prompt('Sua chave privada de recuperação:',secret));else window.prompt('Sua chave privada de recuperação:',secret);return}
   if(a==='resume-expedition'){const code=campaignLocal.currentRoom;if(!code)return;closeNet();net.room=code;net.name=campaignLocal.name||'Pesquisador';net.slot=-1;net.role='guest';net.mode='coop';s.view='room';render();campaignConnect('join');return}
   if(a==='go-camp'){if(campaignLastPhase==='camp')move('camp');else if(campaignLastPhase==='lobby')move('room');else toast('A missão está em andamento.');return}
   if(a==='reconnect-expedition'){if(s.view==='camp'&&net.online){render();return}if(!net.room)return;campaignStopped=false;campaignConnect('join',true);return}
 }
 if(isMulti() && net.paused && net.inGame){
   // Poderá consultar loja, sede e registros. Ações de missão são congeladas.
   const busy=evt.target.closest('[data-clue],[data-question],[data-color],[data-theory],[data-end],[data-scene],[data-surreal],[data-board-clue],[data-board-choice],[data-gear],[data-office],[data-action="confirm"],[data-action="board-check"],[data-action="role-report"]');
   if(busy){evt.stopImmediatePropagation();evt.preventDefault();toast('Investigação pausada. Aguardando a reconexão da equipe.');}
 }
},true);
// Retomada automática após recarregar a página, se havia uma sessão ativa.
if(campaignLocal.active&&campaignLocal.currentRoom&&campaignLocal.identities?.[campaignLocal.currentRoom]){
 net.room=campaignLocal.currentRoom;net.name=campaignLocal.name||'Pesquisador';net.role='guest';net.mode='coop';net.slot=-1;net.playerId='pending';s.view='room';render();
 setTimeout(()=>campaignConnect('join',true),400);
}
