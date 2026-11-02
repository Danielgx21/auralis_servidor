# Batalha de Miniaturas — Liga dos Reinos

Auto-battler de fantasia para navegadores, com interface para computadores e celulares.

## Recursos
- 27 miniaturas, seis alianças, elenco de 14 personagens e tabuleiro 6×6.
- Campanha, Jogo Rápido com IA, Duelo entre Amigos e PvP Ranqueado de quatro participantes.
- Contas online com nome, senha, avatar e progresso no Neon PostgreSQL.
- Duelo entre amigos por convite e sala privada, sem alteração de ranking.
- Ranqueado de quatro participantes: 70 de vida; bots para completar partidas; ranking de 100 pontos iniciais; variação +15/+5/−5/−15 para 1º/2º/3º/4º.
- Pontuação do ranqueado salva no banco mini_quad_results e mini_ranked_rating.

## Implementação e isolamento
- Repositório: Danielgx21/auralis_servidor.
- Branch exclusiva: batalha-miniaturas-online.
- Pasta exclusiva: batalha-miniaturas/.
- Render: serviço batalha-de-miniaturas-pvp.
- Build: pip install -r batalha-miniaturas/requirements.txt
- Start: python batalha-miniaturas/server.py
- Variável secreta: MINIATURAS_DATABASE_URL (não incluir credenciais no GitHub).

## 2.17.2 — Resultados de batalha
- O modal recebe os dados oficiais de quatro participantes em vez de interpretar texto de premiação.
- Mostra resultado da rodada, dano, vida, classificação final, identificação dos bots, variação de ranking e elo recebido.
- Botões separados para voltar ao menu e entrar em outra partida.
- Fluxos de Jogo Rápido, Duelo entre Amigos e Ranqueado mantidos sem alterar as regras da simulação.

## Pendências de validação
- Executar partidas completas no navegador em dispositivos reais para verificar transições.
- Verificar a sincronização dos efeitos visuais entre dois dispositivos.
- A trilha aprovada `Batalha_de_Miniaturas_Trilha_Batalha_PREVIA.mp3` não está presente na branch e ainda precisa ser integrada como mídia original; `battle_music_client.js` contém uma síntese, não o arquivo aprovado.
