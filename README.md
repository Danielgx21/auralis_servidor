# Manual das Criaturas 1.0 — Expedições persistentes

**Esta versão substitui a conexão PeerJS do 0.9 por um servidor WebSocket com persistência em banco de dados.** O jogo solo continua funcionando em um único arquivo HTML. Para uma sala realmente persistente, todos devem acessar o **mesmo servidor**; publicar somente o HTML no Netlify Drop NÃO ativa o multiplayer.

## Como executar no computador (teste local)

1. Instale Python 3.11 ou superior.
2. Dentro da pasta extraída, execute: `pip install -r requirements.txt`
3. Execute: `python server.py`
4. Abra `http://localhost:8765`.
5. Para testar em celulares da mesma rede Wi-Fi, abra `http://IP-DO-COMPUTADOR:8765` em cada celular. Pode ser necessário liberar a porta no firewall. Para acesso público pela internet, publique o servidor com HTTPS (WebSocket seguro WSS).

## Hospedagem real (servidor + dados duráveis)

- Hospede ESTA pasta num repositório independente do outro jogo.
- Configure um serviço Python no Render (ou outro serviço que aceite WebSockets), com o comando de instalação `pip install -r requirements.txt` e de início `python server.py`.
- **Configure `DATABASE_URL` de um banco Postgres persistente**. Sem Postgres, o servidor usa SQLite em `DATA_DIR/data/expeditions.sqlite3`; isso só resiste a reinicializações se esse diretório estiver em um disco durável do provedor. Um sistema de arquivos efêmero apaga as salas após uma recriação do serviço.
- O serviço deve permanecer acessível durante a partida. Em serviços que hibernam, a primeira reconexão pode demorar até o processo voltar.
- `https://SEU-SERVIDOR` serve o próprio jogo, o WebSocket é `wss://SEU-SERVIDOR/ws`. Não é necessário Netlify. O arquivo HTML único também aceita um endereço de servidor preenchido na tela de salas.

## Como se joga

- **2 a 5 jogadores**: crie uma expedição, mande o código, e cada pessoa entra com seu próprio codinome e aparelho.
- Cada participante tem uma **identidade secreta de 48 caracteres** vinculada à sua posição e especialização. O botão “Mostrar minha chave de retorno” na sala permite copiá-la para guardar com segurança. Ao trocar de navegador, insira essa chave no campo de recuperação além do código da sala. **Não compartilhe a chave pessoal com outras pessoas.**
- **Reconexão automática**: em interrupções de rede o cliente tenta voltar, com intervalo crescente até aproximadamente 12 segundos. As pistas e votos ficam no servidor; o jogador retorna à mesma posição. A missão é colocada em espera se qualquer integrante ficar offline.
- Se a pessoa que criou a sala sair, a coordenação é transferida para o participante conectado com menor número de posição. Quando a pessoa original retorna, mantém seu personagem e suas pistas, mas não interrompe a nova coordenação.
- Ao terminar uma missão, o coordenador seleciona “Encerrar a missão e ir ao Instituto”. Ali todos podem comprar itens individuais, melhorar o próprio laboratório, contribuir com o cofre coletivo e votar na próxima missão. O caso mais votado por **maioria absoluta**, depois de todos votarem, começa automaticamente. Sem maioria, fazem nova rodada. O cofre recebe 50 créditos somente pela primeira conclusão de cada caso naquela expedição. Melhorias coletivas usam o cofre e beneficiam as funções no cooperativo.
- Repetir casos ou abrir continuações depende da progressão individual previamente registrada. Os 14 casos continuam disponíveis.
- Os créditos, consumíveis, contratos e sede pessoal permanecem individuais. Uma cópia do perfil vinculada à chave de retorno fica no servidor, além do salvamento local original (`manual_criaturas_vol1_2026`).

## Limitações importantes

- É necessário um servidor publicado e acessível; somente um HTML estático não oferece salas permanentes nem reconexão entre redes.
- Quando um jogador sai, seu lugar fica reservado para seu retorno. A equipe não pode iniciar uma votação/fase nova enquanto alguém estiver offline; ela pode continuar depois que o participante voltar. Não existe expulsão automática nem opção de substituir uma identidade perdida nesta versão.
- Salas persistem enquanto o banco de dados permanecer disponível. Não há garantia de retenção para serviços externos, nem backup externo automático.
- Não há contas com senha, recuperação por e-mail ou proteção antifraude forte. O objetivo é jogar de forma casual com pessoas de confiança.
- Se perder a chave e apagar o armazenamento do navegador, não será possível reivindicar sua antiga posição numa sala cheia.

## Testes

`python test_server.py` (arquivo de testes disponível na pasta de desenvolvimento, não incluído no pacote para distribuição) cobre três jogadores, queda e retorno do anfitrião com a mesma posição, troca de coordenação, pistas compartilhadas, votos, cofre, próxima missão e reinício do servidor. Além disso, `node --check` verifica o JavaScript do cliente. Testes completos de interface em aparelhos reais ainda são necessários.
