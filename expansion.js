'use strict';
// Volume IV: investimentos no Instituto, ferramentas e contratos opcionais.
const OFFICE_ROOMS={
 library:{name:'Biblioteca dos Sussurros',cost:120,icon:'▤',desc:'Organiza os indícios do caso e aponta um vestígio relevante sem resolver o enigma.',benefit:'Permite consultar o índice de pistas quando houver ao menos três evidências.',art:'assets/office_library.svg'},
 laboratory:{name:'Laboratório de Vestígios',cost:150,icon:'⚗',desc:'Processa amostras em cada missão e pode revelar uma evidência material.',benefit:'Uma análise de amostra por caso, após obter duas pistas; no cooperativo, disponível ao Analista.',art:'assets/office_laboratory.svg'},
 observatory:{name:'Observatório do Véu',cost:165,icon:'✧',desc:'Cruza seus arquivos e amplia a influência dos rastros deixados por decisões passadas.',benefit:'Exibe conexões entre missões e concede +1 de confiança quando há histórico relacionado.',art:'assets/office_observatory.svg'},
 sanctuary:{name:'Câmara de Salvaguarda',cost:185,icon:'⬡',desc:'Um local seguro para negociar a proteção de seres e testemunhas.',benefit:'Concede +2 de confiança nas negociações e um epílogo de proteção próprio por caso.',art:'assets/office_sanctuary.svg'}
};
Object.assign(GEAR,{
 camera:{art:'assets/gear_camera.svg',name:'Câmera Taumatúrgica',price:115,icon:'▣',type:'permanent',tag:'Registro',desc:'Fotografe uma evidência visível do cenário. A câmera a cataloga automaticamente, uma vez por investigação.',effect:'Obtém 1 indício do local, respeitando a especialização no cooperativo.'},
 pendulum:{art:'assets/gear_pendulum.svg',name:'Pêndulo de Prata',price:85,icon:'◈',type:'permanent',tag:'Lógica',desc:'Identifica dois caminhos plausíveis no quadro de provas, eliminando uma conclusão incorreta.',effect:'Uma leitura por caso; não resolve as ligações entre provas. Custa 6 pontos no competitivo.'},
 incense:{art:'assets/gear_incense.svg',name:'Incenso da Memória',price:28,icon:'♨',type:'consumable',tag:'Entrevista',desc:'Acalma o ambiente de uma entrevista e ajuda a testemunha a recordar um detalhe.',effect:'Uma vez por caso: +2 confiança e relato adicional.'},
 lantern:{art:'assets/gear_lantern.svg',name:'Lanterna do Véu',price:38,icon:'✹',type:'consumable',tag:'Exploração',desc:'Ilumina o cenário com uma frequência sobrenatural e encontra um vestígio oculto.',effect:'Consome uma carga para registrar uma pista acessível à sua função.'}
});
const FIELD_NOTES={
 lago:'As partículas de névoa soletram um nome que o vilarejo se recusa a pronunciar.',lago2:'Um selo de cera preserva a memória de uma família inteira.',
 baile:'O lustre pisca no exato ritmo dos pensamentos que não são seus.',baile2:'Uma gargalhada ficou costurada no forro da cortina.',
 vampiro:'Uma gota escura revela a assinatura que o anfitrião ocultou.',vampiro2:'A marca do comprador está presa à margem de um contrato antigo.',
 lobo:'O cheiro de prata aponta para uma trilha usada para proteger crianças.',lobo2:'A mineração deixou sobre o chão um símbolo conhecido por ambos os clãs.',
 retrato:'Uma pincelada carrega uma palavra que não cabe na moldura.',retrato2:'O reflexo pronuncia um nome diferente do rosto que espelha.',
 estacao:'O sino toca antes de ser atingido; algo está fora da sequência do tempo.',estacao2:'Uma voz gravada hoje descreve a previsão do amanhecer de amanhã.',
 museu:'O verniz de uma máscara preserva um pedido de socorro.',museu2:'O livro de inventário tenta apagar o próprio autor.'
};
const CONTRACTS=[
 {id:'clues',name:'Mapeamento completo',reward:28,desc:'Localize sete das nove pistas.',valid:s=>s.evidence.length>=7},
 {id:'board',name:'Parecer científico',reward:32,desc:'Resolva o quadro de provas do caso.',valid:s=>!!s.boardSolved},
 {id:'witness',name:'Entrevista documentada',reward:24,desc:'Registre ao menos duas respostas da testemunha.',valid:s=>s.witness.length>=2}
];
