---
name: grand-testament-adventure
description: "Padrão de produção dos reels Grand Testament Adventure (Jesus em missões, como gameplay de mundo aberto): cenas e prompts do Higgsfield, fila de takes, revisão, HUD, som, conferência, capa e legenda."
---

# Grand Testament Adventure: como os vídeos são feitos

"E se existisse um jogo com as missões da vida de Jesus?" Cada reel transforma uma passagem dos evangelhos em gameplay de
mundo aberto em terceira pessoa, na Galileia e na Judeia do século I. Este arquivo é o padrão de produção: qualquer agente
(Claude, Codex ou outro) que fizer um episódio novo segue estes passos, nesta ordem, e chega ao mesmo resultado.

- **Onde está tudo:** repositório `alexpiraginet-bot/biblia-conectada`, branch `claude/grand-testament-adventure`, pasta
  `estudos/biblia-grand-testament-adventure/`. Todos os comandos abaixo rodam de dentro dessa pasta.
- **Este arquivo é a fonte da verdade.** As seções entre `<!-- gerado:… -->` e `<!-- /gerado -->` saem do código
  (`python3 -I tools/prompts.py`) e não se editam à mão. Se uma cópia deste arquivo (numa skill da conta, por exemplo)
  divergir da do repositório, vale a do repositório.
- **Todos os prompts de todos os takes da fila**, exatamente como vão para o Higgsfield: `PROMPTS.md` (gerado pelo mesmo
  script).
- **Pedidos do Alex, decisões, entregas e o que deu errado, com data:** `PROJETO.md`.

## 0. Roteiro de um episódio novo

1. Escolha a passagem em `passagens.py` (as que já têm cena estão em `cenas.ORDEM`; `feito` quer dizer "não refazer").
2. Escreva as 3 missões do HUD em `episodios.py` (seção 8) e rode `python3 -I tools/check.py` até dar `ALL OK`.
3. Escreva os 3 takes em `cenas.py` (seção 5), ponha o episódio em `ORDEM`, rode `python3 -I tools/prompts.py` e leia
   os prompts montados em `PROMPTS.md`.
4. Gere na fila, um take por vez (seção 6), e revise cada take antes de pedir o próximo (seção 7).
5. Monte o reel com o HUD e o som (seção 9).
6. Confira com `tools/confere.py` e olhe as folhas de contato e a capa (seção 10).
7. Escreva a legenda (seção 11), entregue e registre (seção 12).

## 1. Antes de começar

1. Leia o `CLAUDE.md` da raiz do repositório (as regras do projeto valem aqui) e este arquivo inteiro. Depois
   `PROJETO.md`, `cenas.py`, `episodios.py` e `passagens.py`.
2. Fale com o Alex em PT-BR. Código, identificadores e mensagens de commit em inglês. Os prompts de vídeo são em inglês
   (todos os que funcionaram foram escritos assim). Texto na tela e legenda do post em PT-BR.
3. Ambiente: Python 3 com numpy, Pillow, scipy, soundfile e faster-whisper (`estudos/requirements.txt`); ffmpeg 6.1 ou
   mais novo com os filtros `drawtext`, `tile`, `ebur128`, `loudnorm` e `alimiter`. Rode todo script com `python3 -I`.
4. O pipeline lê, fora desta pasta (só leitura, não mexa): a BLIVRE em `fontes/blivre/porbr2018_vpl.zip`, o OpenBible em
   `fontes/openbible-geo/`, o relevo em `estudos/biblia-natal/data/terrain/` e as fontes tipográficas em
   `estudos/biblia-referencias/assets/fonts/`.
5. A geração é no Higgsfield, pelo conector (ferramentas `generate_video_batch`, `jobs_wait`, `media_upload`,
   `media_confirm`). Sem o conector, veja a seção 13.

## 2. Regras que não se negociam

**Conteúdo**
- Ele é sempre "o jogador" (*the player character*), visto de costas, inteiro, embaixo e no centro do quadro. Nenhum
  prompt escreve Jesus, Cristo, Deus (*God*) ou anjo: `python3 -I tools/prompts.py --check` reprova.
- Deus nunca é personagem: no máximo, luz. Anjo não aparece.
- Só adultos. Todo prompt termina com "No children." e todo take é conferido quadro a quadro (regra 8 do repositório:
  sem rostos de crianças).
- A Paixão é uma cena de corte reverente: a cruz carregada, vista de costas; as três cruzes só em silhueta, de longe;
  "No blood, no wounds, no close-up". Nenhum episódio mostra sangue ou ferida.
- Espíritos imundos (Legião) são fumaça escura, sem rosto e sem criatura; o homem é selvagem, mas nunca está ferido.
- No especial de hoje (Procurado), a polícia nunca saca arma e ninguém se fere. Templo e lugar de culto não podem
  parecer de outra religião (um take saiu com a torre esculpida de um templo hindu e foi descartado: virar mesas ali
  vira ataque a outra fé).
- Toda fala na tela é fragmento literal da Bíblia Livre (BLIVRE, CC BY 4.0 BR) do versículo citado; todo nome de lugar é
  o que a BLIVRE escreve; todo número (contador, distância, duração, medida) sai de código. Nada digitado de cabeça.
  Traduções protegidas (ACF, NVI, ARA, AA, NTLH, NAA…) nunca entram.
- Todo quadro leva "RECRIAÇÃO · IA", e a legenda diz que é um "e se" ou um conceito visual, não um jogo que existe.

**Marca**
- O jogo que inspira a série é de outra empresa: nem o logo, nem o letreiro, nem a sigla, nem o desenho do HUD dele,
  nem o nome em prompt. O visual é descrito ("third-person open-world action-adventure video game"). HUD, letreiro e
  cartão final são desenho próprio (`hud.py`).
- Na legenda, só "inspirado no GTA" mais a linha "Projeto independente, sem ligação com a Rockstar Games" (decisão do
  Alex em 13/11/2026). O risco de marca do título é decisão dele.

**Segredos e arquivos**
- Nada de chave, token ou `.env` no repositório nem em log. A URL de upload do Higgsfield (assinada) só vive num arquivo
  do scratchpad: nunca no repositório, nunca impressa.
- Mídia gerada não vai para o git (`.gitignore`): takes, quadros, descartes, renders `.mp4` e a folha de personagem.
  Vão para o git: código, `data/passagens.json`, `data/geracoes.json`, os documentos e as capas `renders/capa-*.jpg`.

## 3. O personagem

- **A folha:** job do Higgsfield `aab922bf-ea1c-485a-be3e-fea044f08fa5` (`gpt_image_2_6`, 11/11/2026), arquivo
  `source/ref/personagem.png` (fora do git), URL pública em `data/geracoes.json` → `referencia.personagem.url`. Em
  `cenas.py` ela é a constante `PERSONAGEM`.
- **O que ela mostra:** o mesmo homem três vezes, de corpo inteiro, sobre um fundo de estúdio cinza-escuro liso: de
  costas, de três quartos por trás e de perfil direito (o rosto só aparece no perfil). Cabelo castanho-escuro ondulado
  na altura dos ombros e barba curta; túnica bege de lã grossa até os tornozelos, mangas largas e curtas, barra
  empoeirada; cinto de corda com nó; manto terracota de franja sobre o ombro esquerdo, caindo pelas costas; sandálias de
  tiras de couro marrom.
- **Como usar:** `"medias": [{"role": "image_references", "value": "aab922bf-ea1c-485a-be3e-fea044f08fa5"}]`, na mesma
  conta do Higgsfield. Em outra conta, baixe a URL do manifesto, suba a imagem (seção 6, passo 7, com
  `content_type` `image/png`) e troque `PERSONAGEM` em `cenas.py` pelo media id novo.
- **O pedido da folha:** o texto original de 11/11 não ficou registrado. Refazer a folha muda o rosto da série, então
  só com pedido explícito do Alex. Nesse caso, use o fluxo de folha de personagem do Higgsfield
  (`get_workflow_instructions` com `{"workflow": "character-sheet"}`), parta deste pedido, que é uma reconstrução feita
  a partir da imagem (não é o original), e confira o resultado contra a descrição acima:

  ```text
  Character turnaround sheet of a third-person video game character: the same first-century Galilean man shown three times, full body, side by side on a plain dark grey studio background: back view, three-quarter back view, right profile. Dark brown wavy shoulder-length hair and a short beard; a beige coarse hand-woven wool tunic to the ankles with short wide sleeves and a dusty hem; a knotted rope belt; a terracotta-red fringed wool mantle over the left shoulder, draped down the back; brown leather strap sandals. Photorealistic game character model, even neutral light, no text, no logos.
  ```

## 4. Os formatos

### 4.1 Episódio de uma passagem (3 missões, até 30 s)
- Uma passagem, 3 missões, 3 takes de 8 s gerados direto em vídeo. Cada take tem 2 planos com um corte seco no meio:
  algo muda a cada ~4 s.
- Quadro 0: a pergunta da série, o título e a referência, já com o HUD inteiro (cartão de abertura até 2,2 s, sem
  fade-in).
- Em cada missão: a linha de missão (nossa, falada ao jogador: "Chame Simão e André"), a tecla [E] quando há uma ação, a
  fala da passagem como legenda (literal da BLIVRE, com a referência), o contador do que o texto conta (discípulos,
  vasos, cestos) e, no fim, o visto.
- Radar no canto com relevo e água reais, os lugares do OpenBible com o nome da BLIVRE, rota, destino e seguidores;
  barra de progresso das missões; placa do lugar com as coordenadas ("≈" quando o ponto é aproximado).
- Ritmo: os takes rodam a 1,1x por padrão; uma missão, ou um plano dela, pode ter ritmo próprio, de 0,8x a 2x
  (`tools/check.py` confere). Plano parado demais roda mais rápido (chamar Pedro: 1,5x).
- Fim: "MISSÃO CONCLUÍDA", o título, "RECRIAÇÃO · referência" e os créditos das fontes, por 2,6 s. Quando o desfecho
  está nos últimos segundos do take, `pausa` congela o último quadro embaixo do cartão, com um avanço lento de 3%.
- Duração máxima pedida pelo Alex: 30 s. As durações entregues estão na seção 15.

### 4.2 Especial "A jornada" (7 missões, até 50 s)
- 7 takes, um por lugar, cada um partindo da folha (`novo`), 2 planos cada. O Alex pediu "50s total": `confere.py`
  aceita até 50,5 s só neste.
- A jogabilidade é desenhada por `jornada.py`: a tecla [E] aparece, acende quando é "apertada" e a fala entra com ela;
  contador de discípulos (2 nos pescadores, 12 na ceia, Lc 22:14) e de sinais; faixas de região e de capítulo
  ("GALILEIA", "FASE FINAL", "TERCEIRO DIA"); o mapa de viagem rápida cobre o corte entre os pães e Jerusalém, com a
  distância em linha reta medida das coordenadas; a fase final é cena de corte (faixas pretas de 190 px, sem HUD) que
  termina no preto, e o HUD volta no monte da Galileia.
- Uma missão pode ser montada com planos de gerações diferentes (seção 7.4). Tudo do episódio está na seção 17.

### 4.3 Especial "Procurado" (3 partes de 3 takes, ele numa cidade de hoje)
- Cada sinal sobe o nível de procura, como os evangelhos contam (Mc 3:6, Mc 11:18, Jo 8:6, Jo 11:53, Jo 11:57); com 5
  estrelas, ele vai ao encontro das luzes (Jo 18:4–6). Ele mantém a túnica; todos os outros vestem roupa de hoje
  (`POVO_HOJE`); cidade e mapa são fictícios (`CIDADE`; o radar é semeado em `procurado.py`, o mesmo nas 3 partes).
- HUD próprio: 5 estrelas ao lado do radar (pop e sirene curta quando ganha uma, piscando em 5), cartões ("12 HORAS
  ANTES"), escolha entre duas teclas ("Fugir" / "Ir ao encontro").
- `python3 -I procurado.py procurado-1` (e `--still`, `--check`, `--map`, `--legenda`).

### 4.4 Compilado
- `compilado.py` corta trechos dos reels entregues (cada um com seu HUD, legenda e marca) sob uma frase do Alex numa
  caixa branca (`renders/compilado-mae.mp4`).

## 5. Escrever as cenas (os prompts)

### 5.1 Como o prompt é montado
<!-- gerado:blocos -->
O prompt de cada take sai de `cenas.pedido` (código exato):

```python
def pedido(ep, k, primeiro, video=False):
    """The prompt of mission k (1-3) of an episode. primeiro = it starts from the character sheet only; video = it
    continues the previous take, given as a video reference next to the character sheet; otherwise it starts from the
    last frame of the previous take."""
    e = CENAS[ep]; m = e["missoes"][k - 1]
    primeiro = primeiro or bool(m.get("novo"))               # novo: a new place, so it starts from the character sheet too
    hero = m.get("heroi_ref", HEROI_REF) if (primeiro or video) else m.get("heroi", HEROI_QUADRO)
    return (JOGO.format(luz=m.get("luz", e["luz"])) + (CONTINUA if video else "") + hero + (m.get("mundo", "") + " " if m.get("mundo") else "")
            + DOIS.format(a=m["a"], b=m["b"]) + FIM.format(som=m["som"], povo=m.get("povo", e.get("povo", POVO))))
```

Os blocos, palavra por palavra (`cenas.py`):

**`JOGO`**: sempre, no começo; `{luz}` é a luz da missão ou a do episódio.

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, {luz}, smooth frame rate, player-controlled camera.
```

**`HEROI_REF`**: missão que parte da folha de personagem (a 1ª do episódio, ou `novo`); a missão pode trocar por `heroi_ref`.

```text
The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals.
```

**`HEROI_QUADRO`**: missão que parte do último quadro do take anterior; a missão pode trocar por `heroi`.

```text
The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame.
```

**`DOIS`**: sempre: os dois planos `a` e `b` da missão.

```text
Two shots with one hard cut. Shot 1 (first 4 seconds): {a} Hard cut. Shot 2 (last 4 seconds): {b}
```

**`FIM`**: sempre, no fim: `{povo}` e `{som}` da missão.

```text
{povo} No children. Ambient sound only: {som}. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

**`POVO`**: o `{povo}` padrão.

```text
All people are Middle Eastern adults in first-century tunics, mantles and head coverings.
```

**`POVO_UNICO`**: o `{povo}` de cena com gente perto dele (A jornada, missões 2 a 7).

```text
All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red.
```

**`POVO_HOJE`**: o `{povo}` do especial de hoje (Procurado).

```text
Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic and mantle.
```

**`CIDADE`**: o `mundo` da cidade de hoje (Procurado).

```text
Setting: a modern sunny coastal city of today as an open game world: wide avenues, palm trees, glass towers, a beach promenade, traffic, buses, people everywhere with phones; on its edge, a park of old olive trees.
```

**`POLICIA`**: como os carros de polícia são descritos (Procurado).

```text
police cars with flashing red and blue lights and no lettering
```

**`GALILEIA`**: o `mundo` da 1ª missão de A jornada.

```text
Setting: the hills and shore of the Sea of Galilee in the first century as a vast open game world: fishing villages of black basalt houses, terraced fields, olive groves, a dirt road along the lake, wooden fishing boats on the water.
```

**`CONTINUA`**: NÃO USAR: emenda com o take anterior como referência de vídeo (recomeçou da praia e vestiu outro como ele).

```text
Continue the same gameplay session as the reference video: the same place, the same people, the same weather and light, the same look of the game.
```

O pedido que `tools/fila.py prox` escreve (o `requests` de `generate_video_batch`), na missão que parte da folha e na que continua:

```json
[
 {
  "index": 0,
  "params": {
   "model": "seedance_2_0",
   "aspect_ratio": "9:16",
   "duration": 8,
   "resolution": "720p",
   "mode": "std",
   "generate_audio": true,
   "use_unlim": true,
   "medias": [
    {
     "role": "image_references",
     "value": "aab922bf-ea1c-485a-be3e-fea044f08fa5"
    }
   ],
   "prompt": "<pedido(ep, 1, True)>"
  }
 }
]
```

```json
[
 {
  "index": 0,
  "params": {
   "model": "seedance_2_0",
   "aspect_ratio": "9:16",
   "duration": 8,
   "resolution": "720p",
   "mode": "std",
   "generate_audio": true,
   "use_unlim": true,
   "medias": [
    {
     "role": "start_image",
     "value": "<media id do último quadro do take anterior>"
    }
   ],
   "prompt": "<pedido(ep, k, False)>"
  }
 }
]
```

O último quadro é o nº 191 (o take tem 193; esse é o último limpo).
<!-- /gerado -->

### 5.2 Os campos de uma cena (`cenas.py` → `CENAS`)

| Campo | O quê |
|---|---|
| `luz` (do episódio ou da missão) | a luz do take; entra no `JOGO` |
| `mundo` | o cenário ("Setting: …"), dito na 1ª missão e quando o lugar muda |
| `a`, `b` | os dois planos de ~4 s: câmera, ação, o que muda |
| `som` | o ambiente do take, em sons concretos; multidão sempre "without clear words" |
| `heroi` | onde ele está no 1º quadro quando o take anterior não terminou com ele de costas, embaixo e no centro (troca o `HEROI_QUADRO`) |
| `heroi_ref` | troca o `HEROI_REF` quando ele não pode aparecer num dos planos (túmulo vazio, as três cruzes) |
| `novo` | lugar novo: a missão parte da folha, não do último quadro |
| `povo` (do episódio ou da missão) | troca o `POVO` por `POVO_UNICO` ou `POVO_HOJE` |

`ORDEM` é a fila de geração: um episódio só entra na fila quando está nela.

### 5.3 Regras de redação (cada uma veio de um take que deu errado)
1. **Gameplay, direto em vídeo.** O 1º piloto (quadro-chave pintado e depois animado) saiu lento e com cara de
   ilustração; pedido como captura de gameplay em 2 planos, passou a ter o movimento da referência do Alex (medidas no
   `PROJETO.md`).
2. **Câmera atrás dele em todo plano**, com a distância: "the gameplay camera follows about 4 metres behind him" (ou
   3). No plano b, repita: "the same gameplay camera behind him", "still about 4 metres behind him so that only his back
   is seen", "still behind his shoulder". Nunca "eye level": trouxe o rosto dele de perfil.
3. **Ninguém parecido com ele.** Descreva os outros pelo cabelo e pela roupa, diferentes dos dele ("short-haired bearded
   men in plain brown and grey tunics without mantles"). Com gente perto dele, use `POVO_UNICO`. Mesmo assim o modelo
   pôs sósias em 4 das 7 missões de A jornada: confira sempre e monte com outro take quando preciso (7.4).
4. **Quem é curado ou chamado tem cara própria:** o paralítico virou "an older bald man with a short grey beard"; Pedro,
   "a sturdy fisherman with short curly hair and a short beard, wearing a dark brown sleeveless work tunic and no
   mantle"; no Procurado, o homem da mão definhada veio de jaqueta jeans, perto da câmera.
5. **Quantidade que o texto conta** (seis vasos, doze cestos): câmera parada no plano que mostra. Com a câmera
   avançando, a fileira de vasos de Caná crescia. Conte no take.
6. **Festa à noite:** diga de onde vem a luz ("lit only by burning torches on the walls and small clay oil lamps on the
   tables, with nothing hanging overhead"); sem isso vem varal de lâmpadas. A falta de vinho se mostra parada ("every
   clay cup stands empty and a large wine jar lies overturned on its side, dry"), sem verbo de despejar.
7. **Lugar novo:** `novo=True` e um `mundo` novo (a missão parte da folha). Mesmo lugar: a missão parte do último
   quadro e não repete o `mundo`.
8. **Continuação sempre pelo último quadro** (`start_image`). Dar o take anterior como referência de vídeo
   (`CONTINUA`, `fila.py emenda video`) recomeçou da praia e vestiu o pescador com a roupa dele.
9. **Primeiro quadro:** se o take anterior acabou por cima do ombro dele, escreva `heroi` dizendo onde ele está ("the
   man at the right edge of the first frame, seen from behind his shoulder … his face is never shown").
10. **Rosto dele só em cena de corte combinada** (Procurado, ele rezando no jardim); o take seguinte volta para trás
    dele.
11. **Termine o take em algo que continue:** o último quadro vira o primeiro da missão seguinte.
12. **Ninguém fala.** O take não pode ter voz (o Whisper reprova no fim) e a palavra está na legenda. No Procurado 3 o
    pedido diz "um passo" em vez de "fala uma palavra".
13. **Som só de ambiente, concreto:** "waves, splashing water, gulls, footsteps on pebbles".
14. **Paixão e ressurreição:** como nas missões 6 e 7 de A jornada (seção 17): a cruz carregada vista de costas,
    soldados com as lanças em pé, "No blood, no wounds visible"; as cruzes "in black silhouette … Seen only from far away
    and in silhouette: no blood, no wounds, no close-up of the crosses"; `heroi_ref` diz em que plano ele não está.
15. **Templo e culto:** descreva a arquitetura e proíba o resto, como o Procurado 1 faz: "long colonnades of plain cream
    limestone columns, like the porches of an ancient Roman-era temple … no towers, no domes, no statues, no carved
    figures, no religious symbols anywhere".
16. **Polícia:** `POLICIA` ("no lettering") e "No weapons drawn."; segurança "unarmed".
17. **Nada escrito no quadro:** o `FIM` pede "no HUD, no user interface, no text, no subtitles". Tudo o que é interface
    é nosso e entra depois.

### 5.4 Antes de pedir
- [ ] `python3 -I tools/check.py` termina em `ALL OK`.
- [ ] `python3 -I tools/prompts.py` regenera `PROMPTS.md`; `python3 -I tools/prompts.py --check` termina em `ok`.
- [ ] O prompt montado foi lido em `PROMPTS.md`: câmera atrás dele nos dois planos, os outros diferentes dele, as
      quantidades, a luz, o som.

## 6. Gerar no Higgsfield (a fila)

A série é feita em fila, um take de cada vez, na ordem de `ORDEM`: cada missão parte do último quadro da anterior, e na
janela grátis a conta só rodava um vídeo por vez.
O estado fica em `data/.fila.json` (fora do git); o manifesto que vai para o git é `data/geracoes.json`. A chave de um
take é `<episódio>-<missão>` (ex.: `jo-cana-2`).

1. `python3 -I tools/fila.py prox` imprime o próximo pedido, já no formato do `requests` de `generate_video_batch`, ou
   o que falta antes dele.
2. **Créditos.** O `"use_unlim": true` que o `fila.py` escreve era da janela grátis da conta, que acabou (a data está
   no `PROMPTS.md`). Fora dela, esse pedido é recusado sem cobrança. Para gerar com créditos, peça antes o preço com
   `estimate_video_cost`, mostre ao Alex e só depois do OK dele mande o mesmo pedido com `"use_unlim": false`. Não
   tire o campo para "ver o que acontece": sem ele, quem decide a forma de pagar é o servidor.
3. Mande o pedido com `generate_video_batch` e anote o job: `python3 -I tools/fila.py job <chave> <job_id>`.
4. **Espere.** Um take levou de 4,5 a 7 min de manhã e até 16 min à tarde. Deixe um timer em segundo plano (por exemplo
   `sleep 420`) e só depois chame `jobs_wait` (timeout de até 15 s). Não reenvie um pedido sem saber o que houve com o
   anterior: um timeout não quer dizer que ele falhou.
5. **Baixe:** `python3 -I tools/fila.py ok <chave> <url>` baixa o take para `source/takes/<chave>.mp4` e salva o último
   quadro limpo (nº 191) em `source/frames/<chave>-fim.png`.
6. **Revise** (seção 7) antes de qualquer outro passo. Se recusar: `python3 -I tools/fila.py falhou <chave>`; mova o
   arquivo para `source/descartados/<chave>-<motivo>.mp4`; registre em `descartados` do `data/.fila.json`, com a chave
   igual ao nome do arquivo e o valor `{"job": …, "url": …, "motivo": …}`; ajuste a cena em `cenas.py`; volte ao passo 1.
7. **Aprovado, e a missão seguinte continua dele:** suba o último quadro. `media_upload` com `filename`
   `<chave>-fim.png` e `content_type` `image/png` devolve a URL de upload, o comando curl e o media id. Grave a URL num
   arquivo do scratchpad, faça o PUT de `source/frames/<chave>-fim.png` com o comando que a ferramenta devolveu, confira
   o HTTP 200 e chame `media_confirm` com o `media_id` e `type: "image"`. Então
   `python3 -I tools/fila.py fim <chave> <media_id>`.
8. Repita até o episódio ter todos os takes. `python3 -I tools/fila.py estado` mostra o que existe.

## 7. Revisar cada take (antes de montar)

### 7.1 Olhar
- **Folha de contato do take inteiro**, 3 quadros por segundo, com o tempo de cada quadro (24 quadros num take de 8 s):
  ```bash
  K=mc-pescadores-2   # a chave do take
  F=../biblia-referencias/assets/fonts/SpaceMono-Bold.ttf
  ffmpeg -v error -y -i source/takes/$K.mp4 -vf "fps=3,scale=270:480,drawtext=fontfile=$F:text='%{pts\:hms}':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7,tile=8x3" -frames:v 1 "$SCRATCH/folha-$K.jpg"
  ```
  (`$SCRATCH` é o scratchpad da sessão: nada disso vai para o repositório.)
- **Quadro em tamanho cheio** onde houver dúvida (rosto, mãos, contagem):
  `ffmpeg -v error -y -ss 5.5 -i source/takes/$K.mp4 -frames:v 1 "$SCRATCH/q.png"`.
- **O corte:** `python3 -I -c "import sys; sys.path.insert(0, '.'); import hud; print(hud.cut_times('source/takes/$K.mp4'))"`.
  O normal é um corte perto de 4 s. Corte é a mudança de quadro maior que 18 e maior que 3 vezes a mediana em volta.

### 7.2 Reprova (peça de novo)
- criança ou adolescente em qualquer quadro;
- outro homem parecido com ele (cabelo comprido e barba, túnica clara ou manto vermelho): o erro mais comum;
- o rosto dele de frente ou de perfil fora de uma cena de corte combinada;
- quantidade contra o texto (vasos, discípulos, cestos);
- sangue, ferida, violência, arma sacada;
- interface, legenda ou logotipo no quadro;
- coisa fora da época (varal de lâmpadas de festa);
- símbolo ou prédio de outra religião;
- ação que contradiz a fala (servente despejando enquanto a fala é "Não têm vinho"; jarro pingando);
- o take recomeça em outro lugar em vez de continuar o anterior.

### 7.3 Aceita e ajusta na montagem
- Plano parado demais: `ritmo` só daquele plano (até 2x; o Procurado usou 20x para pular uma transformação de 0,13 s).
- Sem corte seco (fusão, ou um plano só): o meio da fusão vira o corte (`corte`, em segundos, nos especiais) ou a
  mudança natural de luz (a porta do túmulo acendendo); a fala pode entrar num segundo do take (`fala_de`).
- Desfecho nos últimos segundos: `pausa`.

### 7.4 Montar com planos de gerações diferentes
Quando o modelo repete o erro, a missão pode ser feita de pedaços de dois takes (`montagem` em `jornada.py`):
`[(arquivo, primeiro quadro, quadro final[, aproximação])]`, com quadros exatos e 8 ms de fade no som da emenda. A
aproximação recorta em direção ao centro de baixo, onde o jogador está, para tirar alguém da borda (a ceia a 1,6x). O
take de onde saiu o plano fica em `source/descartados/` e em `descartados`, com o motivo e os quadros usados.

## 8. Os dados do episódio (o que o HUD mostra)

1. `passagens.py`: a passagem (`id`, `ref` em OSIS, `titulo`, `fala`, `lugar` literal, `geo` do OpenBible, `geo_nota`
   quando o ponto é aproximado). Os nomes no mapa vêm de `NOMES` (também literais da BLIVRE).
2. `episodios.py`: as 3 missões (tabela abaixo) e, por episódio, `raio_km`, `ritmo`, `fim`, `pausa`, `contador` (com a
   `prova`: a lista de nomes que o texto soma, ou o versículo com a palavra do número), `resumo` (a história em palavras
   nossas para a legenda, com `{fala1}`…`{fala3}` e `{total}`, nunca com número digitado) e `pergunta`.
3. `python3 -I tools/check.py` confere tudo contra a BLIVRE e o OpenBible e grava `data/passagens.json`, que é o que o
   HUD lê. Tem que terminar em `ALL OK`.

| Campo da missão | O quê |
|---|---|
| `take` | `<episódio>-<k>.mp4` em `source/takes/` |
| `objetivo` | a linha de missão: nossa, no imperativo, falada ao jogador |
| `fala` | `("Livro.cap.vers", "fragmento literal da BLIVRE")` ou `None` |
| `rumo` | direção do jogador no radar, em graus a partir do norte |
| `acao` | o texto da tecla [E] |
| `vel` | velocidade no radar (1 anda, 0 parado) |
| `conta` | quanto do contador está cheio no fim da missão |
| `seguidores` | quantos o seguem no radar |
| `fala_de`, `fala_ate` | quando a legenda entra e sai: um segundo, `"corte"` ou `"corte2"` |
| `da_margem` | só na 1ª missão: no radar ele atravessa a água desde a margem atrás dele |
| `ritmo` | um número ou uma lista `(até, velocidade)`, com `até` = segundo, `"corte"`, `"corte2"` ou `None` (o fim) |

## 9. Montar (HUD e som)

1. Antes do vídeo inteiro, confira quadros soltos: `python3 -I hud.py <episódio> --still 0.5,4,10,20`
   (→ `renders/.hud/<episódio>-<t>.jpg`) e `python3 -I hud.py <episódio> --map` (o mundo do radar). Olhe cada imagem.
2. `python3 -I hud.py <episódio>` → `renders/<episódio>.mp4` e `renders/.hud/<episódio>-tempos.json`. Os especiais:
   `python3 -I jornada.py` e `python3 -I procurado.py procurado-N`.

### 9.1 O quadro
<!-- gerado:medidas -->
- Quadro final: 1080×1920, 24 fps. Cada take dura 8 s, chega em 720p e é ampliado para 1080×1920 com lanczos e `unsharp=5:5:0.4`.
- Caixa segura do Reels: x 90–990, y 260–1660 (tudo que importa fica dentro dela).
- Radar: 300×300 px com o canto superior esquerdo em (90, 1290); a barra de progresso fica embaixo dele e a placa do lugar à direita.
- Cores: creme (255, 248, 236), ouro (255, 207, 115), tinta (58, 40, 24), escuro (14, 16, 14), céu (seguidores) (132, 196, 255).
- Abertura da série (2 linhas, ouro): “E SE EXISTISSE UM JOGO COM AS / MISSÕES DA VIDA DE JESUS?”.
- Tipos: Space Grotesk (missão, títulos, legenda), Space Mono (letreiro, rótulos, números), Cormorant itálico (nomes no mapa); arquivos em `../biblia-referencias/assets/fonts/`.
<!-- /gerado -->
- Topo: o letreiro "GRAND TESTAMENT ADVENTURE" à esquerda e "RECRIAÇÃO · IA" à direita. Logo abaixo, dentro da caixa
  segura: "MISSÃO k DE n" em ouro e a linha de missão numa caixa escura com filete dourado (losango enquanto vale; visto
  e contorno dourado quando cumprida); embaixo dela, o contador (rótulo e bolinhas).
- Legenda: Space Grotesk 46, branca, entre aspas, até 860 px de largura, quebrada com `wrap_even` (nenhuma palavra
  sozinha na última linha), base em y 1236; a referência embaixo, em Space Mono, ouro.
- Tecla: caixa creme com "E" e o texto da ação (y 1010; em A jornada, y 940, e a tecla fica dourada quando é
  "apertada").
- Título em duas linhas quebra onde a linha mais longa fica mais curta ("PESCADORES / DE GENTE").
- Escurecimento suave no topo e embaixo, e sombra em todo texto, para ler sobre qualquer imagem.

### 9.2 O tempo dentro da missão (`hud.timing`)
- Tecla de 0,2 a 1,15 s. Legenda de 1,0 s até 0,3 s antes do fim da missão (ou `fala_de`/`fala_ate`); na missão 1,
  nunca antes de o cartão de abertura sair (2,2 s). A legenda fica pelo menos 1,6 s: o script para se não ficar.
- Visto 0,8 s antes do fim da missão; o segmento da barra enche só na missão dele.
- Cartão final: entra `fim` segundos antes do fim (2,6 s) e escurece o quadro pela metade.

### 9.3 O som
- O ambiente dos próprios takes, no ritmo de cada missão (`atempo` por trecho, 8 ms de fade em cada emenda), 40 ms de
  entrada e 60 ms de saída por missão. O último quadro parado leva o fim do ambiente tocado de trás para frente. O
  ambiente é nivelado com `loudnorm` (I −20, TP −3).
- Sons da interface, sintetizados no próprio script: baque grave na abertura e em cada missão nova; tique de 1.480 Hz
  na tecla; 660 Hz na legenda; duas notas (880 e 1.318,5 Hz) no visto; acorde de ré maior com baque no "missão
  concluída". A jornada soma duas notas no contador, uma varredura na viagem rápida, um estrondo na fase final e três
  notas no terceiro dia.
- Final: ganho até −14 LUFS, limitador e AAC a 192 kbit/s, repetindo até −14 ±0,3 LUFS com pico real ≤ −1 dBTP. Nos
  episódios, o teto do limitador é 0,78 (−2,2 dBFS); nos especiais, o limitador trabalha a 192 kHz e o teto se ajusta
  (a 48 kHz uma montagem mediu −0,8 dBTP). Sem trilha: a música, se houver, entra no app.
- Vídeo: x264 `slow`, CRF 18, teto de 9,5 Mbit/s. Em A jornada (50 s), um master quase sem perda e depois duas passadas
  na taxa que cabe em 28 MB.

## 10. Conferir (antes de entregar)

`python3 -I tools/confere.py <episódio> [--capa 1.0]` mede o arquivo que vai ser entregue e falha alto se algo passar do
limite:
- 1080×1920, 24 fps; até 30 s (A jornada, até 50,5 s); até 29 MB;
- −14 ±0,3 LUFS e pico real ≤ −1 dBTP, medidos no AAC;
- nenhuma fala ouvida pelo Whisper com o detector de voz (os takes são só ambiente);
- nenhum estalo nas emendas do som (salto maior que 6 vezes o normal em volta);
- o arquivo tem os quadros que o `hud.py` montou.

Imprime também os cortes e a mudança mediana por quadro (absoluta e relativa à luz: cena noturna mede menos para o
mesmo movimento). Gera as folhas de contato com a caixa segura (`renders/.hud/<episódio>-folha-N.jpg`, um quadro por
segundo) e a capa (`renders/capa-<episódio>.jpg`, o quadro de `--capa` segundos, com o cartão de abertura). Tem que
terminar em `LIMITES OK`. Depois, olhe você mesmo:
- todas as folhas: gancho legível no quadro 0, missão e legenda dentro da caixa segura, nenhuma criança, nenhum sósia, o
  contador batendo com o texto, o cartão final;
- a capa (mude `--capa` se outro quadro contar melhor; no Procurado 3 foi 1,8 s).

Ninguém ouviu os reels até hoje: o som foi conferido por medida. Se você puder ouvir, ouça e diga.

## 11. A legenda do post

- Episódio de uma passagem: `python3 -I tools/legenda.py` → `LEGENDAS.md` (todo episódio que tem `resumo`). A ordem:
  a pergunta da série sozinha na 1ª linha, "MISSÃO: TÍTULO (referência)", as missões com ✅, o resumo com as falas
  literais, a pergunta ao público, a chamada para a próxima passagem, compartilhar, salvar e ler o capítulo, os
  créditos e as hashtags. O exemplo inteiro está na seção 16.
- A jornada: `python3 -I jornada.py --legenda` (o jogo aberto em construção, o link do jogo e o do código, a chamada
  para jogar e colaborar; seção 17). Procurado: `python3 -I procurado.py --legenda`.
- Limites do Instagram: até 2.200 caracteres contados como ele conta (emoji vale 2), primeira linha de até 125 (o que
  aparece antes do "mais"), até 30 hashtags. `jornada.py --legenda` confere sozinho; nas outras, confira.
- Nunca "sorteio". Nenhum número digitado: duração, contagens e referências saem dos dados.
- Créditos: no vídeo, o cartão final traz todos (texto, lugares, relevo, imagens geradas por IA). Na legenda, no
  mínimo "Recriação feita com IA", "Texto: Bíblia Livre (CC BY 4.0 BR)" e "Lugares: OpenBible.info"; o
  `tools/legenda.py` põe também as licenças e o relevo (SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Mapzen).

## 12. Entregar e registrar

1. Mande ao Alex o `renders/<episódio>.mp4` e a capa, com a legenda no texto da resposta, pronta para colar. Entregue
   cada reel assim que ele passar no `confere.py` (pedido do Alex: "já com capa e legenda").
2. `python3 -I tools/fila.py entregue <episódio> "<quando e como>"` e `python3 -I tools/fila.py publicar` (copia o
   estado para `data/geracoes.json`).
3. `python3 -I tools/prompts.py` (atualiza `PROMPTS.md` e as seções geradas daqui).
4. Uma entrada no `PROJETO.md`: o pedido do Alex com data e hora, o que foi entregue com as medidas do `confere.py`, o
   que a recriação mostra e o texto não diz.
5. Commit em inglês (título no imperativo, corpo com causa → correção) e push na branch
   `claude/grand-testament-adventure`. Mídia não entra.
6. A resposta ao Alex, em PT-BR, em 4 campos: O que mudou · Como verifiquei · Riscos / não verificado · Próximo passo.

## 13. Em outro agente, ou sem o conector

- **Codex ou outro agente com o repositório:** os mesmos comandos; leia antes o `AGENTS.md` e o `CLAUDE.md` da raiz.
  Onde este arquivo cita uma ferramenta do Higgsfield, use a equivalente que tiver.
- **Pelo site do Higgsfield, à mão:** modelo Seedance 2.0, 720p, 9:16, 8 s, áudio ligado. Missão 1 (ou `novo`): imagem
  de referência = `source/ref/personagem.png`. Missão seguinte: imagem inicial = `source/frames/<chave anterior>-fim.png`.
  Cole o prompt exato do `PROMPTS.md`. Com o resultado, siga com `fila.py job` e `fila.py ok` (o `ok` baixa a URL que o
  site der). Se só tiver o arquivo, ponha-o em `source/takes/<chave>.mp4` e extraia o último quadro como o `fila.py`
  faz: `ffmpeg -v error -y -i source/takes/<chave>.mp4 -vf "select='eq(n,191)'" -frames:v 1 source/frames/<chave>-fim.png`.
- **Outro modelo de vídeo:** só com o OK do Alex. O visual da série é o do `seedance_2_0`; trocar de modelo muda a cara
  dos episódios. O Genie 4 (Google) foi pesquisado em 19/11/2026 e espera a escolha do Alex (Project Genie, no plano AI
  Ultra, ou a API paga do Gemini): não use antes disso.

## 14. O que já deu errado (não repetir)

- Quadro-chave pintado e depois animado: lento e com cara de ilustração (1º piloto).
- Câmera "eye level": o rosto dele de perfil.
- Take anterior como referência de vídeo: recomeçou da praia e vestiu o pescador como ele.
- Câmera avançando sobre os seis vasos: mais vasos a cada segundo.
- Festa à noite sem a fonte da luz: varal de lâmpadas. Verbo de despejar: servente despejando enquanto a fala é "Não
  têm vinho".
- Gente perto dele sem `POVO_UNICO`: dois ou três dele na cena (a ceia clássica com dois, os pães com três iguais, o
  curado com o rosto dele).
- Templo sem a arquitetura dita: torre de templo hindu.
- Cartão final cobrindo o desfecho: daí a `pausa`.
- Barra de progresso enchendo o segmento da missão seguinte: corrigido no `hud.py`. Quando o HUD muda, monte de novo os
  reels já entregues que ele afeta e avise o Alex.
- Limitador a 48 kHz: pico real acima de −1 dBTP.
- Palavra sozinha na última linha da legenda: `wrap_even`.
- Contorno do Natural Earth errando a margem do mar da Galileia (Cafarnaum caía na água): a água sai do modelo de
  elevação; mapa que chega ao litoral pinta o Mediterrâneo à parte (`with_sea` em `jornada.py`).
- Fila mais lenta à tarde: planeje o dia com isso.

## 15. A fila hoje (gerado)
<!-- gerado:fila -->
| Episódio | Takes gerados | Reel |
|---|---|---|
| `mc-pescadores` · Pescadores de gente (Marcos 1:16–20) | 3 de 3 | conferido, 21,88 s |
| `mt-aguas` · Andando sobre o mar (Mateus 14:22–33) | 3 de 3 | conferido, 22,67 s |
| `mc-legiao` · Legião (Marcos 5:1–20) | 3 de 3 | conferido, 22,08 s |
| `procurado-1` · Procurado, parte 1 de 3 (especial: ele numa cidade de hoje) | 3 de 3 | conferido, 23,38 s |
| `procurado-2` · Procurado, parte 2 de 3 (especial: ele numa cidade de hoje) | 3 de 3 | conferido, 23,38 s |
| `procurado-3` · Procurado, parte 3 de 3 (especial: ele numa cidade de hoje) | 3 de 3 | conferido, 24,79 s |
| `jornada` · A jornada (os quatro evangelhos, 7 missões) | 7 de 7 | conferido, 50,08 s |
| `jo-cana` · Água feita vinho (João 2:1–11) | 1 de 3 | — |
| `mt-entrada` · A entrada em Jerusalém (Mateus 21:1–11) | 0 de 3 | — |
| `jo-lazaro` · Lázaro, sai fora (João 11:38–44) | 0 de 3 | — |
| `mc-paes` · Cinco pães e dois peixes (Marcos 6:30–44) | 0 de 3 | — |
| `mc-paralitico` · O buraco no telhado (Marcos 2:1–12) | 0 de 3 | — |
| `lc-zaqueu` · Zaqueu, desce (Lucas 19:1–10) | 0 de 3 | — |
| `jo-samaritana` · A fonte de Jacó (João 4:5–26) | 0 de 3 | — |
<!-- /gerado -->

## 16. Exemplo completo: Pescadores de gente (gerado)
<!-- gerado:pescadores -->
Passagem: Pescadores de gente (Marcos 1:16–20). Placa do lugar: “mar da Galileia” (Mc 1:16, como a BLIVRE escreve); ponto do radar: `Capernaum` no OpenBible (32,88° N · 35,58° L; nota de `passagens.py`: “Mc 1:21: da praia eles entram em Cafarnaum”). Raio do radar 9 km; ritmo 1,1x; contador “Discípulos” até 4 (a soma dos nomes que o texto lista, `contador.prova` em `episodios.py`: Simão (Marcos 1:16), André (Marcos 1:16), Tiago (Marcos 1:19), João (Marcos 1:19)).

| Missão | Objetivo | Tecla | Fala (BLIVRE) | Contador | Rumo |
|---|---|---|---|---|---|
| 1 | Desça até a praia | — | nenhuma | 0 de 4 | 255° |
| 2 | Chame Simão e André | Chamar | “Vinde após mim, e farei serdes pescadores de gente.” (Marcos 1:17) | 2 de 4 | 255° |
| 3 | Chame Tiago e João | Chamar | “eles deixaram o seu pai Zebedeu no barco com os empregados, foram após ele.” (Marcos 1:20) | 4 de 4 | 75° |

#### `mc-pescadores-1` · missão 1 de 3

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Desça até a praia” · Discípulos 0 de 4 no fim da missão
- Gerado: job `b8c205eb-382f-424f-91df-c11fcae4cba8`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear late-morning daylight, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the first-century fishing village of Capernaum on the Sea of Galilee as an open game world. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he strides briskly down a village street toward the lake; the camera swings slightly left and right as if steered with a thumbstick; low black basalt houses, awnings, market stalls with fish and bread; villagers step aside and turn their heads, chickens scatter, a donkey cart rolls past. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him as he comes out onto the pebble beach between wooden fishing boats and drying nets and heads toward two fishermen standing knee-deep in the water casting a round throw net; the net spreads in the air and splashes down. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: village chatter without clear words, chickens, cart wheels, footsteps, then waves and gulls. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1674 caracteres.

#### `mc-pescadores-2` · missão 2 de 3

- Começa de: último quadro (nº 191) do take `mc-pescadores-1` (`start_image`); o que foi usado: media `4cec6672-60f2-43de-ac72-9c877f189078`
- HUD por cima: objetivo “Chame Simão e André” · tecla [E] “Chamar” · fala “Vinde após mim, e farei serdes pescadores de gente.” (Marcos 1:17) · Discípulos 2 de 4 no fim da missão
- Gerado: job `d6940fcd-9edf-451c-9a5a-9ac6ffca8589`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear late-morning daylight, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 3 metres behind him as he walks briskly across the pebble beach to the water's edge and stops in front of two fishermen who stand knee-deep in the shallow water hauling a round throw net; he raises his right arm and beckons them. Hard cut. Shot 2 (last 4 seconds): gameplay camera slightly to his right side, still behind his shoulder: the two fishermen look at him, drop the wet net into the water and wade quickly out of the lake toward him, splashing, and stop beside him on the beach. Wooden fishing boats, nets, turquoise lake, hills beyond. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: waves, splashing water, gulls, footsteps on pebbles. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1464 caracteres.

#### `mc-pescadores-3` · missão 3 de 3

- Começa de: último quadro (nº 191) do take `mc-pescadores-2` (`start_image`); o que foi usado: media `42226b57-3818-47dd-91ff-ff3eb6a27dd5`
- HUD por cima: objetivo “Chame Tiago e João” · tecla [E] “Chamar” · fala “eles deixaram o seu pai Zebedeu no barco com os empregados, foram após ele.” (Marcos 1:20) · Discípulos 4 de 4 no fim da missão · 2 seguidores no radar
- Gerado: job `52e737b6-e3f9-4717-a742-a986e3c46813`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, bright clear late-morning daylight, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the lower centre of the frame. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 4 metres behind him as he strides along the pebble beach with the two fishermen walking right behind him, toward a second wooden boat pulled half onto the shore where two young men and an old man sit mending nets; he raises his right arm and calls to them. Hard cut. Shot 2 (last 4 seconds): the same camera behind him as the two young men put down the nets, jump over the side of the boat into the shallows and run to join him; the old man stays sitting in the boat with two hired workers, watching them go; the group of five walks on along the shore toward the black basalt village. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: footsteps on pebbles, waves, splashing, gulls. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1496 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/mc-pescadores.mp4`: 525 quadros (21,875 s), 27,16 MB, -14,2 LUFS, pico real -1,8 dBTP, cortes em 3,58 s, 10,67 s, 14,58 s, mudança mediana por quadro 7,46 (8,9% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-mc-pescadores.jpg`. Entregue: 2026-11-11: de manhã (arquivo das 09:49) e de novo à tarde, com a barra de progresso corrigida (arquivo fechado às 14:23), ao Alex no chat.

A legenda do post (`tools/legenda.py` → `LEGENDAS.md`):

```
E se existisse um jogo com as missões da vida de Jesus? 🎮

MISSÃO: PESCADORES DE GENTE (Marcos 1:16–20)

✅ Desça até a praia
✅ Chame Simão e André
✅ Chame Tiago e João

Ele desce até a praia de Cafarnaum e chama Simão e André: “Vinde após mim, e farei serdes pescadores de gente.” Eles largam a rede na hora. Mais adiante, Tiago e João deixam o pai no barco e vão atrás.

4 discípulos. Missão concluída.

👇 Você largaria a rede na hora? Responde aqui.
🎯 Qual passagem tem que virar a próxima missão? Comenta a referência.
🔁 Manda pra quem zeraria esse jogo
💾 Salva e lê Marcos 1 hoje

Recriação feita com IA: é um “e se”, não um jogo que existe · Texto: Bíblia Livre (CC BY 4.0 BR) · Lugares do mapa: OpenBible.info (CC BY 4.0) · Relevo: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Mapzen

#jesus #biblia #evangelho #gameplay #games #mundoaberto #cristao #fe #jovemcristao #esefosseumjogo
```
<!-- /gerado -->

## 17. Exemplo completo: A jornada, ele nas missões até o terceiro dia (gerado)
<!-- gerado:jornada -->
Gancho: “A MAIOR MISSÃO DA HISTÓRIA / EM {s} SEGUNDOS DE GAMEPLAY” (`{s}` é a duração medida do reel); título “A jornada”; ritmo 1,15x; último quadro parado 1,3 s; cartão final 2,3 s com “ele vive” (Lucas 24:23).

| Missão | O que o HUD mostra | Take montado de |
|---|---|---|
| 1 | objetivo “Chame os pescadores” (a partir do corte) · tecla [E] “Chamar” (plano b) · fala (plano b) “Vinde após mim, e eu vos farei pescadores de gente.” (Mateus 4:19) · faixa “GALILEIA” / “Jesus rodeava toda a Galileia” (Mateus 4:23) · Discípulos 2 de 12 (plano b) | o take inteiro |
| 2 | objetivo “Faça os primeiros sinais” · tecla [E] “Encher os vasos” (plano a) · tecla [E] “Curar” (plano b) · fala (plano a) “Enchei estes vasos com água.” (João 2:7) · fala (plano b) “levanta-te, toma o teu leito” (Marcos 2:11) · conta 2 sinais no contador de sinais | quadros 0–78 de `jornada-2-sosias.mp4`; quadros 88–192 de `jornada-2.mp4` |
| 3 | objetivo “Atravesse o mar” · tecla [E] “Acalmar” (plano a) · tecla [E] “Andar sobre o mar” (plano b) · fala (plano a) “Cala-te, aquieta-te!” (Marcos 4:39) · fala (plano b) “Tende coragem! Sou eu, não tenhais medo.” (Mateus 14:27) · conta 2 sinais no contador de sinais | quadros 0–97 de `jornada-3-barco.mp4`; quadros 98–192 de `jornada-3.mp4` |
| 4 | objetivo (plano a) “Alimente a multidão” / objetivo (plano b) “Entre em Jerusalém” · tecla [E] “Repartir” (plano a) · fala (plano a) “Todos comeram e se saciaram.” (Marcos 6:42) · fala (plano b) “Hosana ao Filho de Davi!” (Mateus 21:9) · conta 1 sinal no contador de sinais · mapa de viagem rápida no corte | quadros 0–103 de `jornada-4.mp4`; quadros 75–192 de `jornada-4-tres-iguais.mp4` |
| 5 | objetivo (plano a) “Celebre a ceia” / objetivo (plano b) “Ore no jardim” · tecla [E] “Partir o pão” (plano a) · tecla [E] “Orar” (plano b) · fala (plano a) “Isto é o meu corpo” (Lucas 22:19) · fala (plano b) “não se faça minha vontade, mas a tua.” (Lucas 22:42) · Discípulos 12 de 12 (plano a) | quadros 0–49 de `jornada-5.mp4` (aproximado 1,6x); quadros 78–192 de `jornada-5-dois-na-ceia.mp4` |
| 6 | fala (plano a) “E levando ele sua cruz” (João 19:17) · fala (plano b) “Está consumado” (João 19:30) · faixa “FASE FINAL” / “REDENÇÃO” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a, b | o take inteiro |
| 7 | objetivo “Vá à Galileia” (a partir do corte) · fala (plano a) “Ele não está aqui, pois já ressuscitou” (Mateus 28:6) · fala (plano b) “eu estou convosco todos os dias, até o fim dos tempos.” (Mateus 28:20) · faixa “TERCEIRO DIA” / “RESSURREIÇÃO” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a · 11 seguidores no radar | o take inteiro |

#### `jornada-1` · missão 1 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`)
- HUD por cima: objetivo “Chame os pescadores” (a partir do corte) · tecla [E] “Chamar” (plano b) · fala (plano b) “Vinde após mim, e eu vos farei pescadores de gente.” (Mateus 4:19) · faixa “GALILEIA” / “Jesus rodeava toda a Galileia” (Mateus 4:23) · Discípulos 2 de 12 (plano b)
- Gerado: job `979f3db5-671d-4294-9da3-1641556b9752`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, golden sunrise light over the lake, morning mist, vivid natural colours, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: the hills and shore of the Sea of Galilee in the first century as a vast open game world: fishing villages of black basalt houses, terraced fields, olive groves, a dirt road along the lake, wooden fishing boats on the water. Two shots with one hard cut. Shot 1 (first 4 seconds): a high gameplay camera swoops down from above the lake and the hills like an open-world region reveal and settles about 4 metres behind him as he walks along the lakeside road at sunrise; villagers with donkeys and baskets pass by, smoke rises from the village ahead. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him on the pebble beach as he raises his right arm and beckons two fishermen standing in a wooden boat near the shore; they drop their net into the water, jump into the shallows and wade toward him. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: morning birds, waves on pebbles, distant village sounds, splashing water. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1700 caracteres.

#### `jornada-2` · missão 2 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Faça os primeiros sinais” · tecla [E] “Encher os vasos” (plano a) · tecla [E] “Curar” (plano b) · fala (plano a) “Enchei estes vasos com água.” (João 2:7) · fala (plano b) “levanta-te, toma o teu leito” (Marcos 2:11) · conta 2 sinais no contador de sinais
- Gerado: job `a0db99a1-db09-4285-89ed-0613539113f7` (usado no take montado da missão 2 = jornada-2-sosias (job 2aba6e6f) quadros 0-78 + este take (job a0db99a1) quadros 88-192, ver `jornada.py`)
- Descartado (job `2aba6e6f-8146-4029-ab77-79fc687ba184`): no plano da casa em Cafarnaum, um homem no meio da multidão saiu de cabelo comprido, barba e manto vermelho como o jogador, e o paralítico curado com o mesmo rosto: três 'Jesus' na cena; e um homem em pé numa tábua pendurada nas cordas. Caná ficou boa (guardada aqui, se a nova falhar); o plano de Caná (quadros 0 a 78) foi aproveitado no take montado da missão 2 (jornada.py, montagem), porque o Caná do 2º pedido veio com dezenas de jarros e um homem de manto avermelhado à mesa

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm golden afternoon sunlight, soft dust in the air, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: first-century villages of Galilee: a wedding courtyard in Cana, then a crowded stone house in Capernaum. Two shots with one hard cut. Shot 1 (first 4 seconds): the gameplay camera follows about 3 metres behind him as he walks between the tables of a wedding feast to six large stone water jars; servants pour water into them, and as he stops beside them the water in the nearest jar turns deep red wine, glinting in the light. Hard cut. Shot 2 (last 4 seconds): inside a crowded stone house, light falling through a hole in the roof where two ropes still hang: the same gameplay camera behind him as he stretches out his hand toward an older bald man with a short grey beard lying on a straw mat on the floor; the old man gets up, rolls up the mat, lifts it onto his shoulder and walks, and the crowd steps back in astonishment. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: wedding chatter without clear words, water pouring, then a crowded room murmuring, gasps. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1788 caracteres.

#### `jornada-3` · missão 3 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Atravesse o mar” · tecla [E] “Acalmar” (plano a) · tecla [E] “Andar sobre o mar” (plano b) · fala (plano a) “Cala-te, aquieta-te!” (Marcos 4:39) · fala (plano b) “Tende coragem! Sou eu, não tenhais medo.” (Mateus 14:27) · conta 2 sinais no contador de sinais
- Gerado: job `68f0444a-1dcd-4a9a-9547-339118099b74` (usado no take montado da missão 3 = jornada-3-barco (job c4252c4a) quadros 0-97 + este take (job 68f0444a) quadros 98-192, ver `jornada.py`)
- Descartado (job `c4252c4a-d355-43cc-8361-46866867065b`): no andar sobre o mar, ele sai de um píer de madeira e, no barco, um homem de cabelo comprido, barba e manto vermelho como o dele (pedido feito antes da regra de um manto vermelho só). A tempestade (do início ao corte em 4,083 s: ele de pé na proa, o braço erguido, o mar acalmando) ficou boa e fica guardada aqui para a montagem; a tempestade (quadros 0 a 97) foi usada no take montado da missão 3

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, night storm, lightning flashes, dark blue moonlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a wooden fishing boat on the Sea of Galilee at night. Two shots with one hard cut. Shot 1 (first 4 seconds): a violent storm, waves breaking over the side, his companions bailing water in panic; the gameplay camera stays about 3 metres behind him as he stands up at the stern and stretches out his arm over the waves, and the wind and the waves die down at once into a calm, glassy lake. Hard cut. Shot 2 (last 4 seconds): later, calm water under the moon, far from any shore: the same gameplay camera behind him as he walks on the surface of the lake toward the fishing boat, ripples spreading under each step; his companions in the boat, short-haired men in plain brown tunics, stare at him in fear. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: howling wind, crashing waves, thunder, then a sudden calm, gentle lapping water. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1651 caracteres.

#### `jornada-4` · missão 4 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo (plano a) “Alimente a multidão” / objetivo (plano b) “Entre em Jerusalém” · tecla [E] “Repartir” (plano a) · fala (plano a) “Todos comeram e se saciaram.” (Marcos 6:42) · fala (plano b) “Hosana ao Filho de Davi!” (Mateus 21:9) · conta 1 sinal no contador de sinais · mapa de viagem rápida no corte
- Gerado: job `a9ca8f87-b036-4185-996d-0c3374105a9c` (usado no take montado da missão 4 = este take (job a9ca8f87) quadros 0-103 + jornada-4-tres-iguais (job ab987bae) quadros 75-192, ver `jornada.py`)
- Descartado (job `ab987bae-8fce-433d-9616-f36a9d63a27a`): no plano dos pães, três homens iguais ao jogador (cabelo comprido, barba, túnica clara e manto vermelho) de frente para a câmera, passando cestos; a câmera não fica atrás dele. A entrada em Jerusalém (do corte em 3,125 s ao fim) ficou boa e fica guardada aqui para a montagem, se o novo pedido não trouxer uma melhor; a entrada (quadros 75 a 192) foi usada no take montado da missão 4

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm golden sunlight, long soft shadows, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: a green hillside above the Sea of Galilee, then the road up to a stone gate of Jerusalem. Two shots with one hard cut. Shot 1 (first 4 seconds): a huge crowd sits in groups on the green grass; the gameplay camera stays about 3 metres behind him, only his back visible, as he walks between the groups holding a basket of bread against his chest and hands loaves to the seated people; baskets passing from hand to hand through the crowd keep filling with bread and fish; his companions are short-haired men in plain brown tunics without mantles. Hard cut. Shot 2 (last 4 seconds): the same gameplay camera behind him as he rides a grey donkey up the road to the city gate while a large crowd waves palm branches and spreads cloaks on the road in front of him. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: a huge crowd murmuring, wind in the grass, then a cheering crowd without clear words, hooves on stone. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1717 caracteres.

#### `jornada-5` · missão 5 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo (plano a) “Celebre a ceia” / objetivo (plano b) “Ore no jardim” · tecla [E] “Partir o pão” (plano a) · tecla [E] “Orar” (plano b) · fala (plano a) “Isto é o meu corpo” (Lucas 22:19) · fala (plano b) “não se faça minha vontade, mas a tua.” (Lucas 22:42) · Discípulos 12 de 12 (plano a)
- Gerado: job `c6dbe30b-6b47-4402-813c-a4cb57a5d7bc` (usado no take montado da missão 5 = este take (job c6dbe30b) quadros 0-49, aproximados 1,6x para tirar da imagem o fundo da mesa (lá sentou de novo um homem vestido como ele) + jornada-5-dois-na-ceia (job 40c5e051) quadros 78-192, ver `jornada.py`)
- Descartado (job `40c5e051-ad44-4124-8d84-f836d45af5cb`): na ceia, a câmera fica atrás de um homem de manto vermelho e, do outro lado da mesa, de frente, outro homem igual ao jogador parte o pão (a ceia clássica, com dois dele). O Getsêmani (do corte em 3,25 s ao fim: ajoelhado na pedra, três dormindo, as tochas chegando junto ao muro) ficou bom e fica guardado aqui para a montagem; o Getsêmani (quadros 78 a 192) foi usado no take montado da missão 5

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, warm oil-lamp light at night, then cold moonlight, smooth frame rate, player-controlled camera. The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals. Setting: Jerusalem at night: an upper room, then a garden of old olive trees outside the walls. Two shots with one hard cut. Shot 1 (first 4 seconds): an upper room lit by oil lamps: the gameplay camera is just behind him, only his back and shoulders visible in the lower centre of the frame, as he sits at the near side of a low table and breaks a round loaf of bread in two with both hands raised in front of him; around the table, facing him, sit his twelve companions, short-haired bearded men in plain brown and grey tunics without mantles; nobody sits at the far side of the table straight across from him. Hard cut. Shot 2 (last 4 seconds): a garden of old olive trees under the moon: the same gameplay camera behind him as he kneels alone on a rock and prays, his head bowed; in the distance three of his companions sleep under the trees, and the torches of a crowd come up the hill. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: crackling oil lamps, a quiet room, then crickets, wind in the olive leaves, distant footsteps. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1844 caracteres.

#### `jornada-6` · missão 6 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: fala (plano a) “E levando ele sua cruz” (João 19:17) · fala (plano b) “Está consumado” (João 19:30) · faixa “FASE FINAL” / “REDENÇÃO” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a, b
- Gerado: job `5ab427c2-0f2b-4375-9c5d-d13305a5a434`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, overcast grey light that darkens into a black stormy sky at midday, smooth frame rate, player-controlled camera. The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle, leather sandals. In shot 1 he is seen from behind in the lower centre of the frame. In shot 2 he is not among the people on the ground. Setting: Jerusalem and a bare rocky hill outside its walls. Two shots with one hard cut. Shot 1 (first 4 seconds): a narrow stone street: the gameplay camera follows about 4 metres behind him as he slowly carries a heavy wooden cross on his shoulder up the street, Roman soldiers walking beside him with spears held upright, women weeping along the walls. No blood, no wounds visible. Hard cut. Shot 2 (last 4 seconds): the camera stays far behind a small group of mourning women and one bearded man standing still at the foot of the hill, looking up at three crosses in black silhouette against dark clouds; the wind blows dust. Seen only from far away and in silhouette: no blood, no wounds, no close-up of the crosses. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: a murmuring crowd, slow footsteps, armour clinking, then wind, distant thunder and silence. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1690 caracteres.

#### `jornada-7` · missão 7 de 7

- Começa de: folha de personagem (`image_references` = `aab922bf-ea1c-485a-be3e-fea044f08fa5`) · lugar novo (`novo`)
- HUD por cima: objetivo “Vá à Galileia” (a partir do corte) · fala (plano a) “Ele não está aqui, pois já ressuscitou” (Mateus 28:6) · fala (plano b) “eu estou convosco todos os dias, até o fim dos tempos.” (Mateus 28:20) · faixa “TERCEIRO DIA” / “RESSURREIÇÃO” · cena de corte (faixas pretas, sem HUD) no(s) plano(s) a · 11 seguidores no radar
- Gerado: job `f0f1a5a7-abf5-42a6-bead-82de617757c5`

```text
Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, detailed game character models, sharp textures, real-time shadows, the first golden light of dawn, soft mist, smooth frame rate, player-controlled camera. The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle, leather sandals. In shot 1 he is not in the frame: the tomb is empty. In shot 2 he is seen from behind in the lower centre of the frame. Setting: a garden with a tomb cut into the rock outside Jerusalem, then a hilltop in Galilee. Two shots with one hard cut. Shot 1 (first 4 seconds): three women carrying jars of spices walk up the garden path at dawn; the gameplay camera stays about 4 metres behind them as they stop in front of the tomb, whose large round stone has been rolled away; warm light pours out of the empty opening onto the folded linen cloths inside. Hard cut. Shot 2 (last 4 seconds): the top of a green hill above the Sea of Galilee at sunrise: he stands in the light, seen from behind, with his arms open, while his eleven companions, short-haired bearded men in plain brown and grey tunics without mantles, kneel and stand around him, the valleys and the lake glowing gold below. All people are Middle Eastern adults in first-century tunics, mantles and head coverings. Apart from the player character, no man has long hair and nobody wears red. No children. Ambient sound only: dawn birds, soft wind, footsteps on gravel, then wind over the hilltop. No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.
```

1688 caracteres.

Medido por `tools/confere.py` no arquivo entregue: `renders/jornada.mp4`: 1202 quadros (50,083 s), 27,88 MB, -14,1 LUFS, pico real -1,5 dBTP, cortes em 4,12 s, 7,54 s, 10,17 s, 13,67 s, 13,88 s, 16,92 s, 20,08 s, 22,96 s, 27,21 s, 29,67 s, 33,83 s, 37,38 s, mudança mediana por quadro 4,21 (5,8% da luz), fala ouvida pelo Whisper: nenhuma; capa `renders/capa-jornada.jpg`. Entregue: 13/11 ~10:15, com capa (quadro de 1,0 s) e legenda (LEGENDAS-JORNADA.md).

A legenda do post (`python3 -I jornada.py --legenda` → `LEGENDAS-JORNADA.md`):

```
Estamos construindo um jogo inspirado no GTA com a história de Cristo. E você pode jogar e construir junto com a gente 🎮

Esse vídeo é o conceito visual do projeto: é aonde a gente quer chegar. O jogo ainda não está nesse nível, mas já está no ar, em desenvolvimento, começando pela primeira missão, “Pescadores de gente” (Marcos 1:16–20), na beira do mar da Galileia.

O código é aberto e a gente vem construindo com a ajuda de quem quiser somar. Desenvolvedor ou não, você joga no navegador e, enquanto joga, pode dar opinião, sugerir melhorias e mandar passagens e citações pela área Colabore, dentro do jogo. E vai aprendendo junto, como a gente tem aprendido jogando.

🎮 Jogue e participe (link na bio):
grand-testament-adventure-lexprojects.vercel.app

💻 Código aberto, pra quem é dev:
github.com/alexpiraginet-bot/-grand-testament-adventure

No vídeo, 7 missões em 50 segundos, com as palavras dos evangelhos:

1. Chame os pescadores: “Vinde após mim, e eu vos farei pescadores de gente.” (Mateus 4:19)
2. Faça os primeiros sinais: “Enchei estes vasos com água.” (João 2:7) “levanta-te, toma o teu leito” (Marcos 2:11)
3. Atravesse o mar: “Cala-te, aquieta-te!” (Marcos 4:39) “Tende coragem! Sou eu, não tenhais medo.” (Mateus 14:27)
4. Alimente a multidão / Entre em Jerusalém: “Todos comeram e se saciaram.” (Marcos 6:42) “Hosana ao Filho de Davi!” (Mateus 21:9)
5. Celebre a ceia / Ore no jardim: “Isto é o meu corpo” (Lucas 22:19) “não se faça minha vontade, mas a tua.” (Lucas 22:42)
6. Fase final: “E levando ele sua cruz” (João 19:17) “Está consumado” (João 19:30)
7. Terceiro dia: “Ele não está aqui, pois já ressuscitou” (Mateus 28:6) “eu estou convosco todos os dias, até o fim dos tempos.” (Mateus 28:20)

“…que disseram que ele vive.” (Lucas 24:23)

👇 Qual missão você quer jogar depois dos pescadores? Comenta aí.
🔁 Manda pra quem tá contando os dias pro dia 19

Recriação feita com IA: o vídeo é um conceito visual · Projeto independente, sem ligação com a Rockstar Games · Texto: Bíblia Livre (CC BY 4.0 BR) · Lugares: OpenBible.info

#jesus #biblia #gameplay #mundoaberto #galileia #ressurreicao #games #gamedev #codigoaberto #cristao #fe
```
<!-- /gerado -->
