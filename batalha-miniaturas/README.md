# Batalha de Miniaturas — Liga dos Reinos v2.14 (amigos)

## Funcionalidades
- 27 miniaturas, 6 alianças, elenco de 14 personagens, tabuleiro 6x6.
- Campanha com mapa, Jogo rápido contra IA, PvP local e online.
- Contas online com nome de usuário, senha, avatar e progresso no PostgreSQL (Neon).
- Duelo entre amigos: adicionar por nome de usuário, aceitar ou recusar solicitações, visualizar presença e enviar convites.
- Aceitar o convite inicia automaticamente uma sala PvP, sem exigir troca de código.
- O PvP por código continua disponível. O sistema de matchmaking ranqueado ainda não foi implementado.
- Lista de amigos no banco mini_friends; convites e presença são temporários na memória do servidor.

## Infraestrutura
- Repositório: Danielgx21/auralis_servidor, branch exclusiva batalha-miniaturas-online.
- Pasta exclusiva: batalha-miniaturas/. Não alterar outros jogos.
- Render: batalha-de-miniaturas-pvp.
- Build: pip install -r batalha-miniaturas/requirements.txt
- Start: python batalha-miniaturas/server.py
- Variável sensível no Render: MINIATURAS_DATABASE_URL. Nunca enviar credenciais ao GitHub.
- Amigos: friends_api.py e friends_client.js; APIs existentes de conta e WebSocket preservadas.

## Segurança
- Solicitações de amizade exigem aceitação pelo destinatário.
- Convites só funcionam entre amigos aceitos e online; expiram em 120 segundos.
- O autor do convite precisa provar que criou a sala com seu token de reconexão.
- Duelo entre amigos não concede pontos de ranking.
