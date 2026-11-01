# Batalha de Miniaturas — PvP online (v1.9)

Jogo casual de combate automático com salas para dois jogadores, executado no navegador e no celular.

## Como publicar no Render

Criar **um serviço Web separado**, com estas opções:

- **Repositório:** `Danielgx21/auralis_servidor`
- **Branch:** `batalha-miniaturas-online`
- **Runtime:** Python
- **Build command:** `pip install -r batalha-miniaturas/requirements.txt`
- **Start command:** `python batalha-miniaturas/server.py`
- **Plano:** Free (se disponível)

Depois da publicação, abra a URL HTTPS do serviço e toque em **PvP → Online → Criar sala**. O outro jogador abre a mesma URL e entra pelo código da sala.

## Rotas

- `/`: jogo completo
- `/ws`: WebSocket das salas
- `/health`: status em JSON

## Notas importantes

- O modo solo fica salvo no armazenamento do navegador, no mesmo domínio.
- As salas e os placares PvP existem apenas na memória do servidor e podem se perder com reinícios ou suspensão do serviço.
- A simulação de combate é executada pelo aparelho do criador da sala, com o servidor retransmitindo as mensagens; o PvP é casual e não possui verificação antitrapaça.
- O jogo não usa nem altera o servidor do Auralis ou do Manual das Criaturas.
