# Ashborne: documento de design

Este é o design completo do jogo. Tudo marcado como "Proposta" foi sugerido durante o planejamento e pode ser ajustado. O que está "Definido" foi decidido pelo dono do projeto (Victor) ou delegado a ele por pedido.

## Visão geral

Ashborne é um RPG de fantasia em 3D, de exploração e combate por turnos, em que poupar o inimigo é uma forma válida de vencer.

| Item | Definição | Estado |
| --- | --- | --- |
| Nome | Ashborne, no sentido de renascido das cinzas | Definido |
| Gênero | RPG de exploração com combate por turnos | Definido |
| Referência | Undertale: poupar o inimigo é uma forma válida de vencer | Definido |
| Qualidade | Estrutura profissional: projeto modular e dados separados do código | Definido |
| Protagonista | Ryben, com 15 anos na primeira parte e 24 na segunda | Definido |
| Tom | Fantasia, aventura, drama e humor, que escurece de forma gradual depois do salto de nove anos | Definido |
| Câmera | 3D, de cima, em ângulo fixo, estilo Zelda | Proposta |
| Estilo visual | 3D low-poly estilizado, com iluminação e partículas para marcar o antes e o depois do salto | Proposta |
| Plataforma | Navegador, hospedado no GitHub Pages, instalável como app (PWA) | Definido |
| Mundo e personagens | Originais, sem reutilizar nada do jogo de referência | Proposta |

O tom da primeira parte é vibrante, mágico e cheio de esperança. A segunda parte trata de perda, culpa, guerra, traição, redenção e reconstrução, sem abandonar por completo a amizade e os momentos de descontração.

## História

**Premissa.** Em um reino onde a magia sustenta a civilização, Ryben, aos 15 anos, é manipulado por um conselheiro poderoso e causa uma destruição enorme. Ele desaparece por nove anos. Aos 24, volta a um reino devastado, reúne aliados, enfrenta antigos companheiros, reconquista territórios e descobre segredos sobre a própria origem e sobre o verdadeiro culpado.

**Estrutura em duas partes**

| Parte | Idade de Ryben | Mundo | Tom |
| --- | --- | --- | --- |
| 1. Juventude | 15 anos | Reino vivo e próspero, com uma única área jogável | Esperança, aventura, humor |
| 2. Exílio | 24 anos | Mesma geografia, transformada, com sete territórios dominados | Culpa, guerra, redenção |

**Enredo**

- O reino de Aetheria (nome definitivo) é protegido por sete selos mágicos. Eles são guardados por um artefato, o Coração de Aether.
- O conselheiro Vaelor convence Ryben a recuperar o Coração antes de um eclipse.
- Ryben é manipulado, a catástrofe acontece e ele é derrotado.
- Salto de nove anos. Os territórios passam a ser governados pelos generais de Vaelor.
- Ryben reencontra os velhos amigos: alguns viram aliados, outros inimigos e outros guardam ressentimento.
- Ele restaura os selos um a um e, no fim, enfrenta Vaelor. O conflito final pode exigir o sacrifício de Ryben.

**Origem de Ryben.** Ele nunca conheceu o pai. Ao longo da jornada descobre que o pai, Daren, foi um Guardião que morreu protegendo o santuário do Coração de Aether. A mãe, Maren, pode estar viva e sempre escondeu isso dele. Isso dá peso à sua origem e ecoa no sacrifício do final.

**Por que Maren escondeu a verdade.** Só o sangue de Guardião manipula o Coração de Aether, e Vaelor, antigo companheiro de Daren, sabia disso. Maren escondeu a identidade do pai para proteger o filho, e o medo dela se cumpre quando Vaelor se aproxima de Ryben. Na catástrofe ela fugiu e passou os nove anos escondida nas catacumbas do santuário, mantendo um selo fraco.

**Finais.** O sacrifício é sempre uma escolha. Cinzas: o Ryben se sacrifica e sela o Coração. Renascido: com Laços altos e os sete selos, ele sobrevive. Ruína: com poucos Laços, Vaelor vence.

**Temas.** Culpa, amadurecimento, perda, redenção e reconstrução. O salto de nove anos é o principal diferencial do jogo.

**Gancho do hub.** A ideia central da segunda parte é restaurar o reino: a cada território libertado, a vila e a forja se reconstroem.

## Mundo e áreas

| Item | Definição | Estado |
| --- | --- | --- |
| Áreas | Oito: uma inicial, usada até a virada da história, e sete depois | Definido |
| Exploração | Mundo aberto, com cutscenes para mudar de local | Proposta |
| Estilo | 3D low-poly estilizado, com iluminação e partículas para marcar o antes e o depois do salto | Proposta |
| Primeiro marco jogável | Uma sala, um NPC e uma batalha | Proposta |
| Cidade central | A vila inicial, reconstruída aos poucos ao longo da segunda parte (restaurar o reino) | Proposta |

**Como as áreas se encaixam**

- **Parte 1.** Só a área inicial (a vila, a Guarda e o caminho até o santuário) fica disponível.
- **Parte 2.** A mesma geografia aparece transformada, com sete territórios. Cada um é governado por um general de Vaelor e guarda um selo.
- **Hub.** A vila funciona como base. A cada território libertado, ela ganha moradores, lojas e melhorias na forja.

**Paleta de cores.** Escura, em azuis, roxos e verdes, com o brilho de Aether como destaque. As cores abaixo são um ponto de partida e podem ser ajustadas no jogo.

| Onde | Cores dominantes | Exemplos |
| --- | --- | --- |
| Parte 1 | Azul-noite e verde-floresta, com brilho de Aether em ciano e lilás | #0E1A2B, #16324A, #1F4D3A, #2E7D5B, #7FE0D0, #B9A6FF |
| Parte 2 | Roxo profundo, cinza-azulado e verde-musgo, com poucas brasas como destaque | #140F24, #2B1B4D, #3A3F5C, #1C3B3A, #E2704A |
| Campos de Linne | Verde-oliva escuro | #2F4A2A |
| Floresta de Sylven | Verde-esmeralda | #1E5A46 |
| Pântano de Morn | Verde-azulado com névoa | #1F4A4A |
| Dunas de Sahr | Roxo de crepúsculo | #3B2A5A |
| Picos de Frostveil | Azul-gelo escuro | #20405E |
| Costa de Maré Alta | Azul-petróleo | #124A5C |
| Cidadela de Aetheria Alta | Roxo real | #3A1F66 |

A diferença entre as partes vem principalmente da iluminação e da cor, o que reduz o número de modelos novos.

**Mundo aberto.** Dentro de cada área a exploração é livre. Entre áreas, a troca de local acontece por cutscenes. Na parte 2, a ordem dos territórios é livre.

**Mapa.** Mapa-múndi que pode ser aberto a qualquer momento. As áreas são reveladas ao explorar ou por pistas de NPCs, a missão ativa fica marcada e, na parte 2, cada território mostra seu estado (dominado, em disputa ou libertado). Proposta.

**Transportes (propostas)**

| Meio | Uso |
| --- | --- |
| A pé | Padrão dentro de cada área. |
| Viagem rápida | Entre pontos de save já visitados, com cutscene curta. |
| Carroça | Liga áreas próximas, com cutscene de viagem e conversas. |
| Barco | Libera a costa, a partir do território 6. |
| Montaria | Acelera a travessia de áreas grandes, desbloqueada por missão. |
| Portais de Aether | Ligam territórios libertados na parte 2. |

Para a produção, mapa, viagem a pé e viagem rápida vêm primeiro. Carroça, barco e montaria ficam para depois do marco M3.

**Os sete territórios da parte 2 (propostas)**

| Nº | Território | Bioma | General | Selo e magia |
| --- | --- | --- | --- | --- |
| 1 | Campos de Linne | Planícies e fazendas | Orsa Vell | Terra: Raiz Firme (reduz o dano por um turno) |
| 2 | Floresta de Sylven | Floresta antiga | Thessaly | Vida: Florescer (cura aos poucos) |
| 3 | Pântano de Morn | Pântano de névoa | Gorm | Névoa: Véu de Névoa (reduz a precisão dos ataques) |
| 4 | Dunas de Sahr | Deserto e ruínas | Dravik | Sol: Lança Solar (dano de luz) |
| 5 | Picos de Frostveil | Montanhas geladas | Isolde | Gelo: Congelar (atrasa os ataques inimigos) |
| 6 | Costa de Maré Alta | Porto e costa | Brannic | Maré: Maré Calmante (usada em Agir, avança o poupar) |
| 7 | Cidadela de Aetheria Alta | Cidade real em ruínas | Kael | Luz: Luz do Alvorecer (ligada ao sacrifício do final) |

## Personagens e NPCs

O protagonista, Ryben, é definido. Os nomes e papéis dos demais foram propostos e podem ser trocados.

| Personagem | Papel | Resumo |
| --- | --- | --- |
| Ryben | Protagonista | 15 anos na parte 1 e 24 na parte 2. Carrega a culpa pela catástrofe. |
| Vaelor | Conselheiro e vilão | Acredita que os selos aprisionam uma magia antiga desperdiçada com nobres. Quer libertá-la e governar. Comanda sete generais depois do salto. Foi companheiro de armas de Daren. |
| Maren | Mãe de Ryben | Criou o filho sozinha e escondeu a identidade do pai para protegê-lo. Entrega o Amuleto de Maren. Na catástrofe fugiu e passou nove anos escondida nas catacumbas do santuário. |
| Daren | Pai de Ryben | Guardião que morreu protegendo o santuário do Coração de Aether. Aparece em memórias e na Insígnia. |
| Kael | Melhor amigo | Engraçado e leal. Aos 24 é general de Vaelor e acredita que Ryben o abandonou. É o sétimo general e o chefe mais emocional. |
| Lyra | Curandeira e maga | Lidera a resistência, ainda ressentida. Ensina o Fio de Vida e as magias dos selos. |
| Tob | Aprendiz de ferreiro | Alívio cômico. Vira o ferreiro da resistência e melhora o equipamento. |
| Mestre Orin | Instrutor da Guarda | Conheceu Daren e se calou a pedido de Maren. Some na catástrofe e pode guardar a Insígnia. |
| Rainha Elyen | Soberana | Confia em Vaelor. Morre na catástrofe. |
| Mira | Taverneira | Recusa servir Ryben aos 24. Vira aliada se a missão A carta de Mira for cumprida. |

## Combate

Inspirado em Undertale: por turnos, com uma fase de desvio e a opção de poupar. Tudo abaixo é proposta.

| Elemento | Como funciona |
| --- | --- |
| Menu | Lutar, Agir, Item e Poupar |
| Turno do inimigo | O jogador controla um símbolo dentro de uma caixa e desvia dos ataques. Em um jogo 3D, essa fase é uma sobreposição 2D. |
| Vencer sem lutar | Agir revela como acalmar o inimigo e Poupar encerra a batalha. |
| Padrões de ataque | Descritos em JSON, para criar novos sem mexer no código. |
| Laços | Poupar e conversar rende Laços, uma segunda trilha de progressão (ver Progressão). |
| Dificuldade | Três modos, que podem ser trocados a qualquer momento no menu. Tranquilo: ataques lentos e mais vida. Aventura: o padrão. Desafio: ataques rápidos e menos cura. O modo muda só a luta, nunca a história nem os finais, e poupar vale em todos. |

**Locais de luta (propostas)**

| Local | Parte | Mobs | Chefe |
| --- | --- | --- | --- |
| Pátio de Treino da Guarda | 1 | Bonecos de treino | Mestre Orin (treino, batalha fácil que ensina o Poupar) |
| Floresta da Vila | 1 | Brotinho de Aether, Corvo Curioso | Nenhum |
| Estrada do Santuário | 1 | Lobo da Estrada, Brotinho de Aether | Nenhum |
| Santuário | 1 | Sentinela do Santuário | Guardião do Coração (chefe do santuário); derrota obrigatória contra Vaelor na catástrofe |
| Vila em ruínas | 2 | Cinzento, Soldado de Vaelor (encontros leves) | Nenhum (hub) |
| Campos de Linne | 2 | Espantalho Vivo, Javali de Cinzas | Orsa Vell |
| Floresta de Sylven | 2 | Espírito de Folhas, Lobo-Raiz | Thessaly |
| Pântano de Morn | 2 | Sapo-Lanterna, Fantasma de Névoa | Gorm |
| Dunas de Sahr | 2 | Escorpião de Vidro, Sentinela de Areia | Dravik |
| Picos de Frostveil | 2 | Lobo de Gelo, Golem de Neve | Isolde |
| Costa de Maré Alta | 2 | Caranguejo Couraçado, Gaivota Saqueadora | Brannic |
| Cidadela de Aetheria Alta | 2 | Guarda Corrompido, Armadura Vazia | Kael |
| Santuário (final) | 2 | Sentinela do Santuário, Cinzento | Vaelor |

**Mobs (propostas)**

| Mob | Onde | Ataque na fase de desvio | Como poupar (Agir) |
| --- | --- | --- | --- |
| Brotinho de Aether | Floresta, estrada | Gotas que caem devagar | Fazer carinho até ele se acalmar |
| Corvo Curioso | Floresta | Penas em leque | Oferecer um brilho |
| Lobo da Estrada | Estrada | Investidas em linha reta | Mostrar que não é ameaça |
| Sentinela do Santuário | Santuário | Feixes de luz em grade | Mostrar a Insígnia ou usar Palavra Serena |
| Cinzento | Vila, santuário | Nuvens de cinza que se espalham | Acalmar com Palavra Serena |
| Soldado de Vaelor | Vários | Espadas e escudos em onda | Conversar até ele desertar |
| Espantalho Vivo | Linne | Palha girando | Consertar o chapéu dele |
| Javali de Cinzas | Linne | Investidas laterais | Dar uma erva |
| Espírito de Folhas | Sylven | Folhas em espiral | Cantar com ele |
| Lobo-Raiz | Sylven | Raízes surgindo do chão | Dividir comida |
| Sapo-Lanterna | Morn | Bolhas de luz | Apagar a lanterna dele devagar |
| Fantasma de Névoa | Morn | Ondas de névoa | Lembrar o nome dele |
| Escorpião de Vidro | Sahr | Estilhaços rápidos | Dar sombra e água |
| Sentinela de Areia | Sahr | Colunas de areia | Reconstruir o símbolo dela |
| Lobo de Gelo | Frostveil | Rajadas geladas | Aquecer com uma brasa |
| Golem de Neve | Frostveil | Bolas de neve grandes e lentas | Dar um rosto a ele |
| Caranguejo Couraçado | Maré Alta | Garras laterais | Devolver a concha |
| Gaivota Saqueadora | Maré Alta | Mergulhos rápidos | Deixar um peixe |
| Guarda Corrompido | Cidadela | Lanças em linha | Usar a Insígnia |
| Armadura Vazia | Cidadela | Golpes pesados e lentos | Chamar pelo nome do dono |

As batalhas contra os generais são chefes com sequências de ataque mais longas e uma opção de poupar que dá um Laço.

**NPCs genéricos (propostas)**

| NPC | Onde | Função |
| --- | --- | --- |
| Guarda do portão | Vila (parte 1) | Dicas e orientação inicial |
| Mercador ambulante | Vila e estrada | Loja de itens e Erva-lume |
| Criança da vila | Vila (parte 1) | Rumores; na parte 2 aparece órfã, ligando as duas partes |
| Fazendeiro | Campos de Linne | Missão simples e itens de cura |
| Velha contadora de histórias | Vila | Conta a lenda dos selos e dicas sobre Daren |
| Pescador | Costa | Barco e rumores |
| Bardo | Taverna | Cantigas que mudam entre as partes 1 e 2 |
| Viajante perdido | Estrada | Evento aleatório e recompensa pequena |
| Sobrevivente | Vila em ruínas | Conta o que aconteceu na catástrofe |
| Refugiado | Vila e territórios | Reconstrução: volta à vila quando o território é libertado |
| Mercador do mercado negro | Vila (parte 2) | Itens raros por preços altos |
| Soldado desertor | Vários | Ligado à missão Os desertores |
| Curandeiro de campo | Pontos de save | Cura e recuperação de Aether |

**Lutas secundárias espalhadas pelo mapa (propostas)**

Além dos mobs acima, cada área tem muitos encontros opcionais para dar vida à exploração.

| Sistema | Como funciona |
| --- | --- |
| Mobs visíveis | Os inimigos aparecem andando no mapa 3D. Ao encostar neles, começa a batalha. Nada de encontros aleatórios invisíveis. |
| Comportamento | Alguns patrulham, outros dormem, outros fogem. Se você chega por trás, a primeira fase de desvio é mais fácil. |
| Densidade | Cerca de 15 a 25 pontos de encontro por área grande, em grupos de 1 a 3 mobs. A vila inicial tem menos. |
| Reaparecimento | Mobs comuns voltam depois de dormir ou de salvar. Elites e mini-chefes não voltam. |
| Evitar | Você pode contornar quase todos. Poupar um mob rende Laços e ele passa a não atacar mais. |
| Recompensas | Experiência, Laços, ingredientes e, às vezes, itens raros. Poupar rende mais Laços e lutar rende mais experiência. |

**Variantes por área.** Cada território tem 4 a 6 mobs: os 2 comuns já listados e mais variantes e elites.

| Território | Mobs extras | Elite | Mini-chefe opcional |
| --- | --- | --- | --- |
| Vila e arredores (parte 1) | Gato de Telhado, Pomba Mensageira | Lobo Alfa | Javali Rei |
| Campos de Linne | Gafanhoto Gigante, Corvo de Palha | Espantalho Guardião | Touro de Ferro |
| Floresta de Sylven | Vagalume Bravo, Cervo Espectral | Ent Jovem | Rainha das Abelhas |
| Pântano de Morn | Sanguessuga Brilhante, Jacaré Cinza | Bruxa do Brejo | Hidra do Lodo |
| Dunas de Sahr | Cobra de Areia, Abutre Cerimonial | Sacerdote Mumificado | Colosso de Vidro |
| Picos de Frostveil | Raposa de Gelo, Morcego de Geada | Yeti Velho | Dragão de Gelo Filhote |
| Costa de Maré Alta | Polípo Pirata, Foca Trapaceira | Capitão Fantasma | Kraken da Baía |
| Cidadela de Aetheria Alta | Rato Real, Estátua Viva | Cavaleiro Sem Nome | Mordomo Corrompido |

**Arenas e desafios opcionais**

- **Arena da Guarda (vila):** ondas de mobs em sequência, com recompensas por rodada. Mestre Orin mantém o placar.
- **Quadro de procurados:** missões de caça repetíveis nos territórios libertados. Cada uma indica um mini-chefe no mapa.
- **Ninhos:** cavernas pequenas escondidas com um grupo de elites e um baú raro.
- **Duelos de Laços:** NPCs que desafiam Ryben para uma batalha amistosa, onde o objetivo é poupar.

O mapa-múndi marca ninhos e mini-chefes depois que você os descobre.

**Ligações com outros sistemas**

- A magia Palavra Serena entra em Agir e avança o processo de poupar.
- O Escudo de Aether aumenta a caixa de desvio.
- O Passo Fantasma dá um impulso de invulnerabilidade na fase de desvio.
- A Brasa Renascida revive o jogador uma vez por batalha.

## Itens valiosos

O inventário começa simples: itens de cura e equipamentos básicos. Os itens abaixo são propostas.

| Item | Tipo | Efeito e papel na história |
| --- | --- | --- |
| Coração de Aether | Artefato da trama | Mantém os sete selos. É o alvo da catástrofe e do final. |
| Fragmentos de Selo (7) | Chave da trama | Um por território. Cada selo restaurado concede uma magia nova. |
| Lágrima de Aether | Raro | Recupera Aether (pontos de magia). |
| Insígnia do Guardião | Chave da trama | Pertenceu a Daren. Liga Ryben à origem e pode estar com Mestre Orin. |
| Brasa Renascida | Consumível raro | Revive uma vez por batalha, com metade da vida. Vem do primeiro selo. |
| Erva-lume | Consumível comum | Item de cura básico. Alimenta a missão Ervas para a Lyra. |

## Equipamentos e aprimoramento

Slots definidos: arma, vestes e amuleto.

| Equipamento | Slot | Observação |
| --- | --- | --- |
| Espada de Treino | Arma | Inicial. |
| Lâmina Remendada | Arma | Segunda etapa da linha de espadas. |
| Lâmina de Brasa | Arma | Etapa final da linha. |
| Túnica da Guarda Aprendiz | Vestes | Usada na parte 1. |
| Capa do Exílio | Vestes | Esconde a identidade de Ryben na parte 2. |
| Amuleto de Maren | Amuleto | Mais defesa com pouca vida. Ganha uma segunda habilidade após o reencontro com Maren. |

**Forja de Tob.** Os níveis de aprimoramento são liberados conforme cada território é libertado, o que liga o equipamento à reconstrução do reino.

## Magias e poderes

O recurso das magias é o Aether (pontos de magia). Cada selo restaurado concede uma magia nova, o que forma o Poder dos Selos. Tudo aqui é proposta.

| Magia | Efeito |
| --- | --- |
| Centelha | Ataque básico de Aether. |
| Escudo de Aether | Aumenta a caixa de desvio no turno do inimigo. |
| Fio de Vida | Cura. Ensinada por Lyra. |
| Palavra Serena | Usada em Agir. Avança o processo de poupar o inimigo. |
| Passo Fantasma | Impulso de invulnerabilidade na fase de desvio. Disponível no exílio. |
| Eclipse Interior | Dano alto, mas custa vida. Ligada à culpa e ao final de sacrifício. |
| Poder dos Selos (7) | Uma magia por selo restaurado. Ver a tabela dos sete territórios. |

## Níveis, atributos, Laços e progressão

| Sistema | Proposta |
| --- | --- |
| Atributos | Vida, Força, Defesa, Aether e Agilidade. |
| Nível e experiência | Na parte 1, do nível 1 ao 12. |
| Laços | Segunda trilha de progressão, alimentada ao poupar e conversar. |
| Nível e o salto de 9 anos | Ryben volta no nível 8, sem as magias da juventude, e chega ao nível 30 no fim. |

O Ryben perde as magias da juventude depois do salto, porque o Aether não o obedece por causa da culpa. Ele recupera poder a cada selo restaurado.

## Missões da história

A estrutura é em duas partes, juventude e exílio, com a mesma geografia e o mundo transformado. O diário lista as missões ativas com a próxima etapa. A numeração abaixo é proposta.

### Parte 1: juventude

| Nº | Missão | Resumo |
| --- | --- | --- |
| 1.1 | Primeiro dia na Guarda | Apresenta Ryben, os amigos e o tutorial de combate. |
| 1.2 | Os selos enfraquecem | Sinais de que algo está errado no reino. |
| 1.3 | A estrada do santuário | Ryben segue a estrada até o santuário dentro da área inicial. A vila vira o hub, reconstruído aos poucos na parte 2. |
| 1.4 | O santuário | Ryben chega ao Coração de Aether. |
| 1.5 | A catástrofe | Eclipse, traição de Vaelor e derrota. |

### Parte 2: exílio

| Nº | Missão | Resumo |
| --- | --- | --- |
| 2.1 | Cinzas de Aetheria | Ryben volta aos 24 anos a um reino devastado. |
| 2.2 | A resistência | Reencontro com Lyra e Tob e entrada na resistência. |
| 2.3 | O primeiro selo | Primeiro território libertado e primeira magia de selo. |
| 2.4 | O que Maren escondeu | A verdade sobre o pai, Daren, e sobre a mãe. |
| 2.5 | Os territórios restantes | Selos 2 a 6, cada um com um general. |
| 2.6 | Kael | Sétimo território e selo, com o chefe mais emocional. |
| 2.7 | O Coração de Aether | Final, com a escolha do sacrifício. |

## Missões secundárias

Muitas ligam o antes e o depois do salto. Todas são propostas.

| Missão | Ideia |
| --- | --- |
| A carta de Mira | Uma carta deixada na parte 1 muda a atitude de Mira na parte 2. |
| As invenções do Tob | Tob testa engenhocas na juventude e as aperfeiçoa na forja. |
| Provas do Mestre Orin | Treinos da Guarda que rendem Laços e dicas sobre Daren. |
| Moradores desconfiados | Na parte 2, ganhar a confiança de quem culpa Ryben. |
| Os desertores | Soldados de Vaelor que podem ser poupados e recrutados. |
| Lembranças da Guarda | Objetos da juventude que revelam a história de Daren. |
| Ervas para a Lyra | Coleta de Erva-lume para a resistência. |
| Como era antes | Rever lugares da parte 1, agora transformados. |

## Sistemas

| Sistema | Definição | Estado |
| --- | --- | --- |
| Atributos | Vida, ataque, defesa e nível | Proposta |
| Inventário | Itens de cura e equipamentos básicos | Proposta |
| Save | Pontos de save espalhados pelo mapa | Proposta |
| Diálogos | Caixas de texto com NPCs | Proposta |
| Missões | Da história e secundárias, com diário de missões ativas | Proposta |
| Slots de equipamento | Arma, vestes e amuleto | Proposta |
| Recurso mágico | Aether (pontos de magia) | Proposta |
| Loja e dinheiro | Moeda: Brasas, deixadas por mobs e achadas em baús. Há compra e venda com mercadores, a Forja do Tob e o mercado negro. Poupar dá menos Brasas, mas rende Laços e itens. A vila reconstruída abre mais lojas. | Definido |

## Estrutura técnica e hospedagem

| Item | Escolha |
| --- | --- |
| Linguagem | TypeScript |
| Build | Vite |
| Engine | Three.js, em 3D low-poly com câmera de cima em ângulo fixo |
| Dados | JSON separado do código (itens, magias, inimigos, padrões de ataque, missões) |
| Versionamento | Git desde o primeiro dia |
| Migração para o Claude Code | Levar a pasta inteira, com README explicando como rodar |
| Modelos 3D e áudio | Pacotes prontos com licença livre (CC0), como Kenney e Quaternius, com um arquivo de créditos |

**Estrutura de pastas (proposta).** Pastas separadas para o código do jogo, a renderização 3D (Three.js), os dados em JSON e os assets (modelos 3D, áudio).

**Hospedagem no GitHub**

- O jogo pode ficar em um repositório seu e ser publicado no GitHub Pages por meio do GitHub Actions.
- No plano gratuito, o repositório precisa ser público. O site pode ter cerca de 1 GB e cada arquivo até 100 MB.
- O Vite precisa do `base` configurado para o endereço do projeto.
- Pode ser instalável como app (PWA). O progresso fica salvo no navegador (localStorage ou IndexedDB).
- Instaladores nativos (Electron, Tauri ou Capacitor) ficam para depois, publicados em GitHub Releases.

## Roadmap por marcos

| Marco | Entrega |
| --- | --- |
| M0 | Projeto base, game loop, máquina de estados, uma cena 3D com câmera e um personagem provisório andando, e README. |
| M1 | Uma sala 3D com colisão e um NPC com diálogo, usando modelos de pacotes prontos. |
| M2 | Menu Lutar, Agir, Item e Poupar, fase de desvio e um inimigo que pode ser poupado. |
| M3 | Inventário, experiência e nível, mapa, salvar e carregar, e viagem rápida. |
| M4 | Parte 1 completa: a área inicial, os mobs, as missões 1.1 a 1.5 e a catástrofe. |
| M5 | Salto de nove anos: a vila em ruínas, a resistência e o primeiro território com selo e magia. |
| M6 | Os outros seis territórios, generais, selos e magias, com carroça, barco e montaria. |
| M7 | Kael, o santuário final, as missões secundárias, arenas e polimento. |

Cada marco termina em algo jogável.

## Decisões em aberto e pontas soltas

**Decidido (por Claude, a pedido do Victor)**

- **Missão 1.3.** Virou A estrada do santuário, e a vila é o hub reconstruído.
- **Plataforma.** Navegador, hospedado no GitHub Pages, instalável como app (PWA).
- **Final.** O sacrifício é sempre uma escolha. Há três finais: Cinzas, Renascido e Ruína.
- **Motivo de Maren.** Só o sangue de Guardião manipula o Coração, e Vaelor sabia disso. Ela escondeu a identidade do pai para proteger o filho.
- **Maren na catástrofe.** Ela fugiu e passou os nove anos escondida nas catacumbas do santuário, mantendo um selo fraco.
- **Magia de Ryben.** Ele perde as magias da juventude depois do salto e recupera poder pelos selos.
- **Nome do mundo.** Aetheria, definitivo.
- **Modelos 3D e áudio.** Pacotes prontos CC0, com um arquivo de créditos.

**Em aberto**

- Nenhuma decisão de design pendente. Os valores de dano, preço e velocidade dos ataques serão ajustados nos testes de jogo.
