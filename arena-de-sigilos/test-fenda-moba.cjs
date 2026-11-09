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
assert.equal(state.units.filter(u=>u.kind==='hero').length,10);
assert.equal(state.structures.filter(u=>u.kind==='tower').length,18);
assert.equal(E.LANE_HALF_WIDTH*2,216);
assert.equal(E.CORE.length,2,'Cada lado tem um Núcleo independente da fonte');
assert.equal(E.BASE_GATE.length,2,'Saídas próprias das duas equipes');
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
assert.ok(html.includes('fenda-engine.js?v=5.9')&&
 html.includes('fenda-team-ai.js?v=5.9')&&
 html.includes('fenda-view.js?v=5.9'),'O site deve carregar todos os sistemas da 5.0.');
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
 assert.ok(E.routeProjection(t.lane,t).distance>=119,'Torre sobre a rota: '+t.id);
}
for(const camp of state.camps){
 assert.ok(Math.min(...[0,1,2].map(l=>E.routeProjection(l,camp).distance))>=170,
 'Monstro ocupando uma lane: '+camp.id);
}
// Fenda 5.9: mapa do mesmo estilo da Teamfight, sem imagens pré-renderizadas.
const terrainSource=read('fenda-view.js');
assert.ok(terrainSource.includes('function drawTerrain(){')&&
 terrainSource.includes('function techPolygon(g,x,y,r,sides=6')&&
 terrainSource.includes('function techRoute(g,points)')&&
 terrainSource.includes('function techObstacle(g,o)')&&
 terrainSource.includes('function techBase(g,side)'),
 'Fenda deve usar formas nativas de Canvas, como a Arena Teamfight');
assert.ok(terrainSource.includes('const pts=E.ROUTE_PATHS[lane]')&&
 terrainSource.includes('techRoute(g,pts);')&&
 terrainSource.includes("for(let lane=0;lane<3;lane++)"),
 'O mapa deve desenhar três lanes contínuas e coerentes com a física');
assert.ok(terrainSource.includes("for(let side=0;side<2;side++)techBase(g,side);")&&
 terrainSource.includes('const home=E.HOME[side],core=E.CORE[side]'),
 'Duas bases separadas e proporcionais ao mapa');
assert.ok(terrainSource.includes('for(const o of S.obstacles)techObstacle(g,o);'),
 'Cada obstáculo do cenário deve ser um obstáculo verdadeiro do motor');
assert.ok(terrainSource.includes('for(const camp of S.camps)')&&
 terrainSource.includes('for(const b of S.brushes)'),
 'Os acampamentos e campos de camuflagem continuam representados');
assert.ok(!terrainSource.includes('new Image(')&&
 !terrainSource.includes('artReady(')&&
 !terrainSource.includes('paintedSprite(')&&
 !terrainSource.includes('drawImage(art.'),
 'Não carregar imagens de fundo nem estruturas prontas na versão Teamfight');
assert.ok(terrainSource.includes('function drawHero(u,t){')&&
 terrainSource.includes('function drawMinion(u,t){')&&
 terrainSource.includes('function drawStructure(o,t){'),
 'Personagens, tropas e construções continuam independentes e interativos');
E.start('lyria');
assert.equal(state.obstacles.length,32,'Cenário continua com 32 obstáculos físicos');
for(let i=0;i<state.obstacles.length;i+=2){
 const a=state.obstacles[i],b=state.obstacles[i+1];
 assert.ok(Math.abs(a.x+b.x-E.W)<.001&&Math.abs(a.y+b.y-E.H)<.001,
  'Obstáculos devem continuar em pares simétricos');
 assert.equal(a.kind,b.kind);
}
assert.equal(state.brushes.length,6);
for(let i=0;i<6;i+=2){
 const a=state.brushes[i],b=state.brushes[i+1];
 assert.ok(Math.abs(a.x+b.x-E.W)<.001&&Math.abs(a.y+b.y-E.H)<.001&&a.r===b.r,
  'Campos devem continuar simétricos');
}
const sourceCss=read('fenda.css');
assert.ok(sourceCss.includes('.stage.fenda-on .mobile-controls #joy'),
 'Joystick não está oculto no modo desktop');
assert.ok(sourceCss.includes('@media (hover:none), (pointer:coarse)')&&
 sourceCss.includes('.stage.fenda-on #fireBtn {display:flex!important;pointer-events:auto!important;}'),
 'Ataque básico deve continuar visível e acionável no celular');
// Fenda 5.3: AA proporcional à lane, habilidades e reserva de mana real.
E.start('lyria');
const rangeHero=state.hero;
assert.equal(E.attackRange(rangeHero),173,'AA de Lyria em escala reduzida');
assert.ok(E.attackRange(rangeHero)<E.LANE_HALF_WIDTH*2,'AA não pode superar a largura da rota');
assert.equal(E.skillDef('lyria_pierce').range,345);
assert.equal(E.skillDef('lyria_rain').range,212);
assert.equal(E.skillDef('nyra_bolt').range,341);
assert.equal(E.skillDef('seris_bloom').range,211);
assert.equal(E.WARD_RANGE,280);
assert.equal(rangeHero.mana,320);
assert.equal(E.maxMana(rangeHero),320);
const manaCost=E.skillDef('lyria_pierce').cost;
assert.equal(E.cast(rangeHero,'lyria_pierce'),true);
assert.equal(rangeHero.mana,320-manaCost,'Casting não está gastando mana');
rangeHero.mana=0;
assert.equal(E.cast(rangeHero,'lyria_rain'),false,'Habilidade foi usada com mana zero');
assert.ok(view.includes("$('fendaManaText').textContent='MANA '"),
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
// Regressão: recall negativo (truthy) bloqueava para sempre a movimentação.
E.start('lyria');
const recalled=state.hero;recalled.x=1040;recalled.y=900;
assert.equal(E.recall(),true);
for(let i=0;i<73;i++)E.step(.05,{x:0,y:0});
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
// 5.4: placa de mana no mundo, K/D/A e farm sempre visiveis.
assert.ok(view.includes('function manaBar(x,y,r,mana,max,width=55)')&&
 view.includes('manaBar(x,y,r,u.mana,E.maxMana(u),55)'),
 'A mana deve ser desenhada abaixo da barra de vida de cada campeao');
assert.ok(view.includes("$('fendaPlayerStats').textContent='K/D/A '")&&
 view.includes("+' · FARM '+h.cs"),
 'K/D/A e farm devem ficar permanentemente visiveis na HUD');
assert.ok(view.includes('function scoreTeam(side)')&&
 view.includes('scoreboardItems(u)')&&
 view.includes('function renderScoreboard()'),
 'Placar detalhado deve listar ambos os times com os itens');
assert.ok(view.includes('fendaScoreboardTeams')&&
 view.includes('scoreRoles={orun:')&&
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
const scoreApi=new Function('E','C','S',scoreCode+'return {scoreTeam};')(E,{heroes},state);
const blueHTML=scoreApi.scoreTeam(0),redHTML=scoreApi.scoreTeam(1);
assert.equal((blueHTML.match(/class="fenda-scoreboard-player/g)||[]).length,5);
assert.equal((redHTML.match(/class="fenda-scoreboard-player/g)||[]).length,5);
assert.ok(blueHTML.includes('LYRIA')&&redHTML.includes('LYRIA'),
 'Campeoes dos dois times precisam aparecer');
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
const center={x:1440,y:1180};
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
console.log('OK: 5x5, lanes curvas, tropas em formação, torres, colisões e teamfight em 100s.');
