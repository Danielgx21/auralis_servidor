'use strict';
(function install(){
 const C=CASES.lago;
 C.short='A Voz Sob o Lago';
 C.title='A Voz Sob o Lago';
 C.subtitle='O desaparecimento na barragem';
 C.v2Lead='Pouco antes da meia-noite, quatro técnicos foram chamados para verificar um problema nas bombas da barragem. Dário Sanches voltou sozinho. Marina Vilar, Paulo Lemos e Elisa Soares continuam desaparecidos. A direção ainda não apresentou o relatório da ocorrência.';
 C.v2Report='Descubra o que aconteceu naquela noite e tente localizar os três desaparecidos.';
 C.brief=C.v2Lead;C.intro=C.v2Lead;
 C.quote='“Ouvi nossos nomes pelo rádio de serviço. Perguntei quem estava falando, mas ninguém respondeu.” — Dário Sanches';
 C.victims='Três desaparecidos; um técnico resgatado';C.danger='Ainda não avaliado';C.type='DESAPARECIMENTO NA BARRAGEM';
 C.v2Truth='Augusto Ferraz ordenou o desligamento do relé antes da inspeção e ocultou documentos da obra. Isso provocou a falsa emergência. Às 00h17, porém, uma linha desligada desde 1989 transmitiu os nomes dos técnicos. O sino tocou sem operador às 00h19. Uma entidade ligada à memória dos nomes havia sido aprisionada sob a capela durante o desvio da nascente. A sabotagem humana e a manifestação não são o mesmo acontecimento.';
 C.reveal=C.v2Truth;C.revealTitle='O chamado tinha duas origens';
 C.revealQuote='“O relé foi aberto por uma pessoa. A voz não veio do circuito de bombas.” — Instituto';
 C.v2Goal={title:'Reconstruir os acontecimentos',description:'Confronte os depoimentos e os registros encontrados. Estabeleça a sequência dos fatos sem presumir que todos tenham a mesma causa.',clues:['v2_a_2','v2_b_2','v2_e_1'],puzzle:true,puzzleLabel:'Cronologia'};
 C.minClues=8;C.v2MinClues=8;
 const clue=(id,name,detail)=>Object.assign(C.clues[id],{name,detail,insight:'Compare com as demais fontes. O vestígio não prova sozinho a causa do acontecimento.'});
 clue('fita','Fita azul no junco','O nó lembra o usado por Marina Vilar. A fita está presa do lado interno dos juncos, fora do caminho principal.');
 clue('pegadas','Marcas de botas no cais','Quatro pares de marcas seguem até a extremidade. Apenas um parece voltar pelo mesmo caminho.');
 clue('lanterna','Lanterna vedada','Há gotas na parte interna, mas a carcaça não tem sinais de mergulho nem de abertura recente.');
 clue('espelho','Reflexo fora de tempo','A imagem da porta permanece no vidro por alguns instantes depois que a porta para de se mover.');
 clue('radio','Rádio de ondas curtas','O mostrador está na frequência 17. Um trecho gravado repete nomes e termina numa pausa marcada como 00h17.');
 clue('registro','Relatório da obra de 1989','Registra o desvio da nascente e a instalação do sino. Não há justificativa técnica do dispositivo acústico.');
 clue('sino','Sino sem acionamento registrado','Sete sulcos estão no interior do bronze. A corda permaneceu presa; às 00h19, o registrador marcou uma vibração.');
 clue('manuscrito','Caderno do vigário','Relata pessoas que esqueceram nomes após a obra. O autor não escreve o nome da presença que respondia perto da água.');
 clue('inscricao','Inscrição parcialmente raspada','A pedra conserva o trecho: “Quando o sino cala, os nomes ...”. Há marcas de remoção muito recentes.');
 C.witness.intro='Iria procura a mãe, Marina Vilar. Ela não esteve nos locais técnicos e só conhece o que ouviu de outros trabalhadores.';
 const q=(id,title,answer)=>Object.assign(C.witness.questions[id],{q:title,answer});
 q('lembranca','Qual foi a última mensagem da sua mãe?','Às 23h40: “Chamaram o plantão. Vou verificar a bomba”. Ela parecia irritada, não assustada.');
 q('barqueiro','Por que o avô guardava documentos da represa?','Ele ajudou na obra e dizia que o sino não era para anunciar horas. Não explicou para que servia.');
 q('promessa','A fita azul era da sua mãe?','Ela usava uma parecida. Não posso garantir que seja a mesma; outras pessoas sabiam fazer aquele nó.');
 const w1=C.v2Witnesses.v2_w1,w2=C.v2Witnesses.v2_w2;
 w1.intro='Otávio fez o monitoramento da madrugada. Seus horários devem ser comparados com o registrador de bombas.';w1.hours=[360,1140];
 q(w1.ids[0],'Houve defeito confirmado antes do alerta?','Não. Quando conferi, encontrei o relé aberto manualmente.');
 q(w1.ids[1],'Quem tinha a chave do relé?','Eu e os supervisores. A reserva ficava com Augusto Ferraz.');
 q(w1.ids[2],'O que foi registrado às 00h17?','Quatro chamadas na linha C-0, que não funciona desde 1989.');
 w2.intro='Celina atendeu Dário depois que ele apareceu na margem sul. O prontuário informa a hora.';w2.hours=[480,1290];
 q(w2.ids[0],'Quando Dário foi atendido?','Às 02h10. Estava molhado e desorientado, sem sinais de agressão.');
 q(w2.ids[1],'O que ele repetia?','Marina, Paulo e Elisa. Não conseguia explicar onde os tinha deixado.');
 q(w2.ids[2],'Você ouviu algum sino?','Ouvi uma badalada curta no corredor. Talvez viesse de fora.');
 function art(id){
  const colors={v2_a:['#0b2431','#2c4b57'],v2_b:['#102529','#355049'],v2_c:['#24202b','#564d43'],v2_d:['#1d3338','#687775'],v2_e:['#092c36','#26515a']}[id];
  const tags={
   v2_a:`<rect x="64" y="90" width="1072" height="400" rx="14" fill="#1a2a36" stroke="#64808d" stroke-width="16"/><path d="M470 90V490M860 90V490" stroke="#455f6b" stroke-width="10"/>
    <g transform="translate(174 446) rotate(-6)"><rect width="237" height="196" fill="#cfbf9e" stroke="#77684e" stroke-width="10"/><text x="22" y="38" font-size="25" fill="#514d3e">ESCALA</text><path d="M20 80H208M20 113H208M20 149H208" stroke="#70675b" stroke-width="6"/><text x="21" y="179" font-size="25" fill="#874a48">FOLGA</text></g>
    <g><rect x="510" y="180" width="320" height="295" rx="15" fill="#12252d" stroke="#93a3a0" stroke-width="14"/><rect x="533" y="205" width="273" height="220" fill="#173c40"/><text x="551" y="260" fill="#accbc7" font-size="27">LINHA C-0</text><text x="549" y="345" fill="#d0e1be" font-size="62" font-family="monospace">00:17</text><text x="554" y="388" fill="#a3c8c4" font-size="21">DESATIVADA</text></g>
    <g transform="translate(855 452) rotate(7)"><rect width="246" height="191" fill="#c3b596" stroke="#786b58" stroke-width="11"/><path d="M20 45Q100 10 140 86T233 65M20 137Q127 90 226 161" stroke="#4e7d83" fill="none" stroke-width="10"/><text x="26" y="182" font-size="22" fill="#4b514d">SETOR 07</text></g>`,
   v2_b:`<path d="M120 95V540H440M995 86V505H690" fill="none" stroke="#887966" stroke-width="53"/><path d="M0 650Q240 580 510 640T1200 625V760H0Z" fill="#1d4a55" opacity=".65"/>
    <g transform="translate(175 478)"><path d="M26 0L132-6L149 155H0Z" fill="#343430" stroke="#9f866a" stroke-width="12"/><path d="M160 0L254-7L274 155H144Z" fill="#292e2c" stroke="#9c8768" stroke-width="12"/></g>
    <g><rect x="505" y="172" width="310" height="295" fill="#3c4441" stroke="#9b9b85" stroke-width="15"/><rect x="539" y="224" width="240" height="182" fill="#17282e" stroke="#8f816e" stroke-width="9"/><text x="566" y="291" fill="#cfc3a7" font-size="36">RELÉ 4</text><text x="566" y="365" fill="#acd5c7" font-size="51">23:52</text><path d="M760 230L640 411" stroke="#9d5949" stroke-width="14"/></g>
    <g transform="translate(858 470) rotate(3)"><rect width="260" height="172" fill="#c6b98c" stroke="#74614c" stroke-width="12"/><text x="25" y="45" font-size="27" fill="#3b352b">AVISO</text><text x="20" y="91" font-size="19" fill="#413830">3ª CHAMADA</text><text x="22" y="135" font-size="20" fill="#413830">NÃO ATENDER</text></g>`,
   v2_c:`<g fill="#343130" stroke="#927d5b" stroke-width="12"><rect x="88" y="110" width="285" height="380"/><rect x="849" y="110" width="270" height="380"/></g><path d="M100 236H370M100 365H370M860 236H1108M860 365H1108" stroke="#9d845c" stroke-width="11"/>
    <g transform="translate(160 435) rotate(-7)"><rect width="255" height="215" fill="#d1c09a" stroke="#8c7053" stroke-width="12"/><text x="19" y="45" fill="#615341" font-size="27">OBRA 1989</text><path d="M20 85H217M20 125H217M20 166H200" stroke="#74644c" stroke-width="7"/><circle cx="199" cy="178" r="26" stroke="#965b4d" stroke-width="9" fill="none"/></g>
    <g transform="translate(528 198) rotate(3)"><rect width="292" height="269" fill="#e0d2b1" stroke="#847459" stroke-width="11"/><text x="24" y="58" font-size="24" fill="#51493e">AUTORIZAÇÃO</text><text x="24" y="117" font-size="32" fill="#494d4d">23:52</text><path d="M20 158H251M20 190H251" stroke="#9b876a" stroke-width="6"/><path d="M24 244Q109 204 248 242" stroke="#6a453d" stroke-width="6" fill="none"/></g>
    <g transform="translate(857 453) rotate(5)"><rect width="246" height="190" fill="#a79374" stroke="#6e5948" stroke-width="12"/><path d="M0 16L122 110L246 16" fill="none" stroke="#6a5748" stroke-width="11"/><text x="32" y="158" font-size="22" fill="#3e413e">CARTA</text></g>`,
   v2_d:`<rect x="100" y="105" width="1000" height="390" fill="#acb9b6" opacity=".2"/><path d="M110 450H1100M160 460V180M1010 460V180" stroke="#8ea5a4" stroke-width="22"/>
    <g transform="translate(169 433) rotate(-5)"><rect width="230" height="211" fill="#ddd5bc" stroke="#85938d" stroke-width="11"/><text x="23" y="46" fill="#475b59" font-size="23">PRONTUÁRIO</text><text x="23" y="96" fill="#476261" font-size="41">02:10</text><path d="M21 133H205M21 169H205" stroke="#73857d" stroke-width="7"/></g>
    <g><rect x="509" y="191" width="326" height="265" rx="12" fill="#142c35" stroke="#9facaa" stroke-width="14"/><rect x="535" y="216" width="271" height="194" fill="#10252f"/><path d="M541 320H608L630 279L654 365L685 259L713 321H805" fill="none" stroke="#83c5ae" stroke-width="9"/><text x="551" y="264" fill="#bdded4" font-size="25">LEITO 04</text></g>
    <g transform="translate(875 435)"><path d="M45 0H189L238 216H-6Z" fill="#65777b" stroke="#abbdb6" stroke-width="12"/><path d="M54 12L128 85L181 12" fill="none" stroke="#a3bab3" stroke-width="9"/><text x="30" y="187" font-size="20" fill="#dbd9c2">AMOSTRA</text></g>`,
   v2_e:`<path d="M0 0L154 161L320 61L507 186L695 81L930 178L1200 49V760H0Z" fill="#1c353a"/><path d="M0 340L300 230L500 328L750 194L970 337L1200 212" fill="none" stroke="#527a79" stroke-width="85" opacity=".4"/><path d="M0 650Q250 551 580 642T1200 640V760H0Z" fill="#2a6270" opacity=".8"/>
    <g transform="translate(167 421) rotate(-5)"><path d="M0 0H265L233 225H18Z" fill="#536260" stroke="#a0aa9d" stroke-width="13"/><text x="22" y="60" fill="#d2d2b4" font-size="26">M. VILAR</text><text x="22" y="116" fill="#d2d2b4" font-size="26">P. LEMOS</text><text x="22" y="170" fill="#d2d2b4" font-size="26">E. SOA—</text></g>
    <path d="M630 80V260Q625 325 679 325T729 260V80" stroke="#b7a07b" stroke-width="46" fill="none"/><circle cx="678" cy="343" r="83" fill="#344d50" stroke="#baa581" stroke-width="17"/><circle cx="678" cy="343" r="37" stroke="#e2cba3" stroke-width="8" fill="none"/><path d="M678 423V555" stroke="#8b7d70" stroke-width="17"/>
    <g transform="translate(861 479)"><path d="M0 63Q60-10 115 64T227 63" fill="none" stroke="#91866f" stroke-width="31"/><path d="M71 0L164 157M169 0L68 151" stroke="#b1ac8d" stroke-width="16"/></g>`
  };
  const palette={v2_a:['#112b36','#33545e'],v2_b:['#152b2e','#34544e'],v2_c:['#2a2525','#5a5045'],v2_d:['#193036','#536864'],v2_e:['#0e3039','#28616b']}[id],parts=tags[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" width="1200" height="760"><defs>
   <linearGradient id="bg" x2="0" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient>
   <radialGradient id="vig"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".68"/></radialGradient>
   <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".48" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".13"/></feComponentTransfer></filter></defs>
   <rect width="1200" height="760" fill="url(#bg)"/><path d="M0 480L600 395L1200 480V760H0Z" fill="#16232a" opacity=".7"/>${parts}
   <rect width="1200" height="760" fill="url(#vig)"/><rect width="1200" height="760" filter="url(#grain)" opacity=".18"/>
   <path d="M16 18H1184V742H16Z" stroke="#d7c29c" stroke-opacity=".26" stroke-width="5" fill="none"/></svg>`;
 }
 const areas={
  v2_a:{name:'Centro de Controle',subtitle:'Sala de monitoramento',intro:'Os monitores estão em modo de manutenção. Há documentos e registros de chamadas que ainda não foram examinados.',role:'archivist',theme:'control',clues:[
   ['Escala de plantão alterada','Marina e os colegas estavam de folga. Quatro nomes foram adicionados ao turno com outra caneta.'],
   ['Registro da linha C-0','Quatro chamadas chegaram de uma linha desativada desde 1989, todas às 00h17.'],
   ['Mapa da passagem omitida','A planta atual não mostra a escada sob a capela. Um mapa antigo aponta essa passagem.']]},
  v2_b:{name:'Galeria das Bombas',subtitle:'Instalações do setor 4',intro:'As bombas estão paradas. O painel de manutenção e o chão úmido podem ajudar a reconstruir a passagem dos técnicos.',role:'tracker',theme:'pump',clues:[
   ['Botas na saída sul','Marcas de quatro pares entram no corredor. Apenas uma trilha retorna à enfermaria.'],
   ['Relé aberto às 23h52','O registrador mecânico marca uma intervenção manual às 23h52.'],
   ['Placa da terceira chamada','A placa antiga manda não responder à terceira repetição vinda da galeria.']]},
  v2_c:{name:'Arquivo das Obras',subtitle:'Documentos da companhia',intro:'As estantes guardam registros de construção e ordens de serviço de épocas diferentes.',role:'archivist',theme:'archive',clues:[
   ['Termo de desvio da nascente','A companhia autorizou o desvio da água e instalou uma estrutura acústica sem memorial técnico.'],
   ['Ordem assinada por Augusto','Uma ordem interna exige a abertura manual do relé antes da vistoria e a classificação da parada como falha.'],
   ['Carta do antigo barqueiro','Um trabalhador descreveu como moradores deixavam nomes na pedra antes da construção.']]},
  v2_d:{name:'Enfermaria da Barragem',subtitle:'Local do atendimento',intro:'Dário foi atendido aqui durante a madrugada. O prontuário e alguns materiais de exame estão disponíveis.',role:'analyst',theme:'infirmary',clues:[
   ['Prontuário de Dário','Admissão às 02h10. Hipotermia leve, sem ferimentos de luta. Ele repetia três nomes.'],
   ['Desenho da galeria','Um esboço mostra a escada sob a capela e inscrições numa parede de pedra.'],
   ['Água nas roupas','Os minerais nas roupas correspondem à nascente antiga, não à água superficial da represa.']]},
  v2_e:{name:'Nascente Subterrânea',subtitle:'Área abaixo da capela',intro:'A água atravessa uma câmara antiga. Há marcas nas pedras, tubulações e sinais de reparos.',role:'sensitive',theme:'cavern',clues:[
   ['Laje com nomes apagados','Marina, Paulo e Elisa aparecem nas inscrições recentes. Um quarto nome está incompleto.'],
   ['Conduto ligado ao sino','Um tubo de bronze leva vibrações do sino até a nascente, mesmo com a corda imobilizada.'],
   ['Corrente cortada recentemente','Uma corrente antiga foi cortada com ferramenta nova. Há pó de bronze no metal.']]}
 };
 C.v2Locations={...C.v2Locations};
 for(const [id,entry] of Object.entries(areas)){
  C.v2Locations[id]={role:entry.role,theme:entry.theme};
  const items=[];
  entry.clues.forEach(([name,description],i)=>{
   const clueId=id+'_'+(i+1);items.push(clueId);
   const xy=[[24,72],[56,45],[80,72]][i];
   C.clues[clueId]={name,detail:description,x:xy[0],y:xy[1],insight:'Compare com o restante da investigação.'};
  });
  C.scenes[id]={name:entry.name,subtitle:entry.subtitle,intro:entry.intro,items,
   image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art(id))};
 }
 const persons=[
  {key:'v2_w3',name:'Augusto Ferraz',job:'Diretor da barragem',intro:'A companhia seguiu os procedimentos, e não tenho motivo para ocultar informações.',role:'diplomat',hours:[600,1200],q:[
   ['Quem autorizou o chamado?','Foi automático. Não ordenei ligações para a equipe.'],
   ['Houve intervenção no relé?','Não recebi essa informação.'],
   ['Por que apagaram a passagem do mapa?','Está fechada por segurança. A obra antiga não tem relação.']]},
  {key:'v2_w4',name:'Dário Sanches',job:'Técnico sobrevivente',intro:'Lembro de uma escada e de uma voz. Não recordo como saí.',role:'sensitive',hours:[960,1380],q:[
   ['Por onde entraram?','Pela galeria sul. Havia uma escada fora da planta atual.'],
   ['Você reconheceu a voz?','Não. Repetiu os nossos nomes e pediu que voltássemos.'],
   ['O que houve antes do resgate?','Ouvi o sino. Depois estava no chão da enfermaria.']]},
  {key:'v2_w5',name:'Moira Bastos',job:'Antiga zeladora da capela',intro:'O sino chegou depois da obra. Meu pai tinha ordens para não tocá-lo à noite.',role:'archivist',hours:[420,1080],q:[
   ['O sino anunciava os horários?','Não. Era proibido tocá-lo depois que escurecia.'],
   ['O que havia sob a capela?','Uma nascente e uma laje onde moradores escreviam nomes.'],
   ['O que a obra modificou?','Cobriram a água e ligaram o sino a um tubo.']]}
 ];
 C.v2Witnesses={...C.v2Witnesses};
 function portrait(i){
  const bg=['#3c4247','#34505b','#545c51'][i],hair=['#25282b','#2b2927','#9d9c8d'][i];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 370"><rect width="300" height="370" fill="${bg}"/>
   <path d="M0 370Q25 264 113 254H187Q280 266 300 370" fill="#2b3c42" stroke="#a58e73" stroke-width="5"/>
   <ellipse cx="150" cy="157" rx="72" ry="92" fill="#bca084" stroke="#7a6250" stroke-width="5"/>
   <path d="M76 139Q58 45 147 37Q234 30 227 141L192 96L109 90Z" fill="${hair}"/>
   <path d="M122 162H137M164 162H180M150 182L143 202H156M124 227Q151 240 176 226" stroke="#4c3d36" stroke-width="5" fill="none"/>
   <path d="M104 266L150 309L193 266" fill="none" stroke="#c1b39e" stroke-width="5"/>
   <path d="M18 18H282V351H18Z" stroke="#c3ac87" stroke-width="3" opacity=".45" fill="none"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 }
 persons.forEach((p,i)=>{
  const ids=p.q.map(([title,answer],j)=>{const id=p.key+'_'+(j+1);C.witness.questions[id]={q:title,answer,trust:j===2?1:0};return id;});
  C.v2Witnesses[p.key]={name:p.name,job:p.job,intro:p.intro,role:p.role,hours:p.hours,ids,image:portrait(i)};
 });
 C.outcomes.libertar.label='Desligar o conduto e resgatar os técnicos';
 C.outcomes.libertar.desc='Abrir a passagem sem repetir a sequência do sino.';
 C.outcomes.libertar.needs={correct:true,puzzle:true,clues:['sino','v2_e_2','v2_d_3']};
 C.outcomes.libertar.unlock='Requer a cronologia, o conduto e a amostra da nascente.';
 C.outcomes.libertar.title='Os três voltam à margem';
 C.outcomes.libertar.text='Com o conduto isolado, a equipe encontra Marina, Paulo e Elisa na passagem subterrânea. O Instituto registra a ordem de sabotagem humana sem atribuir a Augusto a voz da linha desativada.';
 C.outcomes.libertar.after='Iria reencontra a mãe. Augusto será investigado pela falsa emergência.';
 C.outcomes.libertar.impact='Três resgatados · Fraude documentada';
 C.outcomes.negociar.label='Negociar com a presença da nascente';
 C.outcomes.negociar.desc='Pronunciar os nomes gravados e pedir a devolução dos técnicos.';
 C.outcomes.negociar.needs={correct:true,clues:['v2_e_1','manuscrito'],trust:1};
 C.outcomes.negociar.unlock='Requer a laje, o caderno e a confiança de uma testemunha.';
 C.outcomes.negociar.text='A leitura dos nomes interrompe as vozes. Marina e Paulo retornam, mas Elisa não é localizada. A trégua só dura uma noite.';
 C.outcomes.negociar.after='O Instituto mantém a nascente sob vigilância.';
 C.outcomes.negociar.impact='Dois resgatados · Pacto provisório';
 C.outcomes.expor.label='Denunciar a sabotagem e impedir a reabertura';
 C.outcomes.expor.desc='Divulgar documentos e suspender a operação até o resgate.';
 C.outcomes.expor.needs={correct:true,puzzle:true,clues:['v2_c_2','v2_b_2','v2_a_2'],witness:['v2_w3_2']};
 C.outcomes.expor.unlock='Requer a ordem, o relé, o registro de chamadas e o confronto com Augusto.';
 C.outcomes.expor.text='A reabertura é suspensa. Os documentos provam que a emergência foi provocada antes do chamado impossível. As buscas continuam e a origem da voz permanece sob estudo.';
 C.outcomes.expor.after='O processo contra a direção prossegue enquanto o Instituto protege a nascente.';
 C.outcomes.expor.impact='Operação suspensa · Busca aberta';
 C.outcomes.selar.label='Isolar a passagem e manter as comportas';
 C.outcomes.selar.desc='Fechar a área antes de explicar a origem do chamado.';
 C.outcomes.selar.text='A administração fecha a galeria. As chamadas param na central. Os três técnicos não são encontrados e as provas da ordem de Augusto permanecem sob sigilo.';
 C.outcomes.selar.after='Meses depois, outro operador relata uma chamada às 00h17.';
 C.outcomes.selar.impact='Nenhum resgate confirmado · Segredo mantido';
 // Textos completos: o jogo mostra a fonte e não escreve a dedução do jogador.
 C.v2Documents={
  registro:{type:'Termo de obra',title:'Desvio da nascente — 1989',date:'11 de maio de 1989',origin:'Cópia da Casa do Barqueiro',lines:[
   'O leito da nascente será conduzido a uma galeria sob a capela. O acesso antigo ficará restrito à manutenção.',
   'Será instalado um equipamento acústico de bronze. O anexo técnico que descreve seu uso não acompanha esta cópia.',
   'Anotação na margem: “Retirar os nomes da pedra antes da entrega da obra”.']},
  manuscrito:{type:'Caderno pessoal',title:'Notas do vigário',origin:'Capela do Sino',date:'1989',lines:[
   'As famílias vinham repetir os nomes de quem não retornava. Diziam que a água às vezes respondia, mas não encontrei testemunha que tenha visto alguém na nascente.',
   'Depois do desvio, moradores afirmaram esquecer nomes de parentes. Podia ser medo da obra, ou o que estava sob a capela.',
   'A última linha foi arrancada. Restou: “Não tocar o sino durante a noite”.']},
  v2_a_1:{type:'Escala de plantão',title:'Turno 22h00–06h00',origin:'Centro de Controle',date:'30–31 de outubro',lines:[
   'Otávio Mendes: monitoramento. Marina Vilar, Paulo Lemos e Elisa Soares: folga. Dário Sanches: reserva.',
   '23h40 — convocação dos quatro por suposta falha. A correção foi feita em outra tinta, sem assinatura.']},
  v2_a_2:{type:'Extrato de chamadas',title:'Linha C-0',origin:'Centro de Controle',date:'31 de outubro',lines:[
   '23h40: aviso da central administrativa convoca quatro técnicos para a bomba 4.',
   '23h52: painel 4 sinaliza abertura manual do relé.',
   '00h17: a linha C-0, desativada em 1989, recebe quatro chamadas. O áudio registra: “Marina. Paulo. Elisa. Dário. Voltem ao lugar dos nomes.”',
   '00h19: o microfone externo registra um impacto de bronze, sem acionamento em livro de controle.']},
  v2_a_3:{type:'Mapa comparativo',title:'Traçado de 1989 e traçado atual',origin:'Centro de Controle',lines:[
   'O desenho antigo liga a galeria sul à nascente sob a capela. O desenho atualizado elimina a escada de acesso.',
   'Ao lado da escada há uma seta: “saída para a margem sul”. A marca está ausente da planta moderna.']},
  v2_b_2:{type:'Bobina mecânica',title:'Relé 4 — eventos',origin:'Galeria das Bombas',lines:[
   '23h52: ABERTO. Motivo: intervenção manual no painel.',
   '00h17: nenhum evento elétrico registrado.',
   '00h19: vibração registrada no tubo de bronze. Alimentação principal desligada.']},
  v2_b_3:{type:'Placa antiga',title:'Advertência da galeria',origin:'Galeria das Bombas',lines:[
   'NÃO RESPONDER À TERCEIRA CHAMADA QUANDO O SINO NÃO ESTIVER SOB CONTROLE.',
   'A placa foi instalada antes dos reparos modernos. A data está parcialmente raspada.']},
  v2_c_1:{type:'Licença de obra',title:'Autorização 47',origin:'Arquivo das Obras',date:'1989',lines:[
   'Autorizado o desvio da nascente e a construção da galeria de serviço.',
   'Os nomes gravados no paredão deverão ser catalogados antes da remoção.',
   'O anexo sobre oposição de moradores não foi localizado.']},
  v2_c_2:{type:'Ordem administrativa',title:'Isolamento antes da vistoria',origin:'Arquivo das Obras',date:'30 de outubro, 22h50',lines:[
   'Abrir manualmente o relé principal da bomba 4 antes da inspeção. Registrar a paralisação como falha operacional.',
   'Recolher as pastas de 1989 ao arquivo privativo da direção. Não consultar a equipe de preservação.',
   'Documento assinado por Augusto Ferraz. Não menciona emergência médica.'],signature:'Augusto Ferraz · Diretor'},
  v2_c_3:{type:'Carta não enviada',title:'Carta do barqueiro ao vigário',origin:'Arquivo das Obras',date:'1989',lines:[
   'Eu não vi quem respondia junto à água. Às vezes parecia saber o nome de quem estava faltando em nossa vila.',
   'Mandaram retirar os nomes da pedra e não me deixaram perguntar para que servia o sino.',
   'Se tornarem a chamar alguém de madrugada, verifiquem também quem tem a chave do relé.']},
  v2_d_1:{type:'Prontuário',title:'Atendimento 0417',origin:'Enfermaria da Barragem',date:'31 de outubro, 02h10',lines:[
   'Paciente: Dário Sanches. Encontrado na margem sul. Hipotermia leve, sem lesões de luta ou arrasto.',
   'Não recorda as horas entre o sino e o atendimento. Repete os nomes dos três colegas.'],signature:'Celina Prado · Enfermagem'},
  v2_d_2:{type:'Desenho do paciente',title:'Esboço da passagem',origin:'Enfermaria da Barragem',lines:[
   'Há uma escada, uma fonte e quatro inscrições numa laje.',
   'Marina, Paulo e Elisa estão escritos. O quarto nome foi apagado até rasgar o papel.',
   'No rodapé: “Não siga o sino quando ele tocar outra vez”.']},
  v2_d_3:{type:'Laudo de amostra',title:'Água retida no uniforme',origin:'Enfermaria da Barragem',lines:[
   'Os minerais encontrados coincidem com amostras da nascente antiga, não da superfície da represa.',
   'O laudo não comprova como o paciente chegou até ali.']},
  v2_e_1:{type:'Decalque de pedra',title:'Laje dos nomes',origin:'Nascente Subterrânea',lines:[
   'A laje conserva inscrições antigas de moradores. Três marcas recentes: MARINA VILAR, PAULO LEMOS e ELISA SOARES.',
   'Uma quarta inscrição foi interrompida. Uma frase antiga está legível: “Enquanto alguém lembrar, o caminho não fecha”.']},
  v2_e_2:{type:'Inventário de inspeção',title:'Conduto de bronze',origin:'Nascente Subterrânea',lines:[
   'O tubo de bronze liga o sino à parede da nascente. Uma vibração pode atravessar o metal sem movimento da corda.',
   'Há uma abraçadeira nova perto da passagem. O reparo não explica a chamada de uma linha telefônica desativada.']},
  v2_e_3:{type:'Nota de conservação',title:'Corrente de acesso',origin:'Nascente Subterrânea',lines:[
   'Corte recente de ferramenta. O metal antigo tem ferrugem regular, mas o novo corte ainda está claro.',
   'Há pó de bronze sobre o corte, semelhante ao encontrado no tubo do sino.']}
 };
 window.manualFirstCasePrepared=true;
})();
