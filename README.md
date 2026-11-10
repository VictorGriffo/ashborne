# Ashborne

RPG de exploração em 3D com combate por turnos inspirado em Undertale, em que poupar o inimigo é uma forma válida de vencer. Ryben, aos 15 anos, é manipulado pelo conselheiro Vaelor e causa a catástrofe que devasta Aetheria. Nove anos depois, ele volta para reconstruir o reino, renascido das cinzas.

O jogo roda no navegador, fica hospedado no GitHub Pages e poderá ser instalado como app (PWA).

- Documento de design: [`docs/design.md`](docs/design.md)
- Instruções para o Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Como rodar

Requisitos: [Node.js](https://nodejs.org) 20 ou mais recente.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento, com recarga automática |
| `npm run build` | Checa os tipos e gera a versão final em `dist/` |
| `npm run preview` | Serve a pasta `dist/` para testar a versão final |
| `npm run typecheck` | Só checa os tipos do TypeScript |

## Controles

| Ação | Teclado | Controle |
| --- | --- | --- |
| Andar | WASD ou setas | Analógico esquerdo ou direcional |
| Correr | Shift | X / □ |
| Confirmar, falar com NPC | Enter, Espaço ou Z | A / × |
| Voltar | X ou Esc | B / ○ |
| Pausar | Esc ou P | Start / Options |
| Painel de depuração | F3 | |

O jogo pausa sozinho quando a janela perde o foco.

## O que dá para jogar (M1)

O jogo começa no **Salão da Guarda**. Fale com o **Mestre Orin** (chegue perto, de frente para ele, e aperte Enter): a conversa tem escolhas e muda depois da primeira vez. A porta do norte leva à **Clareira do Altar**, e a trilha ao sul da clareira traz de volta ao salão.

## Estrutura

```
ashborne/
  data/                 dados em JSON, separados do código
    config.json         velocidades do jogador, câmera e loop
    personagens.json    modelo, acessórios e animações de cada personagem
    dialogos.json       árvores de diálogo, com escolhas e flags
    areas/              plantas das salas (peças, colisão, NPCs, entradas e saídas)
  docs/                 documento de design
  public/               arquivos copiados sem processamento (ícone)
  src/
    core/               game loop, máquina de estados, entrada, matemática
      states/           carregamento, título, exploração, diálogo, transição e pausa
    render/             Three.js: renderizador, câmera, carregador de modelos, personagem animado
    world/              jogador, NPCs, colisão e áreas
    systems/            diálogos e flags de progresso
    ui/                 menus, caixa de diálogo, telas e painel de depuração
  assets/
    modelos/            modelos 3D CC0 (KayKit), com a licença de cada pacote
    audio/              músicas e efeitos
```

### Como o código se organiza

- **Game loop** (`src/core/GameLoop.ts`): a lógica roda em passos fixos de 1/60 s e o desenho interpola entre os passos. O jogo se comporta igual em monitores de 60 Hz ou 144 Hz, o que importa para a fase de desvio do combate.
- **Máquina de estados** (`src/core/StateMachine.ts`): uma pilha. Só o estado do topo recebe a lógica. Estados de sobreposição, como o título e a pausa (e, no M2, a batalha), deixam o estado de baixo aparecer congelado.
- **Entrada** (`src/core/Input.ts`): o jogo pergunta por ações (`confirm`, `up`, `pause`), não por teclas. Teclado e controle funcionam juntos, e trocar teclas depois só mexe no mapa.
- **Dados** (`data/`): números de ajuste ficam em JSON. Itens, magias, mobs, padrões de ataque, missões e diálogos também vão para lá, seguindo os nomes do documento de design.
- **Áreas** (`src/world/`): cada área tem colisão, entradas, saídas e NPCs. As salas são montadas a partir de `data/areas/*.json` com peças do kit KayKit; a colisão dos móveis e paredes sai do volume de cada modelo, e o JSON só precisa de caixas extras (como os lados de uma porta).
- **Colisão** (`src/world/Collision.ts`): vista de cima, o jogador é um círculo e o cenário é feito de caixas, círculos e bordas. O personagem desliza ao encostar.
- **Diálogos** (`data/dialogos.json`): cada nó tem quem fala, as falas, e depois escolhas, um próximo nó ou o fim. O início pode depender de flags (`"se": "conversou-com-orin"`), e um nó pode marcar flags ao terminar.
- **Modelos** (`src/render/Assets.ts`): qualquer `.glb` em `assets/modelos` vira um nome curto, como `kaykit-dungeon/wall`, usado nos JSON.

### Como montar uma sala nova

1. Coloque os modelos em `assets/modelos/<pacote>/` e registre a licença em `CREDITOS.md`.
2. Crie `data/areas/<id>.json` seguindo `salao-da-guarda.json` (posições na grade de 4 do kit, `rot` em graus).
3. Registre a sala em `src/world/areas.ts` e ligue uma saída de outra área a ela.

No modo de desenvolvimento, o objeto `game` fica acessível no console do navegador para depuração.

## Publicação no GitHub Pages

O workflow em `.github/workflows/deploy.yml` gera o build e publica a cada push na branch `main`.

1. Crie um repositório público chamado `ashborne` no GitHub e envie o projeto.
2. No repositório, abra **Settings → Pages** e, em **Source**, escolha **GitHub Actions**.
3. O jogo fica em `https://<seu-usuario>.github.io/ashborne/`.

Se o repositório tiver outro nome, troque `PAGES_BASE` em `vite.config.ts`.

## Roadmap

| Marco | Entrega | Estado |
| --- | --- | --- |
| M0 | Projeto base, game loop, máquina de estados, cena 3D com câmera e personagem provisório andando, README | Feito |
| M1 | Sala 3D com colisão e um NPC com diálogo, usando modelos de pacotes prontos | Feito |
| M2 | Menu Lutar/Agir/Item/Poupar, fase de desvio e um inimigo que pode ser poupado | Próximo |
| M3 | Inventário, experiência e nível, mapa, salvar e carregar, viagem rápida | |
| M4 | Parte 1 completa: área inicial, mobs, missões 1.1 a 1.5 e a catástrofe | |
| M5 | Salto de nove anos: vila em ruínas, resistência e primeiro território | |
| M6 | Os outros seis territórios, com carroça, barco e montaria | |
| M7 | Kael, santuário final, missões secundárias, arenas e polimento | |

## Créditos

Veja [`CREDITOS.md`](CREDITOS.md).
