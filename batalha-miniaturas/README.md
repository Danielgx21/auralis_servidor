# Batalha de Miniaturas — v2.7

## Regras
- Menu principal: Campanha, PvP, Jogo rápido e Escolha de elenco.
- Elenco de 14 tipos diferentes, no máximo 5 por aliança e pelo menos 3 alianças.
- A campanha mantém o próprio progresso e elenco salvo no navegador.
- O Jogo rápido usa o formato de 70 pontos de vida contra uma IA que compra miniaturas, procura fusões e posiciona o time em cada rodada.
- PvP local e PvP online usam 70 PV e precisam de duas equipes independentes.
- O elenco do menu é salvo para novas partidas.

## Hospedagem no Render
Repositório Danielgx21/auralis_servidor, branch batalha-miniaturas-online.
Comandos na raiz do repositório:
- Build: `pip install -r batalha-miniaturas/requirements.txt`
- Start: `python batalha-miniaturas/server.py`

Publique os arquivos deste pacote na pasta `batalha-miniaturas` da branch exclusiva. Não altera Manual das Criaturas nem Fragmentos de Auralis.
