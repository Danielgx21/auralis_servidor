'use strict';
// Tutorial não altera missões, créditos, votos ou a sala.
const TUTORIAL_STEPS=[
 ['Bem-vindo ao Instituto','Você é um pesquisador de criaturas sobrenaturais. Escolha uma investigação, reúna evidências, converse com testemunhas e decida o destino da criatura.','home','Use Próximo para conhecer cada elemento. O tutorial é apenas demonstrativo.'],
 ['Tela inicial e Início','O botão Início (⌂) leva a esta tela de qualquer lugar. “Retomar missão” devolve você à investigação, sem apagar pistas e, no multiplayer, sem abandonar sua sala.','home','Você pode consultar o menu e voltar depois.'],
 ['Arquivos de investigação','Em Escolher investigação, toque na capa de um caso disponível. Há 14 arquivos: sete histórias iniciais e suas continuações. Uma continuação exige concluir o arquivo anterior.','cases','Os arquivos bloqueados exibem o requisito.'],
 ['Dossiê e começar','O dossiê explica onde aconteceu o mistério, quem foi afetado e o objetivo. Toque em Iniciar investigação para entrar. Algumas histórias incluem um ritual introdutório.','brief','Leia as informações antes de procurar pistas.'],
 ['Mapa e locais','No mapa aparecem os ambientes que você pode investigar. Toque em um local para abrir a cena. O indicador 0/9 mostra quantas pistas foram descobertas.','map','Visite todos os ambientes para não perder pistas.'],
 ['Encontrar pistas','Nas cenas, toque nos pontos brilhantes ✦. Cada descoberta entra automaticamente no dossiê. No cooperativo, os símbolos apagados indicam pistas reservadas à especialidade de outro jogador.','clue','As pistas coletadas podem ser revisadas no Dossiê.'],
 ['Testemunhas','Abra a seção Testemunha e toque nas perguntas disponíveis. Os depoimentos ajudam a compreender o caso e podem aumentar a confiança para negociar o final.','witness','Converse antes de apresentar a hipótese.'],
 ['Dossiê e quadro de provas','O Dossiê lista o que já foi descoberto. No Quadro de provas, conecte dois indícios e escolha a interpretação correta. Um acerto comprova uma ligação importante.','board','Não é preciso acertar na primeira tentativa.'],
 ['Enigmas e equipamentos','Certos casos têm desafios especiais. Use ferramentas da Loja para ajudar: por exemplo, Pó de Rastros revela pistas e o gravador registra depoimentos. Equipamentos não são obrigatórios.','tools','O inventário e as compras são guardados.'],
 ['Teorias','Quando reunir pistas suficientes, abra Teorias e escolha quem você acredita estar por trás do mistério. A teoria correta melhora o relatório e pode influenciar decisões.','theory','Revise pistas, testemunhas e o quadro antes de confirmar.'],
 ['Desfecho','Depois da revelação, decida o destino da criatura. Algumas alternativas exigem provas, confiança ou enigmas resolvidos. A conclusão registra consequências e pode liberar uma continuação.','ending','Escolhas diferentes podem mudar a história.'],
 ['Loja, créditos e sede','Você ganha créditos ao investigar e concluir casos. Na Loja compra ferramentas; na Sede amplia o Instituto e encontra contratos e os controles de música.','shop','Os créditos são individuais; a expedição também tem um cofre coletivo.'],
 ['Jogar com amigos','No menu Jogar online, crie uma sala de 2 a 5 pessoas e compartilhe o código. No cooperativo, cada integrante tem pistas exclusivas e o grupo vota nas decisões. No competitivo, os relatórios são comparados.','multi','A coordenação inicia a missão quando o grupo está completo.'],
 ['Sair, voltar e recuperar','Use ⌂ Início para voltar à tela principal sem perder a missão. “Sair da missão” abre opções de pausa; abandonar para todos exige confirmação do coordenador. Guarde sua chave de recuperação para entrar com a mesma identidade em outro aparelho.','exit','Sair da sala é diferente de apenas voltar ao início.'],
 ['Som e início da partida','A música começa desligada. Toque no ícone ♪ na parte superior para ativá-la, ou acesse a Sede para trocar a atmosfera e ajustar o volume. Você já conhece o básico.','audio','Feche este tutorial e escolha seu primeiro arquivo!']
];
let tutorialStep=0,tutorialVisible=false;
function tutorialArt(kind){
 const art={
 home:'⌂  INÍCIO       ▶  RETOMAR',
 cases:'📁   001   002   003',
 brief:'▤  DOSSIÊ   →  INVESTIGAR',
 map:'🗺  LOCAL A     LOCAL B     LOCAL C',
 clue:'✦      ◈       ✦       ◈',
 witness:'🗣  PERGUNTA 1   PERGUNTA 2',
 board:'[ PISTA A ]  +  [ PISTA B ]  =  ?',
 tools:'✧   PÓ    GRAVADOR   LANTERNA',
 theory:'◉  TEORIA A      ○ TEORIA B',
 ending:'♢  NEGOCIAR    ◆  SELAR',
 shop:'◈  CRÉDITOS      ♜  SEDE',
 multi:'👤    👤    👤    SALA: ABC123',
 exit:'⌂ INÍCIO     ↩ RETOMAR',
 audio:'♪  SOM      ♫  ATMOSFERA'
 };
 return art[kind]||'✦   MANUAL DAS CRIATURAS   ✦';
}
function renderTutorial(){
 document.getElementById('manualTutorialOverlay')?.remove();
 if(!tutorialVisible)return;
 const [title,info,kind,hint]=TUTORIAL_STEPS[tutorialStep];
 const d=document.createElement('div');d.id='manualTutorialOverlay';d.className='tutorialOverlay';
 d.innerHTML='<div class="tutorialPanel" role="dialog" aria-modal="true" aria-label="Tutorial do jogo">'+
 '<div class="tutorialHead"><span>✦ APRENDER A JOGAR</span><button type="button" data-tutorial="close" aria-label="Fechar tutorial">✕</button></div>'+
 '<div class="tutorialCount">PASSO '+(tutorialStep+1)+' DE '+TUTORIAL_STEPS.length+'</div>'+
 '<div class="tutorialBar"><span style="width:'+((tutorialStep+1)/TUTORIAL_STEPS.length*100)+'%"></span></div>'+
 '<h2>'+title+'</h2><div class="tutorialExample" aria-hidden="true">'+tutorialArt(kind)+'</div>'+
 '<p>'+info+'</p><div class="tutorialTip">✧ '+hint+'</div>'+
 '<div class="tutorialActions"><button type="button" data-tutorial="back" '+(tutorialStep===0?'disabled':'')+'>← Anterior</button>'+
 '<button type="button" data-tutorial="next">'+(tutorialStep===TUTORIAL_STEPS.length-1?'Concluir ✓':'Próximo →')+'</button></div>'+
 '<button type="button" class="tutorialSkip" data-tutorial="close">Sair do tutorial e jogar</button></div>';
 document.body.append(d);
}
function openManualTutorial(){tutorialStep=0;tutorialVisible=true;renderTutorial();}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-tutorial]');
 if(!t)return;e.preventDefault();e.stopImmediatePropagation();
 const a=t.dataset.tutorial;
 if(a==='open'){openManualTutorial();return;}
 if(a==='close'){tutorialVisible=false;renderTutorial();return;}
 if(a==='back'){tutorialStep=Math.max(0,tutorialStep-1);renderTutorial();return;}
 if(a==='next'){
   if(tutorialStep>=TUTORIAL_STEPS.length-1){tutorialVisible=false;renderTutorial();return;}
   tutorialStep++;renderTutorial();return;
 }
},true);
const originalTutorialRender=render;
render=function(){
 originalTutorialRender();
 const container=app.querySelector('.coverInner');
 if(container){
   const b=document.createElement('button');
   b.type='button';b.className='manualTutorialStart';b.dataset.tutorial='open';
   b.textContent='Tutorial: aprenda a jogar';container.append(b);
 }
 // A ajuda fica disponível de qualquer tela, em conjunto com o botão Início.
 if(s.view!=='title'){
   const b=document.createElement('button');
   b.type='button';b.className='manualHelpQuick';b.dataset.tutorial='open';
   b.textContent='Ajuda';b.setAttribute('aria-label','Abrir tutorial do jogo');
   const quickBar=app.querySelector('.manualQuickBar');
   if(quickBar)quickBar.append(b);else app.prepend(b);
 }
 if(tutorialVisible)renderTutorial();
};
render();
