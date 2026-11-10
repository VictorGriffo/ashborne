# Ashborne

RPG de exploração em 3D com combate por turnos inspirado em Undertale, em que poupar o inimigo é uma forma válida de vencer. Ryben, aos 15 anos, é manipulado pelo conselheiro Vaelor e causa a catástrofe que devasta Aetheria. Nove anos depois, ele volta para reconstruir o reino, renascido das cinzas.

O jogo roda no navegador, no computador e no **celular deitado**, fica hospedado no GitHub Pages e pode ser instalado como app (PWA).

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

| Ação | Teclado | Controle | Celular |
| --- | --- | --- | --- |
| Andar | WASD ou setas | Analógico esquerdo ou direcional | Arraste o polegar na metade esquerda |
| Correr | Shift | X / □ | Empurre o analógico até a borda |
| Interagir (falar, abrir baú, tocar no Aether) | Enter, Espaço ou Z | A / × | Botão A (ou toque no aviso e nas caixas) |
| Voltar | X ou Esc | B / ○ | Botão B |
| Pausar | P (Esc fora da batalha) | Start / Options | Botão II |
| Mapa | M ou Tab | Back / Share | Botão Mapa |
| Bolsa | I | Y / △ | Pausa → Bolsa |
| Painel de depuração | F3 | | |

Na batalha, os comandos Lutar, Agir, Item e Poupar também funcionam com clique ou toque. O jogo pausa sozinho quando a janela perde o foco.

### No celular

O jogo é feito para o celular **deitado**. Em pé, aparece um aviso para girar. No primeiro toque da tela de título, o jogo entra em tela cheia e tenta travar na horizontal (o Safari do iPhone não deixa travar, mas o aviso de girar continua valendo).

Para instalar como app: no Chrome do Android, menu **⋮ → Instalar app** (ou **Adicionar à tela inicial**); no iPhone, **Compartilhar → Adicionar à Tela de Início**. Instalado, o jogo abre em tela cheia e na horizontal.

## O que dá para jogar (M3)

- **Missão 1.1, Primeiro dia na Guarda:** fale com o Mestre Orin, vá à Clareira do Altar, acalme um Brotinho de Aether em vez de lutar e volte para contar ao Orin (ele dá uma recompensa). O objetivo aparece em avisos, na pausa e no mapa.
- **Pontos de save:** o Cristal da Guarda, no salão, e o Altar de Aether, na clareira. Tocar num deles cura o Ryben e abre o menu: **Salvar** e **Viagem rápida** (para outro ponto já visitado, com uma cena curta). Salvar também faz os mobs derrotados voltarem; os poupados continuam poupados.
- **Salvar e carregar:** o jogo fica salvo no navegador. Com um save, o título mostra **Continuar** e **Novo jogo**.
- **Experiência e nível:** vencer na espada dá experiência; o Ryben sobe de nível (até o 12 na parte 1) e ganha vida, força e defesa.
- **Bolsa:** usar itens de cura, trocar equipamento (arma, vestes, amuleto) e ver nível, experiência, vida, ataque, defesa, Laços e Brasas.
- **Mapa:** regiões descobertas, onde o Ryben está, pontos de save e a missão ativa. Regiões que ainda vão existir aparecem como ???.
- Um **baú** no salão guarda Ervas-lume e Brasas.

### Também desde o M2

- O jogo começa no **Salão da Guarda**. Fale com o **Mestre Orin**: a conversa tem escolhas e muda depois da primeira vez.
- A porta do norte leva à **Clareira do Altar**, onde dois **Brotinhos de Aether** passeiam. Encostar num deles começa a batalha; chegar por trás pega o Brotinho de surpresa.
- **Batalha:** Lutar (aperte confirmar quando o cursor passar pelo meio da barra), Agir (Observar, Fazer carinho, Pisar forte), Item (Erva-lume) e Poupar (ou Fugir). No turno do inimigo, desvie das gotas com a brasa.
- Dois carinhos acalmam o Brotinho, e o botão Poupar acende: poupar rende **Laços**; vencer na espada rende **experiência**. O Brotinho poupado continua passeando, feliz, e não ataca mais.
- Se a vida acabar, o Mestre Orin leva o Ryben de volta ao salão.
- A **dificuldade** (Tranquilo, Aventura, Desafio) muda no menu de pausa a qualquer momento.

## Estrutura

```
ashborne/
  data/                 dados em JSON, separados do código
    config.json         velocidades do jogador, câmera e loop
    personagens.json    modelo, acessórios e animações de cada personagem
    dialogos.json       árvores de diálogo, com escolhas e flags
    mobs.json           inimigos: vida, ataques, falas, ações de Agir e recompensas
    ataques.json        padrões da fase de desvio (chuva, cortina, leque, mira)
    itens.json          itens de cura, armas e vestes
    progressao.json     tabela de níveis (experiência, vida, força, defesa)
    missoes.json        missões e etapas, concluídas por flags
    mapa.json           regiões e caminhos do mapa-múndi
    areas/              plantas das salas (peças, colisão, NPCs, mobs, baús, pontos de save, entradas e saídas)
  docs/                 documento de design
  public/               ícones e manifesto do app (PWA)
  src/
    core/               game loop, máquina de estados, entrada, matemática
      states/           carregamento, título, exploração, diálogo, transição, pausa, bolsa, mapa e ponto de save
    render/             Three.js: renderizador, câmera, modelos, personagem animado, mobs
    world/              jogador, NPCs, mobs no mapa, colisão e áreas
    battle/             batalha: menu, barra de ataque, fase de desvio, dados de mobs e ataques
    systems/            diálogos, flags, jogador, itens, missões, estado do mundo e save
    ui/                 menus, caixa de diálogo, controles de toque, telas e depuração
  assets/
    modelos/            modelos 3D CC0 (KayKit), com a licença de cada pacote
    audio/              músicas e efeitos
```

### Como o código se organiza

- **Game loop** (`src/core/GameLoop.ts`): a lógica roda em passos fixos de 1/60 s e o desenho interpola entre os passos. O jogo se comporta igual em monitores de 60 Hz ou 144 Hz, o que importa para a fase de desvio do combate.
- **Máquina de estados** (`src/core/StateMachine.ts`): uma pilha. Só o estado do topo recebe a lógica. Estados de sobreposição, como o título, a pausa, o diálogo e a batalha, deixam o estado de baixo aparecer congelado.
- **Entrada** (`src/core/Input.ts`): o jogo pergunta por ações (`confirm`, `up`, `pause`), não por teclas. Teclado e controle funcionam juntos, e trocar teclas depois só mexe no mapa.
- **Dados** (`data/`): números de ajuste ficam em JSON. Itens, magias, mobs, padrões de ataque, missões e diálogos também vão para lá, seguindo os nomes do documento de design.
- **Áreas** (`src/world/`): cada área tem colisão, entradas, saídas e NPCs. As salas são montadas a partir de `data/areas/*.json` com peças do kit KayKit; a colisão dos móveis e paredes sai do volume de cada modelo, e o JSON só precisa de caixas extras (como os lados de uma porta).
- **Colisão** (`src/world/Collision.ts`): vista de cima, o jogador é um círculo e o cenário é feito de caixas, círculos e bordas. O personagem desliza ao encostar.
- **Diálogos** (`data/dialogos.json`): cada nó tem quem fala, as falas, e depois escolhas, um próximo nó ou o fim. O início pode depender de flags (`"se": "conversou-com-orin"`), e um nó pode marcar flags ao terminar.
- **Modelos** (`src/render/Assets.ts`): qualquer `.glb` em `assets/modelos` vira um nome curto, como `kaykit-dungeon/wall`, usado nos JSON.
- **Batalha** (`src/battle/`): um estado de sobreposição sobre a exploração. O 3D continua atrás (a câmera aproxima e as árvores ficam transparentes) e a interface é HTML com um canvas 2D para a barra de ataque e a fase de desvio. A lógica de desvio roda no passo fixo, então os ataques são iguais em qualquer tela.
- **Save** (`src/systems/SaveGame.ts`): um JSON no `localStorage` com o jogador (`PlayerState`), as flags e o estado do mundo (`WorldState`: áreas descobertas, pontos de save visitados e como cada mob ficou). O jogo continua no ponto de save onde foi salvo. Ao mudar o formato de forma incompatível, suba `VERSION`.
- **Missões** (`data/missoes.json`): cada etapa termina quando uma flag é marcada (por diálogo, visita a uma área ou resultado de batalha). A missão ativa é a primeira com etapa pendente.
- **Interativos** (`src/world/Interactable.ts`): NPCs, baús e pontos de save. Baús e pontos de save de uma sala ficam em `interativos` no JSON dela.
- **Toque** (`src/ui/TouchControls.ts`): analógico que nasce onde o polegar encosta e botões A, B e pausa. Eles alimentam as mesmas ações da entrada, então nenhum estado precisa saber se o jogador usa teclado, controle ou toque.

### Como criar um inimigo novo

1. Adicione o mob em `data/mobs.json` (copie o Brotinho): vida, ataque, falas, ações de Agir com quanto cada uma acalma, e os padrões de ataque.
2. Crie os padrões em `data/ataques.json` combinando ondas `chuva`, `cortina`, `leque` e `mira`.
3. Faça o modelo em `src/render/mobModels.ts` (ou use um GLB) e coloque o mob numa área (`mobs` no JSON da sala, ou `enemies` numa área feita em código).

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
| M2 | Menu Lutar/Agir/Item/Poupar, fase de desvio e um inimigo que pode ser poupado (mais suporte a celular deitado) | Feito |
| M3 | Inventário, experiência e nível, mapa, salvar e carregar, viagem rápida | Feito |
| M4 | Parte 1 completa: área inicial, mobs, missões 1.1 a 1.5 e a catástrofe | Próximo |
| M5 | Salto de nove anos: vila em ruínas, resistência e primeiro território | |
| M6 | Os outros seis territórios, com carroça, barco e montaria | |
| M7 | Kael, santuário final, missões secundárias, arenas e polimento | |

## Créditos

Veja [`CREDITOS.md`](CREDITOS.md).
