(function(){
'use strict';
const E=window.FendaEngine,C=window.SigilsCore;
if(!E||!C){console.error('Fenda: dependências indisponíveis');return;}
const S=E.state,$=id=>document.getElementById(id),stage=$('stage');
const cv=document.createElement('canvas');cv.id='fendaCanvas';
cv.setAttribute('aria-label','Fenda dos Sigilos: mapa MOBA de três rotas');
stage.insertBefore(cv,stage.firstChild.nextSibling);
const ctx=cv.getContext('2d',{alpha:false});
const hud=document.createElement('div');hud.id='fendaHUD';
hud.innerHTML='<div class="fenda-meta"><button id="fendaScoreBtn" type="button" title="Abrir o placar da partida (TAB)" aria-label="Abrir placar dos dois times"><span id="fendaTopScore">AZUL 0 × 0 RUBRO</span> <span class="fenda-score-icon">☷</span></button><span id="fendaPlayerStats">K/D/A 0/0/0 · FARM 0</span><div id="fendaGold">✦ 0 OURO</div><div id="fendaTime">00:00</div></div>'+
'<div class="fenda-personal"><div class="fenda-name" id="fendaName">CAMPEÃO · NV 1</div><div class="fenda-bar"><i id="fendaHP"></i></div><div class="fenda-bar mana"><i id="fendaMana"></i><span id="fendaManaText">MANA 320/320</span></div><div class="fenda-bar xp"><i id="fendaXP"></i></div></div>'+
'<div class="fenda-actions"><button id="fendaShopBtn">⚒ LOJA</button><button id="fendaRecallBtn">⌂ RETORNO</button><button id="fendaCameraBtn" type="button" title="Alternar câmera travada/livre · Y" aria-label="Alternar modo da câmera">◎ TRAVADA</button><button id="fendaPauseBtn">Ⅱ</button></div>'+
'<button id="fendaTowerBtn" title="Priorizar obelisco no AA" aria-label="Atacar torre ou núcleo com o ataque básico">⬡<small>TORRE</small></button>'+
'<canvas id="fendaMinimap" width="220" height="152" aria-label="Minimapa tático"></canvas>'+
'<div id="fendaInfo">3 ROTAS · DESTRUA O NÚCLEO INIMIGO</div><div id="fendaObjectives">SERPE · TITÃ</div><div id="fendaNotice"></div>'+
'<button id="fendaWardBtn" aria-label="Colocar sentinela de visão" title="Coloca visão à frente do campeão · Tecla V">◉<small>VISÃO</small><em id="fendaWardCD"></em></button>';
stage.appendChild(hud);
// Partilha sempre no painel do próprio campeão, nunca sobre o mapa.
const shareInfo=document.createElement('div');shareInfo.id='fendaShareInfo';
hud.querySelector('.fenda-personal').appendChild(shareInfo);
// Feitiços ficam fora da área do joystick, com controles próprios de toque.
const summonerPanel=document.createElement('div');summonerPanel.id='fendaSummoners';
summonerPanel.innerHTML=[0,1].map(i=>'<button type="button" class="fenda-summoner" data-slot="'+i+'" aria-label="Usar feitiço '+(i+1)+'"><b>◇</b><small>FEITIÇO</small><span class="spell-effect">EFEITO</span><em></em></button>').join('');
hud.appendChild(summonerPanel);
// Rótulos compactos dos feitiços: todos os seis precisam estar disponíveis
// antes da primeira atualização do HUD, ou o loop de animação é interrompido.
const shortSummonerEffect={
 smite:'DANO / CAÇA',
 flash:'SALTO',
 ignite:'QUEIMADURA',
 heal:'CURA',
 shield:'ESCUDO',
 freecast:'MANA LIVRE'
};
// Escolha da primeira habilidade, como no LoL: um ponto livre em Q, W ou E.
const firstSkillPanel=document.createElement('section');
firstSkillPanel.id='fendaFirstSkillPanel';
firstSkillPanel.setAttribute('aria-label','Escolher primeira habilidade do campeão');
firstSkillPanel.hidden=true;hud.appendChild(firstSkillPanel);
function firstSkillUpdate(h){
 if(!h)return;
 const kit=C.heroes[h.id].skills;
 const pending=h.level===1&&h.skillPoints>0&&
  kit.every(id=>E.skillRank(h,id)===0);
 firstSkillPanel.hidden=!pending;
 if(!pending||firstSkillPanel.dataset.hero===h.id)return;
 firstSkillPanel.dataset.hero=h.id;
 firstSkillPanel.innerHTML='<strong>ESCOLHA SUA PRIMEIRA HABILIDADE</strong>'+
  '<small>1 ponto disponível · Q, W ou E. Ultimate no nível 5.</small>'+
  '<div class="fenda-first-skill-options">'+kit.map((id,i)=>{
   const skill=E.skillDef(id);
   return '<button type="button" data-first-skill="'+i+'" title="'+skill.desc+'">'+
    '<b>'+['Q','W','E'][i]+'</b><span>'+skill.icon+' '+skill.name+'</span></button>';
  }).join('')+'</div>';
 for(const btn of firstSkillPanel.querySelectorAll('[data-first-skill]')){
  btn.addEventListener('click',()=>{
   if(S.mode!=='playing'||S.shopOpen||S.showPause)return;
   const skill=kit[Number(btn.dataset.firstSkill)];
   const result=E.upgradeSkill(S.hero,skill);
   if(!result.ok)warn(result.reason);
   hudUpdate();
  });
 }
}
// Ajuda e descrições ficam na seleção de campeões, sem botão no campo de batalha.
// Interface própria de desktop, independente dos controles de toque.
const desktopBar=document.createElement('section');desktopBar.id='fendaDesktopBar';
desktopBar.setAttribute('aria-label','Painel do campeão');
desktopBar.innerHTML=
 '<div class="pc-champion"><div class="pc-portrait" id="pcPortrait">✦</div><strong id="pcChampionName">CAMPEÃO</strong><span id="pcChampionLevel">NV 1</span></div>'+
 '<div class="pc-vitals"><div class="pc-statline"><strong id="pcHPText">VIDA</strong><span id="pcManaNumber">MANA</span></div>'+
 '<div class="pc-meter pc-hp"><i id="pcHPFill"></i></div><div class="pc-meter pc-mana"><i id="pcManaFill"></i></div>'+
 '<div class="pc-meter pc-xp"><i id="pcXPFill"></i></div><div id="pcExtraStats" class="pc-statfoot">AA PARADO: AUTOMÁTICO</div></div>'+
 '<div class="pc-ability-group"><div class="pc-group-title">HABILIDADES <small>Q · W · E · R</small></div><div class="pc-skills">'+
 [0,1,2,3].map(i=>'<button type="button" id="pcSkill'+i+'" class="pc-skill" data-pc-skill="'+i+'">'+
 '<span class="pc-key">'+['Q','W','E','R'][i]+'</span><b>◇</b><small>—</small>'+
 '<em class="pc-cooldown"></em><span class="pc-rank"></span></button>').join('')+'</div></div>'+
 '<div class="pc-spell-group"><div class="pc-group-title">FEITIÇOS</div><div class="pc-spells">'+
 [0,1].map(i=>'<button type="button" class="pc-spell" data-pc-spell="'+i+'"><span class="pc-key">'+
 (i?'G':'F')+'</span><b>◇</b><em class="pc-cooldown"></em></button>').join('')+
 '<button type="button" id="pcWard" class="pc-spell pc-ward" title="Sentinela de visão · V">'+
 '<span class="pc-key">V</span><b>◉</b><em class="pc-cooldown"></em></button></div></div>'+
 '<div class="pc-inventory"><div class="pc-group-title">EQUIPAMENTOS <small id="pcGold">✦ 0</small></div>'+
 '<div id="pcItems" class="pc-items"></div><div class="pc-bar-actions">'+
 '<button type="button" id="pcShop" title="Loja · P">⚒ LOJA</button>'+
 '<button type="button" id="pcRecall" title="Voltar à base · B">⌂ VOLTAR</button></div></div>';
hud.appendChild(desktopBar);
const teamRoster=document.createElement('aside');teamRoster.id='fendaTeamRoster';
teamRoster.setAttribute('aria-label','Quadro dos dez campeões');
teamRoster.innerHTML='<button type="button" id="pcRosterToggle" aria-expanded="true">'+
 '<span>☷ CAMPEÕES <small>5 × 5</small></span><b id="pcRosterChevron">−</b></button>'+
 '<div id="pcRosterList" class="pc-roster-list"></div>';
hud.appendChild(teamRoster);
let rosterCollapsed=false,rosterLastUpdate=-1;

let selectedLane=null;
const LANE_CHOICES=[
 {id:'top',short:'TOP',name:'ROTA SUPERIOR',icon:'⚔',desc:'Duelos e linha de frente',detail:'Segure sua rota e lidere as iniciações.',picks:['orun','varka','brax','rokar']},
 {id:'jungle',short:'SELVA',name:'SELVA',icon:'◆',desc:'Caça e objetivos',detail:'Limpe os campos e prepare emboscadas. Selo da Caça obrigatório.',picks:['zhira','vexor','sahra']},
 {id:'mid',short:'MEIO',name:'ROTA DO MEIO',icon:'✧',desc:'Pressão e rotação',detail:'Controle a rota central e ajude as laterais.',picks:['nyra','iskha','kaelis','mirielle']},
 {id:'adc',short:'ADC',name:'ATIRADOR',icon:'➶',desc:'Dano e posicionamento',detail:'Escale com ouro e lute ao lado do suporte.',picks:['lyria','kaoryn','darian','tessa']},
 {id:'support',short:'SUP',name:'SUPORTE',icon:'✚',desc:'Proteção e visão',detail:'Execute tropas com cargas e repasse o ouro integral ao ADC próximo.',picks:['seris','elowen','tharok','orun','rokar']}
];
const currentLane=()=>LANE_CHOICES.find(lane=>lane.id===selectedLane);

let pickedSummoners=['flash','ignite'];
try{const saved=JSON.parse(localStorage.getItem('fenda-summoners-v1')||'null');
 if(Array.isArray(saved)&&saved.length===2&&saved[0]!==saved[1]&&saved.every(x=>E.SUMMONERS[x]))pickedSummoners=saved;}catch(_){}
const saveSummoners=()=>{try{localStorage.setItem('fenda-summoners-v1',JSON.stringify(pickedSummoners))}catch(_){}};
function useSummoner(index){
 if(S.mode!=='playing'||S.shopOpen||S.showPause||!S.hero||S.hero.hp<=0)return;
 const spell=S.hero.summoners[index];
 if(!spell)return;
 let pointed=null,aim=null;
 if(desktopCamera()){
  const point=desktopMouseWorld();
  if(spell==='flash'){
   const dir=point?E.norm(point.x-S.hero.x,point.y-S.hero.y):
    {x:Math.cos(S.hero.facing||0),y:Math.sin(S.hero.facing||0)};
   aim={x:dir.x,y:dir.y};
  }else if(spell==='ignite'||spell==='smite'){
   aim={manual:true};
   if(point){
    const pool=E.living(1-S.hero.side,'hero').filter(u=>E.visibleTo(S.hero.side,u))
      .concat(spell==='smite'?S.camps.filter(x=>x.hp>0&&(!x.unlock||S.time>=x.unlock)):[]);
    pointed=pool.filter(u=>Math.hypot(u.x-point.x,u.y-point.y)<(u.r||29)+24)
     .sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-
       Math.hypot(b.x-point.x,b.y-point.y))[0]||null;
   }
  }
 }
 if(!E.castSummoner(S.hero,spell,pointed,aim))warn(spell==='smite'?
  'SELO: APONTE O MOUSE PARA UM MONSTRO OU CAMPEÃO PRÓXIMO':
  spell==='ignite'?'MARCA: APONTE PARA UM CAMPEÃO NO ALCANCE':
  'FEITIÇO INDISPONÍVEL');
 hudUpdate();
}
const scoreboard=document.createElement('section');scoreboard.id='fendaScoreboard';
scoreboard.setAttribute('role','dialog');
scoreboard.setAttribute('aria-label','Placar de jogadores e estatísticas da partida');
scoreboard.setAttribute('aria-modal','false');
scoreboard.innerHTML='<div class="fenda-scoreboard-head"><div><strong>PLACAR DA FENDA</strong><small>Equipes · K/D/A · Tropas / Selva · Patrimônio · Itens</small></div><button id="fendaScoreClose" type="button" aria-label="Fechar placar">✕</button></div>'+
 '<div id="fendaScoreboardTeams" class="fenda-scoreboard-teams"></div>'+
 '<div class="fenda-scoreboard-foot">Toque na pontuação para fechar · TAB no PC</div>';
stage.appendChild(scoreboard);
const shop=document.createElement('div');shop.id='fendaShop';
shop.innerHTML=
 '<div class="fenda-shop-head"><div><span class="fenda-shop-emblem">✦</span><strong>ARSENAL DO SANTUÁRIO</strong><small> EQUIPAMENTOS</small></div><button id="fendaShopClose" aria-label="Fechar loja">✕</button></div>'+
 '<div class="fenda-shop-topline"><div class="fenda-shop-gold" id="fendaShopGold"></div><div id="fendaShopLocation"></div></div>'+
 '<div class="fenda-shop-layout">'+
 '<section class="fenda-shop-browser"><nav class="fenda-shop-tabs" id="fendaShopTabs"></nav><nav class="fenda-shop-categories" id="fendaShopCategories"></nav><div id="fendaShopItems" class="fenda-shop-list"></div></section>'+
 '<section id="fendaShopDetails" class="fenda-shop-details"></section></div>'+
 '<div class="fenda-shop-equipped" id="fendaShopEquipped"></div>'+
 '<p id="fendaShopHint" class="fenda-shop-hint"></p>';
stage.appendChild(shop);
// Overlay de evolução de habilidades: cada botão + fica perto da habilidade,
// mas captura um ponteiro próprio sem cancelar o joystick já pressionado.
const skillUpgradeLayer=document.createElement('div');
skillUpgradeLayer.id='fendaSkillUpgradeLayer';stage.appendChild(skillUpgradeLayer);
const upgradeButtons=Array.from({length:4},(_,i)=>{
 const b=document.createElement('button');b.type='button';b.className='fenda-upgrade-button';
 b.textContent='+';b.dataset.slot=String(i);b.setAttribute('aria-label','Evoluir habilidade '+(i+1));
 skillUpgradeLayer.appendChild(b);return b;
});
let shopLastPaint=-10,shopHash='';
const mm=$('fendaMinimap'),mc=mm.getContext('2d');
let vw=900,vh=460,dpr=1,terrain=null,last=performance.now(),hudCountdown=0,endedShown=false;
// A câmera usa pixels de tela separados de metros do mundo. Não reduzir o herói
// para tentar encaixar 3 torres no mesmo enquadramento.
let cameraZoom=1.30,worldVW=vw/cameraZoom,worldVH=vh/cameraZoom;
// Câmera adaptável: a torre precisa aparecer ANTES de poder acertar.
// A escala visual do campeão não altera o seu raio de colisão.
let HERO_RENDER_SCALE=1.0;
const CAMERA_MIN_WORLD_HEIGHT=620;
// No celular, antecipar a rota deslocava o campeão para baixo do polegar
// (sobretudo na TOP). Usamos o centro útil da tela, longe do joystick.
const MOBILE_HERO_ANCHOR_X=.54,MOBILE_HERO_ANCHOR_Y=.48;
const MOBILE_THUMB_CLEARANCE_PX=108;
// Não há texturas, atlas ou sprites nesta arena. Toda a paisagem é Canvas procedural.
// Fenda 6.3: paisagem 100% procedural, com geometria e camera próprias.
 // Somente três rotas; paredes/obstáculos provêm das hitboxes do motor.
const fogCanvas=document.createElement('canvas'),fogContext=fogCanvas.getContext('2d');
let fogAt=-1,fogCamX=-99999,fogCamY=-99999;
const keys=new Set(),joy={ptr:null,x:0,y:0,sx:0,sy:0,fx:0},pointers={aa:null,skill:null};
let aaAim=null; // Alvo marcado ao arrastar o botão ATACAR.
let aimPreview=null,desktopScheme='arrows',clickDestination=null,mouseFollow=null;
let wardAim=null,cameraPeek=null,cameraPeekUntil=0;
const desktopPointer={over:false,x:0,y:0,lastWorld:null};
let cameraDrag=null,spaceCenterHeld=false,cameraMode='locked';
try{cameraMode=localStorage.getItem('fenda-camera-v1')==='free'?'free':'locked'}catch(_){}
const desktopCamera=()=>!!window.matchMedia?.('(hover:hover) and (pointer:fine)').matches;
const cameraClampX=x=>clamp(x,0,Math.max(0,E.W-worldVW));
const cameraClampY=y=>clamp(y,0,Math.max(0,E.H-worldVH));
// Overscan máximo reduzido: evita mostrar metade da tela fora do mapa.
// Um pequeno espaço lateral ainda mantém o campeão longe do joystick.
const mobileCameraClampX=(x,heroX,finger=0)=>{
 // Só amplia o respiro da esquerda se o polegar realmente precisar dele.
 // Sem joystick: no máximo 20% de cenário exterior; com joystick: até 35%.
 const wanted=finger>0?(finger+MOBILE_THUMB_CLEARANCE_PX)/cameraZoom-heroX:0;
 const overscan=Math.max(worldVW*.20,Math.min(worldVW*.35,wanted));
 return clamp(x,-overscan,Math.max(0,E.W-worldVW)+worldVW*.20);
};
const mobileCameraClampY=y=>clamp(y,-worldVH*.15,
 Math.max(0,E.H-worldVH)+worldVH*.15);
function cameraCenterAt(x,y){
 S.camera.x=cameraClampX(x-worldVW/2);
 S.camera.y=cameraClampY(y-worldVH/2);
}
// Enquadramento mobile: campeão numa posição estável e o polegar separado.
// As bordas podem mostrar uma faixa de terreno fora da arena para não
// prender o jogador embaixo do joystick quando a TOP margeia o mapa.
function mobileCameraTarget(hero,observing=false){
 if(observing){
  return{x:cameraClampX(cameraPeek.x-worldVW/2),
   y:cameraClampY(cameraPeek.y-worldVH/2)};
 }
 const finger=joy.ptr!==null?Math.max(joy.sx,joy.fx):0;
 const x=Math.min(vw*.74,Math.max(vw*MOBILE_HERO_ANCHOR_X,
  finger+MOBILE_THUMB_CLEARANCE_PX));
 const y=vh*MOBILE_HERO_ANCHOR_Y;
 return{x:mobileCameraClampX(hero.x-x/cameraZoom,hero.x,finger),
  y:mobileCameraClampY(hero.y-y/cameraZoom)};
}
function syncCameraControl(){
 const b=$('fendaCameraBtn');if(!b)return;
 const free=cameraMode==='free';
 b.textContent=free?'⌖ CÂMERA LIVRE':'◎ CÂMERA TRAVADA';
 b.title=free?'Livre: bordas da tela ou arraste com botão do meio · Y troca · Espaço centra':
  'Travada: campeão permanece centralizado · Y para liberar';
 b.setAttribute('aria-pressed',String(free));
 stage.classList.toggle('fenda-camera-free',free);
}
function setCameraMode(mode,silent=false){
 cameraMode=mode==='free'?'free':'locked';
 cameraDrag=null;cameraPeek=null;cameraPeekUntil=0;
 if(cameraMode==='locked'&&S.hero)cameraCenterAt(S.hero.x,S.hero.y);
 try{localStorage.setItem('fenda-camera-v1',cameraMode)}catch(_){}
 syncCameraControl();
 if(!silent&&S.mode==='playing')E.announce(cameraMode==='free'?
  'CÂMERA LIVRE · PONTEIRO NAS BORDAS OU BOTÃO DO MEIO PARA ARRASTAR':
  'CÂMERA TRAVADA · CAMPEÃO NO CENTRO · TECLA Y',2.6);
 return cameraMode;
}
function panFreeCamera(dt){
 if(!desktopCamera()||!desktopPointer.over||cameraDrag||
  S.shopOpen||S.showPause||scoreboardVisible)return;
 const edge=33,px=desktopPointer.x,py=desktopPointer.y;
 const x=px<edge?-(1-px/edge):px>vw-edge?(1-(vw-px)/edge):0;
 const y=py<edge?-(1-py/edge):py>vh-edge?(1-(vh-py)/edge):0;
 if(Math.abs(x)+Math.abs(y)>.02){
  const n=Math.max(1,Math.hypot(x,y));
  S.camera.x=cameraClampX(S.camera.x+x/n*650*dt);
  S.camera.y=cameraClampY(S.camera.y+y/n*650*dt);
 }
}
let scoreboardVisible=false,scoreboardHeld=false,scoreboardLastUpdate=-1;
let lastWarningAt=-100;
function warn(text){
 const now=performance.now()/1000;
 if(now-lastWarningAt>.75){lastWarningAt=now;E.announce(text,1.2)}
}
const clamp=E.clamp,dist=E.dist,TAU=E.TAU;
function resize(){
 const r=stage.getBoundingClientRect();vw=Math.max(320,r.width);vh=Math.max(220,r.height);
 dpr=Math.min(window.devicePixelRatio||1,1.65);
 cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 // Visão de combate aproximada: não mostrar várias torres e a onda central
 // no mesmo quadro. Hitboxes e alcances continuam em unidades do mundo.
 const comfortableZoom=vw>=1250?1.50:vw>=750?1.35:1.17;
 HERO_RENDER_SCALE=vw>=1250?1.11:1.19;
 cameraZoom=Math.min(comfortableZoom,vh/CAMERA_MIN_WORLD_HEIGHT);
 worldVW=vw/cameraZoom;worldVH=vh/cameraZoom;
 // Orientação, fullscreen e troca de dimensões não deixam a câmera no
 // posicionamento antigo enquanto o dedo já está andando.
 if(S.mode==='playing'&&S.hero&&!desktopCamera()&&!cameraPeek)
  Object.assign(S.camera,mobileCameraTarget(S.hero));
 fogCanvas.width=Math.ceil(vw*.64);fogCanvas.height=Math.ceil(vh*.64);fogAt=-1;
}
function circle(x,y,r,fill,stroke='',w=1){
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke()}
}

// Geometria limpa da Teamfight, escalada para as três rotas da Fenda.
function techPolygon(g,x,y,r,sides=6,rot=-Math.PI/2){
 g.beginPath();
 for(let i=0;i<sides;i++){
  const a=rot+TAU*i/sides,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
  if(!i)g.moveTo(px,py);else g.lineTo(px,py);
 }
 g.closePath();
}
function techRoute(g,points){
 g.beginPath();
 points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));
}
function techRing(g,x,y,r,color,width=2){
 g.beginPath();g.arc(x,y,r,0,TAU);
 g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
function techBase(g,side){window.FendaScenery.drawBase(g,E,side);}
function techWall(g,w){window.FendaScenery.drawWall(g,w);}
function techObstacle(g,o){window.FendaScenery.drawRock(g,o);}
function drawTerrain(){terrain=window.FendaScenery.drawTerrain(E,S);}
function visible(x,y,r=70){
 return x+r>S.camera.x&&y+r>S.camera.y&&
  x-r<S.camera.x+worldVW&&y-r<S.camera.y+worldVH;
}
function bar(x,y,r,hp,max,side,width=46){
 const pct=clamp(hp/max,0,1);ctx.fillStyle='#00141ce5';ctx.fillRect(x-width/2,y-r-20,width,6);
 ctx.fillStyle=side===0?'#79ebc9':'#fb89a3';ctx.fillRect(x-width/2,y-r-20,width*pct,6);
 ctx.strokeStyle='#ddf8dd84';ctx.lineWidth=.8;ctx.strokeRect(x-width/2,y-r-20,width,6);
}
function manaBar(x,y,r,mana,max,width=55){
 // A barra azul acompanha o campeão exatamente abaixo da barra de vida.
 const pct=clamp((mana||0)/Math.max(1,max),0,1),left=x-width/2,top=y-r-13;
 ctx.fillStyle='#081729e7';ctx.fillRect(left,top,width,5);
 ctx.fillStyle='#4d9ced';ctx.fillRect(left,top,width*pct,5);
 ctx.strokeStyle='#c8d9f180';ctx.lineWidth=.7;ctx.strokeRect(left,top,width,5);
}
function drawStructure(o,t){
 if(!visible(o.x,o.y,100)||o.hp<=0)return;
 const col=E.SIDE[o.side],core=o.kind==='core';
 const r=core?49:32;
 if(o.side!==S.hero?.side&&S.hero?.hp>0){
  const player=S.hero,d=dist(player,o),radius=o.range+player.r;
  // Perímetro de aggro aparece antes do ataque; quando o disparo
  // mira o campeão, uma linha curta aponta a origem.
  if(d<radius+48){
   const danger=d<radius,aggro=o.aggroTarget===player;
   // A referência de alcance é discreta; não cobrir a arena com
   // anéis enormes permanentes. O disparo ativo ganha destaque.
   ctx.save();ctx.globalAlpha=aggro?.64:danger?.32:.14;
   circle(o.x,o.y,radius,null,danger?'#ff849b':'#eac9b3',aggro?2.3:1.4);
   if(aggro){
    ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(player.x,player.y);
    ctx.lineWidth=1.6;ctx.strokeStyle='#ff8ba6';ctx.stroke();
   }
   ctx.restore();
  }
 }
 ctx.save();ctx.translate(o.x,o.y);
 // Mesma linguagem top-down dos campeões originais: hexágonos,
 // anéis técnicos e cristal central, sem falso edifício em perspectiva.
 ctx.fillStyle='#010d18a4';ctx.beginPath();ctx.ellipse(4,9,r+13,r*.70,0,0,TAU);ctx.fill();
 ctx.shadowColor=col;ctx.shadowBlur=core?20:13;
 techPolygon(ctx,0,0,r+8,8,Math.PI/8);
 ctx.fillStyle='#0a2235';ctx.fill();
 ctx.shadowBlur=0;ctx.lineWidth=4;ctx.strokeStyle='#588a9d';ctx.stroke();
 techPolygon(ctx,0,0,r+1,8,Math.PI/8);
 ctx.fillStyle='#214357';ctx.fill();
 ctx.strokeStyle=col+'b0';ctx.lineWidth=2.8;ctx.stroke();
 techPolygon(ctx,0,0,r*.75,6,Math.PI/6);
 ctx.fillStyle='#0b2b42';ctx.fill();
 ctx.strokeStyle='#6fa6b370';ctx.lineWidth=1.8;ctx.stroke();
 techRing(ctx,0,0,r*.50,col+'8c',core?3.4:2.5);
 ctx.save();ctx.rotate(Math.PI/4);
 ctx.fillStyle=col;ctx.fillRect(-r*.23,-r*.23,r*.46,r*.46);
 ctx.strokeStyle='#e2fff5d8';ctx.lineWidth=2;ctx.strokeRect(-r*.23,-r*.23,r*.46,r*.46);
 ctx.restore();
 ctx.fillStyle='#e9fff5';ctx.beginPath();ctx.arc(0,0,core?6:4.5,0,TAU);ctx.fill();
 for(let i=0;i<(core?8:4);i++){
  const a=(i+.5)*TAU/(core?8:4);
  const x=Math.cos(a)*(r*.88),y=Math.sin(a)*(r*.88);
  techPolygon(ctx,x,y,core?5:4,4,Math.PI/4);
  ctx.fillStyle=col+'7c';ctx.fill();
 }
 bar(0,0,r,o.hp,o.maxHp,o.side,core?85:59);
 ctx.restore();
}
function drawMinion(u,t){
 if(!visible(u.x,u.y,32))return;
 const col=E.SIDE[u.side],x=u.x,r=u.r;
 const walking=u.walkUntil>S.time,hop=walking?Math.sin((u.walkPhase||0)*1.5)*1.7:0,y=u.y+hop;
 ctx.save();ctx.translate(x,y);ctx.scale(1.16,1.16);ctx.translate(-x,-y);
 circle(x+3,y+6,r,'#031522a0');
 circle(x,y,r+1,'#173b48',col,2);
 if(u.id==='guard'){
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
  ctx.fillStyle=col;ctx.fillRect(-r*.49,-r*.49,r*.98,r*.98);ctx.restore();
  circle(x+5,y,3,'#ffeac1');
 }else if(u.id==='caster'){
  ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y+r);ctx.lineTo(x-r,y+r);ctx.closePath();
  ctx.fillStyle=col;ctx.fill();circle(x,y,3,'#fff6e7');
 }else{
  for(let k=0;k<4;k++){
   const a=k*TAU/4+t*.3;circle(x+Math.cos(a)*r*.75,y+Math.sin(a)*r*.75,5,'#ebdeab');
  }
  circle(x,y,6,col);
 }
 if(u.attackAnim>0){
  const phase=1-u.attackAnim/(u.attackTotal||.29);
  ctx.save();ctx.globalAlpha=Math.sin(Math.PI*phase)*.82;
  circle(x+Math.cos(u.facing||0)*(r+7),y+Math.sin(u.facing||0)*(r+7),5,'#f5e8c1');
  ctx.restore();
 }
 ctx.restore();
 bar(x,u.y,r,u.hp,u.maxHp,u.side,30);
}
function drawHero(u,t){
 if(!visible(u.x,u.y,65)||u.hp<=0)return;
 const x=u.x,y=u.y,r=u.r,h=C.heroes[u.id],col=h.color,side=E.SIDE[u.side];
 const walking=u.walkUntil>S.time;
 const stride=walking?Math.sin((u.walkPhase||0)*1.55)*2.2:Math.sin(t*1.7+u.uid)*.58;
 const attackPhase=u.attackAnim>0?1-u.attackAnim/(u.attackTotal||.39):0;
 const recoil=u.attackAnim>0?Math.sin(Math.PI*attackPhase)*3.3:0;
 ctx.save();ctx.translate(x,y);ctx.scale(HERO_RENDER_SCALE,HERO_RENDER_SCALE);
 ctx.fillStyle='#00151cab';ctx.beginPath();ctx.ellipse(4,9,r+6,r*.64,0,0,TAU);ctx.fill();
 circle(0,0,r+9,null,side,u.controlled?3.3:2);
 if(u.controlled)circle(0,0,r+13,null,'#e4fff183',1.4);
 if(u.shield>1)circle(0,0,r+15,'#8baeff29','#c4d7ffb3',2.5);
 ctx.translate(-Math.cos(u.facing||0)*recoil,stride-Math.sin(u.facing||0)*recoil);
 ctx.rotate(u.facing||0);circle(0,0,r,'#1b3043',col,2.6);
 if(u.id==='orun'){
  ctx.fillStyle='#5b709f';ctx.fillRect(-r*.7,-r*.8,r*1.16,r*1.6);
  ctx.beginPath();ctx.moveTo(r*.3,-r*.78);ctx.lineTo(r*1.18,-r*.3);ctx.lineTo(r*1.18,r*.3);ctx.lineTo(r*.3,r*.78);
  ctx.closePath();ctx.fillStyle='#b2c2ff';ctx.fill();circle(-r*.18,0,6,'#fff5ea');
 }else if(u.id==='vexor'){
  ctx.strokeStyle='#ffe4b2';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-4,-r*.45);
  ctx.lineTo(r*1.25,-r*.84);ctx.moveTo(-4,r*.45);ctx.lineTo(r*1.25,r*.84);ctx.stroke();
  circle(-r*.25,0,7,'#ffe2bd');
 }else if(u.id==='lyria'){
  ctx.beginPath();ctx.moveTo(-r*.9,-r*.7);ctx.lineTo(r*.6,0);ctx.lineTo(-r*.9,r*.7);ctx.closePath();
  ctx.fillStyle='#376175';ctx.fill();ctx.strokeStyle='#cbffe9';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(r*.2,0,r*.75,-1,1);ctx.stroke();circle(-r*.19,0,6,'#eeffdd');
 }else if(u.id==='nyra'){
  for(let i=0;i<5;i++){const a=i*TAU/5+t*.25;circle(Math.cos(a)*r*.83,Math.sin(a)*r*.83,4,'#f0b3ff')}
  ctx.beginPath();ctx.moveTo(-r*.75,-r*.7);ctx.lineTo(r*.68,0);ctx.lineTo(-r*.75,r*.7);ctx.closePath();
  ctx.fillStyle='#8e61b3';ctx.fill();circle(-r*.18,0,6,'#fff0fc');
 }else if(u.id==='brax'){
   ctx.fillStyle='#74624b';ctx.fillRect(-r*.7,-r*.8,r*1.20,r*1.6);
   ctx.fillStyle='#e9c283';ctx.fillRect(r*.36,-r*.9,r*.9,r*.45);
   ctx.fillStyle='#c28a54';ctx.fillRect(r*.57,-r*.45,r*.22,r*1.25);
   circle(-r*.2,0,7,'#fff0ce');
  }else if(u.id==='zhira'){
   ctx.fillStyle='#315d40';ctx.beginPath();
   ctx.moveTo(-r*.95,-r*.85);ctx.lineTo(r*.30,-r*.65);ctx.lineTo(r*.90,0);
   ctx.lineTo(r*.30,r*.65);ctx.lineTo(-r*.95,r*.85);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#9af39e';ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(r*.1,-r*.5);ctx.lineTo(r*1.25,-r*.7);
   ctx.moveTo(r*.1,r*.5);ctx.lineTo(r*1.25,r*.7);ctx.stroke();
   circle(-r*.19,0,6,'#edffe2');
  }else if(u.id==='kaelis'){
   for(let i=0;i<4;i++){const a=i*TAU/4+t*.16;circle(Math.cos(a)*r*.89,Math.sin(a)*r*.89,4,'#bbf4ff')}
   ctx.fillStyle='#3c6e9d';techPolygon(ctx,-r*.05,0,r*.72,6,Math.PI/6);ctx.fill();
   ctx.beginPath();ctx.moveTo(-r*.62,-r*.6);ctx.lineTo(r*.91,0);ctx.lineTo(-r*.62,r*.6);
   ctx.strokeStyle='#d6f9ff';ctx.lineWidth=3;ctx.stroke();circle(-r*.16,0,6,'#e5ffff');
  }else if(u.id==='rokar'){
   ctx.fillStyle='#8d7d67';ctx.fillRect(-r*.74,-r*.78,r*1.15,r*1.56);
   ctx.beginPath();ctx.moveTo(r*.13,-r*.9);ctx.lineTo(r*1.10,-r*.55);ctx.lineTo(r*1.10,r*.55);ctx.lineTo(r*.13,r*.9);ctx.closePath();
   ctx.fillStyle='#e4ca94';ctx.fill();ctx.strokeStyle='#fff2ce';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#f1efd8';ctx.fillRect(-r*.47,-r*.3,r*.24,r*.66);circle(-r*.1,0,6,'#fff3d1');
  }else if(u.id==='tessa'){
   // Tessa usa rifle longo de precisão, distinto do arco da Lyria.
   ctx.fillStyle='#4b4c56';ctx.fillRect(-r*.73,-r*.59,r*1.05,r*1.18);
   ctx.strokeStyle='#ffe1a1';ctx.lineWidth=5;
   ctx.beginPath();ctx.moveTo(-r*.65,-r*.15);ctx.lineTo(r*1.35,-r*.15);ctx.stroke();
   ctx.strokeStyle='#f6f2ca';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(r*.62,-r*.4);ctx.lineTo(r*.62,r*.09);ctx.stroke();
   ctx.fillStyle='#d8b683';ctx.fillRect(-r*.2,-r*.02,r*.26,r*.73);
   circle(-r*.18,r*.12,6,'#fff5d7');
  }else if(u.id==='sahra'){
   ctx.fillStyle='#1c443b';ctx.beginPath();
   ctx.moveTo(-r*.8,-r*.72);ctx.lineTo(-r*.26,-r*1.02);ctx.lineTo(r*.35,-r*.59);
   ctx.lineTo(r*.71,0);ctx.lineTo(r*.35,r*.59);ctx.lineTo(-r*.26,r*1.02);
   ctx.lineTo(-r*.8,r*.72);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#b1f6d6';ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(r*.13,-r*.5);ctx.lineTo(r*1.27,-r*.76);
   ctx.moveTo(r*.13,r*.5);ctx.lineTo(r*1.27,r*.76);ctx.stroke();
   circle(-r*.13,0,5,'#eaffda');
  }else if(u.id==='mirielle'){
   ctx.fillStyle='#4f3273';techPolygon(ctx,-r*.19,0,r*.87,5,Math.PI/3);ctx.fill();
   ctx.strokeStyle='#efc0ff';ctx.lineWidth=2.1;
   techPolygon(ctx,r*.45,-r*.32,r*.42,4,Math.PI/4);ctx.stroke();
   techPolygon(ctx,r*.45,r*.32,r*.42,4,Math.PI/4);ctx.stroke();
   circle(-r*.17,0,6,'#fff0ff');
   for(let i=0;i<3;i++){const a=t*1.1+i*TAU/3;
    circle(Math.cos(a)*r*.82,Math.sin(a)*r*.82,2.6,'#efcaff');}
  }else if(u.id==='kaoryn'){
   ctx.fillStyle='#244f39';techPolygon(ctx,-r*.26,0,r*.9,5,Math.PI/2);ctx.fill();
   ctx.strokeStyle='#b5ffab';ctx.lineWidth=3.2;ctx.beginPath();
   ctx.arc(r*.2,0,r*.79,-1.16,1.16);ctx.stroke();
   ctx.beginPath();ctx.moveTo(-r*.10,-r*.88);ctx.lineTo(r*.9,-r*.10);
   ctx.lineTo(-r*.1,r*.88);ctx.stroke();
   circle(-r*.28,0,5,'#f7ffe8');
  }else if(u.id==='darian'){
   ctx.fillStyle='#514251';ctx.fillRect(-r*.74,-r*.65,r*1.2,r*1.3);
   ctx.strokeStyle='#ffd29c';ctx.lineWidth=4;ctx.beginPath();
   ctx.moveTo(-r*.10,-r*.55);ctx.lineTo(r*1.35,-r*.75);
   ctx.moveTo(-r*.10,r*.55);ctx.lineTo(r*1.35,r*.75);ctx.stroke();
   circle(-r*.25,0,6,'#fff1d8');
  }else if(u.id==='elowen'){
   ctx.fillStyle='#346c63';techPolygon(ctx,-r*.18,0,r*.85,6,Math.PI/6);ctx.fill();
   ctx.strokeStyle='#c8ffe2';ctx.lineWidth=2;ctx.beginPath();
   ctx.moveTo(r*.4,-r*1.1);ctx.lineTo(r*.4,r*1.1);ctx.stroke();
   for(let i=0;i<5;i++){const a=i*TAU/5+t*.3;
    circle(Math.cos(a)*r*.8,Math.sin(a)*r*.8,3.4,'#96f9c4')}
   circle(-r*.24,0,6,'#eefff3');
  }else if(u.id==='tharok'){
   ctx.fillStyle='#356577';techPolygon(ctx,-r*.3,0,r*1.05,6,Math.PI/6);ctx.fill();
   ctx.fillStyle='#a6faff';ctx.beginPath();
   ctx.moveTo(r*.16,-r*.9);ctx.lineTo(r*1.16,-r*.60);
   ctx.lineTo(r*1.16,r*.60);ctx.lineTo(r*.16,r*.9);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#e3fffa';ctx.lineWidth=3;ctx.stroke();
   circle(-r*.35,0,6,'#ecfffd');
  }else if(u.id==='varka'){
   ctx.fillStyle='#703d3b';ctx.fillRect(-r*.76,-r*.72,r*1.23,r*1.44);
   ctx.strokeStyle='#ffd2b7';ctx.lineWidth=5;ctx.beginPath();
   ctx.moveTo(-r*.05,r*.6);ctx.lineTo(r*1.24,-r*.87);ctx.stroke();
   ctx.fillStyle='#fa9d91';techPolygon(ctx,r*1.01,-r*.8,r*.48,3,Math.PI/6);ctx.fill();
   circle(-r*.25,0,6,'#ffebce');
  }else if(u.id==='iskha'){
   ctx.fillStyle='#265777';techPolygon(ctx,-r*.14,0,r*.91,5,Math.PI/2);ctx.fill();
   ctx.strokeStyle='#c9f5ff';ctx.lineWidth=2.4;
   for(let i=0;i<6;i++){const a=i*TAU/6+t*.15;ctx.beginPath();
    ctx.moveTo(Math.cos(a)*r*.42,Math.sin(a)*r*.42);
    ctx.lineTo(Math.cos(a)*r*1.03,Math.sin(a)*r*1.03);ctx.stroke();}
   circle(-r*.21,0,6,'#f1ffff');
  }else{
   for(let i=0;i<6;i++){const a=i*TAU/6;circle(Math.cos(a)*r*.6,Math.sin(a)*r*.6,5,'#ffcee2')}
  circle(-r*.12,0,7,'#fff3e9');
  ctx.beginPath();ctx.moveTo(r*.1,r*.4);ctx.lineTo(r*1.2,r*.4);ctx.strokeStyle='#ffc6e6';ctx.lineWidth=3;ctx.stroke();
 }
 // Pequenos indicadores de estilo no próprio modelo: ultimate pronta e
 // acúmulo de ataques, sem repetir a mesma figura para os dez campeões.
 if(u.kind==='hero'){
  const ultReady=E.skillRank(u,h.ultimate)>0&&(u.cooldowns[h.ultimate]||0)<.01;
  if(ultReady){
   ctx.save();ctx.globalAlpha=.32+.11*Math.sin(t*3+u.uid);
   ctx.setLineDash([5,7]);ctx.strokeStyle='#ffe4ab';ctx.lineWidth=1.4;
   ctx.beginPath();ctx.arc(0,0,r+7,-Math.PI/2,Math.PI*1.5);ctx.stroke();
   ctx.restore();
  }
  if(u.id==='lyria'){
   for(let i=0;i<4;i++){
    const a=-Math.PI/2+(i-1.5)*.33;
    circle(Math.cos(a)*(r+13),Math.sin(a)*(r+13),2.4,
     i<(u.windStacks||0)?'#a3ffdc':'#355061');
   }
  }else if(u.id==='tessa'){
   const charged=S.time-(u.stillSince??S.time)>1.1||u.loadedRoundUntil>S.time;
   if(charged){ctx.save();ctx.strokeStyle='#ffe0a2';ctx.lineWidth=2;
    ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(0,0,r+13,0,TAU);ctx.stroke();ctx.restore();}
  }else if(['nyra','kaelis','rokar'].includes(u.id)){
   const stacks=u.passiveAttacks%3||0;
   for(let i=0;i<3;i++){
    const a=-Math.PI/2+(i-1)*.38;
    circle(Math.cos(a)*(r+13),Math.sin(a)*(r+13),2.2,
     i<stacks?col:'#355061');
   }
  }
 }
 if(u.attackAnim>0){
  // Preparação → impacto → recuperação; arco físico para melees e clarão na ponta da arma para rangeds.
  const phase=clamp(attackPhase,0,1);
  ctx.save();ctx.globalAlpha=(Math.sin(Math.PI*phase)*.85+.09);
  ctx.strokeStyle=u.isRanged?'#ffeab2':'#d4fff4';ctx.lineWidth=u.isRanged?3.8:6;
  ctx.beginPath();
  if(u.isRanged){
   ctx.moveTo(r*.15,-r*.25);ctx.lineTo(r+15+phase*6,-r*.25);
   ctx.stroke();circle(r+15+phase*6,-r*.25,4,'#fffbd9');
  }else{
   ctx.arc(r*.38,0,r+6,-1.45+phase*1.65,.52+phase*1.5);ctx.stroke();
  }
  ctx.restore();
 }
 if(u.skillFlash>0){
  ctx.save();ctx.globalAlpha=clamp(u.skillFlash/.42,0,1)*.73;
  ctx.strokeStyle=col;ctx.lineWidth=3;
  ctx.rotate(t*2.4);
  ctx.strokeRect(-r-13,-r-13,(r+13)*2,(r+13)*2);
  ctx.restore();
 }
 ctx.restore();
 const barRadius=r*.84;
 bar(x,y,barRadius,u.hp,u.maxHp,u.side,44);
 manaBar(x,y,barRadius,u.mana,E.maxMana(u),44);
 ctx.save();ctx.textAlign='center';ctx.font='850 9px system-ui';
 ctx.shadowColor='#00111a';ctx.shadowBlur=4;ctx.fillStyle=u.side===0?'#d4fff2':'#ffdde5';
 ctx.fillText((u.controlled?'✦ ':'')+h.name+' · '+u.level,x,y-barRadius-32);ctx.restore();
 if(u.casting){
  const ratio=clamp(1-u.casting.time/(u.casting.total||1),0,1);
  ctx.save();ctx.globalAlpha=.76;
  ctx.strokeStyle=col;ctx.lineWidth=2.7;
  ctx.beginPath();ctx.arc(x,y,r+18,-Math.PI/2,-Math.PI/2+TAU*ratio);ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#071c2bcf';ctx.fillRect(x-24,y+r+12,48,5);
  ctx.fillStyle=col;ctx.fillRect(x-24,y+r+12,48*ratio,5);
 }
}
function drawCreep(o,t){
 if(o.hp<=0||o.unlock&&S.time<o.unlock||!visible(o.x,o.y,90))return;
 const r=o.kind==='boss'?46:o.kind==='buff'?30:24;
 circle(o.x+4,o.y+9,r+5,'#0417289c');
 circle(o.x,o.y,r,'#243944',o.color,3);
 if(o.kind==='boss'){
  const pulse=.5+.5*Math.sin(t*1.85);
  ctx.save();ctx.globalAlpha=.4+pulse*.35;
  circle(o.x,o.y,r+12+pulse*8,null,o.color,3);
  ctx.restore();
 }
 if(o.id==='serpe'){
  ctx.beginPath();ctx.moveTo(o.x,o.y-r*.9);ctx.lineTo(o.x+r*.8,o.y+r*.7);ctx.lineTo(o.x-r*.8,o.y+r*.7);ctx.closePath();
  ctx.fillStyle=o.color;ctx.fill();
 }else if(o.id==='titan'){
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#8f6fa9';ctx.fillRect(-r*.67,-r*.67,r*1.34,r*1.34);ctx.restore();
 }else{
  for(let i=0;i<6;i++){const a=i*TAU/6+t*.3;circle(o.x+Math.cos(a)*r*.7,o.y+Math.sin(a)*r*.7,6,o.color)}
 }
 circle(o.x,o.y,7,'#f9f7de');
 bar(o.x,o.y,r,o.hp,o.maxHp,0,o.kind==='boss'?95:66);
 ctx.textAlign='center';ctx.font='800 10px system-ui';ctx.fillStyle='#e9f9ed';
 ctx.fillText(o.name,o.x,o.y-r-26);
}
function drawFX(t){
 // Áreas persistentes: flechas múltiplas, fumaça e armadilhas são
 // elementos reais de combate, com alcance e duração legíveis.
 for(const z of S.zones||[]){
  if(!visible(z.x,z.y,z.r+20)||z.side===1&&!E.isPointVisible(0,z))continue;
  const radius=z.r,remaining=Math.max(0,z.until-S.time),phase=t*3;
  ctx.save();ctx.globalAlpha=Math.min(.8,Math.max(.12,remaining*.35));
  if(z.kind==='shroud'){
   const fog=ctx.createRadialGradient(z.x,z.y,4,z.x,z.y,radius);
   fog.addColorStop(0,'#264e4fd4');fog.addColorStop(.75,'#244b43af');
   fog.addColorStop(1,'#70d6ad19');
   circle(z.x,z.y,radius,fog,'#90ead383',2.4);
   for(let j=0;j<8;j++){
    const a=j*TAU/8+phase*.15,r=radius*.57+Math.sin(t*2+j)*10;
    circle(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,12,'#74ddbc48');
   }
  }else if(z.kind==='arrowstorm'){
   circle(z.x,z.y,radius,'#3aaea825','#97f9d387',2.1);
   for(let i=0;i<13;i++){
    const a=i*2.4+t*.25,l=radius*(.22+(i%5)*.15);
    const px=z.x+Math.cos(a)*l,py=z.y+Math.sin(a)*l;
    ctx.strokeStyle='#bdffe0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(px-4,py-10);ctx.lineTo(px+4,py+10);ctx.stroke();
   }
  }else if(z.kind==='trap'){
   ctx.setLineDash([6,5]);circle(z.x,z.y,radius,'#9d823a24','#f1d58e',2.2);
   ctx.setLineDash([]);techPolygon(ctx,z.x,z.y,18,6,t*.38);
   ctx.fillStyle='#eacb86';ctx.fill();
  }
  ctx.restore();
 }
 for(const u of S.units.filter(h=>h.id==='mirielle'&&h.hp>0&&h.mirrorEchoUntil>S.time&&h.mirrorEchoAt)){
  const p=u.mirrorEchoAt;
  if(!visible(p.x,p.y,60)||u.side===1&&!E.isPointVisible(0,p))continue;
  ctx.save();ctx.globalAlpha=.40*Math.min(1,u.mirrorEchoUntil-S.time);
  circle(p.x,p.y,u.r+4,'#a66ad677','#e5b6ff',2.4);
  techPolygon(ctx,p.x,p.y,u.r*.7,5,t*.9);
  ctx.strokeStyle='#f3d4ff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 }
 for(const p of S.projectiles){
  if(!visible(p.x,p.y,25)||p.side===1&&!E.isPointVisible(0,p))continue;
  const col=p.color||E.SIDE[p.side];ctx.save();ctx.shadowColor=col;ctx.shadowBlur=13;
  const radius=p.kind==='damagearea'||p.kind==='healarea'?11:p.r||5;
  const velocity=p.kind==='skillline'?E.norm(p.vx||1,p.vy||0):p.target?
    E.norm(p.target.x-p.x,p.target.y-p.y):p.tx!==undefined?E.norm(p.tx-p.x,p.ty-p.y):{x:1,y:0};
  ctx.strokeStyle=col;ctx.lineWidth=p.kind==='skillline'?Math.max(3,radius*.78):3;
  ctx.globalAlpha=.50;ctx.beginPath();
  ctx.moveTo(p.x-velocity.x*(radius+19),p.y-velocity.y*(radius+19));
  ctx.lineTo(p.x-velocity.x*radius*.3,p.y-velocity.y*radius*.3);ctx.stroke();
  ctx.globalAlpha=1;
  // Disparos de cada classe têm uma silhueta distinta — não são bolas iguais.
  if(p.kind==='aa'&&p.source?.kind==='hero'){
   const id=p.source.id;
   ctx.save();ctx.translate(p.x,p.y);
   ctx.rotate(Math.atan2(velocity.y,velocity.x));
   if(id==='lyria'||id==='tessa'){
    ctx.beginPath();ctx.moveTo(radius+14,0);ctx.lineTo(-radius-5,-radius*.72);
    ctx.lineTo(-radius*.55,0);ctx.lineTo(-radius-5,radius*.72);
    ctx.closePath();ctx.fillStyle=col;ctx.fill();
    ctx.strokeStyle='#fff5d9';ctx.lineWidth=1.6;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-radius-12,0);ctx.lineTo(radius+6,0);
    ctx.strokeStyle='#ffffffcc';ctx.lineWidth=1.4;ctx.stroke();
    if(id==='tessa'){
     ctx.beginPath();ctx.moveTo(-radius-6,-radius);ctx.lineTo(-radius-6,radius);
     ctx.strokeStyle='#ffe0a5';ctx.lineWidth=2;ctx.stroke();
    }
   }else if(id==='nyra'||id==='kaelis'){
    techPolygon(ctx,0,0,radius+5,id==='kaelis'?6:4,Math.PI/4+t*1.5);
    ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='#eefcff';ctx.lineWidth=1.5;ctx.stroke();
    circle(0,0,2.5,'#fff9ee');
   }else if(id==='seris'){
    for(let i=0;i<5;i++){
     const a=i*TAU/5;
     circle(Math.cos(a)*radius*.85,Math.sin(a)*radius*.85,radius*.57,col);
    }
    circle(0,0,3,'#fff0ef');
   }else{
    ctx.beginPath();ctx.moveTo(radius+8,0);ctx.lineTo(-radius,-radius);
    ctx.lineTo(-radius,radius);ctx.closePath();ctx.fillStyle=col;ctx.fill();
    circle(0,0,3,'#fff8e6');
   }
   if(p.empowered){
    circle(0,0,radius+9,null,'#fff0c2a8',2);
    circle(0,0,radius+12,null,col+'8c',1.3);
   }
   ctx.restore();
  }else{
   circle(p.x,p.y,radius,col);
   circle(p.x,p.y,Math.max(2,radius*.4),'#fff9e6');
  }
  ctx.restore();
 }
 for(const f of S.effects){
  if(!visible(f.x,f.y,f.r+8)||!E.isPointVisible(0,f))continue;
  if(f.kind==='damageNumber'){
   const progress=1-f.life/f.maxLife;
   ctx.save();ctx.globalAlpha=clamp(f.life/f.maxLife,0,1);
   ctx.textAlign='center';ctx.font='900 20px system-ui';
   ctx.fillStyle=f.color||'#ffe2a4';ctx.shadowColor='#020e15';ctx.shadowBlur=6;
   ctx.fillText('-'+f.value,f.x,f.y-progress*33);
   ctx.restore();continue;
  }
  ctx.save();ctx.globalAlpha=clamp(f.life/f.maxLife,0,1)*.77;
  const r=f.kind==='hit'?f.r:f.r*(1-f.life/f.maxLife*.7);
  circle(f.x,f.y,r,f.kind==='blast'?f.color+'22':null,f.color,2.8);
  if(f.kind==='attackLaunch'){
   ctx.save();ctx.globalAlpha=clamp(f.life/f.maxLife,0,1)*.58;
   for(let i=0;i<3;i++){
    const a=t*2+i*TAU/3;
    circle(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,2.8,f.color);
   }
   ctx.restore();
  }
  if(f.kind==='burst')for(let i=0;i<10;i++){
   const a=i*TAU/10;circle(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,4,f.color);
  }
  ctx.restore();
 }
}
function drawAim(){
 if(S.hero&&S.hero.focusTarget&&S.hero.focusUntil>S.time&&S.hero.focusTarget.hp>0){
  const structure=S.hero.focusTarget,radius=structure.r||(structure.kind==='boss'?38:28);
  ctx.save();circle(structure.x,structure.y,radius+15,null,'#f3e2a4a8',2.1);ctx.restore();
 }
 const locked=S.hero?.mobileAttackTarget;
 if(locked&&locked.hp>0&&E.isAttackCommandValid(S.hero,locked))
  circle(locked.x,locked.y,(locked.r||25)+15,null,'#ffe3a3ce',2.5);
 if(aaAim?.dragged&&S.hero&&S.hero.hp>0){
  const h=S.hero,r=E.attackRange(h),target=aaAim.target;
  ctx.save();ctx.strokeStyle='#f5da9bbd';ctx.lineWidth=2.1;
  ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(h.x,h.y,r,0,E.TAU);ctx.stroke();
  ctx.setLineDash([]);
  const dir=E.norm(aaAim.dx,aaAim.dy);
  const tx=target?target.x:h.x+dir.x*r,ty=target?target.y:h.y+dir.y*r;
  ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(tx,ty);ctx.stroke();
  if(target){
   circle(target.x,target.y,(target.r||23)+18,null,'#fff0aa',3);
   circle(target.x,target.y,(target.r||23)+9,null,'#fff0aa99',1.5);
  }else circle(tx,ty,12,null,'#f7ddb68c',2);
  ctx.restore();
 }
 if((pointers.aa!==null||S.hero&&S.time-(S.hero.attackStartedAt||-100)<.65)&&S.hero&&S.hero.hp>0){
  const r=E.attackRange(S.hero),target=E.findAA(S.hero);
  circle(S.hero.x,S.hero.y,r,null,'#a3e8d137',1.25);
  if(target)circle(target.x,target.y,target.r+11,null,'#e7e2beaa',2.2);
 }
 if(wardAim&&S.hero&&S.hero.hp>0){
  const point=wardPoint(wardAim),hero=S.hero;
  ctx.save();ctx.globalAlpha=.84;
  circle(hero.x,hero.y,E.WARD_RANGE,null,'#98f5c364',1.6);
  ctx.setLineDash([6,9]);ctx.strokeStyle='#b5ffdbb9';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(hero.x,hero.y);ctx.lineTo(point.x,point.y);ctx.stroke();
  ctx.setLineDash([]);
  circle(point.x,point.y,29,'#72e9b51f','#b9ffe0',2);
  circle(point.x,point.y,8,'#bdffe6');
  ctx.globalAlpha=.21;circle(point.x,point.y,295,'#7decb719');
  ctx.restore();
 }
 if(aimPreview&&S.hero&&S.hero.hp>0){
  const def=E.skillDef(aimPreview.id),aim=aimData(aimPreview),u=S.hero;
  ctx.save();ctx.globalAlpha=.76;ctx.strokeStyle=def.ultimate?'#f8dea0':C.heroes[u.id].color;ctx.lineWidth=2;
  if(def.aim==='area'){
   circle(u.x,u.y,def.range,null,ctx.strokeStyle,1);
   circle(aim.center.x,aim.center.y,def.radius,ctx.strokeStyle+'22',ctx.strokeStyle,2.4);
   circle(aim.center.x,aim.center.y,7,'#f7ffee');
  }else if(def.aim==='direction'){
   ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(u.x,u.y);
   ctx.lineTo(u.x+aim.x*def.range,u.y+aim.y*def.range);ctx.stroke();
   ctx.setLineDash([]);
   circle(u.x+aim.x*def.range,u.y+aim.y*def.range,def.radius||16,null,ctx.strokeStyle,2);
  }
  ctx.restore();
 }
 if(S.marker){
  if(S.time>=S.marker.until)S.marker=null;
  else{
   ctx.save();ctx.translate(S.marker.x,S.marker.y);ctx.rotate(S.time*.8);
   ctx.strokeStyle='#ffe9a8';ctx.lineWidth=3;ctx.strokeRect(-13,-13,26,26);ctx.restore();
  }
 }
}
function drawFog(){
 if(S.mode!=='playing'&&S.mode!=='ended')return;
 // Visão de equipe como no MOBA: campeões, tropas, torres e sentinelas
 // revelam áreas inteiras, com bordas suavizadas (sem quadrados na lane).
 const x=S.camera.x,y=S.camera.y,scaleX=fogCanvas.width/worldVW,scaleY=fogCanvas.height/worldVH;
 if(fogAt<0||S.time-fogAt>.12||Math.abs(x-fogCamX)>5||Math.abs(y-fogCamY)>5){
  fogAt=S.time;fogCamX=x;fogCamY=y;
  fogContext.setTransform(scaleX,0,0,scaleY,-x*scaleX,-y*scaleY);
  fogContext.globalCompositeOperation='source-over';
  fogContext.clearRect(x-6,y-6,worldVW+12,worldVH+12);
  const cell=E.VISION_CELL;
  const x0=Math.max(0,Math.floor(x/cell)),x1=Math.min(E.VISION_COLS-1,Math.ceil((x+worldVW)/cell));
  const y0=Math.max(0,Math.floor(y/cell)),y1=Math.min(E.VISION_ROWS-1,Math.ceil((y+worldVH)/cell));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
   const discovered=S.seen[0]?.[cy*E.VISION_COLS+cx];
   // A névoa esconde informação, mas não deve transformar o mapa num
   // grande vazio preto ou em blocos escuros com bordas gritantes.
   fogContext.fillStyle=discovered?'rgba(5,20,30,.33)':'rgba(5,17,28,.56)';
   fogContext.fillRect(cx*cell-1,cy*cell-1,cell+2,cell+2);
  }
  fogContext.globalCompositeOperation='destination-out';
  for(const src of S.sight[0]||[]){
   const r=src.r||250;
   if(src.x+r<x||src.x-r>x+worldVW||src.y+r<y||src.y-r>y+worldVH)continue;
   const gradient=fogContext.createRadialGradient(src.x,src.y,0,src.x,src.y,r);
   gradient.addColorStop(0,'rgba(0,0,0,1)');
   gradient.addColorStop(.68,'rgba(0,0,0,1)');
   gradient.addColorStop(1,'rgba(0,0,0,.12)');
   fogContext.fillStyle=gradient;
   fogContext.beginPath();fogContext.arc(src.x,src.y,r,0,TAU);fogContext.fill();
  }
  fogContext.globalCompositeOperation='source-over';
 }
 ctx.drawImage(fogCanvas,x,y,worldVW,worldVH);
}
function drawWards(t){
 for(const ward of S.wards){
  if(ward.side!==0||!visible(ward.x,ward.y,38))continue;
  const x=ward.x,y=ward.y,pulse=.5+.5*Math.sin(t*2.8+ward.uid);
  ctx.save();ctx.globalAlpha=.8;
  circle(x,y,18+pulse*4,'#8ee8ca15','#a1f1d978',1.5);
  ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x+10,y);ctx.lineTo(x,y+15);ctx.lineTo(x-10,y);ctx.closePath();
  ctx.fillStyle='#9ef2c7';ctx.fill();ctx.strokeStyle='#efffe0';ctx.lineWidth=1.5;ctx.stroke();
  circle(x,y,3,'#efffe1');
  ctx.restore();
 }
}
function view(dt){
 if(!terrain)drawTerrain();
 const h=S.hero;
 if(h){
  const observing=cameraPeek&&(cameraPeek.ptr!==null||S.time<cameraPeekUntil);
  if(desktopCamera()){
   if(observing){
    // Minimap livre para exploração; câmera travada retorna somente após o peek.
    cameraCenterAt(cameraPeek.x,cameraPeek.y);
   }else if(cameraMode==='locked'||spaceCenterHeld){
    // Centro verdadeiro, sem antecipação de rota, ameaça ou atraso de interpolação.
    cameraCenterAt(h.x,h.y);
   }else{
    // Câmera livre nunca recentraliza sozinha, nem quando a rota muda.
    panFreeCamera(dt);
   }
  }else{
   // Follow realmente centrado no celular, sem empurrar o herói para o lado
   // oposto da rota. Espaço livre à esquerda para o dedo em movimento.
   const target=mobileCameraTarget(h,observing);
   const snap=h.cameraSnapAt&&S.time-h.cameraSnapAt<.23&&!observing;
   if(snap){
    S.camera.x=target.x;S.camera.y=target.y;
   }else{
    const follow=Math.min(1,dt*(observing?18:14));
    S.camera.x+=(target.x-S.camera.x)*follow;
    S.camera.y+=(target.y-S.camera.y)*follow;
   }
  }
  if(cameraPeek&&cameraPeek.ptr===null&&S.time>=cameraPeekUntil)cameraPeek=null;
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,vw,vh);
 ctx.save();ctx.scale(cameraZoom,cameraZoom);
 ctx.translate(-S.camera.x,-S.camera.y);
 // Na borda do mundo a câmera continua centralizando o campeão: o vazio
 // além dos limites é fundo não atravessável, não um mapa inventado.
 ctx.fillStyle='#091c2a';
 ctx.fillRect(S.camera.x,S.camera.y,worldVW,worldVH);
 ctx.drawImage(terrain,0,0);
 drawFog();
 drawWards(S.time);
 for(const o of S.camps)if(E.isPointVisible(0,o))drawCreep(o,S.time);
 for(const o of S.structures)drawStructure(o,S.time);
 for(const u of S.units.filter(u=>u.hp>0&&(u.side===0||E.visibleTo(0,u))).sort((a,b)=>a.y-b.y))
  u.kind==='hero'?drawHero(u,S.time):drawMinion(u,S.time);
 drawFX(S.time);drawAim();ctx.restore();
 minimap();
}
function minimap(){
 mc.fillStyle='#102a29';mc.fillRect(0,0,mm.width,mm.height);
 const scale=Math.min((mm.width-14)/E.W,(mm.height-14)/E.H);
 const ox=(mm.width-E.W*scale)/2,oy=(mm.height-E.H*scale)/2;
 mc.save();mc.translate(ox,oy);mc.scale(scale,scale);mc.lineCap='round';mc.lineJoin='round';
 // Mesmo limite físico do cenário: não sugerir que o vazio é explorável.
 mc.beginPath();
 E.ARENA_BOUNDARY.forEach((p,i)=>i?mc.lineTo(p.x,p.y):mc.moveTo(p.x,p.y));
 mc.closePath();mc.strokeStyle='#72a9a477';mc.lineWidth=13;mc.stroke();
 // Minimapa fiel à geometria jogável: só as três rotas, sem caminhos de selva.
 for(const path of E.ROUTE_PATHS){
  mc.beginPath();path.forEach((p,i)=>i?mc.lineTo(p.x,p.y):mc.moveTo(p.x,p.y));
  // Apenas no minimapa: a faixa representa o corredor navegável real,
  // não uma estrada decorativa desenhada dentro da partida.
  mc.strokeStyle='#9dc8c85c';mc.lineWidth=E.LANE_HALF_WIDTH*2;mc.stroke();
 }
 // Mesmas silhuetas físicas do cenário, sem desenhar 278 peças soltas.
 // Agrupar reduz trabalho por quadro e torna o mapa estratégico legível.
 const wallChains=new Map();
 for(const w of S.walls){
  const k=w.chain||w.id;
  if(!wallChains.has(k))wallChains.set(k,[]);
  wallChains.get(k).push(w);
 }
 for(const pieces of wallChains.values()){
  mc.beginPath();mc.moveTo(pieces[0].ax,pieces[0].ay);
  for(const piece of pieces)mc.lineTo(piece.bx,piece.by);
  mc.strokeStyle=pieces[0].wallClass==='base'?'#3e667c':'#315d72';
  mc.lineWidth=pieces[0].halfWidth*2+7;mc.stroke();
 }
 // Sem visão não aparecem inimigos nem objetivo; mapa explorado fica escurecido.
 const step=E.VISION_CELL*3;
 for(let y=0;y<E.H;y+=step)for(let x=0;x<E.W;x+=step){
  const px=x+step*.5,py=y+step*.5;
  if(E.isPointVisible(0,{x:px,y:py}))continue;
  const ix=Math.min(E.VISION_COLS-1,Math.floor(px/E.VISION_CELL));
  const iy=Math.min(E.VISION_ROWS-1,Math.floor(py/E.VISION_CELL));
  const discovered=S.seen[0]?.[iy*E.VISION_COLS+ix];
  mc.fillStyle=discovered?'#061827a8':'#03101de6';
  mc.fillRect(x,y,step+2,step+2);
 }
 for(const camp of S.camps){
  if(camp.kind!=='boss'||camp.hp<=0||camp.unlock&&S.time<camp.unlock||
      !E.isPointVisible(0,camp))continue;
  mc.fillStyle=camp.color;mc.beginPath();mc.arc(camp.x,camp.y,43,0,TAU);mc.fill();
 }
 for(const ward of S.wards){
  if(ward.side!==0)continue;
  mc.fillStyle='#e1ffd9';mc.beginPath();mc.arc(ward.x,ward.y,28,0,TAU);mc.fill();
 }
 for(const o of S.structures){if(o.hp<=0)continue;mc.fillStyle=E.SIDE[o.side];
  mc.fillRect(o.x-20,o.y-20,o.kind==='core'?40:28,o.kind==='core'?40:28);}
 for(const u of S.units){if(u.hp<=0||u.side===1&&!E.visibleTo(0,u))continue;mc.fillStyle=u.side===0?'#5cece3':'#ff7e9e';
  mc.beginPath();mc.arc(u.x,u.y,u.kind==='hero'?23:10,0,TAU);mc.fill();}
 if(S.hero){mc.strokeStyle='#fff4c5';mc.lineWidth=18;mc.beginPath();mc.arc(S.hero.x,S.hero.y,44,0,TAU);mc.stroke();}
 if(S.marker){mc.fillStyle='#ffe1a3';mc.beginPath();mc.arc(S.marker.x,S.marker.y,34,0,TAU);mc.fill();}
 mc.strokeStyle='#f6e9be';mc.lineWidth=17;mc.strokeRect(S.camera.x,S.camera.y,worldVW,worldVH);mc.restore();
 // Mini-orientação: os nomes ficam só no mapa estratégico, não simulam estradas.
 mc.save();mc.textAlign='center';mc.font='800 8px system-ui';
 mc.fillStyle='#c6efefb9';mc.shadowColor='#081723';mc.shadowBlur=4;
 for(let lane=0;lane<3;lane++){
  const p=E.pathPos(lane,.50);
  mc.fillText(['TOP','MID','BOT'][lane],ox+p.x*scale,oy+p.y*scale-3);
 }
 mc.restore();
}
// Retratos autorais: bustos e acessórios geométricos diferentes por campeão.
function championPortrait(id){
 const hero=C.heroes[id]||C.heroes.lyria,clr=hero.color;
 const helms={
  lyria:'M14 34L10 15L24 22L30 8L37 22L45 8L51 22L62 15L58 34Z',
  vexor:'M13 37L23 11L36 4L49 11L59 37L46 28L36 34L26 28Z',
  orun:'M15 37L15 16L25 9L47 9L57 16L57 37L47 32L25 32Z',
  nyra:'M15 35L15 16L25 26L32 5L36 22L43 5L49 26L57 16L57 35Z',
  seris:'M12 35Q10 15 25 18Q36 3 47 18Q62 15 60 35L47 29L36 35L25 29Z',
  brax:'M12 37L17 16L26 22L36 8L46 22L55 16L60 37L49 31L23 31Z',
  zhira:'M14 36L7 15L23 21L20 10L36 24L52 10L49 21L65 15L58 36L45 30L36 35L27 30Z',
  kaelis:'M15 34L12 12L29 23L36 3L43 23L60 12L57 34L47 29L36 33L25 29Z',
  rokar:'M12 38L14 12L28 12L36 4L44 12L58 12L60 38L51 33L21 33Z',
  tessa:'M14 35L18 19L32 13L45 17L57 11L58 31L46 28L28 32Z',
  sahra:'M10 35L15 12L26 20L36 5L46 20L57 12L62 35L46 30L36 36L26 30Z',
  mirielle:'M13 34L12 18L25 24L36 4L47 24L60 18L59 34L44 29L36 33L28 29Z',
  kaoryn:'M11 36L9 15L23 25L36 5L49 25L63 15L61 36L46 29L36 35L26 29Z',
  darian:'M13 33L12 19L27 12L44 12L60 19L59 33L45 25L27 25Z',
  elowen:'M8 37Q13 16 25 20L36 4L47 20Q59 16 64 37L48 28L36 37L24 28Z',
  tharok:'M11 39L8 12L26 16L36 3L46 16L64 12L61 39L49 31L23 31Z',
  varka:'M10 39L13 14L28 24L36 5L44 24L59 14L62 39L51 30L21 30Z',
  iskha:'M12 36L14 19L26 23L36 3L46 23L58 19L60 36L46 30L36 35L26 30Z'
 };
 const marks={
  lyria:'M8 53Q7 29 19 17M19 17L11 26M19 17L25 28',
  vexor:'M7 59L23 43L29 52M65 59L49 43L43 52',
  orun:'M8 51L17 40L23 64L7 66ZM64 51L55 40L49 64L65 66Z',
  nyra:'M8 23L18 9L27 21M64 23L54 9L45 21',
  seris:'M12 16Q19 4 28 20M44 20Q53 4 60 16',
  brax:'M7 50L16 40L29 55M65 50L56 40L43 55',
  zhira:'M8 53L15 45M64 53L57 45',
  kaelis:'M10 12L20 21M62 12L52 21M36 2V18',
  rokar:'M6 50L16 40L23 64L7 67ZM66 50L56 40L49 64L65 67Z',
  tessa:'M7 52L19 38M65 52L53 38M56 16L65 10',
  sahra:'M5 52L19 39L25 46M67 52L53 39L47 46',
  mirielle:'M9 18L22 15L21 28M63 18L50 15L51 28',
  kaoryn:'M6 54L20 38M66 54L52 38M12 16L21 24',
  darian:'M7 57L23 45M65 57L49 45M7 17L20 10M65 17L52 10',
  elowen:'M12 15Q21 4 30 17M60 15Q51 4 42 17M36 7V16',
  tharok:'M6 51L18 41L25 63M66 51L54 41L47 63',
  varka:'M7 55L19 40M65 55L53 40M6 18L21 9M66 18L51 9',
  iskha:'M9 17L25 25M63 17L47 25M36 2V16M16 49L25 39M56 49L47 39'
 };
 return '<svg class="fenda-champion-portrait-svg" viewBox="0 0 72 72" aria-hidden="true">'+
  '<circle cx="36" cy="36" r="34" fill="#071727" stroke="'+clr+'" stroke-width="2"/>'+
  '<circle cx="36" cy="36" r="29" fill="'+clr+'" fill-opacity=".13"/>'+
  '<path d="M6 68L12 43L26 33L46 33L60 43L66 68Z" fill="#263b4a" stroke="'+clr+'" stroke-width="2"/>'+
  '<path d="M22 31L50 31L45 49L39 53L33 53L27 49Z" fill="#dfb69d" stroke="#bd938b" stroke-width="1.5"/>'+
  '<path d="'+(helms[id]||helms.lyria)+'" fill="'+clr+'" fill-opacity=".8" stroke="#eef7e9" stroke-width="1.3"/>'+
  '<path d="M27 37L33 39L27 41M45 37L39 39L45 41" stroke="#102637" stroke-width="2.6" fill="none"/>'+
  '<path d="'+(marks[id]||marks.lyria)+'" stroke="'+clr+'" stroke-width="3" stroke-linecap="round" fill="none"/>'+
  '<circle cx="36" cy="59" r="4" fill="'+clr+'" stroke="#e6fff4" stroke-width="1"/>'+
  '</svg>';
}
function desktopHeroUpdate(h){
 const meta=C.heroes[h.id],lev=Math.max(1,h.level);
 if($('pcPortrait').dataset.hero!==h.id){
  $('pcPortrait').innerHTML=championPortrait(h.id);
  $('pcPortrait').dataset.hero=h.id;
 }
 $('pcPortrait').style.color=meta.color;
 $('pcPortrait').style.borderColor=meta.color;
 $('pcChampionName').textContent=meta.name;
 $('pcChampionLevel').textContent=h.hp>0?'NV '+lev:'RESSURGE '+Math.ceil(h.respawn)+'s';
 $('pcHPText').textContent=Math.ceil(Math.max(0,h.hp))+'/'+Math.round(h.maxHp)+' PV';
 $('pcManaNumber').textContent=h.manaFreeUntil>S.time?'∞ MANA':'MANA '+Math.ceil(h.mana);
 $('pcHPFill').style.width=Math.max(0,Math.min(100,h.hp/h.maxHp*100))+'%';
 $('pcManaFill').style.width=Math.max(0,Math.min(100,h.mana/E.maxMana(h)*100))+'%';
 $('pcXPFill').style.width=(lev<15?h.xp/(42+lev*24)*100:100)+'%';
 const buffs=(h.energyBuffUntil>S.time?' · AZUL '+Math.ceil(h.energyBuffUntil-S.time)+'s':'')+
  (h.damageBuffUntil>S.time?' · RUBRO '+Math.ceil(h.damageBuffUntil-S.time)+'s':'');
 $('pcExtraStats').textContent='K/D/A '+h.kills+'/'+h.deaths+'/'+(h.assists||0)+
' · '+h.cs+' TROPAS'+(h.roleKey==='jungle'||h.jungleCS>0?' · '+h.jungleCS+' MONSTROS':'')+buffs+
  (h.roleKey==='support'?' · SUP '+h.supportCharges+'/'+E.SUPPORT_MAX_CHARGES+
   ' · '+h.supportSharedCS+' REPASSADOS':
   h.supportReceivedCS>0?' · +'+h.supportReceivedCS+' REPASSADOS':'')+
  (h.skillPoints>0?' · '+h.skillPoints+' PONTOS +':'');
 $('pcGold').textContent='✦ '+Math.round(h.gold);
 const html=Array.from({length:6},(_,i)=>{
  const it=E.ITEMS.find(x=>x.id===h.items[i]);
  return it?'<span class="pc-item occupied" title="'+it.name+' · '+it.stat+'">'+it.icon+'</span>':
   '<span class="pc-item empty" aria-hidden="true">·</span>';
 }).join('');
 if($('pcItems').innerHTML!==html)$('pcItems').innerHTML=html;
}
function desktopRosterUpdate(){
 const sections=[0,1].map(side=>{
  const players=S.units.filter(u=>u.kind==='hero'&&u.side===side)
   .sort((a,b)=>(scoreOrder[a.roleKey]??9)-(scoreOrder[b.roleKey]??9));
  const rows=players.map(u=>{
   const data=C.heroes[u.id],dead=u.hp<=0,seen=side===0||dead||E.visibleTo(0,u);
   const life=seen&&!dead?Math.max(0,Math.min(100,u.hp/u.maxHp*100)):0;
   const mana=seen&&!dead?Math.max(0,Math.min(100,u.mana/E.maxMana(u)*100)):0;
   const spells=(u.summoners||[]).map(id=>E.SUMMONERS[id]?.icon||'◇').join('');
   return '<div class="pc-roster-entry'+(u.controlled?' self':'')+(dead?' dead':'')+
    (!seen?' unseen':'')+'" title="'+data.name+' · '+data.role+'">'+
    '<span class="pc-roster-portrait" style="color:'+data.color+';border-color:'+data.color+'77">'+championPortrait(u.id)+'</span>'+
    '<div class="pc-roster-main"><div class="pc-roster-name">'+data.name+
    '<span>'+(dead?Math.ceil(u.respawn)+'s':seen?'NV '+u.level:'SEM VISÃO')+'</span></div>'+
    '<div class="pc-roster-hp"><i style="width:'+life+'%"></i></div>'+
    '<div class="pc-roster-mana"><i style="width:'+mana+'%"></i></div></div>'+
    '<div class="pc-roster-meta"><strong>'+u.kills+'/'+u.deaths+'/'+(u.assists||0)+'</strong>'+
    '<small>'+spells+'</small></div></div>';
  }).join('');
  return '<div class="pc-roster-team '+(side===0?'blue':'red')+'">'+
   '<strong class="pc-roster-heading">'+(side===0?'EQUIPE AZUL':'EQUIPE RUBRA')+'</strong>'+rows+'</div>';
 });
 $('pcRosterList').innerHTML=sections.join('');
}
function hudUpdate(){
 const h=S.hero;if(!h)return;
 firstSkillUpdate(h);
 const time=Math.floor(S.time);
 $('fendaTopScore').textContent='✦ '+S.kills[0]+' AZUL × '+S.kills[1]+' RUBRO';
 $('fendaPlayerStats').textContent='K/D/A '+h.kills+'/'+h.deaths+'/'+(h.assists||0)+' · FARM '+h.cs+
(h.roleKey==='jungle'||h.jungleCS>0?' · SELVA '+h.jungleCS:'')+
  (h.energyBuffUntil>S.time?' · AZUL '+Math.ceil(h.energyBuffUntil-S.time)+'s':'')+
  (h.damageBuffUntil>S.time?' · VERMELHO '+Math.ceil(h.damageBuffUntil-S.time)+'s':'');
 shareInfo.hidden=h.roleKey!=='support'&&!(h.supportReceivedCS>0);
 shareInfo.classList.toggle('complete',!!h.supportQuestComplete);
 shareInfo.textContent=h.roleKey==='support'?
  'EMBLEMA '+h.supportCharges+'/'+E.SUPPORT_MAX_CHARGES+' · QUEST '+
  Math.min(E.SUPPORT_QUEST_GOAL,h.supportQuestGold)+'/'+E.SUPPORT_QUEST_GOAL+
  ' · '+h.supportGoldShared+'G REPASSADOS':
  h.supportReceivedCS>0?'SUP: '+h.supportReceivedCS+
   ' TROPAS · +'+h.supportGoldReceived+' OURO':'';
 $('fendaGold').textContent='✦ '+Math.round(h.gold)+' OURO';
 $('fendaTime').textContent=String(Math.floor(time/60)).padStart(2,'0')+':'+String(time%60).padStart(2,'0');
 $('fendaName').textContent=C.heroes[h.id].name+' · '+(currentLane()?.short||'')+' · NV '+h.level+
  (h.skillPoints>0?' · ✦ '+h.skillPoints+' PONTOS':'')+
  (h.hp<=0?' · RESSURGE '+Math.ceil(h.respawn)+'s':'');
 $('fendaHP').style.width=(h.hp/h.maxHp*100)+'%';
 $('fendaMana').style.width=(h.mana/E.maxMana(h)*100)+'%';
 $('fendaManaText').textContent=h.manaFreeUntil>S.time?'∞ MANA LIVRE '+Math.ceil(h.manaFreeUntil-S.time)+'s':'MANA '+Math.ceil(h.mana)+'/'+E.maxMana(h);
 $('fendaXP').style.width=(h.level<15?h.xp/(42+h.level*24)*100:100)+'%';
 desktopHeroUpdate(h);
 const towerList=S.structures.filter(s=>s.kind==='tower'&&s.hp>0);
 const bossStatus=id=>{
  const c=S.camps.find(o=>o.id===id);
  if(!c)return '—';
  if(S.time<c.unlock)return Math.ceil(c.unlock-S.time)+'s';
  if(c.hp<=0)return Math.ceil(c.respawn)+'s';
  return 'DISPONÍVEL';
 };
 const blueBuff=S.teamBuffs[0],buffNames=[];
 if(blueBuff.serpe>S.time)buffNames.push('SERPE '+Math.ceil(blueBuff.serpe-S.time)+'s');
 if(blueBuff.titan>S.time)buffNames.push('TITÃ '+Math.ceil(blueBuff.titan-S.time)+'s');
 const tactic=S.teamAI?.[0];
 const tacticalLabel=tactic&&E.dist(h,tactic.center)<570?
   (tactic.mode==='engage'?' · TIME: AVANÇAR':tactic.mode==='retreat'?' · TIME: RECUAR':' · TIME: PROTEGER'):'';
 $('fendaObjectives').textContent='SERPE '+bossStatus('serpe')+' · TITÃ '+bossStatus('titan')+
   (buffNames.length?' · BÊNÇÃO '+buffNames.join(' / '):'')+tacticalLabel;
 const towers=towerList;
 const phaseText={laning:'ROTAS',objectives:'OBJETIVOS',siege:'CERCO FINAL'}[S.phase]||'ROTAS';
 $('fendaInfo').textContent=phaseText+' · TORRES AZUL '+towers.filter(t=>t.side===0).length+
   ' / RUBRO '+towers.filter(t=>t.side===1).length+' · '+h.cs+' CS';
 $('fendaNotice').style.display=S.time<S.noticeUntil?'block':'none';$('fendaNotice').textContent=S.notice;
 const kit=C.heroes[h.id].skills.concat([C.heroes[h.id].ultimate]);
 for(let i=0;i<kit.length;i++){
  const b=$(['dashBtn','pulseBtn','shieldBtn','ultBtn'][i]),id=kit[i],def=E.skillDef(id),
    rank=E.skillRank(h,id),cap=E.skillRankCap(h,id),
    lock=rank===0,cd=h.cooldowns[id]||0,
    recast=(id==='sahra_ult'&&h.sahraSecondUntil>S.time||
      id==='mirielle_distort'&&h.mirrorReturn?.until>S.time);
  b.querySelector('b').textContent=def.icon;
  b.querySelector('small').textContent=lock?(def.ultimate&&h.level<5?'NV 5':'APRENDER'):
   recast?(id==='sahra_ult'?'2ª INVEST.':'VOLTAR'):def.short;
  b.title=def.name+' · '+def.desc;
  b.setAttribute('aria-label',def.name+'. '+def.desc);
  b.classList.toggle('oncd',!recast&&(cd>.03||lock||
   (h.mana<def.cost&&h.manaFreeUntil<=S.time))||h.hp<=0);
  const pc=$('pcSkill'+i);
  pc.querySelector('b').textContent=def.icon;
  pc.querySelector('small').textContent=lock?(def.ultimate&&h.level<5?'NV 5':'APRENDER'):
   recast?(id==='sahra_ult'?'2ª INVEST.':'RETORNAR'):def.short;
  pc.querySelector('.pc-rank').textContent=rank+'/'+(def.ultimate?3:5);
  pc.querySelector('.pc-cooldown').textContent=lock?'🔒':recast?'':cd>.03?Math.ceil(cd):'';
  pc.classList.toggle('oncd',!recast&&(lock||cd>.03||
   (h.mana<def.cost&&h.manaFreeUntil<=S.time))||h.hp<=0);
  pc.title=def.name+' · '+def.desc;
  const el=b.querySelector('.cd-text');el.hidden=recast||cd<=.03&&!lock;
  el.textContent=lock?'🔒':recast?'':cd>.03?Math.ceil(cd):'';
  let rankBadge=b.querySelector('.fenda-skill-rank');
  if(!rankBadge){rankBadge=document.createElement('span');rankBadge.className='fenda-skill-rank';b.appendChild(rankBadge);}
  rankBadge.textContent=rank+'/'+(def.ultimate?3:5);
  const upgrade=upgradeButtons[i],canUp=h.skillPoints>0&&rank<cap&&h.hp>0&&!S.shopOpen&&!S.showPause&&!scoreboardVisible;
  upgrade.hidden=!canUp;
  if(canUp){
   const isDesktop=window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
   const bounds=(isDesktop?$('pcSkill'+i):b).getBoundingClientRect(),stageBounds=stage.getBoundingClientRect();
   upgrade.style.left=Math.round(bounds.left-stageBounds.left+bounds.width*.70)+'px';
   upgrade.style.top=Math.max(5,Math.round(bounds.top-stageBounds.top-16))+'px';
  }
 }
 $('fireBtn').querySelector('b').textContent='➤';
 $('fireBtn').querySelector('small').textContent=h.hp<=0?'RESSURGIR':'ATACAR';
 const aaBtn=$('fireBtn');
 aaBtn.classList.toggle('oncd',h.hp<=0||h.attackCd>.02);
 const aaCD=aaBtn.querySelector('.cd-text');
 if(aaCD){
  aaCD.hidden=h.attackCd<=.03||h.hp<=0;
  aaCD.textContent=h.attackCd>0?h.attackCd.toFixed(1):'';
 }
 const targetTowers=S.structures.filter(t=>t.side!==h.side&&t.hp>0&&
  (t.kind==='tower'||t.kind==='core')&&dist(h,t)<=E.attackRange(h)+t.r+2);
 const towerBtn=$('fendaTowerBtn');
 towerBtn.disabled=h.hp<=0||targetTowers.length===0;
 towerBtn.classList.toggle('available',targetTowers.length>0&&h.hp>0);
 towerBtn.classList.toggle('focused',!!h.focusTarget&&h.focusUntil>S.time&&h.focusTarget.hp>0);
 for(const [i,id] of (h.summoners||[]).entries()){
  const b=summonerPanel.querySelector('[data-slot="'+i+'"]'),sp=E.SUMMONERS[id],cd=h.summonerCooldowns[id]||0;
  if(!b||!sp)continue;
  b.querySelector('b').textContent=sp.icon;b.querySelector('small').textContent=sp.name.toUpperCase();
  b.querySelector('.spell-effect').textContent=shortSummonerEffect[id]||'FEITIÇO';
  b.setAttribute('aria-label',sp.name+'. '+sp.desc);
  b.querySelector('em').textContent=cd>.03?Math.ceil(cd):'';
  b.classList.toggle('oncd',cd>.03||h.hp<=0);b.title=sp.desc;
  const pc=desktopBar.querySelector('[data-pc-spell="'+i+'"]');
  pc.querySelector('b').textContent=sp.icon;
  pc.querySelector('.pc-cooldown').textContent=cd>.03?Math.ceil(cd):'';
  pc.title=sp.name+' · '+sp.desc;
  pc.classList.toggle('oncd',cd>.03||h.hp<=0);
 }
 const wardBtn=$('fendaWardBtn');
 wardBtn.disabled=h.hp<=0||h.visionCd>0;
 wardBtn.classList.toggle('available',h.hp>0&&h.visionCd<=0);
 $('fendaWardCD').textContent=h.visionCd>0?Math.ceil(h.visionCd)+'s':'';
 const pcWard=$('pcWard');
 pcWard.classList.toggle('oncd',h.visionCd>0||h.hp<=0);
 pcWard.querySelector('.pc-cooldown').textContent=h.visionCd>0?Math.ceil(h.visionCd):'';
 if(!rosterCollapsed&&S.time-rosterLastUpdate>.42){
  rosterLastUpdate=S.time;desktopRosterUpdate();
 }
 if(scoreboardVisible&&S.time-scoreboardLastUpdate>.42){
  scoreboardLastUpdate=S.time;renderScoreboard();
 }
}
// Placar de partida: as mesmas informações acionadas pelo placar do Wild Rift.
const scoreRoles={top:'TOP',jungle:'SELVA',mid:'MEIO',adc:'ATIR.',support:'SUP.'};
const scoreOrder={top:0,jungle:1,mid:2,adc:3,support:4};
function scoreboardItems(hero){
 const slots=Array.from({length:6},(_,i)=>hero.items[i]||null);
 return '<div class="fenda-scoreboard-items">'+slots.map(id=>{
  const item=id?E.ITEMS.find(x=>x.id===id):null;
  return item?'<span class="fenda-scoreboard-item" title="'+item.name+' · '+item.stat+'">'+item.icon+'</span>':
   '<span class="fenda-scoreboard-item empty">·</span>';
 }).join('')+'</div>';
}
function scoreTeam(side){
 const heroes=S.units.filter(u=>u.kind==='hero'&&u.side===side)
  .sort((a,b)=>(scoreOrder[a.roleKey]??9)-(scoreOrder[b.roleKey]??9));
 const aliveTowers=S.structures.filter(t=>t.kind==='tower'&&t.side===side&&t.hp>0).length;
 const farm=heroes.reduce((sum,u)=>sum+(u.cs||0),0);
 const monsters=heroes.reduce((sum,u)=>sum+(u.jungleCS||0),0);
 const totalGold=heroes.reduce((sum,u)=>sum+E.heroWealth(u),0);
 const color=side===0?'azul':'rubro',title=side===0?'EQUIPE AZUL':'EQUIPE RUBRA';
 const rows=heroes.map(u=>{
  const hero=C.heroes[u.id],dead=u.hp<=0;
  const deathInfo=dead?' · RESSURGE '+Math.ceil(u.respawn)+'s':' · NV '+u.level;
  return '<div class="fenda-scoreboard-player'+(u.controlled?' is-self':'')+(dead?' is-dead':'')+'">'+
   '<span class="fenda-scoreboard-role">'+(scoreRoles[u.roleKey]||'ROTA')+'</span>'+
   '<div class="fenda-scoreboard-champion"><span class="fenda-scoreboard-symbol" style="color:'+hero.color+'">'+championPortrait(u.id)+'</span>'+
   '<span><strong>'+hero.name+'</strong><small>'+(u.controlled?'VOCÊ':'BOT')+deathInfo+'</small></span></div>'+
   '<strong class="fenda-scoreboard-kda">'+u.kills+'/'+u.deaths+'/'+(u.assists||0)+'</strong>'+
   '<span class="fenda-scoreboard-cs">'+(u.cs||0)+' <small>CS</small>'+
(u.roleKey==='jungle'||u.jungleCS>0?'<small>+'+(u.jungleCS||0)+' SELVA</small>':'')+
    (u.supportReceivedCS>0?'<small> +'+u.supportReceivedCS+' PART.</small>':
     u.roleKey==='support'?'<small> '+u.supportSharedCS+' REP.</small>':'')+'</span>'+
   '<span class="fenda-scoreboard-gold" title="Patrimônio (ouro + itens): '+E.heroWealth(u)+' · Disponível: '+Math.round(u.gold||0)+'">'+E.heroWealth(u)+' ✦</span>'+
   scoreboardItems(u)+'</div>';
 }).join('');
 return '<section class="fenda-scoreboard-team '+color+'">'+
  '<div class="fenda-scoreboard-teamhead"><strong>'+title+' <em>'+S.kills[side]+' ABATES</em></strong>'+
  '<span>'+aliveTowers+' TORRES · '+farm+' CS · '+monsters+' SELVA · '+totalGold+' ✦</span></div>'+
  '<div class="fenda-scoreboard-colheads"><span>ROTA</span><span>CAMPEÃO</span>'+
  '<span>K/D/A</span><span>FARM</span><span>PATR.</span><span>ITENS</span></div>'+rows+'</section>';
}
function renderScoreboard(){
 $('fendaScoreboardTeams').innerHTML=scoreTeam(0)+scoreTeam(1);
}
function setScoreboardVisible(visible,viaTab=false){
 scoreboardVisible=Boolean(visible&&S.mode==='playing');
 scoreboardHeld=Boolean(scoreboardVisible&&viaTab);
 scoreboard.classList.toggle('open',scoreboardVisible);
 $('fendaScoreBtn').setAttribute('aria-expanded',String(scoreboardVisible));
 if(scoreboardVisible){
  keys.clear();joy.ptr=null;joy.x=joy.y=0;
  scoreboardLastUpdate=S.time;renderScoreboard();
 }
}
const suggestedBuilds={
 lyria:['boots','swiftboots','astralbow','barrage','stormblade'],
 nyra:['boots','arcaneboots','archmage','deepsea','hourglass'],
 vexor:['boots','hunterboots','stormblade','astralbow'],
 orun:['boots','guardianboots','bulwark','titanplate'],
 seris:['boots','guardianboots','lifebloom','deepsea','hourglass'],
 brax:['boots','guardianboots','warheart','bulwark'],
 zhira:['boots','hunterboots','huntress','stormblade'],
 kaelis:['boots','arcaneboots','glacier','archmage','hourglass'],
 rokar:['boots','guardianboots','bulwark','lifebloom'],
 tessa:['boots','swiftboots','phantomfang','astralbow','barrage'],
 sahra:['boots','hunterboots','phantomfang','stormblade'],
 mirielle:['boots','arcaneboots','archmage','hourglass','glacier'],
 kaoryn:['boots','swiftboots','bloodedge','ruinblade','barrage'],
 darian:['boots','swiftboots','bloodedge','eclipseknife','ruinblade'],
 elowen:['boots','guardianboots','incensario','lifebloom','deepsea'],
 tharok:['boots','guardianboots','stoneheart','bulwark','incensario'],
 varka:['boots','guardianboots','warheart','ruinblade','stoneheart'],
 iskha:['boots','arcaneboots','stormcrown','voidstaff','glacier']
};
// Recomendação dinâmica considera os adversários realmente selecionados,
// sem substituir as builds sugeridas por itens sem atributos úteis à classe.
function recommendedFor(hero){
 const base=suggestedBuilds[hero.id]||[],enemy=S.units.filter(u=>u.kind==='hero'&&u.side!==hero.side);
 const hasHeal=enemy.some(e=>['seris','elowen','varka'].includes(e.id)||
   e.items?.some(id=>['lifebloom','incensario','warheart'].includes(id)));
 const tanks=enemy.filter(e=>['orun','rokar','tharok','brax','varka'].includes(e.id)||e.items?.includes('stoneheart')).length;
 const physical=['lyria','tessa','kaoryn','darian','vexor','zhira','sahra','brax','varka'].includes(hero.id);
 const magic=['nyra','kaelis','iskha','mirielle','seris','elowen'].includes(hero.id);
 const counters=[];
 if(tanks>=2)counters.push(physical?'ruinblade':magic?'voidstaff':'stoneheart');
 if(hasHeal&&magic)counters.push('corruptmask');
 if(enemy.filter(e=>['lyria','tessa','kaoryn','darian'].includes(e.id)).length>=2&&
    ['orun','rokar','tharok','varka','brax'].includes(hero.id))counters.push('stoneheart');
 if(hero.roleKey==='support'&&hero.id==='elowen')counters.push('incensario');
 return [...new Set([...base.slice(0,2),...counters,...base.slice(2)])].filter(id=>E.ITEMS.some(it=>it.id===id)).slice(0,8);
}
const itemInfo=id=>E.ITEMS.find(x=>x.id===id);
const shopKinds={
 lens:'attack',astralbow:'attack',stormblade:'attack',stride:'speed',
 boots:'speed',swiftboots:'speed',arcaneboots:'speed',guardianboots:'speed',hunterboots:'speed',
 prism:'magic',archmage:'magic',deepsea:'magic',cell:'magic',
 ward:'defense',bulwark:'defense',titanplate:'defense',hourglass:'defense',core:'utility',warheart:'defense',huntress:'attack',fang:'attack',sprout:'defense',phantomfang:'attack',glacier:'magic',lifebloom:'defense',barrage:'attack',
 ruinblade:'attack',bloodedge:'attack',eclipseknife:'attack',corruptmask:'magic',voidstaff:'magic',stormcrown:'magic',stoneheart:'defense',incensario:'magic'
};
const kindNames={attack:'DANO',magic:'MAGIA',defense:'DEFESA',speed:'MOBILIDADE',utility:'UTILIDADE'};
let shopTab='recommended',shopFilter='all',shopSelectedId=null,shopQueuedId=null,shopInspectBackId=null;
// Símbolos vetoriais próprios para cada item; sem imagens externas.
const ITEM_ART={
 lens:'<ellipse cx="32" cy="31" rx="16" ry="19"/><path d="M16 31Q32 9 48 31Q32 52 16 31Z"/><circle cx="32" cy="31" r="7" fill="currentColor" opacity=".48"/><path d="M32 9V4M32 58V54M12 31H6M58 31H52"/>',
 ward:'<path d="M32 5L51 13V34Q48 48 32 57Q16 48 13 34V13Z"/><path d="M32 13L43 19V34L32 46L21 34V19Z"/><path d="M32 16V45M23 30H41"/>',
 stride:'<path d="M17 15L29 12L32 30L42 36L54 36L55 46L48 52H12V43L20 36Z"/><path d="M34 12L44 8M37 18L52 16M38 23L52 27M18 46H53"/>',
 boots:'<path d="M17 15L29 12L31 31L42 36L54 36L55 48L48 55H11V44L20 36Z"/><path d="M14 49H51M32 30L38 38M40 36V44"/>',
 arcaneboots:'<path d="M17 15L29 12L31 31L42 36L54 36L55 48L48 55H11V44L20 36Z"/><path d="M14 49H51M34 15L39 26L34 32L29 26Z" fill="currentColor" opacity=".35"/>',
 guardianboots:'<path d="M17 15L29 12L31 31L42 36L54 36L55 48L48 55H11V44L20 36Z"/><path d="M14 49H51M34 14L44 18V27Q39 34 34 35Q28 32 24 27V18Z" fill="currentColor" opacity=".25"/>',
 hunterboots:'<path d="M17 15L29 12L31 31L42 36L54 36L55 48L48 55H11V44L20 36Z"/><path d="M14 49H51M37 11L45 21L37 30M40 21H53"/>',
 cell:'<path d="M16 17L32 6L49 17V45L32 57L16 45Z"/><path d="M34 11L25 31H37L29 52L43 27H31Z" fill="currentColor" opacity=".45"/>',
 prism:'<path d="M32 5L48 22L42 47L32 59L21 47L16 22Z"/><path d="M16 22H48M32 5V59M21 47L32 22L42 47M32 22L24 10M32 22L41 10"/>',
 core:'<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="10" fill="currentColor" opacity=".26"/><path d="M32 3V12M32 52V61M3 32H12M52 32H61M11 11L18 18M46 46L53 53M11 53L18 46M46 18L53 11"/>',
 astralbow:'<path d="M14 6Q42 32 14 58M16 7L17 57M25 35L54 18L43 34L55 38L25 35Z" fill="currentColor" opacity=".24"/><path d="M22 33L52 31M35 19L53 31L36 45"/>',
 stormblade:'<path d="M12 49L49 10L54 10L54 16L18 53Z"/><path d="M28 41L13 26M17 22L37 42M44 8L57 8L57 21M13 49L8 56"/>',
 bulwark:'<path d="M32 3L54 15V34Q51 51 32 61Q13 51 10 34V15Z"/><path d="M32 12L45 21V34Q43 44 32 51Q21 44 19 34V21Z"/><path d="M13 31H51M32 15V50"/>',
 titanplate:'<path d="M13 12L24 7L32 14L40 7L51 12L55 29L47 37V55H17V37L9 29Z"/><path d="M18 18L30 24L32 52L34 24L46 18M17 37H47M25 8L32 19L39 8"/>',
 swiftboots:'<path d="M16 20L29 16L30 32L45 38H55L56 49L49 55H10V44L18 36Z"/><path d="M7 18L20 14M6 27L18 25M4 36L15 34M20 49H53"/>',
 archmage:'<path d="M29 55L34 14M28 57H40M24 13L33 3L42 13L33 26Z" fill="currentColor" opacity=".25"/><path d="M12 31Q21 23 26 31M40 31Q49 23 56 31M18 41L27 36M42 36L50 41"/>',
 hourglass:'<path d="M19 7H45M19 57H45M21 9Q21 23 32 31Q43 23 43 9M21 55Q21 41 32 33Q43 41 43 55"/><path d="M24 16H40L32 27Z" fill="currentColor" opacity=".32"/><path d="M32 38L25 51H39Z" fill="currentColor" opacity=".32"/>',
 deepsea:'<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="13" fill="currentColor" opacity=".22"/><path d="M10 35Q21 26 32 36Q43 45 54 34M9 44Q21 36 33 45Q43 52 55 44"/><circle cx="27" cy="22" r="4" fill="currentColor" opacity=".45"/>',
 warheart:'<path d="M32 57Q8 40 11 23Q13 13 24 13L32 21L40 13Q51 13 53 23Q56 40 32 57Z"/><path d="M32 51V21M17 32H47"/><path d="M25 9L32 4L39 9"/><circle cx="32" cy="34" r="7" fill="currentColor" opacity=".24"/>',
 huntress:'<path d="M13 52L46 9L54 6L50 17L25 56Z"/><path d="M20 21L27 30L42 13M8 36L21 42M12 55L5 59M49 34L57 26"/><path d="M17 10Q29 8 35 18Q26 13 19 24Z" fill="currentColor" opacity=".21"/>',
 fang:'<path d="M14 49L42 8L54 5L46 20L20 54Z"/><path d="M9 45L23 56M36 14L48 28"/><circle cx="17" cy="47" r="4" fill="currentColor" opacity=".5"/>',
 sprout:'<path d="M32 56V26M32 39Q11 43 10 23Q24 20 32 39ZM33 32Q49 12 56 22Q56 43 33 42Z"/><path d="M18 55Q32 48 46 55M29 17Q32 9 35 17"/><circle cx="32" cy="27" r="5" fill="currentColor" opacity=".3"/>',
 phantomfang:'<path d="M12 56L41 5L55 7L46 24L29 54Z"/><path d="M16 44L39 17M8 46L24 58M45 8L56 20"/><circle cx="43" cy="26" r="6" fill="currentColor" opacity=".4"/>',
 glacier:'<path d="M32 4V60M4 32H60M12 12L52 52M52 12L12 52"/><path d="M25 7L32 15L39 7M25 57L32 49L39 57M7 25L15 32L7 39M57 25L49 32L57 39M9 17L20 17L20 9M55 17L44 17L44 9M9 47L20 47L20 55M55 47L44 47L44 55"/><circle cx="32" cy="32" r="9" fill="currentColor" opacity=".4"/>',
 lifebloom:'<path d="M32 57V38M32 33Q7 18 15 8Q30 7 32 29Q34 7 49 8Q57 18 32 33Z"/><path d="M32 35Q6 24 6 39Q15 55 32 39Q49 55 58 39Q58 24 32 35Z"/><circle cx="32" cy="35" r="7" fill="currentColor" opacity=".4"/>',
 barrage:'<path d="M9 18L50 7L56 18L23 40L10 55L6 43Z"/><path d="M25 27L52 45M35 21L58 37M16 33L43 57"/><path d="M45 11L54 17L43 28" fill="currentColor" opacity=".35"/>',
 ruinblade:'<path d="M12 57L50 6L58 5L55 16L20 59Z"/><path d="M26 33L43 39M16 45L35 50"/>',
 bloodedge:'<path d="M10 52L39 8L53 12L31 57Z" fill="currentColor" opacity=".14"/><path d="M17 37L40 12M18 50L50 50M48 18L55 25"/>',
 eclipseknife:'<path d="M10 54Q31 49 44 9L58 8Q56 33 22 60Z"/><path d="M29 36L50 15M14 47L38 53"/>',
 corruptmask:'<path d="M9 23Q32 1 55 23L49 53H15Z"/><circle cx="23" cy="29" r="5"/><circle cx="41" cy="29" r="5"/><path d="M23 45L32 39L41 45"/>',
 voidstaff:'<path d="M18 58L44 6M16 59L27 55"/><path d="M42 6L54 21L39 25L33 12Z"/><path d="M16 19L27 26L14 34L3 26Z"/>',
 stormcrown:'<path d="M8 42L14 17L27 32L33 8L41 32L54 15L60 42Z"/><path d="M7 46H60M20 53H48"/><path d="M33 15L26 35H38L31 53"/>',
 stoneheart:'<path d="M32 7L54 18L49 48L32 59L15 48L10 18Z"/><path d="M31 15L40 28L33 38L41 49L23 43L18 29Z" fill="currentColor" opacity=".18"/>',
 incensario:'<path d="M18 57L26 21H38L46 57Z"/><path d="M16 17Q32 3 48 17M22 12Q32 0 42 12"/><circle cx="32" cy="30" r="7"/><path d="M12 52H52"/>'
};
function itemGlyph(it,large=false){
 const kind=shopKinds[it.id]||'utility';
 const art=ITEM_ART[it.id]||ITEM_ART.prism;
 return '<span class="fenda-item-icon '+kind+(large?' large':'')+'" aria-hidden="true">'+
  '<svg class="fenda-item-art" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">'+
  '<g stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none">'+art+
  '</g></svg></span>';
}
function shopRender(){
 const h=S.hero;if(!h)return;
 const base=E.canShop(h),dead=h.hp<=0,builds=recommendedFor(h);
 const selectedId=shopSelectedId&&itemInfo(shopSelectedId)?shopSelectedId:
  builds.find(id=>!h.items.includes(id))||builds[0]||E.ITEMS[6].id;
 shopSelectedId=selectedId;
 const selection=itemInfo(shopSelectedId),status=E.recipeStatus(h,selection.id);
 const oldList=$('fendaShopItems'),oldDetail=$('fendaShopDetails');
 const browserScroll=oldList.scrollTop,detailScroll=oldDetail.scrollTop;
 $('fendaShopGold').textContent='✦ '+Math.floor(h.gold)+' OURO';
 $('fendaShopLocation').textContent=dead?'● ELIMINADO · COMPRAS LIBERADAS':
  base?'● NA BASE · COMPRAS LIBERADAS':'○ LONGE DA BASE · CONSULTAR ITENS';
 $('fendaShopLocation').className=base?'in-base':'out-base';
 $('fendaShopTabs').innerHTML=[
  ['recommended','★ SUGERIDOS'],['all','TODOS'],['parts','COMPONENTES']
 ].map(([id,name])=>'<button type="button" data-shop-tab="'+id+'" class="'+
  (shopTab===id?'selected':'')+'">'+name+'</button>').join('');
 const filterOptions=[['all','TODOS'],['attack','DANO'],['magic','MAGIA'],
  ['defense','DEFESA'],['speed','MOV.'],['utility','UTIL.']];
 $('fendaShopCategories').innerHTML=shopTab==='all'?
  filterOptions.map(([id,label])=>'<button data-shop-filter="'+id+'" class="'+
  (shopFilter===id?'selected':'')+'">'+label+'</button>').join(''):
  '<span>'+(shopTab==='recommended'?'RECOMENDADOS · ADAPTADOS AO TIME INIMIGO':'PRÉ-ITENS PARA COMBINAR')+'</span>';
 const catalogue=shopTab==='recommended'?
   E.ITEMS.filter(it=>builds.includes(it.id)).sort((a,b)=>builds.indexOf(a.id)-builds.indexOf(b.id)):
   E.ITEMS.filter(it=>shopTab==='parts'?it.tier===1:
    (it.tier===2||it.id==='boots')&&
    (shopFilter==='all'||shopKinds[it.id]===shopFilter));
 const tile=it=>{
  const r=E.recipeStatus(h,it.id),owned=h.items.filter(x=>x===it.id).length;
  const completed=it.tier===2&&owned>0;
  const partial=it.tier===2&&r.used.length>0&&!completed;
  const progress=it.tier===2?Math.round(100*r.used.reduce((n,p)=>n+itemInfo(p).price,0)/it.price):0;
  return '<button type="button" class="fenda-shop-tile'+(it.id===shopSelectedId?' chosen':'')+
   (completed?' equipped':'')+'" data-shop-select="'+it.id+'" aria-label="'+it.name+'">'+
   '<span class="fenda-shop-tileicon">'+itemGlyph(it)+
   (completed?'<i class="fenda-tile-check">✓</i>':'')+
   (partial?'<i class="fenda-tile-progress" style="width:'+progress+'%"></i>':'')+'</span>'+
   '<strong>'+it.name+'</strong><small>✦ '+it.price+
   (it.tier===1&&owned?' · ×'+owned:'')+'</small></button>';
 };
 $('fendaShopItems').innerHTML=catalogue.map(tile).join('')||
  '<div class="fenda-shop-nothing">Nenhum item nessa categoria</div>';
 const ownedNames=status.used.slice();
 let recipe='';
 if(selection.recipe){
  const components=selection.recipe.map(id=>{
   const item=itemInfo(id),index=ownedNames.indexOf(id),owned=index>=0;
   if(owned)ownedNames.splice(index,1);
   return '<button type="button" class="fenda-recipe-node'+(owned?' owned':'')+
    '" data-shop-part="'+id+'" title="Ver atributos de '+item.name+' (não compra)" aria-label="Inspecionar '+item.name+'">'+
    itemGlyph(item)+'<span>'+item.name+'</span><small>'+
    (owned?'✓ OBTIDO':'✦ '+item.price)+'</small></button>';
  }).join('');
  recipe='<div class="fenda-shop-recipe-label">ÁRVORE DE MONTAGEM · '+
   status.used.length+'/'+selection.recipe.length+' PEÇAS</div>'+
   '<div class="fenda-shop-recipe-root">'+itemGlyph(selection,true)+
   '<span>'+selection.name+'</span></div><div class="fenda-shop-recipe-branches">'+
   components+'</div>';
 }else{
  const buildsInto=E.ITEMS.filter(it=>it.recipe?.includes(selection.id));
  recipe='<div class="fenda-shop-recipe-label">EVOLUI PARA</div><div class="fenda-shop-buildsinto">'+
   buildsInto.map(it=>'<button type="button" data-shop-select="'+it.id+'">'+
    itemGlyph(it)+'<span>'+it.name+'</span></button>').join('')+'</div>';
 }
 const equipped=h.items.includes(selection.id);
 const next=status.missing[0],part=next&&itemInfo(next);
 const canBuy=base&&(selection.tier===1||!equipped)&&status.spacesAfter<=6&&
  (status.ready?h.gold>=status.remaining:
   part&&h.items.length<6&&h.gold>=part.price);
 let buyLabel=selection.tier===1?'COMPRAR · ✦ '+selection.price:
  status.ready?'COMBINAR · ✦ '+status.remaining:
  'COMPRAR '+(part?.name||'PEÇA')+' · ✦ '+(part?.price||0);
 if(equipped&&selection.tier===2)buyLabel='EQUIPADO ✓';
 if(!base)buyLabel='RETORNE À BASE PARA COMPRAR';
 let suffix=selection.passive?'PASSIVA · '+selection.desc:selection.desc;
 const paid=selection.price-status.remaining,progressPct=Math.round(paid/selection.price*100);
 $('fendaShopDetails').innerHTML=(shopInspectBackId&&shopInspectBackId!==selection.id?
  '<button type="button" class="fenda-shop-back" data-shop-back="'+shopInspectBackId+
   '">‹ VOLTAR À MONTAGEM</button>':'')+
  '<div class="fenda-shop-detail-top">'+
  itemGlyph(selection,true)+'<div><h3>'+selection.name+'</h3>'+
  '<span>'+(kindNames[shopKinds[selection.id]]||'UTILIDADE')+' · '+(selection.tier===2?'ITEM COMPLETO':'COMPONENTE')+'</span>'+
  '<strong>✦ '+selection.price+' OURO</strong></div></div>'+
  '<div class="fenda-shop-detail-stats">'+selection.stat+'</div>'+
  '<p class="fenda-shop-detail-desc">'+suffix+'</p>'+recipe+
  '<div class="fenda-shop-detail-bottom">'+
  (selection.tier===2?'<div class="fenda-shop-progress"><span style="width:'+progressPct+'%"></span></div>'+
   '<div class="fenda-shop-cost"><span>Valor em componentes: ✦ '+paid+'</span><b>Falta: ✦ '+status.remaining+'</b></div>':'')+
  '<div class="fenda-shop-buy-actions">'+
  '<button class="fenda-shop-buy" data-shop-buy="'+selection.id+'" '+
  (!canBuy||equipped&&selection.tier===2?'disabled':'')+'>'+buyLabel+'</button>'+
  '<button class="fenda-shop-pin'+(shopQueuedId===selection.id?' pinned':'')+
  '" type="button" data-shop-queue="'+selection.id+'">'+
   (shopQueuedId===selection.id?'★ NO PLANO':'☆ PLANEJAR')+'</button></div></div>';
 const inventory=Array.from({length:6},(_,index)=>{
  const id=h.items[index],it=id&&itemInfo(id);
  return '<div class="fenda-shop-slot'+(it?' filled':'')+'">'+
   (it?'<button type="button" class="fenda-shop-slot-select" data-shop-select="'+id+'" title="Inspecionar '+it.name+'">'+
     itemGlyph(it)+'</button>':'<span class="fenda-slot-empty">'+(index+1)+'</span>')+
   (it?'<button type="button" class="fenda-shop-slot-sell" data-shop-sell="'+index+'" '+(!base?'disabled':'')+
    ' title="Vender '+it.name+'">✕</button>':'')+'</div>';
 }).join('');
 $('fendaShopEquipped').innerHTML='<strong>INVENTÁRIO <small>'+h.items.length+'/6</small></strong>'+
  '<div class="fenda-shop-inventory">'+inventory+'</div>';
 $('fendaShopHint').textContent=dead?
  'Eliminado: compre e combine normalmente. Os itens estarão equipados ao ressurgir.':
  base?'Toque nas peças para VER detalhes; use COMPRAR para adquirir. Venda pelo ✕.':
  'Toque nas peças para ver seus efeitos. Compre na base ou durante a morte.';
 for(const b of shop.querySelectorAll('[data-shop-tab]'))b.onclick=()=>{
  shopTab=b.dataset.shopTab;shopRender();
 };
 for(const b of shop.querySelectorAll('[data-shop-filter]'))b.onclick=()=>{
  shopFilter=b.dataset.shopFilter;shopRender();
 };
 for(const b of shop.querySelectorAll('[data-shop-select]'))b.onclick=()=>{
  shopSelectedId=b.dataset.shopSelect;shopInspectBackId=null;shopRender();
 };
 for(const b of shop.querySelectorAll('[data-shop-part]'))b.onclick=()=>{
  // Um clique num componente SEMPRE abre seus efeitos; só COMPRA compra.
  shopInspectBackId=shopSelectedId;shopSelectedId=b.dataset.shopPart;
  shopRender();
 };
 for(const b of shop.querySelectorAll('[data-shop-back]'))b.onclick=()=>{
  shopSelectedId=b.dataset.shopBack;shopInspectBackId=null;shopRender();
 };
 for(const b of shop.querySelectorAll('[data-shop-buy]'))b.onclick=()=>{
  const item=itemInfo(b.dataset.shopBuy),r=E.recipeStatus(S.hero,item.id);
  const id=item.tier===2&&!r.ready?r.missing[0]:item.id;
  const result=E.buyItem(id);
  if(!result.ok)warn(result.reason);
  shopRender();hudUpdate();
 };
 for(const b of shop.querySelectorAll('[data-shop-queue]'))b.onclick=()=>{
  shopQueuedId=shopQueuedId===b.dataset.shopQueue?null:b.dataset.shopQueue;
  shopRender();
 };
 for(const b of shop.querySelectorAll('[data-shop-sell]'))b.onclick=()=>{
  const result=E.sellItem(Number(b.dataset.shopSell));
  if(!result.ok)warn(result.reason);
  shopRender();hudUpdate();
 };
 $('fendaShopItems').scrollTop=browserScroll;
 $('fendaShopDetails').scrollTop=detailScroll;
 shopLastPaint=S.time;
 shopHash=[Math.floor(h.gold/20),h.items.join(','),base,dead].join('|');
}
function toggleShop(){
 if(S.mode!=='playing')return;
 S.shopOpen=!S.shopOpen;shop.classList.toggle('open',S.shopOpen);
 if(S.shopOpen)shopRender();
}
function chooseLane(reset=false){
 if(reset)selectedLane=null;
 S.mode='menu';S.shopOpen=false;mouseFollow=null;setScoreboardVisible(false);
 stage.classList.remove('fenda-on');cv.style.display='none';shop.classList.remove('open');
 $('overlay').classList.remove('hidden','picker-open','arsenal-open','hero-open');
 $('overlay').classList.add('lane-open');$('missionShelf').hidden=true;
 const lane=currentLane();
 $('modalContent').innerHTML='<div class="fenda-draft-steps"><b>01 SELECIONAR ROTA</b><span>02 CAMPEÃO</span><span>03 PARTIDA</span></div>'+
 '<div class="eyebrow">FENDA DOS SIGILOS · ETAPA 1 DE 2</div>'+
 '<h2>ESCOLHA SUA POSIÇÃO</h2>'+
 '<p class="fenda-draft-intro">Selecione sua lane para a equipe 5×5. Os bots preenchem as outras posições. Sem fase de banimentos.</p>'+
 '<div class="fenda-lane-grid">'+LANE_CHOICES.map(pos=>
  '<button type="button" class="fenda-lane-card '+(selectedLane===pos.id?'selected':'')+
  '" data-lane="'+pos.id+'" aria-pressed="'+(selectedLane===pos.id)+'">'+
  '<span class="fenda-lane-icon">'+pos.icon+'</span><strong>'+pos.short+'</strong>'+
  '<small>'+pos.name+'</small><em>'+pos.desc+'</em></button>').join('')+'</div>'+
 '<div class="fenda-lane-preview">'+(lane?
  '<strong>'+lane.icon+' '+lane.name+'</strong><span>'+lane.detail+'</span>':
  '<span>Escolha uma das cinco posições para continuar.</span>')+'</div>'+
 '<div class="actions"><button class="primary" id="confirmFendaLane" '+(!lane?'disabled':'')+
 '>CONFIRMAR POSIÇÃO</button><button class="secondary" id="playClassic">ARENA RÁPIDA</button></div>';
 for(const button of $('modalContent').querySelectorAll('[data-lane]'))button.onclick=()=>{
  selectedLane=button.dataset.lane;chooseLane();
 };
 $('confirmFendaLane').onclick=()=>{
  const pos=currentLane();if(!pos)return;
  C.setHeroChoice(pos.picks[0]);
  pickedSummoners=selectedLane==='jungle'?['smite','flash']:['flash','ignite'];
  saveSummoners();chooseHero();
 };
 $('playClassic').onclick=()=>{S.mode='classic';stage.classList.remove('fenda-on');C.showClassic()};
}
function chooseHero(){
 if(!currentLane()){chooseLane(true);return}
 S.mode='menu';S.shopOpen=false;mouseFollow=null;setScoreboardVisible(false);
 stage.classList.remove('fenda-on');cv.style.display='none';
 shop.classList.remove('open');
 $('overlay').classList.remove('hidden','arsenal-open','hero-open','lane-open');
 $('overlay').classList.add('picker-open');$('missionShelf').hidden=true;
 const selected=C.getHeroChoice(),hero=C.heroes[selected],lane=currentLane();
 const recommended=lane.picks;
 const options=Object.entries(C.heroes).sort((a,b)=>
  Number(recommended.includes(b[0]))-Number(recommended.includes(a[0]))||
  (recommended.includes(a[0])&&recommended.includes(b[0])?
   recommended.indexOf(a[0])-recommended.indexOf(b[0]):0));
 const lineup=E.previewBlue(selected,selectedLane);
 $('modalContent').innerHTML='<div class="fenda-draft-steps"><span>01 POSIÇÃO</span><b>02 ESCOLHER CAMPEÃO</b><span>03 PARTIDA</span></div>'+
 '<div class="eyebrow">SELEÇÃO DE CAMPEÃO · '+lane.short+' · SEM BANIMENTOS</div>'+
 '<h2>ESCOLHA SEU CAMPEÃO</h2>'+
 '<div class="fenda-chosen-lane"><strong>'+lane.icon+' '+lane.name+
 '</strong><button type="button" id="changeFendaLane">ALTERAR ROTA</button></div>'+
 '<div class="fenda-draft-label">INDICADOS PARA '+lane.short+' <small>TODOS OS CAMPEÕES DISPONÍVEIS</small></div>'+
 '<div class="fenda-hero-list">'+options.map(([id,h])=>
  '<button class="fenda-hero '+(id===selected?'picked ':'')+(recommended.includes(id)?'recommended':'')+
  '" data-hero="'+id+'" aria-pressed="'+(id===selected)+'"><span class="fenda-hero-portrait">'+
  championPortrait(id)+'</span><strong>'+h.name+'</strong><small>'+
  (recommended.includes(id)?'INDICADO':'LIVRE')+'</small></button>').join('')+'</div>'+
 '<div class="fenda-hero-detail"><strong>'+hero.name+' · '+hero.role+'</strong>'+
 '<p>'+hero.summary+'</p><span>Você jogará '+lane.short+
 ' com esse campeão. '+(selectedLane==='support'?
 'O Emblema executa tropas com cargas e divide o ouro com o ADC.':
 'Escolha a primeira habilidade (Q/W/E) após entrar.')+'</span></div>'+
 '<div class="fenda-lineup-label">SUA EQUIPE 5×5 <small>4 BOTS EM FUNÇÕES COMPLEMENTARES</small></div>'+
 '<div class="fenda-lineup">'+lineup.map(slot=>
  '<div class="'+(slot.controlled?'player':'')+'"><small>'+
  LANE_CHOICES.find(l=>l.id===slot.role).short+'</small><strong>'+
  C.heroes[slot.id].name+'</strong><span>'+(slot.controlled?'VOCÊ':'BOT')+'</span></div>').join('')+'</div>'+
 '<div class="fenda-summoner-title">ESCOLHA 2 FEITIÇOS <small>F / G NO PC</small></div>'+
 '<div class="fenda-summoner-picker">'+Object.entries(E.SUMMONERS).map(([id,sp])=>
 '<button type="button" data-pick-spell="'+id+'" title="'+sp.desc+'" class="'+
 (pickedSummoners.includes(id)?'picked':'')+'" '+(selectedLane==='jungle'&&id==='smite'?'disabled':'')+
 '><b>'+sp.icon+'</b><span>'+sp.name+'</span><small>'+sp.cd+'s</small><em>'+sp.desc+'</em></button>').join('')+'</div>'+
 '<div class="actions" style="margin-top:9px"><button class="primary" id="playFenda">▶ CONFIRMAR E JOGAR</button>'+
 '<button class="secondary" id="backToFendaLane">VOLTAR ÀS ROTAS</button>'+
 '<button class="secondary" id="playClassic">ARENA RÁPIDA</button></div>';
 for(const b of $('modalContent').querySelectorAll('[data-hero]'))b.onclick=()=>{
  C.setHeroChoice(b.dataset.hero);chooseHero();
 };
 for(const b of $('modalContent').querySelectorAll('[data-pick-spell]'))b.onclick=()=>{
  const id=b.dataset.pickSpell;if(pickedSummoners.includes(id))return;
  pickedSummoners=selectedLane==='jungle'?['smite',id]:[pickedSummoners[1],id];
  saveSummoners();chooseHero();
 };
 $('changeFendaLane').onclick=()=>chooseLane();
 $('backToFendaLane').onclick=()=>chooseLane();
 $('playFenda').onclick=startGame;
 $('playClassic').onclick=()=>{S.mode='classic';stage.classList.remove('fenda-on');C.showClassic()};
}
function startGame(){
 if(!currentLane()){chooseLane(true);return}
 C.suspendClassic?.();
 shopTab='recommended';shopFilter='all';shopSelectedId=null;shopQueuedId=null;shopInspectBackId=null;
 E.start(C.getHeroChoice(),pickedSummoners,selectedLane);setScoreboardVisible(false);endedShown=false;clickDestination=null;mouseFollow=null;rosterLastUpdate=-1;cameraPeek=null;cameraPeekUntil=0;wardAim=null;keys.clear();
 desktopPointer.over=false;desktopPointer.lastWorld=null;spaceCenterHeld=false;cameraDrag=null;syncCameraControl();
 joy.ptr=null;joy.x=joy.y=0;pointers.aa=null;aaAim=null;S.attackAimActive=false;
 pointers.skill=null;aimPreview=null;stage.classList.add('fenda-on');cv.style.display='block';
 shop.classList.remove('open');$('overlay').classList.add('hidden');$('missionShelf').hidden=true;
 resize();if(desktopCamera())cameraCenterAt(S.hero.x,S.hero.y);
 else Object.assign(S.camera,mobileCameraTarget(S.hero));
 drawTerrain();last=performance.now();hudCountdown=0;hudUpdate();
 if(stage.requestFullscreen&&!document.fullscreenElement){
  try{Promise.resolve(stage.requestFullscreen()).catch(()=>{})}catch(_){}
 }
}
function endScreen(){
 if(endedShown)return;endedShown=true;setScoreboardVisible(false);S.shopOpen=false;shop.classList.remove('open');
 $('overlay').classList.remove('hidden','arsenal-open','hero-open','picker-open');$('missionShelf').hidden=true;
 $('modalContent').innerHTML='<div class="eyebrow">FENDA DOS SIGILOS</div><h2>'+(S.win===0?'VITÓRIA AZUL!':'DERROTA AZUL')+'</h2>'+
 '<p>'+(S.win===0?'O Núcleo Sigilar rubro foi destruído!':'Os inimigos destruíram seu Núcleo. Reorganize sua equipe e tente novamente.')+'</p>'+
 '<div class="result-objectives"><div><span>✦</span> Abates: '+S.kills[0]+' × '+S.kills[1]+'</div>'+
 '<div><span>★</span> Nível: '+S.hero.level+' · Minions: '+S.hero.cs+'</div>'+
 '<div><span>⬡</span> Itens: '+S.hero.items.length+'/6</div></div>'+
 '<div class="actions"><button class="primary" id="retryFenda">JOGAR NOVAMENTE</button>'+
 '<button class="secondary" id="backFenda">ESCOLHER CAMPEÃO</button></div>';
 $('retryFenda').onclick=()=>chooseLane(true);$('backFenda').onclick=()=>chooseLane(true);
}
function pause(){
 if(S.mode!=='playing')return;
 S.showPause=!S.showPause;
 if(S.showPause){
   setScoreboardVisible(false);
  S.shopOpen=false;shop.classList.remove('open');
  joy.x=joy.y=0;joy.ptr=null;keys.clear();pointers.aa=null;aaAim=null;S.attackAimActive=false;
  $('fireBtn').classList.remove('target-holding','target-selected');
  pointers.skill=null;wardAim=null;cameraPeek=null;aimPreview=null;mouseFollow=null;clickDestination=null;
 }
 if(!S.showPause){$('overlay').classList.add('hidden');return}
 $('overlay').classList.remove('hidden','picker-open','hero-open','arsenal-open');$('missionShelf').hidden=true;
 $('modalContent').innerHTML='<div class="eyebrow">FENDA DOS SIGILOS</div><h2>PARTIDA PAUSADA</h2>'+
 '<p>Torres, tropas e campeões permanecem nesse estado.</p>'+
 '<div class="actions"><button class="primary" id="resumeFenda">CONTINUAR</button>'+
 '<button class="secondary" id="resetFenda">RECOMEÇAR</button>'+
 '<button class="secondary" id="menuFenda">MENU</button></div>';
 $('resumeFenda').onclick=pause;$('resetFenda').onclick=()=>chooseLane(true);$('menuFenda').onclick=()=>chooseLane(true);
}
// Desktop: mira no ponteiro real e nunca adquire automaticamente o inimigo mais próximo.
function desktopMouseWorld(){
 return desktopPointer.over?{x:S.camera.x+desktopPointer.x/cameraZoom,
  y:S.camera.y+desktopPointer.y/cameraZoom}:desktopPointer.lastWorld;
}
function desktopMouseAim(id){
 const h=S.hero,range=E.skillDef(id).range||140;
 const cursor=desktopMouseWorld();
 const angle=h.facing||0,dx=cursor?cursor.x-h.x:Math.cos(angle)*range,
  dy=cursor?cursor.y-h.y:Math.sin(angle)*range;
 const dir=E.norm(dx,dy),distance=clamp(Math.hypot(dx,dy),0,range);
 return {x:dir.x,y:dir.y,distance,center:{x:h.x+dir.x*distance,y:h.y+dir.y*distance}};
}
function aimData(p){
 const h=S.hero,def=E.skillDef(p.id),enemy=E.nearestEnemy(h,def.range||320,true);
 let dx=enemy?enemy.x-h.x:1,dy=enemy?enemy.y-h.y:0;
 if(p.id==='seris_bloom'&&!p.dragged){
  const friend=E.living(h.side,'hero').filter(u=>dist(h,u)<def.range)
   .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(friend){dx=friend.x-h.x;dy=friend.y-h.y}
 }
 let length=Math.min(def.range||120,Math.hypot(dx,dy));
 if(p.dragged){
  dx=p.x-p.sx;dy=p.y-p.sy;
  length=clamp(Math.hypot(dx,dy)*3.2/cameraZoom,0,def.range||120);
 }
 const unit=E.norm(dx,dy);
 return{x:unit.x,y:unit.y,distance:length,center:{x:h.x+unit.x*length,y:h.y+unit.y*length}};
}
function skillStart(e,index){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||pointers.skill||!S.hero||S.hero.hp<=0)return;
 const id=C.heroes[S.hero.id].skills.concat([C.heroes[S.hero.id].ultimate])[index],def=E.skillDef(id);
 if(E.skillRank(S.hero,id)<=0){warn(def.ultimate&&S.hero.level<5?
  'ULTIMATE NO NÍVEL 5':'USE O BOTÃO + PARA EVOLUIR');return}
 const recast=(id==='sahra_ult'&&S.hero.sahraSecondUntil>S.time||
  id==='mirielle_distort'&&S.hero.mirrorReturn?.until>S.time);
 if(S.hero.cooldowns[id]>.02&&!recast){warn('HABILIDADE EM RECARGA');return}
 if(S.hero.mana<def.cost&&S.hero.manaFreeUntil<=S.time&&!recast){warn('MANA INSUFICIENTE');return}
 e.preventDefault();e.stopPropagation();
 // Clicar na barra de habilidades do PC usa a última posição real do mouse no mapa.
 if(desktopCamera()&&e.pointerType==='mouse'){
  const aim=def.aim==='self'?null:desktopMouseAim(id);
  if(!E.cast(S.hero,id,aim))warn('NÃO FOI POSSÍVEL LANÇAR A HABILIDADE');
  hudUpdate();return;
 }
 if(def.aim==='self'){E.cast(S.hero,id);hudUpdate();return}
 pointers.skill={id,ptr:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,
  dragged:false,started:performance.now()};
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
}
function skillMove(e){
 const p=pointers.skill;if(!p||p.ptr!==e.pointerId)return;
 e.preventDefault();e.stopPropagation();
 p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.sx,p.y-p.sy)>10)p.dragged=true;
 if(performance.now()-p.started>190)aimPreview=p;
}
function skillEnd(e){
 const p=pointers.skill;if(!p||p.ptr!==e.pointerId)return;
 e.preventDefault();e.stopPropagation();
 if(e.type==='pointerup'){
  // Deslizar para o canto superior direito cancela sem consumir energia.
  const cancel=p.dragged&&e.clientX>vw*.77&&e.clientY<vh*.20;
  if(cancel)E.announce('HABILIDADE CANCELADA',1.2);
  else if(!E.cast(S.hero,p.id,aimData(p)))warn('NÃO FOI POSSÍVEL LANÇAR A HABILIDADE');
 }
 pointers.skill=null;aimPreview=null;
}
function selectTowerAt(clientX,clientY){
 const r=cv.getBoundingClientRect();
 const x=S.camera.x+(clientX-r.left)/cameraZoom,y=S.camera.y+(clientY-r.top)/cameraZoom;
 const candidate=S.structures.filter(t=>t.side!==S.hero.side&&t.hp>0&&
  (t.kind==='tower'||t.kind==='core')&&Math.hypot(t.x-x,t.y-y)<=t.r+24)
  .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
 if(!candidate)return false;
 const result=E.focusTower(S.hero,candidate);
 if(!result.ok)warn(result.reason);
 else E.announce(result.attacked?'OBELISCO SELECIONADO · AA INICIADO':'OBELISCO SELECIONADO · AA EM RECARGA',.9);
 return true;
}
// Como no Wild Rift, arrastar o AA cria uma mira direcional.
function attackStickTarget(hero,dx,dy){
 const dir=E.norm(dx,dy),maxRange=Math.max(360,E.attackRange(hero)+155);
 if(!dir.x&&!dir.y)return null;
 const candidates=[
  ...S.units.filter(u=>u.hp>0&&u.side!==hero.side&&
   (u.kind==='hero'||u.kind==='minion')&&E.isAttackCommandValid(hero,u)),
  ...S.structures.filter(t=>t.hp>0&&t.side!==hero.side&&E.isAttackCommandValid(hero,t)),
  ...S.camps.filter(t=>t.hp>0&&E.isAttackCommandValid(hero,t))
 ];
 let selected=null,score=Infinity;
 for(const t of candidates){
  const distance=E.dist(hero,t),reach=maxRange+(t.r||24);
  if(distance>reach||distance<.1)continue;
  const heading=E.norm(t.x-hero.x,t.y-hero.y);
  const dot=heading.x*dir.x+heading.y*dir.y;
  if(dot<.40)continue;
  const weight=(1-dot)*300+distance*.16+
   (t.kind==='hero'?-15:t.kind==='minion'?3:0);
  if(weight<score){score=weight;selected=t;}
 }
 return selected;
}
function aaStart(e){
 if(S.mode!=='playing'||S.shopOpen||S.showPause||!S.hero||S.hero.hp<=0)return;
 e.preventDefault();e.stopPropagation();
 if(pointers.aa!==null&&pointers.aa!==e.pointerId)return;
 pointers.aa=e.pointerId;
 aaAim={ptr:e.pointerId,sx:e.clientX,sy:e.clientY,dx:0,dy:0,
  dragged:false,target:null,started:performance.now()};
 E.clearAttackCommand(S.hero);
 $('fireBtn').classList.add('target-holding');
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
}
function aaMove(e){
 if(pointers.aa!==e.pointerId||!aaAim)return;
 e.preventDefault();e.stopPropagation();
 aaAim.dx=e.clientX-aaAim.sx;aaAim.dy=e.clientY-aaAim.sy;
 if(Math.hypot(aaAim.dx,aaAim.dy)>19)aaAim.dragged=true;
 if(aaAim.dragged){
  S.attackAimActive=true;
  aaAim.target=attackStickTarget(S.hero,aaAim.dx,aaAim.dy);
  $('fireBtn').classList.toggle('target-selected',!!aaAim.target);
 }
}
function aaEnd(e){
 if(pointers.aa!==e.pointerId)return;
 e.preventDefault();e.stopPropagation();
 const aim=aaAim;
 pointers.aa=null;aaAim=null;S.attackAimActive=false;
 $('fireBtn').classList.remove('target-holding','target-selected');
 if(e.type==='pointercancel'||!S.hero||S.hero.hp<=0)return;
 if(aim?.dragged){
  if(aim.target){
   const result=E.lockAttackTarget(S.hero,aim.target);
   if(result.ok)E.autoAttack(S.hero);
   else warn(result.reason);
  }
 }else E.autoAttack(S.hero);
}

function pickAttackTarget(clientX,clientY){
 if(!S.hero)return null;
 const rect=cv.getBoundingClientRect();
 const wx=S.camera.x+(clientX-rect.left)/cameraZoom,wy=S.camera.y+(clientY-rect.top)/cameraZoom;
 const candidates=[
  ...S.units.filter(u=>u.hp>0&&u.side!==S.hero.side&&
   (u.kind==='hero'||u.kind==='minion')&&E.visibleTo(S.hero.side,u)),
  ...S.structures.filter(t=>t.hp>0&&t.side!==S.hero.side),
  ...S.camps.filter(t=>t.hp>0&&(!t.unlock||S.time>=t.unlock)&&E.isPointVisible(S.hero.side,t))
 ];
 const hits=candidates.map(t=>{
  const radius=t.r||(t.kind==='boss'?38:t.kind==='buff'?28:23);
  const distance=Math.hypot(t.x-wx,t.y-wy);
  const hitRadius=Math.max(radius+16,t.kind==='hero'?39:radius+13);
  return{target:t,distance,hitRadius};
 }).filter(o=>o.distance<=o.hitRadius)
   .sort((a,b)=>(a.distance/a.hitRadius)-(b.distance/b.hitRadius));
 return hits[0]?.target||null;
}
function issueRightClick(clientX,clientY){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||!S.hero||S.hero.hp<=0)return;
 const target=pickAttackTarget(clientX,clientY);
 if(target){
  const result=E.commandAttack(S.hero,target);
  clickDestination=null;
  if(result.ok)E.autoAttack(S.hero);
  else warn(result.reason);
 }else{
  E.clearAttackCommand(S.hero);
  const rect=cv.getBoundingClientRect();
  clickDestination={x:clamp(S.camera.x+(clientX-rect.left)/cameraZoom,15,E.W-15),
   y:clamp(S.camera.y+(clientY-rect.top)/cameraZoom,15,E.H-15)};
 }
}
function tapWhileWalking(clientX,clientY){
 // Um segundo dedo aponta alvos sem interferir no primeiro, que mantém
 // o joystick em movimento. Se estiver distante, prioriza-o no AA quando
 // entrar no alcance; não assume controle do deslocamento do jogador.
 const selected=pickAttackTarget(clientX,clientY);
 if(selected){
  if(selected.kind==='tower'||selected.kind==='core'){
   const result=E.focusTower(S.hero,selected);
   if(!result.ok)warn(result.reason);
  }else{
   S.hero.focusTarget=selected;S.hero.focusUntil=S.time+4;
   E.autoAttack(S.hero);
  }
  return true;
 }
 return E.autoAttack(S.hero);
}
function worldDown(e){
 if(S.mode!=='playing'||S.showPause||S.shopOpen)return;
 if(e.pointerType==='mouse'){
  if(e.button===1){
   e.preventDefault();e.stopPropagation();
   if(cameraMode!=='free')setCameraMode('free',true);
   cameraDrag={ptr:e.pointerId,x:e.clientX,y:e.clientY};
   desktopPointer.over=false;
   try{cv.setPointerCapture(e.pointerId)}catch(_){}
   return;
  }
  if(e.button===2)issueRightClick(e.clientX,e.clientY);
  else if(e.button===0)tapWhileWalking(e.clientX,e.clientY);
  if(e.button===0||e.button===2){
   mouseFollow={ptr:e.pointerId,button:e.button,sx:e.clientX,sy:e.clientY,moved:false};
   try{cv.setPointerCapture(e.pointerId)}catch(_){}
  }
  e.preventDefault();return;
 }
 const rect=cv.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 e.preventDefault();
 if(x<vw*.47&&joy.ptr===null){
  joy.ptr=e.pointerId;joy.sx=x;joy.sy=y;joy.fx=x;joy.x=joy.y=0;
  $('joy').style.left=clamp(x,45,vw*.46)+'px';
  $('joy').style.top=clamp(y,50,vh-50)+'px';
  $('joy').classList.add('active');
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  return;
 }
 if(e.pointerId!==joy.ptr)tapWhileWalking(e.clientX,e.clientY);
}
function worldMove(e){
 if(e.pointerType==='mouse'){
  const rect=cv.getBoundingClientRect();
  desktopPointer.x=clamp(e.clientX-rect.left,0,vw);
  desktopPointer.y=clamp(e.clientY-rect.top,0,vh);
  desktopPointer.over=true;
  desktopPointer.lastWorld={x:S.camera.x+desktopPointer.x/cameraZoom,
   y:S.camera.y+desktopPointer.y/cameraZoom};
  if(cameraDrag&&cameraDrag.ptr===e.pointerId){
   if(!(e.buttons&4)){cameraDrag=null;return}
   S.camera.x=cameraClampX(S.camera.x-(e.clientX-cameraDrag.x)/cameraZoom);
   S.camera.y=cameraClampY(S.camera.y-(e.clientY-cameraDrag.y)/cameraZoom);
   cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;
   desktopPointer.over=false;e.preventDefault();return;
  }
 }
 if(mouseFollow&&e.pointerId===mouseFollow.ptr&&e.pointerType==='mouse'){
  if(!(e.buttons&(mouseFollow.button===2?2:1))){mouseFollow=null;return}
  const moved=Math.hypot(e.clientX-mouseFollow.sx,e.clientY-mouseFollow.sy)>7;
  if(moved||mouseFollow.moved){
   mouseFollow.moved=true;
   const rect=cv.getBoundingClientRect();
   clickDestination={x:clamp(S.camera.x+(e.clientX-rect.left)/cameraZoom,15,E.W-15),
    y:clamp(S.camera.y+(e.clientY-rect.top)/cameraZoom,15,E.H-15)};
   if(S.hero?.commandTarget)E.clearAttackCommand(S.hero);
  }
  e.preventDefault();return;
 }
 if(joy.ptr!==e.pointerId)return;
 e.preventDefault();
 const rect=cv.getBoundingClientRect();
 const dx=e.clientX-rect.left-joy.sx,dy=e.clientY-rect.top-joy.sy,n=Math.hypot(dx,dy);
 joy.fx=e.clientX-rect.left;
 const a=Math.min(1,n/42);
 joy.x=n?dx/n*a:0;joy.y=n?dy/n*a:0;
 $('joyKnob').style.transform='translate(calc(-50% + '+(joy.x*27)+'px),calc(-50% + '+(joy.y*27)+'px))';
}
function worldEnd(e){
 if(cameraDrag&&cameraDrag.ptr===e.pointerId){
  cameraDrag=null;e.preventDefault();return;
 }
 if(mouseFollow&&mouseFollow.ptr===e.pointerId){
  if(mouseFollow.moved)clickDestination=null;
  mouseFollow=null;
  return;
 }
 if(joy.ptr!==e.pointerId)return;
 e.preventDefault();
 joy.ptr=null;joy.x=joy.y=0;
 $('joy').classList.remove('active');$('joyKnob').style.transform='translate(-50%,-50%)';
}
function wardPoint(p){
 const h=S.hero,dx=p.x-p.sx,dy=p.y-p.sy,dragDist=Math.hypot(dx,dy);
 const angle=h.facing||-.68;
 if(dragDist<10)return{x:h.x+Math.cos(angle)*175,y:h.y+Math.sin(angle)*175};
 const distWard=clamp(dragDist*2.65/cameraZoom,40,E.WARD_RANGE-5),dir=E.norm(dx,dy);
 return{x:clamp(h.x+dir.x*distWard,35,E.W-35),
        y:clamp(h.y+dir.y*distWard,35,E.H-35)};
}
function deployWard(point=null){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||!S.hero)return;
 const h=S.hero,angle=h.facing||-.68;
 const pos=point||{x:h.x+Math.cos(angle)*175,y:h.y+Math.sin(angle)*175};
 const result=E.placeWard(h,pos.x,pos.y);
 if(!result.ok)warn(result.reason);
 hudUpdate();
}
function wardStart(e){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||!S.hero||S.hero.hp<=0||
   S.hero.visionCd>0)return;
 e.preventDefault();e.stopPropagation();
 wardAim={ptr:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY};
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
}
function wardMove(e){
 if(!wardAim||wardAim.ptr!==e.pointerId)return;
 wardAim.x=e.clientX;wardAim.y=e.clientY;
 e.preventDefault();
}
function wardEnd(e){
 if(!wardAim||wardAim.ptr!==e.pointerId)return;
 const p=wardAim;
 if(e.type==='pointerup'){
  p.x=e.clientX;p.y=e.clientY;
  deployWard(wardPoint(p));
 }
 wardAim=null;
}
function beginRecall(){
 clickDestination=null;
 if(S.hero)E.clearAttackCommand(S.hero);
 joy.x=joy.y=0;
 const result=E.recall();
 if(!result)warn('RETORNO INDISPONÍVEL');
 return result;
}
function keyDown(e){
 if(S.mode!=='playing')return;
 const k=e.key.toLowerCase();
 if(k==='p'&&S.shopOpen||k==='escape'&&S.shopOpen){e.preventDefault();toggleShop();return}
 if(k==='escape'&&S.showPause){e.preventDefault();pause();return}
 if(S.showPause||S.shopOpen)return;
 if(k==='tab'){
  e.preventDefault();
  if(!e.repeat)setScoreboardVisible(true,true);
  return;
 }
 if(scoreboardVisible){
  if(k==='escape'){e.preventDefault();setScoreboardVisible(false); }
  return;
 }
 if(k==='y'){
  e.preventDefault();if(!e.repeat)setCameraMode(cameraMode==='free'?'locked':'free');
  return;
 }
 if(k===' '&&desktopCamera()){
  e.preventDefault();spaceCenterHeld=true;
  if(S.hero)cameraCenterAt(S.hero.x,S.hero.y);
  return;
 }
 if(k==='f2'){
  e.preventDefault();
  if(e.repeat)return;
  desktopScheme=desktopScheme==='wasd'?'arrows':'wasd';
  keys.clear();clickDestination=null;E.clearAttackCommand(S.hero);
  E.announce(desktopScheme==='wasd'?'PC: WASD + HABILIDADES 1/2/3/4':'PC: SETAS + HABILIDADES Q/W/E/R',2.5);
  return;
 }
 keys.add(k);
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(e.repeat)return;
 if(e.shiftKey&&['1','2','3','4'].includes(k)){
  e.preventDefault();
  const index=Number(k)-1,kit=C.heroes[S.hero.id].skills.concat([C.heroes[S.hero.id].ultimate]);
  const res=E.upgradeSkill(S.hero,kit[index]);
  if(!res.ok)warn(res.reason);hudUpdate();return;
 }
 if(k==='a'||k===' '){if(!E.autoAttack(S.hero))warn('NENHUM ALVO DISPONÍVEL PARA AA');return}
 const slots=desktopScheme==='wasd'?
  {'1':0,'2':1,'3':2,'4':3,q:0,e:2,r:3}:
  {'1':0,'2':1,'3':2,'4':3,q:0,w:1,e:2,r:3};
 if(k==='f'||k==='g'){e.preventDefault();useSummoner(k==='f'?0:1);return}
 const i=slots[k];
 if(i!==undefined){
  const kit=C.heroes[S.hero.id].skills.concat([C.heroes[S.hero.id].ultimate]);
  const id=kit[i],def=E.skillDef(id);
  const aim=desktopCamera()&&def.aim!=='self'?desktopMouseAim(id):null;
  if(!E.cast(S.hero,id,aim))warn('HABILIDADE INDISPONÍVEL OU EM RECARGA');
  return;
 }
 if(k==='v')deployWard();
 else if(k==='b')beginRecall();
 else if(k==='p')toggleShop();
 else if(k==='escape')pause();
}
function movement(){
 if(scoreboardVisible)return{x:0,y:0};
 let x=joy.x,y=joy.y;
 if(keys.has('arrowup')||desktopScheme==='wasd'&&keys.has('w'))y--;
 if(keys.has('arrowdown')||desktopScheme==='wasd'&&keys.has('s'))y++;
 if(keys.has('arrowleft')||desktopScheme==='wasd'&&keys.has('a'))x--;
 if(keys.has('arrowright')||desktopScheme==='wasd'&&keys.has('d'))x++;
 let len=Math.hypot(x,y);
 if(len>.08){
  clickDestination=null;
  // Joystick sempre tem prioridade sobre uma ordem automática de perseguir.
  // O foco de AA mantém o alvo, mas não sequestra o controle de movimento.
  if(S.hero?.commandTarget)E.clearAttackCommand(S.hero);
  return len>1?{x:x/len,y:y/len}:{x,y};
 }
 if(S.hero?.commandTarget){
  const target=S.hero.commandTarget;
  if(!E.isAttackCommandValid(S.hero,target))E.clearAttackCommand(S.hero);
  else{
   const dx=target.x-S.hero.x,dy=target.y-S.hero.y,d=Math.hypot(dx,dy);
   const r=target.r||(target.kind==='boss'?38:target.kind==='buff'?28:23);
   if(d>E.attackRange(S.hero)+r-5)return{x:dx/d,y:dy/d};
   return{x:0,y:0};
  }
 }
 if(clickDestination&&S.hero&&S.hero.hp>0){
  const dx=clickDestination.x-S.hero.x,dy=clickDestination.y-S.hero.y,d=Math.hypot(dx,dy);
  if(d<17){clickDestination=null;return{x:0,y:0}}
  return{x:dx/d,y:dy/d};
 }
 return{x:0,y:0};
}
function loop(now){
 const dt=clamp((now-last)/1000,0,.05);last=now;
 if(S.mode==='playing'){
  if(pointers.skill&&performance.now()-pointers.skill.started>190)aimPreview=pointers.skill;
  if(!S.showPause){
   E.step(dt,movement());
   // AA parado é automático pelo motor; o AA manual também funciona em movimento.
   // Wild Rift: AA continua enquanto o botão está pressionado. O motor
   // respeita o cooldown e o joystick nunca é limpo ao atacar.
   if(pointers.aa!==null&&S.hero?.hp>0&&!S.shopOpen&&!aaAim?.dragged&&
      performance.now()-(aaAim?.started||0)>115)E.autoAttack(S.hero);
   if(S.hero?.commandTarget){
    const t=S.hero.commandTarget;
    if(!E.isAttackCommandValid(S.hero,t))E.clearAttackCommand(S.hero);
    else{
     const r=t.r||(t.kind==='boss'?38:t.kind==='buff'?28:23);
     if(E.dist(S.hero,t)<=E.attackRange(S.hero)+r+2)E.autoAttack(S.hero);
    }
   }
   view(dt);hudCountdown-=dt;
   if(hudCountdown<=0){
    hudCountdown=.16;hudUpdate();
    // Nunca substituir botões DOM durante um toque prolongado.
    // A loja só re-renderiza periodicamente quando inventário/ouro mudou.
    if(S.shopOpen&&S.time-shopLastPaint>1.6){
     const now=[Math.floor(S.hero.gold/20),S.hero.items.join(','),
      E.canShop(S.hero),S.hero.hp<=0].join('|');
     if(now!==shopHash)shopRender();
    }
   }
  }
 }else if(S.mode==='ended'){view(0);endScreen();}
 requestAnimationFrame(loop);
}
for(const [i,rankBtn] of upgradeButtons.entries()){
 rankBtn.addEventListener('pointerdown',e=>{
  if(S.mode!=='playing'||S.shopOpen||S.showPause)return;
  e.preventDefault();e.stopPropagation();
  // Upgrade é independente de qualquer outro dedo pressionando joystick/AA.
  const kit=C.heroes[S.hero.id].skills.concat([C.heroes[S.hero.id].ultimate]);
  const result=E.upgradeSkill(S.hero,kit[i]);
  if(!result.ok)warn(result.reason);
  hudUpdate();
 });
 rankBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});
}
// Desktop: botões horizontais usam as mesmas habilidades, regras de mana e mira.
for(const btn of desktopBar.querySelectorAll('[data-pc-skill]')){
 const i=Number(btn.dataset.pcSkill);
 btn.addEventListener('pointerdown',e=>skillStart(e,i));
 btn.addEventListener('pointermove',skillMove);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(type,skillEnd);
}
for(const btn of desktopBar.querySelectorAll('[data-pc-spell]')){
 btn.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopPropagation();useSummoner(Number(btn.dataset.pcSpell));
 });
}
$('pcWard').addEventListener('click',()=>deployWard());
$('pcShop').addEventListener('click',toggleShop);
$('pcRecall').addEventListener('click',beginRecall);
$('pcRosterToggle').addEventListener('click',()=>{
 rosterCollapsed=!rosterCollapsed;
 teamRoster.classList.toggle('collapsed',rosterCollapsed);
 $('pcRosterToggle').setAttribute('aria-expanded',String(!rosterCollapsed));
 $('pcRosterChevron').textContent=rosterCollapsed?'+':'−';
 if(!rosterCollapsed){rosterLastUpdate=-1;desktopRosterUpdate();}
});
for(const btn of summonerPanel.querySelectorAll('button')){
 btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();useSummoner(Number(btn.dataset.slot))});
}
for(const [i,id] of ['dashBtn','pulseBtn','shieldBtn','ultBtn'].entries()){
 const btn=$(id);
 btn.addEventListener('pointerdown',e=>skillStart(e,i));
 btn.addEventListener('pointermove',skillMove);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(type,skillEnd);
}
$('fireBtn').addEventListener('pointerdown',aaStart);
$('fireBtn').addEventListener('pointermove',aaMove);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('fireBtn').addEventListener(type,aaEnd);
cv.addEventListener('pointerdown',worldDown);
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointermove',worldMove);
cv.addEventListener('pointerleave',()=>{
 if(!cameraDrag&&!mouseFollow)desktopPointer.over=false;
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(type,worldEnd);
window.addEventListener('keydown',keyDown);
window.addEventListener('keyup',e=>{
 const key=e.key.toLowerCase();
 keys.delete(key);
 if(key===' ')spaceCenterHeld=false;
 if(key==='tab'&&scoreboardHeld){e.preventDefault();setScoreboardVisible(false);}
});
window.addEventListener('blur',()=>{
 keys.clear();joy.ptr=null;joy.x=joy.y=0;pointers.aa=null;aaAim=null;S.attackAimActive=false;
 $('fireBtn').classList.remove('target-holding','target-selected');
 pointers.skill=null;mouseFollow=null;clickDestination=null;
 desktopPointer.over=false;cameraDrag=null;spaceCenterHeld=false;
});
$('fendaShopBtn').onclick=toggleShop;$('fendaShopClose').onclick=toggleShop;
$('fendaScoreBtn').addEventListener('click',()=>setScoreboardVisible(!scoreboardVisible));
$('fendaScoreClose').addEventListener('click',()=>setScoreboardVisible(false));
$('fendaWardBtn').addEventListener('pointerdown',wardStart);
$('fendaWardBtn').addEventListener('pointermove',wardMove);
for(const type of ['pointerup','pointercancel','lostpointercapture'])
 $('fendaWardBtn').addEventListener(type,wardEnd);
$('fendaRecallBtn').onclick=beginRecall;$('fendaPauseBtn').onclick=pause;
$('fendaCameraBtn').addEventListener('click',()=>setCameraMode(cameraMode==='free'?'locked':'free'));
syncCameraControl();
$('fendaTowerBtn').addEventListener('pointerdown',e=>{
 e.preventDefault();e.stopPropagation();
 if(S.mode!=='playing'||S.shopOpen||S.showPause||!S.hero||S.hero.hp<=0)return;
 const r=E.focusTower(S.hero);
 if(!r.ok)warn(r.reason);
 else if(!r.attacked)warn('TORRE SELECIONADA · AGUARDE O PRÓXIMO AA');
 hudUpdate();
});
function minimapPoint(e){
 const rect=mm.getBoundingClientRect();
 const scale=Math.min((mm.width-14)/E.W,(mm.height-14)/E.H);
 const ox=(mm.width-E.W*scale)/2,oy=(mm.height-E.H*scale)/2;
 return{x:clamp(((e.clientX-rect.left)/rect.width*mm.width-ox)/scale,0,E.W),
  y:clamp(((e.clientY-rect.top)/rect.height*mm.height-oy)/scale,0,E.H)};
}
function minimapStart(e){
 if(S.mode!=='playing'||S.shopOpen||S.showPause)return;
 e.preventDefault();e.stopPropagation();
 if(desktopCamera()&&cameraMode==='free'){
  const point=minimapPoint(e);
  cameraPeek={...point,ptr:e.pointerId,permanent:true};
  cameraCenterAt(point.x,point.y);
  try{mm.setPointerCapture(e.pointerId)}catch(_){}
  return;
 }
 cameraPeek={...minimapPoint(e),ptr:e.pointerId};
 cameraPeekUntil=S.time+2.2;
 try{mm.setPointerCapture(e.pointerId)}catch(_){}
}
function minimapMove(e){
 if(!cameraPeek||cameraPeek.ptr!==e.pointerId)return;
 const point=minimapPoint(e);cameraPeek.x=point.x;cameraPeek.y=point.y;
 if(cameraPeek.permanent)cameraCenterAt(point.x,point.y);
 cameraPeekUntil=S.time+2.2;e.preventDefault();
}
function minimapEnd(e){
 if(!cameraPeek||cameraPeek.ptr!==e.pointerId)return;
 if(cameraPeek.permanent){
  if(e.type==='pointerup'){
   const point=minimapPoint(e);cameraCenterAt(point.x,point.y);
  }
  cameraPeek=null;cameraPeekUntil=0;return;
 }
 if(e.type==='pointerup'){
  const point=minimapPoint(e);cameraPeek.x=point.x;cameraPeek.y=point.y;
  cameraPeek.ptr=null;cameraPeekUntil=S.time+1.9;
 }else{cameraPeek=null;cameraPeekUntil=0}
}
mm.addEventListener('pointerdown',minimapStart);
mm.addEventListener('pointermove',minimapMove);
for(const type of ['pointerup','pointercancel','lostpointercapture'])
 mm.addEventListener(type,minimapEnd);
mm.addEventListener('dblclick',()=>{
 cameraPeek=null;cameraPeekUntil=0;
 if(S.hero&&desktopCamera())cameraCenterAt(S.hero.x,S.hero.y);
});
window.addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
window.FendaView={chooseLane,chooseHero,startGame,pause,view,resize,toggleShop,hudUpdate,pickAttackTarget,issueRightClick,movement,minimapPoint,wardPoint,wardStart,wardMove,wardEnd,minimapStart,minimapMove,minimapEnd,renderScoreboard,setScoreboardVisible};
resize();chooseLane(true);requestAnimationFrame(loop);
})();