'use strict';
/* Arquivo 002 — versão cooperativa narrativa e documental.
 * Isolada de todos os demais arquivos. */
(function(){
 if(typeof CASES==='undefined'||!CASES.baile)return;
 const C=CASES.baile;
 C.title='O Baile das Sete Cores — As Dezoito Cadeiras';
 C.short='O Baile das Sete Cores';
 C.subtitle='Dezoito pessoas desapareceram durante uma apresentação beneficente.';
 C.type='DESAPARECIMENTO · EVENTO BENEFICENTE';
 C.place='Palácio de Véspera · São Clemente';
 C.danger='Alto · portas e iluminação instáveis';
 C.victims='18 convidados desaparecidos; 36 localizados';
 C.brief='O Palácio de Véspera recebeu 54 convidados para um baile beneficente organizado pela Fundação Serrat. Quando a apresentação terminou, 18 não estavam mais no salão. Ninguém os viu sair pelos portões. Há listas de presença diferentes, uma interrupção no circuito de iluminação e depoimentos que não coincidem. A polícia isolou o edifício; o Instituto recebeu autorização para examinar os registros antes que o palácio seja reaberto.';
 C.v2Lead=C.brief;
 C.v2Report='Descubra o que ocorreu aos 18 convidados, reconstitua as mudanças de iluminação e identifique a manifestação envolvida.';
 C.intro=C.brief;
 C.quote='“Contei cinquenta e quatro na entrada. Depois contei trinta e seis. Não vi dezoito pessoas saindo.” — Dália, recepção';
 C.v2Mode='coop';C.minClues=10;C.v2MinClues=10;
 C.ritual=false;C.phaseNames=null;C.phaseText='';C.phaseHint='';C.phase=0;
 C.puzzle=['violeta','dourado','azul'];C.puzzleTitle='Controle de iluminação — última apresentação';
 C.puzzleHint='Os três registros estão em setores diferentes. Compare a ordem dos horários: bilheteria, cabine de iluminação e partitura.';
 C.puzzleMessage='A mesa de luz preserva três comandos de uma sequência interrompida. Reconstrua a ordem em que as cores foram acionadas. Uma decisão errada não apaga provas.';
 C.v2Goal={title:'Reconstituir a última apresentação',description:'Compare os registros de entrada com o controle de luz e a anotação do músico. A identificação da criatura deve ser fundamentada nas evidências, não em um único sinal.',clues:['v2_a_2','v2_b_2','v2_c_2'],puzzle:true,puzzleLabel:'Sequência de luzes'};
 C.creature='O Anfitrião Prismático';C.correct='prism';C.creatureType='Arquivista das sensações';
 C.creatureText='Relatos sobre um anfitrião sem aparência fixa descrevem salões onde as lembranças dos convidados são trocadas ou retidas. Seu vínculo com objetos de vidro ou prismas é uma hipótese, não uma identificação por um único vestígio.';
 C.image='assets/arquivo002/sala.svg';C.creatureImage='assets/arquivo002/revelacao.svg';
 const loc={
  portao:['Portaria e lanternas','A última contagem','O livro de entrada registra 54 pessoas. Há uma folha de conferência solta e um armário de envelopes. O portão foi isolado pela polícia.',['taca','convite','pegada']],
  sala:['Salão principal','Onde as cadeiras ficaram vazias','O piso do salão foi marcado pela perícia. Há 18 cadeiras sem ocupantes, um relógio parado e objetos esquecidos sobre algumas mesas.',['relogio','mascara','arco']],
  jardim:['Galeria dos espelhos','A passagem para o jardim','O jardim interno tem uma saída de serviço e uma parede de espelhos. O vidro conserva marcas de dedos e o solo está úmido.',['flor','pacto','prisma']],
  v2_a:['Bilheteria e registros','Entradas divergentes','Três vias do controle de entrada estão guardadas na bilheteria. Nem todas foram preenchidas pela mesma pessoa.',['v2_a_1','v2_a_2','v2_a_3']],
  v2_b:['Cabine de iluminação','Painel de luz e relés','O painel controla sete cores de refletores. Há anotações de uma manutenção e um histórico de acionamentos.',['v2_b_1','v2_b_2','v2_b_3']],
  v2_c:['Sala da orquestra','A partitura do encerramento','A orquestra saiu do prédio, mas os instrumentos e a partitura usada no encerramento foram preservados.',['v2_c_1','v2_c_2','v2_c_3']],
  v2_d:['Cozinha e corredor de serviço','A rota dos funcionários','A cozinha conserva comandas e uma porta para o corredor de carga. O livro de turnos foi recolhido após o evento.',['v2_d_1','v2_d_2','v2_d_3']],
  v2_e:['Camarim das máscaras','Uma peça fora do inventário','Máscaras cerimoniais foram emprestadas para o baile. Um armário está aberto e uma peça não consta na lista de empréstimos.',['v2_e_1','v2_e_2','v2_e_3']]
 };
 C.scenes={};
 for(const [id,[name,subtitle,intro,items]] of Object.entries(loc)){
  C.scenes[id]={name,subtitle,intro,items,image:'assets/arquivo002/'+id+'.svg',artMode:'pintura-integrada'};
 }
 const facts={
  taca:['Taça não consumida','Uma taça ficou sobre a mesa da portaria. O fundo tem um resíduo violeta e marcas de impressão digital. Não é possível determinar, só pela cor, se houve adulteração de bebida.',26,76],
  convite:['Convite com assinatura divergente','O convite destinado a uma das pessoas desaparecidas tem número de série válido. O espaço da assinatura foi preenchido com uma tinta diferente da usada na lista principal.',55,45],
  pegada:['Rastro no piso externo','Marcas de sola molhada terminam junto ao portão lateral. Não há sinal claro de passagem pelo lado externo.',77,76],
  relogio:['Relógio de parede','O relógio está parado às 22h19. O aparelho pode ter perdido energia na interrupção elétrica; não prova o momento do desaparecimento.',28,35],
  mascara:['Máscara sobre a mesa','Uma máscara espelhada foi deixada junto a uma cadeira vazia. O verso está identificado com um número de inventário parcialmente coberto.',53,64],
  arco:['Porta junto ao palco','Uma porta ao lado do palco leva a um corredor sem acesso direto à rua. A fechadura mostra marcas recentes de uso.',79,53],
  flor:['Vidro com impressões','O espelho mais próximo da passagem tem marcas de mãos em alturas diferentes. Parte da superfície foi limpa recentemente.',26,49],
  pacto:['Livro do guarda-volumes','O registro de objetos depositados informa números de fichas e sobrenomes. Dezoito linhas foram preenchidas depois do fechamento oficial.',54,75],
  prisma:['Fragmento de vidro multicor','Um fragmento angular foi encontrado perto de uma fonte ornamental. Ele reflete cores diferentes sob a mesma lâmpada; a origem precisa ser identificada.',78,68],
  v2_a_1:['Livro oficial de entradas','O controle da portaria registra 54 entradas até 21h55 e 36 convidados localizados depois da apresentação. Não há anotações de saída para os dezoito restantes.',26,69],
  v2_a_2:['Folha de programação da bilheteria','A programação de apoio inclui uma marcação de luz violeta às 22h08 para a abertura. A folha não registra o que ocorreu depois.',55,46],
  v2_a_3:['Segunda via de convites','Dezoito canhotos foram lançados no sistema depois do fechamento das impressões. Os números não correspondem a novos nomes de convidados.',79,73],
  v2_b_1:['Intervenção no circuito','Um dos módulos da iluminação foi trocado antes da apresentação. A ordem de manutenção não informa quem aprovou a troca.',27,72],
  v2_b_2:['Registro do painel de luz','O painel registra o acionamento da luz dourada às 22h11. O comando veio da mesa local, não do temporizador automático.',53,48],
  v2_b_3:['Disjuntor e alimentação','O disjuntor de uma linha lateral foi desligado manualmente às 22h18. O corte pode explicar a interrupção do vídeo das câmeras.',79,71],
  v2_c_1:['Amostra de ensaio','O gravador da orquestra tem um ensaio realizado às 18h30. Há uma pausa que não coincide com a versão executada à noite.',25,70],
  v2_c_2:['Partitura do encerramento','Na partitura usada no evento consta a anotação “AZUL — 22h14” junto a uma pausa do violino. A escrita é diferente das demais indicações.',55,49],
  v2_c_3:['Partes do programa musical','Uma folha informa que o encerramento foi adiantado. A assinatura de aprovação não é legível.',78,72],
  v2_d_1:['Comandas da última rodada','A cozinha preparou 54 porções, mas apenas 36 bandejas voltaram à área de recolhimento. Isso não demonstra que todos tenham comido.',26,72],
  v2_d_2:['Registro da porta de carga','O sensor da porta de serviço indica abertura às 22h18 e fechamento às 22h21. O registro não informa quem entrou.',53,49],
  v2_d_3:['Escala dos funcionários','Uma pessoa foi acrescentada à escala depois de impressa. Não há confirmação de que tenha comparecido.',79,73],
  v2_e_1:['Inventário das máscaras','O inventário informa 36 máscaras de uso comum e uma peça especial de vidro. O recebimento da peça especial não tem assinatura.',26,73],
  v2_e_2:['Fotografia do camarim','Uma fotografia tirada antes do baile mostra a máscara especial sobre a mesa. Após o evento, ela não aparece no mesmo lugar.',54,48],
  v2_e_3:['Bilhete sem destinatário','Um bilhete dobrado traz: “Não entregue a peça de vidro antes do último número.” Não há nome nem assinatura, e o papel não tem data.',77,71]
 };
 C.clues={};
 for(const [id,[name,detail,x,y]] of Object.entries(facts))
  C.clues[id]={name,detail,insight:'',x,y,hitW:17,hitH:15,phase:null};
 C.v2Locations={
  v2_a:{role:'archivist',theme:'archive'},
  v2_b:{role:'analyst',theme:'machine'},
  v2_c:{role:'sensitive',theme:'theater'},
  v2_d:{role:'tracker',theme:'kitchen'},
  v2_e:{role:'diplomat',theme:'dressing'}
 };
 C.witness={
  name:'Dália Monteiro',role:'Recepcionista do baile',image:'assets/arquivo002/dalia.svg',
  intro:'Dália fez a conferência dos convites na portaria do Palácio de Véspera. Foi quem avisou à polícia que dezoito convidados não foram encontrados.',
  questions:{
   nome:{q:'Quantas pessoas você registrou?',answer:'Cinquenta e quatro. Fui contando conforme as pessoas entregavam os convites. Na segunda conferência localizamos só trinta e seis.',trust:1},
   anfitriao:{q:'Quem autorizou uma segunda via de convites?',answer:'A fundação pediu cópias para convidados que perderam os originais. Não sei quem entregou cada cópia na noite do baile.',trust:0},
   fuga:{q:'Você viu alguém usar a saída lateral?',answer:'Não. Passei a maior parte da noite na entrada. Depois que as luzes falharam, fui ao salão ajudar a contar as pessoas.',trust:1}
  }
 };
 C.v2PrimaryQuestionIds=['nome','anfitriao','fuga'];
 const witnesses=[
  ['v2_w1','Anselma Porto','Arquivista da fundação','Guarda as listas de entrada e a documentação da bilheteria. Não estava no salão no encerramento.','archivist',[18*60,24*60],[
   ['Você guardou as três vias do controle?','Sim. A portaria entregou uma, o sistema imprimiu outra e a terceira veio da direção. Nenhuma é idêntica às demais.'],
   ['Quem solicitou as cópias extras?','O pedido aparece no memorando da fundação, mas sem o nome de quem retirou os canhotos.'],
   ['Por que a folha da programação está na bilheteria?','Era a cópia usada para abrir as portas após o primeiro sinal de iluminação. Os registros posteriores pertencem à cabine e à orquestra.']
  ]],
  ['v2_w2','Rui Valença','Técnico de iluminação','Operou a mesa de luz no encerramento e fez a manutenção dos refletores.','analyst',[19*60,1*60],[
   ['Qual era sua tarefa no encerramento?','Acionar a mesa conforme os sinais do maestro. O circuito automático estava em teste.'],
   ['O que ocorreu com o módulo trocado?','A empresa instalou uma peça nova. Não recebi laudo. A câmera do corredor parou depois que o disjuntor foi aberto.'],
   ['Quem mandou cortar a linha lateral?','Recebi uma ordem verbal de Helena. Ela disse que a câmera estava prejudicando a montagem do espetáculo. Não sei se foi esse o motivo real.']
  ]],
  ['v2_w3','Luan Meireles','Violinista da orquestra','Estava no palco quando a iluminação se apagou por alguns segundos.','sensitive',[20*60,2*60],[
   ['O que aconteceu durante a última música?','Houve uma pausa que não tínhamos ensaiado. Eu parei de tocar e ouvi um segundo violino, embora estivesse sozinho naquela parte.'],
   ['Você reconhece a anotação na partitura?','A palavra AZUL não é minha. No ensaio de tarde não havia sinal de luz nessa passagem.'],
   ['Havia alguém perto da porta lateral?','Vi um reflexo de máscara onde deveria estar apenas a parede. Pode ter sido um efeito de iluminação; não vi uma pessoa atravessando a porta.']
  ]],
  ['v2_w4','Teresa Braga','Supervisora do serviço','Coordenou a cozinha e os funcionários de bandeja. Reconhece os acessos de serviço.','tracker',[18*60,24*60],[
   ['Como funcionava a distribuição das mesas?','A cozinha recebeu uma relação com cinquenta e quatro lugares. Houve alterações pouco antes do evento.'],
   ['O corredor de carga foi usado à noite?','Um sensor disparou quando eu já estava recolhendo bandejas. Não vi quem abriu a porta.'],
   ['Você encontrou alguma coisa depois?','Uma bandeja ficou no corredor, com um pedaço de vidro preso no pano de limpeza. Entreguei o objeto à perícia.']
  ]],
  ['v2_w5','Helena Serrat','Diretora da fundação','Organizou o baile beneficente e autorizou mudanças na estrutura do palácio.','diplomat',[20*60,1*60],[
   ['Qual era a finalidade do evento?','Arrecadar fundos para restaurar o palácio. Contratamos músicos, iluminação e buffet. As listas foram feitas pela equipe administrativa.'],
   ['Quem aprovou a alteração das listas?','Autorizei segundas vias por causa de convites extraviados. Não autorizei mudar a contagem depois da entrada.'],
   ['Por que pediu o desligamento do circuito?','Solicitei silêncio e menos luz na passagem durante o encerramento. Não acompanhei a execução técnica. Se houve irregularidade, os registros precisam ser examinados.']
  ]]
 ];
 C.v2Witnesses={};
 for(const [key,name,job,intro,role,hours,rows] of witnesses){
  const ids=rows.map(([q,answer],i)=>{const id=key+'_'+(i+1);C.witness.questions[id]={q,answer,trust:i===0?1:0};return id});
  C.v2Witnesses[key]={name,job,intro,role,hours,ids,image:'assets/arquivo002/'+key+'.svg'};
 }
 C.outcomes.libertar={
  ...C.outcomes.libertar,label:'Interromper a sequência e procurar os desaparecidos',
  desc:'Desligar a mesa de luz e examinar a passagem ligada aos espelhos.',
  needs:{correct:true,puzzle:true,clues:['prisma','v2_b_3','v2_e_2','arco']},
  unlock:'Exige identificar a criatura, reconstruir a iluminação e examinar o acesso lateral, o vidro e a máscara.',
  title:'As cadeiras voltam a ter nomes',
  text:'Com a sequência interrompida, os espelhos perdem a luminosidade anormal. Os 18 convidados reaparecem no corredor interno, confusos, mas vivos. A perícia mantém o palácio isolado para investigar a adulteração das listas e do circuito elétrico.',
  after:'Dália reconhece os nomes da primeira lista. As lembranças dos convidados não retornam todas de imediato.',
  impact:'18 pessoas encontradas · Risco contido'
 };
 C.outcomes.negociar={
  ...C.outcomes.negociar,label:'Propor uma troca de lembranças',
  desc:'Tentar libertar o grupo sem danificar a máscara especial.',
  needs:{correct:true,clues:['pacto','v2_e_1'],witness:['nome'],trust:1},
  unlock:'Exige o livro de fichas, o inventário e um depoimento de Dália.',
  title:'Memórias emprestadas',
  text:'Uma voz aceita devolver os desaparecidos em troca de um registro de memórias. Quatorze pessoas reaparecem. Quatro continuam ausentes. Não está claro se o acordo permanecerá válido.',
  after:'O Instituto recolhe o inventário. A fundação aceita suspender os eventos no palácio.',
  impact:'14 resgatados · 4 desaparecidos'
 };
 C.outcomes.expor={
  ...C.outcomes.expor,label:'Entregar os registros à investigação oficial',
  desc:'Priorizar as responsabilidades humanas e manter a busca.',
  needs:{puzzle:true,clues:['v2_a_3','v2_b_3','v2_d_2'],witness:['v2_w5_2']},
  unlock:'Exige os canhotos, os registros do disjuntor e do corredor, além do depoimento da direção.',
  title:'O palácio permanece fechado',
  text:'As inconsistências na bilheteria e nos comandos elétricos são entregues à polícia. O Palácio de Véspera permanece interditado. A busca pelos 18 convidados prossegue; as provas não permitem atribuir tudo a uma fraude ou a uma manifestação.',
  after:'A fundação é investigada. O Instituto conserva os depoimentos sobre a iluminação e os reflexos.',
  impact:'Investigação oficial · Busca inconclusa'
 };
 C.outcomes.selar={
  ...C.outcomes.selar,label:'Isolar o palácio sem concluir a investigação',
  desc:'Evitar novos visitantes, mas interromper as buscas dentro do edifício.',
  needs:{},unlock:'Sempre possível.',
  title:'O portão lacrado',
  text:'Os portões são fechados e o evento é cancelado. Nenhum dos dezoito desaparecidos é encontrado nesta operação. As provas ficam preservadas para uma nova equipe.',
  after:'Dias depois, chegam convites sem remetente a pessoas que não estiveram no baile.',
  impact:'Local isolado · Desaparecidos não encontrados'
 };
 C.revealTitle='Relatório de investigação — Arquivo 002';
 C.v2Truth='Os 18 convidados desapareceram durante o encerramento, mas a existência de canhotos adicionais não comprova uma saída clandestina. A fundação autorizou cópias de convites, e alguém desligou manualmente o circuito que alimentava parte das câmeras. Em três registros independentes, a sequência de luzes é violeta, dourado e azul. Os relatos sobre a máscara e os reflexos não têm explicação exclusivamente técnica comprovada. O conjunto é compatível com descrições do Anfitrião Prismático, embora fraudes administrativas também façam parte da história.';
 C.reveal=C.v2Truth;C.conclusion=C.v2Truth;
 C.revealQuote='“Não confundam o que registramos com aquilo que imaginamos que aconteceu.” — Relatório do Instituto';
 const documents={
  convite:['Convite numerado','Bilheteria, envelope do convidado',['Palácio de Véspera — Baile de Beneficência. Entrada individual mediante conferência no portão.','Série 214. A assinatura está sobre uma rasura, em tinta diferente da numeração impressa.','A impressão original não traz orientação sobre bebidas, rituais ou cores.']],
  pacto:['Livro de guarda-volumes','Galeria dos espelhos',['O serviço recebeu bolsas, casacos e máscaras mediante fichas numeradas.','Dezoito linhas foram preenchidas depois do horário registrado para o fechamento do guarda-volumes.','É preciso comparar os sobrenomes com os controles da bilheteria.']],
  v2_a_1:['Livro de entradas','Bilheteria',['21h55 — Encerramento da contagem: 54 convidados registrados na entrada.','22h21 — Recontagem no salão: 36 pessoas localizadas.','Não há lançamentos de saída para as 18 restantes.']],
  v2_a_2:['Programação da portaria','Bilheteria',['Abertura 20h00. Encerramento musical previsto para depois das 22h.','22h08 — Sinal de abertura do número final: LUZ VIOLETA.','A bilheteria não registra os comandos da mesa de iluminação após esse sinal.']],
  v2_a_3:['Canhotos de entrada','Bilheteria',['Dezoito canhotos adicionais aparecem na via enviada pela direção.','Os números repetem séries já impressas, mas não acrescentam novos nomes ao controle principal.','A rubrica de recebimento dos canhotos não foi preenchida.']],
  v2_b_1:['Ordem de manutenção','Cabine de iluminação',['Instalação de um módulo de controle de luz na tarde do evento.','A peça substituída não foi identificada na nota fiscal anexada.','Não há confirmação de inspeção depois da montagem.']],
  v2_b_2:['Log da mesa de iluminação','Cabine de iluminação',['22h11 — Comando manual: LUZ DOURADA (âmbar).','22h16 — A mesa registra queda temporária de comunicação com o circuito lateral.','O log registra comandos, não pessoas ou fatos ocorridos no salão.']],
  v2_b_3:['Histórico do circuito lateral','Cabine de iluminação',['22h18 — Disjuntor de alimentação do corredor lateral: DESLIGADO NO PAINEL.','O circuito alimentava também a câmera do corredor, mas não a portaria principal.','22h24 — Alimentação restaurada. O equipamento não informa quem acionou o disjuntor.']],
  v2_c_1:['Áudio de ensaio','Sala da orquestra',['18h30 — Ensaio geral da última peça.','A pausa antes do encerramento é de uma medida.','O registro da noite tem uma pausa maior; ainda não se sabe se foi improviso ou interrupção.']],
  v2_c_2:['Partitura com anotação','Sala da orquestra',['Última página da partitura utilizada no baile.','Ao lado de uma pausa no violino, alguém escreveu: AZUL — 22h14.','A tinta dessa nota é diferente da usada nas correções do ensaio.']],
  v2_c_3:['Programa do concerto','Sala da orquestra',['O encerramento foi antecipado por decisão da organização.','A folha não tem a assinatura de recebimento dos músicos.','Uma cópia conserva a ordem prevista originalmente.']],
  v2_d_1:['Comandas do buffet','Cozinha',['Foram preparados 54 lugares para o serviço de encerramento.','A equipe recolheu 36 bandejas, sem confirmação sobre as demais.','A diferença não prova por si só que 18 convidados tenham comido ou desaparecido naquele momento.']],
  v2_d_2:['Sensor da porta de carga','Cozinha',['22h18 — Porta lateral aberta.','22h21 — Porta lateral fechada.','O sensor não identifica pessoas. O horário coincide com a interrupção elétrica do corredor.']],
  v2_d_3:['Escala do serviço','Cozinha',['Uma linha foi acrescentada depois da impressão original.','A entrada contém um sobrenome ilegível e não tem ponto de presença.','É possível que a escala tenha sido corrigida sem que a pessoa tenha comparecido.']],
  v2_e_1:['Inventário de máscaras','Camarim',['36 máscaras de uso comum foram entregues para o baile.','Uma máscara especial de vidro foi emprestada sem assinatura no recebimento.','O inventário não informa se a peça esteve no palco durante o encerramento.']],
  v2_e_2:['Fotografia da montagem','Camarim',['Registro feito às 17h20 mostra a peça de vidro sobre a mesa do camarim.','Fotografia posterior, realizada depois da apresentação, não mostra a peça no mesmo lugar.','As fotos não mostram quem retirou o objeto.']],
  v2_e_3:['Bilhete recolhido','Camarim',['“Não entregue a peça de vidro antes do último número.”','Sem data, destinatário ou assinatura.','O papel estava dobrado dentro de uma caixa vazia.']]
 };
 C.v2Documents={};
 for(const [id,[title,origin,lines]] of Object.entries(documents)){
  C.v2Documents[id]={type:'Documento recolhido',title,origin,date:'Noite do baile · 30 de outubro',lines};
 }
 // Evitar que a versão antiga dê a resposta pelo texto da interface.
 C.puzzleHint='Compare a programação da bilheteria, a mesa de iluminação e a partitura. Há horários registrados em três lugares.';
 window.manualCase002Ready=true;
})();