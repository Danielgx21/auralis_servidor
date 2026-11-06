/* MUNDO CONTÍNUO · DGX v0.16
   Motor determinístico de simulação fictícia: 30 países, comércio, população,
   distribuição das cores, tecnologia, recursos, alianças e conflitos.
   Os números são dados inventados para o jogo, não estatísticas reais.
*/
(function(){
"use strict";
const COLOR={
 vermelho:{hex:"#e55d64",name:"Vermelho",trait:"Liderança precoce, carisma, coragem e competitividade. Tendem a organizar expedições e concentrar decisões, mas também enfrentam disputas internas."},
 azul:{hex:"#5299e9",name:"Azul",trait:"Liderança construída pela experiência e pelas oportunidades. Aprendem rápido, negociam, planejam e ampliam influência com o tempo."},
 amarelo:{hex:"#ebc15b",name:"Amarelo",trait:"Raciocínio analítico, curiosidade, pragmatismo e disciplina. Investem em universidades, ciência, finanças e instituições."},
 verde:{hex:"#75b887",name:"Verde",trait:"Diversos e numerosos. Produzem alimentos, movem mercados, criam comunidades e ganham influência pela população e pela organização coletiva."},
 preto:{hex:"#676c7b",name:"Preto",trait:"Reservados e observadores. Valorizam autonomia, privacidade, investigação, especialização e redes de confiança."},
 rosa:{hex:"#ec99be",name:"Rosa",trait:"Sensibilidade, empatia e cuidado. Desenvolvem artes, hospitais, mediação, educação e cooperação social."},
 laranja:{hex:"#f3a15f",name:"Laranja",trait:"Criatividade, iniciativa e resistência. Destacam-se em indústria, construção, exploração e empreendedorismo."},
 turquesa:{hex:"#55bdc6",name:"Turquesa",trait:"Adaptabilidade e cosmopolitismo. Formam portos, rotas comerciais, redes marítimas e comunidades multiculturais."},
 cinza:{hex:"#a8b5c1",name:"Cinza",trait:"Organização, precisão e dever público. Valorizam engenharia, infraestrutura, legislação e defesa institucional."},
 marrom:{hex:"#b98b64",name:"Marrom",trait:"Tenacidade e ligação com a terra. Especializam-se em recursos minerais, energia, agricultura difícil e grandes obras."},
 roxo:{hex:"#aa79db",name:"Roxo",trait:"Forma muito rara que alguns vermelhos desenvolvem após experiências extraordinárias. Não forma um país: esses indivíduos vivem sobretudo em sociedades vermelhas ou azuis."}
};
const DEFINITIONS=[
[1,"verde",72,290,.68,"madeira,ferro,grãos"],
[2,"rosa",39,210,.76,"arte,ervas,têxteis"],
[3,"amarelo",55,480,.82,"ciência,finanças,sal"],
[4,"laranja",61,340,.63,"cobre,cavalos,pesca"],
[5,"verde",88,410,.70,"trigo,ferro,madeira"],
[6,"vermelho",47,530,.75,"aço,porto,cavalos"],
[7,"turquesa",31,250,.73,"pesca,navios,especiarias"],
[8,"cinza",28,260,.79,"engenharia,pedra,armas"],
[9,"amarelo",50,450,.83,"comércio,vidro,estudos"],
[10,"laranja",76,390,.66,"cobre,carvão,fronteira"],
[11,"cinza",18,190,.81,"níquel,rotas polares,pesca"],
[12,"rosa",22,170,.80,"pérolas,arte,medicina"],
[13,"verde",67,360,.71,"rios,madeira,milho"],
[14,"amarelo",64,560,.85,"tecnologia,bancos,ouro"],
[15,"azul",58,590,.84,"marinha,educação,comércio"],
[16,"vermelho",44,520,.74,"aço,exército,manufatura"],
[17,"turquesa",26,300,.78,"portos,sal,navegação"],
[18,"verde",82,430,.69,"arroz,frutas,madeira"],
[19,"marrom",70,400,.65,"minério,pedra,energia"],
[20,"preto",36,340,.72,"obsidiana,investigação,finanças"],
[21,"laranja",24,220,.67,"cobre,estaleiros,pesca"],
[22,"verde",95,470,.70,"florestas,peles,grãos"],
[23,"azul",60,610,.86,"diplomacia,marinha,indústria"],
[24,"amarelo",74,640,.88,"pesquisa,bancos,vidro"],
[25,"vermelho",53,570,.77,"aço,carvão,cavalos"],
[26,"cinza",48,380,.80,"pedra,engenharia,defesa"],
[27,"verde",89,420,.68,"arroz,madeira,borracha"],
[28,"rosa",16,130,.82,"coral,medicina,turismo"],
[29,"verde",110,520,.71,"agricultura,água doce,madeira"],
[30,"amarelo",79,630,.84,"ouro,estudos,comércio"]
];
const EDGES=[
[1,2],[1,4],[2,3],[2,5],[3,6],[4,5],[4,7],[5,6],[5,8],[6,9],[7,8],[7,10],[8,9],[8,10],[9,10],
[13,14],[13,16],[13,17],[14,15],[14,17],[14,18],[15,18],[16,17],[16,19],[17,18],[17,19],[17,20],[18,20],[18,21],[19,20],[20,21],
[22,23],[22,24],[23,24],[23,26],[24,25],[24,26],[25,27],[26,27],
[29,30]
];
const SEA=[
[3,13],[6,16],[7,17],[7,15],[7,28],[10,28],[10,29],[11,13],[11,22],[12,23],
[13,22],[14,23],[15,23],[15,24],[15,17],[17,21],[17,28],[19,29],
[20,27],[21,25],[21,30],[22,23],[23,24],[23,27],[24,30],[27,30],
[28,29],[29,30]
];
const RIVALRIES=[[6,15],[16,15],[25,23],[24,25],[19,20],[7,15],[22,23]];
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const round=(n,d=2)=>Number(n.toFixed(d));
const key=(a,b)=>Math.min(a,b)+"-"+Math.max(a,b);
const allRoutes=[...new Map([...EDGES,...SEA].map(([a,b])=>[key(a,b),[Math.min(a,b),Math.max(a,b)]])).values()];
const isSea=(a,b)=>SEA.some(([x,y])=>key(x,y)===key(a,b));
const isLand=(a,b)=>EDGES.some(([x,y])=>key(x,y)===key(a,b));
const adjacent=(a,b)=>isSea(a,b)||isLand(a,b);
function rand(seed){
 let x=seed>>>0;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
}
const sort=(a,b)=>a-b;
function initialMix(home){
 const v={vermelho:.055,azul:.052,amarelo:.064,verde:.31,preto:.035,rosa:.048,laranja:.047,turquesa:.039,cinza:.039,marrom:.039,roxo:0};
 if(home==="verde"){v.verde=.61;v.vermelho=.07;v.amarelo=.08;}
 else{v[home]=.54;v.verde=.27;}
 v.roxo=(home==="vermelho"||home==="azul")?.00010:.000005;
 const sum=Object.values(v).reduce((a,b)=>a+b,0);
 for(const name in v)v[name]/=sum;
 return v;
}
function create(){
 const nations=DEFINITIONS.map(([id,color,pop,gdp,social,rs])=>{
  const resources=rs.split(",");
  const tech=clamp(social*.9+(color==="amarelo"?.18:color==="azul"?.11:0),.35,.99);
  return{id,name:"País "+String(id).padStart(2,"0"),color,pop,gdp,social,
   stability:clamp(.54+social*.33+(color==="cinza"?.08:0),.35,.96),
   tech:round(tech,3),food:clamp(.56+(color==="verde"?.23:0)+((id*17)%13)*.01,0,1),
   environment:clamp(.67+social*.11,0,1),tension:.12,military:round((gdp*.055)*(color==="vermelho"?1.7:color==="azul"?1.25:1),1),
   treasury:round(gdp*.12),resources, stock:round(80+id*2.3+(color==="marrom"?70:0),1),
   mix:initialMix(color),purpleElites:(color==="vermelho"||color==="azul")?100+id*13:8+id*2,
   education:round(clamp(tech*.7+social*.3,.3,1),3)};
 });
 const relations={};
 for(const [a,b] of allRoutes){
  const A=nations[a-1],B=nations[b-1];
  let score=12+(A.color===B.color?24:0)+(isSea(a,b)?4:0);
  if(RIVALRIES.some(([x,y])=>key(x,y)===key(a,b)))score-=52;
  if((A.color==="amarelo"&&B.color==="azul")||(A.color==="azul"&&B.color==="amarelo"))score+=14;
  if((A.color==="verde"||B.color==="verde")&&A.color!==B.color)score+=4;
  relations[key(a,b)]={score:clamp(score,-85,90),alliance:false,trade:0};
 }
 const world={
  version:1,year:1,seed:20261105,nations,relations,wars:[],history:[],
  metrics:[],auto:false,lastEvent:"Fundação do Mundo Contínuo",lastSaved:null
 };
 world.history=[{year:1,type:"world",text:"Nasce o Mundo Contínuo: 30 nações, dez cores com territórios e raros indivíduos roxos. Nenhuma fronteira será estática."}];
 world.metrics=[aggregate(world)];
 return world;
}
function aggregate(world){
 const nations=world.nations;
 const sum=field=>round(nations.reduce((a,n)=>a+n[field],0),2);
 const positive=Object.values(world.relations).filter(r=>r.alliance).length;
 const trade=round(Object.values(world.relations).reduce((s,r)=>s+(r.trade||0),0),1);
 const counts={};for(const n of nations){counts[n.color]=(counts[n.color]||0)+n.pop}
 return{year:world.year,pop:sum("pop"),gdp:sum("gdp"),avgSocial:round(nations.reduce((s,n)=>s+n.social*n.pop,0)/nations.reduce((s,n)=>s+n.pop,0),3),
  wars:world.wars.length,alliances:positive,trade,colorPop:counts};
}
function note(world,type,text,ids=[]){
 world.history.unshift({year:world.year,type,text,ids});
 if(world.history.length>100)world.history.length=100;
 world.lastEvent=text;
}
const nation=(world,id)=>world.nations[id-1];
function affinity(world,a,b){return world.relations[key(a,b)]}
function annual(world){
 if(!world||world.version!==1)throw Error("Formato de mundo desconhecido");
 if(world.year>=500)throw Error("Limite do calendário atingido (ano 500).");
 world.year++;
 const rnd=rand((world.seed+world.year*2654435761)>>>0);
 const frac=(min,max)=>min+(max-min)*rnd();
 const allies=(a,b)=>affinity(world,a,b)?.alliance;
 let commerce=0,migrations=0,warDamage=new Set(),tradeImpact=new Map();
 // 1. Comércio gerado pela complementaridade de recursos, proximidade e diplomacia.
 for(const [a,b] of allRoutes){
  const A=nation(world,a),B=nation(world,b),rel=affinity(world,a,b);
  if(!rel)continue;
  const hostile=world.wars.some(w=>key(w.a,w.b)===key(a,b));
  if(hostile){rel.trade=0;continue}
  const diversity=A.resources.filter(item=>!B.resources.includes(item)).length+B.resources.filter(item=>!A.resources.includes(item)).length;
  const seaFactor=isSea(a,b)?1.17:1;
  const volume=Math.max(0,Math.sqrt(A.gdp*B.gdp)*.009*(1+diversity*.1)*(1+clamp(rel.score,-80,90)/220)*seaFactor);
  rel.trade=round(volume,2);commerce+=volume;
  tradeImpact.set(a,(tradeImpact.get(a)||0)+volume);
  tradeImpact.set(b,(tradeImpact.get(b)||0)+volume);
  rel.score=clamp(rel.score+frac(-1.8,2.1)+(volume>4?.25:0),-100,100);
  const Aincome=Math.max(0,A.gdp/(A.pop||1)),Bincome=Math.max(0,B.gdp/(B.pop||1));
  const diff=(B.social-A.social)*1.8+(Bincome-Aincome)/40+(B.stability-A.stability);
  if(Math.abs(diff)>.08){
   const immigrant=diff>0?B:A,emigrant=diff>0?A:B;
   const migrants=clamp(Math.abs(diff)*.013+.001,0,.07); // milhões/ano
   emigrant.pop=round(Math.max(2,emigrant.pop-migrants),5);
   immigrant.pop=round(immigrant.pop+migrants,5);
   migrations+=migrants;
   // A migração transforma lentamente a mistura social dos dois lados.
   const rate=clamp(migrants/Math.max(1,immigrant.pop)*.3,0,.005);
   immigrant.mix[emigrant.color]=(immigrant.mix[emigrant.color]||0)+rate;
   immigrant.mix[immigrant.color]=Math.max(.001,immigrant.mix[immigrant.color]-rate);
  }
 }
 // 2. Produção, alimentação, educação e recursos influenciam desenvolvimento.
 for(const n of world.nations){
  const trade=tradeImpact.get(n.id)||0;
  const baselineGrowth=.011+(n.tech-.55)*.026+(n.stability-.60)*.022+(trade/(n.gdp+1))*.19+(n.food-.60)*.016;
  const regionalUncertainty=frac(-.013,.019);
  const harvestShock=frac(-.06,.05);
  n.food=clamp(n.food+harvestShock+(n.resources.some(x=>/trigo|grãos|arroz|milho|agricultura|frutas|pesca/.test(x))?.027:-.009)
   -.011*Math.max(0,n.pop/70-1),.06,1);
  let populationGrowth=clamp(.007+.006*n.social+(.65-n.food)*-.016+frac(-.003,.004),-.03,.028);
  n.pop=round(Math.max(1,n.pop*(1+populationGrowth)),4);
  n.gdp=round(Math.max(15,n.gdp*(1+clamp(baselineGrowth+regionalUncertainty,-.07,.11))),3);
  n.stability=clamp(n.stability+frac(-.022,.020)+(n.food-.5)*.014+(trade>9?.006:0),.12,.98);
  n.tech=clamp(n.tech+(.004+n.education*.004)*(n.color==="amarelo"?1.12:1)+frac(-.002,.002),.20,.995);
  n.education=clamp(n.education+.003*n.social+frac(-.002,.003),.2,.99);
  n.social=clamp(n.social+(.003*n.tech+.001*n.stability+.001*n.food+frac(-.003,.003)),.22,.97);
  n.environment=clamp(n.environment+frac(-.006,.007)-(n.color==="marrom"||n.color==="laranja"?.001:.0002),.22,.95);
  n.treasury=round(clamp(n.treasury+n.gdp*(.016+frac(-.01,.01))-n.military*.12,0,n.gdp*.60),2);
  if(n.resources.some(x=>/ouro|cobre|níquel|carvão|minério|ferro|obsidiana|aço/.test(x))){
   n.stock=round(Math.max(0,n.stock-.75-frac(0,.55)),2);
  }else n.stock=round(Math.min(250,n.stock+.04),2);
  if(n.stock<13){n.gdp=round(n.gdp*.985,3);n.tension=clamp(n.tension+.012,0,.99)}
  // 3. Cor é uma identidade social mutável, especialmente durante a formação das crianças.
  // Transições não são deterministas por nascimento: dependem do contexto de vida.
  const opportunities=clamp((n.education+n.social+n.stability)/3,.1,.99);
  const toBlue=clamp(.00035*opportunities,0,.001);
  const fromGreen=Math.min(n.mix.verde*.003,toBlue);
  n.mix.verde-=fromGreen;n.mix.azul+=fromGreen;
  const redToBlue=Math.min(n.mix.vermelho*.0012,.00013+.00025*opportunities);
  n.mix.vermelho-=redToBlue;n.mix.azul+=redToBlue;
  const changeToPink=Math.min(n.mix.verde*.0008,.00015*(1-n.tension));
  n.mix.verde-=changeToPink;n.mix.rosa+=changeToPink;
  // Roxos são raros e não ocupam territórios próprios.
  if(n.color==="vermelho"||n.color==="azul"){
   const evolved=frac(1,6)*opportunities*(n.color==="vermelho"?1.3:.35);
   n.purpleElites=Math.round(n.purpleElites+evolved);
   n.mix.roxo=clamp(n.purpleElites/(n.pop*1e6),0,.0009);
  }
  const total=Object.values(n.mix).reduce((a,b)=>a+b,0);
  for(const col in n.mix)n.mix[col]=round(n.mix[col]/total,9);
 }
 // 4. Tensão diplomática, tratados de defesa e novas alianças.
 const tensionCandidates=[];
 for(const [a,b] of allRoutes){
  const A=nation(world,a),B=nation(world,b),rel=affinity(world,a,b);
  const competition=RIVALRIES.some(([x,y])=>key(x,y)===key(a,b));
  const pressure=competition?.006:0;
  const shortages=(A.stock<18||B.stock<18)?-1.2:0;
  rel.score=clamp(rel.score+frac(-2.1,2.2)+shortages, -100,100);
  A.tension=clamp(A.tension+pressure+frac(-.005,.005),0,1);
  B.tension=clamp(B.tension+pressure+frac(-.005,.005),0,1);
  if(rel.alliance&&(rel.score<22||world.wars.some(w=>key(w.a,w.b)===key(a,b)))){
   rel.alliance=false;
   note(world,"diplomacy","Países "+a+" e "+b+" encerraram seu pacto após desentendimentos.",[a,b]);
  }else if(!rel.alliance&&rel.score>58&&rnd()<.08){
   rel.alliance=true;
   note(world,"alliance","Países "+a+" e "+b+" assinaram um acordo de cooperação e defesa.",[a,b]);
  }
  if(rel.score< -39&&(!rel.alliance)&&(competition||A.tension>.42||B.tension>.42)){
   tensionCandidates.push({a,b,score:rel.score,pressure:(competition?1.6:1)*(Math.abs(rel.score)/100)});
  }
 }
 // 5. Guerra não é roteirizada: surge de antagonismo, escassez e decisões.
 if(world.wars.length<4&&tensionCandidates.length){
  tensionCandidates.sort((a,b)=>b.pressure-a.pressure);
  const candidate=tensionCandidates[Math.floor(rnd()*Math.min(4,tensionCandidates.length))];
  const {a,b}=candidate;
  if(!world.wars.some(w=>w.a===a||w.b===a||w.a===b||w.b===b)&&rnd()<(.095+candidate.pressure*.05)){
   const reason=RIVALRIES.some(([x,y])=>key(x,y)===key(a,b))?"disputa de influência":"recursos e controle das rotas";
   world.wars.push({a,b,since:world.year,reason,intensity:round(frac(.35,.75),3)});
   note(world,"war","Conflito entre os países "+a+" e "+b+" por "+reason+".",[a,b]);
  }
 }
 for(const conflict of [...world.wars]){
  const A=nation(world,conflict.a),B=nation(world,conflict.b);
  const powerA=(A.gdp*.065+A.military)*A.stability,powerB=(B.gdp*.065+B.military)*B.stability;
  const balance=powerA/(powerA+powerB);
  for(const n of [A,B]){
   const severity=conflict.intensity*frac(.03,.065);
   n.gdp=round(n.gdp*(1-severity),3);
   n.pop=round(Math.max(1,n.pop*(1-severity*.19)),4);
   n.stability=clamp(n.stability-severity*.64,.10,.98);
   n.social=clamp(n.social-severity*.16,.2,.97);
   n.environment=clamp(n.environment-severity*.3,.2,.95);
   n.tension=clamp(n.tension+.05,0,1);
   warDamage.add(n.id);
  }
  const rel=affinity(world,conflict.a,conflict.b);
  if(rel){rel.score=clamp(rel.score-5,-100,100);rel.trade=0}
  if(world.year-conflict.since>=2&&rnd()<.24+(world.year-conflict.since)*.10){
   const winner=rnd()<balance?A:B;
   note(world,"peace","Países "+A.id+" e "+B.id+" assinaram a paz após "+(world.year-conflict.since)+" anos. O país "+winner.id+" ganhou maior influência na negociação.",[A.id,B.id]);
   world.wars=world.wars.filter(w=>w!==conflict);
   A.tension=clamp(A.tension-.11,0,1);B.tension=clamp(B.tension-.11,0,1);
  }
 }
 // 6. Choques climáticos, epidemias, investimentos e mudanças políticas.
 if(rnd()<.82){
  const id=1+Math.floor(rnd()*30),n=nation(world,id),type=Math.floor(rnd()*9);
  const emit=(type,text)=>note(world,type,"País "+id+": "+text,[id]);
  if(type===0){n.food=clamp(n.food-.11,0,1);n.gdp=round(n.gdp*.986);emit("climate","seca atinge as colheitas; cresce a pressão pelo comércio de alimentos.")}
  if(type===1){n.gdp=round(n.gdp*1.026);n.tech=clamp(n.tech+.013,0,1);emit("technology","uma descoberta industrial aumenta a produtividade e atrai especialistas.")}
  if(type===2){n.stability=clamp(n.stability-.09,0,1);n.tension=clamp(n.tension+.03,0,1);emit("politics","uma crise de governo provoca manifestações e disputas pelo poder.")}
  if(type===3){n.social=clamp(n.social+.018,0,1);n.education=clamp(n.education+.02,0,1);emit("education","reformas nas escolas ampliam a formação de jovens e a mobilidade social.")}
  if(type===4){n.pop=round(n.pop*.997,4);n.social=clamp(n.social-.004,0,1);emit("health","uma epidemia regional provoca perdas humanas e exige cooperação médica.")}
  if(type===5){n.gdp=round(n.gdp*1.022);n.stock=round(n.stock+12,2);emit("resource","novas reservas minerais impulsionam investimentos e exportações.")}
  if(type===6){n.environment=clamp(n.environment-.06,0,1);n.food=clamp(n.food-.05,0,1);emit("environment","desmatamento e degradação dos rios provocam protestos e pressão por mudanças.")}
  if(type===7){n.stability=clamp(n.stability+.025,0,1);n.social=clamp(n.social+.006,0,1);emit("culture","um festival internacional amplia o turismo e fortalece o diálogo cultural.")}
  if(type===8){n.gdp=round(n.gdp*.98,2);n.stability=clamp(n.stability-.012,0,1);emit("economy","uma crise bancária encarece empréstimos e reduz investimentos.")}
 }
 if(world.year%4===0){
  const colorDiff=world.nations.filter(n=>n.color==="verde").reduce((a,n)=>a+n.pop,0);
  note(world,"society","Censo: nações verdes somam "+Math.round(colorDiff)+" milhões de habitantes, reforçando seu peso no mercado e nas migrações.");
 }
 if(world.year%6===0){
  const areas=world.nations.filter(n=>n.color==="vermelho"||n.color==="azul");
  const count=areas.reduce((s,n)=>s+n.purpleElites,0);
  note(world,"society","Pesquisadores identificam "+Math.round(count).toLocaleString("pt-BR")+" indivíduos roxos em sociedades vermelhas e azuis. Continuam sem país próprio.");
 }
 world.metrics.push(aggregate(world));
 if(world.metrics.length>70)world.metrics.shift();
 return {commerce:round(commerce,1),migrations:round(migrations,3),warsDamaged:[...warDamage]};
}
function step(world,count=1){
 const n=clamp(Math.floor(count),1,25);
 let result=null;
 for(let i=0;i<n;i++)result=annual(world);
 return result;
}
function score(n){
 const colorBonus={vermelho:1.18,azul:1.18,amarelo:1.16,verde:.92,preto:1,rosa:1,laranja:1.02,turquesa:1.07,cinza:1.07,marrom:.95}[n.color]||1;
 return round((n.gdp*.62+n.pop*1.25+n.tech*210+n.stability*110+n.military*.38)*colorBonus,1);
}
function topRelations(world,id){
 return allRoutes.filter(([a,b])=>a===id||b===id).map(([a,b])=>({
  id:a===id?b:a,relation:affinity(world,a,b),route:isLand(a,b)?"terra":"mar"
 })).sort((a,b)=>b.relation.score-a.relation.score);
}
function validate(world){
 return !!world&&world.version===1&&world.nations?.length===30&&
  world.nations.every((n,i)=>n.id===i+1&&Number.isFinite(n.pop)&&Number.isFinite(n.gdp)&&
   COLOR[n.color]&&typeof n.name==="string")&&typeof world.relations==="object"&&Array.isArray(world.history);
}
window.DGXWorldEngine={COLOR,DEFINITIONS,EDGES,SEA,allRoutes,RIVALRIES,create,step,aggregate,score,topRelations,validate,key};
})();