# Batalha de Miniaturas — Liga dos Reinos

Auto-battler de fantasia para navegadores, com interface para computadores e celulares.

## Recursos
- 36 miniaturas, seis clãs duplos (12 participações por clã), elenco de 14 personagens e tabuleiro 6×6.
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

## Novembro de 2026 — Arenas e efeitos cosméticos
- Loja > Personalizações: Castelo Abandonado, Floresta Encantada, Cripta Amaldiçoada e Arena Glacial.
- Efeitos equipáveis: quatro de entrada, quatro de eliminação e quatro de vitória.
- Compras, posse e equipamentos persistidos em mini_cosmetic_inventory (PostgreSQL), com testes em SQLite isolado.
- As arenas mudam apenas o visual local do tabuleiro, inclusive no PvP; não alteram o terreno lógico, obstáculos, dano ou velocidade.
- Efeitos integram eventos locais do combate e os frames visuais no duelo online, sem modificar o resultado do servidor.
- Aba Personalizações com filtros por tipo, pré-visualização e botões de comprar, equipar e remover.

## Novembro de 2026 — Emotes PvP e comemorações dos campeões
- PvP amistoso e ranqueado: emotes via WebSocket, com verificação de posse e seleção no servidor, cooldown de 2,5 segundos e botão para silenciar adversários.
- Cada conta recebe seis emotes gratuitos; novos emotes são comprados com moedas/cristais e até seis ficam equipados para o painel.
- Seis comemorações animadas com a arte dos próprios campeões: Guardião, Assassina, Necromante, Arqueira, Feiticeira e Serafina.
- A comemoração é exibida quando um campeão sobrevivente da equipe vencedora tem a animação adquirida e equipada.
- As compras e seleções ficam na tabela mini_social_inventory; nenhuma delas altera atributos, itens, dano ou pareamento.
- No ranqueado de quatro participantes, emotes são transmitidos somente aos dois jogadores de um mesmo confronto.

## Novembro de 2026 — 9 novas miniaturas
- Caçador de Ferro (Ferro/Selva): armadilha que causa dano e imobiliza.
- Engenheira Rúnica (Ferro/Arcano): torre temporária de três disparos.
- Porta-Estandarte (Ferro/Sagrado): intercepta projéteis e protege aliados.
- Camaleoa (Selva/Sombra): camuflagem e ataque furtivo.
- Druida das Cinzas (Selva/Elemental): raízes incendiárias.
- Tecelã do Vazio (Arcano/Sombra): bloqueia habilidades por duas ações.
- Cronomante (Arcano/Elemental): acelera aliados e atrasa inimigos.
- Inquisidora do Crepúsculo (Sombra/Sagrado): marca inimigos e cura aliados.
- Fênix Ancestral (Elemental/Sagrado): queima em área e renasce uma vez.
- Os seis clãs têm 12 ocorrências no elenco; níveis de sinergia seguem 3/6.
- As três miniaturas iniciais são Caçador de Ferro, Druida das Cinzas e Inquisidora; as outras seis podem ser adquiridas na loja com moedas.
- PvP, jogo rápido, campanhas e catálogo usam os mesmos identificadores; o servidor valida novos elencos.

## Retratos premium dos novos personagens (04/11/2026)
Os nove campeões lançados nesta atualização usam ilustrações individuais em um atlas AVIF de 576 × 576 px (grade 3 × 3, cada célula 192 × 192 px). A imagem fica em `assets/miniaturas-novos-retratos-20261104.avif` e é servida por `/assets/miniaturas-novos-retratos-20261104.avif`. O cliente usa o mesmo `miniArt(type)` nas telas de Catálogo, Loja, Elenco, tabuleiro e inspeções. Os dois clãs, itens e o tamanho anterior dos personagens permanecem intactos. O servidor valida o arquivo por tamanho e SHA-256 na inicialização.
