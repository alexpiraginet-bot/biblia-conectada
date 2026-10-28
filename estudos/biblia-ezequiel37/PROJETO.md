# "Ossos secos, rio da vida" — vídeo 10 (28/10/2026)

Pedido do Alex (28/10, 07:42): um Reel de outro pregador sobre Ezequiel 37, "Consegue fazer esse vídeo em versão animada
com desenhos padrão (Bíblia project)". Depois: "Desenhos simples e animados com cores vivas". Ele escolheu roteiro nosso,
~60 s, ilustrações pela API da OpenAI (a chave da skill `gpt-image`, que ele vai apagar depois) e narração por TTS. Na
voz: "ash, porém com entonação mais arrepiante e que passe verdade e amor" e, depois do primeiro teste, "tá muito
robotizado ainda".

## Por que roteiro nosso
O vídeo enviado é um sermão de outra pessoa (2:43). Sermão é obra protegida (Lei 9.610/98, art. 7º, II: "as conferências,
alocuções, sermões e outras obras da mesma natureza"). Ideia não é (art. 8º, I). Por isso nada dele entra: nem áudio,
nem imagem, nem as frases. A passagem, a ordem do texto bíblico e as ligações são da Bíblia e da base aberta. O vídeo dele
não está no repositório.

## História (o roteiro está em `script.py`)
Gancho no quadro 0: "Por acaso viverão estes ossos?" (Ez 37:3) sobre o vale cheio de ossos. Ezequiel 37 na régua da
Bíblia (capítulo 839 de 1.189). O profeta responde, profetiza; tremor, os ossos voam e se encaixam, nervos, carne, pele,
mas sem espírito (o povo fica cinza). O sopro vem dos quatro ventos e o povo ganha cor: "viveram". O sopro liga Ezequiel a
Gênesis 2:7 e a João 20:22. No capítulo 47 a água sai do templo e sobe (tornozelos, joelhos, cintura) até ele nadar. O rio
liga a João 7:38 e a Apocalipse 22:1, o último capítulo da Bíblia. A água cobre o vale. Chamada: "Comenta qual versículo
a gente liga no próximo vídeo."

| Ligação (base OpenBible.info) | Votos | Onde aparece |
|---|---|---|
| Ezequiel 37:5 ↔ Gênesis 2:7 | 12 | o sopro de vida |
| Ezequiel 37:9 ↔ João 20:22 | 10 | Jesus sopra sobre os discípulos |
| Ezequiel 47:1 ↔ João 7:38 | 50 | rios de água viva |
| Ezequiel 47:1 ↔ Apocalipse 22:1 | 36 | o rio da água da vida |

Também na tela: Ezequiel 37 se liga a 477 versículos fora do capítulo (602 pares) e Ezequiel 47:1 a 29. Todos esses
números saem de `tools/analyze.py` (`data/stats.json`) e `tools/check.py` confere que a tela usa os mesmos.
**Ezequiel 37 → 47 não é ligação na base** (0 pares): o vídeo só anda na régua ("No capítulo quarenta e sete"), nunca
chama isso de ligação.

## Visual (desenhos simples, cores vivas, animados)
- **Ilustrações** (`motion/public/img/`): 10 imagens geradas em 28/10 com `gpt-image-2.5-flare` (API da OpenAI). Prompts,
  estilo e referências em `source/img/ez37_assets.json` e `source/img/style_prompt.py`; os PNG brutos ficam fora do git.
  Estilo: desenho plano, contorno azul-marinho, cores saturadas. Personagens com fundo transparente (Ezequiel em três
  poses, o povo, o homem de barro) para animar em camadas; o primeiro fundo (o vale) é a referência de estilo dos outros.
  Só adultos (sem rosto de criança). Toda cena ilustrada leva a marca "ILUSTRAÇÃO"; a legenda diz que ilustrações e
  narração são geradas por IA.
- **Animado em código** (Remotion 4.0.532, `motion/src/Main.tsx`): os ossos são desenhados e voam até formar cinco
  esqueletos; nervos e carne se desenham por cima; o povo entra em cinza e ganha cor no "entrou"; os quatro ventos e o
  sopro são traços que correm; a água sobe palavra por palavra com uma régua de nível ao lado do profeta; a correnteza
  do templo e do rio da vida corre; os arcos são os pares reais de Ez 37 e Ez 47:1, com cor por distância (como no
  vídeo 1) e o ouro só na ligação que acende. Câmera lenta em todas as cenas; tremor no "tremor".
- Mapas e régua no céu noturno da série; legenda queimada palavra a palavra, citações em serifa com a referência.
- Fontes OFL: Figtree (a do site), Newsreader e Space Mono (`motion/public/fonts/`).

## Pipeline
```bash
python3 -I tools/analyze.py      # data/stats.json (+ asserts: citações = BLIVRE, 37 -> 47 sem ligação, 10 capítulos)
python3 -I tools/prep_img.py     # source/img/*.png -> motion/public/img (fundos 1080x1920, personagens recortados)
OPENAI_API_KEY=... python3 -I narration.py --voice ash --engine gpt-audio-1.5   # renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py  # motion/src/data.json
cd motion && npm ci && node render.mjs --still 0,30 && node render.mjs && cd ..   # renders/.film/video.mp4
python3 score.py                 # trilha + efeitos + voz -> renders/.film/mix.wav
python3 finalize.py              # -14 LUFS / TP <= -1 dBTP no AAC, <= 29 MB -> renders/ossos-secos-rio-da-vida.mp4
python3 -I tools/check.py        # dito = mostrado = dados = BLIVRE
```

## Som
- **Trilha** (`score.py`, instrumentos do vídeo 1 em `sound.py` + uma corda dedilhada): ré menor no vale (drone, vento
  do deserto), ré maior no "entrou" (a terça de Picardia da série), arpejo leve dali em diante. Efeitos com causa na tela:
  ossos batendo enquanto se encaixam, tremor, os quatro ventos, três respingos na água subindo, sinos nas ligações.
