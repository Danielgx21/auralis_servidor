'use strict';
// Lago Vivo v1.1 — ambientação dinâmica e testemunha com horários reais da investigação.
(function(){
if(typeof render!=='function'||typeof s==='undefined'||typeof app==='undefined'||typeof net==='undefined')return;
const scenes={
 lago:['A névoa sobe entre os juncos.','Uma luz percorre o fundo da água.','O cais geme, mas ninguém aparece.','O reflexo do sino se parte entre as ondas.'],
 casa:['O assoalho estala atrás da porta.','A agulha do rádio vibra sem emissão.','Uma sombra atravessa o espelho atrasada.','Três pancadas ressoam dentro da parede.'],
 capela:['Poeira cai das vigas, sem vento.','Há marcas recentes de água no altar.','O bronze vibra antes da badalada.','A inscrição reflete luz como se estivesse molhada.']
};
const pad=n=>String(n).padStart(2,'0');
const minute=()=>typeof window.manualWorldMinute==='function'?window.manualWorldMinute():null;
const clock=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const live=()=>s.caseId==='lago'&&!s.outcome&&!s.timeFailed&&['hub','scene','witness'].includes(s.view);
const present=m=>m>=1200||m>=300&&m<540;
const nextIria=m=>present(m)?(m>=1200?1440-m:540-m):m<300?300-m:1200-m;
const nextCall=m=>(17-m+1440)%1440||1440;
const call=m=>m>=17&&m<30;
function weather(m){
if(m<50)return ['A hora do chamado','alarm','O sino e as vozes pertencem ao mesmo instante.'];
if(m>=1380||m<300)return ['Névoa fechada','mist','A água está escura e a visibilidade diminuiu.'];
if(m>=1140)return ['Chuva fina e crepúsculo','rain','A madeira está úmida e as luzes da vila se apagam.'];
if(m>=300&&m<540)return ['Primeira luz','dawn','O vento leva os últimos ecos da margem.'];
return ['Luz cinzenta','day','O movimento da vila disfarça os sons da represa.'];
}
function panel(){
if(!live()||app.querySelector('.lakeLife'))return;
const main=app.querySelector('main');if(!main)return;
const p=document.createElement('section');p.className='lakeLife';p.setAttribute('aria-label','Ambiente vivo da investigação');
p.innerHTML='<div class="lakeLifeTop"><span>◈ RELATÓRIO DE CAMPO · AO VIVO</span><strong data-lake-clock>--:--</strong></div><div class="lakeLifeForecast"><div><small>CONDIÇÕES</small><b data-lake-weather></b></div><div><small>CHAMADO ÀS 00H17</small><b data-lake-call></b></div></div><p class="lakeLifeDescription" data-lake-desc></p><div class="lakeLifeNpc"><i></i><div><b>Iria Vilar</b><small data-lake-iria></small></div></div>'+
(s.view==='scene'?'<div class="lakeLifeMoment" data-lake-moment hidden><b>◌</b><div><strong>00h17 · Uma voz atravessa o lago</strong><p>Uma voz familiar ecoa da água, mas o sino soa primeiro. Essa sequência pode mudar sua teoria sobre o ritual.</p><button type="button" data-lake-observe>Observar e registrar o fenômeno</button></div></div><p class="lakeLifeDanger" data-lake-danger></p>':s.view==='hub'&&!net.inGame?'<button type="button" class="lakeLifeWait" data-lake-wait>⧖ Aguardar 30 minutos <small>(consome 15 segundos do prazo)</small></button>':'');
p.classList.toggle('lakeLifeCompact',s.view!=='scene');
const hook=app.querySelector('.timeWorldScene,.timeWorldHud,.timeWorldWitness,.landscapeHelp');
(hook||main).insertAdjacentElement(hook?'afterend':'afterbegin',p);
if(s.view==='scene'){
const canvas=app.querySelector('.landscapeCanvas,.lakeBoard,.sceneFrame');
if(canvas&&!canvas.querySelector('.lakeLifeFx')){const fx=document.createElement('div');fx.className='lakeLifeFx';fx.setAttribute('aria-hidden','true');fx.innerHTML='<span class="lakeLifeFog"></span><span class="lakeLifeGlint"></span>';canvas.append(fx)}
}
}
function refresh(){
if(!live())return;const m=minute();if(m===null)return;const w=weather(m);
document.body.dataset.lakeWeather=w[1];
app.querySelectorAll('[data-lake-clock]').forEach(x=>x.textContent=clock(m));
app.querySelectorAll('[data-lake-weather]').forEach(x=>x.textContent=w[0]);
app.querySelectorAll('[data-lake-call]').forEach(x=>x.textContent=nextCall(m)+' min. do jogo');
const details=s.view==='scene'?(scenes[s.activeScene]||scenes.lago)[Math.floor((m+(s.activeScene==='capela'?16:s.activeScene==='casa'?7:0))/11)%4]:w[2];
app.querySelectorAll('[data-lake-desc]').forEach(x=>x.textContent=details);
app.querySelectorAll('[data-lake-iria]').forEach(x=>x.textContent=present(m)?'Presente para entrevista · até '+(m>=1200?'00h00':'09h00'):'Ausente · retorna em '+nextIria(m)+' min. do jogo');
app.querySelectorAll('.lakeLifeNpc').forEach(x=>x.classList.toggle('isAway',!present(m)));
app.querySelectorAll('[data-lake-moment]').forEach(x=>x.hidden=!(s.activeScene==='lago'&&call(m)&&!s.lagoMidnightSeen));
app.querySelectorAll('[data-lake-danger]').forEach(x=>x.textContent=m>=1140||m<300?'◈ Área hostil: permanência prolongada aumenta o risco.':'◈ Exposição moderada: examine o local com atenção.');
app.querySelectorAll('.lakeLifeFx').forEach(x=>x.dataset.phase=w[1]);
}
const before=render;render=function(){before();panel();refresh()};
app.addEventListener('click',e=>{
const wait=e.target.closest('[data-lake-wait]');
if(wait&&live()&&s.view==='hub'&&!net.inGame){
e.preventDefault();e.stopImmediatePropagation();s.timeElapsed=Math.max(0,Number(s.timeElapsed)||0)+15000;persist(false);render();toast('Trinta minutos se passaram. O prazo também avançou.');return;
}
const observe=e.target.closest('[data-lake-observe]');
if(observe&&live()&&s.view==='scene'&&s.activeScene==='lago'&&call(minute())&&!s.lagoMidnightSeen){
e.preventDefault();e.stopImmediatePropagation();if(net.inGame&&net.paused)return toast('Aguardando a equipe reconectar.');
s.lagoMidnightSeen=true;s.lagoFieldNotes=Array.isArray(s.lagoFieldNotes)?s.lagoFieldNotes:[];
const note='Às 00h17, a voz surgiu na água, mas o sino soou primeiro. A sequência dos sons pode revelar quem iniciou o chamado.';
if(!s.lagoFieldNotes.includes(note))s.lagoFieldNotes.unshift(note);
s.lagoFieldNotes=s.lagoFieldNotes.slice(0,18);persist(false);
if(net.inGame&&net.mode==='coop'&&typeof campaignPush==='function')campaignPush({op:'investigation',kind:'note',text:note});
render();toast('Manifestação registrada; a interpretação continua por sua conta.');
}
},true);
setInterval(()=>{if(!document.hidden&&live())refresh()},1000);
render();
})();