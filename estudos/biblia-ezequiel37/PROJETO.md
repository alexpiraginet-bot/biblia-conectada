# "Cada osso a seu osso" — vídeo 10 (28/10/2026)

Pedido do Alex (28/10, 07:42): um Reel de outro pregador sobre Ezequiel 37, "em versão animada". Depois de duas versões
com ilustrações geradas (v1 com ligações da base; v2 seguindo a mensagem do sermão, Deus só como luz), às 11:09 ele pediu
"uma versão totalmente autêntica, autoral sua… esquece gancho, esquece tudo que a gente já sugeriu… uma coisa que talvez
você nunca viu em animação". As v1/v2 estão nos commits c46563b, f8d4d1e e 8efe6c8.

## A ideia (v3)
Sem ilustração, sem slogan. **O profeta narra em primeira pessoa, nas palavras da própria Bíblia** (BLIVRE, Ezequiel
37:1-10 e 47:1-5,9, com cortes de fôlego), e **a imagem é feita do texto**: as letras de Ezequiel 37 estão espalhadas
como ossos no chão de um vale noturno; a pergunta de Deus desce como anéis de luz; a palavra passa como uma onda pelas
letras; no tremor, as letras voam e se encaixam, **cada osso a seu osso**, formando o próprio versículo (cada letra do
versículo vem do osso-letra mais próximo com a mesma letra); nervos (fios), carne e pele são desenhados sobre as letras e
depois tudo fica cinza, "porém não havia espírito neles"; os quatro ventos atravessam o texto, que ondula; no "entrou"
o texto acende em ouro e no "exército" todas as linhas do capítulo se levantam do chão, uma parede de texto. Dez
capítulos depois: o número conta de 37 a 47; um umbral de luz; um fio de água desce; o texto de Ezequiel 47 fica em pé no
cenário; a água sobe medida (régua de mil côvados; tornozelos, joelhos, cintura), e o texto submerso aparece refratado
(deslocamento por ruído em SVG); no "nado" a câmera vai para debaixo do rio (cáusticas, bolhas, o texto flutua). Fecho
autoral: "Quem te pôs no vale é quem te leva ao rio." Deus nunca é figura: só luz.

Duas falas são minhas (11 e 16). Todas as outras citam o versículo na tela. `tools/analyze.py` confere cada fragmento
na BLIVRE; `tools/check.py` confere dito = mostrado e que não há imagem nenhuma.

## Entregue
- `renders/cada-osso-a-seu-osso.mp4`: 1080×1920, 30 fps. Voz: onyx, `gpt-audio-1.5`, uma tomada só, direção de ator
  (contida, grave, de cinema), cortada nos silêncios entre as falas sem acelerar.
- `renders/capa-cada-osso-a-seu-osso.jpg`: a capa.
- `LEGENDA.md`: a legenda.

## Pipeline
```bash
python3 -I tools/analyze.py      # data/stats.json: BLIVRE de Ez 37 e 47 inteiros + asserts das citações
OPENAI_API_KEY=... python3 -I narration.py --voice onyx --engine gpt-audio-1.5   # renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py  # motion/src/data.json (falas, palavras, capítulos, texto dos capítulos)
cd motion && npm ci && node render.mjs --still 1,30 && node render.mjs && cd ..   # renders/.film/video.mp4 (~30 min, 2 CPUs)
python3 score.py                 # trilha + efeitos + voz -> renders/.film/mix.wav
python3 finalize.py              # -14 LUFS / TP <= -1 dBTP no AAC, <= 29 MB
python3 -I tools/check.py
```
Tipografia no navegador: as posições de cada letra são medidas com `canvas.measureText` nas mesmas fontes que o SVG usa
(Newsreader, Figtree, Space Mono, OFL, em `motion/public/fonts/`), então cada glifo pode voar sozinho.

## Som
`score.py` (instrumentos do vídeo 1 em `sound.py` + corda dedilhada): ré grave já respirando no quadro 0; vento do vale e
ossos secos estalando; **a música para na pergunta** (só a voz e um sino em "viverão"); a palavra passa com um shimmer;
tremor (sub + rumble) e sessenta estalos enquanto as letras se encaixam; três toques em nervos, carne, pele; o vazio em
"porém"; quatro whooshes cruzados; **ré maior no "entrou"**; sinos em "viveram"; dedilhado e tiques no exército; tiques
no contador 37 → 47; fio de água, três respingos subindo; a câmera submerge num swell grave; ré maior calmo no fecho.
