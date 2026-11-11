# Ashborne 2.0: gráficos de jogo atual

A versão 1.0 (tag `v1.0`, 2026-11-11) tem o jogo completo: Partes 1 e 2, sete territórios, três finais, câmera livre em terceira pessoa e um primeiro visual moderno (céu com eclipse, bloom, vegetação da Quaternius). Ainda há muita coisa feita com formas geométricas no código.

**Objetivo da 2.0:** parecer um jogo de verdade, no clima das artes conceituais do Victor (fantasia sombria: castelo gótico sob eclipse, Ryben de capa, Kael sorridente, Lyra com magia azul, Tob ferreiro, o Coração de Aether como cristal azul, a ruína em vermelho). Os personagens devem ser modelados de novo, mais realistas, e o cenário deve sair das formas geométricas.

## Limites combinados

- **Tamanho total:** até **800 MB** (pedido do Victor).
- **GitHub Pages:** o site publicado aguenta cerca de 1 GB, e cada arquivo precisa ter menos de 100 MB. Acima disso, é preciso mudar a hospedagem.
- **Placa de vídeo:** o notebook do Victor tem uma Intel UHD integrada. A meta é pelo menos 30 FPS. Na prática, cada personagem principal fica com 20–40 mil triângulos e texturas de 2K, e os NPCs e mobs com 5–15 mil. A resolução dinâmica e o `LightBudget` já existem.
- **Licenças:** tudo registrado no `CREDITOS.md`. A preferência é CC0. Modelos gerados por IA precisam de um plano que dê direito de uso comercial e público.

## O que o Victor precisa fazer antes (Claude não cria contas nem digita senhas)

1. Criar conta e entrar, **no navegador do app**, em:
   - **Meshy** (meshy.ai) ou **Tripo** (tripo3d.ai), que geram 3D a partir de imagem. Antes de gastar créditos, conferir com o Claude o plano e a licença.
   - **Mixamo** (mixamo.com, conta Adobe gratuita), para esqueleto e animações.
   - **ChatGPT** (chatgpt.com), para as folhas de personagem e as imagens da abertura.
2. Ter à mão as 4 artes conceituais (o Claude já as viu na conversa, mas é melhor ter os arquivos originais).

## Referências de outros jogos

Para não ficar aleatório, cada personagem, construção e área deve partir de referências reais, reunidas num quadro de referências antes de gerar ou escolher modelos. Servem só como inspiração: nada de copiar modelos, texturas ou personagens desses jogos.

- **Mundo aberto, câmera e exploração:** The Legend of Zelda: Breath of the Wild e Tears of the Kingdom (horizonte, vilas abertas, entrar em casas sem tela de carregamento), Genshin Impact (estilo de personagens realistas estilizados que roda bem em máquina modesta).
- **Clima de fantasia sombria, castelos e ruínas:** Elden Ring e Dark Souls (silhuetas góticas, eclipse, ruínas), The Witcher 3 (vilas medievais críveis, interiores de casas), Dragon's Dogma.
- **Personagens e rostos:** Final Fantasy XVI e Dragon Quest XI (protagonista jovem com capa, grupo de amigos com papéis claros), Tales of Arise.
- **Combate e tom:** Undertale e Deltarune (a batalha com desvio continua sendo a do design).

Cada personagem novo ganha uma ficha curta com 2 ou 3 referências (por exemplo: "Ryben 24: capa e couro escuro como na arte do Victor, proporções de Final Fantasy XVI").

## Fases

### Fase 0: mundo contínuo e casas com interior (base de tudo)

Hoje cada lugar é uma "área" separada. Ao entrar numa casa, a tela escurece e o Ryben aparece numa sala solta, cercada de preto. O Victor quer um jogo amplo, em que **entrar numa casa seja entrar na casa de verdade**, e que a troca de área fique só para momentos muito específicos (cutscenes, o salto de nove anos, talvez o santuário final).

- **Casas com interior:** cada construção tem o interior modelado dentro dela, no mesmo mundo. Ao passar pela porta, o telhado e a parede da frente somem ou ficam transparentes, a câmera se aproxima e a luz muda para a de dentro (lareira, velas). Ao sair, tudo volta. Sem tela preta e sem sala solta. O Salão da Guarda vira um prédio de verdade na vila.
- **Mundo contínuo:** juntar a vila, o pátio, a clareira, a estrada e o santuário (Parte 1) num único mapa grande. Na Parte 2, os sete territórios passam a ser regiões desse mesmo mapa, ligadas por estradas, como no `data/mapa-parte2.json` (a vila no centro). Andando, chega-se a todos eles; carroça, barco e viagem rápida continuam como atalhos.
- **Técnica necessária:**
  - o mundo dividido em pedaços (chunks) que carregam e descarregam conforme o Ryben anda (streaming);
  - terreno com relevo de verdade (mapa de altura), não mais um chão plano por área;
  - colisão e altura do chão por chunk;
  - mobs e NPCs ativos só nos pedaços próximos;
  - o mapa-múndi passa a mostrar a posição real.
- **O que reaproveita:** o formato JSON das áreas (objetos, NPCs, mobs, saídas, condições por flags) vira o formato das regiões do mundo. Missões, diálogos, batalhas, saves e flags não mudam.
- **Ordem sugerida:** primeiro a vila da Parte 1 como mundo contínuo, com 2 ou 3 casas entráveis (a casa da Maren e o Salão da Guarda). Depois ligar o pátio e a clareira, e por último os territórios.

### Fase 1: personagens novos (prioridade)

Ordem: Ryben (15 e 24 anos), Kael (15 e general), Lyra (15 e adulta), Tob (15 e adulto), Maren, Mestre Orin, Vaelor. Depois Mira, Pip e os NPCs genéricos.

Passo a passo por personagem:
1. **Folha de personagem no ChatGPT:** frente e costas em pose T ou A, fundo neutro, no estilo das artes. É dela que sai o 3D. Quanto mais limpa a pose, melhor o resultado.
2. **Imagem para 3D** no Meshy ou no Tripo: gerar, escolher a melhor versão e baixar em GLB ou FBX.
3. **Esqueleto e animações** no Mixamo (ou o auto-rig do próprio site). Animações necessárias, que hoje são as do KayKit em `data/personagens.json`:
   - andar: parado, andando, correndo e falando;
   - batalha: golpe, ser atingido, cair e comemorar;
   - magia: conjurar.

   As animações devem ficar num arquivo separado e compartilhado entre os personagens, para não repetir megabytes (hoje cada KayKit carrega 75 animações).
4. **Otimizar** com `gltf-transform`, instalado no scratchpad (`npm i @gltf-transform/cli sharp`): reduzir os triângulos (`simplify`/`weld`), as texturas para 2K/1K em WebP e comprimir (`meshopt`).
5. **Integrar:**
   - colocar os arquivos em `assets/modelos/personagens/`;
   - ajustar `data/personagens.json` (modelo, escala, nomes das animações);
   - adaptar o `src/render/CharacterModel.ts` aos ossos do Mixamo (`mixamorig:*`) e aos acessórios, como a capa;
   - registrar no `CREDITOS.md`.
6. **Testar** com `window.dev` (`talk`, `battle`) e conferir o FPS.

#### Se não houver gerador de imagem

O ChatGPT do Victor não gera essas imagens. Alternativas, da mais rápida à mais personalizada:

1. **Personagens prontos do Mixamo** (grátis, conta Adobe): humanos realistas, já com esqueleto e centenas de animações. Escolho o mais parecido com cada papel (cavaleiro para o Orin, maga para a Lyra, nobre para o Vaelor...) e recolorimos as texturas com as cores das artes. É o caminho mais garantido; a desvantagem é que os rostos não são exclusivos.
2. **As artes do Victor direto no 3D:** recortar cada personagem da arte do grupo (Ryben, Kael, Lyra e Tob) e mandar a imagem para um gerador de 3D: Meshy, Tripo, ou Hunyuan3D e TRELLIS de graça no Hugging Face, sem conta em alguns casos. A pose da arte não é a ideal, então o resultado varia. Maren, Orin e Vaelor não aparecem nas artes e precisariam de outra fonte.
3. **Outro gerador de imagem gratuito** (Gemini ou Bing Image Creator) com os mesmos pedidos de `docs/prompts-chatgpt.md`.
4. **Figma/Weave:** o Figma conectado tem geração de imagem, mas gasta créditos de IA que o plano Starter do Victor praticamente não tem. O Weave (weavy.ai) tem modelos de 3D, mas exige ligar a conta Figma em app.weavy.ai, nas configurações de perfil.

### Fase 2: mobs e generais

- Animais e monstros: pacotes CC0 da Quaternius (monstros, animais, esqueletos) com animação. Substituem os mobs feitos em `src/render/mobModels.ts`.
- Generais (Orsa, Thessaly, Gorm, Dravik, Isolde, Brannic, Kael general) e Vaelor: mesmo caminho da Fase 1, por serem chefes da história.
- Mobs muito específicos (Brotinho de Aether, Cinzento) podem ser gerados por IA a partir de uma ilustração.

### Fase 3: cenário

- **Construções:** casas, forja, taverna, moinho, torres e muralhas de pacotes CC0. Um deles é o KayKit Medieval Hexagon (github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0). Procurar também conjuntos medievais da Quaternius. A Cidadela e o santuário pedem um castelo gótico; se nenhum pacote servir, gerar por IA.
- **Chão com textura de verdade** (grama, terra, pedra, neve, areia), com materiais PBR CC0 do ambientCG ou do Poly Haven, misturados por máscara em vez de cor por vértice.
- **Água** com shader (reflexo e ondas) na Costa, no Pântano e nas poças.
- **Trocar no `src/render/props.ts`:** cercas, carroças, docas, barcos, ruínas, pedestais e o Coração de Aether (este como cristal com shader brilhante, como na arte).
- **Clareira do Altar:** levar para o mesmo sistema das áreas ao ar livre (hoje está em `ClearingArea.ts`).

### Fase 4: cutscenes

- **Abertura ilustrada** antes de o jogo começar: 6 a 8 quadros gerados no ChatGPT no estilo das artes (lenda dos sete selos e do Coração de Aether, Aetheria em paz, o eclipse se aproximando), com zoom lento, narração em texto e botão Pular. Usar também as 4 artes do Victor. Texto a partir do `docs/design.md`.
- **Opcional:** clipes de vídeo (Sora ou outro gerador) para momentos-chave (catástrofe, salto de nove anos, finais), tocados por um `<video>` com botão Pular.
- **Cenas dentro do jogo** com a câmera passeando (o `CutsceneState` ganha passos de câmera).

### Fase 5: técnica

- **Carregar por área** com tela de carregamento, em vez de baixar tudo na abertura. Guardar no navegador com service worker: o jogo passa a abrir rápido na segunda vez e a funcionar sem internet.
- **Menu de qualidade:** Baixo, Médio e Alto (sombras, bloom, resolução, densidade da grama).
- **Áudio:** música e efeitos CC0 (por exemplo Kenney e OpenGameArt), com volume no menu.
- **Andar com o mouse** (clicar no chão), se o Victor quiser jogar só com o mouse.

## Por onde começar amanhã

1. Confirmar com o Victor que as contas estão criadas e logadas no navegador do app.
2. Montar o quadro de referências (seção acima) do Ryben e da vila.
3. Abrir o ChatGPT e gerar a folha de personagem do **Ryben (24 anos, exílio)**, seguindo a arte.
4. Gerar o 3D (Meshy ou Tripo), dar esqueleto e animações (Mixamo), otimizar e colocar no jogo **só para o Ryben**. Comparar visual e FPS com o modelo antigo.
5. Se o Victor aprovar, repetir com o grupo principal.
6. **Em paralelo, sem depender de contas:** começar a Fase 0 pela vila da Parte 1 (mundo contínuo e a casa da Maren com interior de verdade), junto com as Fases 3 e 5.

## Decisão (2026-11-11)

O Victor escolheu **Gemini + gerador de 3D** para os personagens principais:
1. O Victor gera as imagens no Gemini com os pedidos de `docs/prompts-chatgpt.md` (Pedido 0 com as 4 artes, depois Ryben 24 em três vistas) e salva em `docs/arte/`.
2. O Claude transforma as imagens em 3D. Primeira tentativa: **Meshy**, que tem imagem para 3D com várias vistas, texturas e esqueleto automático. No plano grátis os modelos saem com licença CC BY, com crédito no `CREDITOS.md`: conferir a licença na hora. Alternativas: Tripo, ou Hunyuan3D e TRELLIS no Hugging Face (grátis).
3. As animações que faltarem vêm do Mixamo. Os NPCs secundários podem usar personagens prontos do Mixamo.

## Estado (2026-11-11, fim da sessão)

- **Notebook no Gemini:** "Ashborne – Arte do jogo".
  - Fontes: `docs/arte/referencias/artes-conceituais.png` e `docs/design.md`.
  - As regras de estilo e da folha de personagem estão nas instruções do notebook.
- **Ryben 24, vista de frente:** gerado com sucesso, na conversa "Criação de Personagem Ryben".
  - **Falta baixar a imagem** (botão de download do Gemini) e salvar como `docs/arte/ryben24-frente.png`.
  - Depois, pedir a vista de lado e a de costas.

## Atualização (2026-11-11, manhã)

As 3 vistas do **Ryben 24** foram geradas no Gemini e estão em `docs/arte/ryben24-frente.jpg`, `ryben24-lado.jpg` e `ryben24-costas.jpg` (1792×2400, pose A, fundo cinza, consistentes entre si). Próximo passo: gerar o 3D (Hunyuan3D com múltiplas vistas no Hugging Face, ou Meshy/Tripo), dar esqueleto e animações no Mixamo, otimizar e integrar.
