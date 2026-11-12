// Testes de regressão do MOBA. Executar: node arena-de-sigilos/test-fenda-moba.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const html=read('index.html');
const get=(regex,name)=>{
 const match=html.match(regex);
 assert.ok(match,'Definição ausente: '+name);
 return vm.runInNewContext('('+match[1]+')');
};
const heroes=get(/const heroes=(\{[\s\S]*?\});\s*let heroChoice=/,'campeões');
const skills=get(/const skillDefs=(\{[\s\S]*?\});\s*const itemDefs=/,'habilidades');
const sandbox={window:{SigilsCore:{heroes,skills}},console};
vm.runInNewContext(read('fenda-engine.js'),sandbox);
vm.runInNewContext(read('fenda-team-ai.js'),sandbox);
const E=sandbox.window.FendaEngine,AI=sandbox.window.FendaTeamAI;
assert.ok(E&&AI,'Motor ou coordenador tático não inicializado');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const state=E.start('lyria');
assert.equal(Object.keys(heroes).length,18,'Elenco precisa ter 12 campeões');
assert.ok(Object.values(state.hero.skillLevels).every(rank=>rank===0)&&state.hero.skillPoints===1,
 'O jogador deve começar sem habilidades aprendidas, mas com 1 ponto livre');
assert.ok(state.units.filter(u=>u.kind==='hero'&&!u.controlled).every(u=>
 Object.values(u.skillLevels).filter(rank=>rank>0).length===1&&u.skillPoints===0),
 'Os bots devem escolher uma habilidade no nível 1, gastando o ponto disponível');
assert.ok(E.SUMMONERS.smite&&E.SUMMONERS.freecast,
 'Feitiços de invocador Selo da Caça e Transe Arcano não cadastrados');
assert.equal(E.ITEMS.filter(item=>item.tier===2).length,25,
 'Itens de lutador e caçador não presentes na loja');

assert.equal(state.units.filter(u=>u.kind==='hero').length,10);
assert.equal(state.structures.filter(u=>u.kind==='tower').length,12);
assert.equal(E.LANE_HALF_WIDTH*2,290);
assert.equal(E.CORE.length,2,'Cada lado tem um Núcleo independente da fonte');
assert.equal(E.BASE_GATE.length,2,'Saídas próprias das duas equipes');
assert.ok(E.W>=3300&&E.H>=2500,'Mapa pequeno demais para separar as rotas');
for(const gates of E.BASE_GATE){
 assert.ok(distance(gates[0],gates[1])>350&&distance(gates[1],gates[2])>350,
  'Saídas da base amontoadas como antes');
}
for(let side=0;side<2;side++){
 const fountain=E.HOME[side],nexus=E.CORE[side];
 assert.ok(distance(fountain,nexus)>250,
  'A fonte não deve ser sobreposta ao Núcleo');
 const allGates=E.BASE_GATE[side];
 for(let lane=0;lane<3;lane++){
  const gate=side===0?E.PATHS[lane][0]:E.PATHS[lane][E.PATHS[lane].length-1];
  assert.ok(distance(gate,allGates[lane])<.01,
   'Cada rota deve chegar ao portão correto da base');
  assert.ok(E.routeProjection(lane,nexus).distance>92,
   'O núcleo não pode bloquear o eixo de uma lane');
 }
 const ownTowers=state.structures.filter(t=>t.kind==='tower'&&t.side===side);
 assert.ok(ownTowers.every(t=>distance(t,nexus)>180),
  'Núcleo demasiado próximo de uma torre');
}
assert.equal(E.JUNGLE_LINKS.length,4);
assert.equal(E.ROUTE_PATHS.length,3,'As três rotas devem usar trajetórias suavizadas.');
assert.ok(html.includes('fenda-engine.js?v=11.0')&&
 html.includes('fenda-team-ai.js?v=11.0')&&
 html.includes('fenda-scenery.js?v=10.2.1')&&
 html.includes('fenda-view.js?v=11.0'),'O site precisa carregar o cenário procedural antes da câmera.');
// Curvas reais: uma curva não pode rotacionar repentinamente como uma esquina de 90°.
for(const pts of E.ROUTE_PATHS){
 let largestTurn=0;
 for(let i=1;i<pts.length-1;i++){
  const a=pts[i-1],b=pts[i],c=pts[i+1];
  const ab=Math.atan2(b.y-a.y,b.x-a.x),bc=Math.atan2(c.y-b.y,c.x-b.x);
  const angle=Math.abs(Math.atan2(Math.sin(bc-ab),Math.cos(bc-ab)));
  largestTurn=Math.max(largestTurn,angle);
 }
 assert.ok(largestTurn<.40,'Trajetória ainda possui curvas abruptas.');
}

// T1 deslocada lateralmente e sem obstruir o centro do caminho.
for(const side of [0,1])for(const lane of [0,1,2]){
 const t=state.structures.find(s=>s.side===side&&s.lane===lane&&s.tier===1);
 const pathPoint=E.pathPos(lane,side===0?.37:.63);
 assert.ok(distance(t,pathPoint)>=65,'Torre T1 ainda ocupa eixo da lane');
}
// Colisão física impede atravessar torre.
const controlled=state.hero,tower=state.structures.find(s=>s.side===1&&s.lane===1&&s.tier===1);
controlled.x=tower.x+120;controlled.y=tower.y;
E.movePhysical(controlled,-100,0);
assert.ok(distance(controlled,tower)>=controlled.r+tower.r,'Colisão da torre falhou');
// Ataque básico dá dano à torre exposta.
controlled.x=tower.x-65;controlled.y=tower.y;
const startingHp=tower.hp;
assert.equal(E.focusTower(controlled,tower).ok,true,'Não consegue selecionar torre');
for(let i=0;i<12;i++)E.step(.05,{x:0,y:0});
assert.ok(tower.hp<startingHp,'Ataque básico não causa dano à torre');
// Controle de mouse no PC: clique direito seleciona alvo e AA é repetido após perseguir.
const view=read('fenda-view.js'),css=read('fenda.css');
assert.ok(view.includes('if(e.button===2)issueRightClick(e.clientX,e.clientY)'),
 'Clique direito deve emitir uma ordem de ataque ou deslocamento.');
assert.ok(view.includes('E.autoAttack(S.hero);')&&
 view.includes('pickAttackTarget(clientX,clientY)'), 'Sem comando de ataque por alvo');
assert.ok(!view.includes('else if(e.button===0&&!selectTowerAt'),
 'Clique esquerdo não deve atacar automaticamente no PC');
assert.ok(css.includes('.stage.fenda-on #fireBtn')&&css.includes('pointer: fine'),
 'O botão AA deve estar oculto para mouse, sem afetar controles touch');
E.start('lyria');
const player=state.hero;
const target=state.units.find(u=>u.kind==='hero'&&u.side===1);
state.units=[player,target];player.x=800;player.y=900;
target.x=1145;target.y=900;target.stun=100;
E.refreshVision(true);
const command=E.commandAttack(player,target);
assert.equal(command.ok,true,'O comando deve aceitar um inimigo visível, mesmo fora de alcance');
const initialEnemyHp=target.hp,initialPlayerX=player.x;
for(let frame=0;frame<150&&target.hp===initialEnemyHp;frame++){
 const enemy=player.commandTarget;
 const d=enemy?distance(player,enemy):0;
 const move=enemy&&d>E.attackRange(player)+enemy.r-5?
  E.norm(enemy.x-player.x,enemy.y-player.y):{x:0,y:0};
 E.step(.05,move);
 if(player.commandTarget&&E.isAttackCommandValid(player,player.commandTarget)&&
    distance(player,target)<=E.attackRange(player)+target.r+2)E.autoAttack(player);
}
assert.ok(player.x>initialPlayerX,'O jogador não perseguiu o alvo');
assert.ok(target.hp<initialEnemyHp,'O AA automático não atingiu o alvo após persegui-lo');
E.clearAttackCommand(player);
assert.equal(player.commandTarget,null,'Comando de ataque não cancelado');
// Espaçamento e posicionamento estrutural: a torre deve permanecer fora da pista.
E.start('lyria');
for(const t of state.structures.filter(o=>o.kind==='tower')){
 assert.ok(E.routeProjection(t.lane,t).distance>=60,'Torre bloqueia o centro da rota: '+t.id);
}
for(const camp of state.camps){
 assert.ok(Math.min(...[0,1,2].map(l=>E.routeProjection(l,camp).distance))>=170,
 'Monstro ocupando uma lane: '+camp.id);
}
// Fenda 7.0: restaurar visual da Teamfight, sem avenidas pintadas.
const terrainSource=read('fenda-view.js'),scenerySource=read('fenda-scenery.js');
vm.runInNewContext(scenerySource,sandbox);
assert.ok(sandbox.window.FendaScenery,'Módulo de paisagem Canvas não carregou');

{
 let drawn=0,largeStrokes=0,maxStroke=0,fullScreenFills=0;
 const gradient={addColorStop(){}};
 const context=new Proxy({},{get(o,key){
  if(key in o)return o[key];
  if(key==='createRadialGradient'||key==='createLinearGradient')return()=>gradient;
  if(key==='fillRect')return(x,y,w,h)=>{drawn++;if(w>=E.W*.75&&h>=E.H*.75)fullScreenFills++};
  return()=>{drawn++};
 },set(o,key,value){if(key==='lineWidth'){maxStroke=Math.max(maxStroke,value);if(value>95)largeStrokes++;}o[key]=value;return true}});
 sandbox.document={createElement(tag){
  assert.equal(tag,'canvas','Cenário criou elemento de imagem ou DOM inesperado');
  return{width:0,height:0,getContext(mode){assert.equal(mode,'2d');return context}};
 }};
 const actual=sandbox.window.FendaScenery.drawTerrain(E,state);
 assert.equal(actual.width,E.W);assert.equal(actual.height,E.H);
 assert.ok(drawn>100,'Cenário não gerou todos os elementos no Canvas');
 assert.equal(largeStrokes,12,'As três lanes precisam ter piso amplo, com quatro camadas cada');
 assert.ok(maxStroke<=E.LANE_HALF_WIDTH*2+95,
  'Há muralha ou objeto decorativo maior que a faixa de combate');
 assert.equal(fullScreenFills,1,'Apenas o fundo deve preencher toda a tela');
 assert.ok(!scenerySource.includes('createRadialGradient')&&
  !scenerySource.includes('const halfFields='),
  'Remover halos e polígonos enormes da jungle');
}

assert.equal(E.ROUTE_PATHS.length,3);
assert.ok(terrainSource.includes('function drawTerrain(){terrain=window.FendaScenery.drawTerrain(E,S);}')&&
 scenerySource.includes('function base(g,E,side)')&&
 scenerySource.includes('function wall(g,w)')&&
 scenerySource.includes('function jungleCamp(g,o)'),
 'Bases, selvas e paredões precisam ser desenhados no Canvas');
assert.ok(scenerySource.includes('function laneFloor(g,E,lane)')&&
 scenerySource.includes('for(let lane=0;lane<3;lane++)laneFloor(g,E,lane)')&&
 !scenerySource.includes('drawGateBridges'),
 'Cada rota deve ter piso de combate legível, sem avenidas extras na jungle');
assert.ok(["new Image(","createElement('img')","spritePaths","drawSprite","MAP_ART"].every(term=>
 !terrainSource.includes(term)&&!scenerySource.includes(term)),
 'É PROIBIDO usar arquivos de imagem, atlas ou sprites no mapa');
assert.ok(scenerySource.includes('for(const w of S.walls)')&&
 scenerySource.includes('wallChain(g,group)')&&
 scenerySource.includes('for(const o of S.obstacles)rock(g,o)'),
 'Toda barreira desenhada deve seguir o mesmo segmento do colisor real');
assert.ok(scenerySource.includes('function fond(g,E)')&&
 scenerySource.includes('function jungleZones(g,E)')&&
 scenerySource.includes('function base(g,E,side)')&&
 scenerySource.includes('hex(g,')&&
 scenerySource.includes('ring(g,'),
 'Identidade da Arena original: grade, quatro jungles, hexágonos e círculos');
assert.ok(terrainSource.includes('ctx.scale(cameraZoom,cameraZoom)')&&
 terrainSource.includes('S.camera.x+worldVW')&&
 terrainSource.includes('worldVW,worldVH'),
 'Camera, visao e click precisam respeitar o zoom');
assert.ok(terrainSource.includes('let HERO_RENDER_SCALE=1.0')&&
 terrainSource.includes('ctx.scale(HERO_RENDER_SCALE,HERO_RENDER_SCALE)'),
 'Os campeões devem ter representação reduzida, sem alterar hitboxes');
assert.ok(terrainSource.includes('function drawStructure(o,t){')&&
 terrainSource.includes('function drawHero(u,t){')&&
 terrainSource.includes('function drawMinion(u,t){'),
 'Torres, campeões e tropas continuam dinâmicos');
const allTowers=state.structures.filter(s=>s.kind==='tower');
assert.ok(allTowers.every(t=>distance(t,E.CORE[t.side])>355),
 'Torres colidiram com o núcleo dentro da base');
assert.ok(allTowers.filter(t=>t.tier===1).every(t=>
 distance(t,E.CORE[t.side])>820),'Torres EXTERNAS precisam ficar longe do núcleo');
for(const side of [0,1])for(const lane of [0,1,2]){
 const ts=allTowers.filter(t=>t.side===side&&t.lane===lane)
  .sort((a,b)=>a.tier-b.tier);
 assert.equal(ts.length,2,'Cada rota tem exatamente T1 e T2 por lado');
 assert.ok(distance(ts[0],E.CORE[side])>distance(ts[1],E.CORE[side]),
  'Torres T1 e T2 fora da ordem defensiva correta');
}
for(let i=0;i<allTowers.length;i++)for(let j=i+1;j<allTowers.length;j++){
 assert.ok(distance(allTowers[i],allTowers[j])>250,
  'Torres do mapa estão próximas demais');
}
assert.ok(read('fenda-engine.js').includes('const TOP_PATH=[')&&
 read('fenda-engine.js').includes('const MID_PATH=[')&&
 read('fenda-engine.js').includes('TOP_PATH.slice().reverse().map(rotateHalf)'),
 'Top e bot precisam ser espelhadas, e mid diagonal');
E.start('lyria');
assert.equal(state.structures.filter(s=>s.kind==='tower').length,12);
assert.equal(state.structures.filter(s=>s.kind==='core').length,2);

assert.equal(E.TOWERS_PER_LANE,2,'Uma torre removida de cada lado de cada rota');
assert.equal(E.TURRET_RANGE,330,'Torre deve proteger ambos os lados da lane');
assert.equal(E.CORE_RANGE,345,'O núcleo precisa defender sua plataforma');
const rangedHeroes=state.units.filter(u=>u.kind==='hero'&&u.isRanged);
for(const u of rangedHeroes)assert.ok(E.attackRange(u)<E.TURRET_RANGE,
 'AA ultrapassa alcance de torre: '+u.id);
for(const t of state.structures){
 assert.equal(t.range,t.kind==='core'?E.CORE_RANGE:E.TURRET_RANGE,
 'Alcance da estrutura não usa a mesma unidade física da câmera');
}
for(const tower of state.structures.filter(t=>t.kind==='tower')){
 const projection=E.routeProjection(tower.lane,tower);
 const t=projection.progress/E.ROUTE_TOTALS[tower.lane];
 const origin=E.pathPos(tower.lane,t);
 const a=E.pathPos(tower.lane,Math.max(0,t-.003));
 const b=E.pathPos(tower.lane,Math.min(1,t+.003));
 const tangent=E.norm(b.x-a.x,b.y-a.y);
 for(const direction of [-1,1]){
  const edge={x:origin.x-tangent.y*E.LANE_HALF_WIDTH*direction,
   y:origin.y+tangent.x*E.LANE_HALF_WIDTH*direction};
  assert.ok(distance(tower,edge)<tower.range+17.5,
   'Torre deixa jogador passar pelo lado da lane: '+tower.id);
 }
}
assert.ok(terrainSource.includes('CAMERA_MIN_WORLD_HEIGHT=620')&&
 terrainSource.includes('MOBILE_HERO_ANCHOR_X=.54')&&
 terrainSource.includes('MOBILE_THUMB_CLEARANCE_PX=108')&&
 terrainSource.includes('vh/CAMERA_MIN_WORLD_HEIGHT')&&
 terrainSource.includes('d<radius+48')&&
 terrainSource.includes("danger?'#ff849b'"),
 'A câmera e a indicação de perigo não previnem ataques invisíveis');
const viewportCases=[[924,416],[800,360],[1800,830],[420,300]];
for(const [width,height] of viewportCases){
 const comfortable=width>=1250?1.50:width>=750?1.35:1.17;
 const zoom=Math.min(comfortable,height/620);
 const bottomClearance=.45*(height/zoom)+125;
 assert.ok(bottomClearance>E.CORE_RANGE+21+8,
  'A estrutura pode atingir um campeão invisível no viewport '+width+' × '+height);
 assert.ok(height/zoom<=620+1,'A câmera mostrou demasiada área vertical');

}
// Cena que antes mostrava T1, T2 e o encontro de minions na Bot:
// a câmera de batalha deve mostrar a frente, não as duas torres aliadas.
{
 const lane=2,hero=E.pathPos(lane,.28),projection=E.routeProjection(lane,hero);
 const pt=projection.progress/E.ROUTE_TOTALS[lane],delta=.006;
 const a=E.pathPos(lane,Math.max(0,pt-delta));
 const b=E.pathPos(lane,Math.min(1,pt+delta));
 const dir=E.norm(b.x-a.x,b.y-a.y);
 const focus={x:hero.x+dir.x*140,y:hero.y+dir.y*140};
 const width=1850,height=832,zoom=Math.min(1.5,height/620);
 const worldW=width/zoom,worldH=height/zoom;
 const left=E.clamp(focus.x-worldW*.44,0,Math.max(0,E.W-worldW));
 const top=E.clamp(focus.y-worldH*.55,0,Math.max(0,E.H-worldH));
 const onScreen=o=>o.x>=left&&o.x<=left+worldW&&o.y>=top&&o.y<=top+worldH;
 const visibleOwn=state.structures.filter(o=>o.kind==='tower'&&o.side===0&&o.lane===lane&&onScreen(o));
 assert.ok(onScreen(E.pathPos(lane,.5)),'O avanço na Bot deixou de aparecer');
 assert.ok(visibleOwn.length<=1,'Câmera continua mostrando duas torres azuis e a wave na Bot');
 assert.ok(zoom>1.25,'Zoom quase igual ao da versão antiga');
 assert.ok(terrainSource.includes('function mobileCameraTarget(hero,observing=false)')&&
  terrainSource.includes('const target=mobileCameraTarget(h,observing)'),
  'Câmera mobile precisa acompanhar o campeão em vez de antecipar a lane');
}
assert.ok(terrainSource.includes('mc.lineWidth=E.LANE_HALF_WIDTH*2'),
 'A largura representada no minimapa diverge da largura real da lane');
assert.ok(terrainSource.includes("fogContext.fillStyle=discovered?'rgba(5,20,30,.33)':'rgba(5,17,28,.56)'"),
 'A névoa voltou a esconder o cenário com blocos pretos');
assert.ok(terrainSource.includes('ctx.scale(1.16,1.16)')&&
 terrainSource.includes('HERO_RENDER_SCALE=vw>=1250?1.11:1.19'),
 'Proporção dos campeões e minions difere do novo enquadramento');


 // Uma torre ou núcleo não pode atirar 1 unidade além do alcance declarado,
 // mas deve reagir assim que o adversário entra nele.
for(const kind of ['tower','core']){
 E.start('lyria');
 const targetTower=state.structures.find(t=>t.kind===kind&&t.side===1);
 const champion=state.hero;
 state.structures=[targetTower];state.units=[champion];
 state.camps=[];state.obstacles=[];state.walls=[];state.nextWave=999;
 champion.x=targetTower.x-targetTower.range-champion.r-24;
 champion.y=targetTower.y;
 E.step(.05,{x:0,y:0});
 assert.equal(state.projectiles.filter(p=>p.source===targetTower).length,0,
  'Estrutura disparou antes do limite definido: '+kind);
 champion.x=targetTower.x-targetTower.range-champion.r+6;
 E.step(.05,{x:0,y:0});
 assert.ok(state.projectiles.some(p=>p.source===targetTower),
  'Estrutura não atacou ao entrar no alcance: '+kind);
}
E.start('lyria');


for(const side of [0,1])for(const lane of [0,1,2]){
 const ts=state.structures.filter(t=>t.kind==='tower'&&t.side===side&&t.lane===lane);
 assert.equal(ts.length,2,'Exatamente duas torres por equipe em cada lane');
 assert.deepEqual(ts.map(t=>t.tier).sort(),[1,2]);
}
// O núcleo só pode perder vida quando as duas torres de pelo menos
// uma das lanes tiverem caído; T2 não recebe dano antes da T1.
{
 E.start('lyria');
 const attacker=state.hero,enemyCore=state.structures.find(t=>t.kind==='core'&&t.side===1);
 const outer=state.structures.find(t=>t.kind==='tower'&&t.side===1&&t.lane===2&&t.tier===1);
 const inner=state.structures.find(t=>t.kind==='tower'&&t.side===1&&t.lane===2&&t.tier===2);
 const coreHp=enemyCore.hp,innerHp=inner.hp;
 E.damage(inner,180,attacker);
 E.damage(enemyCore,180,attacker);
 assert.equal(inner.hp,innerHp,'T2 exposta antes da T1');
 assert.equal(enemyCore.hp,coreHp,'Núcleo exposto com torres ativas');
 outer.hp=0;E.damage(inner,180,attacker);
 assert.ok(inner.hp<innerHp,'T2 continua protegida após destruir T1');
 E.damage(enemyCore,180,attacker);
 assert.equal(enemyCore.hp,coreHp,'Núcleo exposto com T2 intacta');
 inner.hp=0;E.damage(enemyCore,180,attacker);
 assert.ok(enemyCore.hp<coreHp,'Núcleo não liberado após destruir T1 e T2');
 E.start('lyria');
}
assert.ok(state.walls.length>=120,'A jungle e as bases precisam de paredes físicas suficientes');
assert.ok(state.walls.filter(w=>w.wallClass==='base').length>=48,
 'Muralha do santuário precisa ser obstáculo físico, não decoração');
assert.ok(state.walls.filter(w=>w.wallClass!=='base').length>=60,
 'Corredores longos precisam de separadores físicos contra a jungle');
assert.ok(state.walls.filter(w=>w.wallClass==='jungle').every(w=>w.halfWidth<=35),
 'Parede da selva voltou a ser um bloco gigante');
const jungleChains=new Set(state.walls.filter(w=>w.wallClass==='jungle').map(w=>w.chain));
assert.equal(jungleChains.size,16,
 'A jungle deve ter apenas oito barreiras discretas por lado');
assert.equal(state.obstacles.filter(o=>o.kind==='rock').length,0,
 'Pilares avulsos sem função devem desaparecer do mapa');
assert.equal(state.brushes.length,8);
assert.equal(state.obstacles.filter(o=>o.kind==='gate').length,12,
 'Os seis portões precisam ser formados por doze pilares sólidos');
for(const gate of state.obstacles.filter(o=>o.kind==='gate')){
 assert.ok(E.routeProjection(gate.lane,gate).distance>=75,
  'Coluna de portão bloqueia sua lane');
 assert.ok(E.solidBodies().includes(gate),'Portão decorativo sem colisão real');
}
const wallsById=new Map(state.walls.map(w=>[w.id,w]));
for(const a of state.walls.filter(w=>w.side===0)){
 const b=wallsById.get(a.id.replace(/-0$/,'-1'));
 assert.ok(b,'Muralha espelhada ausente: '+a.id);
 assert.ok(Math.abs(a.ax+b.ax-E.W)<.01&&Math.abs(a.ay+b.ay-E.H)<.01&&
  Math.abs(a.bx+b.bx-E.W)<.01&&Math.abs(a.by+b.by-E.H)<.01,
  'Muralhas precisam ser simétricas por rotação de 180 graus');
 assert.equal(a.halfWidth,b.halfWidth);
 for(const p of [{x:a.ax,y:a.ay},{x:a.bx,y:a.by}]){
  const gap=Math.min(...[0,1,2].map(l=>E.routeProjection(l,p).distance));
  assert.ok(gap>=105,'Muralha bloqueia o corredor de minions: '+a.id);
 }
}
for(const o of state.structures.filter(x=>x.kind==='tower')){
 assert.ok(E.routeProjection(o.lane,o).distance>=82,
  'Torre atravessando a pista: '+o.id);
}
for(const lane of [0,1,2]){
 const blueT1=state.structures.find(t=>t.kind==='tower'&&t.side===0&&t.lane===lane&&t.tier===1);
 const redT1=state.structures.find(t=>t.kind==='tower'&&t.side===1&&t.lane===lane&&t.tier===1);
 const firstGap=distance(blueT1,redT1);
 const blueT2=state.structures.find(t=>t.kind==='tower'&&t.side===0&&t.lane===lane&&t.tier===2);
 const secondGap=distance(blueT1,blueT2);
 assert.ok(firstGap>=930&&firstGap<=1150,
  'O encontro das tropas precisa de área neutra entre T1 na rota '+lane);
 assert.ok(firstGap>E.TURRET_RANGE*2+260,
  'Áreas de ataque das T1 adversárias estão perto demais na rota '+lane);
 assert.ok(secondGap>=(lane===1?490:680),
  'Duas torres aliadas ainda aparecem amontoadas na rota '+lane);
 assert.ok(secondGap>=firstGap*.45,
  'Separação defensiva insuficiente em comparação às T1 '+lane);
}
const topMid=E.pathPos(0,.55),centralMid=E.pathPos(1,.50),bottomMid=E.pathPos(2,.55);
assert.ok(distance(topMid,centralMid)>350&&distance(bottomMid,centralMid)>350,
 'As três rotas devem ser claramente separadas no meio da partida');
// QA geográfico: do santuário AZUL devem ser alcançáveis as três lanes
// de ambos os lados e os seis acampamentos, com paredes consideradas obstáculos.
// Teste de conectividade com largura do corpo do campeão + margem.
{
 const cell=40,nx=Math.ceil(E.W/cell),ny=Math.ceil(E.H/cell);
 const solidBodies=E.solidBodies().filter(o=>
  o.kind==='wall'||o.kind==='gate'||o.kind==='rock');
 const occupied=new Uint8Array(nx*ny);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const point={x:(i+.5)*cell,y:(j+.5)*cell};
  if(solidBodies.some(body=>E.distanceToSolid(point,body)<20))
   occupied[j*nx+i]=1;
 }
 const visited=new Uint8Array(nx*ny),from=E.HOME[0];
 const start=Math.floor(from.y/cell)*nx+Math.floor(from.x/cell);
 const queue=[start];visited[start]=1;
 for(let k=0;k<queue.length;k++){
  const id=queue[k],ix=id%nx,iy=Math.floor(id/nx);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=ix+dx,y=iy+dy;
   if(x<1||y<1||x>=nx-1||y>=ny-1)continue;
   const next=y*nx+x;
   if(visited[next]||occupied[next])continue;
   if(dx&&dy&&(occupied[iy*nx+x]||occupied[y*nx+ix]))continue;
   visited[next]=1;queue.push(next);
  }
 }
 const reaches=p=>{
  const col=Math.max(0,Math.min(nx-1,Math.floor(p.x/cell)));
  const row=Math.max(0,Math.min(ny-1,Math.floor(p.y/cell)));
  return visited[row*nx+col]===1;
 };
 for(let lane=0;lane<3;lane++)
  for(const t of [.10,.40,.50,.60,.90])
   assert.ok(reaches(E.pathPos(lane,t)),
    'Lane inacessível à distância '+t+' para rota '+lane);
 for(const camp of state.camps)
  assert.ok(reaches(camp),'Acampamento inacessível pela jungle: '+camp.id);
 for(const side of [0,1])
  for(const gate of E.BASE_GATE[side])
   assert.ok(reaches(gate),'Saída física da base bloqueada');
}
// Colisão real: não se atravessa a barricada de um lado para o outro.
const w=state.walls[0],pilot=state.hero;
const normal=E.norm(-(w.by-w.ay),w.bx-w.ax),off=pilot.r+w.halfWidth+26;
pilot.x=w.x+normal.x*off;pilot.y=w.y+normal.y*off;
E.movePhysical(pilot,-normal.x*(off*2+44),-normal.y*(off*2+44));
const signedAfter=(pilot.x-w.x)*normal.x+(pilot.y-w.y)*normal.y;
assert.ok(signedAfter>=pilot.r+w.halfWidth-.6,
 'Barreira foi atravessada pelo jogador');
assert.ok(E.distanceToSolid(pilot,w)>=pilot.r-.7,
 'Colisão deixou jogador dentro da parede');
// Provar que o personagem realmente contorna uma divisória pelo acesso
// previsto, sem atravessá-la (não basta a BFS dizer que existe um caminho).
E.start('lyria');
{
 const p=state.hero;p.x=497;p.y=910;
 const target={x:840,y:925};
 for(let i=0;i<330;i++)E.moveToward(p,target,.05,1);
 assert.ok(distance(p,target)<35,
  'Campeão ficou preso na divisória da jungle mesmo com passagem aberta');
}
E.start('lyria');
// Geometria verdadeira: não colocar paredes sobre monstros nem torres.
for(const creep of state.camps){
 const radius=creep.kind==='boss'?38:creep.kind==='buff'?28:23;
 assert.ok(state.walls.every(w=>E.pointToWall(creep,w)-w.halfWidth>=radius+12),
  'Uma barricada atravessa o acampamento '+creep.id);
}
for(const tower of state.structures.filter(o=>o.kind==='tower')){
 assert.ok(state.walls.every(w=>E.pointToWall(tower,w)-w.halfWidth>=tower.r+12),
  'Parede atravessa a torre '+tower.id);
}
assert.ok(view.includes('for(const path of E.ROUTE_PATHS)')&&
 view.includes('for(const w of S.walls)'),
 'O minimapa também deve mostrar as três rotas e suas barreiras reais');
// Projetéis de habilidade param ao tocar uma parede, sem dano do outro lado.
E.start('lyria');
const projectileWall=state.walls[0],normalShot=E.norm(-(projectileWall.by-projectileWall.ay),
 projectileWall.bx-projectileWall.ax);
const caster=state.hero,defender=state.units.find(o=>o.kind==='hero'&&o.side===1);
caster.x=projectileWall.x+normalShot.x*100;caster.y=projectileWall.y+normalShot.y*100;
defender.x=projectileWall.x-normalShot.x*100;defender.y=projectileWall.y-normalShot.y*100;
defender.stun=10;
for(const t of state.structures)t.attackCd=100;
state.units=[caster,defender];
// O teste verifica exclusivamente a colisão do projétil, não o novo AA automático.
caster.attackCd=100;
const defenderHp=defender.hp;
state.projectiles=[{kind:'skillline',x:caster.x,y:caster.y,vx:-normalShot.x*550,
 vy:-normalShot.y*550,life:2,range:230,travel:0,damage:95,
 r:7,side:0,source:caster,stun:0,slow:0}];
for(let i=0;i<10;i++)E.step(.05,{x:0,y:0});
assert.equal(state.projectiles.length,0,'Feitiço passou através da parede');
assert.equal(defender.hp,defenderHp,'Feitiço atravessou a parede e acertou o adversário');
const sourceCss=read('fenda.css');
assert.ok(sourceCss.includes('.stage.fenda-on .mobile-controls #joy'),
 'Joystick não está oculto no modo desktop');
assert.ok(sourceCss.includes('@media (hover:none), (pointer:coarse)')&&
 sourceCss.includes('.stage.fenda-on #fireBtn {display:flex!important;pointer-events:auto!important;}'),
 'Ataque básico deve continuar visível e acionável no celular');
// Fenda 5.3: AA proporcional à lane, habilidades e reserva de mana real.
E.start('lyria');
const rangeHero=state.hero;
assert.equal(E.attackRange(rangeHero),185,'Lyria tem alcance inferior à Tessa, mas ataca mais depressa');
assert.ok(E.attackRange(rangeHero)<E.LANE_HALF_WIDTH*2,'AA não pode superar a largura da rota');
assert.equal(E.skillDef('lyria_pierce').range,315);
assert.equal(E.skillDef('lyria_rain').range,230);
assert.equal(E.skillDef('nyra_bolt').range,302);
assert.equal(E.skillDef('seris_bloom').range,240);
assert.equal(E.WARD_RANGE,280);
assert.equal(rangeHero.mana,320);
assert.equal(E.maxMana(rangeHero),320);
const manaCost=E.skillDef('lyria_pierce').cost;
assert.ok(E.upgradeSkill(rangeHero,'lyria_pierce').ok,'Jogador deve escolher a primeira habilidade antes de lançá-la');
assert.equal(E.cast(rangeHero,'lyria_pierce'),true);
assert.equal(rangeHero.mana,320-manaCost,'Casting não está gastando mana');
rangeHero.mana=0;
assert.equal(E.cast(rangeHero,'lyria_rain'),false,'Habilidade foi usada com mana zero');
assert.ok(view.includes("'MANA '+Math.ceil(h.mana)")&&view.includes("'∞ MANA LIVRE '"),
 'Exibir mana em números no HUD');
// Ward arrastável, alcance definido e campo de visão ativado.
E.start('lyria');
const wardHero=state.hero;wardHero.x=950;wardHero.y=920;
assert.equal(E.placeWard(wardHero,wardHero.x+350,wardHero.y).ok,false);
assert.equal(E.placeWard(wardHero,wardHero.x+270,wardHero.y).ok,true);
assert.ok(E.isPointVisible(0,{x:wardHero.x+490,y:wardHero.y}),
 'Visão de ward não deve depender do alcance do herói');
// Visão compartilhada por campeões, tropas e torres, não apenas pelo jogador.
E.start('lyria');E.makeWave();
const friendMinion=state.units.find(u=>u.side===0&&u.kind==='minion');
friendMinion.x=1620;friendMinion.y=870;E.refreshVision(true);
assert.ok(state.sight[0].some(s=>s.x===friendMinion.x&&s.y===friendMinion.y),
 'Tropa não está contribuindo com visão de equipe');
assert.ok(E.isPointVisible(0,{x:friendMinion.x+115,y:friendMinion.y}),
 'A tropa não ilumina seu entorno');
const towerVision=state.structures.find(o=>o.side===0&&o.kind==='tower');
assert.ok(state.sight[0].some(s=>s.x===towerVision.x&&s.y===towerVision.y),
 'Torre não contribui com visão de equipe');
assert.ok(view.includes("fogContext.globalCompositeOperation='destination-out'")&&
 view.includes('for(const src of S.sight[0]||[])'),
 'A névoa não remove o sombreado de cada fonte aliada');
// B é interrompido por movimento, ataque e dano recebido.
{
 E.start('lyria');
 const hero=E.state.hero,enemy=E.state.units.find(u=>u.side===1&&u.kind==='hero');
 hero.x=1040;hero.y=900;enemy.x=hero.x+55;enemy.y=hero.y;
 assert.ok(E.recall(),'Recall não começou para testar interrupções');
 E.step(.05,{x:1,y:0});
 assert.equal(hero.recall,0,'Movimentação não interrompeu o B');
 hero.x=1040;hero.y=900;
 assert.ok(E.recall(),'Recall não pode ser reiniciado');
 E.damage(hero,4,enemy);
 assert.equal(hero.recall,0,'Dano recebido não interrompeu o B');
}
// Regressão: recall negativo (truthy) bloqueava para sempre a movimentação.
E.start('lyria');
const recalled=state.hero;recalled.x=1040;recalled.y=900;
assert.equal(E.RECALL_CHANNEL_SECONDS,6,'Retorno B deve canalizar por seis segundos');
assert.equal(E.recall(),true);
for(let i=0;i<100;i++)E.step(.05,{x:0,y:0});
assert.ok(recalled.recall>0,'O retorno terminou antes dos seis segundos');
for(let i=0;i<25;i++)E.step(.05,{x:0,y:0});
assert.equal(recalled.recall,0,'O retorno deixou um tempo negativo ativo');
assert.ok(distance(recalled,E.HOME[0])<95,'Retorno para o ponto da fonte');
const beforeWalk={x:recalled.x,y:recalled.y};
for(let i=0;i<42;i++)E.step(.05,{x:1,y:0});
assert.ok(distance(recalled,beforeWalk)>95,'Jogador permanece preso após retornar');
assert.ok(recalled.cameraSnapAt>0,'Câmera não recentra após retorno');
assert.ok(view.includes('cameraPeek')&&view.includes("mm.addEventListener('pointermove',minimapMove)"),
 'Minimapa não permite visualizar ao tocar/arrastar');
assert.ok(view.includes('wardPoint(wardAim)')&&view.includes('wardStart')&&
 view.includes('wardEnd'),'Sentinela não permite segurar e posicionar');
assert.ok(css.includes('touch-action:none;user-select:none'),
 'Minimapa não libera arraste touch');

 // Controle de duas mãos: a arena antiga não pode roubar a captura
 // de pointers do modo Fenda. O botão AA repete em todo frame.
assert.ok(html.includes("if(stage.classList.contains('fenda-on'))return;")&&
 html.includes('stage.addEventListener(\'pointerdown\'')&&
 html.includes('function beginFireTouch(e,captureElement)')&&
 html.includes('function beginSkillTouch(e,index)'),
 'Toques da Fenda ainda são capturados pelos controles da primeira arena');
assert.ok(view.includes('if(pointers.aa!==null&&S.hero?.hp>0&&!S.shopOpen&&!aaAim?.dragged&&')&&
 view.includes('performance.now()-(aaAim?.started||0)>115')&&
 view.includes('if(pointers.aa!==e.pointerId)return;')&&
 view.includes('if(joy.ptr!==e.pointerId)return;')&&
 view.includes('joy.ptr=e.pointerId')&&
 view.includes('pointers.aa=e.pointerId'),
 'Joystick e AA devem manter pointers independentes e permitir ataque contínuo');

// 5.4: placa de mana no mundo, K/D/A e farm sempre visiveis.
assert.ok(view.includes('function manaBar(x,y,r,mana,max,width=55)')&&
 view.includes('manaBar(x,y,barRadius,u.mana,E.maxMana(u),44)'),
 'A mana deve ser desenhada abaixo da barra de vida de cada campeao');
assert.ok(view.includes("$('fendaPlayerStats').textContent='K/D/A '")&&
 view.includes("+' · FARM '+h.cs"),
 'K/D/A e farm devem ficar permanentemente visiveis na HUD');
assert.ok(view.includes('function scoreTeam(side)')&&
 view.includes('scoreboardItems(u)')&&
 view.includes('function renderScoreboard()'),
 'Placar detalhado deve listar ambos os times com os itens');
assert.ok(view.includes('fendaScoreboardTeams')&&
 view.includes('scoreRoles={top:')&&
 view.includes("scoreboardVisible"),
 'Placar de TAB precisa mostrar cinco funcoes e equipes');
assert.ok(view.includes("if(k==='tab')")&&
 view.includes('setScoreboardVisible(true,true)')&&
 view.includes("if(k==='f2')"),
 'TAB abre o placar no PC, F2 alterna o controle');
assert.ok(view.includes("$('fendaScoreBtn').addEventListener('click'")&&
 view.includes("$('fendaScoreClose').addEventListener('click'"),
 'Placar deve abrir e fechar por toque no celular');
assert.ok(css.includes('#fendaScoreboard{')&&
 css.includes('.fenda-scoreboard-teams')&&
 css.includes('.fenda-scoreboard-player.is-self'),
 'Placar necessita layout responsivo e destaque do jogador');
E.start('lyria');
const scoreboardBlue=state.units.filter(u=>u.kind==='hero'&&u.side===0);
const scoreboardRed=state.units.filter(u=>u.kind==='hero'&&u.side===1);
assert.equal(scoreboardBlue.length,5,'Placar azul deve ter cinco campeoes');
assert.equal(scoreboardRed.length,5,'Placar rubro deve ter cinco campeoes');
const killer=scoreboardBlue[0],helper=scoreboardBlue[1],victim=scoreboardRed[0];
victim.hp=victim.maxHp;
const originalGold=helper.gold;
E.damage(victim,17,helper);
assert.equal(victim.hp,victim.maxHp-17,'Dano do participante precisa ser contabilizado');
E.damage(victim,victim.maxHp*2,killer);
assert.equal(killer.kills,1,'O ultimo golpe deve contabilizar o abate');
assert.equal(helper.assists,1,'O participante deve receber assistencia');
assert.ok(helper.gold>originalGold,'Participante recebe o bonus de assistencia');
assert.equal(state.kills[0],1,'Placar dos times deve refletir a eliminacao');
E.start('lyria');
const only=state.hero,enemy=state.units.find(u=>u.kind==='hero'&&u.side===1);
E.damage(enemy,enemy.maxHp*2,only);
assert.equal(only.kills,1,'Abate sem outro participante');
assert.equal(only.assists,0,'Nao se recebe assistencia em propria eliminacao');
assert.equal(enemy.deaths,1,'Morte aparece no placar adversario');
// O HTML real do TAB gera dez linhas e seis slots de itens por campeao.
E.start('lyria');
const scoreCode=view.slice(view.indexOf('const scoreRoles='),view.indexOf('function shopRender()'));
assert.ok(scoreCode.length>300,'Fonte de placar nao encontrada');
const portraitCode=view.slice(view.indexOf('function championPortrait('),view.indexOf('function desktopHeroUpdate('));
const scoreApi=new Function('E','C','S',portraitCode+scoreCode+'return {scoreTeam};')(E,{heroes},state);
const blueHTML=scoreApi.scoreTeam(0),redHTML=scoreApi.scoreTeam(1);
assert.equal((blueHTML.match(/class="fenda-scoreboard-player/g)||[]).length,5);
assert.equal((redHTML.match(/class="fenda-scoreboard-player/g)||[]).length,5);
assert.ok(blueHTML.includes('LYRIA')&&redHTML.includes('TESSA')&&redHTML.includes('SAHRA')&&redHTML.includes('MIRIELLE'),
 'Campeoes dos dois times precisam aparecer no placar');
const self=state.hero;self.kills=4;self.deaths=2;self.assists=6;self.cs=34;
self.items.push('lens');
const populated=scoreApi.scoreTeam(0);
assert.ok(populated.includes('4/2/6')&&populated.includes('34 <small>CS</small>')&&
 populated.includes('Lente Astral'),'KDA, farm e itens devem atualizar juntos');
// Assists nao desaparecem quando o colaborador morre antes do golpe final.
E.start('lyria');
const deadAssist=state.units.find(u=>u.kind==='hero'&&u.side===0&&!u.controlled);
const deadKiller=state.hero,deadEnemy=state.units.find(u=>u.kind==='hero'&&u.side===1);
E.damage(deadEnemy,24,deadAssist);
deadAssist.hp=0;E.damage(deadEnemy,deadEnemy.maxHp*2,deadKiller);
assert.equal(deadAssist.assists,1,'Participante eliminado tambem recebe assistencia');
// Contexto neutro e composição completa: avaliar engage.
E.start('lyria');
const allies=state.units.filter(u=>u.kind==='hero'&&u.side===0);
const enemies=state.units.filter(u=>u.kind==='hero'&&u.side===1);
const center={x:1200,y:1110}; // Trecho neutro da nova rota, fora do raio das torres rubras.
for(let i=0;i<allies.length;i++){
 const u=allies[i];u.x=center.x-100+(i%2)*40;u.y=center.y+i*16;u.level=8;u.hp=u.maxHp;
}
for(let i=0;i<enemies.length;i++){
 const u=enemies[i];u.x=center.x+85+(i%2)*35;u.y=center.y+i*19;u.level=8;u.hp=u.maxHp;
}
state.time=150;
E.refreshVision(true);AI.reset();AI.scan();
assert.equal(state.teamAI[0]?.mode,'engage','Não inicia luta vantajosa');
assert.ok(state.teamAI[0].synergy>1,'Sinergia de composição não considerada');
// Sem HP, deve ordenar recuo antes do all-in.
for(const u of allies)u.hp=u.maxHp*.14;
state.time+=1;E.refreshVision(true);AI.scan();
assert.equal(state.teamAI[0]?.mode,'retreat','Não recua com time enfraquecido');
// Simulação longa: nenhuma entidade pode sair do mundo ou ganhar coordenada NaN.
E.start('lyria');
for(let i=0;i<1000;i++)E.step(.05,{x:0,y:0});
assert.ok(state.wave>=3,'Ondas não estão surgindo');
assert.ok(state.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.y)&&
 u.x>=0&&u.x<=E.W&&u.y>=0&&u.y<=E.H),'Unidade em coordenada inválida');
// Verifica a formação após surgirem várias ondas, sem unidades atravessando umas às outras.
let overlaps=0,invalid=0;
for(let j=0;j<1000;j++){
 E.step(.05,{x:0,y:0});
 if(j%20)continue;
 const units=state.units.filter(u=>u.kind==='minion'&&u.hp>0);
 for(let k=0;k<units.length;k++){
  const u=units[k];
  const pos=E.routeProjection(u.lane,u);
  if(!Number.isFinite(pos.progress)||!Number.isFinite(pos.distance))invalid++;
  for(let l=k+1;l<units.length;l++){
   const v=units[l];
   if(u.side===v.side&&u.lane===v.lane&&distance(u,v)<u.r+v.r-4)overlaps++;
  }
 }
}
assert.equal(invalid,0,'Erro de posição projetada em uma rota.');
assert.ok(overlaps<=3,'Ondas de tropas estão se sobrepondo excessivamente.');
// Pressionar ataque e mover o joystick ao mesmo tempo é comportamento-base.
// O input da mão esquerda não cancela o ataque da direita.
E.start('lyria');
{
 const h=state.hero,enemy=state.units.find(u=>u.kind==='hero'&&u.side===1);
 state.units=[h,enemy];state.structures=[];state.walls=[];
 state.camps=[];state.obstacles=[];state.nextWave=999;
 h.x=1300;h.y=1600;enemy.x=1420;enemy.y=1600;
 enemy.stun=8;
 E.refreshVision(true);
 const origin={x:h.x,y:h.y},hp=enemy.hp;
 let successful=0;
 for(let i=0;i<50;i++){
  E.step(.05,{x:0,y:-1});
  if(E.autoAttack(h))successful++;
 }
 assert.ok(distance(h,origin)>150,'AA bloqueou o movimento contínuo do joystick');
 assert.ok(successful>=1&&enemy.hp<hp,
  'Movimentar-se cancelou o ataque básico');
}
// Os nove bots devem sair da base e executar rota/combate sem congelar.
E.start('lyria');
{
 const bots=state.units.filter(u=>u.kind==='hero'&&!u.controlled);
 const origin=new Map(bots.map(u=>[u.uid,{x:u.x,y:u.y}]));
 const maxMoved=new Map(bots.map(u=>[u.uid,0]));
 for(let i=0;i<1200;i++){
  E.step(.05,{x:0,y:0});
  if(i%10===0)for(const bot of bots)
   maxMoved.set(bot.uid,Math.max(maxMoved.get(bot.uid),distance(bot,origin.get(bot.uid))));
 }
 assert.ok(bots.filter(bot=>maxMoved.get(bot.uid)>350).length>=8,
  'Bots ficaram parados por um minuto após a mudança na IA');
}

// Fenda 8.6 — loja visual em guias, catálogo, árvore e painel.
{
 const view=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(view.includes('fenda-shop-layout')&&view.includes('fendaShopDetails')&&
   view.includes('fendaShopTabs')&&view.includes('fendaShopCategories'),
   'A loja precisa de catálogo e detalhes separados');
 assert.ok(view.includes("['recommended','★ SUGERIDOS']")&&
   view.includes("['all','TODOS']")&&view.includes("['parts','COMPONENTES']"),
   'Faltam as guias da loja MOBA');
 assert.ok(view.includes('fenda-shop-recipe-branches')&&
   view.includes('data-shop-part')&&view.includes('data-shop-sell')&&
   view.includes('fenda-shop-inventory'),
   'Receitas e inventário precisam ser clicáveis');
 assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))')&&
   css.includes('.fenda-item-icon')&&css.includes('.fenda-shop-detail-top')&&
   css.includes('.fenda-shop-buy-actions'),
   'A loja ainda usa cartões compridos sem ícones');
}

// Fenda 8.5 — equipamentos por receitas, evolução manual e multitouch.
{
 const components=E.ITEMS.filter(i=>i.tier===1);
 const completed=E.ITEMS.filter(i=>i.tier===2);
 assert.equal(components.length,9,'Loja agora tem nove pré-itens, incluindo botas');
 assert.equal(completed.length,25,'Loja agora tem dezessete itens completos');
 assert.ok(completed.every(i=>i.recipe.length>=3),'Itens completos exigem componentes reais');
 assert.ok(completed.every(i=>i.recipe.reduce((v,id)=>v+E.ITEMS.find(p=>p.id===id).price,0)<i.price),
  'Custo de combinação deve ser adicional ao custo dos componentes');
 E.start('lyria');
 const hero=state.hero;hero.gold=7000;hero.x=E.HOME[0].x;hero.y=E.HOME[0].y;
 const initialGold=hero.gold,baseAD=hero.atk;
 assert.equal(E.buyItem('astralbow').ok,false,'Item completo não pode ser comprado sem componentes');
 for(const part of ['lens','lens','stride'])assert.ok(E.buyItem(part).ok,'Componente impossível de comprar');
 const recipe=E.recipeStatus(hero,'astralbow');
 assert.ok(recipe.ready&&recipe.remaining===550,'Dois componentes iguais precisam ser reconhecidos');
 const afterComponents=hero.gold;
 assert.equal(E.buyItem('astralbow').ok,true,'Receita completa não combina');
 assert.equal(afterComponents-hero.gold,550,'Compra cobrou novamente pelos componentes');
 assert.equal(hero.items.join(','),'astralbow','Combinação não devolveu os espaços usados');
 assert.equal(initialGold-hero.gold,1440,'Preço total do item final mudou');
 assert.equal(E.itemStats(hero,'ad'),37,'Componentes continuam somando após combinação');
 assert.equal(E.attackDamage?.(hero)??baseAD+E.itemStats(hero,'ad'),baseAD+37);
 const hpBefore=hero.maxHp;
 for(const part of ['ward','ward','core'])assert.ok(E.buyItem(part).ok);
 assert.ok(E.buyItem('bulwark').ok,'Segunda receita precisa ser independente');
 assert.equal(hero.maxHp,hpBefore+310,'Combinação deve atualizar a vida máxima sem somar dupla');
 assert.equal(hero.items.length,2);
 const duplicate=E.buyItem('bulwark');
 assert.equal(duplicate.ok,false,'Um item completo único não pode equipar duas vezes');
 const at=hero.items.indexOf('bulwark'),wallet=hero.gold;
 assert.ok(E.sellItem(at).ok,'Venda na base não funciona');
 assert.equal(hero.maxHp,hpBefore,'Venda não restaurou status de vida');
 assert.ok(hero.gold>wallet,'Venda não devolveu ouro');
 hero.x=1500;hero.y=1200;
 assert.equal(E.buyItem('lens').ok,false,'Compra remota fora do santuário');
 hero.x=E.HOME[0].x;hero.y=E.HOME[0].y;
 assert.equal(E.skillRank(hero,'lyria_pierce'),0,'Nenhuma habilidade é atribuída automaticamente');
 assert.equal(hero.skillPoints,1,'O jogador começa com 1 ponto livre');
 assert.ok(E.upgradeSkill(hero,'lyria_pierce').ok,'Jogador deve poder escolher Q no nível 1');
 assert.equal(E.skillRank(hero,'lyria_pierce'),1,'Q aprendida deve ficar ativa');
 assert.equal(E.skillRank(hero,'lyria_ult'),0,'Ultimate não começa desbloqueada');
 hero.level=2;hero.skillPoints=1;
 assert.equal(E.skillRankCap(hero,'lyria_pierce'),2);
 assert.ok(E.upgradeSkill(hero,'lyria_pierce').ok,'Não é possível evoluir habilidade no nível 2');
 assert.equal(E.skillRank(hero,'lyria_pierce'),2);
 assert.equal(E.upgradeSkill(hero,'lyria_rain').ok,false,'Upgrade deve consumir pontos');
 hero.level=4;hero.skillPoints=1;
 assert.equal(E.upgradeSkill(hero,'lyria_ult').ok,false,'Ultimate não pode ser aprendida antes do nível 5');
 hero.level=5;
 assert.ok(E.upgradeSkill(hero,'lyria_ult').ok,'Ultimate não evoluiu ao nível 5');
 assert.equal(E.skillRank(hero,'lyria_ult'),1);
 assert.equal(E.skillRankCap(hero,'lyria_ult'),1);
 hero.level=9;hero.skillPoints=1;
 assert.ok(E.upgradeSkill(hero,'lyria_ult').ok,'Ultimate não recebeu segundo rank no nível 9');
 hero.level=13;hero.skillPoints=1;
 assert.ok(E.upgradeSkill(hero,'lyria_ult').ok,'Ultimate não recebeu terceiro rank no nível 13');
 const bot=state.units.find(u=>u.kind==='hero'&&!u.controlled);
 bot.level=10;bot.skillPoints=9;E.botUpgradeSkills(bot);
 assert.equal(bot.skillPoints,0,'Bots não distribuem pontos de habilidade');
 assert.ok(E.skillRank(bot,heroes[bot.id].ultimate)>=2,'Bots não priorizam ultimates');
 const beforeXP=hero.level;hero.level=1;hero.skillPoints=0;hero.xp=0;
 const unit=state.units.find(u=>u.kind==='hero'&&u.side===1);
 unit.hp=1;unit.x=hero.x+20;unit.y=hero.y;
 E.damage(unit,9999,hero);
 assert.ok(hero.level>beforeXP-13&&hero.skillPoints>0,
  'Ganhar XP no combate deve liberar ponto de habilidade');
}
// Interação: tocar na área enquanto o primeiro dedo caminha não altera o ponteiro de joy.
{
 const view=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(view.includes('function tapWhileWalking(clientX,clientY)')&&
  view.includes('if(e.pointerId!==joy.ptr)tapWhileWalking(e.clientX,e.clientY)'),
  'O segundo dedo deixou de selecionar alvos durante movimento');
 assert.ok(view.includes('function skillStart(e,index)')&&
  view.includes('pointers.aa=e.pointerId')&&
  view.includes('joy.ptr=e.pointerId')&&
  view.includes('pointers.skill={id,ptr:e.pointerId'),
  'AA, joystick e skill perderam ponteiros independentes');
 assert.ok(view.includes("rankBtn.addEventListener('pointerdown'")&&
  view.includes('E.upgradeSkill(S.hero,kit[i])')&&
  css.includes('.fenda-upgrade-button')&&
  css.includes('touch-action:none;pointer-events:auto'),
  'Evolução de habilidades não é acessível durante movimentação');
 assert.ok(view.includes("function shopRender()")&&
  view.includes('E.recipeStatus(h,selection.id)')&&
  view.includes('data-shop-buy')&&view.includes('data-shop-part')&&
  view.includes('shopHash')&&view.includes('shopLastPaint'),
  'Loja não mostra receitas ou destrói os botões a cada quadro');
 assert.ok(read('fenda-team-ai.js').includes('E.skillRank(h,id)>0'),
  'IA precisa verificar ranks reais antes de tentar usar as habilidades');
}

// Fenda 8.6: os tempos de combate respeitam a identidade das classes.
{
 const setupDamage=Object.keys(heroes),out={};
 for(const id of setupDamage){
  E.start(id);
  const h=state.hero,foe=state.units.find(u=>u.kind==='hero'&&u.side===1);
  state.units=[h,foe];state.structures=[];state.walls=[];
  state.obstacles=[];state.camps=[];state.nextWave=9999;
  h.x=1600;h.y=1250;
  foe.x=h.x+E.attackRange(h)-15;foe.y=h.y;foe.controlled=true;
  foe.stun=100;foe.id='orun';foe.hp=foe.maxHp=380;
  E.refreshVision(true);
  for(let i=0;i<90;i++){
   E.step(.05,{x:0,y:0});
   E.autoAttack(h);
  }
  out[id]={damage:380-foe.hp,range:E.attackRange(h)};
  assert.ok(out[id].damage>20&&out[id].damage<195,
   'Dano básico fora da escala do jogo: '+id);
 }
 assert.ok(out.lyria.damage>out.nyra.damage*1.35,
  'Atiradora precisa ter AA mais forte que a maga');
 assert.ok(out.vexor.damage>out.orun.damage*1.35,
  'Duelista precisa ter AA mais forte que o tanque');
 assert.ok(out.nyra.damage>out.seris.damage*1.3,
  'Suporte não pode superar a maga em dano sustentado');
 assert.ok(out.lyria.range>out.seris.range&&out.seris.range>out.vexor.range,
  'Distinção entre ranged, suporte e melee desapareceu');
 for(const id of ['lyria_pierce','nyra_bolt','seris_tether']){
  assert.ok(E.skillDef(id).range<E.TURRET_RANGE,
   'Habilidade básica alcança campeões debaixo de torre sem risco: '+id);
 }
 const view=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(view.includes('const ITEM_ART={')&&view.includes('fenda-item-art')&&
  view.includes('fenda-shop-slot-select')&&css.includes('.fenda-item-art'),
  'Ícones vetoriais ou inspeção de itens no inventário ausentes');
}

// Fenda 9.1 — progressão, feitiços e equilíbrio de esquadrões.
{
 const match=E.start('zhira',['smite','freecast']),hunter=match.hero;
 assert.equal(hunter.summoners.join(','),'smite,freecast','Escolha de feitiços não chegou à partida');
 assert.equal(E.skillRank(hunter,'zhira_strike'),0,'Nenhuma habilidade começa desbloqueada');
 assert.ok(E.upgradeSkill(hunter,'zhira_strike').ok,'Caçador escolhe a primeira habilidade');
 assert.equal(E.skillRank(hunter,'zhira_pounce'),0,'Segundo poder deve iniciar bloqueado');
 assert.equal(E.skillRank(hunter,'zhira_trap'),0,'Terceiro poder deve iniciar bloqueado');
 assert.equal(E.skillRank(hunter,'zhira_ult'),0,'Ultimate deve iniciar bloqueada');
 hunter.level=2;hunter.skillPoints=1;
 assert.ok(E.upgradeSkill(hunter,'zhira_pounce').ok,'Nível 2 deve permitir aprender W');
 hunter.mana=0;
 assert.ok(E.castSummoner(hunter,'freecast'),'Transe Arcano não foi ativado');
 assert.ok(E.cast(hunter,'zhira_strike',{x:1,y:0,distance:90}),
  'Transe Arcano deve permitir habilidade com zero mana');
 assert.equal(hunter.mana,0,'Mana não deve diminuir durante Transe Arcano');
 assert.ok(hunter.summonerCooldowns.freecast>0,
  'Transe Arcano precisa entrar em recarga após o uso');
 const camp=match.camps.find(c=>c.kind!=='boss'&&c.hp>350);
 assert.ok(camp,'Acampamento da selva indisponível no teste');
 camp.unlock=0;hunter.x=camp.x-40;hunter.y=camp.y;
 const previous=camp.hp;
 assert.ok(E.castSummoner(hunter,'smite',camp),'Selo da Caça não funciona contra monstros');
 assert.ok(camp.hp<previous,'Selo da Caça deve causar dano a monstros');
 const fighter=E.start('brax');
 assert.equal(fighter.units.filter(u=>u.kind==='hero').length,10,'Mais heróis alteraram 5v5');
 assert.ok(fighter.units.some(u=>u.id==='brax'&&u.side===0),
  'Lutador Brax não entra no próprio time');
 assert.ok(fighter.units.some(u=>u.id==='sahra'&&u.side===1),
  'Assassino inimigo deve aparecer como bot');
 assert.ok(fighter.units.some(u=>u.roleKey==='support'&&u.side===0),
  'Equipe do lutador deve manter um suporte de função adequada');
}

// V9.2 — teste do elenco expandido, controle automático e itens.
{
 for(const id of ['kaelis','rokar','tessa']){
  const game=E.start(id),self=game.hero,h=heroes[id];
  assert.equal(self.id,id,'Campeão não foi selecionado: '+id);
  assert.equal(game.units.filter(u=>u.kind==='hero'&&u.side===0).length,5);
  assert.equal(game.units.filter(u=>u.kind==='hero'&&u.side===1).length,5);
  assert.ok(h.skills.every(s=>skills[s])&&skills[h.ultimate], 'Kit incompleto: '+id);
  assert.ok(h.skills.every(s=>E.skillRank(self,s)===0));
  assert.equal(self.skillPoints,1);
  assert.ok(E.upgradeSkill(self,h.skills[0]).ok);
  assert.equal(E.skillRank(self,h.skills[0]),1);
  self.level=5;self.skillPoints=3;
  for(const s of [...h.skills.slice(1),h.ultimate])
   assert.ok(E.upgradeSkill(self,s).ok,'Não aprende: '+s);
  for(const s of [...h.skills,h.ultimate]){
   const def=E.skillDef(s);
   self.cooldowns[s]=0;self.mana=E.maxMana(self);
   assert.ok(E.cast(self,s,{x:1,y:0,distance:Math.min(100,def.range||80)}),
    'Habilidade não dispara: '+s);
   self.casting=null;self.dash=null;
  }
 }
 const game=E.start('tessa'),self=game.hero;
 const foe=game.units.find(u=>u.kind==='hero'&&u.side===1);
 game.units=[self,foe];game.structures=[];game.walls=[];game.camps=[];
 self.x=1300;self.y=1600;foe.x=1420;foe.y=1600;foe.stun=20;
 self.attackCd=0;self.recall=0;self.casting=null;self.dash=null;
 const hp=foe.hp;
 for(let k=0;k<60;k++)E.step(.05,{x:0,y:0});
 assert.ok(foe.hp<hp,'O AA automático não atingiu inimigo com jogador parado');
 self.attackCd=0;self.attackPending=null;game.projectiles=[];foe.hp=foe.maxHp;
 E.step(.05,{x:1,y:0});
 assert.equal(self.attackCd,0,'O AA automático não deve iniciar quando o jogador anda');
 assert.ok(['fang','sprout','phantomfang','glacier','lifebloom','barrage']
  .every(id=>E.ITEMS.some(it=>it.id===id)),'Os seis novos equipamentos devem existir');
 const view=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(view.includes('mouseFollow.moved=true')&&view.includes('clickDestination=null;')&&
  view.includes('mouseFollow={ptr:e.pointerId'),'Clique segurado não segue o ponteiro');
 assert.ok(view.includes("<em>'+sp.desc+'</em></button>'")&&css.includes('.fenda-summoner-picker button em'),
  'Explicações dos feitiços não estão visíveis na seleção');
}
// V9.3 — HUD desktop não pode misturar controles mobile com quadro de campeão.
{
 const view=read('fenda-view.js'),css=read('fenda.css'),html=read('index.html');
 assert.ok(view.includes("desktopBar.id='fendaDesktopBar'")&&
  view.includes("teamRoster.id='fendaTeamRoster'"),'Barra de campeão ou quadro de equipes ausente');
 assert.ok(css.includes('.stage.fenda-on .mobile-controls{display:none!important')&&
  css.includes('.stage.fenda-on #fendaSummoners,')&&
  css.includes('.stage.fenda-on #fendaWardBtn,'),
  'Controles do celular precisam desaparecer completamente no PC');
 assert.ok(view.includes("id=\"pcPortrait\"")&&view.includes("id=\"pcItems\"")&&
  view.includes("id=\"pcHPFill\"")&&view.includes("id=\"pcManaFill\""),
  'Barra de campeão precisa mostrar retrato, itens, vida e mana');
 assert.ok(view.includes("data-pc-skill")&&
  view.includes("btn.addEventListener('pointerdown',e=>skillStart(e,i))")&&
  view.includes("data-pc-spell")&&view.includes("useSummoner(Number(btn.dataset.pcSpell))"),
  'Habilidades e feitiços da barra devem ser acionáveis');
 assert.ok(view.includes("$('pcWard').addEventListener('click',()=>deployWard());"),
  'Botão de visão precisa receber clique sem repassar o evento como coordenada');
 assert.ok(view.includes('desktopRosterUpdate()')&&
  view.includes('SEM VISÃO')&&view.includes('scoreOrder'),
  'Quadro deve mostrar os dez heróis sem revelar HP de inimigos ocultos');
 assert.ok(view.includes("isDesktop?$('pcSkill'+i):b")&&
  css.includes('#fendaTeamRoster.collapsed .pc-roster-list'),
  'Evolução de habilidades e recolhimento do quadro não foram adaptados');
 assert.ok(html.includes('fenda-view.js?v=11.0')&&html.includes('fenda.css?v=10.2'),
  'Cache precisa trazer a versão 9.7');
}
// V9.4 — novas prioridades de AA, tempo de ataque, decisões dos bots e retratos.
{
 const match=E.start('lyria'),player=match.hero,foe=match.units.find(u=>u.side===1&&u.kind==='hero');
 player.x=1400;player.y=1300;foe.x=player.x+E.attackRange(player)-8;foe.y=player.y;
 foe.stun=20;
 const lastHit={uid:15007,kind:'minion',id:'guard',side:1,lane:2,hp:8,maxHp:100,
  x:player.x+49,y:player.y+7,r:13,atk:14,death:0,stun:0,slow:0,shield:0,invuln:0,attackCd:2};
 const healthy={...lastHit,uid:15008,hp:120,maxHp:120,x:player.x+42,y:player.y-8};
 match.units=[player,foe,lastHit,healthy];match.camps=[];match.structures=[];
 E.refreshVision(true);
 assert.equal(E.findAA(player),foe,'AA parado deve priorizar campeão inimigo visível');
 foe.x+=550;E.refreshVision(true);
 assert.equal(E.findAA(player),lastHit,'AA deve priorizar último golpe quando não houver campeão');
 player.passiveAttacks=2;
 assert.ok(E.autoAttack(player),'AA básico não iniciou com tropas no alcance');
 assert.ok(player.attackPending?.empowered,'Terceiro AA precisa registrar passiva no próprio disparo');
 assert.ok(player.attackWindup>=.09&&player.attackWindup<=.32,
  'Tempo de preparação de ataque saiu dos limites');
 assert.ok(player.attackCd>player.attackWindup,'Ataque deve permitir reposicionar após preparar o disparo');
 const power=AI.strength(player);
 player.items.push('bulwark');
 assert.ok(AI.strength(player)>power,'IA precisa considerar itens completos na força do campeão');
 const evasive=E.start('lyria');
 const bot=evasive.units.find(u=>u.side===0&&u.kind==='hero'&&!u.controlled);
 bot.x=1500;bot.y=1340;
 evasive.projectiles=[{kind:'damagearea',side:1,tx:bot.x,ty:bot.y,aoe:105,life:1}];
 assert.ok(AI.dodgeTelegraph(bot,.05),'Bot não reage a ataque de área sinalizado');
 assert.equal(bot.dodgeAt,evasive.time,'Bot não registrou momento da esquiva');
 const jungleMatch=E.start('lyria'),jungler=jungleMatch.units.find(u=>u.jungler&&u.side===0);
 const ally=jungleMatch.hero,enemy=jungleMatch.units.find(u=>u.side===1&&u.kind==='hero');
 assert.ok(jungler,'Caçador automático não encontrado');
 jungler.x=1320;jungler.y=1350;jungler.level=3;jungler.nextGankScan=0;
 ally.x=1430;ally.y=1355;enemy.x=1490;enemy.y=1350;
 enemy.hp=Math.round(enemy.maxHp*.68);
 jungleMatch.time=38;jungleMatch.structures=[];
 E.refreshVision(true);
 assert.ok(E.botTryGank(jungler,.05),'Bot caçador não tenta emboscada com apoio aliado');
 assert.equal(jungler.gankTargetUid,enemy.uid,'Caçador não marcou o alvo da emboscada');
 const phases=E.start('lyria');
 assert.equal(phases.phase,'laning','Jogo deve começar pela fase de rotas');
 phases.time=154.99;E.step(.05,{x:0,y:0});
 assert.equal(phases.phase,'objectives','Transição para disputa de objetivos ausente');
 phases.time=479.99;E.step(.05,{x:0,y:0});
 assert.equal(phases.phase,'siege','Cerco final não foi ativado');
 const view=read('fenda-view.js'),css=read('fenda.css'),ai=read('fenda-team-ai.js');
 assert.ok(view.includes('function championPortrait(id)')&&
  view.includes('championPortrait(u.id)')&&css.includes('.fenda-champion-portrait-svg'),
  'Retratos próprios dos campeões não estão completos na interface');
 assert.ok(view.includes("id==='lyria'||id==='tessa'")&&
  view.includes('if(p.empowered)')&&view.includes('attackLaunch'),
  'Projéteis temáticos e efeitos de preparação não foram aplicados');
 assert.ok(ai.includes('dodgeTelegraph(u,dt)')&&ai.includes('E.attackRange(a)'),
  'IA não considera telegráficos e alcance no foco de equipe');
}
// V9.5 — habilidades do PC seguem mouse, nunca nearestEnemy, câmera e HUD do celular.
{
 const view=read('fenda-view.js'),site=read('index.html');
 const match=E.start('tessa',['ignite','flash']),self=match.hero;
 const rival=match.units.find(u=>u.side===1&&u.kind==='hero');
 match.units=[self,rival];match.structures=[];match.walls=[];match.obstacles=[];match.camps=[];
 self.x=1400;self.y=1200;rival.x=1310;rival.y=1200;
 E.refreshVision(true);
 match.camera.x=1000;match.camera.y=1080;
 const mouseBlock=view.slice(view.indexOf('function desktopMouseWorld()'),view.indexOf('function aimData(p)'));
 assert.ok(mouseBlock.includes('function desktopMouseAim(id)'), 'Mira do mouse não foi implementada');
 const pointer={over:true,x:530,y:120,lastWorld:null};
 const mouse=new Function('E','S','desktopPointer','cameraZoom','clamp',
  mouseBlock+'return {desktopMouseAim,desktopMouseWorld};')(E,match,pointer,1,E.clamp);
 const aim=mouse.desktopMouseAim('tessa_shot');
 assert.ok(aim.x>.99&&Math.abs(aim.y)<.01,'Mouse à direita deve mirar à direita');
 assert.ok(E.upgradeSkill(self,'tessa_shot').ok,'Teste de mira aprende Q no nível 1');
 assert.ok(E.cast(self,'tessa_shot',aim),'Habilidade apontada ao mouse foi recusada');
 assert.ok(self.casting&&self.casting.dir.x>.99,
  'Habilidade perseguiu inimigo à esquerda em vez de seguir o mouse à direita');
 assert.ok(view.includes("const aim=desktopCamera()&&def.aim!=='self'?desktopMouseAim(id):null;")&&
  view.includes("if(!E.cast(S.hero,id,aim))"),
  'Teclas Q/W/E/R não passam a mira do mouse ao motor');
 assert.ok(view.includes("if(desktopCamera()&&e.pointerType==='mouse')"),
  'Clicar nos poderes da barra do PC também precisa seguir a mira');
 assert.equal(E.castSummoner(self,'ignite',null,{manual:true}),false,
  'Feitiço direcionado não pode selecionar automaticamente inimigos próximos');
 assert.equal(E.castSummoner(self,'ignite',rival,{manual:true}),true,
  'Feitiço manual tem que acertar campeão apontado dentro do alcance');
 assert.ok(view.includes("aim={manual:true}")&&view.includes("desktopMouseWorld()"),
  'Feitiços de alvo do PC não estão ligados à posição do ponteiro');
 const centerBlock=view.slice(view.indexOf('const cameraClampX='),view.indexOf('function syncCameraControl()'));
 const cam=new Function('E','S','worldVW','worldVH','clamp',
  centerBlock+'return {cameraCenterAt};')(E,match,800,600,E.clamp);
 cam.cameraCenterAt(1400,1200);
 assert.equal(match.camera.x,1000,'Câmera travada não centraliza o jogador no eixo X');
 assert.equal(match.camera.y,900,'Câmera travada não centraliza o jogador no eixo Y');
 assert.ok(view.includes("cameraMode==='locked'||spaceCenterHeld")&&
  view.includes("panFreeCamera(dt)")&&view.includes("setCameraMode(cameraMode==='free'?'locked':'free')"),
  'Câmera não possui os dois modos e alternância pela tecla Y');
 assert.ok(view.includes("cameraDrag={ptr:e.pointerId")&&view.includes('cameraPeek.permanent'),
  'Câmera livre precisa aceitar arrastar pelo mouse e minimizar sem recenter');
 assert.ok(view.includes("if(key===' ')spaceCenterHeld=false;"),
  'Câmera do PC deve voltar ao modo livre quando soltar Espaço');
 assert.ok(!view.includes("id='fendaMobileHelpBtn'")&&
  !view.includes('mobileHelpBtn')&&!view.includes('mobileGuideUpdate()'),
  'O botão de interrogação deve ser removido completamente da partida');
 assert.ok(view.includes('class="spell-effect"'),
  'As informações de feitiço continuam na seleção e nos botões acessíveis');
 assert.ok(site.includes('.stage.fenda-on #fendaSummoners .fenda-summoner small{')&&
  site.includes('font-size:10px!important')&&site.includes('#fendaMobileGuide'),
  'CSS do celular não tornou feitiços e habilidades legíveis');
 assert.ok(site.includes('fenda-view.js?v=11.0')&&site.includes('fenda.css?v=10.2'),
  'O cache do jogo precisa apontar para a versão 9.5');
}
console.log('OK: V9.5 — mira segue mouse, dois modos de câmera, minimapa livre e feitiços legíveis.');

// V9.6 — assassinas de sombra/ilusão e ADCs que não compartilham a mesma jogabilidade.
{
 assert.equal(Object.keys(heroes).length,18,'Sahra e Mirielle devem ampliar o elenco');
 for(const id of ['sahra','mirielle','lyria','tessa']){
  const m=E.start(id),h=m.hero,kit=heroes[id];
  assert.equal(m.units.filter(u=>u.kind==='hero'&&u.side===0).length,5);
  assert.equal(m.units.filter(u=>u.kind==='hero'&&u.side===1).length,5);
  assert.ok(kit.skills.every(s=>E.skillRank(h,s)===0)&&E.skillRank(h,kit.ultimate)===0,
   'Nenhuma habilidade deve estar aprendida ao nascer: '+id);
  assert.equal(h.skillPoints,1,'Jogador precisa começar com 1 ponto disponível: '+id);
  assert.ok(E.upgradeSkill(h,kit.skills[0]).ok,'Q deve poder ser escolhida no nível 1: '+id);
  h.level=5;h.skillPoints=3;
  for(const skill of [...kit.skills.slice(1),kit.ultimate]){
   assert.ok(E.upgradeSkill(h,skill).ok,'Poder não foi aprendido: '+skill);
  }
 }
 function duel(id){
  const m=E.start(id),h=m.hero,e=m.units.find(u=>u.kind==='hero'&&u.side===1);
  m.units=[h,e];m.structures=[];m.walls=[];m.obstacles=[];m.camps=[];m.nextWave=99999;
  h.x=1700;h.y=1400;e.x=1780;e.y=1400;e.hp=e.maxHp=850;e.stun=30;
  E.refreshVision(true);return {m,h,e};
 }
 {
  const {m,h,e}=duel('sahra');
  h.level=6;h.skillLevels.sahra_shroud=1;h.skillLevels.sahra_flip=1;
  h.skillLevels.sahra_ult=1;
  assert.ok(E.cast(h,'sahra_shroud'),'Fumaça não ativa');
  assert.ok(m.zones.some(z=>z.kind==='shroud'&&z.until>m.time),
   'Fumaça não permanece como área real no mapa');
  assert.equal(E.visibleTo(1,h),false,'Fumaça precisa esconder Sahra dos inimigos');
  E.step(.05,{x:0,y:0});
  assert.ok(m.zones.some(z=>z.kind==='shroud'),
   'Zona de fumaça desaparece no primeiro quadro');
  assert.ok(E.cast(h,'sahra_ult',{x:1,y:0,distance:180}),
   'Primeira investida da ultimate não dispara');
  for(let i=0;i<7;i++)E.step(.05,{x:0,y:0});
  assert.ok(h.cooldowns.sahra_ult>0,'Ultimate deveria entrar em cooldown após primeira fase');
  assert.ok(E.cast(h,'sahra_ult',{x:1,y:0,distance:180}),
   'Segunda investida precisa funcionar mesmo com cooldown ativo');
  assert.ok(h.dash?.stage2,'A segunda investida deve ter efeito de execução próprio');
 }
 {
  const {m,h,e}=duel('mirielle');
  h.level=6;h.skillLevels.mirielle_sigil=1;h.skillLevels.mirielle_distort=1;
  h.skillLevels.mirielle_chain=1;h.skillLevels.mirielle_ult=1;
  const startX=h.x,startY=h.y;
  assert.ok(E.cast(h,'mirielle_distort',{x:1,y:0,distance:155}),
   'Avanço ilusório não funciona');
  for(let i=0;i<8;i++)E.step(.05,{x:0,y:0});
  assert.ok(h.x>startX+70,'Avanço não deslocou Mirielle');
  assert.ok(E.cast(h,'mirielle_distort',{x:1,y:0,distance:80}),
   'Reativar W precisa retornar mesmo com a habilidade em cooldown');
  assert.ok(Math.hypot(h.x-startX,h.y-startY)<8,'Retorno não recupera o ponto original');
  h.mana=E.maxMana(h);
  assert.ok(E.cast(h,'mirielle_sigil',{x:1,y:0,distance:180}));
  for(let i=0;i<10;i++)E.step(.05,{x:0,y:0});
  assert.ok(e.mirrorMarkUntil>m.time,'Selo não marca inimigo');
  assert.ok(E.cast(h,'mirielle_chain',{x:1,y:0,distance:180}));
  for(let i=0;i<10;i++)E.step(.05,{x:0,y:0});
  assert.equal(e.mirrorMarkUntil,0,'Corrente deve detonar o selo da ilusão');
  assert.ok(e.tetherUntil>m.time,'Corrente deve prender o adversário após atraso');
  h.mana=E.maxMana(h);
  assert.ok(E.cast(h,'mirielle_ult',{x:1,y:0,distance:150}));
  for(let i=0;i<7;i++)E.step(.05,{x:0,y:0});
  assert.ok(h.mirrorEchoUntil>m.time,'Ultimate não projetou o reflexo da habilidade');
 }
 {
  const {m,h,e}=duel('lyria');
  h.windStacks=0;h.windUntil=0;
  const cds=[];
  for(let i=0;i<4;i++){
   h.attackCd=0;h.attackPending=null;
   assert.ok(E.autoAttack(h),'AA de Lyria não disparou');
   cds.push(h.attackCd);
  }
  assert.equal(h.windStacks,4,'Lyria precisa acumular exatamente quatro cargas');
  assert.ok(cds[3]<cds[0]*.85,'Ímpeto não aumenta velocidade de ataques consecutivos');
  h.skillLevels.lyria_rain=1;h.mana=E.maxMana(h);
  assert.ok(E.cast(h,'lyria_rain',{x:1,y:0,distance:80}));
  for(let i=0;i<5;i++)E.step(.05,{x:0,y:0}); // prepara a cortina
  assert.ok(m.zones.some(z=>z.kind==='arrowstorm'),
   'Cortina da Lyria deve ser persistente, não uma explosão genérica');
  const hp=e.hp;
  for(let i=0;i<20;i++)E.step(.05,{x:0,y:0});
  assert.ok(e.hp<hp,'Cortina não causou dano ao longo do tempo');
 }
 {
  const {m,h,e}=duel('tessa');
  const normal=E.attackRange(h);
  h.stillSince=m.time-1.2;
  assert.ok(E.attackRange(h)>=normal+40,'Mira firme de Tessa não estende alcance');
  h.skillLevels.tessa_roll=1;h.skillLevels.tessa_salvo=1;
  assert.ok(E.cast(h,'tessa_roll',{x:1,y:0,distance:110}));
  assert.ok(h.loadedRoundUntil>m.time,'Rolamento não carregou munição penetrante');
  for(let i=0;i<8;i++)E.step(.05,{x:0,y:0});
  h.mana=E.maxMana(h);
  assert.ok(E.cast(h,'tessa_salvo',{x:1,y:0,distance:30}));
  for(let i=0;i<3;i++)E.step(.05,{x:0,y:0}); // arma a armadilha
  assert.ok(m.zones.some(z=>z.kind==='trap'),'Tessa deve instalar armadilha, não rajada');
  const hp=e.hp;
  for(let i=0;i<10;i++)E.step(.05,{x:0,y:0});
  assert.ok(e.hp<hp,'Armadilha de Tessa não causou dano quando inimigo entrou');
 }
 const view=read('fenda-view.js'),source=read('index.html');
 assert.ok(view.includes("u.id==='sahra'")&&view.includes("u.id==='mirielle'")&&
  view.includes("z.kind==='shroud'")&&view.includes("z.kind==='trap'"),
  'Desenhos e efeitos visuais dos assassinos não foram implementados');
 assert.ok(view.includes("id==='sahra_ult'&&h.sahraSecondUntil>S.time")&&
  view.includes("id==='mirielle_distort'&&h.mirrorReturn?.until>S.time"),
  'As habilidades reativáveis precisam estar habilitadas no painel');
 assert.ok(source.includes('fenda-engine.js?v=11.0')&&source.includes('fenda-view.js?v=11.0'),
  'Cache de versão deve usar os novos campeões');
}
console.log('OK: V9.6 com duas assassinas, fumaça, retorno, execução, combos e ADCs distintos.');

// V9.6 — flechas atravessam mais de uma unidade em linha aberta;
// se um muro bloquear, o mesmo motor interrompe o projétil.
{
 for(const id of ['lyria','tessa']){
  const m=E.start(id),h=m.hero;
  h.x=1500;h.y=1250;h.attackCd=100;
  m.structures=[];m.walls=[];m.obstacles=[];m.camps=[];m.nextWave=99999;
  const dummy=(uid,dx)=>({uid,kind:'minion',id:'guard',side:1,lane:1,
   x:h.x+dx,y:h.y,r:13,hp:400,maxHp:400,atk:0,speed:0,
   attackCd:20,stun:40,slow:0,shield:0,guard:0,invuln:0,
   attackAnim:0,death:0,lastDamage:-1});
  const a=dummy(9901,120),b=dummy(9902,205);
  m.units=[h,a,b];E.refreshVision(true);
  const key=id==='lyria'?'lyria_pierce':'tessa_shot';
  assert.ok(E.upgradeSkill(h,key).ok,'Primeira habilidade deve ser escolhida antes do disparo');
  assert.ok(E.cast(h,key,{x:1,y:0,distance:315}),'Q não disparou '+id);
  for(let k=0;k<20;k++)E.step(.05,{x:0,y:0});
  assert.ok(a.hp<400&&b.hp<400&&b.hp>a.hp,
   'Tiro perfurante deve acertar os dois alvos e perder dano após o primeiro: '+id);
 }
 const m=E.start('mirielle');
 const bot=m.units.find(u=>u.side===0&&!u.controlled),enemy=m.units.find(u=>u.side===1);
 bot.x=1500;bot.y=1350;enemy.x=1750;enemy.y=1350;
 m.zones=[{kind:'arrowstorm',x:bot.x,y:bot.y,r:100,source:enemy,side:1,until:m.time+3}];
 assert.ok(AI.dodgeTelegraph(bot,.05),'Bots precisam tentar sair da tempestade da Lyria');
}
console.log('OK: tiros perfurantes de Lyria e Tessa e evasão de áreas persistentes.');

// V9.7 — jogador escolhe a habilidade inicial, independente de ser Q, W ou E.
{
 const v=read('fenda-view.js'),css=read('fenda.css');
 for(const key of ['q','w','e']){
  const m=E.start('lyria'),p=m.hero,kit=heroes[p.id].skills;
  const ix={q:0,w:1,e:2}[key],picked=kit[ix];
  assert.equal(p.level,1,'A partida começa no nível 1');
  assert.equal(p.skillPoints,1,'O primeiro ponto pertence ao jogador');
  assert.ok(kit.every(id=>E.skillRank(p,id)===0),'Nenhuma habilidade básica vem aprendida');
  assert.equal(E.skillRank(p,heroes[p.id].ultimate),0,'Ultimate ainda bloqueada');
  assert.equal(E.upgradeSkill(p,heroes[p.id].ultimate).ok,false,
   'Não é permitido gastar ponto na ultimate no nível 1');
  assert.equal(E.cast(p,kit[0]),false,'Q bloqueada antes da escolha');
  const selected=E.upgradeSkill(p,picked);
  assert.ok(selected.ok,'Jogador não conseguiu escolher '+key.toUpperCase());
  assert.equal(p.skillPoints,0,'Primeira escolha deve consumir o ponto');
  for(let i=0;i<3;i++){
   assert.equal(E.skillRank(p,kit[i]),i===ix?1:0,
    'Outra habilidade foi desbloqueada sem escolha');
  }
  assert.equal(E.upgradeSkill(p,kit[(ix+1)%3]).ok,false,
   'Não pode aprender duas habilidades gastando somente um ponto');
  if(key!=='q')assert.equal(E.cast(p,kit[0]),false,
   'Não pode lançar Q se o jogador escolheu outra habilidade');
  assert.ok(E.cast(p,picked,{x:1,y:0,distance:80}),
   'A habilidade escolhida deve poder ser usada imediatamente');
 }
 assert.ok(v.includes("firstSkillPanel.id='fendaFirstSkillPanel'")&&
   v.includes("h.level===1&&h.skillPoints>0")&&
   v.includes("E.upgradeSkill(S.hero,skill)"),
   'Painel precisa oferecer Q/W/E e ativar a primeira escolha');
 assert.ok(css.includes('#fendaFirstSkillPanel:not([hidden])')&&
   css.includes('fenda-first-skill-options'),
   'Primeiro painel de escolha precisa ser visível no celular e no PC');
 assert.ok(v.includes('Escolha a primeira habilidade (Q/W/E) após entrar.')&&
   !v.includes('HABILIDADE INICIAL: '),
   'Tela de seleção não pode afirmar que Q vem aprendida automaticamente');
}
console.log('OK: V9.7 com primeira habilidade Q, W ou E escolhida pelo jogador.');

// V9.8 — feitiços móveis compactos, fora do centro e junto às habilidades.
{
 const html=read('index.html'),view=read('fenda-view.js');
 const mobileCss=html.slice(html.lastIndexOf('/* Fenda 9.8 — Feitiços compactos'));
 assert.ok(mobileCss.includes('@media (pointer:coarse)')&&
  mobileCss.includes('.stage.fenda-on #fendaSummoners'),
  'A interface de feitiços compactos precisa valer somente para toque');
 assert.ok(mobileCss.includes('grid-template-columns:48px!important')&&
  mobileCss.includes('grid-template-rows:repeat(2,48px)!important')&&
  mobileCss.includes('border-radius:50%!important'),
  'Os dois feitiços precisam ser botões circulares pequenos, empilhados');
 assert.ok(mobileCss.includes('right:calc(clamp(235px,39vw,310px) - 48px)!important')&&
  mobileCss.includes('bottom:max(15px,env(safe-area-inset-bottom))!important'),
  'Feitiços precisam acompanhar o grupo de habilidades no canto inferior direito');
 assert.ok(mobileCss.includes('.fenda-summoner small,')&&
  mobileCss.includes('.fenda-summoner .spell-effect{')&&
  mobileCss.includes('display:none!important'),
  'Descrições grandes dos feitiços não podem cobrir o campo');
 assert.ok(mobileCss.includes('.fenda-summoner.oncd em:not(:empty)')&&
  mobileCss.includes('display:flex!important'),
  'Recarga deve continuar visível no ícone');
 assert.ok(view.includes("summonerPanel.querySelectorAll('button')")&&
  view.includes('useSummoner(Number(btn.dataset.slot))'),
  'Botões compactos precisam continuar acionando feitiços');
 assert.ok(!view.includes('mobileHelpBtn')&&!view.includes('mobileGuideUpdate()'),
  'Ajuda central não pode reaparecer após a remoção solicitada');
 assert.ok(html.includes('fenda-view.js?v=11.0')&&
  html.includes('fenda.css?v=10.2'),
  'Atualização deve invalidar o cache do jogo');
}
console.log('OK: V9.8 com dois feitiços compactos no canto e painel de ajuda preservado.');

// V9.9 — torre é alvo comum, foco TORRE sobrepõe tropas, AA por arrasto trava
// alvo sem sequestrar o joystick; ajudas centrais foram retiradas.
{
 const view=read('fenda-view.js'),html=read('index.html'),engine=read('fenda-engine.js');
 const game=E.start('lyria'),hero=game.hero;
 const tower=game.structures.find(t=>t.kind==='tower'&&t.side===1&&t.tier===1);
 game.structures=[tower];game.units=[hero];game.camps=[];game.walls=[];game.obstacles=[];
 hero.x=tower.x-(tower.r+hero.r+18);hero.y=tower.y;
 hero.attackCd=0;hero.focusTarget=null;hero.focusUntil=0;
 E.refreshVision(true);
 assert.equal(E.findAA(hero),tower,
  'Ataque comum deve atingir uma torre exposta mesmo sem clicar no botão TORRE');
 const original=tower.hp;
 assert.ok(E.autoAttack(hero),'Auto AA não iniciou contra torre');
 for(let i=0;i<14;i++)E.step(.05,{x:0,y:0});
 assert.ok(tower.hp<original,'AA comum sem foco manual não causou dano à torre');
 hero.attackCd=0;hero.attackPending=null;game.projectiles=[];
 const minion={uid:10991,id:'guard',kind:'minion',side:1,lane:tower.lane,
  x:hero.x+50,y:hero.y,r:14,hp:400,maxHp:400,stun:3,slow:0,shield:0,
  attackCd:3,atk:10,speed:0,invuln:0};
 game.units=[hero,minion];E.refreshVision(true);
 assert.equal(E.findAA(hero),minion,
  'AA normal prioriza tropas antes de torre com ambos no alcance');
 const priority=E.focusTower(hero,tower);
 assert.ok(priority.ok,'O botão TORRE não selecionou estrutura exposta');
 assert.equal(E.findAA(hero),tower,
  'Botão TORRE deve ter prioridade mesmo diante de tropas próximas');
 E.clearAttackCommand(hero);
 assert.equal(E.findAA(hero),minion,'AA deve retornar à prioridade comum após limpar seleção');
 const lock=E.lockAttackTarget(hero,tower);
 assert.ok(lock.ok,'Não foi possível travar torre por arrastar o AA');
 assert.equal(hero.commandTarget,null,
  'Trava de AA não pode alterar movimento do joystick');
 assert.equal(E.findAA(hero),tower,'Alvo arrastado deve sobrepor outras prioridades');
 E.clearAttackLock(hero);
 assert.equal(E.findAA(hero),minion,'Limpar trava restaura a prioridade normal');
 const unexposed=E.start('lyria'),me=unexposed.hero;
 const inner=unexposed.structures.find(t=>t.kind==='tower'&&t.side===1&&t.tier===2);
 me.x=inner.x-inner.r-me.r-15;me.y=inner.y;
 unexposed.units=[me];E.refreshVision(true);
 assert.notEqual(E.findAA(me),inner,'Torres protegidas não podem receber AA automático');
 const targetCode=view.slice(view.indexOf('function attackStickTarget('),view.indexOf('function aaStart('));
 assert.ok(targetCode.startsWith('function attackStickTarget('),
  'Faltando seleção de alvos direcional ao segurar o ataque');
 const hgame=E.start('lyria'),attacker=hgame.hero;
 attacker.x=1600;attacker.y=1350;
 const east={uid:1123,id:'guard',kind:'minion',side:1,lane:1,x:1730,y:1350,
  r:13,hp:200,maxHp:200};
 const west={...east,uid:1124,x:1460};
 hgame.units=[attacker,east,west];hgame.structures=[];hgame.camps=[];
 E.refreshVision(true);
 const aim=new Function('E','S',targetCode+'return attackStickTarget;')(E,hgame);
 assert.equal(aim(attacker,60,0),east,'Arrasto do AA para direita deve selecionar alvo à direita');
 assert.equal(aim(attacker,-60,0),west,'Arrasto do AA para esquerda deve selecionar alvo à esquerda');
 assert.ok(view.includes("addEventListener('pointermove',aaMove)")&&
  view.includes('E.lockAttackTarget(S.hero,aim.target)')&&
  view.includes('aaAim?.dragged'),
  'Segurar e arrastar o botão AA deve mostrar o alvo e travá-lo no soltar');
 assert.ok(!view.includes('mobileHelpBtn')&&!view.includes('mobileGuideOpen'),
  'Interrogação e menu explicativo devem desaparecer do jogo');
 const css=html.slice(html.lastIndexOf('/* Fenda 9.9 — ações secundárias'));
 assert.ok(css.includes('top:clamp(54px,14vh,72px)!important')&&
  css.includes('#fendaHUD #fendaWardBtn')&&css.includes('#fendaHUD #fendaTowerBtn'),
  'Visão e torre devem sair do centro e ocupar canto superior direito');
 assert.ok(html.includes('fenda-view.js?v=11.0')&&
  html.includes('fenda-engine.js?v=11.0'),
  'Cache deve carregar versão 9.9');
}
// Mira de AA desliga ataque automático apenas durante seleção manual.
{
 const m=E.start('lyria'),h=m.hero,enemy=m.units.find(u=>u.side===1&&u.kind==='hero');
 m.units=[h,enemy];m.structures=[];m.walls=[];m.obstacles=[];m.camps=[];m.nextWave=99999;
 h.x=1550;h.y=1450;h.attackCd=0;
 enemy.x=1650;enemy.y=1450;enemy.stun=4;
 E.refreshVision(true);
 m.attackAimActive=true;
 for(let i=0;i<4;i++)E.step(.05,{x:0,y:0});
 assert.equal(h.attackCd,0,'Durante o arrasto não pode atacar o alvo automático errado');
 m.attackAimActive=false;
 E.step(.05,{x:0,y:0});
 assert.ok(h.attackCd>0,'Ao terminar a seleção, o ataque automático deve voltar');
 const v=read('fenda-view.js'),engine=read('fenda-engine.js');
 assert.ok(v.includes('S.attackAimActive=true;')&&v.includes('S.attackAimActive=false;'),
  'Arrasto não suspende e reativa corretamente a seleção automática');
 assert.ok(engine.includes('!state.attackAimActive&&'),
  'O motor precisa respeitar a mira manual do jogador');
}
// Regressão: HUD sem referência indefinida não pode congelar os 10 campeões.
{
 const v=read('fenda-view.js');
 const match=v.match(/const shortSummonerEffect\s*=\s*(\{[\s\S]*?\});/);
 assert.ok(match,'O painel de feitiços precisa definir seus rótulos antes do primeiro frame');
 const labels=vm.runInNewContext('('+match[1]+')');
 for(const id of Object.keys(E.SUMMONERS))
  assert.ok(typeof labels[id]==='string'&&labels[id].length>0,
   'Feitiço sem rótulo interrompe HUD: '+id);
 assert.ok(html.includes('fenda-view.js?v=11.0'),
  'O navegador deve atualizar o arquivo de controles corrigido');
}
// Fenda 10.0: draft deve alterar time, rota, feitiços e movimentação.
{
 const view=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(view.includes('function chooseLane(reset=false)')&&
  view.includes('chooseLane(true);requestAnimationFrame(loop)')&&
  view.includes('E.start(C.getHeroChoice(),pickedSummoners,selectedLane)')&&
  view.includes('data-lane=')&&view.includes('Sem fase de banimentos')&&
  view.includes('E.previewBlue(selected,selectedLane)'),
  'Seleção de rotas não conectada à formação da equipe');
 assert.ok(html.includes('fenda-engine.js?v=11.0')&&html.includes('fenda-view.js?v=11.0')&&
  html.includes('fenda.css?v=10.2')&&css.includes('.fenda-lane-grid')&&
  css.includes('.fenda-lineup'),'Os arquivos do draft não atualizaram');
 for(const selectedRole of E.ROLE_ORDER){
  const lineup=E.previewBlue('lyria',selectedRole);
  assert.equal(lineup.length,5);
  assert.equal(new Set(lineup.map(x=>x.id)).size,5);
  const m=E.start('lyria',['flash','ignite'],selectedRole),h=m.hero;
  const blue=m.units.filter(u=>u.kind==='hero'&&u.side===0);
  const red=m.units.filter(u=>u.kind==='hero'&&u.side===1);
  assert.equal(h.roleKey,selectedRole);
  assert.equal(h.lane,E.ROLE_LANES[selectedRole]);
  for(const team of [blue,red]){
   assert.equal(team.length,5);
   assert.equal(new Set(team.map(u=>u.roleKey)).size,5);
   assert.equal(team.filter(u=>u.jungler).length,1);
  }
  if(selectedRole==='jungle')assert.ok(h.summoners.includes('smite'));
  const hx=h.x,hy=h.y,bot=blue.find(u=>!u.controlled),bx=bot.x,by=bot.y;
  for(let k=0;k<60;k++)E.step(.05,{x:1,y:0});
  assert.ok(distance(h,{x:hx,y:hy})>25,'Jogador parou de andar em '+selectedRole);
  assert.ok(distance(bot,{x:bx,y:by})>10,'Bots pararam de andar em '+selectedRole);
 }
}
// Fenda 10.1: suporte compartilha farm de AA (melee e ranged), evolução e segurança.
{
 const S=E.start('seris',null,'support'),sup=S.hero;
 const adc=S.units.find(u=>u.side===0&&u.roleKey==='adc');
 assert.ok(adc&&sup.roleKey==='support','Postos da botlane indisponíveis');
 E.makeWave();
 const minion=S.units.find(u=>u.kind==='minion'&&u.side===1&&u.lane===2);
 assert.ok(minion,'Sem tropa para testar o emblema');
 S.units=[sup,adc,minion];S.structures=[];S.walls=[];S.obstacles=[];
 S.camps=[];S.nextWave=99999;
 sup.x=1500;sup.y=1400;adc.x=1530;adc.y=1400;
 adc.stun=50;minion.x=1560;minion.y=1400;minion.stun=50;
 minion.hp=49;minion.maxHp=165;
 E.refreshVision(true);
 assert.equal(sup.supportCharges,2);
 assert.ok(E.canSupportExecute(sup,minion),'Minion executável com ADC perto');
 const prior=adc.gold;
 assert.equal(E.autoAttack(sup),true,'Suporte não iniciou ataque');
 for(let i=0;i<16;i++)E.step(.05,{x:0,y:0});
 assert.equal(minion.hp,0,'Suporte não executou tropa sob 65%');
 assert.equal(sup.supportCharges,1,'Execução deve consumir uma carga');
 assert.equal(sup.supportProcs,1);
 assert.equal(sup.supportQuestGold,E.SUPPORT_QUEST_REWARD);
 assert.equal(sup.supportGoldShared,E.MINION_BOUNTIES.guard);
 assert.equal(adc.supportGoldReceived,E.MINION_BOUNTIES.guard);
 assert.equal(adc.supportReceivedCS,1);
 assert.ok(adc.gold-prior>=E.MINION_BOUNTIES.guard,
  'ADC não recebeu ouro do minion executado');
 const questHp=sup.maxHp;
 sup.supportQuestGold=E.SUPPORT_QUEST_GOAL-E.SUPPORT_QUEST_REWARD;
 const second={...minion,uid:98771,hp:49,death:0,stun:50};
 S.units.push(second);sup.attackCd=0;
 E.refreshVision(true);
 assert.equal(E.autoAttack(sup),true,'Segunda execução não iniciou');
 for(let i=0;i<18;i++)E.step(.05,{x:0,y:0});
 assert.equal(second.hp,0);assert.ok(sup.supportQuestComplete);
 assert.equal(sup.maxHp-questHp,95,'Evolução do emblema sem bônus defensivo');
 const third={...minion,uid:98772,hp:49,death:0,stun:50};
 S.units.push(third);sup.supportCharges=0;
 const adcPrevious=adc.supportGoldReceived,supGold=sup.gold;
 E.damage(third,100,sup);
 assert.equal(adc.supportGoldReceived-adcPrevious,E.MINION_BOUNTIES.guard,
  'Último golpe do suporte sem carga não pode roubar o ouro do ADC');
 assert.ok(sup.gold-supGold>=Math.floor(E.MINION_BOUNTIES.guard/2));
 // Cargas regeneram, mas não ultrapassam o limite de três.
 for(let i=0;i<650;i++)E.step(.05,{x:0,y:0});
 assert.ok(sup.supportCharges>=1&&sup.supportCharges<=E.SUPPORT_MAX_CHARGES,
  'Cargas do suporte não recarregaram');
 const view=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(view.includes('fendaShareInfo')&&view.includes('supportGoldReceived')&&
  view.includes('scoreRoles={top:')&&view.includes('scoreOrder[a.roleKey]'),
  'HUD/placar precisa mostrar farm partilhado e função real do campeão');
 assert.ok(css.includes('#fendaShareInfo')&&
  html.includes('fenda-engine.js?v=11.0')&&html.includes('fenda-view.js?v=11.0')&&
  html.includes('fenda.css?v=10.2'),'Assets novos não carregaram na v10.1');
}
{
 // Cada bot deve construir itens completos e voltar para compras em segurança.
 const S=E.start('lyria',null,'adc'),hero=S.hero;
 const bot=S.units.find(u=>u.side===0&&u.roleKey==='top');
 S.units=[hero,bot];S.structures=[];S.walls=[];S.camps=[];
 S.obstacles=[];S.nextWave=99999;bot.gold=6000;
 bot.x=E.HOME[0].x+20;bot.y=E.HOME[0].y-20;
 for(let i=0;i<38;i++)E.step(.05,{x:0,y:0});
 assert.ok(bot.items.some(id=>E.ITEMS.some(it=>it.id===id&&it.tier===2)),
  'Bot guardou ouro em pré-itens sem completar equipamento');
 bot.x=1600;bot.y=1300;bot.gold=2500;bot.hp=bot.maxHp;bot.stun=0;
 S.time=70;bot.botRecallWait=0;
 E.step(.05,{x:0,y:0});
 assert.ok(bot.recall>0,'Bot com ouro deve retornar à base quando seguro');
 for(let i=0;i<100;i++)E.step(.05,{x:0,y:0});
 assert.ok(bot.recall>0,'Bot completou o retorno antes dos seis segundos');
 for(let i=0;i<25;i++)E.step(.05,{x:0,y:0});
 assert.ok(E.dist(bot,E.HOME[0])<245,'Retorno do bot não o levou para compras');
}
// Revisão 10.1: equilíbrio entre atiradores/tanques e assistências por proteção.
{
 const game=E.start('tessa',null,'adc');
 assert.ok(E.attackRange(game.hero)>=230,'Atiradora de precisão precisa de alcance distintivo');
 assert.ok(E.skillDef('rokar_guard').cd<11.1,'Tanque iniciador precisa sobreviver entre trocas');
 const match=E.start('seris',null,'support'),sup=match.hero,
  ally=match.units.find(u=>u.side===0&&u.roleKey==='adc'),
  enemy=match.units.find(u=>u.side===1&&u.roleKey==='adc');
 match.units=[sup,ally,enemy];match.structures=[];match.camps=[];match.walls=[];
 match.obstacles=[];match.nextWave=99999;
 sup.x=1450;sup.y=1500;ally.x=1505;ally.y=1500;
 enemy.x=1630;enemy.y=1500;enemy.stun=20;ally.stun=20;
 sup.skillLevels.seris_aegis=1;sup.mana=500;
 assert.ok(E.cast(sup,'seris_aegis'),'Suporte não lançou escudo');
 for(let i=0;i<15;i++)E.step(.05,{x:0,y:0});
 assert.ok((sup.supportAided||[]).some(e=>e.uid===ally.uid),
  'Proteção do suporte não foi registrada para assistência');
 const before=sup.assists;
 E.damage(enemy,enemy.hp,ally);
 assert.equal(sup.assists,before+1,'Suporte não recebeu assistência por escudo no aliado');
}
// Fenda 10.2.1: perímetro físico impede entrar no vazio e limita overscan.
{
 const scene=read('fenda-scenery.js'),view=read('fenda-view.js');
 assert.ok(E.ARENA_BOUNDARY.length>12&&
  scene.includes('function arenaRim(g,E)')&&scene.includes('path(g,E.ARENA_BOUNDARY)')&&
  view.includes('E.ARENA_BOUNDARY.forEach('),
  'O cenário e minimapa precisam desenhar o mesmo perímetro físico');
 assert.equal(E.isInsideArena({x:30,y:30},18),false,
  'Canto superior esquerdo ainda está acessível fora da arena');
 assert.equal(E.isInsideArena({x:E.W-30,y:E.H-30},18),false,
  'Canto inferior direito ainda está acessível fora da arena');
 for(const p of [...E.ROUTE_PATHS.flat(),...E.HOME,...E.CORE]){
  assert.ok(E.isInsideArena(p,21),'Rota ou base ficaram fora da arena: '+JSON.stringify(p));
 }
 E.start('orun',null,'top');
 for(const p of [...state.camps,...state.brushes,...state.walls]){
  assert.ok(E.isInsideArena(p,12),'Parte da selva inacessível: '+JSON.stringify(p));
 }
 // Um campeão tentando sair pelo canto só escorrega pela barreira física.
 const h=state.hero;
 for(let i=0;i<160;i++){
  E.movePhysical(h,-29,-29);
  assert.ok(E.isInsideArena(h,h.r),'O campeão ultrapassou a borda da arena');
 }
 assert.ok(distance(h,{x:30,y:30})>280,
  'O personagem conseguiu entrar no quadrante vazio da imagem');
 for(const p of [{x:30,y:30},{x:E.W-30,y:30},{x:30,y:E.H-30}]){
  const corrected={...p,r:18};
  E.constrainToArena(corrected);
  assert.ok(E.isInsideArena(corrected,18),
   'Teleporte não foi recolocado dentro do perímetro');
 }
 const oldView=read('fenda-view.js');
 assert.ok(oldView.includes('const mobileCameraClampX=(x,heroX,finger=0)=>')&&
  oldView.includes('Math.min(worldVW*.35,wanted)')&&
  oldView.includes('const mobileCameraClampY=y=>clamp(y,-worldVH*.15'),
  'Câmera voltou a permitir áreas vazias muito grandes');
}
{
 const view=read('fenda-view.js');
 const block=view.slice(view.indexOf('const cameraClampX='),
  view.indexOf('function syncCameraControl()'));
 assert.ok(block.includes('function mobileCameraTarget(hero,observing=false)'));
 assert.ok(view.includes('joy.fx=e.clientX-rect.left;')&&
  view.includes('ctx.fillRect(S.camera.x,S.camera.y,worldVW,worldVH);')&&
  view.includes('Object.assign(S.camera,mobileCameraTarget(S.hero));'),
  'Câmera ou joystick não acompanham redimensionamento e o polegar');
 for(const [width,height] of [[800,360],[924,416],[420,300],[1800,830]]){
  const zoom=Math.min(width>=1250?1.5:width>=750?1.35:1.17,height/620),
   worldVW=width/zoom,worldVH=height/zoom;
  for(const lane of [0,1,2])for(const t of [.07,.2,.42,.63,.84]){
   const hero=E.pathPos(lane,t);
   for(const touchRatio of [0,.18,.32,.45]){
    const fx=touchRatio?width*touchRatio+18:0,
     joy={ptr:touchRatio?9:null,sx:width*touchRatio,fx};
    const cam=new Function('E','S','worldVW','worldVH','clamp','vw','vh',
     'cameraZoom','joy','cameraPeek','MOBILE_HERO_ANCHOR_X',
     'MOBILE_HERO_ANCHOR_Y','MOBILE_THUMB_CLEARANCE_PX',
     block+'return {mobileCameraTarget};'
    )(E,state,worldVW,worldVH,E.clamp,width,height,zoom,joy,null,.54,.48,108);
    const target=cam.mobileCameraTarget(hero);
    const hx=(hero.x-target.x)*zoom,hy=(hero.y-target.y)*zoom;
    assert.ok(hx>=width*.30&&hx<=width*.80,
     'Jogador ficou fora da região útil na lane '+lane);
    assert.ok(hy>=height*.17&&hy<=height*.82,
     'Jogador ficou oculto acima/abaixo da tela na lane '+lane);
    assert.ok(target.x>=-worldVW*(touchRatio?.35:.20)-.01,
     'A câmera voltou a mostrar muito espaço fora da arena');
    assert.ok(target.y>=-worldVH*.15-.01,
     'A câmera ultrapassou demais a borda superior da arena');
    if(touchRatio)assert.ok(hx-fx>Math.min(75,width*.17),
     'O polegar voltou a cobrir o jogador na lane '+lane);
    assert.ok(Number.isFinite(target.x)&&Number.isFinite(target.y));
   }
  }
 }
}
console.log('OK: Fenda 10.2.1 com borda fisica, cenario conectado e camera mobile limitada.');
// Fenda 10.2 — loja durante a morte, inspecionar antes de comprar, botas e selva segura.
{
 const game=E.start('nyra',null,'mid'),hero=game.hero;
 hero.hp=0;hero.respawn=12;hero.gold=6500;hero.x=2100;hero.y=1100;
 assert.equal(E.canShop(hero),true,'Morto fora da base deve poder abrir a loja');
 const maxBefore=hero.maxHp,before=hero.gold;
 assert.ok(E.buyItem('ward').ok,'Compra de componente negada ao campeão morto');
 assert.equal(hero.hp,0,'O item ressuscitou o campeão antes da contagem');
 assert.equal(hero.respawn,12,'O item interrompeu a contagem para renascer');
 assert.equal(hero.maxHp-maxBefore,95,'Item comprado morto não alterou PV máximos');
 assert.equal(before-hero.gold,325,'Compra morta com preço inesperado');
 for(const item of ['boots','sprout'])assert.ok(E.buyItem(item).ok,'Não comprou peça morto: '+item);
 assert.ok(E.buyItem('guardianboots').ok,'Combinação de botas mortas falhou');
 assert.equal(hero.hp,0,'Combinar item reviveu o campeão');
 assert.ok(hero.items.includes('guardianboots'),'Botas não foram equipadas');
 assert.ok(!hero.items.includes('boots')&&!hero.items.includes('ward')&&!hero.items.includes('sprout'),
  'Combinar as botas não consumiu os componentes');
 assert.ok(E.sellItem(hero.items.indexOf('guardianboots')).ok,
  'Vender item morto devia funcionar como no retorno à base');
 hero.hp=hero.maxHp;
 assert.equal(E.canShop(hero),false,'Não pode comprar vivo fora da base');
 assert.equal(E.buyItem('boots').ok,false,'Compra remota de campeão vivo liberada');
}
{
 const v=read('fenda-view.js'),css=read('fenda.css');
 assert.ok(v.includes('shopInspectBackId=shopSelectedId;shopSelectedId=b.dataset.shopPart;')&&
  !v.includes('E.buyItem(b.dataset.shopPart)')&&
  v.includes('data-shop-back')&&v.includes('Ver atributos de'),
  'Toque na peça precisa mostrar descrição antes da compra');
 assert.ok(v.includes('const base=E.canShop(h),dead=h.hp<=0')&&
  v.includes('ELIMINADO · COMPRAS LIBERADAS')&&
  v.includes('E.canShop(S.hero),S.hero.hp<=0'),
  'Loja não permite comprar e atualizar o estado de morte');
 assert.ok(css.includes('.fenda-shop-slot .fenda-shop-slot-sell{position:absolute')&&
  !css.includes('.fenda-shop-slot button{position:absolute')&&
  css.includes('.fenda-shop-slot .fenda-shop-slot-select{position:relative;inset:auto'),
  'Botão do ícone do item está flutuando fora do inventário');
 const list=v.match(/const suggestedBuilds=(\{[\s\S]*?\});\s*\/\/ Recomendação dinâmica/);
 assert.ok(list,'Sugestões de classes não identificadas');
 const builds=new Function('return ('+list[1]+')')();
 for(const id of Object.keys(heroes)){
  assert.ok(builds[id]?.includes('boots'),'Sem botas básicas recomendadas: '+id);
  assert.ok(builds[id].some(x=>['arcaneboots','guardianboots','hunterboots','swiftboots'].includes(x)),
   'Sem evolução de botas recomendadas: '+id);
 }
 for(const [id,parts] of Object.entries({
  arcaneboots:['boots','prism','core'],
  guardianboots:['boots','ward','sprout'],
  hunterboots:['boots','fang','core'],
  swiftboots:['boots','stride','lens']
 })){
  const it=E.ITEMS.find(x=>x.id===id);
  assert.ok(it&&it.tier===2,'Botas de classe não registradas: '+id);
  assert.deepEqual(it.recipe,parts,'Receita das botas incorreta: '+id);
 }
}
{
 const m=E.start('lyria'),red=m.units.find(u=>u.kind==='hero'&&u.side===1);
 const tower=m.structures.find(t=>t.kind==='tower'&&t.side===0&&t.lane===0&&t.tier===1);
 const projection=E.routeProjection(0,tower),origin=E.pathPos(0,projection.progress/E.ROUTE_TOTALS[0]);
 const dir=E.norm(tower.x-origin.x,tower.y-origin.y);
 const jungle={x:tower.x+dir.x*65,y:tower.y+dir.y*65,r:19,kind:'hero',side:1};
 assert.ok(E.dist(jungle,tower)<tower.range,'Alvo da selva não está no alcance geométrico da torre');
 assert.ok(E.routeProjection(0,jungle).distance>E.LANE_HALF_WIDTH+19,
  'Teste deveria estar fora do corredor da TOP');
 assert.equal(E.towerCanTarget(tower,jungle),false,'A torre ainda atinge a selva');
 assert.equal(E.towerCanTarget(tower,{...origin,r:19,kind:'hero',side:1}),true,
  'Torre deixou de defender o corredor da rota');
 for(const other of m.structures.filter(t=>t.kind==='tower')){
  const proj=E.routeProjection(other.lane,other),
   o=E.pathPos(other.lane,proj.progress/E.ROUTE_TOTALS[other.lane]),
   outside=E.norm(other.x-o.x,other.y-o.y),
   j={x:other.x+outside.x*65,y:other.y+outside.y*65,r:19,kind:'hero',side:1-other.side};
  assert.equal(E.towerCanTarget(other,j),false,'Torre atinge selva: '+other.id);
  assert.equal(E.towerCanTarget(other,{...o,r:19,kind:'hero',side:1-other.side}),true,
   'Torre não protege a lane: '+other.id);
 }
 m.units=[red];m.structures=[tower];m.camps=[];m.obstacles=[];m.walls=[];
 m.nextWave=99999;red.x=jungle.x;red.y=jungle.y;red.stun=8;tower.attackCd=0;
 E.refreshVision(true);
 for(let i=0;i<5;i++)E.step(.05,{x:0,y:0});
 assert.ok(!m.projectiles.some(p=>p.source===tower),'A torre disparou contra herói na selva');
 red.x=origin.x;red.y=origin.y;tower.attackCd=0;E.refreshVision(true);
 for(let i=0;i<5;i++)E.step(.05,{x:0,y:0});
 assert.ok(m.projectiles.some(p=>p.source===tower),'A torre não dispara mais na própria rota');
}
console.log('OK: Fenda 10.2, loja de mortos, inspeção de peças, botas e torres por corredor.');

// Arena 11.0 — novos kits, builds e efeitos concretos dos 8 equipamentos.
{
 const names=['kaoryn','darian','elowen','tharok','varka','iskha'];
 assert.equal(Object.keys(heroes).length,18,'Elenco novo precisa ter 18 campeões');
 assert.equal(E.ITEMS.filter(it=>it.tier===2).length,25,'25 itens completos esperados');
 const roles={kaoryn:'adc',darian:'adc',elowen:'support',tharok:'support',varka:'top',iskha:'mid'};
 const view=read('fenda-view.js'),engine=read('fenda-engine.js'),ai=read('fenda-team-ai.js');
 for(const id of names){
  const h=heroes[id],skillsOf=[...h.skills,h.ultimate];
  assert.equal(skillsOf.length,4,'Campeão sem QWER: '+id);
  assert.equal(new Set(skillsOf).size,4,'Campeão com habilidade duplicada: '+id);
  assert.equal(E.CHAMPION_ROLES[id],roles[id],'Função incorreta '+id);
  for(const skill of skillsOf){
   const def=E.skillDef(skill);
   assert.ok(def&&def.cd>0&&def.cost>0&&def.aim,
    'Nova habilidade não cadastrada no motor: '+skill);
   assert.ok(def.aim==='self'||def.range<E.TURRET_RANGE||def.ultimate,
    'Habilidade básica supera o alcance da torre: '+skill);
  }
  const match=E.start(id,null,roles[id]),hero=match.hero;
  const enemy=match.units.find(u=>u.kind==='hero'&&u.side===1);
  assert.equal(hero.id,id,'Seleção falhou '+id);
  assert.equal(hero.roleKey,roles[id],'Lane escolhida não chegou ao motor');
  assert.equal(match.units.filter(u=>u.kind==='hero'&&u.side===0).length,5);
  assert.equal(match.units.filter(u=>u.kind==='hero'&&u.side===1).length,5);
  assert.ok(match.units.filter(u=>u.kind==='hero'&&u.side===0).every((u,i,list)=>
   list.findIndex(t=>t.roleKey===u.roleKey)===i),'Duas vagas ocupando a mesma função');
  assert.ok(!match.units.filter(u=>u.kind==='hero'&&u.side===1).some(u=>u.id===id),
   'Mesmo campeão apareceu nos dois lados da partida: '+id);
  assert.ok(view.includes("u.id==='"+id+"'")&&view.includes("  "+id+":'M"),
   'Novo personagem sem modelo ou retrato próprio: '+id);
  assert.ok(ai.includes(id),'Nova função ausente na IA '+id);
  match.units=[hero,enemy];match.structures=[];match.camps=[];match.walls=[];match.obstacles=[];
  match.nextWave=99999;
  hero.x=1500;hero.y=1250;enemy.x=1665;enemy.y=1250;
  enemy.stun=20;hero.mana=1500;hero.level=8;hero.skillPoints=9;
  E.refreshVision(true);
  for(const sk of skillsOf){
   hero.skillLevels[sk]=1;hero.cooldowns[sk]=0;
   assert.ok(E.cast(hero,sk,{x:1,y:0,distance:160}),
    'Habilidade não pode ser lançada: '+sk);
   for(let f=0;f<24;f++)E.step(.05,{x:0,y:0});
   hero.mana=1500;
  }
 }
 assert.ok(view.includes('function recommendedFor(hero)')&&
  view.includes('const base=E.canShop(h),dead=h.hp<=0,builds=recommendedFor(h)'),
  'Loja não adaptou recomendações ao time inimigo');
}
{
 const ids=['ruinblade','bloodedge','eclipseknife','corruptmask',
  'voidstaff','stormcrown','stoneheart','incensario'];
 const scene=E.start('elowen',null,'support'),hero=scene.hero;
 hero.x=E.HOME[0].x;hero.y=E.HOME[0].y;hero.gold=15000;
 for(const id of ids){
  const it=E.ITEMS.find(x=>x.id===id);
  assert.ok(it&&it.tier===2&&it.recipe.length===3,
   'Item completo sem receita: '+id);
  const price=it.recipe.reduce((t,part)=>t+E.ITEMS.find(p=>p.id===part)?.price,0);
  assert.ok(price<it.price,'Combinação sem custo extra: '+id);
  for(const part of it.recipe)assert.ok(E.buyItem(part).ok,'Pré-item não comprável: '+part);
  assert.ok(E.buyItem(id).ok,'Item completo não combina: '+id);
  assert.equal(hero.items.length,1,'Receita não consumiu peças: '+id);
  assert.equal(hero.items[0],id,'Item final errado: '+id);
  assert.ok(E.sellItem(0).ok,'Venda do equipamento '+id+' falhou');
 }
}
{
 // Diferenciar efeitos de passiva por dano, cura e tempo.
 const scene=E.start('darian',null,'adc'),hero=scene.hero,
  enemy=scene.units.find(u=>u.side===1&&u.roleKey==='top');
 scene.units=[hero,enemy];scene.structures=[];scene.camps=[];scene.walls=[];scene.obstacles=[];
 scene.nextWave=99999;hero.x=1500;hero.y=1300;enemy.x=1600;enemy.y=1300;hero.gold=20000;
 const reset=()=>{enemy.hp=enemy.maxHp=1800;enemy.shield=0;enemy.invuln=0;
  enemy.grievousUntil=0;hero.stormCrownReady=0;hero.items=[];enemy.items=[]};
 reset();enemy.items=['stoneheart'];
 const normal=E.damage(enemy,100,hero,'aa');
 reset();enemy.items=['stoneheart'];hero.items=['eclipseknife'];
 const piercing=E.damage(enemy,100,hero,'aa');
 assert.ok(piercing>normal,'Adaga do Eclipse não penetra armadura');
 reset();enemy.items=['titanplate'];
 const mage={...hero,id:'nyra',items:[]};
 const magic=E.damage(enemy,100,mage,'spell');
 reset();enemy.items=['titanplate'];mage.items=['voidstaff'];
 assert.ok(E.damage(enemy,100,mage,'spell')>magic,'Cajado do Vazio não penetra defesa mágica');
 reset();hero.items=['corruptmask'];
 E.damage(enemy,12,hero);
 enemy.hp=1500;
 const healed=E.heal(enemy,100);
 assert.ok(healed<=60,'Feridas graves não reduziram cura em 40%');
 reset();hero.items=['stormcrown'];
 const burst=E.damage(enemy,30,hero,'spell');
 const second=E.damage(enemy,30,hero,'spell');
 assert.ok(burst>second+15,'Coroa da Tempestade não respeita o tempo entre explosões');
 reset();hero.items=['ruinblade'];enemy.hp=enemy.maxHp=2500;
 hero.passiveAttacks=0;hero.attackCd=0;
 E.refreshVision(true);
 assert.ok(E.autoAttack(hero),'AA com Lâmina da Ruína não iniciou');
 for(let j=0;j<20;j++)E.step(.05,{x:0,y:0});
 assert.ok(enemy.hp<enemy.maxHp,'Lâmina da Ruína não acerta campeões');
 reset();enemy.hp=enemy.maxHp=2500;hero.items=['bloodedge'];hero.passiveAttacks=2;
 hero.attackCd=0;E.refreshVision(true);
 assert.ok(E.autoAttack(hero),'AA crítico não iniciou');
 assert.equal(hero.passiveAttacks,3,'AA não contabilizado para crítico');
 reset();const ally=scene.units[0]; // Elowen será testada na formação original.
 const supportScene=E.start('elowen',null,'support'),sup=supportScene.hero,
  adc=supportScene.units.find(u=>u.side===0&&u.roleKey==='adc');
 supportScene.units=[sup,adc];supportScene.structures=[];supportScene.camps=[];supportScene.walls=[];supportScene.obstacles=[];
 supportScene.nextWave=99999;sup.x=1500;sup.y=1200;adc.x=1530;adc.y=1200;sup.items=['incensario'];
 sup.skillLevels.elowen_glade=1;sup.mana=400;
 assert.ok(E.cast(sup,'elowen_glade'),'Elowen não consegue proteger com Incensário');
 assert.ok(adc.shield>0&&adc.inspireUntil>supportScene.time,
  'Incensário não fortalece ataques do aliado protegido');
}

{
 // Revisão 11.1: validar que todos os arquivos JS, inclusive a arena antiga, são sintaticamente válidos.
 for(const filename of ['fenda-engine.js','fenda-team-ai.js','fenda-scenery.js','fenda-view.js'])
  assert.doesNotThrow(()=>new Function(read(filename)),filename+' contém erro de sintaxe');
 const classic=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(classic&&classic.length>1000,'Código da arena clássica não encontrado');
 assert.doesNotThrow(()=>new Function(classic),'Arena clássica com erro de sintaxe');
}
{
 // Botas não podem ser acumuladas. As evoluções continuam consumindo a bota básica.
 const game=E.start('lyria',null,'adc'),h=game.hero;
 h.gold=20000;h.x=E.HOME[0].x;h.y=E.HOME[0].y;
 assert.ok(E.buyItem('boots').ok,'Primeira bota básica não pode ser comprada');
 assert.equal(E.buyItem('boots').ok,false,'Botas básicas duplicadas');
 assert.ok(E.buyItem('stride').ok&&E.buyItem('lens').ok,'Pré-itens de botas inválidos');
 assert.ok(E.buyItem('swiftboots').ok,'Não combinou botas sem perder o par básico');
 assert.equal(E.buyItem('boots').ok,false,'Bota básica comprada sobre bota evoluída');
 assert.equal(E.buyItem('swiftboots').ok,false,'Conseguiu duplicar a bota completa');
 assert.ok(E.sellItem(h.items.indexOf('swiftboots')).ok,'Não conseguiu vender botas');
 assert.ok(E.buyItem('boots').ok,'Não pode comprar novo par depois de vender');
}
{
 // Preços, componentes e slots de todas as receitas continuam válidos.
 const all=E.ITEMS;
 assert.equal(new Set(all.map(it=>it.id)).size,all.length,'Itens com identificadores repetidos');
 for(const item of all){
  assert.ok(Number.isFinite(item.price)&&item.price>0&&item.price%1===0,'Preço inválido: '+item.id);
  assert.ok(item.tier===1||item.tier===2,'Categoria inválida: '+item.id);
  if(item.tier!==2)continue;
  assert.equal(item.recipe.length,3,'Receita incorreta: '+item.id);
  const sum=item.recipe.reduce((v,k)=>{
   const part=all.find(it=>it.id===k);
   assert.ok(part&&part.tier===1,'Componente inválido: '+k+' em '+item.id);
   return v+part.price;
  },0);
  assert.ok(sum<item.price,'Combinação que cria ouro: '+item.id);
 }
}
{
 // Os novos campeões físicos precisam escalar habilidades com seus itens de AD.
 for(const [heroId,role,skill] of [
  ['kaoryn','adc','kaoryn_volley'],['darian','adc','darian_ricochet']]){
  const game=E.start(heroId,null,role),h=game.hero;
  game.units=[h];game.structures=[];game.walls=[];game.obstacles=[];game.camps=[];
  game.nextWave=999999;h.x=1600;h.y=1200;h.mana=1000;h.skillLevels[skill]=1;
  const aim={x:1,y:0,distance:180};
  assert.ok(E.cast(h,skill,aim),'Não lançou Q básico: '+heroId);
  for(let i=0;i<5;i++)E.step(.05,{x:0,y:0});
  const original=game.projectiles.find(p=>p.skillId===skill)?.damage;
  assert.ok(original>0,'Projétil não foi criado: '+skill);
  game.projectiles=[];h.cooldowns[skill]=0;h.mana=1000;h.items=['bloodedge'];
  assert.ok(E.cast(h,skill,aim),'Não lançou Q com equipamento: '+heroId);
  for(let i=0;i<5;i++)E.step(.05,{x:0,y:0});
  const scaled=game.projectiles.find(p=>p.skillId===skill)?.damage;
  assert.ok(scaled>original*1.10,'Habilidade de '+heroId+' não escala com AD');
 }
 const game=E.start('varka',null,'top'),h=game.hero,enemy=game.units.find(u=>u.side===1&&u.kind==='hero');
 game.units=[h,enemy];game.structures=[];game.camps=[];game.obstacles=[];game.walls=[];game.nextWave=999999;
 h.x=1500;h.y=1300;enemy.x=1540;enemy.y=1300;
 h.skillLevels.varka_cleave=1;h.mana=1000;enemy.hp=enemy.maxHp=3000;
 assert.ok(E.cast(h,'varka_cleave'),'Q da Varka não ativou');
 const original=3000-enemy.hp;
 enemy.hp=3000;h.items=['bloodedge'];h.cooldowns.varka_cleave=0;h.mana=1000;
 assert.ok(E.cast(h,'varka_cleave'),'Q da Varka não ativou com item');
 assert.ok(3000-enemy.hp>original*1.10,'Machado da Varka não escala com AD');
}
{
 // Kaoryn usa a própria armadilha e não empresta o identificador de Tessa.
 const game=E.start('kaoryn',null,'adc'),h=game.hero;
 game.units=[h];game.camps=[];game.structures=[];game.nextWave=999999;
 h.skillLevels.kaoryn_thorns=1;h.mana=1000;
 assert.ok(E.cast(h,'kaoryn_thorns',{x:1,y:0,distance:190}),'Não instalou a armadilha da Kaoryn');
 for(let i=0;i<5;i++)E.step(.05,{x:0,y:0});
 assert.ok(game.zones.some(z=>z.kind==='trap'&&z.skillId==='kaoryn_thorns'),
  'Armadilha de Kaoryn identificada como a de Tessa');
}
{
 // Resistências físicas/mágicas reduzem fontes compatíveis, inclusive tropas.
 const game=E.start('varka',null,'top'),victim=game.units.find(u=>u.side===1&&u.kind==='hero'),
  attacker=game.hero;
 game.structures=[];game.camps=[];game.obstacles=[];game.walls=[];game.nextWave=999999;
 const fresh=(items)=>{victim.items=items;victim.hp=victim.maxHp=2800;victim.shield=0;victim.invuln=0;};
 fresh([]);const physical=E.damage(victim,100,attacker,'spell');
 fresh(['stoneheart']);const protectedHit=E.damage(victim,100,attacker,'spell');
 assert.ok(protectedHit<physical,'Armadura não protege contra habilidade física');
 const mage={...attacker,id:'nyra',items:[]};
 fresh([]);const magical=E.damage(victim,100,mage,'spell');
 fresh(['titanplate']);const magicalReduced=E.damage(victim,100,mage,'spell');
 assert.ok(magicalReduced<magical,'Resistência mágica não protege contra magia');
 const minion={kind:'minion',side:attacker.side,id:'guard'};
 fresh([]);const minionHit=E.damage(victim,100,minion,'aa');
 fresh(['stoneheart']);const minionReduced=E.damage(victim,100,minion,'aa');
 assert.ok(minionReduced<minionHit,'Coração de Pedra não protege contra AAs de tropas');
}
{
 // Feridas graves precisam reduzir tanto curas ativas quanto regeneração passiva.
 const regen=(wounded)=>{
  const game=E.start('lyria',null,'adc'),h=game.hero;
  game.units=[h];game.structures=[];game.camps=[];game.obstacles=[];game.walls=[];
  game.nextWave=999999;h.x=1500;h.y=1000;h.hp=100;
  h.grievousUntil=wounded?200:0;
  for(let i=0;i<120;i++)E.step(.05,{x:0,y:0});
  return h.hp-100;
 };
 const normal=regen(false),reduced=regen(true);
 assert.ok(normal>2&&reduced<normal*.65,'Feridas graves não afetam regeneração');
}
{
 const ai=read('fenda-team-ai.js');
 assert.ok(ai.includes("z.kind==='icefield'")&&
  ai.includes("'kaoryn','darian','iskha','seris','elowen'"),
  'IA não reconhece gelo nem os novos carregadores');
}
console.log('OK: Arena 11.1 - revisão de erros de dano, botas, projéteis, armadilhas, IA, loja, cura e sintaxe.');
console.log('OK: Arena 11.0 com 18 campeões, 24 habilidades novas, 25 itens e IA.');
console.log('OK: Fenda 10.1: partilha do suporte, receitas, retorno dos bots e regressões.');
