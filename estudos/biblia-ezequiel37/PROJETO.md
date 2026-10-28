# "Do vale ao rio" — vídeo 10 (28/10/2026)

Pedido do Alex (28/10, 07:42): um Reel de outro pregador sobre Ezequiel 37, "Consegue fazer esse vídeo em versão animada
com desenhos padrão (Bíblia project)". Depois: "Desenhos simples e animados com cores vivas". Escolhas dele: roteiro
nosso, ~60 s, ilustrações pela API da OpenAI (com a chave da skill `gpt-image`, que ele vai apagar depois) e narração por
TTS.

**Versão 2 (10:11):** "seguir mais no vinculado à pregação… o vale de ossos, estar no vale, o deserto, momentos que a
gente precisa passar, e que depois Deus colocou Ezequiel numa posição de um rio tão transbordante, no capítulo 47… não
exatamente igual, a gente pode recriar, mas não se preocupando em fazer as conexões". E "retratar Deus como um personagem
não fez sentido… uma luz no céu, talvez. Jesus, sim, foi um humano". A versão 1 (ligações Gn 2:7, Jo 20:22, Jo 7:38,
Ap 22:1 com votos) está no commit c46563b.

## Por que roteiro nosso
O vídeo enviado é um sermão de outra pessoa (2:43). Sermão é obra protegida (Lei 9.610/98, art. 7º, II: "as conferências,
alocuções, sermões e outras obras da mesma natureza"); ideia não é (art. 8º, I). Nada dele entra: nem áudio, nem imagem,
nem as frases. A mensagem (vale e deserto como passagem; o rio do capítulo 47) é contada com texto nosso e com o texto
bíblico da BLIVRE. O vídeo dele não está no repositório.

## História (`script.py`, 14 falas)
Às 10:38 o Alex achou a narração "desanimada" e o começo "sem gancho inicial forte". O gancho passou a ser **"Isso não é
um cemitério."** sobre os ossos em close, com batida no quadro 0: a mesma forma do "Isso não é um arco-íris" do vídeo 1
(negar o que a pessoa está vendo). A voz passou de "íntima" para pregador com energia e convicção.

"Isso não é um cemitério." "É o vale para onde a mão de Deus levou Ezequiel": a coluna de luz desce e o profeta aparece;
a câmera abre no vale cheio de ossos secos. "Não foi castigo. Não foi acaso. Foi Deus." Jesus levado pelo Espírito ao
deserto (Lucas 4:1). O caminho do vale e do deserto até o rio: "não são destino, são passagem". Deus pergunta, da luz:
"por acaso viverão estes ossos?"; os ossos voam e se encaixam, o sopro vem dos quatro ventos e o povo ganha cor. "Mas a
história não termina aí": capítulo 47 na régua (+10 capítulos). A água sai do templo e sobe: tornozelos, joelhos,
cintura, até ele nadar. "O mesmo Deus que te levou ao vale está te levando para o rio": a água cobre o vale. "O vale é
caminho. O rio é promessa." Chamada: "Se você está num vale hoje, escreve aqui: eu vou atravessar."

Entregue: `renders/do-vale-ao-rio.mp4` (1080×1920, 30 fps, 1.991 quadros, 66,37 s, 27,99 MB; −14,1 LUFS, pico −1,7 dBTP
no AAC) e `renders/capa-do-vale-ao-rio.jpg` (quadro 0). Voz: ash, `gpt-audio-1.5`, uma tomada só
(`source/narr/ash-gpt-audio-1.5/`). O Whisper ouviu o vídeo pronto e casou as 141 palavras do roteiro em ordem. A voz
fica de 10,1 a 17,5 dB acima da música em todas as falas (o mínimo é o gancho, com a batida de propósito).

- Citações na legenda (BLIVRE): Ezequiel 37:3, Lucas 4:1, Ezequiel 47:5. Paráfrases com o texto conferido: Ez 37:1,
  37:10 e 47:3–4 (`GROUND` em `script.py`). `tools/analyze.py` e `tools/check.py` conferem tudo.
- **Deus nunca aparece como personagem**: quando Ele age ou fala, desce luz do céu (`GodLight`, `Beam`, `SkyRings`, feitos
  em código). Personagens desenhados: Ezequiel, o povo do vale (adultos) e Jesus.

## Visual (desenhos simples, cores vivas, animados)
- **Ilustrações** (`motion/public/img/`): 11 imagens geradas em 28/10 com `gpt-image-2.5-flare` (API da OpenAI).
  Prompts, modelo e referências em `source/img/ez37_assets.json` e `source/img/style_prompt.py`; os PNG brutos ficam fora
  do git. Desenho plano, contorno azul-marinho, cores saturadas. Personagens com fundo transparente (Ezequiel em quatro
  poses, o povo) para animar em camadas; o primeiro fundo (o vale) é a referência de estilo dos outros. Só adultos. Toda
  cena ilustrada leva a marca "ILUSTRAÇÃO"; a legenda do post diz que ilustrações e narração são geradas por IA.
- **Animado em código** (Remotion 4.0.532, `motion/src/Main.tsx`): os ossos são desenhados e voam até formar cinco
  esqueletos; o povo entra em cinza e ganha cor com o sopro; os quatro ventos são traços que correm; a coluna de luz desce
  no "mão"; a câmera sobe pelo caminho do vale ao rio; a água sobe palavra por palavra com uma régua de nível ao lado do
  profeta; a água cobre o vale; a correnteza do templo e do rio corre. Palavras grandes entram no tempo da fala.
- Fontes OFL: Figtree (a do site), Newsreader e Space Mono (`motion/public/fonts/`).

## Pipeline
```bash
python3 -I tools/analyze.py      # data/stats.json (+ asserts: citações = BLIVRE, 37 -> 47 = 10 capítulos)
python3 -I tools/prep_img.py     # source/img/*.png -> motion/public/img (fundos 1080x1920, personagens recortados)
python3 -I narration.py --voice <nome> --engine file --files a.mp3,b.mp3   # áudio feito fora (Fish Audio), em blocos
#   ou: OPENAI_API_KEY=... python3 -I narration.py --voice ash --engine gpt-audio-1.5   (o roteiro inteiro numa chamada)
python3 -I tools/motion_data.py  # motion/src/data.json
cd motion && npm ci && node render.mjs --still 0,30 && node render.mjs && cd ..   # renders/.film/video.mp4
python3 score.py                 # trilha + efeitos + voz -> renders/.film/mix.wav
python3 finalize.py              # -14 LUFS / TP <= -1 dBTP no AAC, <= 29 MB -> renders/do-vale-ao-rio.mp4
python3 -I tools/check.py        # dito = mostrado = BLIVRE; Deus não desenhado
```
A narração de uma tomada só é cortada nos silêncios entre as falas (nunca dentro de palavra, pelas palavras do Whisper
alinhadas ao roteiro) e mantém o andamento natural: nada de acelerar nem cortar pausas dentro da frase. A primeira
tentativa (TTS fala por fala, acelerada 20% e com pausas encurtadas) soou robótica para o Alex.

## Som
- **Trilha** (`score.py`, instrumentos do vídeo 1 em `sound.py` + uma corda dedilhada): ré menor no vale (drone, vento
  do deserto), fá maior no "foi a mão de Deus", ré maior no "devolve a vida" (a terça de Picardia da série), arpejo leve
  dali em diante. Efeitos com causa na tela: ossos batendo enquanto se encaixam, o tremor, os quatro ventos, três
  respingos na água subindo, a água cobrindo o vale, sinos nas palavras que entram.

## Riscos e pendências
- A voz: a Rio (ChatGPT) só existe no app, não na API; voz de narrador famoso está fora (voz de pessoa real sem
  autorização). O Alex vai gerar no Fish Audio, com voz original ou a dele.
- Revogar a chave da OpenAI que está em texto puro na skill `gpt-image` (apareceu no log da sessão de 28/10).
