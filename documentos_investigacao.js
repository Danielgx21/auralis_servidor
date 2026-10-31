'use strict';
/* Pranchas documentais e observação crítica.
   Não divulga automaticamente a interpretação das provas nem o responsável.
   Os originais são transcrições ficcionais dos objetos encontrados no jogo. */
(function(){
 if(typeof modal!=='function'||typeof CASES==='undefined')return;
 const PAPERS={
  lago:{
   registro:{type:'Registro administrativo',title:'Livro de Obras — folha 17',origin:'Arquivo da antiga represa',date:'Trinta e sete anos antes dos desaparecimentos',lines:[
    'A comissão autorizou o desvio da nascente para a margem norte. As medições anteriores à obra não foram anexadas a esta cópia.',
    'Por determinação da chefia, um sino de bronze será instalado junto à construção. A justificativa oficial menciona avisos de segurança e medição de vibrações.',
    'Nota posterior, em outra caligrafia: “Se o som voltar a se repetir quando não houver ninguém no campanário, não registre o ocorrido no livro público.”'
   ],signature:'Responsável pela medição: assinatura ilegível'},
   manuscrito:{type:'Caderno manuscrito',title:'Apontamentos do antigo vigário',origin:'Capela à beira da represa',date:'Últimas páginas preservadas',lines:[
    'Havia uma presença junto à água que reconhecia as pessoas por seus nomes, mesmo antes que fossem apresentados. Os moradores a procuravam quando se perdia alguém na margem.',
    'O grupo encarregado da obra exigiu silêncio. Disse que o sino impediria o retorno das vozes. Na terceira noite, porém, ouviu-se uma resposta depois de cada badalada.',
    'Há um trecho raspado. Restaram apenas as palavras: “sete”, “promessa” e “não repetir”. O autor não explica quem ordenou o ritual.'
   ],signature:'As folhas seguintes foram arrancadas'},
   inscricao:{type:'Decalque de inscrição',title:'Marcas sob a fuligem',origin:'Pedra da Capela do Sino',date:'Gravação antiga, reparo recente',lines:[
    'Fragmento do baixo-relevo: “NÃO FOI A ÁGUA ... FOI ... SINO”.',
    'Os sulcos do último termo estão mais fundos; a parte apagada foi raspada com um instrumento posterior à gravação.',
    'Uma numeração repetida aparece ao lado: VII. O símbolo também pode ser uma marca de oficina; não há confirmação sobre sua finalidade.'
   ],signature:'Decalque incompleto · Instituto de Estudos do Véu'}
  },
  baile:{
   convite:{type:'Convite dobrado',title:'Ao portador desta lembrança',origin:'Entrada das Mil Lanternas',lines:[
    'Sua presença é aguardada quando a última lembrança adquirir uma cor. Não traga seu nome escrito; ele será lembrado por você.',
    'Há sete pequenos pontos no rodapé. Só um deles aparece sob a luz do jardim. A palavra central não permanece estável ao mudar o ângulo do papel.'
   ],signature:'Sem remetente'},
   pacto:{type:'Página de livro',title:'Livro dos Convidados',origin:'Jardim de Espelhos',lines:[
    'Os nomes foram registrados em tintas de épocas diferentes. Alguns pertencem a famílias que ainda não nasceram.',
    '“Ao entrar, o convidado empresta ao salão aquilo que mais deseja rever.” A frase parece uma cortesia, mas foi escrita onde normalmente haveria uma assinatura.'
   ]}
  },
  vampiro:{
   contrato:{type:'Contrato selado',title:'Termos do último brinde',origin:'Biblioteca dos Pactos',lines:[
    'Cláusula IV: Nenhuma pessoa presente no brinde poderá declarar em voz alta a autoria do pacto enquanto o selo estiver sob custódia.',
    'O termo «custódia» foi acrescentado depois da redação original. O espaço reservado ao representante da família permanece em branco.'
   ]},
   livro:{type:'Livro de linhagem',title:'Regras de hospitalidade',origin:'Biblioteca dos Pactos',lines:[
    'A família está obrigada a proteger quem tiver sido formalmente apresentado como anfitrião, mesmo quando a pessoa não for de seu sangue.',
    'Uma nota na margem questiona: “Quem apresenta alguém, e quem guarda a prova de que houve a apresentação?”'
   ]}
  },
  lobo:{
   cartaz:{type:'Edital público',title:'Recompensa pela criatura',origin:'Praça da aldeia',lines:[
    'A recompensa será paga a quem apresentar prova de captura. A data da publicação antecede o desaparecimento que a vila usa para justificar a caçada.',
    'A assinatura é de um representante dos caçadores; não há testemunhas ou laudo anexados.'
   ]},
   caderno:{type:'Caderno de campo',title:'Anotações dos caçadores',origin:'Moinho',lines:[
    '“Se as famílias continuarem entrando no vale, não teremos a concessão da mina.”',
    'Mais abaixo: “A vila precisa de um motivo para temer a mata.” O trecho seguinte foi arrancado.'
   ]}
  },
  retrato:{
   recibo:{type:'Comprovante',title:'Recibo de aquisição',origin:'Depósito de Molduras',lines:[
    'Recebemos o valor correspondente à conservação perpétua de uma pessoa retratada. Não há cláusula autorizando saída ou devolução.',
    'A palavra «conservação» parece cobrir outra que foi raspada antes da assinatura.'
   ]}
  },
  estacao:{
   passagem:{type:'Bilhete de viagem',title:'Passagem nº 013',origin:'Plataforma da Névoa',lines:[
    'Data de embarque: amanhã. Destino impresso: uma estação que não consta de nenhum mapa de serviço.',
    'O bilhete foi perfurado por uma máquina desativada há quatro décadas.'
   ]}
  },
  museu:{
   registro:{type:'Livro de entradas',title:'Visitantes do turno da noite',origin:'Arquivo das Máscaras',lines:[
    'Seis nomes ocupam seis linhas. A inclinação e a pressão das assinaturas são idênticas, até nas letras diferentes.',
    'A linha destinada ao funcionário responsável está vazia.'
   ]}
  },
  lago2:{
   livro:{type:'Censo municipal',title:'Página de nomes rasurados',origin:'Cartório Inundado',lines:[
    'Todos os registros apagados foram agrupados na mesma folha, embora correspondam a bairros diferentes.',
    'Uma assinatura substituta foi aplicada à margem, mas não há requerimento dos moradores.'
   ]}
  },
  baile2:{
   roteiro:{type:'Roteiro cênico',title:'Ensaio para ontem',origin:'Palco de Amanhã',lines:[
    'ATO FINAL: a costura se fecha antes que se abra a cortina.',
    'ATO PRIMEIRO: uma pessoa chega com um convite que ainda não foi enviado.',
    'A sequência das páginas foi refeita à mão. Nenhuma numeração coincide com a ordem das cenas.'
   ]},
   convite:{type:'Carta dobrada',title:'Um convite que já aconteceu',origin:'Bilheteria Inexistente',lines:[
    'Esperamos que se recorde de sua última escolha. Algumas portas não podem ser reabertas; outras só existem porque você as fechou.',
    'Uma data antiga aparece sobre outra escrita ainda com tinta fresca.'
   ]}
  },
  vampiro2:{
   edital:{type:'Edital sucessório',title:'Convocação de herdeiros',origin:'Átrio de Juramentos',lines:[
    'Os nomes das crianças aparecem numa emenda datada depois do registro oficial. O carimbo da emenda tem o mesmo formato do original.',
    'Quem transferiu a tutela não assinou a segunda folha.'
   ]},
   registro:{type:'Registro notarial',title:'Livro de Silas',origin:'Arquivo dos Herdeiros',lines:[
    'Óbito declarado e transferência de todos os compromissos a um notário substituto.',
    'Não consta identificação do substituto: apenas a rubrica que se repete em documentos posteriores.'
   ]}
  },
  retrato2:{
   bilhete:{type:'Bilhete amassado',title:'Para quem encontrar a casa',origin:'Quarto dos Retratados',lines:[
    'Mantenha a casa desenhada até que todos retornem. O último rosto deve permanecer onde a moldura possa vê-lo.',
    'A assinatura foi feita com tinta diferente da mensagem.'
   ]},
   testamento:{type:'Testamento',title:'Disposição final do colecionador',origin:'Sótão das Telas',lines:[
    'Por ocasião do falecimento, a propriedade e as obras serão transferidas ao último retrato existente na residência.',
    'Uma pessoa foi riscada da lista de testemunhas sem justificativa.'
   ]}
  },
  estacao2:{
   papel:{type:'Recorte de jornal',title:'Notícia ainda não publicada',origin:'Campo das Antenas',lines:[
    'A edição anuncia uma ocorrência que as equipes de segurança afirmam ter conseguido impedir.',
    'O nome do responsável pela impressão foi substituído pelo número de uma frequência.'
   ]},
   relatorio:{type:'Relatório técnico',title:'Incidentes anunciados',origin:'Estúdio das Vozes',lines:[
    'O sistema transmitiu quatro avisos. Três incidentes foram evitados por medidas tomadas depois dos alertas.',
    'O quarto aviso não tem registro de ocorrência correspondente, mas foi marcado como «confirmado».'
   ]}
  },
  museu2:{
   contrato:{type:'Termo de pesquisa',title:'Autorização de acesso ao Núcleo',origin:'Núcleo do Manual',lines:[
    'O pesquisador autoriza o Instituto a conservar os resultados e a identificação das pessoas que participarão da investigação.',
    'A cláusula acrescentada à mão amplia o sentido de «resultados» a decisões futuras.'
   ]},
   manual:{type:'Primeira folha',title:'Manual das Criaturas — exemplar sem data',origin:'Núcleo do Manual',lines:[
    'O registro de uma ocorrência não é a mesma coisa que sua explicação. Duas pessoas podem observar o mesmo fato e atribuir-lhe sentidos opostos.',
    'Uma frase foi escrita sobre outra: “Não pergunte apenas o que aconteceu. Pergunte quem ganha quando você acredita.”'
   ]}
  },
  bolsonaros:{
   cartaz:{type:'Proclamação',title:'A volta da coroa',origin:'Praça da Coroa Partida',lines:[
    '“O reino foi próspero e pacífico sob os antigos soberanos.”',
    'À contraluz, a palavra «pacífico» cobre ordens mais antigas relativas a expulsões e vigilância. A assinatura é posterior ao papel.'
   ]},
   ata:{type:'Ata pública',title:'Registro da revolta',origin:'Arquivo dos Esquecidos',lines:[
    'Foi declarada a deposição da dinastia após sucessivas queixas de desabastecimento e prisões arbitrárias.',
    'Seguem-se assinaturas de moradores e representantes de bairros diferentes. Uma cópia recebeu carimbos muito depois da data da sessão.'
   ]}
  }
 };
 const documentPattern=/carta|bilhet|di[aá]rio|manuscrit|registro|livro|ata\b|contrat|testament|inscri|cartaz|convite|relat[oó]ri|edital|recibo|roteiro|document|p[aá]gina|papel|passagem|placa|proclama[cç][aã]o/i;
 function paperFor(id,clue){
  const detailed=CASES[s.caseId]?.v2Documents?.[id];
  if(detailed)return detailed;
  const curated=PAPERS[s.caseId]?.[id];
  if(curated)return curated;
  if(!documentPattern.test(id+' '+(clue?.name||'')))return null;
  return {type:'Documento encontrado',title:clue.name,origin:CASES[s.caseId]?.place||'Arquivo do Instituto',lines:[
   clue.detail||'O suporte está deteriorado e parte da escrita desapareceu.',
   'Há sinais de manuseio e trechos incompletos; não é possível estabelecer a intenção do autor apenas por esta folha.'
  ]};
 }
 const encode=x=>esc(String(x??''));
 function questionFor(id,e){
  const names=(id+' '+e.name).toLowerCase();
  if(/carta|contrat|testament|document|livro|registro|ata|bilhet|convite|papel|roteiro|edital|relat[oó]rio/i.test(names))
   return ['Quem escreveu isso, e em que momento?', 'O documento concorda com o depoimento das testemunhas?', 'Uma versão poderia ter sido alterada por interesse humano?'];
  if(/sino|som|r[aá]dio|eco|grava[cç][aã]o/i.test(names))
   return ['O som poderia ser provocado por um mecanismo?', 'Qual é a diferença entre o que foi ouvido e o que foi registrado?', 'Outros relatos repetem a mesma sequência?'];
  return ['Essa marca é anterior ou posterior ao acontecimento?', 'Há alguma causa natural ou humana plausível?', 'Que outro vestígio confirmaria ou refutaria sua hipótese?'];
 }
 function pageMarkup(page){
  return '<article class="fieldDocument" aria-label="Documento legível">'+
   '<div class="fieldDocumentTop"><span>INSTITUTO · REPRODUÇÃO DO ORIGINAL</span><span>✦</span></div>'+
   '<div class="fieldDocumentType">'+encode(page.type||'Documento')+'</div>'+
   '<h3>'+encode(page.title||'Folha encontrada')+'</h3>'+
   '<p class="fieldDocumentOrigin">'+encode(page.origin||'Local de origem desconhecido')+(page.date?' · '+encode(page.date):'')+'</p>'+
   '<div class="fieldDocumentBody">'+(page.lines||[]).map(p=>'<p>'+encode(p)+'</p>').join('')+'</div>'+
   (page.signature?'<p class="fieldDocumentSignature">'+encode(page.signature)+'</p>':'')+
   '<div class="fieldDocumentTail">— folha transcrita · trechos ilegíveis preservados —</div></article>';
 }
 const originalModal=modal;
 modal=function(){
  if(!s.modal)return '';
  const e=CASES[s.caseId]?.clues?.[s.modal];
  if(!e)return originalModal();
  const doc=paperFor(s.modal,e),questions=questionFor(s.modal,e);
  return '<div class="modalLayer" data-dismiss="1"><div class="modalPanel" role="dialog" aria-modal="true" aria-label="Pista: '+encode(e.name)+'">'+
   '<button class="modalClose" data-action="close" aria-label="Fechar">×</button>'+
   '<div class="modalIndex">ARQUIVO '+encode(CASES[s.caseId].number)+' · MATERIAL COLETADO</div>'+
   '<h2>'+encode(e.name)+'</h2>'+
   (doc?pageMarkup(doc):'<section class="fieldObservation"><div class="fieldObsLabel">OBSERVAÇÃO DO LOCAL</div><p>'+encode(e.detail)+'</p></section>')+
   '<section class="fieldReasoning"><div class="fieldObsLabel">PERGUNTAS PARA INVESTIGAR</div><p>O registro não determina uma conclusão. Considere versões diferentes:</p>'+
   '<ul>'+questions.map(q=>'<li>'+encode(q)+'</li>').join('')+'</ul></section>'+
   '<button type="button" class="btn outline" data-deep-journal-open="1">✎ Anotar no diário</button>'+
   '<button class="btn" data-action="close">Voltar à investigação</button></div></div>';
 };
 // Fragmentos visuais sem toque. São marcas discretas existentes na superfície,
 // não botões, não revelam respostas e não contam como pistas coletadas.
 const MARKS={
  lago:{
   lago:[{x:15,y:71,t:'B–17',rot:-9,type:'chalk'}],
   casa:[{x:78,y:46,t:'00·17',rot:1,type:'metal'}],
   capela:[{x:40,y:78,t:'VII',rot:-5,type:'stone'}]
  },
  baile:{portao:[{x:29,y:56,t:'VII',rot:-11,type:'paper'}]},
  vampiro:{biblioteca:[{x:48,y:53,t:'IV',rot:-5,type:'paper'}]},
  lobo:{aldeia:[{x:30,y:71,t:'RECOMPENSA',rot:-7,type:'paper'}]},
  retrato:{galeria:[{x:55,y:61,t:'AUTOR —',rot:-3,type:'paper'}]},
  estacao:{plataforma:[{x:25,y:66,t:'Nº 13',rot:1,type:'metal'}]},
  museu:{atrio:[{x:79,y:77,t:'I / II',rot:1,type:'stone'}]},
  lago2:{praca:[{x:25,y:66,t:'_ _ _',rot:-6,type:'stone'}]},
  baile2:{bilheteria:[{x:23,y:68,t:'–31',rot:1,type:'paper'}]},
  vampiro2:{atrio:[{x:24,y:67,t:'ANEXO II',rot:-8,type:'paper'}]},
  lobo2:{circulo:[{x:74,y:49,t:'IV',rot:1,type:'stone'}]},
  retrato2:{quarto:[{x:74,y:35,t:'AINDA AQUI',rot:-4,type:'paper'}]},
  estacao2:{antena:[{x:79,y:75,t:'CANAL 17',rot:0,type:'metal'}]},
  museu2:{hall:[{x:79,y:76,t:'VII',rot:0,type:'stone'}]},
  bolsonaros:{praca:[{x:73,y:44,t:'RETORNO',rot:-6,type:'paper'}]}
 };
 window.manualSceneMarks=function(caseId,sceneId){
  return (MARKS[caseId]?.[sceneId]||[]).map(mark=>
   '<span class="worldInscription worldInscription-'+mark.type+'" aria-hidden="true" '+
   'style="left:'+mark.x+'%;top:'+mark.y+'%;transform:rotate('+mark.rot+'deg) translate(-50%,-50%)">'+encode(mark.t)+'</span>').join('');
 };
 const css=document.createElement('style');
 css.textContent='.fieldDocument{background:radial-gradient(circle at 87% 9%,#f7e4b9,#e6d2a5 56%,#bca67f);color:#302820;border:3px double #9a7e50;border-radius:4px;padding:23px 18px 17px;margin:17px 0 24px;box-shadow:0 10px 24px #0005;position:relative}.fieldDocumentTop{display:flex;justify-content:space-between;border-bottom:1px solid #aa966e;padding-bottom:8px;color:#66523c;letter-spacing:.16em;font:700 9px system-ui}.fieldDocumentType{margin:18px 0 6px;font:700 10px system-ui;letter-spacing:.15em;text-transform:uppercase;color:#806444}.fieldDocument h3{font:normal 27px/1.2 Georgia,serif;margin:0 0 12px;color:#443321}.fieldDocumentOrigin{font:11px/1.5 Georgia,serif;color:#6f5e49!important;font-style:italic}.fieldDocumentBody{margin:22px 0}.fieldDocumentBody p{color:#342d24!important;font:16px/1.8 Georgia,serif!important;text-align:left;margin-bottom:18px}.fieldDocumentSignature{font:italic 15px Georgia,serif!important;text-align:right;color:#67523d!important;margin-top:18px}.fieldDocumentTail{border-top:1px solid #a8936f;text-align:center;font:10px system-ui;letter-spacing:.06em;padding-top:10px;color:#6f5a42}.fieldObsLabel{font:700 10px system-ui;letter-spacing:.14em;color:#cba76b;margin-bottom:12px}.fieldObservation{padding:10px 0}.fieldObservation p{font:16px/1.7 Georgia,serif!important}.fieldReasoning{border-left:2px solid #ac9064;padding:10px 15px;margin:10px 0 20px;background:#132a33}.fieldReasoning p{font:12px/1.6 system-ui;color:#c6d0c9}.fieldReasoning ul{padding-left:20px;margin:0}.fieldReasoning li{font:12px/1.7 system-ui;color:#ece0c8;margin-bottom:7px}.worldInscription{position:absolute;z-index:2;pointer-events:none;white-space:nowrap;font:700 clamp(8px,1.6vw,12px) Georgia,serif;letter-spacing:.06em;opacity:.74;mix-blend-mode:screen;text-shadow:0 1px 1px #000a}.worldInscription-chalk{color:#c6c5ad}.worldInscription-metal{color:#8ec1b8}.worldInscription-stone{color:#ccb89c}.worldInscription-paper{color:#d1b584}.locationsArtZoomPlane .worldInscription{font-size:calc(10px * var(--zoom-factor, 1));opacity:.72}';
 document.head.appendChild(css);
 render();
})();
