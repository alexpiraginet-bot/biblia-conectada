# Prompts: Grand Testament Adventure

Gerado por `tools/prompts.py` a partir de `cenas.py`, `tools/fila.py`, `data/passagens.json`, `procurado.py`, `jornada.py` e `data/geracoes.json`. Não edite à mão: mude o código e rode `python3 -I tools/prompts.py`. Como usar, as regras e o porquê de cada bloco estão no `SKILL.md`. O texto é o de hoje em `cenas.py`; cada job listado foi pedido com o texto daquele momento (o histórico está no git de `cenas.py`).

49 takes em 15 episódios, na ordem da fila (`cenas.ORDEM`). Cada bloco `text` é o prompt exato que `python3 -I tools/fila.py prox` manda ao Higgsfield (`generate_video_batch`), sempre com estes parâmetros:

```json
{"model": "seedance_2_0", "aspect_ratio": "9:16", "duration": 8, "resolution": "720p", "mode": "std", "generate_audio": true, "use_unlim": true}
```

`medias`: na missão que parte da folha, `[{"role": "image_references", "value": "aab922bf-ea1c-485a-be3e-fea044f08fa5"}]`; na que continua, `[{"role": "start_image", "value": "<media id do último quadro do take anterior>"}]` (o upload está no `SKILL.md`, seção 6). A janela grátis do `use_unlim` acabou em 14/11/2026 às 11:30 UTC; fora dela, veja a seção 6 do `SKILL.md` antes de pedir.

## Índice

- `mc-pescadores`: Pescadores de gente (Marcos 1:16–20), 3 de 3 takes gerados, reel conferido
- `mt-aguas`: Andando sobre o mar (Mateus 14:22–33), 3 de 3 takes gerados, reel conferido
- `mc-legiao`: Legião (Marcos 5:1–20), 3 de 3 takes gerados, reel conferido
- `procurado-1`: Procurado, parte 1 de 3 (especial: ele numa cidade de hoje), 3 de 3 takes gerados, reel conferido
- `procurado-2`: Procurado, parte 2 de 3 (especial: ele numa cidade de hoje), 3 de 3 takes gerados, reel conferido
- `procurado-3`: Procurado, parte 3 de 3 (especial: ele numa cidade de hoje), 3 de 3 takes gerados, reel conferido
- `jornada`: A jornada (os quatro evangelhos, 7 missões), 7 de 7 takes gerados, reel conferido
- `fase-final`: Fase final (Lucas 22–23 · João 19, 3 missões), 3 de 3 takes gerados, reel conferido
- `jo-cana`: Água feita vinho (João 2:1–11), 1 de 3 takes gerados
- `mt-entrada`: A entrada em Jerusalém (Mateus 21:1–11), 0 de 3 takes gerados
- `jo-lazaro`: Lázaro, sai fora (João 11:38–44), 0 de 3 takes gerados
- `mc-paes`: Cinco pães e dois peixes (Marcos 6:30–44), 0 de 3 takes gerados
- `mc-paralitico`: O buraco no telhado (Marcos 2:1–12), 0 de 3 takes gerados
- `lc-zaqueu`: Zaqueu, desce (Lucas 19:1–10), 0 de 3 takes gerados
- `jo-samaritana`: A fonte de Jacó (João 4:5–26), 0 de 3 takes gerados

## Pescadores de gente (Marcos 1:16–20)

Episódio `mc-pescadores` · luz do episódio: “bright clear late-morning daylight, vivid natural colours”

### `mc-pescadores-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Desça até a praia” · Discípulos 0 de 4 no fim da missão
- Gerado: job `b8c205eb-382f-424f-91df-c11fcae4cba8`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear late-morning daylight, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the first-century fishing village of Capernaum on the Sea of Galilee as an open game world. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he strides briskly down a village street toward the lake; the camera swings slightly left and right as if steered with a thumbstick; low black basalt houses, awnings, market stalls with fish and bread; villagers step aside and turn their heads, chickens scatter, a donkey cart rolls past. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him as he comes out onto the pebble beach between wooden fishing boats and drying nets and heads toward two fishermen standing knee-deep in the water casting a round throw net; the net spreads in the air and splashes down. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: village chatter without clear words, chickens, cart wheels, footsteps, then waves and gulls. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1674 caracteres.

### `mc-pescadores-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mc-pescadores-1` (`start_image`); o que foi usado: media `4cec6672-60f2-43de-ac72-9c877f189078`
- HUD por cima: objetivo “Chame Simão e André” · tecla [E] “Chamar” · fala “Vinde após mim, e farei serdes pescadores de gente.” (Marcos 1:17) · Discípulos 2 de 4 no fim da missão
- Gerado: job `d6940fcd-9edf-451c-9a5a-9ac6ffca8589`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear late-morning daylight, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 3 metres behind him as he walks briskly across the pebble beach to the water's edge and stops in front of two fishermen who stand knee-deep in the shallow water hauling a round throw net; he raises his right arm and beckons them. Hard cut. Shot 2 (last 4 seconds): gameplay camera slightly to his right side, still behind his shoulder: the two fishermen look at him, drop the wet net into the water and wade quickly out of the lake toward him, splashing, and stop beside him on the beach. Wooden fishing boats, nets, turquoise lake, hills beyond. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: waves, splashing water, gulls, footsteps on pebbles. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1464 caracteres.

### `mc-pescadores-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mc-pescadores-2` (`start_image`); o que foi usado: media `42226b57-3818-47dd-91ff-ff3eb6a27dd5`
- HUD por cima: objetivo “Chame Tiago e João” · tecla [E] “Chamar” · fala “eles deixaram o seu pai Zebedeu no barco com os empregados, foram após ele.” (Marcos 1:20) · Discípulos 4 de 4 no fim da missão · 2 seguidores no radar
- Gerado: job `52e737b6-e3f9-4717-a742-a986e3c46813`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear late-morning daylight, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he strides along the pebble beach with the two fishermen walking right behind him, toward a second wooden boat pulled half onto the shore where two young men and an old man sit mending nets; he raises his right arm and calls to them. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as the two young men put down the nets, jump over the side of the boat into the shallows and run to join him; the old man stays sitting in the boat with two hired workers, watching them go; the group of five walks on along the shore toward the black basalt village. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: footsteps on pebbles, waves, splashing, gulls. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1496 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/mc-pescadores.mp4`: 525 quadros (21,875 s), 27,16 MB, -14,2 LUFS, pico real -1,8 dBTP, cortes em 3,58 s, 10,67 s, 14,58 s, mudança mediana por quadro 7,46 (8,9% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-mc-pescadores.jpg`. Entregue: 2026-11-11: de manhã (arquivo das 09:49) e de novo à tarde, com a barra de progresso corrigida (arquivo fechado às 14:23), ao Alex no chat.

## Andando sobre o mar (Mateus 14:22–33)

Episódio `mt-aguas` · luz do episódio: “a moonlit stormy night, cold blue light, heavy rain and spray”

### `mt-aguas-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Alcance o barco” · fala “Tende coragem! Sou eu, não tenhais medo.” (Mateus 14:27)
- Gerado: job `5849a60b-62b8-4dc3-87d2-7391aa5c98fb`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a moonlit stormy night, cold blue light, heavy rain and spray, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the Sea of Galilee at night in a storm as an open game world. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks fast down a rocky shore into the surf and steps up onto the water without sinking; rain lashes, waves break around his sandals. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him as he strides across the heaving dark waves, rising and dropping with the swell, toward a wooden fishing boat with a lantern tossed in the distance; the men in the boat point at him in terror. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: howling wind, heavy rain, crashing waves, creaking wood, wordless distant cries. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1458 caracteres.

### `mt-aguas-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mt-aguas-1` (`start_image`); o que foi usado: media `1a2d51c9-9efe-410a-8971-27554ecc169b`
- HUD por cima: objetivo “Chame Pedro” · tecla [E] “Chamar” · fala “Vem.” (Mateus 14:29)
- Gerado: job `f5a36a70-849b-4b04-b7c7-280b57cdb788`
- Descartado (job `859938fe-bb35-49ab-aa70-065f1c57e21e`): teste com video_references: recomeçou da praia em vez de continuar e vestiu o pescador com a roupa do protagonista

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a moonlit stormy night, cold blue light, heavy rain and spray, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera holds about 3 metres behind him as he stops on the waves a few metres from the boat and stretches out his right hand; one of the men in the boat, a sturdy fisherman with short curly hair and a short beard, wearing a dark brown sleeveless work tunic and no mantle, climbs over the side of the boat and lowers himself onto the water. Hard cut. Shot 2 (last 4 seconds): gameplay camera slightly to the side, still behind the player character's shoulder: the fisherman in the dark brown tunic lets go of the hull and takes several unsteady steps on the surface toward the player character, arms out for balance, while the others in the boat watch, gripping the side; a tall wave rises beside the fisherman and he looks at it in fear. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: wind, rain, waves slapping the hull, creaking wood. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1636 caracteres.

### `mt-aguas-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mt-aguas-2` (`start_image`); o que foi usado: media `4ccb6d22-ad71-4705-a884-e5486f95884e`
- HUD por cima: objetivo “Segure Pedro” · tecla [E] “Segurar” · fala “Homem de pouca fé, por que duvidaste?” (Mateus 14:31)
- Gerado: job `7fbcffaa-090f-46a4-9971-63f7585d9aea`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a moonlit stormy night, cold blue light, heavy rain and spray, smooth frame rate, player-controlled camera. The player character is the man at the right edge of the first frame, seen from behind his shoulder: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; his face is never shown. Two shots with one hard cut. Shot 1 (first 4 seconds): the camera stays over the player character's shoulder as in the first frame: the fisherman in the dark brown tunic, standing on the water in front of him, suddenly sinks to his chest in the waves and reaches up with one arm; the player character steps forward on the water, bends, grips the fisherman's hand and forearm and pulls him up until he stands on the surface again. Hard cut. Shot 2 (last 4 seconds): the gameplay camera is behind the player character, fully visible from behind, as he and the fisherman climb over the side into the same wooden boat with the lantern on its mast, pulled in by the men aboard; the moment the two stand on the deck the wind drops, the rain stops, the waves flatten to a calm sea and the clouds open around the full moon; the men in the boat kneel on the deck in front of him. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: wind and rain dying away to calm, splashing water, wood creaking, quiet. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1711 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/mt-aguas.mp4`: 544 quadros (22,667 s), 24,07 MB, -14,0 LUFS, pico real -2,0 dBTP, cortes em 3,79 s, 10,29 s, 16,71 s, 18,00 s, mudança mediana por quadro 5,08 (8,2% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-mt-aguas.jpg`. Entregue: 2026-11-11 à tarde (arquivo fechado às 14:21), ao Alex no chat.

## Legião (Marcos 5:1–20)

Episódio `mc-legiao` · luz do episódio: “a stormy grey dawn after the storm, low dark clouds, wet rocks, shafts of cold light breaking through”

### `mc-legiao-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Desembarque na terra dos Gadarenos” · fala “Que tenho eu contigo Jesus, Filho do Deus Altíssimo?” (Marcos 5:7)
- Gerado: job `cf7ce781-b535-44fc-b948-46d5b2a1010e`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a stormy grey dawn after the storm, low dark clouds, wet rocks, shafts of cold light breaking through, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the steep eastern shore of the Sea of Galilee in the land of the Gadarenes as an open game world: a rocky beach, a steep green hillside above it full of dark rock-cut tomb openings, a large herd of pigs grazing high on the slope. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he steps from a wooden fishing boat onto the wet rocky beach, his disciples climbing out of the boat behind him; the camera swings up toward the hillside of dark tomb openings above them. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him as a wild-haired, bearded man in torn grey rags, with broken iron chains and shackles dangling from his wrists, comes running and leaping down the slope from the tombs straight at him, shouting; the disciples step back; the man throws himself down on his knees on the rocks in front of him. No wounds, no blood. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: waves on rocks, wind, chains clanking, a man's wordless shout echoing off the hillside. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1843 caracteres.

### `mc-legiao-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mc-legiao-1` (`start_image`); o que foi usado: media `38ff3bc7-a2db-435d-ade1-9e80569587c5`
- HUD por cima: objetivo “Expulse o espírito imundo” · tecla [E] “Ordenar” · fala “Legião é o meu nome, porque somos muitos.” (Marcos 5:9)
- Gerado: job `5e2efe32-990a-4be1-8755-2d93579e8662`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a stormy grey dawn after the storm, low dark clouds, wet rocks, shafts of cold light breaking through, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera behind his shoulder: the man in rags kneels on the rocks in front of him, writhing and shouting up at him, while a dark shadow like black smoke boils around the man's body; the player character stretches out his right hand toward him. Hard cut. Shot 2 (last 4 seconds): the same camera as the black smoke tears out of the man in dozens of swirling dark wisps and streams away up the hillside toward the large herd of pigs grazing on the slope; the man slumps forward on the rocks, still; the disciples stare. The dark wisps are only smoke and shadow, no faces, no creatures. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a roaring rushing wind, many overlapping wordless shrieks fading away, chains rattling, then silence and waves. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1583 caracteres.

### `mc-legiao-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mc-legiao-2` (`start_image`); o que foi usado: media `1238e2ab-2ca9-4fbe-84de-8bfddf2193a8`
- HUD por cima: objetivo “Liberte o homem” · fala “a manada lançou-se abaixo no mar” (Marcos 5:13)
- Gerado: job `f8878cc9-5891-4347-93c1-bcaa965a3fee`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a stormy grey dawn after the storm, low dark clouds, wet rocks, shafts of cold light breaking through, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): wider gameplay camera behind and above the player character: on the hillside the huge herd of pigs, hundreds of them, panics and stampedes down the steep slope and pours over the edge of a cliff into the sea with great white splashes; the swineherds drop their staffs and run away along the shore. Hard cut. Shot 2 (last 4 seconds): the gameplay camera behind the player character as he sits on a rock beside the same man, now calm, washed, hair tied back, dressed in a clean plain tunic, the broken chains lying on the ground; the disciples stand around them; people from the town come running along the shore and stop at a distance, staring in fear. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: pigs squealing and splashing into the sea, running footsteps, then waves, wind and murmuring voices. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1627 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/mc-legiao.mp4`: 530 quadros (22,083 s), 20,24 MB, -14,1 LUFS, pico real -1,7 dBTP, cortes em 4,17 s, 7,29 s, 10,08 s, 14,04 s, 17,88 s, mudança mediana por quadro 1,33 (1,8% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-mc-legiao.jpg`.

## Procurado, parte 1 de 3 (especial: ele numa cidade de hoje)

Episódio `procurado-1` · luz do episódio: “bright clear sunlight” · povo: `POVO_HOJE`

### `procurado-1-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Ande pela cidade” · estrelas 5 → 0 · cartão “12 HORAS ANTES” no corte
- Gerado: job `d8697264-c9d8-484f-9d50-18bc6b07ff60`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, the first shot at night under flashing police lights and a helicopter searchlight, the second in bright clear morning sunlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a modern sunny coastal city of today as an open game world: wide avenues, palm trees, glass towers, a beach promenade, traffic, buses, people everywhere with phones; on its edge, a park of old olive trees. Two shots with one hard cut. Shot 1 (first 4 seconds): night, at the edge of the park of old olive trees: the gameplay camera follows about 4 metres behind him as he walks slowly toward a line of police cars with flashing red and blue lights and no lettering and officers holding flashlights, while a helicopter overhead floods him with a white searchlight; he spreads his arms with open, empty hands. No weapons drawn. Hard cut. Shot 2 (last 4 seconds): bright morning: the same gameplay camera follows about 4 metres behind him as he walks briskly along the busy sunny beach promenade among joggers, cyclists, palm trees and traffic; people look up from their phones and turn their heads at his tunic, a woman films him with her phone. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: first a helicopter, sirens and radio chatter, then waves, traffic, birds and city chatter without clear words. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1963 caracteres.

### `procurado-1-2` · missão 2 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Cure o homem da mão definhada” · tecla [E] “Curar” · fala (plano a) “Estende a tua mão.” (Marcos 3:5) · fala (plano b) “para combinarem sobre como o matariam.” (Marcos 3:6) · estrelas 1
- Gerado: job `134a4155-f66d-4021-9ab0-eb2e5e6e4dfb`
- Descartado (job `be133dfe-a844-4bca-9b3b-d3ed46aeda5e`): o homem da mão definhada saiu de túnica e manto como o jogador (dois Jesus no salão) e longe demais para se ver a mão

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright warm daylight through tall windows, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a packed, bright meeting hall with rows of chairs in a modern city of today. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera about 2 metres behind him as he walks down the middle aisle and stops right in front of a bald middle-aged man in a blue denim jacket and jeans who stands in the aisle holding his shrivelled, curled right hand against his chest; the player character gestures to him; the man slowly stretches out his arm and his hand opens, straight and healthy; the people around them jump up, gasp and raise their phones. The player character is the only person in a tunic and mantle in the whole hall. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera, behind the player character at the front of the hall, looking toward the back: two men in dark suits who were watching lower their phones, look at each other and walk out through the back doors; in the corridor outside one of them presses his phone to his ear while the other glances back. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: a murmuring crowd, gasps, chairs scraping, then a door closing and footsteps in a corridor. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1908 caracteres.

### `procurado-1-3` · missão 3 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Vire as mesas dos cambistas” · tecla [E] “Virar a mesa” · fala (plano a) “não torneis a casa de meu Pai uma casa de comércio!” (João 2:16) · fala (plano b) “buscavam uma maneira de o matar” (Marcos 11:18) · estrelas 2
- Gerado: job `8ece366c-9c21-456b-8509-3afd97b436ff`
- Descartado (job `14e854fa-425a-4721-8c8e-d82703304507`): o templo saiu com torre esculpida de templo hindu do sul da Índia (figuras de divindades): Jesus virando mesas ali vira ataque a outra religião; e sem corte seco

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, hard bright midday sunlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the huge sunny stone courtyard of the grand old temple of a modern city of today, turned into a market: money-exchange counters with card machines and stacks of banknotes, cages of white doves, souvenir stands. The courtyard is surrounded by long colonnades of plain cream limestone columns, like the porches of an ancient Roman-era temple, with a wide stone staircase and a plain stone balcony above; no towers, no domes, no statues, no carved figures, no religious symbols anywhere. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he strides between the stalls, grabs the edge of a long money table and flips it over; coins and banknotes fly, chairs topple, cages burst open and the white doves fly up; the vendors scatter. Hard cut. Shot 2 (last 4 seconds): the gameplay camera is behind him as he stands among the overturned tables and scattered coins, looking up at the plain stone balcony above the courtyard where men in dark suits and unarmed security guards watch; one of them points down at him and speaks into a radio. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: a crowd shouting without clear words, a table crashing, coins clattering on stone, doves flapping, then radio static. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

2021 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/procurado-1.mp4`: 561 quadros (23,375 s), 25,38 MB, -14,1 LUFS, pico real -1,0 dBTP, cortes em 3,54 s, 7,29 s, 10,83 s, 13,29 s, 14,58 s, 17,67 s, mudança mediana por quadro 5,84 (6,6% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-procurado-1.jpg`.

## Procurado, parte 2 de 3 (especial: ele numa cidade de hoje)

Episódio `procurado-2` · luz do episódio: “bright clear sunlight” · povo: `POVO_HOJE`

### `procurado-2-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Escreva na terra” · tecla [E] “Escrever” · fala (plano b) “Aquele de vós que está sem pecado, seja o primeiro que atire pedra contra ela.” (João 8:7) · estrelas 2 → 3
- Gerado: job `b6a4a755-0f42-486d-a5f2-cc32d1e7cd6f`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, hard bright noon sunlight on the beach, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a modern sunny coastal city of today as an open game world: wide avenues, palm trees, glass towers, a beach promenade, traffic, buses, people everywhere with phones; on its edge, a park of old olive trees. Two shots with one hard cut. Shot 1 (first 4 seconds): on the beach promenade at noon a crowd of people pointing their phones surrounds a frightened woman in a plain dress sitting on the sand, two men in dark suits accusing her and a man holding a stone; the gameplay camera stays about 3 metres behind the player character as he kneels down at the edge of the circle and writes in the sand with his finger. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as he stands up; one by one, the older men first, the people lower their phones and walk away; the man drops his stone in the sand; the men in suits leave angrily; only the woman remains, looking up at him. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: waves, wind, an angry crowd murmuring without clear words, then silence, waves and gulls. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1793 caracteres.

### `procurado-2-2` · missão 2 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Chame Lázaro para fora” · tecla [E] “Chamar” · fala (plano 2,9 s) “Lázaro, sai fora.” (João 11:43) · fala (plano b) “Desatai-o, e deixai-o ir.” (João 11:44) · estrelas 3
- Gerado: job `9d4f6a6e-2bd5-475d-9e72-c17845401ec1`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, golden late-afternoon light, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a cemetery on a hillside at the edge of a modern city of today. Two shots with one hard cut. Shot 1 (first 4 seconds): a crowd, news cameras on tripods and two sisters dressed in black stand among the graves; the gameplay camera follows about 3 metres behind him as he walks up to a tomb cut into the rock whose round stone has been rolled aside, stops in front of the dark opening and calls into it with his arms raised. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as out of the dark opening a man wrapped from head to feet in white linen strips, his face covered with a white cloth, shuffles into the light; the crowd gasps, people raise their phones, the news cameras swing toward him and the two sisters run to him. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: wind on the hillside, a murmuring crowd, camera shutters, gasps. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1612 caracteres.

### `procurado-2-3` · missão 3 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Siga pela cidade” · fala (plano a) “Que faremos? Porque este homem faz muitos sinais.” (João 11:47) · fala (plano b) “Então desde aquele dia se aconselhavam juntos para o matarem.” (João 11:53) · estrelas 3 → 4
- Gerado: job `e46d85af-8450-4bd2-942b-c9e50e2c6e15`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night city lights, neon signs, wet streets, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a busy street of a modern city of today at night. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks with a small group of companions along the street of neon signs; across the street a giant screen on a building shows news footage of a man wrapped in white linen walking out of a tomb, and people stop on the pavement to watch it. Hard cut. Shot 2 (last 4 seconds): the same camera behind him and his companions as two police cars with flashing red and blue lights and no lettering drive slowly past them, then make a U-turn and follow them at a distance. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: night traffic, a distant news broadcast without clear words, a short burst of siren, footsteps. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1547 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/procurado-2.mp4`: 561 quadros (23,375 s), 22,29 MB, -14,1 LUFS, pico real -2,1 dBTP, cortes em 3,42 s, 7,33 s, 14,54 s, 17,96 s, mudança mediana por quadro 2,53 (3,0% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-procurado-2.jpg`.

## Procurado, parte 3 de 3 (especial: ele numa cidade de hoje)

Episódio `procurado-3` · luz do episódio: “night” · povo: `POVO_HOJE`

### `procurado-3-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Atravesse o centro” · fala (plano b) “se alguém soubesse onde ele estava, o denunciasse, para que o pudessem prender.” (João 11:57) · estrelas 4 → 5
- Gerado: job `1e35e264-7ae8-4b66-bd2d-060a8c03ea64`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night city lights, neon signs, wet streets, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a busy street of a modern city of today at night. Two shots with one hard cut. Shot 1 (first 4 seconds): night: the gameplay camera follows about 4 metres behind him as he walks with his companions down a crowded street; suddenly every phone in people's hands, the big building screens and the bus-stop screens light up red at the same moment with an alert showing his picture; people look at their phones, then stare at him as he walks past. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as one of his companions, a man with a short beard in a dark hoodie, slips back into a dark doorway, pulls his hood up and raises his phone to his ear, watching the player character walk on. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: a loud alert tone from many phones at once, murmurs, traffic, then a hushed phone call without clear words. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1628 caracteres.

### `procurado-3-2` · missão 2 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Ore no jardim” · tecla [E] “Orar” · fala (plano a) “Judas, o que o traía, conhecia aquele lugar” (João 18:2) · fala (plano b) “veio ali com lanternas, tochas, e armas.” (João 18:3) · estrelas 5
- Gerado: job `2aa93d04-66f5-4759-86d9-f18380d945a0`
- Descartado (job `a4015ebf-80c4-48c5-aee6-ff19b8bdd956`): um dos companheiros no banco saiu de cabelo comprido, barba e túnica clara como o jogador (dois Jesus no jardim), em pé sob a lanterna no meio do quadro de 5,5 a 6,5 s; e ele se levanta no fim, o que o take 3 ainda ia mostrar

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night, moonlight through olive trees, the glow of the city beyond, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a park of old olive trees at night at the edge of a modern city of today. Two shots with one hard cut. Shot 1 (first 4 seconds): his three companions, short-haired men of today in jeans, sneakers and dark zip jackets, sleep on the park benches; the gameplay camera stays about 3 metres behind the player character as he kneels on the ground among the olive trees and prays. Hard cut. Shot 2 (last 4 seconds): the same camera behind him, still on his knees, as a long line of flashlights comes through the olive trees: police officers and a crowd, the man in the dark hoodie walking in front of them; his three companions in jeans and jackets wake up in alarm and jump to their feet. No weapons drawn. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: crickets, wind in the olive leaves, then many footsteps, radio static, a helicopter approaching. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1645 caracteres.

### `procurado-3-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `procurado-3-2` (`start_image`); o que foi usado: media `eab40214-5b66-41b6-a160-51a8a5415cc2`
- HUD por cima: objetivo “Vá ao encontro deles” · escolha [E] “Fugir” ou “Ir ao encontro” (aperta a 2ª) · fala (plano a) “A quem buscais?” (João 18:4) · fala (plano b) “Quando pois lhes disse: Eu sou, voltaram para trás, e caíram em terra.” (João 18:6) · estrelas 5
- Gerado: job `bfe6a506-9e18-46ee-b897-dfddb31b4dcd`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night, flashlights and a white helicopter searchlight among olive trees, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the camera stays behind him as he stands up; his three companions in jeans and jackets step aside, and he walks forward alone toward the wall of flashlights and the helicopter's white searchlight, his open hands at his sides. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as he takes one calm step into the searchlight and the whole line of officers and the crowd in front of him stagger backwards and fall to the ground; he stands still in the light, waiting. No weapons drawn, nobody is hurt. Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle. No children. Ambient sound only: helicopter rotor, radio static, then a deep rumble and bodies falling on the grass, then only the helicopter. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1506 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/procurado-3.mp4`: 595 quadros (24,792 s), 22,22 MB, -14,0 LUFS, pico real -2,0 dBTP, cortes em 3,50 s, 7,46 s, 18,71 s, mudança mediana por quadro 3,03 (5,5% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-procurado-3.jpg`.

## A jornada (os quatro evangelhos, 7 missões)

Episódio `jornada` · luz do episódio: “golden sunrise light over the lake, morning mist, vivid natural colours”

### `jornada-1` · missão 1 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Chame os pescadores” (a partir do corte) · tecla [E] “Chamar” (plano b) · fala (plano b) “Vinde após mim, e eu vos farei pescadores de gente.” (Mateus 4:19) · faixa “GALILEIA” / “Jesus rodeava toda a Galileia” (Mateus 4:23) · Discípulos 2 de 12 (plano b)
- Gerado: job `979f3db5-671d-4294-9da3-1641556b9752`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, golden sunrise light over the lake, morning mist, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the hills and shore of the Sea of Galilee in the first century as a vast open game world: fishing villages of black basalt houses, terraced fields, olive groves, a dirt road along the lake, wooden fishing boats on the water. Two shots with one hard cut. Shot 1 (first 4 seconds): a high gameplay camera swoops down from above the lake and the hills like an open-world region reveal and settles about 4 metres behind him as he walks along the lakeside road at sunrise; villagers with donkeys and baskets pass by, smoke rises from the village ahead. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him on the pebble beach as he raises his right arm and beckons two fishermen standing in a wooden boat near the shore; they drop their net into the water, jump into the shallows and wade toward him. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: morning birds, waves on pebbles, distant village sounds, splashing water. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1700 caracteres.

### `jornada-2` · missão 2 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Faça os primeiros sinais” · tecla [E] “Encher os vasos” (plano a) · tecla [E] “Curar” (plano b) · fala (plano a) “Enchei estes vasos com água.” (João 2:7) · fala (plano b) “levanta-te, toma o teu leito” (Marcos 2:11) · conta 2 sinais no contador de sinais
- Gerado: job `a0db99a1-db09-4285-89ed-0613539113f7` (usado no take montado da missão 2 = jornada-2-sosias (job 2aba6e6f) quadros 0-78 + este take (job a0db99a1) quadros 88-192, ver `jornada.py`)
- Descartado (job `2aba6e6f-8146-4029-ab77-79fc687ba184`): no plano da casa em Cafarnaum, um homem no meio da multidão saiu de cabelo comprido, barba e manto vermelho como o jogador, e o paralítico curado com o mesmo rosto: três 'Jesus' na cena; e um homem em pé numa tábua pendurada nas cordas. Caná ficou boa (guardada aqui, se a nova falhar); o plano de Caná (quadros 0 a 78) foi aproveitado no take montado da missão 2 (jornada.py, montagem), porque o Caná do 2º pedido veio com dezenas de jarros e um homem de manto avermelhado à mesa

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm golden afternoon sunlight, soft dust in the air, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: first-century villages of Galilee: a wedding courtyard in Cana, then a crowded stone house in Capernaum. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 3 metres behind him as he walks between the tables of a wedding feast to six large stone water jars; servants pour water into them, and as he stops beside them the water in the nearest jar turns deep red wine, glinting in the light. Hard cut. Shot 2 (last 4 seconds): inside a crowded stone house, light falling through a hole in the roof where two ropes still hang: the same gameplay camera behind him as he stretches out his hand toward an older bald man with a short grey beard lying on a straw mat on the floor; the old man gets up, rolls up the mat, lifts it onto his shoulder and walks, and the crowd steps back in astonishment. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: wedding chatter without clear words, water pouring, then a crowded room murmuring, gasps. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1788 caracteres.

### `jornada-3` · missão 3 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Atravesse o mar” · tecla [E] “Acalmar” (plano a) · tecla [E] “Andar sobre o mar” (plano b) · fala (plano a) “Cala-te, aquieta-te!” (Marcos 4:39) · fala (plano b) “Tende coragem! Sou eu, não tenhais medo.” (Mateus 14:27) · conta 2 sinais no contador de sinais
- Gerado: job `68f0444a-1dcd-4a9a-9547-339118099b74` (usado no take montado da missão 3 = jornada-3-barco (job c4252c4a) quadros 0-97 + este take (job 68f0444a) quadros 98-192, ver `jornada.py`)
- Descartado (job `c4252c4a-d355-43cc-8361-46866867065b`): no andar sobre o mar, ele sai de um píer de madeira e, no barco, um homem de cabelo comprido, barba e manto vermelho como o dele (pedido feito antes da regra de um manto vermelho só). A tempestade (do início ao corte em 4,083 s: ele de pé na proa, o braço erguido, o mar acalmando) ficou boa e fica guardada aqui para a montagem; a tempestade (quadros 0 a 97) foi usada no take montado da missão 3

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night storm, lightning flashes, dark blue moonlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a wooden fishing boat on the Sea of Galilee at night. Two shots with one hard cut. Shot 1 (first 4 seconds): a violent storm, waves breaking over the side, his companions bailing water in panic; the gameplay camera stays about 3 metres behind him as he stands up at the stern and stretches out his arm over the waves, and the wind and the waves die down at once into a calm, glassy lake. Hard cut. Shot 2 (last 4 seconds): later, calm water under the moon, far from any shore: the same gameplay camera behind him as he walks on the surface of the lake toward the fishing boat, ripples spreading under each step; his companions in the boat, short-haired men in plain brown tunics, stare at him in fear. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: howling wind, crashing waves, thunder, then a sudden calm, gentle lapping water. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1651 caracteres.

### `jornada-4` · missão 4 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo (plano a) “Alimente a multidão” / objetivo (plano b) “Entre em Jerusalém” · tecla [E] “Repartir” (plano a) · fala (plano a) “Todos comeram e se saciaram.” (Marcos 6:42) · fala (plano b) “Hosana ao Filho de Davi!” (Mateus 21:9) · conta 1 sinal no contador de sinais · mapa de viagem rápida no corte
- Gerado: job `a9ca8f87-b036-4185-996d-0c3374105a9c` (usado no take montado da missão 4 = este take (job a9ca8f87) quadros 0-103 + jornada-4-tres-iguais (job ab987bae) quadros 75-192, ver `jornada.py`)
- Descartado (job `ab987bae-8fce-433d-9616-f36a9d63a27a`): no plano dos pães, três homens iguais ao jogador (cabelo comprido, barba, túnica clara e manto vermelho) de frente para a câmera, passando cestos; a câmera não fica atrás dele. A entrada em Jerusalém (do corte em 3,125 s ao fim) ficou boa e fica guardada aqui para a montagem, se o novo pedido não trouxer uma melhor; a entrada (quadros 75 a 192) foi usada no take montado da missão 4

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm golden sunlight, long soft shadows, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a green hillside above the Sea of Galilee, then the road up to a stone gate of Jerusalem. Two shots with one hard cut. Shot 1 (first 4 seconds): a huge crowd sits in groups on the green grass; the gameplay camera stays about 3 metres behind him, only his back visible, as he walks between the groups holding a basket of bread against his chest and hands loaves to the seated people; baskets passing from hand to hand through the crowd keep filling with bread and fish; his companions are short-haired men in plain brown tunics without mantles. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him as he rides a grey donkey up the road to the city gate while a large crowd waves palm branches and spreads cloaks on the road in front of him. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: a huge crowd murmuring, wind in the grass, then a cheering crowd without clear words, hooves on stone. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1717 caracteres.

### `jornada-5` · missão 5 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo (plano a) “Celebre a ceia” / objetivo (plano b) “Ore no jardim” · tecla [E] “Partir o pão” (plano a) · tecla [E] “Orar” (plano b) · fala (plano a) “Isto é o meu corpo” (Lucas 22:19) · fala (plano b) “não se faça minha vontade, mas a tua.” (Lucas 22:42) · Discípulos 12 de 12 (plano a)
- Gerado: job `c6dbe30b-6b47-4402-813c-a4cb57a5d7bc` (usado no take montado da missão 5 = este take (job c6dbe30b) quadros 0-49, aproximados 1,6x para tirar da imagem o fundo da mesa (lá sentou de novo um homem vestido como ele) + jornada-5-dois-na-ceia (job 40c5e051) quadros 78-192, ver `jornada.py`)
- Descartado (job `40c5e051-ad44-4124-8d84-f836d45af5cb`): na ceia, a câmera fica atrás de um homem de manto vermelho e, do outro lado da mesa, de frente, outro homem igual ao jogador parte o pão (a ceia clássica, com dois dele). O Getsêmani (do corte em 3,25 s ao fim: ajoelhado na pedra, três dormindo, as tochas chegando junto ao muro) ficou bom e fica guardado aqui para a montagem; o Getsêmani (quadros 78 a 192) foi usado no take montado da missão 5

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm oil-lamp light at night, then cold moonlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: Jerusalem at night: an upper room, then a garden of old olive trees outside the walls. Two shots with one hard cut. Shot 1 (first 4 seconds): an upper room lit by oil lamps: the gameplay camera is just behind him, only his back and shoulders visible in the lower centre of the frame, as he sits at the near side of a low table and breaks a round loaf of bread in two with both hands raised in front of him; around the table, facing him, sit his twelve companions, short-haired bearded men in plain brown and grey tunics without mantles; nobody sits at the far side of the table straight across from him. Hard cut. Shot 2 (last 4 seconds): a garden of old olive trees under the moon: the same gameplay camera behind him as he kneels alone on a rock and prays, his head bowed; in the distance three of his companions sleep under the trees, and the torches of a crowd come up the hill. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: crackling oil lamps, a quiet room, then crickets, wind in the olive leaves, distant footsteps. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1844 caracteres.

### `jornada-6` · missão 6 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: fala (plano a) “E levando ele sua cruz” (João 19:17) · fala (plano b) “Está consumado” (João 19:30) · faixa “FASE FINAL” / “REDENÇÃO” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a, b
- Gerado: job `5ab427c2-0f2b-4375-9c5d-d13305a5a434`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, overcast grey light that darkens into a black stormy sky at midday, smooth frame rate, player-controlled camera. The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle, leather sandals. In shot 1 he is seen from behind in the lower centre of the frame. In shot 2 he is not among the people on the ground. Setting: Jerusalem and a bare rocky hill outside its walls. Two shots with one hard cut. Shot 1 (first 4 seconds): a narrow stone street: the gameplay camera follows about 4 metres behind him as he slowly carries a heavy wooden cross on his shoulder up the street, Roman soldiers walking beside him with spears held upright, women weeping along the walls. No blood, no wounds visible. Hard cut. Shot 2 (last 4 seconds): the camera stays far behind a small group of mourning women and one bearded man standing still at the foot of the hill, looking up at three crosses in black silhouette against dark clouds; the wind blows dust. Seen only from far away and in silhouette: no blood, no wounds, no close-up of the crosses. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: a murmuring crowd, slow footsteps, armour clinking, then wind, distant thunder and silence. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1690 caracteres.

### `jornada-7` · missão 7 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Vá à Galileia” (a partir do corte) · fala (plano a) “Ele não está aqui, pois já ressuscitou” (Mateus 28:6) · fala (plano b) “eu estou convosco todos os dias, até o fim dos tempos.” (Mateus 28:20) · faixa “TERCEIRO DIA” / “RESSURREIÇÃO” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a · 11 seguidores no radar
- Gerado: job `f0f1a5a7-abf5-42a6-bead-82de617757c5`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, the first golden light of dawn, soft mist, smooth frame rate, player-controlled camera. The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle, leather sandals. In shot 1 he is not in the frame: the tomb is empty. In shot 2 he is seen from behind in the lower centre of the frame. Setting: a garden with a tomb cut into the rock outside Jerusalem, then a hilltop in Galilee. Two shots with one hard cut. Shot 1 (first 4 seconds): three women carrying jars of spices walk up the garden path at dawn; the gameplay camera stays about 4 metres behind them as they stop in front of the tomb, whose large round stone has been rolled away; warm light pours out of the empty opening onto the folded linen cloths inside. Hard cut. Shot 2 (last 4 seconds): the top of a green hill above the Sea of Galilee at sunrise: he stands in the light, seen from behind, with his arms open, while his eleven companions, short-haired bearded men in plain brown and grey tunics without mantles, kneel and stand around him, the valleys and the lake glowing gold below. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: dawn birds, soft wind, footsteps on gravel, then wind over the hilltop. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1688 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/jornada.mp4`: 1202 quadros (50,083 s), 27,88 MB, -14,1 LUFS, pico real -1,5 dBTP, cortes em 4,12 s, 7,54 s, 10,17 s, 13,67 s, 13,88 s, 16,92 s, 20,08 s, 22,96 s, 27,21 s, 29,67 s, 33,83 s, 37,38 s, mudança mediana por quadro 4,21 (5,8% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-jornada.jpg`. Entregue: 13/11 ~10:15, com capa (quadro de 1,0 s) e legenda (LEGENDAS-JORNADA.md).

## Fase final (Lucas 22–23 · João 19, 3 missões)

Episódio `fase-final` · luz do episódio: “night, cold blue moonlight through old olive trees, then the warm orange glow of approaching torches”

### `fase-final-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo (plano a) “Ore no jardim” / objetivo (plano b) “Entregue-se” · tecla [E] “Orar” (plano a) · tecla [E] “Ir ao encontro” (plano b) · fala (plano a) “não se faça minha vontade, mas a tua.” (Lucas 22:42) · fala (plano b) “A quem buscais?” (João 18:4)
- Gerado: job `ff99a605-2a91-4df1-ba44-f73b7c33e818`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night, cold blue moonlight through old olive trees, then the warm orange glow of approaching torches, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a garden of old olive trees on a hillside outside the walls of first-century Jerusalem at night; the dark city walls stand in the distance. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera stays about 4 metres behind him, only his back visible, as he kneels alone on a flat rock under the old olive trees and prays with his head bowed and his hands resting on the rock; farther down the slope, in the background, three of his companions, short-haired bearded men in plain brown and grey tunics without mantles, sleep wrapped in their cloaks under a tree; the olive leaves move in the wind. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera, still about 4 metres behind him so that only his back is seen, as he stands up and walks slowly toward a line of burning torches coming up the path between the olive trees: a crowd of men in plain tunics carrying torches and lanterns, with Roman soldiers in plain helmets holding their spears upright; his empty hands are open at his sides. Nobody fights and no weapon is raised. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: crickets, wind in the olive leaves, a distant dog, then many footsteps on gravel and crackling torches. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

2078 caracteres.

### `fase-final-2` · missão 2 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Carregue a cruz” · tecla [E] “Carregar” (plano a) · fala (plano a) “Filhas de Jerusalém, não choreis por mim” (Lucas 23:28) · fala (plano b) “tomaram a um Simão Cireneu, que vinha do campo” (Lucas 23:26)
- Gerado: job `d85f7c99-7f3b-470f-bc3c-1aa6137f8251`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, overcast grey morning light, dust in the air, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a narrow stone street of first-century Jerusalem leading to a city gate, crowded on both sides. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him, only his back visible, as he slowly carries a heavy wooden cross on his right shoulder up the narrow stone street; Roman soldiers in plain bronze helmets and brown cloaks walk beside him with their spears held upright; women in dark mantles weep along the walls as he passes. No blood, no wounds visible; his face is never shown. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him: a soldier stops a strong farmer with a shaved head and a short black beard, in a plain brown work tunic, coming in from the fields; the farmer lifts the cross onto his own shoulders and follows close behind him on the left side of the frame, while the player character walks on in the centre of the frame with empty hands toward the open city gate, the crowd following. No blood, no wounds visible. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: a murmuring crowd without clear words, slow footsteps on stone, armour clinking, women weeping softly. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1971 caracteres.

### `fase-final-3` · missão 3 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: fala (plano a) “Pai, perdoa-lhes, porque não sabem o que fazem.” (Lucas 23:34) · fala (plano b) “hoje estarás comigo no paraíso.” (Lucas 23:43) · faixa “REDENÇÃO” / “FASE FINAL” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a, b
- Gerado: job `ad2ce9b0-e8d2-4825-aff9-7b4f22f9f2b2` (usado no take montado da missão 3 = este take (job ad2ce9b0) quadros 0-81 + fase-final-3-sosia (job 9c2754f5) quadros 130-192, ver `jornada.py`, ver `jornada.py`)
- Descartado (job `9c2754f5-f0bf-4a09-9a2f-17509a60a5e0`): no plano 1, em vez de poucas mulheres, uma multidão de costas e, bem no meio, um homem de cabelo comprido, barba, túnica clara e manto terracota como o jogador (e outros de cabelo comprido e manto vermelho). O plano 2 (do fim da fusão, perto de 5,2 s, ao fim: as três cruzes pequenas no alto do morro, a terra escura, o oficial embaixo e o filete de luz dourada no horizonte) ficou bom e fica guardado aqui para a montagem

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, a midday sky turning black, the sun dimming behind heavy clouds, then darkness with a thin band of golden light on the horizon, smooth frame rate, player-controlled camera. The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle, leather sandals. In this take he is never seen up close and he is not among the people on the ground. Setting: a bare rocky hill outside the walls of first-century Jerusalem. Two shots with one hard cut. Shot 1 (first 4 seconds): the camera stays far behind four women in dark blue and grey mantles that cover their heads, standing still at the foot of the hill and seen only from behind, looking up at three crosses in black silhouette on the hilltop against a midday sky that turns dark as the sun dims; there are no men on the ground near the camera; the wind blows dust and their mantles. Seen only from far away and in silhouette: no blood, no wounds, no close-up of the crosses. Hard cut. Shot 2 (last 4 seconds): a wide, slow shot from even farther away as darkness covers the whole land: the three crosses are small black shapes on the hilltop, a Roman officer in a plain helmet stands alone below them and lowers his head; at the end a thin band of golden light breaks along the dark horizon behind the hill. Seen only from far away and in silhouette: no blood, no wounds, no close-up. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: wind, distant thunder, then only the wind. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1938 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/fase-final.mp4`: 637 quadros (26,542 s), 27,57 MB, -14,2 LUFS, pico real -2,1 dBTP, cortes em 5,25 s, 9,21 s, 12,67 s, 13,83 s, 16,50 s, mudança mediana por quadro 1,38 (2,5% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-fase-final.jpg`. Entregue: 2026-11-21, ao Alex no chat, com capa (quadro de 1,0 s) e legenda (LEGENDAS-FASE-FINAL.md).

## Água feita vinho (João 2:1–11)

Episódio `jo-cana` · luz do episódio: “warm torch and oil-lamp light at dusk under a deep blue sky”

### `jo-cana-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Entre na festa de casamento” · fala “Não têm vinho.” (João 2:3) · Vasos 0 de 6 no fim da missão
- Gerado: job `10a14927-fedb-4fab-9511-83e7ee4558b2`
- Descartado (job `26b2638e-ec1b-41d4-a795-7d879c9627bc`): um plano só, sem corte; termina num jarro de barro pingando líquido claro ao lado de dois jarros de barro: confunde 'não têm vinho' e atrapalha os seis vasos de pedra da missão 2
- Descartado (job `f90e59b3-0302-46c6-b737-7e25294221b8`): varal de lâmpadas de festa no céu (fora de época), rosto do jogador de perfil em primeiro plano no segundo plano, e um servente despejando água nos copos enquanto a fala é 'não têm vinho'

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm torch and oil-lamp light at dusk under a deep blue sky, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a wedding feast in the courtyard of a stone house in the village of Cana of Galilee as an open game world. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks up a village lane lit by wall torches and through an open wooden gate into a crowded courtyard lit only by burning torches on the walls and small clay oil lamps on the tables, with nothing hanging overhead; guests dance in a circle clapping in rhythm, others recline at low tables. Hard cut. Shot 2 (last 4 seconds): the same camera, still about 4 metres behind him so that only his back is seen: his mother, a woman in her late forties with a blue-grey mantle over her hair, hurries up to him through the crowd with a worried face and points at the long table beside them, where every clay cup stands empty and a large wine jar lies overturned on its side, dry; two servants next to it spread their empty hands and shrug. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a festive crowd, rhythmic clapping, footsteps on stone. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1807 caracteres.

### `jo-cana-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `jo-cana-1` (`start_image`)
- HUD por cima: objetivo “Mande encher os vasos” · tecla [E] “Falar” · fala “Enchei estes vasos com água.” (João 2:7) · Vasos 6 de 6 no fim da missão
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm torch and oil-lamp light at dusk under a deep blue sky, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows behind him as he walks across the courtyard to six large carved stone water jars standing in a row against the wall and points at them; two servants run up with clay pitchers. Hard cut. Shot 2 (last 4 seconds): closer gameplay camera behind his shoulder, not moving forward: the two servants pour water from the pitchers into the jars again and again until the water brims at the top; exactly six jars stay in view the whole time. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: water pouring into stone jars, a festive crowd, clapping. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1349 caracteres.

### `jo-cana-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `jo-cana-2` (`start_image`)
- HUD por cima: objetivo “Mande servir o mestre de cerimônia” · fala “tu guardaste o bom vinho até agora” (João 2:10) · Vasos 6 de 6 no fim da missão
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm torch and oil-lamp light at dusk under a deep blue sky, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera behind his shoulder: a servant dips a wooden ladle into the first stone jar and lifts it out full of dark red wine, pours it into a clay cup and hurries away with it across the courtyard. Hard cut. Shot 2 (last 4 seconds): the gameplay camera stays behind the player character, who watches from beside the six jars as the servant reaches the master of the feast, an older man in a fine striped robe, who drinks, stares at the cup in astonishment and claps the young bridegroom on the shoulder; guests cheer and raise their cups. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: wine being poured, a cheering festive crowd, cups clinking. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1443 caracteres.

## A entrada em Jerusalém (Mateus 21:1–11)

Episódio `mt-entrada` · luz do episódio: “bright clear morning sunlight, dust in the air”

### `mt-entrada-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Mande buscar o jumentinho” · tecla [E] “Enviar” · fala “achareis uma jumenta amarrada, e um jumentinho com ela” (Mateus 21:2)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear morning sunlight, dust in the air, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the road over the Mount of Olives down to first-century Jerusalem as an open game world: olive groves, stone terraces, the walled city and the white-and-gold Temple across the valley. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks briskly along a dusty road to the edge of a small stone village with his disciples around him; two of them run ahead to a doorway where a grey donkey and her colt are tied. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as the two disciples lead the donkey and the colt back to him, lay their cloaks over the colt's back, and he mounts it. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: hooves on a dirt road, wind in olive trees, distant voices, birds. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1514 caracteres.

### `mt-entrada-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mt-entrada-1` (`start_image`)
- HUD por cima: objetivo “Desça o monte das Oliveiras” · fala “Hosana ao Filho de Davi!” (Mateus 21:9)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear morning sunlight, dust in the air, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he rides the small grey donkey down the stony road; a crowd runs alongside, laying cloaks on the road in front of the donkey and waving cut palm branches. Hard cut. Shot 2 (last 4 seconds): wider gameplay camera behind and above him: the road curves down the hillside between a cheering crowd on both sides, and the walled city with the Temple fills the view ahead across the valley. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a cheering crowd, hooves on stone, palm branches rustling. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1319 caracteres.

### `mt-entrada-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mt-entrada-2` (`start_image`)
- HUD por cima: objetivo “Entre em Jerusalém” · fala “toda a cidade se alvoroçou, perguntando: Quem é este?” (Mateus 21:10)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear morning sunlight, dust in the air, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows him as he rides through a massive stone city gate into a packed street; the crowd parts, palm branches wave, people lean from rooftops and stairways. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as he rides up the street toward the high walls of the Temple platform; people point at him and turn to one another; a flock of doves takes off from a roof. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a large noisy crowd echoing between stone walls, hooves on paving, doves' wings. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1297 caracteres.

## Lázaro, sai fora (João 11:38–44)

Episódio `jo-lazaro` · luz do episódio: “warm late-afternoon sunlight, long shadows”

### `jo-lazaro-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Vá até a sepultura” · fala “Tirai a pedra.” (João 11:39)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm late-afternoon sunlight, long shadows, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the village of Bethany and its rocky hillside tombs near first-century Jerusalem as an open game world. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks fast along a village path beside two women in dark mourning mantles; a group of mourners follows, some weeping. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as the path climbs a rocky slope to a cave tomb closed by a large round stone; he stops and points at it; four men brace their shoulders against the stone and roll it aside, dust falling. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: footsteps on gravel, quiet weeping, wind, stone grinding on stone. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1437 caracteres.

### `jo-lazaro-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `jo-lazaro-1` (`start_image`)
- HUD por cima: objetivo “Chame Lázaro” · tecla [E] “Clamar” · fala “Lázaro, sai fora.” (João 11:43)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm late-afternoon sunlight, long shadows, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera behind his shoulder as he steps in front of the open dark cave mouth and lifts his face to the sky for a moment; the crowd on both sides falls silent. Hard cut. Shot 2 (last 4 seconds): the same camera as he stretches out his right arm toward the darkness and calls out with all his strength; dust drifts out of the cave and, deep inside, a figure wrapped in pale linen starts to move toward the light. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: wind, a hushed crowd, a few gasps, gravel shifting. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1292 caracteres.

### `jo-lazaro-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `jo-lazaro-2` (`start_image`)
- HUD por cima: objetivo “Mande desatá-lo” · fala “Desatai-o, e deixai-o ir.” (João 11:44)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm late-afternoon sunlight, long shadows, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera stays behind him as a man wrapped from shoulders to feet in linen burial strips, his head and face covered by a cloth, shuffles out of the cave into the sunlight; the crowd staggers back. Hard cut. Shot 2 (last 4 seconds): the same camera as he gestures toward the man; two men run up and unwind the linen strips from his arms; the two women in dark mantles run to him and embrace him; people fall to their knees and raise their hands. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: gasps, crying turning to joyful shouts, cloth rustling, wind. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1333 caracteres.

## Cinco pães e dois peixes (Marcos 6:30–44)

Episódio `mc-paes` · luz do episódio: “golden late-afternoon sunlight”

### `mc-paes-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Receba os pães e os peixes” · fala “Quantos pães tendes? Ide ver.” (Marcos 6:38) · Cestos 0 de 12 no fim da missão
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, golden late-afternoon sunlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a green grassy hillside above the Sea of Galilee as an open game world, with a crowd of thousands. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks briskly up through a vast crowd of thousands of people sitting down in groups on the green grass; people turn toward him as he passes. Hard cut. Shot 2 (last 4 seconds): the same camera as a disciple hurries up to him and holds out a small wicker basket with five round flat loaves and two small fish; he takes the basket with both hands. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a very large crowd murmuring outdoors, wind in grass, footsteps, distant waves. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1410 caracteres.

### `mc-paes-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mc-paes-1` (`start_image`)
- HUD por cima: objetivo “Abençoe e parta os pães” · tecla [E] “Partir” · fala “levantou os olhos ao céu, abençoou, e partiu os pães” (Marcos 6:41) · Cestos 0 de 12 no fim da missão
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, golden late-afternoon sunlight, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera behind his shoulder as he lifts one round loaf in both hands and raises his face to the sky. Hard cut. Shot 2 (last 4 seconds): the same camera as he breaks the loaf and keeps handing pieces to his disciples, who stand around him holding large wicker baskets; the bread keeps coming and the baskets fill up. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: bread tearing, baskets creaking, a large crowd murmuring, wind. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1197 caracteres.

### `mc-paes-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mc-paes-2` (`start_image`)
- HUD por cima: objetivo “Sirva a multidão” · fala “Todos comeram e se saciaram.” (Marcos 6:42) · Cestos 12 de 12 no fim da missão
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, golden late-afternoon sunlight, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows behind him as he walks along the edge of the seated crowd while his disciples hand out bread and fish from full baskets; people eat and pass pieces along. Hard cut. Shot 2 (last 4 seconds): wider gameplay camera behind and above him: thousands of people eating on the grass down to the lake at sunset; beside him the disciples set down a row of twelve wicker baskets heaped with leftover pieces of bread. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a large contented crowd eating and talking, baskets set down on grass, evening birds. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1322 caracteres.

## O buraco no telhado (Marcos 2:1–12)

Episódio `mc-paralitico` · luz do episódio: “daylight streaming into a dim stone interior”

### `mc-paralitico-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Entre na casa cheia” · fala “descobriram o telhado onde ele estava, fizeram um buraco” (Marcos 2:4)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, daylight streaming into a dim stone interior, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a crowded black basalt-stone house in first-century Capernaum as an open game world. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 3 metres behind him as he makes his way through a tightly packed crowd at the doorway of a basalt house and steps into a dim room full of people sitting on mats. Hard cut. Shot 2 (last 4 seconds): the same camera behind him inside the room as dust and crumbs of clay start falling from the ceiling of beams and branches; everyone looks up; hands tear a hole in the roof and a shaft of sunlight pours in. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a crowded room murmuring, branches cracking, clay crumbling and falling, surprised murmurs. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1455 caracteres.

### `mc-paralitico-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mc-paralitico-1` (`start_image`)
- HUD por cima: objetivo “Fale ao paralítico” · tecla [E] “Falar” · fala “Filho, os teus pecados te são perdoados.” (Marcos 2:5)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, daylight streaming into a dim stone interior, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera behind his shoulder looks up as a paralysed man lying on a woven mat is lowered through the hole on four ropes, turning slowly in the shaft of sunlight; four faces look down from the roof. Hard cut. Shot 2 (last 4 seconds): the same camera as the mat settles on the floor at his feet; he bends toward the man and speaks to him; the crowd presses back against the basalt walls. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: ropes creaking, a hushed crowd, dust and small stones falling. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1277 caracteres.

### `mc-paralitico-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mc-paralitico-2` (`start_image`)
- HUD por cima: objetivo “Mande-o levantar” · fala “levanta-te, toma o teu leito, e vai para a tua casa” (Marcos 2:11)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, daylight streaming into a dim stone interior, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera behind his shoulder as he stretches out his hand; the man on the mat sits up, plants his feet and stands, staring at his own legs. Hard cut. Shot 2 (last 4 seconds): the same camera as the man rolls up the mat, tucks it under his arm and walks through the parting crowd out into the bright doorway; people raise their hands and the four men on the roof cheer. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: astonished shouts, a crowd praising, footsteps on a packed earth floor. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1271 caracteres.

## Zaqueu, desce (Lucas 19:1–10)

Episódio `lc-zaqueu` · luz do episódio: “bright midday sunlight”

### `lc-zaqueu-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Atravesse Jericó” · fala “subiu em uma árvore de frutos que parecem figos, para o ver” (Lucas 19:4)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright midday sunlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: first-century Jericho as an open game world: date palms, gardens, houses of stone and mud brick. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks briskly down a palm-lined street packed with people pressing around him on both sides. Hard cut. Shot 2 (last 4 seconds): the same camera as, ahead of him, a short man in fine embroidered robes runs along the edge of the crowd and scrambles up into a large sycomore fig tree that spreads over the street. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a pressing crowd, many footsteps, palm fronds in wind, leaves rustling. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1358 caracteres.

### `lc-zaqueu-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `lc-zaqueu-1` (`start_image`)
- HUD por cima: objetivo “Chame Zaqueu” · tecla [E] “Chamar” · fala “Zaqueu, apressa-te, e desce; porque hoje é necessário que eu fique em tua casa.” (Lucas 19:5)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright midday sunlight, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera behind him tilts up as he stops under the tree, raises his hand and calls to the short man clinging to a branch among the big leaves, who points at himself in disbelief. Hard cut. Shot 2 (last 4 seconds): the same camera as the short man scrambles down the trunk in a hurry, his fine robes catching on twigs, lands in front of him beaming and leads him by the arm through the muttering crowd toward a large house. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: leaves and branches rustling, a muttering crowd, feet landing on dust. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1300 caracteres.

### `lc-zaqueu-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `lc-zaqueu-2` (`start_image`)
- HUD por cima: objetivo “Fique na casa de Zaqueu” · fala “Hoje houve salvação nesta casa” (Lucas 19:9)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright midday sunlight, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows behind him into the courtyard of a wealthy house: a table laid for a meal, an open strongbox and leather money bags; the short man stands before him with open hands, speaking earnestly. Hard cut. Shot 2 (last 4 seconds): the same camera as the short man hands heavy money bags to servants, who carry them out through the gate to poor people waiting outside; he turns back wiping his eyes and the player character lays a hand on his shoulder. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: coins in leather bags, murmuring guests, footsteps on stone. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1326 caracteres.

## A fonte de Jacó (João 4:5–26)

Episódio `jo-samaritana` · luz do episódio: “harsh bright noon sunlight, short shadows”

### `jo-samaritana-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Descanse junto à fonte” · fala “Jesus, cansado do caminho, sentou-se assim junto à fonte” (João 4:6)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, harsh bright noon sunlight, short shadows, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a dusty road in the hill country of first-century Samaria as an open game world: a town on a slope, a tall bare mountain behind it, a stone well beside the road. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he walks along the dusty road in the noon heat while his disciples split off up a side road toward the town. Hard cut. Shot 2 (last 4 seconds): the same camera as he reaches a round stone-rimmed well, puts a hand on the rim and sits down on its edge, wiping his brow; from the town a lone woman with a clay water jar on her shoulder comes down the road toward the well. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: cicadas, hot wind, footsteps on dust, distant sheep bells. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1485 caracteres.

### `jo-samaritana-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `jo-samaritana-1` (`start_image`)
- HUD por cima: objetivo “Peça água” · tecla [E] “Pedir” · fala “Dá-me de beber.” (João 4:7)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, harsh bright noon sunlight, short shadows, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): gameplay camera behind his shoulder as he sits on the rim of the well; the woman, in a faded ochre and green mantle, stops across the well and looks at him with suspicion; he gestures at her jar. Hard cut. Shot 2 (last 4 seconds): the same camera as she lowers the jar into the well on a rope, hand over hand, pulls it up dripping and sets it on the rim, raising her eyebrows as she answers him. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: a rope running over stone, water dripping, cicadas, hot wind. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1272 caracteres.

### `jo-samaritana-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `jo-samaritana-2` (`start_image`)
- HUD por cima: objetivo “Fale da água viva” · fala “a água que eu lhe der se fará nele fonte de água, que salte para vida eterna” (João 4:14)
- Gerado: ainda não gerado

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, harsh bright noon sunlight, short shadows, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): close gameplay camera behind his shoulder as he speaks and points to the water; the woman's face changes from suspicion to wonder and she backs away from the well. Hard cut. Shot 2 (last 4 seconds): wider gameplay camera behind him: she leaves her full water jar standing beside the well and runs up the road toward the town, her mantle flying, passing his disciples who are coming back; people start coming out of the town down the road. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: running footsteps on dust, cicadas, hot wind, distant voices from the town. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1329 caracteres.
