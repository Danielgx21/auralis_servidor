# Batalha de Miniaturas — v2.6

Jogo HTML para computador e celular, com campanha solo, PvP local e PvP online por código de sala.

## Novidades

- **Elenco de 10 tipos de personagens por partida**: antes da primeira batalha, cada jogador escolhe os dez tipos disponíveis na sua loja. O elenco não é um limite de unidades no tabuleiro: as capacidades de campo e banco continuam as mesmas.
- **Alianças do elenco**: máximo de 4 tipos por aliança e mínimo de 3 alianças diferentes. As alianças no campo continuam com bônus de 2/4 personagens distintos.
- **Promoção**: 3 exemplares de um mesmo tipo e nível continuam evoluindo para uma miniatura de estrela superior; a loja restrita ao elenco facilita encontrar cópias.
- **Elenco fixo durante a partida**: no PvP, só muda na revanche ou em novo duelo. Cada participante tem sua própria seleção. No solo, o elenco é escolhido ao iniciar uma nova campanha.
- **PvP de resistência**: os dois jogadores começam com 70 de vida. Não há mais limite de três vitórias. O perdedor da rodada sofre dano segundo o número e as estrelas das unidades vencedoras sobreviventes, acrescido do tempo de partida: `dano = mínimo(25, 2 + piso((rodada − 1) / 5) + soma das estrelas sobreviventes)`. O confronto só acaba quando alguém chega a 0 vida.
- **Salvamento solo**: partidas de versões anteriores são migradas sem apagar as miniaturas já adquiridas; a loja passa a usar dez tipos escolhidos automaticamente para a campanha em andamento. Para escolher outro elenco, reinicie a campanha.

## Render — hospedagem do jogo existente

Usar a mesma branch e o mesmo serviço já publicados, sem criar novos projetos:

- Repositório: `Danielgx21/auralis_servidor`
- Branch: `batalha-miniaturas-online`
- Arquivos: `batalha-miniaturas/index.html`, `batalha-miniaturas/server.py`, `batalha-miniaturas/requirements.txt`
- Serviço: `batalha-de-miniaturas-pvp`
- URL: https://batalha-de-miniaturas-pvp.onrender.com
- Build: `pip install -r batalha-miniaturas/requirements.txt`
- Start: `python batalha-miniaturas/server.py`

O servidor é um retransmissor e gerenciador de salas; a simulação do combate é feita no dispositivo do criador, portanto PvP casual não oferece proteção completa contra trapaças. As salas ficam na memória do serviço e podem ser perdidas em reinícios. O progresso solo é salvo no navegador.

## Rodando localmente

```bash
pip install -r requirements.txt
python server.py
```

Abra `http://localhost:8000`. O arquivo `index.html` também funciona sozinho com modo solo e PvP no mesmo aparelho.
