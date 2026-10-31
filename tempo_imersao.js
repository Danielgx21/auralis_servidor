'use strict';
/* Manual das Criaturas — imersão e investigação temporal. Mantém os 14 arquivos, sala e pistas existentes. */
(function(){
if(typeof render!=='function'||typeof CASES==='undefined'||typeof s==='undefined')return;
const DAY=24*60, SPEED=2; // 1 segundo real = 2 minutos do jogo.
const ORIGIN={lago:22*60,lago2:19*60,baile:20*60,baile2:21*60,vampiro:8*60,vampiro2:20*60,lobo:18*60,lobo2:18*60,retrato:8*60,retrato2:17*60,estacao:17*60,estacao2:22*60,museu:9*60,museu2:21*60};
const WINDOWS={lago:[[20*60,DAY],[5*60,9*60]],lago2:[[0,4*60],[19*60,23*60]],baile:[[20*60,DAY],[0,4*60]],baile2:[[21*60,DAY],[0,3*60]],vampiro:[[9*60,12*60],[18*60,22*60]],vampiro2:[[21*60,DAY],[0,4*60]],lobo:[[5*60,10*60],[19*60,23*60]],lobo2:[[6*60,10*60],[20*60,DAY]],retrato:[[9*60,13*60],[17*60,21*60]],retrato2:[[10*60,14*60],[18*60,22*60]],estacao:[[6*60,10*60],[18*60,23*60]],estacao2:[[0,4*60],[11*60,15*60]],museu:[[9*60,17*60],[19*60,21*60]],museu2:[[0,4*60],[13*60,18*60]],bolsonaros:[[8*60,12*60],[18*60,21*60]]};
const CATEGORIES=['lake','interior','sacred','woods','crowd','urban'];
const ATMOS={
lake:['Água escura, juncos e vento','Ondas pequenas encontram madeira molhada.','Um reflexo se move na direção contrária à água.'],
interior:['Madeira antiga e rádio distante','A casa estala com o vento nas janelas.','Três pancadas secas vêm da parede, sem explicação.'],
sacred:['Sino e reverberação de pedra','O ar parece vibrar entre os bancos vazios.','O sino oscila levemente sem ser tocado.'],
woods:['Árvores, folhas e galhos','O farfalhar das folhas oculta passos.','Todos os animais se calam ao mesmo tempo.'],
crowd:['Vozes distantes, passos e salão','Uma conversa se perde entre os convidados.','Uma silhueta desaparece no meio das pessoas.'],
urban:['Vento, trilhos e máquinas','Passos ecoam no corredor deserto.','Uma porta se fecha enquanto as luzes tremem.']
};
const ARCHIVE_FX={
lago:['A névoa engole o cais.','Um som conhecido ecoa na represa.'],
lago2:['A água guarda um segredo mais antigo.','O reflexo da margem já não acompanha o tempo.'],
baile:['O salão parece mudar de tamanho.','Uma máscara observa você por mais tempo do que deveria.'],
baile2:['A música erra uma nota e ninguém percebe.','Há convidados que não aparecem no espelho.'],
vampiro:['As sombras se alongam no corredor.','Um ruído grave acompanha seus passos.'],
vampiro2:['A noite esconde uma presença próxima.','Um sussurro indica o caminho errado.'],
lobo:['O bosque ficou silencioso.','Os galhos estalam logo atrás de você.'],
lobo2:['As pegadas somem entre as árvores.','O ar parece mais frio do que antes.'],
retrato:['O olhar pintado parece acompanhar você.','Um corredor antes vazio agora está escuro.'],
retrato2:['Uma moldura se move discretamente.','Um retrato parece ter mudado.'],
estacao:['Os trilhos vibram sem trem à vista.','O relógio da plataforma atrasa.'],
estacao2:['Uma voz surge no sistema de som desligado.','A última plataforma fica mais escura.'],
museu:['Uma vitrine produz um estalo seco.','Uma sombra passa por uma exposição vazia.'],
museu2:['O silêncio do museu é quase absoluto.','Um objeto aparece fora do lugar.'],
bolsonaros:['Os estandartes se agitam sem vento.','Um juramento antigo sai da boca de alguém que estava calado.']
};
const runtime={cloud:null,at:0,scene:'',since:0,risktick:0,nextEvent:0,sound:null,ambient:null,lastFailure:null,heartbeat:0,rendering:false,phase:'',lastView:''};
let autoAmbient=true;
try{autoAmbient=localStorage.getItem('manual_scene_ambient_auto_v1')!=='off'}catch{}
function setAudioPreference(on){
 autoAmbient=!!on;try{localStorage.setItem('manual_scene_ambient_auto_v1',on?'on':'off')}catch{}
}
function updateAmbientButton(){
 const btn=app.querySelector('[data-time-audio]');if(btn)btn.textContent=runtime.ambient?'♫ Desligar som':'♫ Ouvir local';
}
const pad=n=>String(n).padStart(2,'0');
const limit=id=>({Iniciante:20,Intermediário:23,Avançado:26}[CASES[id]?.difficulty]||23)*60000;
const eligibleView=v=>['hub','scene','witness','dossier','board','theory','confrontation','brief'].includes(v);
function initSolo(){
if(net.inGame||!eligibleView(s.view)||s.outcome||s.timeFailed)return;
if(!Number.isFinite(s.timeElapsed))s.timeElapsed=0;
if(!s.timeFrom&&!document.hidden){s.timeFrom=Date.now();safeSave();}
}
const previousPersist=persist;
function safeSave(){try{previousPersist(false)}catch(e){}}
function ms(){
if(net.inGame&&runtime.cloud){let c=runtime.cloud;return Math.max(0,Number(c.elapsedMs||0)+(c.running?Date.now()-runtime.at:0))}
if(!Number.isFinite(s.timeElapsed))s.timeElapsed=0;
return Math.max(0,s.timeElapsed+(s.timeFrom?Date.now()-s.timeFrom:0));
}
function min(){return ((ORIGIN[s.caseId]||20*60)+Math.floor(ms()/1000)*SPEED)%DAY}
window.manualWorldMinute=min;
function night(){let t=min();return t<6*60||t>=19*60}
function formatTime(){let m=min();return pad(Math.floor(m/60))+':'+pad(m%60)}
function formatLeft(){let left=Math.max(0,(runtime.cloud?.durationMs&&net.inGame?runtime.cloud.durationMs:limit(s.caseId))-ms());return pad(Math.floor(left/60000))+':'+pad(Math.floor(left/1000)%60)}
function isWaiting(){return net.inGame&&(net.paused||runtime.cloud&&!runtime.cloud.running)}
function presence(){return (WINDOWS[s.caseId]||[[8*60,17*60]]).some(w=>min()>=w[0]&&min()<w[1])}
// A mesma disponibilidade rege diálogos normais e perguntas por evidências.
window.manualWitnessPresent=presence;
function hours(){return (WINDOWS[s.caseId]||[]).map(w=>pad(Math.floor(w[0]/60))+':'+pad(w[0]%60)+'–'+pad(Math.floor(w[1]/60))+':'+pad(w[1]%60)).join(' / ')}
function kind(){let ix=Object.keys(CASES[s.caseId]?.scenes||{}).indexOf(s.activeScene);
if(s.caseId.startsWith('lago'))return ['lake','interior','sacred'][ix]||'lake';
if(s.caseId.startsWith('lobo'))return ix===0?'woods':'interior';
if(s.caseId.startsWith('baile'))return ix===0?'crowd':'interior';
if(s.caseId.startsWith('estacao'))return ix===0?'urban':'interior';
if(s.caseId==='bolsonaros')return ix===0?'crowd':ix===1?'interior':'sacred';
return ix===2?'sacred':'interior';
}
function dangerous(){return night()&&(kind()==='lake'||kind()==='woods'||/vampiro|museu2|estacao2/.test(s.caseId))}
function label(){if(s.timeFailed)return 'PRAZO ESGOTADO';if(isWaiting())return 'AGUARDANDO EQUIPE';if(ms()>limit(s.caseId)-180000)return 'ÚLTIMOS MINUTOS';return night()?'NOITE':'DIA'}
function hud(){
if(!eligibleView(s.view)||!CASES[s.caseId])return;
const main=app.querySelector('main');if(!main||main.querySelector('.timeWorldHud'))return;
const h=document.createElement('div');h.className='timeWorldHud';h.innerHTML='<div><small>HORA DA INVESTIGAÇÃO</small><strong data-time-world>'+formatTime()+'</strong></div><div><small>RESTANTE</small><strong data-time-left>'+formatLeft()+'</strong></div><span data-time-phase>'+label()+'</span>';
main.prepend(h);
}
function scenePanel(){
if(s.view!=='scene')return;
const anchor=app.querySelector('.lakeSceneHelp,.landscapeHelp,.sceneIntro');
if(!anchor||app.querySelector('.timeWorldScene'))return;
const mode=ATMOS[kind()];
const wrap=document.createElement('section');wrap.className='timeWorldScene';
wrap.innerHTML='<div class="timeWorldSceneHead"><div><small>AMBIENTE SONORO</small><strong>'+mode[0]+'</strong><p>'+mode[1]+'</p></div><button type="button" data-time-audio>♫ '+(runtime.ambient?'Desligar som':'Ouvir local')+'</button></div><div class="timeWorldRisk"><span data-time-risk-title>Vigilância do ambiente</span><i><b data-time-risk-fill style="width:'+(s.timeStress||0)+'%"></b></i><strong data-time-risk-count>'+(s.timeStress||0)+'%</strong></div><p data-time-advice>O lugar muda de acordo com o horário e com o tempo que você permanece nele.</p>';
anchor.after(wrap);
const canvas=app.querySelector('.lakeBoard,.landscapeCanvas,.sceneFrame');
if(canvas&&!canvas.querySelector('.timeWorldLighting')){let v=document.createElement('div');v.className='timeWorldLighting';v.setAttribute('aria-hidden','true');if(getComputedStyle(canvas).position==='static')canvas.style.position='relative';canvas.append(v)}
}
function witnessPanel(){
if(s.view!=='witness')return;const q=app.querySelector('[data-question]');if(!q||app.querySelector('.timeWorldWitness'))return;
let w=document.createElement('div');w.className='timeWorldWitness';w.innerHTML='<b data-time-witness></b><p>Horários em que esta testemunha costuma estar aqui: '+hours()+'. Fora desse período, ela não poderá responder.</p>';q.before(w);
app.querySelectorAll('[data-question],[data-lake-interview]').forEach(e=>e.dataset.wasDisabled=e.disabled?'true':'false');
updateWitness();
}
function updateWitness(){
if(s.view!=='witness')return;
const present=presence();
app.querySelectorAll('[data-question],[data-lake-interview]').forEach(b=>{b.disabled=!present||b.dataset.wasDisabled==='true';b.classList.toggle('timeWitnessAbsent',!present)});
const t=app.querySelector('[data-time-witness]');if(t)t.textContent=present?'● TESTEMUNHA PRESENTE':'◌ TESTEMUNHA AUSENTE';
app.querySelectorAll('[data-lake-interview-status]').forEach(e=>{e.textContent=present?'Iria está presente: você pode confrontar as provas com ela.':'Iria não está aqui. Os confrontos ficarão disponíveis no próximo horário de atendimento.';e.classList.toggle('timeWitnessAbsent',!present)});
}
function showEvent(){
if(app.querySelector('.timeEvent')||s.modal||s.outcome||s.timeFailed)return;
const hints=ARCHIVE_FX[s.caseId]||ATMOS[kind()].slice(2);const id=(s.timeEvents||0)%hints.length;
const popup=document.createElement('div');popup.className='timeEvent';popup.innerHTML='<article><small>◈ ACONTECIMENTO INESPERADO</small><h2>'+hints[id]+'</h2><p>O que você faz? O relógio continua correndo.</p><div><button data-time-event="examine">Examinar o fenômeno</button><button data-time-event="retreat">Recuar por segurança</button></div></article>';
app.append(popup);s.timeEvents=(s.timeEvents||0)+1;safeSave();pulse(140,1,.10);
}
// Recuos fazem parte da investigação: o jogador precisa se afastar para se recuperar.
// Prazos absolutos são persistidos com o progresso do caso e resistem ao recarregamento.
const VOLUNTARY_COOLDOWN_MS=90_000, FORCED_COOLDOWN_MS=180_000;
function sceneLocks(){if(!s.sceneCooldowns||typeof s.sceneCooldowns!=='object')s.sceneCooldowns={};return s.sceneCooldowns;}
function remainingLock(id){return Math.max(0,Number(sceneLocks()[id]||0)-Date.now());}
function formatLock(id){const left=Math.ceil(remainingLock(id)/1000);return Math.floor(left/60)+':'+pad(left%60);}
function leaveHazard(force=false,fromEvent=false){
 if(s.view!=='scene'||!s.activeScene)return false;
 const key=s.activeScene;
 const activeDanger=dangerous()||(s.timeStress||0)>0||fromEvent;
 if(!force&&!activeDanger)return false;
 const duration=force?FORCED_COOLDOWN_MS:VOLUNTARY_COOLDOWN_MS;
 sceneLocks()[key]=Math.max(Number(sceneLocks()[key]||0),Date.now()+duration);
 if(force){
  // Expulsão pela ameaça: maior bloqueio e 45 segundos de prazo consumidos no solo.
  if(!net.inGame){s.timeElapsed=ms()+45_000;s.timeFrom=null;if(!document.hidden)s.timeFrom=Date.now();}
  s.timeStress=72;
 }else{
  s.timeStress=Math.max(0,(s.timeStress||0)-12);
 }
 s.view='hub';s.modal=null;
 safeSave();
 toast(force?'Perigo extremo! Você foi expulso. Retorno bloqueado por 3 min e prazo reduzido em 45 s.':'Retirada por segurança. Este local ficará bloqueado por 1 min e 30 s.');
 render();
 return true;
}
function lockCards(){
 if(s.view!=='hub')return;
 app.querySelectorAll('[data-scene]').forEach(node=>{
  const id=node.dataset.scene;if(!id)return;
  const delay=remainingLock(id);const label=node.querySelector('.timeSceneLock');
  if(delay<=0){node.classList.remove('timeSceneLocked');node.removeAttribute('aria-disabled');if(label)label.remove();return;}
  node.classList.add('timeSceneLocked');node.setAttribute('aria-disabled','true');
  const holder=label||document.createElement('span');holder.className='timeSceneLock';holder.textContent='⏳ Retorno em '+formatLock(id);
  if(!label)node.append(holder);
 });
}
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-scene],[data-view="hub"]');
 if(!target||!CASES[s.caseId])return;
 if(target.hasAttribute('data-scene')&&s.view==='hub'){
  if(remainingLock(target.dataset.scene)>0){
   event.preventDefault();event.stopImmediatePropagation();
   toast('Local temporariamente bloqueado. Retorno em '+formatLock(target.dataset.scene)+'.');return;
  }
 }
 if(target.getAttribute('data-view')==='hub'&&s.view==='scene'){
  if(dangerous()||(s.timeStress||0)>0){
   event.preventDefault();event.stopImmediatePropagation();leaveHazard(false,false);
  }
 }
},true);

function tickRisk(){
if(s.view!=='scene'||document.hidden||isWaiting()||s.outcome||s.timeFailed)return;
let passed=Date.now()-runtime.since;
if(Date.now()-runtime.risktick>12000&&passed>(dangerous()?22000:49000)){
 runtime.risktick=Date.now();s.timeStress=Math.min(100,(s.timeStress||0)+(dangerous()?10:3));safeSave();
 if(s.timeStress>=100){leaveHazard(true,false);return;}
}
if(Date.now()>=runtime.nextEvent&&passed>23000&&!app.querySelector('.timeEvent')){runtime.nextEvent=Date.now()+65000;showEvent();}
const risk=app.querySelector('[data-time-risk-fill]');if(risk)risk.style.width=(s.timeStress||0)+'%';
const value=app.querySelector('[data-time-risk-count]');if(value)value.textContent=(s.timeStress||0)+'%';
const title=app.querySelector('[data-time-risk-title]');if(title)title.textContent=dangerous()?'PERIGO · TEMPO DE EXPOSIÇÃO':'OBSERVAÇÃO · BAIXO RISCO';
const advice=app.querySelector('[data-time-advice]');if(advice)advice.textContent=dangerous()?'À noite, ficar muito tempo aqui aumenta o risco. Considere voltar aos locais.':'O ambiente está mais seguro neste horário, mas permaneça atento.';
}
function checkLimit(){
if(!eligibleView(s.view)||s.outcome||s.timeFailed||ms()<limit(s.caseId))return;
if(net.inGame){if(net.online&&Date.now()-runtime.heartbeat>3000){runtime.heartbeat=Date.now();campaignPush({op:'heartbeat'})}return;}
s.timeFailed=true;s.timeFrom=null;s.timeElapsed=limit(s.caseId);safeSave();stopSound();render();
}
function failure(){
if(!s.timeFailed||app.querySelector('.timeWorldFailure'))return;let node=document.createElement('div');node.className='timeWorldFailure';
node.innerHTML='<article><small>O TEMPO ACABOU</small><h2>A investigação não foi concluída a tempo.</h2><p>Você conservou os equipamentos e o histórico, mas esta tentativa precisa ser reiniciada sem receber recompensa.</p><button data-time-retry>Tentar novamente</button><button data-time-exit>Voltar aos arquivos</button></article>';
app.append(node);
}
function syncScene(){
const newScene=s.view==='scene'?s.caseId+'/'+s.activeScene:'';
if(newScene!==runtime.scene){if(!newScene)stopSound();else if(runtime.ambient)adaptSound();runtime.scene=newScene;runtime.since=Date.now();runtime.risktick=Date.now();runtime.nextEvent=Date.now()+35000;}
}
const previousRender=render;
render=function(){previousRender();if(!CASES[s.caseId])return;initSolo();syncScene();hud();scenePanel();witnessPanel();failure();lockCards();refresh()};
const previousCampaign=typeof applyCampaign==='function'?applyCampaign:null;
if(previousCampaign)applyCampaign=function(state,initial){if(state&&state.worldClock){runtime.cloud=state.worldClock;runtime.at=Date.now()}if(state?.lastFailure&&state.lastFailure.timestamp!==runtime.lastFailure){runtime.lastFailure=state.lastFailure.timestamp;toast('O prazo da expedição terminou; o grupo retornou ao Instituto.')}return previousCampaign(state,initial)};
function refresh(){
if(!CASES[s.caseId])return;document.body.dataset.timeLight=night()?'night':'day';
app.querySelectorAll('[data-time-world]').forEach(e=>e.textContent=formatTime());
app.querySelectorAll('[data-time-left]').forEach(e=>e.textContent=formatLeft());
app.querySelectorAll('[data-time-phase]').forEach(e=>e.textContent=label());
updateWitness();lockCards();tickRisk();checkLimit();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(!net.inGame&&s.timeFrom){s.timeElapsed=ms();s.timeFrom=null;safeSave()}suspendSound()}else{initSolo();resumeSound();render()}});
window.addEventListener('pagehide',()=>{if(!net.inGame&&s.timeFrom){s.timeElapsed=ms();s.timeFrom=null;safeSave()}});
// Bloquear qualquer tentativa de registrar uma resposta fora do horário, mesmo se o botão estiver desatualizado.
app.addEventListener('click',ev=>{
 if(s.view!=='witness'||!ev.target.closest('[data-question],[data-lake-interview]')||presence())return;
 ev.preventDefault();ev.stopImmediatePropagation();
 toast('A testemunha está ausente. Volte no horário indicado para entrevistá-la.');
},true);
app.addEventListener('click',ev=>{
const b=ev.target.closest('[data-time-audio],[data-time-event],[data-time-retry],[data-time-exit]');if(!b)return;
ev.preventDefault();ev.stopImmediatePropagation();
if(b.hasAttribute('data-time-audio')){toggleSound();render();return}
if(b.dataset.timeEvent){app.querySelector('.timeEvent')?.remove();if(b.dataset.timeEvent==='examine'){s.timeStress=Math.min(100,(s.timeStress||0)+(dangerous()?16:7));s.trust=(s.trust||0)+1;toast('Fenômeno observado: +1 confiança, com aumento do risco.')}else{leaveHazard(false,true);return;}safeSave();render();return}
if(b.hasAttribute('data-time-retry')){if(net.inGame)return toast('O grupo escolhe a próxima missão no Instituto.');const id=s.caseId;saved.cases[id]=blank(id);setupCase(id,true);return}
if(b.hasAttribute('data-time-exit'))move('collection');
},true);
const CSS='.timeWorldHud{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:12px;margin:8px 12px 15px;background:linear-gradient(120deg,#102e36,#091a22);border:1px solid #bd9a6c77;border-radius:12px}.timeWorldHud small{display:block;font:700 9px system-ui;letter-spacing:.09em;color:#a9bec1}.timeWorldHud strong{font:700 21px ui-monospace,monospace;color:#f0d7aa;display:block;margin-top:4px}.timeWorldHud>span{font:700 10px system-ui;color:#e9c995;background:#30424a;padding:8px;border-radius:99px}.timeWorldScene{margin:13px 11px;padding:14px;border:1px solid #b9a07377;border-radius:13px;background:linear-gradient(120deg,#122c35,#0c1c27);color:#eadac5}.timeWorldSceneHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.timeWorldSceneHead small{color:#b2c5c8;letter-spacing:.11em;font:700 9px system-ui}.timeWorldSceneHead strong{display:block;margin-top:6px;font:600 15px system-ui}.timeWorldSceneHead p,.timeWorldScene>p{color:#c9d0cc;font:12px/1.6 system-ui}.timeWorldScene button{min-width:102px;padding:10px;border-radius:9px;background:#354d58;border:1px solid #e1c39788;color:#f8e2ba}.timeWorldRisk{display:flex;gap:8px;align-items:center}.timeWorldRisk span{font:700 9px system-ui;flex:1}.timeWorldRisk>i{height:8px;background:#071620;border-radius:99px;overflow:hidden;flex:1}.timeWorldRisk>i>b{display:block;height:100%;background:linear-gradient(90deg,#85a6a7,#d6a86d,#ae5551)}.timeWorldRisk>strong{font:700 12px monospace}.timeWorldLighting{position:absolute;inset:0;pointer-events:none;z-index:1}body[data-time-light=night] .timeWorldLighting{background:linear-gradient(135deg,#02142445,#000d2770)}body[data-time-light=day] .timeWorldLighting{background:radial-gradient(circle at 16% 14%,#ecdf9b24,transparent 65%)}.timeWorldWitness{padding:12px;background:#152c33;border:1px solid #d3ae7b6f;border-radius:10px;margin:12px 0}.timeWorldWitness b{color:#f3d9a7;font-size:12px}.timeWorldWitness p{font-size:11px;line-height:1.5}.timeWitnessAbsent{opacity:.45}.timeEvent,.timeWorldFailure{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#020a11de;padding:20px;backdrop-filter:blur(7px)}.timeEvent article,.timeWorldFailure article{max-width:430px;width:100%;padding:26px;background:linear-gradient(145deg,#182e37,#201925);border:1px solid #d5b68188;border-radius:15px;box-shadow:0 20px 60px #000a}.timeEvent small,.timeWorldFailure small{color:#e0b983;font:700 10px system-ui;letter-spacing:.14em}.timeEvent h2,.timeWorldFailure h2{font:600 25px/1.28 Georgia,serif;color:#f3ddbc}.timeEvent p,.timeWorldFailure p{color:#d3d0cd;line-height:1.6}.timeEvent article>div{display:flex;gap:9px}.timeEvent button,.timeWorldFailure button{padding:13px;border-radius:9px;background:#71553f;border:1px solid #dcc28d9a;color:#f7e2c6;font:700 12px system-ui;flex:1}.timeWorldFailure button{width:100%;margin-top:10px}@media(max-width:380px){.timeWorldSceneHead{flex-direction:column;align-items:stretch}.timeWorldHud strong{font-size:18px}.timeEvent article>div{flex-direction:column}}';
const sheet=document.createElement('style');sheet.textContent=CSS+'.refinePanel{display:none!important}.timeSceneLocked{position:relative;opacity:.67;filter:saturate(.65)}.timeSceneLock{display:block;margin-top:5px;padding:7px 9px;background:#502f29;color:#ffdfba;border:1px solid #b9926f;border-radius:5px;font:700 12px/1.4 system-ui;text-align:center;pointer-events:none}.timeSceneLocked:is(:hover,:focus-visible){outline:2px solid #d5ae86}';document.head.append(sheet);
function pulse(f,d=0.5,v=.06){const a=runtime.ambient;if(!a)return;try{let t=a.ctx.currentTime;let o=a.ctx.createOscillator(),g=a.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.72),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.master);o.start(t);o.stop(t+d+.04)}catch(e){}}
function stopSound(){let a=runtime.ambient;if(!a)return;try{a.source.stop();a.drone.stop();a.ctx.close()}catch(e){}runtime.ambient=null;try{window.manualCinematicSound?.stop?.()}catch{}updateAmbientButton()}
function toggleSound(automatic=false){
if(runtime.ambient){if(!automatic)setAudioPreference(false);stopSound();return}
if(!automatic)setAudioPreference(true)
const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx){toast('Seu navegador não oferece áudio Web Audio.');return}
try{if(typeof ambientStop==='function'&&sound.playing)ambientStop();let ctx=new Ctx();let master=ctx.createGain();master.gain.value=.12;master.connect(ctx.destination);
let buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),arr=buffer.getChannelData(0),sum=0;
for(let i=0;i<arr.length;i++){sum=(sum+(Math.random()*2-1)*.025)/1.025;arr[i]=sum*3}
let source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;let filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind()==='woods'?1800:kind()==='lake'?550:900;source.connect(filter);filter.connect(master);source.start();
let drone=ctx.createOscillator(),gain=ctx.createGain();drone.frequency.value=kind()==='sacred'?92:kind()==='interior'?65:100;drone.type='sine';gain.gain.value=.035;drone.connect(gain);gain.connect(master);drone.start();ctx.resume();runtime.ambient={ctx,master,source,drone,filter};try{window.manualCinematicSound?.start?.()}catch{}updateAmbientButton();if(!automatic)toast('Som ambiente ligado. Use o volume de mídia do celular.');
}catch(e){stopSound();if(!automatic)toast('Toque novamente para permitir o áudio.')}
}

/* Web Audio no celular requer gesto: primeiro toque num local inicia o ambiente.
   Os demais acessos permanecem automáticos até o jogador desligar o som. */
function autoAmbientOnGesture(event){
 if(runtime.ambient?.ctx?.state==='suspended'){try{runtime.ambient.ctx.resume()}catch{}}
 if(!autoAmbient||runtime.ambient||document.hidden||s.outcome||s.timeFailed||(net.inGame&&net.paused))return;
 const target=event.target;
 if(!target||typeof target.closest!=='function')return;
 const card=target.closest('[data-scene]');
 if(!card&&s.view!=='scene')return;
 if(card&&card.disabled)return;
 toggleSound(true);
}
document.addEventListener('pointerdown',autoAmbientOnGesture,{capture:true,passive:true});
document.addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&event.target?.closest?.('[data-scene]'))autoAmbientOnGesture(event);
},true);

function adaptSound(){const a=runtime.ambient;if(!a)return;let cfg=kind(),filterHz=cfg==='woods'?1800:cfg==='lake'?550:cfg==='sacred'?660:900;let freq=cfg==='sacred'?92:cfg==='interior'?65:cfg==='lake'?75:cfg==='woods'?125:100;try{a.filter.frequency.setTargetAtTime(filterHz,a.ctx.currentTime,.35);a.drone.frequency.setTargetAtTime(freq,a.ctx.currentTime,.35)}catch(e){}}
function suspendSound(){try{runtime.ambient?.ctx.suspend()}catch(e){}}
function resumeSound(){try{runtime.ambient?.ctx.resume()}catch(e){}}
setInterval(()=>{if(net.inGame&&net.online&&typeof campaignPush==='function'&&campaignReady()&&Date.now()-runtime.heartbeat>7000){runtime.heartbeat=Date.now();campaignPush({op:'heartbeat'})}if(!document.hidden)refresh()},1000);
render();
})();