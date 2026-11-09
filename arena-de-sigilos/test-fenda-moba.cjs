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
assert.equal(E.JUNGLE_LINKS.length,4);
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
console.log('OK: 5x5, lanes, torres, ataque básico, colisões, teamfight e 50s de simulação.');
