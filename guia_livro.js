'use strict';
/* Biblioteca de campo: leitura, comparação e navegação sem spoilers nem classificação automática. */
(function(){
 if(!window.MANIFEST_GUIDE||typeof bestiary!=='function')return;
 const atlas=window.MANIFEST_GUIDE;
 const oldBestiary=bestiary;
 let chosen=atlas.entries[0].id, family='all', sign='', q='', mode='details', indexOpen=true;
 const h=s=>esc(String(s??''));
 const f=id=>atlas.families.find(x=>x.id===id);
 const current=()=>atlas.entries.find(x=>x.id===chosen)||atlas.entries[0];
 const strip=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const traits=e=>e.signs.join(' ');
 function filtered(){
  const search=strip(q.trim());
  return atlas.entries.filter(e=>(family==='all'||e.family===family)&&(!sign||e.signs.includes(sign))&&(!search||strip([e.name,e.epithet,e.familyName,e.story,e.behavior,traits(e)].join(' ')).includes(search)));
 }
 function art(e,small=false){
  const i=e.n,group=e.family,seed=i*13,unique='a'+i+(small?'m':'d');
  const palettes={
   ecos:['#738d91','#1c3a42','#bdc7bd'],aguas:['#538c9a','#173d4c','#a7d4d5'],
   matas:['#748962','#293b31','#c5c5a0'],mimicos:['#a58ca0','#382e40','#d7c2c6'],
   pactos:['#b69a6c','#43392f','#dfc7a0'],noturnos:['#8c8ba9','#292b42','#bebecf'],
   feericos:['#ba9c83','#473e4a','#e0c8b0'],limiares:['#8ca6a0','#263e40','#d5d4ba']};
  const [primary,dark,light]=palettes[group];
  const variant=i%6,faceX=170+(i%3-1)*9,headY=155+(i%4)*3,eye=(i%2===0?3:0),marks=Array.from({length:14},(_,j)=>{const x=(j*67+seed*11)%335+4,y=(j*113+seed*3)%426+12;return '<circle cx="'+x+'" cy="'+y+'" r="'+(j%3+1)+'" fill="'+light+'" opacity="'+(.1+(j%4)*.06)+'"/>'}).join('');
  const body='<path d="M55 428Q77 337 115 298Q119 250 137 232L134 201Q130 170 145 158Q166 134 191 161Q217 186 196 216L204 252Q235 278 256 337L287 428Z" fill="'+dark+'" stroke="'+primary+'" stroke-width="3" opacity=".95"/>'+
  '<path d="M141 203Q157 '+(headY-39)+' 185 201Q190 239 168 242Q142 236 141 203Z" fill="'+primary+'" opacity=".15"/>'+
  '<path d="M148 205q12 '+eye+' 18 0M178 205q12 '+eye+' 18 0" stroke="'+light+'" stroke-width="3" opacity=".65" fill="none"/>';
  const variants={
   ecos:'<path d="M115 244Q66 297 95 368M204 244Q273 280 227 371" fill="none" stroke="'+light+'" stroke-width="4" opacity=".3"/><path d="M70 396Q170 370 279 407M83 415Q163 399 261 415" stroke="'+light+'" stroke-width="3" fill="none" opacity=".36"/>',
   aguas:'<path d="M16 342Q72 283 126 321T247 299T344 321M0 371Q96 332 152 364T349 362" fill="none" stroke="'+primary+'" stroke-width="8" opacity=".44"/><path d="M135 222Q111 246 143 266M199 211Q222 252 197 277" fill="none" stroke="'+light+'" stroke-width="3" opacity=".5"/>',
   matas:'<path d="M148 186Q123 110 84 79L68 36M133 145L100 126L84 93M182 188Q218 112 266 69L275 29M204 142L248 113L251 79" stroke="'+primary+'" stroke-width="8" fill="none"/><path d="M70 368Q101 348 110 317M241 368Q266 345 279 302" stroke="'+light+'" stroke-width="4" opacity=".4"/>',
   mimicos:'<path d="M125 182Q117 146 147 139Q171 131 189 150Q216 173 204 222L182 245L136 224Z" fill="'+dark+'" stroke="'+light+'" stroke-width="5" opacity=".7" transform="translate(30 -14)"/><path d="M165 194Q187 185 206 196M180 215Q193 214 206 220" fill="none" stroke="'+light+'" stroke-width="3"/>',
   pactos:'<circle cx="168" cy="214" r="102" fill="none" stroke="'+primary+'" stroke-width="4" opacity=".32"/><path d="M168 93V124M168 301V327M46 214H69M270 214H299M115 133l17 18M221 280l18 19" stroke="'+light+'" stroke-width="4" opacity=".4"/><path d="M135 284L166 250L192 284L168 325Z" fill="none" stroke="'+light+'" stroke-width="4" opacity=".52"/>',
   noturnos:'<path d="M149 293Q87 214 13 230Q31 288 87 317L32 328Q85 342 130 340M194 293Q264 211 330 233Q316 280 252 317L309 329Q240 344 205 341" fill="'+dark+'" stroke="'+primary+'" stroke-width="4"/><path d="M41 240l45 46M302 245l-48 48" stroke="'+light+'" stroke-width="3" opacity=".35"/>',
   feericos:'<path d="M151 271Q90 157 42 178Q15 208 52 257Q14 294 61 338Q113 350 153 284M189 271Q252 156 302 180Q335 222 285 262Q334 292 280 338Q225 345 189 285" fill="'+primary+'" opacity=".24" stroke="'+light+'" stroke-width="4"/><ellipse cx="76" cy="237" rx="14" ry="25" fill="'+light+'" opacity=".23"/><ellipse cx="263" cy="237" rx="14" ry="25" fill="'+light+'" opacity=".23"/>',
   limiares:'<path d="M66 432V97Q66 50 171 48Q276 50 276 97V432M92 432V115Q92 70 171 72Q250 70 250 115V432" fill="none" stroke="'+primary+'" stroke-width="12" opacity=".7"/><path d="M73 121Q171 18 269 121" stroke="'+light+'" stroke-width="3" fill="none" opacity=".38"/>'
  };
  const crest=['✦','⌘','◈','❧','◇','✧'][variant];
  return '<svg class="atlasArtwork '+(small?'atlasMiniArt':'atlasFullArt')+'" viewBox="0 0 340 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Prancha artística de '+h(e.name)+'">'+
   '<defs><radialGradient id="'+unique+'"><stop stop-color="'+primary+'" stop-opacity=".55"/><stop offset="1" stop-color="'+dark+'" stop-opacity="0"/></radialGradient><linearGradient id="'+unique+'b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+dark+'"/><stop offset="1" stop-color="#0a1119"/></linearGradient></defs>'+
   '<rect width="340" height="440" fill="url(#'+unique+'b)"/><circle cx="172" cy="202" r="164" fill="url(#'+unique+')"/>'+
   '<g opacity=".55">'+marks+'</g><path d="M18 28H322V412H18Z" fill="none" stroke="'+light+'" opacity=".38" stroke-width="2"/>'+
   '<path d="M27 36H53M287 36H313M27 404H53M287 404H313" stroke="'+light+'" stroke-width="4"/>'+
   variants[group]+body+
   '<text x="170" y="89" text-anchor="middle" fill="'+light+'" opacity=".55" font-family="serif" font-size="45">'+crest+'</text>'+
   '<rect x="30" y="374" width="280" height="33" rx="2" fill="#08151c" opacity=".83"/>'+
   '<text x="170" y="396" text-anchor="middle" fill="'+light+'" font-family="Georgia,serif" font-size="15" letter-spacing="1.1">'+h('PRANCHA '+String(i).padStart(2,'0'))+'</text></svg>';
 }
 function indexHTML(){
  const rows=filtered();
  const families=f;
  return '<div class="atlasIndexMeta"><span>'+rows.length+' entradas neste recorte</span><button type="button" data-atlas-reset>Limpar filtros</button></div>'+
   '<div class="atlasCatalogGrid">'+rows.map(e=>'<button class="atlasTile '+(e.id===chosen?'is-active':'')+'" type="button" data-atlas-entry="'+e.id+'" aria-label="Abrir verbete '+h(e.name)+'">'+
   '<span class="atlasTileArt">'+art(e,true)+'</span><span class="atlasTileText"><small>Nº '+String(e.n).padStart(2,'0')+' · '+h(e.familyName)+'</small><strong>'+h(e.name)+'</strong><em>'+h(e.epithet)+'</em></span></button>').join('')+
   (rows.length?'':'<p class="atlasNoResults">Nenhum verbete corresponde a esses termos. Remova um filtro para ampliar a pesquisa.</p>')+'</div>';
 }
 function signRefs(signName,entry){
  const peers=atlas.entries.filter(x=>x.signs.includes(signName)&&x.id!==entry.id);
  return peers.length?'<details class="atlasCrossRef"><summary>Outras '+peers.length+' manifestações com este relato <span>▾</span></summary>'+
   '<div class="atlasPeerList">'+peers.slice(0,14).map(x=>'<button type="button" data-atlas-entry="'+x.id+'">'+h(x.name)+'</button>').join('')+
   (peers.length>14?'<small>e outras '+(peers.length-14)+' fichas do arquivo</small>':'')+'</div></details>':'';
 }
 function detailHTML(){
  const e=current(),fam=f(e.family);
  return '<section class="atlasLeaf" aria-label="Ficha ilustrada da manifestação">'+
   '<div class="atlasLeafTop"><span>INSTITUTO DO VÉU · ARQUIVO COMPARATIVO</span><span>FOLHA '+String(e.n).padStart(2,'0')+' / '+atlas.entries.length+'</span></div>'+
   '<div class="atlasLeafTitle"><span class="atlasRoman">'+h(fam.symbol)+' · '+h(fam.name)+'</span><h3>'+h(e.name)+'</h3><p>'+h(e.epithet)+'</p></div>'+
   '<div class="atlasArtFrame">'+art(e,false)+'<div class="atlasArtCaption">Representação conjectural · Não corresponde a registro fotográfico</div></div>'+
   '<div class="atlasSmallPrint"><span>'+h(e.source)+'</span><span>'+h(e.confidence)+'</span></div>'+
   '<article class="atlasSection"><h4>Primeiros testemunhos</h4><p>'+h(e.story)+'</p></article>'+
   '<article class="atlasSection"><h4>Comportamento descrito</h4><p>'+h(e.behavior)+'</p></article>'+
   '<article class="atlasSection"><h4>Indícios também relatados em outras manifestações</h4><p>Estes sinais são compartilhados com muitas fichas. Nenhum deles identifica uma entidade isoladamente.</p>'+
   '<div class="atlasSigns">'+e.signs.map(t=>'<button class="atlasSignChip '+(sign===t?'selected':'')+'" type="button" data-atlas-sign="'+h(t)+'">'+h(t)+' <small>· '+atlas.entries.filter(x=>x.signs.includes(t)).length+'</small></button>').join('')+'</div></article>'+
   '<article class="atlasSection atlasContradiction"><h4>Leitura crítica e explicações concorrentes</h4><p>'+h(e.alternative)+'</p></article>'+
   '<article class="atlasSection"><h4>Questão em aberto</h4><p class="atlasQuestion">'+h(e.question)+'</p></article>'+
   '<div class="atlasBottomNav"><button type="button" data-atlas-prev>← Verbete anterior</button><span>✥</span><button type="button" data-atlas-next>Verbete seguinte →</button></div>'+
   '</section>';
 }
 function bookHTML(){
  return '<section class="atlasRoot"><div class="atlasBookCover"><div class="atlasCoverOrnament">✥ <span>INSTITUTO DE ESTUDOS DO VÉU</span> ✥</div>'+
   '<div class="atlasCoverCenter"><span>VOLUME I · EDIÇÃO DE CAMPO</span><h2>Atlas das<br><em>Manifestações</em></h2><div class="atlasCoverRule">❧ ✧ ❧</div>'+
   '<p>Um compêndio ilustrado de testemunhos, hipóteses e fenômenos que raramente se deixam nomear.</p></div>'+
   '<div class="atlasCoverFoot"><span>'+atlas.entries.length+' verbetes ilustrados</span><span>VIII linhagens</span><span>Identidades não confirmadas</span></div></div>'+
   '<div class="atlasBookShell"><div class="atlasBookToolbar"><div class="atlasToolbarTitle"><small>CONSULTA LIVRE · ÍNDICE DE CAMPO</small><strong>Leia, compare, duvide.</strong></div>'+
   '<div class="atlasLegend">O mesmo indício pode aparecer em muitas manifestações. Não existe identificação por um único sinal.</div></div>'+
   '<div class="atlasFilters"><label for="atlasSearch">Localizar nome, fenômeno ou relato</label><input id="atlasSearch" type="search" spellcheck="false" autocomplete="off" placeholder="Ex.: frio, sinos, vultos, água…" value="'+h(q)+'"/>'+
   '<div class="atlasFamilyScroll"><button data-atlas-family="all" class="'+(family==='all'?'active':'')+'">Todos</button>'+
   atlas.families.map(x=>'<button type="button" data-atlas-family="'+x.id+'" class="'+(family===x.id?'active':'')+'">'+h(x.symbol)+' '+h(x.name)+'</button>').join('')+'</div>'+
   (sign?'<div class="atlasSelectedFilter">Comparando indício: <b>'+h(sign)+'</b> <button type="button" data-atlas-sign="">Remover ×</button></div>':'')+
   '</div><div class="atlasPages"><aside class="atlasIndex"><div class="atlasIndexHeading"><span>Índice alfabético de campo</span><small>Selecione uma ficha para ler</small></div><div class="atlasIndexBody">'+indexHTML()+'</div></aside>'+
   '<div class="atlasReading">'+detailHTML()+'</div></div></div>'+
   '<div class="atlasClosing"><span>✧</span><p>As ilustrações são reconstruções artísticas. O arquivo não nomeia a resposta de nenhum caso, não atribui probabilidades a criaturas e não registra automaticamente as pistas da investigação.</p></div></section>';
 }
 const original=oldBestiary;
 bestiary=function(){
  const usual=original();
  // O livro deve ser consultável em todos os casos, preservando as fichas desbloqueáveis.
  return bookHTML()+'<section class="atlasCaseRecords"><h3>Registros de missões concluídas</h3>'+
   usual.replace(/<section class="section deepCatalogue">[\s\S]*?<\/section>/,'')+'</section>';
 };
 function replace(){
  const old=app.querySelector('.atlasRoot');
  if(!old)return;
  old.outerHTML=bookHTML();
 }
 document.addEventListener('click',e=>{
  const x=e.target.closest('[data-atlas-entry],[data-atlas-family],[data-atlas-sign],[data-atlas-prev],[data-atlas-next],[data-atlas-reset]');
  if(!x)return;
  if(!app.querySelector('.atlasRoot'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(x.hasAttribute('data-atlas-entry')){chosen=x.dataset.atlasEntry;mode='details';}
  if(x.hasAttribute('data-atlas-family')){family=x.dataset.atlasFamily;sign='';}
  if(x.hasAttribute('data-atlas-sign')){sign=x.dataset.atlasSign;}
  if(x.hasAttribute('data-atlas-reset')){family='all';sign='';q='';}
  if(x.hasAttribute('data-atlas-prev')||x.hasAttribute('data-atlas-next')){
   const at=atlas.entries.findIndex(en=>en.id===chosen);
   chosen=atlas.entries[(at+(x.hasAttribute('data-atlas-next')?1:atlas.entries.length-1))%atlas.entries.length].id;
  }
  replace();
  // Keep navigation book-centered, without resetting the game's persistent state.
  if(x.hasAttribute('data-atlas-entry')&&window.matchMedia('(max-width:760px)').matches){
   app.querySelector('.atlasLeaf')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
 },true);
 document.addEventListener('input',e=>{
  if(e.target.id!=='atlasSearch')return;
  q=e.target.value;
  const root=e.target.closest('.atlasRoot');if(!root)return;
  const index=root.querySelector('.atlasIndexBody');
  if(index)index.innerHTML=indexHTML();
 },true);
})();