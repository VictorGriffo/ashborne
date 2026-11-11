# Ashborne

RPG de exploração em 3D, com combate por turnos inspirado em Undertale. O projeto roda no navegador, é hospedado no GitHub Pages e é instalável como app (PWA). O dono do projeto é o Victor e fala português do Brasil: responda sempre em português.

## Onde está o design

- **Design completo e detalhado: `docs/design.md`.** Leia este arquivo antes de criar qualquer conteúdo (personagens, itens, magias, mobs, missões, territórios, NPCs). Siga os nomes e as regras de lá.
- Links online (privados, podem não abrir no Code): documento https://claude.ai/artifact/9dKX2dZjb5gkmucGJpJnQg e painel https://claude.ai/artifact/B15gY8oT2P2b52yxpdqHTS

O design está fechado. Não há decisão de design pendente. Valores de dano, preço e velocidade dos ataques serão ajustados nos testes de jogo.

## Resumo do jogo

- **Nome:** Ashborne (renascido das cinzas). **Mundo:** Aetheria.
- **Protagonista:** Ryben, 15 anos na parte 1 (juventude) e 24 na parte 2 (exílio), com um salto de 9 anos.
- **Vilão:** o conselheiro Vaelor, que manipula Ryben para retirar o Coração de Aether, destruir os sete selos e libertar a magia antiga.
- **Parte 1:** uma única área jogável (vila, Guarda, floresta, estrada, santuário). Termina na catástrofe, com derrota obrigatória.
- **Parte 2:** a mesma geografia transformada, com sete territórios, cada um com um general, um selo e uma magia. A ordem dos territórios é livre. A vila vira o hub, reconstruído aos poucos.
- **Finais (o sacrifício é sempre uma escolha):** Cinzas (Ryben se sacrifica), Renascido (sobrevive, com Laços altos e os sete selos) e Ruína (poucos Laços, Vaelor vence).
- **Magia:** Ryben perde as magias da juventude depois do salto. Cada selo restaurado concede uma magia nova. Recurso: Aether.
- **Moeda:** Brasas.

## Combate

Menu Lutar, Agir, Item e Poupar. No turno do inimigo, o jogador controla um símbolo dentro de uma caixa e desvia dos ataques (sobreposição 2D sobre o 3D). Agir revela como acalmar o inimigo e Poupar encerra a batalha. Poupar rende Laços (segunda trilha de progressão) e lutar rende experiência. Padrões de ataque ficam em JSON.

Dificuldade: Tranquilo, Aventura (padrão) e Desafio, trocáveis no menu a qualquer momento. O modo muda só a luta, nunca a história nem os finais.

## Mundo e exploração

- Mundo aberto: exploração livre dentro de cada área e cutscenes para trocar de área.
- Câmera de cima, em ângulo fixo, estilo Zelda.
- Mobs visíveis no mapa. A batalha começa ao encostar neles.
- Mapa-múndi com a missão ativa marcada. Transporte: a pé, viagem rápida entre saves, carroça, barco, montaria e portais de Aether.
- Estilo: 3D low-poly estilizado. Paleta escura em azuis, roxos e verdes (detalhes no documento).

## Stack e convenções

- TypeScript, Vite, Three.js.
- Dados em JSON, separados do código: itens, magias, mobs, padrões de ataque, missões, diálogos, personagens.
- Git desde o primeiro dia, commits pequenos.
- No Vite, configurar `base` para o GitHub Pages do projeto. Publicar com GitHub Actions.
- Progresso salvo no navegador (localStorage ou IndexedDB).
- Modelos 3D e áudio: pacotes prontos com licença livre (CC0), como Kenney e Quaternius. Registrar a licença de cada arquivo em `CREDITOS.md`.

Estrutura de pastas sugerida:

```
ashborne/
  CLAUDE.md
  README.md
  CREDITOS.md
  package.json
  vite.config.ts
  src/
    core/        game loop, estados, entrada, save
    render/      Three.js: cena, câmera, modelos
    world/       áreas, colisão, mapa, transporte
    battle/      menu, fase de desvio, poupar
    systems/     inventário, nível, Laços, loja, missões, diálogos
    ui/          menus e caixas de texto
  data/          JSON de itens, magias, mobs, ataques, missões, personagens
  assets/
    modelos/
    audio/
```

## Roadmap

| Marco | Entrega |
| --- | --- |
| M0 | Projeto base, game loop, máquina de estados, uma cena 3D com câmera e um personagem provisório andando, e README. |
| M1 | Uma sala 3D com colisão e um NPC com diálogo, usando modelos de pacotes prontos. |
| M2 | Menu Lutar/Agir/Item/Poupar, fase de desvio e um inimigo que pode ser poupado. |
| M3 | Inventário, experiência e nível, mapa, salvar e carregar, e viagem rápida. |
| M4 | Parte 1 completa: a área inicial, os mobs, as missões 1.1 a 1.5 e a catástrofe. |
| M5 | Salto de nove anos: a vila em ruínas, a resistência e o primeiro território com selo e magia. |
| M6 | Os outros seis territórios, generais, selos e magias, com carroça, barco e montaria. |
| M7 | Kael, o santuário final, as missões secundárias, arenas e polimento. |

## Próximo passo

M0 e M1 estão feitos. O jogo começa no Salão da Guarda (sala montada por `data/areas/salao-da-guarda.json` com peças KayKit Dungeon Remastered), com o Mestre Orin e um diálogo com escolhas e flags. A porta do norte leva à Clareira do Altar (gerada no código). Ryben usa o modelo KayKit Rogue e o Orin usa o Knight, ambos com animações. O README explica a arquitetura.

O M2 também está feito: dois Brotinhos de Aether passeiam pela clareira; encostar começa uma batalha (`src/battle/`) com Lutar (barra de precisão), Agir (acalma), Item (Erva-lume) e Poupar/Fugir, e a fase de desvio com a brasa numa caixa 2D. Poupar rende Laços, vencer rende experiência e Brasas. Mobs, padrões de ataque e itens estão em `data/mobs.json`, `data/ataques.json` e `data/itens.json`. O estado do Ryben (vida, atributos, inventário, Laços, XP, Brasas, dificuldade) fica em `src/systems/PlayerState.ts`. A dificuldade muda no menu de pausa.

**Celular deitado é plataforma principal** (pedido do Victor): há controles de toque (`src/ui/TouchControls.ts`: analógico dinâmico na metade esquerda, botões A, B e pausa), layout compacto para telas baixas (`@media (max-height: 500px)`), aviso para girar em pé, tela cheia com trava na horizontal no primeiro toque, e manifesto PWA com `orientation: landscape`. Toda tela nova precisa funcionar com toque e caber em 844×390.

O M3 também está feito: níveis em `data/progressao.json` (PlayerState.gainXp), Bolsa (`InventoryState`: usar cura, equipar), mapa (`MapState`, `data/mapa.json`), pontos de save (Cristal da Guarda no salão, Altar de Aether na clareira) que curam, salvam no `localStorage` (`src/systems/SaveGame.ts`) e fazem viagem rápida, e título com Continuar/Novo jogo (`src/core/session.ts`). Missões ficam em `data/missoes.json` (etapas concluídas por flags); a 1.1 "Primeiro dia na Guarda" já existe em versão curta. O estado do mundo (áreas descobertas, pontos de save, mobs) fica em `WorldState`. Salvar faz mobs derrotados voltarem; poupados continuam poupados.

O M4 também está feito: a Parte 1 inteira. Áreas: Vila (início, na porta da Maren), Salão da Guarda, Pátio de Treino, Clareira do Altar, Estrada do Santuário e Santuário do Coração. Áreas ao ar livre são JSON (`"tipo": "ar-livre"`, classe `OutdoorArea`) com objetos feitos em `src/render/props.ts`. Missões 1.1 a 1.5 em `data/missoes.json`, diálogos de todos os personagens em `data/dialogos.json`, mobs e chefes em `data/mobs.json`, cutscene da catástrofe em `data/cenas.json` (`CutsceneState`), loja em `data/lojas.json`, e tela de fim da Parte 1 (`EndOfPartState`). Condições por flags (`se`/`naoSe`) controlam NPCs, saídas e diálogos; diálogos e coisas examinadas disparam `acao` (`batalha:`, `loja:`, `cena:`).

Próximo: o M5 (salto de nove anos: a vila em ruínas, a resistência e o primeiro território com selo e magia). Ao terminar a Parte 1, a flag `parte-1-concluida` é marcada, mas o jogo ainda não salva sozinho nesse momento; o M5 deve decidir como a Parte 2 começa a partir do save. Pendências: o projeto ainda não foi enviado ao GitHub; não há service worker (o jogo não funciona sem internet); o download inicial é de ~20 MB (cada personagem KayKit traz as 75 animações; dá para separar as animações num arquivo só); a vila tem ~390 chamadas de desenho (dá para juntar os objetos estáticos).

Para o conteúdo (personagens, itens, magias, mobs, missões, territórios), consulte `docs/design.md`. Ao criar os JSON em `data/`, siga os nomes e as regras de lá.

## Estado atual (M5 e M6 feitos, M7 pendente)

O celular deixou de ser prioridade (o Victor não vai lançar para celular); o suporte a toque que existe permanece, mas não precisa de mais testes.

**M5 feito:** Parte 2 começa com `startPartTwo` (salva sozinho), vila em ruínas, Campos de Linne, selo 1, magias (`data/magias.json`, `src/systems/spells.ts`; Magia fica dentro de Agir), Aether, níveis 1–30 (`data/progressao.json`).

**M6 feito (commitado, tsc e build passam):** cinco territórios em `data/areas/` (Sylven, Morn, Sahr, Frostveil, Costa de Maré Alta) com generais Thessaly, Gorm, Dravik, Isolde e Brannic, selos 2 a 6 e as magias. Transportes em `data/transportes.json` e `TravelState` (carroça 5 Brasas, barco 10 Brasas, montaria ×1,4). Testado de ponta a ponta com `window.dev` até o selo 6 (Maré Calmante). Ainda não testado: efeito de cada magia em batalha (Florescer, Véu, Lança Solar, Congelar) e o visual de Sylven depois de escurecida.

**Ferramentas de teste (só em `npm run dev`):** `window.dev` em `src/devtools.ts` (`ready, skipToPart2, seals(n), go(area,spawn), talk, mob, battle, pedestal, status, look`). Node fica em `C:\Program Files\nodejs` (não está no PATH do PowerShell/Bash do Claude: `$env:Path = "C:\Program Files\nodejs;" + $env:Path`). Nunca editar arquivos via `Set-Content` (corrompe UTF-8). Scripts de teste longos estouram timeout: dividir em blocos curtos.

**Próximo: M7.** Cidadela de Aetheria Alta + Kael (7º general, selo 7, Luz do Alvorecer), santuário final contra Vaelor com os 3 finais (Cinzas, Renascido, Ruína; Laços decidem), missão "O que Maren escondeu", missões secundárias e arenas (ver `docs/design.md`), polimento e trocar o passo placeholder da missão 2.4. Atualizar README.md e CREDITOS.md para M5/M6.

## Estado do M7 (parcial, atualizado depois)

**Feito e testado com `window.dev`:** Cidadela de Aetheria Alta (`data/areas/cidadela.json`, id `cidadela`, chega-se pela carroça com 6 selos), mobs Guarda Corrompido, Armadura Vazia, Rato Real, Estátua Viva e o general Kael (poupável; marca `kael-superado`), selo 7 e a magia Luz do Alvorecer, portão para `santuario-final` (Vaelor + Coração), batalha `vaelor-final` e os três finais em `data/dialogos.json` (`vaelor-final`) e `data/cenas.json` (`final-cinzas/renascido/ruina`), com telas em `EndOfPartState`. Regra dos finais: menos de 12 Laços (`LACOS_ALTOS` em ExploreState) → Ruína direto; 12 ou mais → batalha com Vaelor e depois escolha (Cinzas, ou Renascido se tiver os 7 selos). A Maren aparece na vila (`maren-p2`) depois de 3 selos e conta a verdade sobre Daren. Ao fim de um final o jogo volta ao título.

**(Resolvido depois: custo de vida da Luz do Alvorecer, teste das sete magias, secundárias do Tob e da Lyra, CREDITOS.)** Ainda faltava: missões secundárias (A carta de Mira, As invenções do Tob, Provas do Mestre Orin, Moradores desconfiados, Os desertores, Lembranças da Guarda, Ervas para a Lyra, Como era antes), arenas (Arena da Guarda, procurados, duelos de Laços), balancear os Laços/dano (nada foi ajustado de verdade), testar o efeito de cada magia em batalha (Florescer, Véu, Lança Solar, Congelar, Luz do Alvorecer; hoje Luz do Alvorecer é só dano alto, sem o custo ligado ao sacrifício) e atualizar README.md e CREDITOS.md.

**Atualização:** Arena da Guarda (NPC `guarda` na vila, 2 selos; duelos contra Guarda Corrompido, Armadura Vazia e Estátua Viva) e o arco da Mira (perdoa com 4 selos; flag `mira-perdoou`) estão feitos. As missões secundárias não aparecem no diário (o diário só mostra a missão principal); são conduzidas por flags em diálogos. Ainda faltam as outras secundárias, o balanceamento e README/CREDITOS.

**Fechamento:** a Luz do Alvorecer cobra 25% da vida máxima (`custoVida` em `magias.json`, nunca mata); as 7 magias foram testadas em batalha; secundárias feitas: Mira, Tob (`tob-invencao`), Lyra (`lyra-como-era`), Maren, Arena da Guarda. Sobram só: provas do Orin, desertores, lembranças da Guarda, ervas, carta de Mira e balanceamento fino (Laços ≥ 12 para os finais, dano, preços).

**Publicado (2026-11-11):** código em https://github.com/VictorGriffo/ashborne (público) e jogo em https://victorgriffo.github.io/ashborne/. Cada push na `main` publica sozinho pelo GitHub Actions (`.github/workflows/deploy.yml`). O `gh` fica em `C:\Program Files\GitHub CLI` e já tem o escopo `workflow`.

## Reformulação visual (2026-11-11)

O Victor pediu para o jogo deixar de ser geométrico e ficar "como um novo Zelda", com câmera livre, e mandou artes conceituais de fantasia sombria (eclipse, castelo gótico, magia azul, ruína em vermelho). Isso substitui a "câmera de cima em ângulo fixo" do design.

- **Câmera:** terceira pessoa (`src/render/CameraRig.ts`): gira 360° com mouse (arrastar), Q/E, analógico direito ou arrastando a metade direita da tela de toque; roda do mouse aproxima; C ou R3 centraliza. Clique curto do mouse (ação `click` do Input, sem arrastar) interage com o alvo e avança diálogos. O movimento do Ryben é relativo à câmera. Paredes de salas e árvores (`area.cameraOccluders`) puxam a câmera para perto. Valores em `data/config.json` (`camera`).
- **Visual:** céu em shader com nuvens, lua ou eclipse e serras no horizonte (`src/render/Sky.ts`; o eclipse fica no céu da Parte 2 até o selo 7); bloom (`Renderer`); sombreamento liso com quinas preservadas (`toCreasedNormals` em `geometry.ts`); chão liso com manchas; vegetação da Quaternius em instâncias com vento (`src/render/nature.ts`), só perto da área jogável (máx. 48 árvores detalhadas por área), árvores leves ao longe.
- **Desempenho (GPU integrada Intel UHD do Victor):** no máximo 4 luzes pontuais acesas, as mais perto do Ryben (`LightBudget`); resolução dinâmica no `Renderer` (baixa até 50% se o quadro passar de 22 ms); sombra 1024 px.
- **Personagens 2.0: Gemini + gerador 3D (decisão de 2026-11-11, ver fim de `docs/plano-2.0.md`).**
- **Pedidos para o ChatGPT/Gemini** (folhas de personagem, objetos e abertura): `docs/prompts-chatgpt.md`; imagens geradas vão para `docs/arte/`.
- **Ainda não reformulado:** a Clareira do Altar (`ClearingArea`, feita em código) ganhou o céu novo, mas não a vegetação da Quaternius; os personagens e mobs continuam os mesmos modelos (só com sombreamento liso).

## Próximo passo: versão 2.0 (a partir de 2026-11-11)

A versão 1.0 está marcada na tag `v1.0`. **Antes de qualquer trabalho visual, leia `docs/plano-2.0.md`.** Resumo do que o Victor pediu:
- personagens modelados de novo e mais realistas, gerados a partir das artes conceituais dele (ChatGPT → Meshy/Tripo → Mixamo);
- cenário sem formas geométricas;
- referências de jogos atuais;
- **mundo contínuo e amplo**, com casas que se entra de verdade, sem sala solta no preto; troca de área só em momentos especiais;
- abertura ilustrada antes do jogo começar.

Limite de tamanho: **800 MB**. O Victor precisa criar e logar as contas (Meshy ou Tripo, Mixamo, ChatGPT) no navegador do app; o Claude não cria contas nem digita senhas.
