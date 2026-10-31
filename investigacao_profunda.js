'use strict';
/* Investigação Profunda — o jogador decide o que é relevante.
   Diário livre, sincronizado pela infraestrutura de expedição já existente;
   compêndio consultivo e observações de ambiente sem pistas automáticas. */
(function(){
if(typeof CASES==='undefined'||typeof render!=='function'||typeof app==='undefined')return;
const journalTypes=['Observação','Depoimento','Hipótese','Contradição','Pergunta'];
const research={
 lago:[
  'O motor de uma embarcação distante continua audível depois que os sapos da margem se calam. Não se vê nenhum barco passando.',
  'Algumas tábuas do cais exibem marcas de água acima do nível atual da represa. A madeira ao redor está seca.',
  'As pequenas ondulações seguem na direção do vento. Por um instante, uma faixa mais clara fica imóvel entre elas.',
  'Uma trilha termina na terra mais firme. Próximo dali, a vegetação parece ter sido afastada com as mãos.'
 ],
 casa:[
  'A janela parece bem fechada. Ainda assim, uma das dobras da cortina se mexe quando a madeira estala.',
  'O rádio está desligado, mas o vidro do mostrador conserva um pouco de calor. Talvez alguém o tenha usado recentemente.',
  'Na beirada do móvel, a madeira tem cheiro de algas. O assoalho junto à entrada, porém, está seco.',
  'Entre os papéis há datas anotadas com duas tintas diferentes. O traço de uma delas é consideravelmente mais recente.'
 ],
 capela:[
  'A cera de uma vela parece recente. As demais estão cobertas por uma camada uniforme de poeira.',
  'Por trás do altar, a argamassa apresenta uma linha de sal mais alta do que o nível das últimas cheias.',
  'Um som grave vem da estrutura quando uma rajada atravessa a porta. O badalo não parece ter se movido.',
  'Nas margens de um registro há números repetidos. Alguém tentou cobrir uma anotação anterior, mas a tinta antiga ainda aparece.'
 ]
};
const catalogue=[
 {name:'Espectros ligados a lugares',kind:'Aparição',effects:'Ar parado, sensação de frio, ruídos repetidos e reflexos anômalos.',limits:'Umidade ou frio isolados não demonstram atividade espiritual. Muitos relatos dependem da percepção da testemunha.'},
 {name:'Entidades das águas',kind:'Seres lacustres',effects:'Vozes perto da água, perturbações superficiais, sonhos recorrentes e objetos úmidos em lugares inesperados.',limits:'Vento, condensação e ecos podem produzir sinais parecidos. Não existe uma assinatura única.'},
 {name:'Imitadores de voz',kind:'Predadores e enganadores',effects:'Chamados com vozes conhecidas, pausas estranhas nas frases e memórias usadas para atrair pessoas.',limits:'Uma gravação ou uma pessoa também pode reproduzir vozes. O relato não prova a natureza de quem chamou.'},
 {name:'Vínculos e artefatos rituais',kind:'Maldições',effects:'Repetição de eventos, alterações concentradas em objetos, horários recorrentes e reações ao som.',limits:'O objeto pode provocar, registrar ou simplesmente coincidir com um fenômeno. É preciso distinguir essas possibilidades.'},
 {name:'Causas ambientais e humanas',kind:'Hipóteses não sobrenaturais',effects:'Frio junto à água, ruídos de estruturas, interferência no rádio, efeitos de luz, fraudes ou testemunhos imprecisos.',limits:'Uma explicação comum para um sinal não exclui a presença de outros fenômenos sem explicação.'}
];
let journalOpen=false;
let journalDraft='';
let journalType='Observação';
let sharedNotes=[];
const priorBestiary=bestiary;
const priorRender=render;
const priorApply=typeof applyCampaign==='function'?applyCampaign:null;
const active=()=>!!CASES[s.caseId];
const shared=()=>active()&&net.inGame&&net.mode==='coop';
const encode=t=>esc(String(t??''));
const localEntries=()=>{if(!Array.isArray(s.journalNotes))s.journalNotes=Array.isArray(s.lakeIdeas)?s.lakeIdeas:[];return s.journalNotes;};
const noteEntries=()=>shared()?sharedNotes:localEntries();
const bodyText=note=>{
 const raw=String(note.text||'');
 const match=raw.match(/^\[([^\]]{2,24})\] ([\s\S]*)$/);
 return {category:match?match[1]:'Anotação',body:match?match[2]:raw};
};
// Diálogos: detalhes concretos, sem transformar testemunhos em pistas nomeadas.
Object.assign(CASES.lago.witness.questions,{
 lembranca:{q:'Como foi a noite em que sua mãe desapareceu?',answer:'Estava abafado, nem uma folha mexia. Depois que ouvi a voz dela perto da represa, minhas mãos ficaram geladas. Achei que fosse nervoso. O rádio continuava ligado e, quando olhei, o relógio da cozinha marcava 00h17.',trust:1},
 barqueiro:{q:'O que seu avô dizia sobre a represa e a capela?',answer:'Ele ajudou na obra, mas se irritava quando perguntávamos pelo sino. Uma vez disse: “O lago devolve tudo, menos o que a gente deve a ele”. Talvez estivesse só se culpando pelo acidente antigo.',trust:0},
 promessa:{q:'Você reconhece a fita azul?',answer:'Minha mãe costumava amarrá-la no pulso, do mesmo jeito desde menina. Na última semana passou a dormir mal. Ela dizia ouvir alguém chamando pelo nome que só minha avó usava.',trust:1}
});
function pageAllowed(){
 return active()&&['hub','scene','witness','dossier','board','theory','bestiary','confrontation','ending'].includes(s.view);
}
function diaryMarkup(){
 const rows=noteEntries().slice().reverse();
 return '<div class="deepJournalOverlay" data-deep-journal-overlay>'+
 '<section class="deepJournal" role="dialog" aria-modal="true" aria-label="Diário da investigação">'+
 '<header><div><div class="eyebrow">ARQUIVO '+encode(CASES[s.caseId]?.number||'')+' · '+(shared()?'REGISTRO DA EQUIPE':'REGISTRO PESSOAL')+'</div><h2>Diário de investigação</h2></div><button type="button" class="deepJournalClose" data-deep-journal-close aria-label="Fechar diário">×</button></header>'+
 '<p>O jogo não destaca detalhes importantes nem escreve interpretações. Anote o que chamou sua atenção, mesmo que seja apenas uma suspeita.</p>'+
 (shared()?'<div class="deepTeamStatus">Todos os integrantes desta expedição podem ler e escrever. O registro fica salvo na sala.</div>':'')+
 '<div class="deepJournalEntries">'+(rows.length?rows.map(x=>{
  const detail=bodyText(x);
  return '<article class="deepEntry"><div><strong>'+encode(detail.category)+'</strong><small>'+encode(x.by||'Pesquisador')+'</small></div><p>'+encode(detail.body)+'</p></article>';
 }).join(''):'<p class="deepEmpty">O caderno está em branco. Nenhuma pista será anotada automaticamente.</p>')+'</div>'+
 '<form data-deep-journal-form><label for="deepJournalCategory">Tipo de anotação</label>'+
 '<select id="deepJournalCategory" name="type">'+journalTypes.map(t=>'<option value="'+encode(t)+'" '+(journalType===t?'selected':'')+'>'+encode(t)+'</option>').join('')+'</select>'+
 '<label for="deepJournalBody">Escreva com suas palavras</label><textarea id="deepJournalBody" name="body" maxlength="800" rows="6" placeholder="O que você notou? O que ainda não se explica?">'+encode(journalDraft)+'</textarea>'+
 '<button type="submit" '+(shared()&&net.paused?'disabled':'')+'>Salvar no diário</button></form>'+
 '</section></div>';
}
function observationMarkup(){
 const id=s.activeScene;
 if(!research[id])return '';
 const savedIndex=s.deepLookIndex?.[id];
 const examined=Number.isInteger(savedIndex)&&savedIndex>=0;
 return '<section class="deepLook"><div class="eyebrow">AO REDOR</div>'+
 (examined?'<p>'+encode(research[id][savedIndex%research[id].length])+'</p>':'<p>Há detalhes no ambiente que não aparecem à primeira vista.</p>')+
 '<button type="button" data-deep-observe>Olhar '+(examined?'novamente':'mais de perto')+'</button></section>';
}
function decorate(){
 if(!pageAllowed())return;
 const button=document.createElement('button');
 button.className='deepJournalTab';button.type='button';
 button.setAttribute('data-deep-journal-open','1');
 button.setAttribute('aria-label','Abrir diário de investigação');
 button.innerHTML='✎ <span>Diário'+(shared()?' da equipe':'')+'</span>';
 app.appendChild(button);
 // O jogador deve investigar os objetos em vez de receber dicas automáticas.
 if(journalOpen)app.insertAdjacentHTML('beforeend',diaryMarkup());
}
render=function(){priorRender();decorate();};
if(priorApply)applyCampaign=function(state,initial){
 sharedNotes=Array.isArray(state?.team?.investigation?.notes)?state.team.investigation.notes:[];
 return priorApply(state,initial);
};
bestiary=function(){
 const html=priorBestiary();
 if(!active())return html;
 const intro='<section class="section deepCatalogue"><div class="eyebrow">ARQUIVOS DE CONSULTA · INSTITUTO DO VÉU</div><h2>Guia de manifestações</h2>'+
 '<p>Estas fichas reúnem relatos e hipóteses conhecidos pelo Instituto. São comparações, não diagnósticos: sinais semelhantes aparecem em fenômenos diferentes.</p>'+
 catalogue.map(x=>'<details class="deepCreature"><summary><span>'+encode(x.name)+'</span><small>'+encode(x.kind)+'</small></summary><p><strong>Relatos associados:</strong> '+encode(x.effects)+'</p><p><strong>Limitações:</strong> '+encode(x.limits)+'</p></details>').join('')+
 '<p class="deepCatalogueTip">Compare o que você ouviu e observou. O catálogo não recebe marcações automáticas, não calcula probabilidades e não aponta a solução do caso.</p></section>';
 return intro+html.replace('As fichas são reveladas após a conclusão de cada investigação.','As fichas completas dos casos são liberadas após sua conclusão. As referências gerais acima permanecem disponíveis durante a investigação.');
};
document.addEventListener('click',event=>{
 if(!active())return;
 if(event.target.closest('[data-deep-journal-open]')){
  event.preventDefault();event.stopImmediatePropagation();journalOpen=true;render();return;
 }
 if(event.target.closest('[data-deep-journal-close]')||event.target.matches('[data-deep-journal-overlay]')){
  event.preventDefault();event.stopImmediatePropagation();journalOpen=false;render();return;
 }
 if(event.target.closest('[data-deep-observe]')){
  event.preventDefault();event.stopImmediatePropagation();
  const id=s.activeScene;
  if(!research[id])return;
  if(!s.deepLookIndex)s.deepLookIndex={};
  s.deepLookIndex[id]=Number.isInteger(s.deepLookIndex[id])?(s.deepLookIndex[id]+1)%research[id].length:0;
  persist(false);render();return;
 }
},true);
document.addEventListener('input',event=>{
 if(!active()||!journalOpen)return;
 if(event.target.id==='deepJournalBody')journalDraft=event.target.value;
 if(event.target.id==='deepJournalCategory')journalType=event.target.value;
},true);
document.addEventListener('submit',event=>{
 if(!active()||!event.target.matches('[data-deep-journal-form]'))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(shared()&&net.paused)return toast('Diário disponível para leitura. A edição será liberada quando a equipe se reconectar.');
 const form=new FormData(event.target);
 const text=String(form.get('body')||'').trim().slice(0,800);
 const type=String(form.get('type')||'Observação');
 if(text.length<3)return toast('Escreva sua observação antes de salvar.');
 const category=journalTypes.includes(type)?type:'Observação';
 const entry='['+category+'] '+text;
 journalDraft='';journalType=category;
 if(shared()){
  if(typeof campaignPush!=='function')return toast('Conexão com o diário da equipe indisponível.');
  campaignPush({op:'investigation',kind:'note',text:entry});return;
 }
 localEntries().push({text:entry,by:'Você'});
 s.journalNotes=s.journalNotes.slice(-100);
 if(s.caseId==='lago')s.lakeIdeas=s.journalNotes;
 persist(false);render();
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&journalOpen&&active()){
  event.preventDefault();journalOpen=false;render();
 }
},true);
const style=document.createElement('style');
style.textContent='.deepJournalTab{position:fixed;right:13px;bottom:90px;z-index:120;border-radius:28px;padding:11px 15px;color:#f0d9ad;background:#163641;border:1px solid #c9a66e;box-shadow:0 7px 19px #0009;font:700 13px system-ui;cursor:pointer}.deepJournalOverlay{position:fixed;inset:0;z-index:15000;display:flex;justify-content:center;align-items:center;padding:12px;background:#031018e8;backdrop-filter:blur(5px)}.deepJournal{box-sizing:border-box;width:min(540px,100%);max-height:min(94dvh,820px);overflow:auto;background:#11262f;border:1px solid #ac9168;border-radius:15px;padding:19px;box-shadow:0 20px 65px #000a;color:#e9e3d6}.deepJournal>header{display:flex;justify-content:space-between;gap:14px;align-items:start}.deepJournal h2{font:normal 26px Georgia,serif;color:#f0d5a9;margin:7px 0}.deepJournal>p{font:13px/1.6 system-ui;color:#bdcac7}.deepJournalClose{font-size:27px;background:transparent;color:#f6e1bb;border:0;cursor:pointer}.deepTeamStatus{font:12px/1.5 system-ui;color:#d8d2bf;background:#24434b;padding:9px;border-radius:7px}.deepJournalEntries{max-height:31dvh;min-height:50px;overflow:auto;margin:15px 0;border-top:1px solid #5b706b;border-bottom:1px solid #5b706b}.deepEntry{padding:11px 6px;border-bottom:1px solid #47646b55}.deepEntry>div{display:flex;justify-content:space-between;gap:10px;font:12px system-ui;color:#dfc596}.deepEntry small{color:#b3bebb}.deepEntry p{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.55 system-ui;margin:6px 0;color:#e5e9e3}.deepEmpty{color:#b5c1ba;font:13px/1.6 system-ui}.deepJournal form{display:grid;gap:8px}.deepJournal label{font:700 12px system-ui;color:#d8c6a1}.deepJournal select,.deepJournal textarea{box-sizing:border-box;width:100%;background:#09222a;color:#f2eee5;border:1px solid #6c8179;border-radius:8px;padding:11px;font:14px/1.5 system-ui}.deepJournal form button,.deepLook button{border:1px solid #bda476;border-radius:8px;color:#f6e0b8;background:#2d4b53;padding:11px 15px;cursor:pointer;font:700 13px system-ui}.deepJournal form button:disabled{opacity:.5}.deepLook{margin:12px 0 18px;padding:14px 17px;background:#152c34;border-left:3px solid #937d5a;border-radius:7px}.deepLook p{color:#d6dcd5;font:13px/1.65 system-ui}.deepCatalogue{margin:16px 0}.deepCatalogue h2{font:normal 27px Georgia,serif;color:#ecd4ab}.deepCatalogue>p{font:13px/1.7 system-ui;color:#c3d0cb}.deepCreature{padding:13px 15px;margin:9px 0;border:1px solid #796d5b;border-radius:9px;background:#172d35}.deepCreature summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#eddbbb}.deepCreature summary span{font-weight:700}.deepCreature summary small{color:#a8b6b1}.deepCreature p{font:13px/1.6 system-ui;color:#d3ddd9}.deepCatalogueTip{font-style:italic!important}@media(max-width:540px){.deepJournalTab{right:9px;bottom:90px;padding:11px 13px}.deepJournal{padding:15px}.deepJournalOverlay{padding:7px}}';
document.head.appendChild(style);
render();
})();