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
| Confirmar | Enter, Espaço ou Z | A / × |
| Voltar | X ou Esc | B / ○ |
| Pausar | Esc ou P | Start / Options |
| Painel de depuração | F3 | |

O jogo pausa sozinho quando a janela perde o foco.

## Estrutura

```
ashborne/
  data/            dados em JSON, separados do código
    config.json    velocidades do jogador, câmera e loop
  docs/            documento de design
  public/          arquivos copiados sem processamento (ícone)
  src/
    core/          game loop, máquina de estados, entrada, matemática
      states/      título, exploração e pausa
    render/        Three.js: renderizador, câmera, paleta, personagem provisório
    world/         jogador e áreas (por enquanto, a clareira de teste)
    ui/            menus, telas e painel de depuração
  assets/
    modelos/       modelos 3D (a partir do M1)
    audio/         músicas e efeitos
```

### Como o código se organiza

- **Game loop** (`src/core/GameLoop.ts`): a lógica roda em passos fixos de 1/60 s e o desenho interpola entre os passos. O jogo se comporta igual em monitores de 60 Hz ou 144 Hz, o que importa para a fase de desvio do combate.
- **Máquina de estados** (`src/core/StateMachine.ts`): uma pilha. Só o estado do topo recebe a lógica. Estados de sobreposição, como o título e a pausa (e, no M2, a batalha), deixam o estado de baixo aparecer congelado.
- **Entrada** (`src/core/Input.ts`): o jogo pergunta por ações (`confirm`, `up`, `pause`), não por teclas. Teclado e controle funcionam juntos, e trocar teclas depois só mexe no mapa.
- **Dados** (`data/`): números de ajuste ficam em JSON. Itens, magias, mobs, padrões de ataque, missões e diálogos também vão para lá, seguindo os nomes do documento de design.

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
| M1 | Sala 3D com colisão e um NPC com diálogo, usando modelos de pacotes prontos | Próximo |
| M2 | Menu Lutar/Agir/Item/Poupar, fase de desvio e um inimigo que pode ser poupado | |
| M3 | Inventário, experiência e nível, mapa, salvar e carregar, viagem rápida | |
| M4 | Parte 1 completa: área inicial, mobs, missões 1.1 a 1.5 e a catástrofe | |
| M5 | Salto de nove anos: vila em ruínas, resistência e primeiro território | |
| M6 | Os outros seis territórios, com carroça, barco e montaria | |
| M7 | Kael, santuário final, missões secundárias, arenas e polimento | |

## Créditos

Veja [`CREDITOS.md`](CREDITOS.md).
