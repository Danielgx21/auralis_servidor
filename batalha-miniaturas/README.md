# Batalha de Miniaturas — v2.5

Jogo de combate automático no navegador, com modo solo, PvP e campanha.

## Conteúdo da versão
- PvP online de **2 jogadores** por código, reconexão de 150 segundos e preparação com prazo de 120 segundos (reiniciável).
- Ranking e histórico de séries **privados da sala**, temporários em memória.
- Torneio **local de 4 participantes**, no mesmo aparelho, em duas semifinais e uma final.
- **27 miniaturas** em seis alianças: Ferro, Selva, Arcano, Sombra, Elemental e Sagrado.
- Catálogo com ficha, atributos, tipo de dano, habilidades e equipamento sugerido.
- Campanha de cinco regiões e chefes, desafios opcionais mais difíceis e relíquias.
- Simulador de balanceamento de 200 duelos, no navegador.

## Render
- Repo: `Danielgx21/auralis_servidor`
- Branch: `batalha-miniaturas-online`
- Build: `pip install -r batalha-miniaturas/requirements.txt`
- Start: `python batalha-miniaturas/server.py`
- URL: https://batalha-de-miniaturas-pvp.onrender.com

## Limites importantes
- Torneio para quatro amigos funciona localmente; o modo online permanece 1 × 1.
- Resultados do navegador dependem de armazenamento local; resultados da sala somem se o serviço reiniciar.
- O criador da sala simula as batalhas e o servidor transmite; não há antitrapaça.
- Render gratuito pode ficar suspenso por inatividade.
- As branches `main` e `manual-criaturas-v1` não devem ser alteradas.
