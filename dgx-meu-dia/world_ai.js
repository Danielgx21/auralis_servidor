/* Aethera v0.18 — inteligência local determinística, sem serviços externos. */
(function(){
"use strict";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rnd=(world,id,salt)=>{
 let x=((world.seed||20261105)^Math.imul(id,2654435761)^Math.imul(world.year,1597334677)^Math.imul(salt,2246822519))>>>0;
 x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;
};
const labels={defensiva:"Defensiva",comercial:"Comercial",cientifica:"Científica",social:"Social",industrial:"Industrial",expansionista:"Expansionista"};
const actions={
 food:{label:"Investir na segurança alimentar",strategy:"social",cost:.012,target:"food"},
 education:{label:"Financiar escolas e pesquisa",strategy:"cientifica",cost:.021,target:"tech"},
 infrastructure:{label:"Modernizar a infraestrutura",strategy:"industrial",cost:.018,target:"gdp"},
 defense:{label:"Reforçar as forças de defesa",strategy:"defensiva",cost:.017,target:"military"},
 commerce:{label:"Negociar novas rotas comerciais",strategy:"comercial",cost:.006,target:"relation"},
 diplomacy:{label:"Aproximar-se de um vizinho",strategy:"defensiva",cost:.004,target:"relation"},
 welfare:{label:"Expandir serviços públicos",strategy:"social",cost:.013,target:"social"},
 reserves:{label:"Constituir reservas estratégicas",strategy:"defensiva",cost:.012,target:"stock"},
 reforms:{label:"Promover reformas institucionais",strategy:"social",cost:.014,target:"stability"},
 expansion:{label:"Pressionar um rival regional",strategy:"expansionista",cost:.012,target:"military"},
 austerity:{label:"Reorganizar o orçamento",strategy:"comercial",cost:0,target:"treasury"}
};
const culture={
 vermelho:{defensiva:.22,expansionista:.22},azul:{comercial:.20,cientifica:.14},amarelo:{cientifica:.24,comercial:.12},
 verde:{social:.20,comercial:.12},preto:{defensiva:.10,cientifica:.12},rosa:{social:.23},
 laranja:{industrial:.23,expansionista:.06},turquesa:{comercial:.24},cinza:{defensiva:.16,industrial:.11},marrom:{industrial:.22}
};
function risks(world,n){
 const ties=Object.entries(world.relations||{}).filter(([key])=>key.split("-").map(Number).includes(n.id));
 const rivals=ties.filter(([,r])=>r.score< -20).length;
 const war=world.wars.some(w=>w.a===n.id||w.b===n.id);
 const treasuryRate=n.treasury/Math.max(1,n.gdp);
 const techAvg=world.nations.reduce((a,p)=>a+p.tech,0)/world.nations.length;
 const gdpAvg=world.nations.reduce((a,p)=>a+p.gdp,0)/world.nations.length;
 return {
  shortage:clamp((.66-n.food)*2.6,0,1.6),
  security:clamp(n.tension*1.5+rivals*.1+(war?1.3:0),0,2),
  economy:clamp((gdpAvg-n.gdp)/Math.max(1,gdpAvg)*.48+(.10-treasuryRate)*3+.22,0,1.3),
  science:clamp((techAvg-n.tech)*2+.45,0,1.2),
  unrest:clamp((.76-n.stability)*2.4+(.75-n.social)*.6,0,1.5),
  trade:clamp(ties.filter(([,r])=>r.score>0).length/5,0,1),
  war,treasuryRate
 };
}
function focus(world,n){
 const r=risks(world,n);
 const ratings={
  defensiva:.38+r.security*.65+r.shortage*.18,
  comercial:.45+r.trade*.32+r.economy*.25,
  cientifica:.46+r.science*.57,
  social:.42+r.shortage*.65+r.unrest*.52,
  industrial:.50+r.economy*.46,
  expansionista:.43+(n.military/Math.max(1,n.gdp)>.075?.24:0)+(r.security<.5?.16:0)-(r.war?.5:0)-(r.shortage>.6?.20:0)
 };
 for(const k of Object.keys(ratings)){
  ratings[k]+=(culture[n.color]?.[k]||0)+(n.ai?.strategy===k?.24:0);
  ratings[k]+=(rnd(world,n.id,k.length+k.charCodeAt(0))-.5)*.055;
 }
 const sorted=Object.keys(ratings).sort((a,b)=>ratings[b]-ratings[a]);
 const goals=[
  {label:"Segurança",value:clamp(Math.round(40+r.security*38),0,100)},
  {label:"Economia",value:clamp(Math.round(35+r.economy*48),0,100)},
  {label:"Alimentos",value:clamp(Math.round(30+r.shortage*48),0,100)},
  {label:"Ciência",value:clamp(Math.round(30+r.science*44),0,100)},
  {label:"Bem-estar",value:clamp(Math.round(34+r.unrest*45),0,100)},
  {label:"Diplomacia",value:clamp(Math.round(40+r.trade*34),0,100)}
 ].sort((a,b)=>b.value-a.value).slice(0,3);
 return {r,sorted,goals};
}
function bootstrap(world){
 let changed=false;
 if(world.aiVersion!==1){world.aiVersion=1;changed=true}
 for(const n of world.nations){
  if(!n.ai||typeof n.ai!=="object"){
   const initial={vermelho:"defensiva",azul:"comercial",amarelo:"cientifica",verde:"social",preto:"defensiva",
    rosa:"social",laranja:"industrial",turquesa:"comercial",cinza:"industrial",marrom:"industrial"};
   n.ai={strategy:initial[n.color]||"comercial",strategySince:world.year,
    goals:[],lastDecision:null,lastOutcome:null,memory:[],pending:null};
   changed=true;
  }
  const a=n.ai;
  if(!labels[a.strategy]){a.strategy="comercial";changed=true}
  if(!Array.isArray(a.memory)){a.memory=[];changed=true}
  if(!Array.isArray(a.goals)){a.goals=[];changed=true}
  if(!Number.isInteger(a.strategySince)){a.strategySince=world.year;changed=true}
  if(!a.goals.length){a.goals=focus(world,n).goals;changed=true}
 }
 return changed;
}
function metric(world,n,target,route){
 if(target==="relation")return world.relations[route]?.score||0;
 return Number(n[target])||0;
}
function review(world,n){
 const ai=n.ai,p=ai.pending;
 if(!p||world.year<=p.year)return;
 const delta=Number((metric(world,n,p.target,p.route)-p.before).toFixed(3));
 const threshold=p.target==="gdp"?Math.max(1,p.before*.006):p.target==="military"?1:
  p.target==="stock"?1:p.target==="treasury"?.5:p.target==="relation"?2:.002;
 const success=delta>=threshold;
 ai.lastOutcome={year:world.year,decision:p.label,result:success?"Avanço observado":"Resultado abaixo do esperado",
  detail:success?"O indicador melhorou após a medida.":"O indicador não apresentou a melhora esperada.",delta};
 ai.memory.unshift({year:p.year,action:p.action,success,delta});
 ai.memory=ai.memory.slice(0,10);
 ai.pending=null;
}
function neighbors(world,n){
 return Object.entries(world.relations||{}).map(([route,rel])=>{
  const [a,b]=route.split("-").map(Number);
  if(a!==n.id&&b!==n.id)return null;
  const id=a===n.id?b:a;
  if(world.wars.some(w=>(w.a===n.id&&w.b===id)||(w.b===n.id&&w.a===id)))return null;
  return {id,route,rel,other:world.nations[id-1]};
 }).filter(Boolean);
}
function explanation(k,n,r,p){
 const why={
  food:"A produção de alimentos e a segurança alimentar exigem atenção.",
  education:"Educação e pesquisa podem aumentar a capacidade tecnológica do país.",
  infrastructure:"A capacidade produtiva precisa acompanhar as demandas econômicas.",
  defense:r.war?"O país está em guerra e precisa reforçar a defesa.":"As tensões regionais justificam reforçar a segurança.",
  commerce:"Uma parceria com o País "+(p?.id||"vizinho")+" pode ampliar as oportunidades comerciais.",
  diplomacy:"Melhorar as relações com o País "+(p?.id||"vizinho")+" reduz o isolamento diplomático.",
  welfare:"A situação social exige investimentos em serviços e qualidade de vida.",
  reserves:"A disponibilidade de recursos estratégicos requer maior segurança.",
  reforms:"Instabilidade institucional pode prejudicar o desenvolvimento.",
  expansion:"O país busca ampliar seu poder de negociação diante do País "+(p?.id||"vizinho")+".",
  austerity:"O tesouro não permite sustentar novos investimentos sem rever despesas."
 };
 return why[k];
}
function decide(world,n){
 const ai=n.ai,{r,sorted,goals}=focus(world,n);
 if(world.year-ai.strategySince>=4||r.war||r.shortage>1){
  if(sorted[0]!==ai.strategy){ai.strategy=sorted[0];ai.strategySince=world.year}
 }
 ai.goals=goals;
 const options=neighbors(world,n);
 const friend=options.filter(p=>p.rel.score> -15&&p.rel.score<88).sort((a,b)=>b.rel.score-a.rel.score)[0];
 const neutral=options.filter(p=>p.rel.score<52&&!p.rel.alliance).sort((a,b)=>a.rel.score-b.rel.score)[0];
 const rival=options.filter(p=>p.rel.score< -15).sort((a,b)=>a.rel.score-b.rel.score)[0];
 const candidates=[
  ["food",.35+r.shortage*1.4,null],["education",.38+r.science*.66,null],
  ["infrastructure",.48+r.economy*.85,null],["defense",.27+r.security*.96,null],
  ["commerce",.30+r.trade*.65,friend],["diplomacy",.29+r.security*.40,neutral],
  ["welfare",.39+r.unrest*.67,null],["reserves",.20+clamp((85-n.stock)/90,0,1)*1.10,null],
  ["reforms",.26+r.unrest*.80,null],
  ["expansion",.38+(r.security<.6?.22:0)+(n.military>n.gdp*.075?.26:0),rival]
 ];
 const eligible=candidates.filter(([k,,p])=>
  (!["commerce","diplomacy","expansion"].includes(k)||p)&&n.treasury>=n.gdp*actions[k].cost+1);
 const ranked=eligible.map(([k,base,p],i)=>{
  let score=base+(actions[k].strategy===ai.strategy?.26:0)-(ai.lastDecision?.action===k?.15:0);
  const past=ai.memory.filter(m=>m.action===k);
  if(past.length)score+=(past.filter(m=>m.success).length/past.length-.5)*.19;
  score+=(rnd(world,n.id,i+51)-.5)*.10;
  return{k,score,p};
 }).sort((a,b)=>b.score-a.score);
 const selected=ranked[0]||{k:"austerity",p:null};
 const act=actions[selected.k],partner=selected.p;
 const before=metric(world,n,act.target,partner?.route);
 const cost=Number((n.gdp*act.cost).toFixed(2));
 const reason=explanation(selected.k,n,r,partner);
 if(cost)n.treasury=Number(Math.max(0,n.treasury-cost).toFixed(2));
 let newAlliance=false;
 switch(selected.k){
  case "food":n.food=clamp(n.food+.052,0,1);n.stock+=2;break;
  case "education":n.education=clamp(n.education+.020,0,1);n.tech=clamp(n.tech+.006,0,.995);break;
  case "infrastructure":n.gdp*=1.009;n.environment=clamp(n.environment-.002,0,1);n.stock=Math.max(0,n.stock-1.2);break;
  case "defense":n.military+=n.gdp*.028;n.tension=clamp(n.tension+.004,0,1);break;
  case "commerce":partner.rel.score=clamp(partner.rel.score+7,-100,100);break;
  case "diplomacy":
   partner.rel.score=clamp(partner.rel.score+10,-100,100);
   if(partner.rel.score>=67&&!partner.rel.alliance&&
      ["defensiva","comercial","cientifica"].includes(partner.other.ai?.strategy)){
    partner.rel.alliance=true;newAlliance=true;
   }
   break;
  case "welfare":n.social=clamp(n.social+.011,0,.97);n.stability=clamp(n.stability+.006,0,.98);break;
  case "reserves":n.stock=Math.min(250,n.stock+12);break;
  case "reforms":n.stability=clamp(n.stability+.022,0,.98);break;
  case "expansion":partner.rel.score=clamp(partner.rel.score-9,-100,100);n.tension=clamp(n.tension+.027,0,1);n.military+=n.gdp*.013;break;
  case "austerity":n.gdp*=.998;n.treasury+=n.gdp*.008;break;
 }
 ai.lastDecision={year:world.year,action:selected.k,label:act.label,reason,
  strategy:labels[ai.strategy],partner:partner?.id||null,cost};
 ai.pending={year:world.year,action:selected.k,label:act.label,target:act.target,before,route:partner?.route||null};
 if(newAlliance||selected.k==="expansion"||r.shortage>.85&&selected.k==="food"||world.year%6===0&&n.id%10===1){
  return {type:newAlliance?"alliance":selected.k==="expansion"?"diplomacy":"politics",
   text:n.name+" decidiu "+act.label.toLowerCase()+(newAlliance?" e firmou uma aliança":"")+". Motivo: "+reason,
   ids:partner?[n.id,partner.id]:[n.id]};
 }
 return null;
}
function tick(world,note){
 bootstrap(world);
 for(const n of world.nations)review(world,n);
 for(const n of world.nations){
  const e=decide(world,n);
  if(e)note(world,e.type,e.text,e.ids);
 }
}
window.DGXWorldAI={bootstrap,tick,focus,labels,actions};
})();