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

Próximo: o M2 (menu Lutar/Agir/Item/Poupar, fase de desvio e um inimigo que pode ser poupado). O design sugere começar pelo treino com o Mestre Orin no Pátio de Treino da Guarda, a batalha fácil que ensina o Poupar. A batalha deve entrar como um estado de sobreposição na pilha, como o diálogo. Os padrões de ataque vão em JSON.

Pendências conhecidas: não há controle por toque no celular, e o projeto ainda não foi enviado ao GitHub.

Para o conteúdo (personagens, itens, magias, mobs, missões, territórios), consulte `docs/design.md`. Ao criar os JSON em `data/`, siga os nomes e as regras de lá.
