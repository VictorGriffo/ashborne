# Créditos

Cada modelo 3D, som ou música de terceiros usado no jogo deve ser registrado aqui, com a licença. A preferência é por pacotes CC0 (domínio público), como os da Kenney, da Quaternius e da KayKit.

## Modelos 3D

### KayKit: Adventurers Character Pack 1.0

- **Autor:** Kay Lousberg ([kaylousberg.com](https://www.kaylousberg.com))
- **Licença:** [CC0 1.0 Universal](http://creativecommons.org/publicdomain/zero/1.0/) (cópia em `assets/modelos/kaykit-adventurers/LICENSE.txt`)
- **Origem:** [github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), também em [kaylousberg.itch.io/kaykit-adventurers](https://kaylousberg.itch.io/kaykit-adventurers)

| Arquivo | Uso no jogo |
| --- | --- |
| `assets/modelos/kaykit-adventurers/Rogue.glb` | Ryben (com a espada do Knight na mão) e Mira |
| `assets/modelos/kaykit-adventurers/Knight.glb` | Mestre Orin, guarda do portão, e a espada de treino do Ryben |
| `assets/modelos/kaykit-adventurers/Mage.glb` | Lyra, Maren, Vaelor e Vó Hesta (com cores diferentes) |
| `assets/modelos/kaykit-adventurers/Barbarian.glb` | Tob e Bram, o mercador |
| `assets/modelos/kaykit-adventurers/Rogue_Hooded.glb` | Kael, Pip e o viajante perdido |

### KayKit: Dungeon Remastered 1.0

- **Autor:** Kay Lousberg ([kaylousberg.com](https://www.kaylousberg.com))
- **Licença:** [CC0 1.0 Universal](http://creativecommons.org/publicdomain/zero/1.0/) (cópia em `assets/modelos/kaykit-dungeon/LICENSE.txt`)
- **Origem:** [github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0), também em [kaylousberg.itch.io/kaykit-dungeon-remastered](https://kaylousberg.itch.io/kaykit-dungeon-remastered)

Arquivos em `assets/modelos/kaykit-dungeon/`, usados no Salão da Guarda:

`banner_blue`, `banner_green`, `banner_shield_blue`, `barrel_large`, `barrel_small_stack`, `box_stacked`, `candle_lit`, `chair`, `chest`, `column`, `crates_stacked`, `floor_tile_large`, `floor_wood_large`, `keg`, `pillar`, `shelf_large`, `stool`, `sword_shield`, `table_long`, `table_long_decorated_A`, `table_medium`, `torch_mounted`, `trunk_medium_A`, `wall`, `wall_corner`, `wall_doorway`, `wall_shelves`, `wall_window_open` (todos `.gltf.glb`, exceto `chest` e `wall_doorway`, que são `.glb`).

### Gerados no código

A Clareira do Altar e as áreas ao ar livre, inclusive os sete territórios da Parte 2, a Cidadela e o santuário final (árvores, palmeiras, cactos, cristais de gelo, docas, barcos, ruínas, pedras, grama, casas, forja, poço, lampiões, cercas, pilares, o Coração de Aether e os pontos de save), além de todos os mobs (Brotinho, Boneco de Treino, Corvo, Gato, Lobos, Sentinela e Guardião, e os da Parte 2: Cinzento, Soldado, Espantalho, Javali, Espíritos, Sapo, Escorpião, Caranguejo, Gaivota, Golem, Guardas, Armaduras, Estátua e os sete generais), são feitos com formas simples do Three.js, sem arquivos de terceiros.

## Bibliotecas

| Biblioteca | Licença | Uso |
| --- | --- | --- |
| [Three.js](https://threejs.org) | MIT | Renderização 3D |
| [Vite](https://vite.dev) | MIT | Build e servidor de desenvolvimento |
| [TypeScript](https://www.typescriptlang.org) | Apache 2.0 | Linguagem |

Os personagens da Parte 2 (Lyra e Tob adultos, Mira, Brum, Orvil, Kael etc.) reaproveitam os mesmos modelos KayKit já listados, com outras cores e acessórios. Nenhum arquivo novo de terceiros entrou nos marcos M5 a M7.

### Quaternius: Stylized Nature MegaKit (versão Standard, gratuita)

- **Autor:** Quaternius ([quaternius.com](https://quaternius.com))
- **Licença:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (cópia em `assets/modelos/quaternius-nature/LICENSE.txt`)
- **Origem:** [quaternius.itch.io/stylized-nature-megakit](https://quaternius.itch.io/stylized-nature-megakit), baixado em 2026-11-11

34 modelos em `assets/modelos/quaternius-nature/` (árvores comuns, pinheiros, retorcidas e mortas, arbustos, grama, flores, cogumelos, pedras e seixos), convertidos de glTF para GLB com texturas reduzidas a 512 px em WebP (`gltf-transform`). Usados na vegetação das áreas ao ar livre (`src/render/nature.ts`).
