'use strict';
(function(){
if(typeof s==='undefined'||typeof CASES==='undefined')return;
let board={notes:[],connections:[]};
const active=()=>s.caseId==='lago';
const esc2=x=>esc(String(x??''));
function local(){s.lakeIdeas||=[];s.lakeConnections||=[]}
function notebook(){
 local();const notes=net.inGame?board.notes:s.lakeIdeas;
 const links=net.inGame?board.connections:s.lakeConnections;
 const options=s.evidence.map(id=>'<option value="'+esc2(id)+'">'+esc2(CASES.lago.clues[id]?.name||id)+'</option>').join('');
 return '<section class="lakeNotebook"><div class="eyebrow">QUADRO DE INVESTIGAÇÃO'+(net.inGame?' · EM EQUIPE':'')+'</div><h2>Conecte os fatos</h2><p>O jogo não interpreta as provas por você. Registre uma explicação, compare duas evidências e discuta com o grupo.</p><form data-lake-note><input name="idea" maxlength="250" required placeholder="Minha hipótese ou contradição…"><button>Registrar observação</button></form><form data-lake-connection><select name="a">'+options+'</select><span>⟷</span><select name="b">'+options+'</select><button '+(s.evidence.length<2?'disabled':'')+'>Relacionar</button></form><h3>Conexões propostas</h3>'+(links.length?links.map(x=>'<p class="lakeNoteItem">⟷ '+esc2(CASES.lago.clues[x.a]?.name||x.a)+' + '+esc2(CASES.lago.clues[x.b]?.name||x.b)+' · '+esc2(x.by||'Pesquisador')+'</p>').join(''):'<p>Nenhuma relação anotada.</p>')+'<h3>Observações da equipe</h3>'+(notes.length?notes.map(x=>'<p class="lakeNoteItem">'+esc2(x.text)+' <small>— '+esc2(x.by||'Pesquisador')+'</small></p>').join(''):'<p>Nenhuma hipótese registrada ainda.</p>')+'</section>';
}
function decorate(){
 if(!active()||!['board','dossier'].includes(s.view))return;
 const main=app.querySelector('main');if(!main||main.querySelector('.lakeNotebook'))return;
 main.insertAdjacentHTML('beforeend',notebook());
}
const previous=render;render=function(){previous();decorate()};
app.addEventListener('submit',ev=>{
 const f=ev.target;if(!active()||!f.matches('[data-lake-note],[data-lake-connection]'))return;
 ev.preventDefault();ev.stopImmediatePropagation();local();
 if(net.inGame&&net.paused)return toast('Aguardando o grupo reconectar.');
 if(f.matches('[data-lake-note]')){
  const text=String(new FormData(f).get('idea')||'').trim();
  if(text.length<5)return toast('Descreva uma hipótese mais detalhada.');
  if(net.inGame){campaignPush({op:'investigation',kind:'note',text});return;}
  s.lakeIdeas.push({text,by:'Você'});s.lakeIdeas=s.lakeIdeas.slice(-30);
 }else{
  const data=new FormData(f),a=String(data.get('a')),b=String(data.get('b'));
  if(a===b||!s.evidence.includes(a)||!s.evidence.includes(b))return toast('Escolha duas evidências diferentes que já encontrou.');
  if(net.inGame){campaignPush({op:'investigation',kind:'connection',a,b});return;}
  if(!s.lakeConnections.some(x=>x.a===a&&x.b===b||x.a===b&&x.b===a))s.lakeConnections.push({a,b,by:'Você'});
 }
 persist(false);render();
},true);
if(typeof applyCampaign==='function'){
 const original=applyCampaign;
 applyCampaign=function(state,initial){
  if(state?.team?.investigation)board={notes:state.team.investigation.notes||[],connections:state.team.investigation.connections||[]};
  return original(state,initial);
 };
}
render();
})();