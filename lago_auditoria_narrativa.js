'use strict';
/* Arquivo 001 — revisão editorial integral, 31/10/2026.
 * Uma pista descreve somente algo observado, ouvido ou lido no próprio objeto.
 * Relógios e horários aparecem apenas em documentos/instrumentos com registro.
 * Perguntas e soluções não aparecem antes da investigação. */
(function(){
 if(typeof CASES==='undefined'||!CASES.lago)return;
 const C=CASES.lago;
 C.type='DESAPARECIMENTO · EM INVESTIGAÇÃO';
 C.place='Vila de Salgueiro · Barragem da CEAS';
 C.title='A Voz Sob o Lago';
 C.short='A Voz Sob o Lago';
 C.subtitle='Quatro técnicos saíram para uma inspeção. Apenas um voltou.';
 C.brief='A Companhia de Energia e Águas de Salgueiro (CEAS) opera a barragem próxima à vila. Na madrugada de 31 de outubro, quatro técnicos foram chamados para verificar um problema nas bombas. Dário Sanches foi encontrado vivo horas depois. Marina Vilar, Paulo Lemos e Elisa Soares continuam desaparecidos.';
 C.v2Lead=C.brief;
 C.quote='“No rádio de serviço ouvi alguém chamar nossos nomes. Não consegui descobrir quem falava.” — Dário Sanches';
 C.danger='Acesso a instalações industriais · riscos a avaliar';
 C.victims='Três desaparecidos; um técnico encontrado vivo';
 C.v2Report='Reconstitua a inspeção e tente descobrir onde estão Marina, Paulo e Elisa.';
 C.v2Goal={...C.v2Goal,title:'O que aconteceu na barragem?',description:'Examine os locais, consulte os registros e converse com as testemunhas. Use as informações reunidas para reconstruir o desaparecimento.',puzzleLabel:'Cronologia'};
 const texts={
  fita:['Fita presa aos juncos','Um pedaço de tecido azul está preso entre os juncos. Há um nó na extremidade; o tecido está úmido.'],
  pegadas:['Marcas no barro do cais','Há impressões de botas em direções diferentes. Parte delas foi apagada pela água; não é possível contar quantas pessoas passaram ali.'],
  lanterna:['Lanterna encontrada na margem','O vidro está embaçado na face interna. A tampa parece bem fechada; pode ter ocorrido condensação.'],
  espelho:['Marcas no espelho','Há riscos finos no vidro e uma impressão sobre a poeira. Não é possível dizer quando as marcas foram feitas.'],
  radio:['Rádio antigo de ondas curtas','Ao girar o seletor, surgem estações e trechos de voz entre chiados. Em um dos sinais, ouvem-se nomes de pessoas e uma batida metálica. O rádio não mostra quando esse sinal foi transmitido.'],
  registro:['Cópia de um termo de obra','O documento descreve obras realizadas junto à barragem em 1989. Algumas páginas e anexos não acompanham a cópia.'],
  sino:['Sino de bronze','Há riscos no interior do bronze. A corda está presa ao suporte, mas isso não demonstra se o sino foi movimentado durante a madrugada.'],
  manuscrito:['Caderno antigo','Há anotações sobre a capela e os moradores que frequentavam a antiga nascente. Algumas páginas foram arrancadas.'],
  inscricao:['Inscrição desgastada','Uma frase foi gravada na pedra. Há trechos ilegíveis e riscos que parecem posteriores à gravação original.'],
  v2_a_1:['Escala de serviço','Uma lista de funcionários tem alterações feitas com outra tinta. A folha inclui uma anotação sobre uma convocação fora do turno.'],
  v2_a_2:['Histórico de comunicações','O terminal permite consultar chamadas internas e registros de sensores. Alguns eventos têm horários que precisam ser comparados.'],
  v2_a_3:['Plantas da barragem','Duas plantas da mesma instalação mostram acessos diferentes. Uma contém uma escada que não aparece na versão recente.'],
  v2_b_1:['Marcas na galeria','Há marcas de botas e água acumulada junto ao corredor. As trilhas se cruzam e ficam menos visíveis perto da escada.'],
  v2_b_2:['Registrador da bomba 4','A bobina de papel mostra que o relé de comando mudou de posição. Há horário e indicação do tipo de acionamento.'],
  v2_b_3:['Sinalização antiga','Sob a pintura recente de uma placa de manutenção, aparecem letras e uma seta indicando uma passagem de serviço.'],
  v2_c_1:['Pasta de obra de 1989','Há uma autorização para alterar o curso de uma nascente. O conjunto de anexos está incompleto.'],
  v2_c_2:['Ordem de serviço assinada','Uma ordem determina como a bomba 4 deveria ser desligada e como a paralisação deveria aparecer no registro da empresa.'],
  v2_c_3:['Carta guardada no arquivo','Uma carta do período da construção descreve a remoção de inscrições e mudanças na passagem sob a capela.'],
  v2_d_1:['Prontuário de atendimento','O prontuário de Dário registra o horário de entrada, seu estado físico e as informações fornecidas durante o atendimento.'],
  v2_d_2:['Desenho de Dário','O desenho feito por Dário mostra uma escada, uma parede com inscrições e uma saída. Ele não soube confirmar as distâncias.'],
  v2_d_3:['Laudo de amostra','Um exame compara a água encontrada no uniforme de Dário com amostras de diferentes pontos da barragem.'],
  v2_e_1:['Inscrições na laje','Há nomes antigos e outros gravados recentemente. Algumas letras desapareceram sob a água.'],
  v2_e_2:['Tubo de bronze','Um tubo metálico acompanha a parede e parece seguir em direção à capela. Uma braçadeira foi substituída há pouco tempo.'],
  v2_e_3:['Corrente cortada','Uma corrente foi aberta com ferramenta. O corte não apresenta a mesma ferrugem que os elos antigos.']
 };
 for(const [id,[name,detail]] of Object.entries(texts)){
  const clue=C.clues[id];if(!clue)throw Error('Pista ausente: '+id);
  Object.assign(clue,{name,detail,insight:''});
 }
 C.scenes.lago.subtitle='Cais da barragem';
 C.scenes.casa.subtitle='Antiga residência do barqueiro';
 C.scenes.capela.subtitle='Construção anterior à barragem';
 C.scenes.v2_a.subtitle='Monitoramento das bombas';
 C.scenes.v2_b.subtitle='Acesso ao setor 4';
 C.scenes.v2_c.subtitle='Registros da companhia';
 C.scenes.v2_d.subtitle='Atendimento ao sobrevivente';
 C.scenes.v2_e.subtitle='Área sob a capela';
 C.scenes.lago.intro='O cais está vazio. Há juncos, madeira molhada e objetos que podem ter sido deixados por trabalhadores.';
 C.scenes.casa.intro='A antiga casa do barqueiro está desocupada. Há um rádio, móveis e papéis antigos.';
 C.scenes.capela.intro='A capela foi construída antes da barragem. Um sino, um baú e inscrições permanecem no interior.';
 C.scenes.v2_a.intro='O centro de controle da CEAS conserva a escala do plantão, registros de comunicação e plantas técnicas.';
 C.scenes.v2_b.intro='Um corredor de manutenção conduz à bomba 4. Há marcas no piso, um painel e uma placa antiga.';
 C.scenes.v2_c.intro='Estantes do arquivo da CEAS reúnem autorizações, correspondências e ordens de manutenção.';
 C.scenes.v2_d.intro='Dário foi atendido no posto de saúde da CEAS. Alguns materiais relacionados ao atendimento estão guardados.';
 C.scenes.v2_e.intro='Há água corrente, inscrições na pedra e tubulações junto à parede.';
 const documentText={
  registro:{
   type:'Documento da construção',title:'Termo de alteração do curso d’água',origin:'Casa do barqueiro · cópia incompleta',date:'11 de maio de 1989',
   lines:[
    'A Companhia de Energia e Águas de Salgueiro autoriza a condução da nascente do antigo cais por uma galeria de manutenção sob a capela.',
    'A instalação de um conduto metálico próximo à capela deverá constar em memorial separado. Este memorial não acompanha a cópia.',
    'No rodapé há uma nota manuscrita: “Guardar os registros das inscrições da pedra antes de cobrir o acesso”.'
   ]
  },
  manuscrito:{
   type:'Caderno pessoal',title:'Anotações de um antigo vigário',origin:'Capela do Sino',date:'1989, sem dia legível',
   lines:[
    'Os moradores deixavam nomes na pedra junto à nascente. Alguns vinham buscar notícias de parentes que não voltaram.',
    'Há relatos de vozes ouvidas perto da água. Nunca vi quem falava. Não sei se os visitantes ouviam outras pessoas, o eco da galeria ou algo diferente.',
    'Depois da obra, várias famílias reclamaram da retirada das inscrições. A última página termina no meio de uma frase.'
   ]
  },
  v2_a_1:{
   type:'Escala administrativa',title:'Plantão de 30 para 31 de outubro',origin:'Centro de Controle · CEAS',date:'30 de outubro',
   lines:[
    '22h00–06h00: Otávio Mendes, operador. Marina Vilar, Paulo Lemos e Elisa Soares: folga. Dário Sanches: sobreaviso.',
    '23h40 — Convocar Marina, Paulo, Elisa e Dário para verificação da bomba 4. A nota está em outra tinta; não há assinatura de quem a acrescentou.',
    'O aviso de convocação não contém diagnóstico do defeito.'
   ]
  },
  v2_a_2:{
   type:'Histórico eletrônico',title:'Eventos da central de controle',origin:'Centro de Controle · sistema CEAS',date:'31 de outubro',
   lines:[
    '30/10, 23h40 — Central administrativa envia aviso de inspeção da bomba 4 aos quatro técnicos.',
    '30/10, 23h52 — O painel registra abertura do relé de comando da bomba 4.',
    '31/10, 00h17 — O sistema registra um sinal de áudio na extensão telefônica C-0. A planta indica que a extensão foi desativada em 1989. No áudio, uma voz pronuncia quatro nomes; o restante é encoberto por ruído.',
    '31/10, 00h19 — Um microfone de segurança próximo à capela capta um impacto metálico. O registro não identifica a origem do som.',
    'A central registra horários automaticamente. Os registros não demonstram por si sós quem provocou cada evento.'
   ]
  },
  v2_a_3:{
   type:'Plantas comparadas',title:'Planta de manutenção: 1989 / atual',origin:'Centro de Controle · arquivo de plantas',
   lines:[
    'Na versão de 1989, um corredor liga o setor 4 a uma escada de serviço próxima à capela e a uma saída na margem sul.',
    'A escada não aparece na planta mais recente. Não há termo de demolição anexado.',
    'A linha correspondente à escada está identificada como “Passagem S”.'
   ]
  },
  v2_b_2:{
   type:'Bobina do registrador',title:'Bomba 4 — alteração no relé',origin:'Galeria das Bombas',
   lines:[
    '30/10, 23h52 — Relé de comando: ABERTO. Origem do comando: painel local.',
    'Nenhum disparo por sobrecarga ou falha de pressão aparece na bobina antes desse horário.',
    'A bobina registra apenas eventos do circuito elétrico da bomba; não registra chamadas telefônicas nem sons externos.'
   ]
  },
  v2_b_3:{
   type:'Placa de manutenção',title:'Indicação de rota antiga',origin:'Galeria das Bombas',
   lines:[
    'Sob a tinta aplicada sobre uma placa antiga, ainda se lê: “PASSAGEM S — CAPELA / SAÍDA SUL”. Uma seta aponta para o corredor de serviço.',
    'Uma segunda camada de tinta cobre a data. A placa está fixada com parafusos antigos e dois substituídos recentemente.'
   ]
  },
  v2_c_1:{
   type:'Autorização de obra',title:'Licença 47 — desvio da nascente',origin:'Arquivo da CEAS',date:'1989',
   lines:[
    'Autorizado o desvio de água sob a capela para permitir a ampliação do reservatório.',
    'Antes de fechar o acesso, a equipe deverá fazer cópias das inscrições existentes na pedra.',
    'O anexo com as reclamações dos moradores não foi encontrado nesta pasta.'
   ]
  },
  v2_c_2:{
   type:'Ordem interna',title:'Manutenção programada — bomba 4',origin:'Arquivo da CEAS',date:'30 de outubro, 22h50',
   lines:[
    'O setor deverá abrir manualmente o relé principal da bomba 4 durante a inspeção prevista para 23h50.',
    'A interrupção deverá constar no relatório operacional como paralisação não programada.',
    'As plantas e pastas de 1989 devem permanecer no arquivo privativo da direção até a conclusão da vistoria.',
    'Assinatura: Augusto Ferraz, diretor de operações.'
   ],signature:'Augusto Ferraz'
  },
  v2_c_3:{
   type:'Carta não enviada',title:'Correspondência do antigo barqueiro',origin:'Arquivo da CEAS',date:'1989',
   lines:[
    'Senhor vigário, retiraram da pedra os nomes que as famílias escreviam junto à nascente. Disseram que eram marcas sem valor para a obra.',
    'Vi operários levando papéis e uma peça comprida de bronze para o acesso sob a capela. Não me explicaram para que servia.',
    'Guardei uma cópia do termo porque meu nome consta entre os trabalhadores da passagem.'
   ],signature:'J. Vilar'
  },
  v2_d_1:{
   type:'Registro de enfermagem',title:'Atendimento a Dário Sanches',origin:'Posto de saúde da CEAS',date:'31 de outubro, 02h10',
   lines:[
    'Paciente encontrado por um vigia na margem sul. Apresenta roupas molhadas, tremores e temperatura corporal baixa.',
    'Sem ferimentos graves aparentes. Responde a perguntas simples, mas não consegue explicar como deixou a galeria.',
    'Repete os nomes Marina, Paulo e Elisa durante o atendimento.'
   ],signature:'Celina Prado · Enfermagem'
  },
  v2_d_2:{
   type:'Desenho de paciente',title:'Esboço feito por Dário',origin:'Posto de saúde da CEAS',
   lines:[
    'O papel mostra uma escada, uma parede com inscrições e um corredor que parece chegar à margem sul.',
    'Três nomes estão escritos ao lado da parede. Um quarto foi riscado, tornando-se ilegível.',
    'No verso, Dário escreveu: “Ouvi um som de metal. Depois perdi a direção”.'
   ]
  },
  v2_d_3:{
   type:'Laudo preliminar',title:'Água encontrada no uniforme',origin:'Posto de saúde da CEAS',
   lines:[
    'A água recolhida das roupas de Dário contém minerais presentes nas amostras da nascente antiga, sob a capela.',
    'As amostras da superfície do reservatório têm composição diferente.',
    'O resultado não mostra como Dário entrou em contato com essa água.'
   ]
  },
  v2_e_1:{
   type:'Decalque',title:'Inscrições da laje',origin:'Nascente Subterrânea',
   lines:[
    'Há nomes de moradores registrados em épocas diferentes.',
    'Três inscrições parecem recentes: MARINA VILAR, PAULO LEMOS e ELISA SOARES.',
    'Uma quarta inscrição não está completa. A parte inferior da pedra permanece submersa.'
   ]
  },
  v2_e_2:{
   type:'Nota de observação técnica',title:'Tubulação metálica junto à nascente',origin:'Nascente Subterrânea',
   lines:[
    'Um tubo de bronze sai da parede e segue em direção à capela. Uma inspeção visual não permite ver toda sua extensão.',
    'Há marcas de reparo e uma braçadeira mais recente que os demais suportes.',
    'O tubo pode transmitir vibrações; ainda não há prova de que tenha produzido os sons relatados.'
   ]
  },
  v2_e_3:{
   type:'Registro fotográfico',title:'Corrente do acesso',origin:'Nascente Subterrânea',
   lines:[
    'Um elo da corrente foi cortado com ferramenta. O metal exposto não apresenta ferrugem antiga.',
    'Há resíduos de pó metálico perto do corte. A origem ainda não foi confirmada.'
   ]
  }
 };
 for(const [id,doc] of Object.entries(documentText)){
  if(!C.v2Documents?.[id])throw Error('Documento ausente: '+id);
  C.v2Documents[id]=doc;
 }
 const q=C.witness.questions;
 if(q.v2_w3_1){
  q.v2_w3_1.answer='A supervisão informou um problema na bomba 4. Pedi que fossem verificar. O operador deve ter os registros do chamado.';
 }
 if(q.v2_w4_3){
  q.v2_w4_3.answer='Lembro de uma pancada metálica e de um corredor. Não sei quanto tempo passou até me encontrarem.';
 }
 if(q.v2_w5_1){
  q.v2_w5_1.answer='A capela já existia quando comecei a trabalhar. Meu pai guardava as chaves do prédio e cuidava da escada de serviço.';
 }
 C.witness.intro='Iria Vilar mora na vila e procura sua mãe, Marina, uma das técnicas desaparecidas. Ela não estava na barragem durante a inspeção.';
 C.v2Witnesses.v2_w1.intro='Otávio Mendes era o operador de plantão da central de bombas da CEAS na noite dos desaparecimentos.';
 C.v2Witnesses.v2_w2.intro='Celina Prado é enfermeira do posto de saúde da CEAS e atendeu Dário depois que ele foi encontrado.';
 C.v2Witnesses.v2_w3.intro='Augusto Ferraz é diretor de operações da CEAS. A empresa é responsável pela barragem e pela manutenção das bombas.';
 C.v2Witnesses.v2_w4.intro='Dário Sanches é o único dos quatro técnicos que retornou. Ele não se lembra de toda a inspeção.';
 C.v2Witnesses.v2_w5.intro='Moira Bastos cuidou da capela durante anos e conhece parte da história da construção da barragem.';
 C.v2Truth='A ordem de Augusto Ferraz previa uma parada manual da bomba 4. A equipe foi convocada às 23h40, antes da abertura do relé registrada às 23h52; portanto, o desligamento não poderia ter causado o aviso inicial. A direção ocultou documentos sobre uma passagem antiga. Mais tarde, a central registrou um áudio na extensão telefônica C-0, desativada desde 1989, e um som metálico perto da capela. O rádio da casa do barqueiro também capta vozes, mas não tem relógio nem gravação datada. A manifestação se relaciona à nascente e às inscrições de nomes. Esses fatos não são todos explicados pela manutenção da barragem.';
 C.reveal=C.v2Truth;
 C.revealTitle='O que os registros realmente mostram';
 C.revealQuote='“O chamado foi feito antes da parada registrada da bomba. O restante da noite exige outra explicação.” — Relatório do Instituto';
 C.outcomes.libertar.text='Após isolar o conduto de bronze e abrir a passagem de serviço, os pesquisadores localizam Marina, Paulo e Elisa. Os três são retirados da câmara subterrânea com vida. A CEAS terá de explicar a convocação e os documentos omitidos.';
 C.outcomes.libertar.after='Iria reencontra Marina. O Instituto conserva os registros técnicos e os relatos para apurar o ocorrido.';
 C.outcomes.negociar.text='A leitura das inscrições parece interromper as vozes. Marina e Paulo são encontrados perto da saída da galeria, mas Elisa continua desaparecida. A equipe não sabe se o silêncio será duradouro.';
 C.outcomes.expor.text='O Instituto entrega a ordem de serviço e os horários à investigação oficial. A reabertura da bomba 4 é suspensa. A convocação ocorreu antes da parada registrada; as buscas pelos técnicos continuam.';
 C.outcomes.expor.after='A direção da CEAS passa a responder sobre os registros e a passagem omitida nas plantas. A origem das vozes ainda não foi esclarecida.';
 C.outcomes.selar.text='A galeria é isolada e as comportas continuam sob controle da CEAS. Os três desaparecidos não são encontrados. O arquivo da obra permanece inacessível aos investigadores.';
 window.manualArquivo001TextoAuditado=true;
})();