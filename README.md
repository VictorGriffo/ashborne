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

## O que dá para jogar (M4: a Parte 1 inteira)

A Parte 1 vai do primeiro dia na Guarda até a catástrofe, em seis áreas ligadas por trilhas e portas:

**Vila** → **Salão da Guarda** → **Pátio de Treino** → **Clareira do Altar** → **Estrada do Santuário** → **Santuário do Coração**

| Missão | O que acontece |
| --- | --- |
| 1.1 Primeiro dia na Guarda | Maren acorda o Ryben; Kael, Lyra e Tob pela vila; Mestre Orin no salão; bonecos de treino e o treino com o Orin, que ensina a poupar. |
| 1.2 Os selos enfraquecem | A Lyra nota o Aether falhando; flores murchas e uma runa apagada na clareira; o conselheiro Vaelor chega à vila com uma proposta. |
| 1.3 A estrada do santuário | Maren entrega o Amuleto de Maren; Tob dá a Lâmina Remendada; lobos na estrada, o Lobo Alfa e um viajante perdido. |
| 1.4 O santuário | Sentinelas de pedra e o chefe Guardião do Coração, que reconhece o sangue de Guardião do Ryben se for acalmado. |
| 1.5 A catástrofe | Eclipse, a traição de Vaelor, os selos se partem, a derrota obrigatória e a tela de fim da Parte 1. |

Também há: mercador (Bram) para comprar e vender, Mira na taverna, Vó Hesta com a lenda dos selos, a criança Pip, baús, quatro novos pontos de save, Gato de Telhado, Corvos Curiosos e o ataque em feixe das Sentinelas e do Guardião. Cada inimigo tem um jeito próprio de ser poupado, como no documento de design.

### Sistemas (desde o M2 e o M3)

- **Batalha:** Lutar (barra de precisão), Agir (acalma), Item e Poupar ou Fugir. No turno do inimigo, desvie com a brasa. Poupar rende **Laços**; vencer rende **experiência**. Chefes não deixam fugir.
- **Pontos de save:** tocar cura o Ryben e abre **Salvar** e **Viagem rápida**. Salvar faz os mobs comuns derrotados voltarem; poupados continuam poupados; elites e chefes vencidos não voltam.
- **Salvar e carregar** no navegador, com **Continuar** e **Novo jogo** no título.
- **Nível** de 1 a 12 na Parte 1, **Bolsa** (usar e equipar), **Mapa** com a missão ativa e **dificuldade** trocável na pausa.

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
    lojas.json          o que cada mercador vende
    cenas.json          cutscenes (passos: evento, espera, diálogo, flag, clarão, batalha, fim)
    areas/              salas (kit KayKit) e áreas ao ar livre ("tipo": "ar-livre")
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

### Como montar uma área ao ar livre

Crie `data/areas/<id>.json` com `"tipo": "ar-livre"` (veja `vila.json`): `limite` (retângulo andável), `caminhos` e `manchas` (terra, pedra, areia), `vegetacao`, `objetos` (tipos de `src/render/props.ts`, como `casa`, `forja`, `poco`, `lampiao`, `cerca`, `portal`, `pilar`, `coracao`, ou um `modelo` do kit), `npcs`, `mobs`, `interativos` (`bau`, `save`, `examinar`), `entradas` e `saidas` (com `bloqueio` opcional). NPCs, interativos e bloqueios aceitam `se` e `naoSe` com flags. Depois, registre a área em `src/world/areas.ts`.

### Condições, ações e cenas

- **Condições:** `"se": "flag"` (ou lista, todas) e `"naoSe"` controlam quando um NPC aparece, quando um diálogo começa por um nó e quando uma saída abre.
- **Ações:** um nó de diálogo (ou algo examinado) pode terminar com `"acao": "batalha:<mob>"`, `"loja:<id>"` ou `"cena:<id>"`.
- **Batalhas:** vencer ou poupar marca `venceu:<mob>` ou `poupou:<mob>`, e as flags do campo `marcar` do mob. Um mob com `roteiro` termina sozinho depois de N turnos (a derrota obrigatória).

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
| M4 | Parte 1 completa: área inicial, mobs, missões 1.1 a 1.5 e a catástrofe | Feito |
| M5 | Salto de nove anos: vila em ruínas, resistência e primeiro território | Próximo |
| M6 | Os outros seis territórios, com carroça, barco e montaria | |
| M7 | Kael, santuário final, missões secundárias, arenas e polimento | |

## Créditos

Veja [`CREDITOS.md`](CREDITOS.md).

## Estado atual

O jogo está completo de ponta a ponta: Parte 1, salto de nove anos, sete territórios com generais, selos e magias, Cidadela com o Kael, santuário final e três finais (Cinzas, Renascido e Ruína). Transportes: carroça, barco e montaria. Em `npm run dev`, `window.dev` (src/devtools.ts) permite pular trechos para testar. Veja o CLAUDE.md para o que ainda falta (missões secundárias extras e balanceamento).
