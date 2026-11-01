# Batalha de Miniaturas — v2.0 (solo + PvP online)

Jogo de estratégia casual para navegador, com 19 miniaturas, equipamentos, alianças, dano físico, mágico e verdadeiro, arenas, efeitos de status e simulador de balanceamento com 200 duelos.

## Jogo publicado

https://batalha-de-miniaturas-pvp.onrender.com

O servidor é um Web Service separado no Render, conectado à branch `batalha-miniaturas-online` do repositório `Danielgx21/auralis_servidor`.

### Configuração do serviço existente

- Runtime: Python
- Build: `pip install -r batalha-miniaturas/requirements.txt`
- Start: `python batalha-miniaturas/server.py`
- Root: repositório (sem rootDir separado)

### PvP online

Entre no site, abra **PvP**, crie uma sala e envie o código. Cada jogador prepara uma equipe no próprio dispositivo e confirma a formação. O primeiro a vencer três batalhas ganha.

As salas estão em memória. Se uma conexão cair, o servidor reserva a vaga por até **150 segundos** e o navegador tenta reconectar automaticamente com token exclusivo. Se a aba for recarregada rapidamente, a sessão do PvP poderá ser recuperada por `sessionStorage`. A rodada em andamento pode recomeçar após a reconexão, com o placar das rodadas concluídas preservado. Reiniciar o serviço do Render elimina as salas; a reconexão não garante continuidade após reinício ou expiração.

A simulação do PvP é conduzida pelo aparelho do criador e retransmitida por WebSocket, sem antitrapaça. Indicada apenas para partidas casuais entre amigos.

### Executar localmente

```bash
pip install -r requirements.txt
python server.py
```

Abra `http://localhost:8000` no navegador. O modo solo também funciona em arquivo HTML, sem servidor.

### Rotas

- `/` — jogo
- `/ws` — WebSocket
- `/health` — JSON de saúde

### Arquivos

- `index.html` — jogo completo
- `server.py` — servidor WebSocket
- `requirements.txt` — dependência do servidor
- `render.yaml` — blueprint opcional para publicação isolada
