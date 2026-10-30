'use strict';
// Arquivo 015: sátira sobrenatural inteiramente ficcional, sem alegações sobre pessoas reais.
CASES.bolsonaros={
  "number": "015",
  "title": "O Trono que Não Morre",
  "short": "O Trono que Não Morre",
  "subtitle": "Quando um povo esquece, os reis voltam.",
  "type": "LINHAGEM RETORNANTE",
  "place": "Reino de Cinzavila",
  "danger": "Alto",
  "victims": "Uma comunidade sob influência",
  "brief": "Séculos depois de depor uma dinastia cruel, Cinzavila desperta com estandartes reais nas ruas. Os moradores começam a repetir juramentos que juram nunca ter feito. Investigue os rastros do retorno dos Bolsonaros antes que uma nova coroação apague a memória da revolta.",
  "quote": "“Nós os derrubamos uma vez. O estranho é que agora muitos juram que nunca existiram.”",
  "intro": "O passado não descansa enquanto alguém o confunde com promessa.",
  "image": "assets/bolsonaros_praca.svg",
  "creatureImage": "assets/bolsonaros_revelacao.svg",
  "creature": "Os Bolsonaros",
  "creatureType": "Linhagem de soberanos retornantes",
  "creatureText": "Segundo a lenda fictícia de Cinzavila, antigos soberanos depostos sobrevivem como entidades alimentadas pelo culto à autoridade e pelo apagamento da memória. Manifestam-se por retratos, juramentos repetidos e símbolos de um trono que ninguém consegue manter vazio. Não são pessoas reais: são figuras de uma narrativa fantástica e satírica.",
  "phaseNames": null,
  "phaseText": "",
  "scenes": {
    "praca": {
      "name": "Praça da Coroa Partida",
      "subtitle": "A primeira mentira",
      "image": "assets/bolsonaros_praca.svg",
      "intro": "Uma estátua sem cabeça recebe flores novas. Os cartazes parecem trocar palavras quando ninguém olha.",
      "items": [
        "estatua",
        "cartaz",
        "brasao"
      ]
    },
    "arquivo": {
      "name": "Arquivo dos Esquecidos",
      "subtitle": "Provas contra a nostalgia",
      "image": "assets/bolsonaros_arquivo.svg",
      "intro": "Livros de registros foram reescritos. Há páginas antigas escondidas sob o assoalho.",
      "items": [
        "ata",
        "retratos",
        "lacres"
      ]
    },
    "sala": {
      "name": "Salão do Trono Vazio",
      "subtitle": "A cerimônia do retorno",
      "image": "assets/bolsonaros_sala.svg",
      "intro": "Uma coroa sem dono flutua diante do trono. As paredes respondem às vozes dos seguidores.",
      "items": [
        "coroa",
        "juramento",
        "espelho"
      ]
    }
  },
  "clues": {
    "estatua": {
      "name": "Estátua decapitada",
      "detail": "A base conserva nomes dos moradores que derrubaram a antiga dinastia. Alguém cobriu esses nomes com uma inscrição recente.",
      "insight": "A população já resistiu aos soberanos uma vez.",
      "x": 25,
      "y": 62
    },
    "cartaz": {
      "name": "Cartaz alterado",
      "detail": "Uma proclamação promete paz, mas a tinta revela, por baixo, ordens de expulsão e vigilância.",
      "insight": "A promessa atual contradiz o registro original.",
      "x": 73,
      "y": 44
    },
    "brasao": {
      "name": "Brasão em duplicidade",
      "detail": "A marca da antiga casa aparece nos mantos dos governantes depostos e em bandeiras recém-costuradas.",
      "insight": "O retorno é deliberado e organizado.",
      "x": 82,
      "y": 79
    },
    "ata": {
      "name": "Ata da revolta",
      "detail": "O documento descreve a queda dos reis e as condições de fome que antecederam a rebelião.",
      "insight": "A nostalgia ignora o sofrimento documentado.",
      "x": 22,
      "y": 55
    },
    "retratos": {
      "name": "Retratos que mudam",
      "detail": "Nos quadros, o mesmo rosto aparece em épocas diferentes. Quando alguém contesta, a tinta escorre.",
      "insight": "Os retornantes reescrevem sua própria imagem.",
      "x": 67,
      "y": 34
    },
    "lacres": {
      "name": "Lacres do povo",
      "detail": "Três assinaturas independentes confirmam que os documentos históricos não foram falsificados.",
      "insight": "Há testemunhos convergentes contra a versão oficial.",
      "x": 73,
      "y": 82
    },
    "coroa": {
      "name": "Coroa sem rei",
      "detail": "O metal pulsa quando os presentes repetem o juramento. Silencia quando leem os nomes das vítimas.",
      "insight": "A devoção sustenta a manifestação.",
      "x": 50,
      "y": 38
    },
    "juramento": {
      "name": "Juramento compulsório",
      "detail": "O texto exige obediência sem perguntas, mas uma cláusula antiga permite revogar a autoridade pelo testemunho coletivo.",
      "insight": "Existe uma saída sem sacrifício.",
      "x": 21,
      "y": 78
    },
    "espelho": {
      "name": "Espelho das multidões",
      "detail": "Não reflete quem está diante dele: mostra grupos debatendo livremente quando a coroa perde o brilho.",
      "insight": "A entidade teme a autonomia da comunidade.",
      "x": 79,
      "y": 61
    }
  },
  "witness": {
    "name": "Lídia dos Sinos",
    "role": "Guardadora da memória da vila",
    "image": "assets/bolsonaros_testemunha.svg",
    "intro": "Lídia preservou os relatos da revolta. Tem medo de que as pessoas a confundam com uma traidora apenas por mostrar documentos.",
    "questions": {
      "passado": {
        "q": "O que aconteceu com os antigos reis?",
        "answer": "Os moradores derrubaram a dinastia após anos de miséria. Eu tenho os registros, mas os cartazes novos contam o oposto.",
        "trust": 1
      },
      "retorno": {
        "q": "Como os soberanos retornam?",
        "answer": "Quando todos repetem o mesmo juramento, um vulto ocupa o trono. Quando alguém lembra os nomes esquecidos, ele vacila.",
        "trust": 1
      },
      "testemunhas": {
        "q": "Há alguém disposto a falar?",
        "answer": "Há descendentes dos rebeldes, sim. Eles falarão se souberem que ninguém ficará sozinho diante da coroa.",
        "trust": 1
      }
    }
  },
  "theories": {
    "fantasma": {
      "name": "Assombração do castelo",
      "kind": "Aparição comum",
      "desc": "Um único espírito toma o palácio e imita reis antigos."
    },
    "bolsonaros": {
      "name": "Linhagem dos Bolsonaros",
      "kind": "Retorno político-fantasmagórico",
      "desc": "Uma dinastia retorna por juramentos e manipulação da memória coletiva."
    },
    "fraude": {
      "name": "Golpe de atores",
      "kind": "Fraude humana",
      "desc": "Figurantes produzem fenômenos sem qualquer manifestação sobrenatural."
    }
  },
  "correct": "bolsonaros",
  "revealTitle": "O coro que veste a coroa",
  "reveal": "No Salão, não há um rei de carne: a coroa projeta uma série de vultos com o mesmo brasão. Cada juramento os torna mais nítidos. Ao abrir a ata da revolta, seus rostos se desfazem em pó.",
  "revealQuote": "“Não precisamos que nos amem. Basta que esqueçam por que fomos derrubados.”",
  "outcomes": {
    "libertar": {
      "label": "Romper a coroação",
      "desc": "Usar provas e revogar o juramento publicamente.",
      "needs": {
        "correct": true,
        "clues": [
          "coroa",
          "juramento",
          "espelho"
        ]
      },
      "unlock": "Exige teoria correta e as três provas do Salão.",
      "title": "O trono esvazia",
      "tag": "Libertação",
      "text": "Você reúne a comunidade diante da coroa. Ao lerem os nomes e revogarem juntos o juramento, os vultos perdem forma. O trono permanece vazio por escolha de todos.",
      "after": "A praça se transforma em um arquivo público da revolta.",
      "impact": "Cinzavila livre · Memória preservada",
      "points": 65
    },
    "negociar": {
      "label": "Impor um pacto de memória",
      "desc": "Negociar com garantias e testemunhas.",
      "needs": {
        "trust": 2,
        "clues": [
          "estatua",
          "lacres"
        ]
      },
      "unlock": "Exige confiança 2 e registros da resistência.",
      "title": "O pacto das testemunhas",
      "tag": "Acordo frágil",
      "text": "Lídia convence os moradores a preservar as provas e criar um pacto que limita a influência dos retornantes. A coroa recua, mas não desaparece.",
      "after": "A vila institui vigílias para lembrar sua história.",
      "impact": "Reino protegido · Ameaça latente",
      "points": 35
    },
    "expor": {
      "label": "Publicar os registros",
      "desc": "Confrontar a propaganda sem interromper o ritual.",
      "needs": {
        "correct": true,
        "clues": [
          "cartaz",
          "ata"
        ],
        "witness": [
          "passado"
        ]
      },
      "unlock": "Exige teoria correta, duas provas e o relato do passado.",
      "title": "A mentira perde a máscara",
      "tag": "Revelação",
      "text": "Os registros são divulgados e a narrativa da dinastia entra em colapso. Parte da população recupera suas lembranças, embora a coroa ainda resista no salão.",
      "after": "O povo exige um novo julgamento público.",
      "impact": "Mentiras expostas · Ritual enfraquecido",
      "points": 30
    },
    "selar": {
      "label": "Quebrar a coroa à força",
      "desc": "Destruir o símbolo antes de compreender o ritual.",
      "needs": {},
      "unlock": "Sempre possível.",
      "title": "A coroa em mil pedaços",
      "tag": "Consequência grave",
      "text": "O metal se parte, mas cada fragmento reproduz um juramento. A vila aprende tarde demais que o culto não estava preso a um único objeto.",
      "after": "Pequenas coroas começam a aparecer nas casas.",
      "impact": "Ritual disperso · Risco elevado",
      "points": 5
    }
  },
  "difficulty": "Intermediário",
  "minClues": 5,
  "prerequisite": null
};
RESEARCH_CASES.bolsonaros={
  "pair": [
    "ata",
    "coroa"
  ],
  "question": "O que faz a coroa ganhar e perder poder?",
  "choices": [
    "A coroa é alimentada pela repetição do juramento e enfraquecida pela memória documentada.",
    "O metal reage apenas à temperatura do salão.",
    "Os antigos rebeldes instalaram um mecanismo de cordas."
  ],
  "answer": 0,
  "conclusion": "Os registros da revolta interrompem o efeito do juramento: a lembrança coletiva enfraquece a linhagem.",
  "link": "museu2",
  "memory": "Uma folha do Manual registra outras tentativas de manipular escolhas por meio da memória."
};
CASE_GEAR.bolsonaros={
  "lens": "Atrás da tinta dos cartazes, a assinatura do decreto antigo desmente a mensagem atual.",
  "recorder": "Lídia reconhece a mesma voz em juramentos gravados com centenas de anos de intervalo.",
  "compass": "Compare a ata da revolta à reação da coroa: os soberanos precisam que o povo se esqueça.",
  "amulet": "Você propõe o direito de contestar em público cada ordem atribuída ao trono.",
  "ward": "Os antigos nomes são gravados numa placa de bronze que resiste à névoa da coroação."
};
FIELD_NOTES.bolsonaros='Quando um morador lê um nome apagado, os estandartes parecem perder a cor por um instante.';
