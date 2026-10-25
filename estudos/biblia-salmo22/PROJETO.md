# "Não foi um grito. Foi uma citação." (vídeo 7, 25/10/2026)

Pedido do Alex (25/10, 13:55): "uma opinião sua, uma construção 100% sua… formato de vídeo que seria viral… totalmente
autêntica sua… visual, roteiro, criação, áudio, sonoridade, narração, 100% sua. Porém com gancho muito forte, de retenção,
de no máximo 30-40 segundos." Depois: "Pode criar".

## A ideia
Pegar uma coisa que todo mundo acha que já conhece e mostrar que ela significa outra coisa. "Deus meu, Deus meu, por que
me desamparaste?" é a primeira linha do Salmo 22, escrito séculos antes da cruz; o salmo descreve a cena ao redor de Jesus
(zombaria e cabeças balançando, "confiou em Deus, que o livre", roupas repartidas e sortes, a sede) e termina em vitória:
"porque ele assim fez". Na cruz: "Está consumado". Jesus, morrendo, estava apontando para o salmo.

## Entregáveis
- `renders/nao-foi-um-grito.mp4` (versão 3, 25/10 à noite): 1080×1920, 30 fps, 1.445 quadros (48,2 s), 27,91 MB. Áudio
  medido no AAC: −14,1 LUFS, pico real −1,9 dBTP (`renders/.film/render.log`).
- Conferência (`tools/check.py`: ALL OK; `tools/verify_audio.py`): o Whisper ouve o vídeo pronto e acerta 99,1% do
  roteiro em ordem (109/109 palavras); os 6 primeiros segundos saem como português (0,999). Diferenças só de grafia
  ("pra" ouvido como "para", "por quê" como "o porquê"). Ninguém ouviu de ouvido ainda.
- `renders/capa-nao-foi-um-grito.jpg`: a capa, o frame de 6,3 s (a frase com o rótulo já virado para SALMO 22:1 e
  "Foi uma citação." em ouro).
- `LEGENDA.md`: legenda, comentário fixado e duas respostas prontas para as objeções previsíveis.

## O que o vídeo diz e de onde vem (`data/stats.json`, `tools/analyze.py`)
| Fala | Dado |
|---|---|
| "É a primeira linha do Salmo 22" | Sl 22:1 ↔ Mt 27:46 é o par mais votado de Sl 22:1 (126 votos); Mc 15:34, 85 |
| "Zombam de mim e sacodem a cabeça" | Sl 22:7 ↔ Mt 27:39, 5 votos |
| "Confiou no Senhor, que ele o salve" | Sl 22:8 ↔ Mt 27:43, 15 votos |
| "Repartem minhas roupas e lançam sortes" | Sl 22:18 ↔ Jo 19:24, 60 votos (e Mt 27:35, 56) |
| "Minha língua está grudada no céu da boca" | Sl 22:15 ↔ Jo 19:28 ("Tenho sede"), 81 votos |
| "termina assim: … porque ele assim fez" / "Está consumado" | Sl 22:31 e Jo 19:30. Não é um par da base e não é chamado de ligação |
| "mil anos antes da cruz" | Davi, século X a.C., conforme o título do salmo na própria BLIVRE ("Salmo de Davi"); afirmação geral, sem número da base |

Todas as citações são texto literal da Bíblia Livre; os votos batem com as páginas do site (`source/site/`).

**O que ficou de fora, de propósito.** Sl 22:16 ("perfuraram minhas mãos e meus pés") tem leitura hebraica disputada
(כארי "como leão" × "perfuraram" na Septuaginta). "Ele fez" (עשה) e "está consumado" (τετέλεσται) não são a mesma
palavra; o vídeo diz "termina assim", não "mesma palavra". As duas respostas prontas estão em `LEGENDA.md`.

## Forma (versão 3, 25/10 à noite)
A versão 1 era só texto no preto com trilha inaudível no celular; a versão 2 pôs um livro aceso e fios de luz em
Three.js (do pacote "Motion fluido V2" que o Alex mandou). Ele achou a montagem ruim — texto em cima do brilho, o livro
raster brigando com os fios — e pediu: "tire a Bíblia", "use só o que for ficar perfeito, se não cria tudo do zero".
Então a v3 é tipográfica e editorial, sem nenhum raster, só `motion/src/Main.tsx` (DOM/CSS no Remotion):
- **Gancho:** a frase entra palavra por palavra com a voz do Andre (Newsreader 84), com o rótulo MATEUS 27:46 embaixo.
  Em "citação" aparecem as aspas em ouro e o rótulo **vira** para SALMO 22:1 (split-flap), com uma linha que se acende.
- **Pares, um por vez:** versículo do Salmo em cima (Newsreader 40–42, trechos acesos em ouro), uma **linha de luz** que
  se desenha da esquerda para a direita quando o Evangelho entra, o **chip de votos** centrado na linha (conta de 0 ao
  valor), o versículo do Evangelho embaixo, alinhado à direita. Os pares já mostrados viram uma **lista de referências**
  no topo (o "livro-razão": Salmo — Evangelho — votos), o par ativo em ouro.
- **Rolagem:** o Salmo 22 inteiro (31 versículos) rola com "começa no abandono… e termina assim", primeiro e último
  acesos; depois o v. 31 grande, "porque ele [assim] fez" acende em ouro e o hebraico עָשָֽׂה sobe (150 px).
- **"Está consumado":** o mesmo hebraico em cima, uma linha de ouro, a frase em Newsreader 112 que vira ouro, JOÃO 19:30.
- **Atmosfera:** poça de luz quente que deriva devagar, vinheta, grão. Movimento: subir + desfocar → nítido, easing
  `cubic-bezier(.16,1,.3,1)`. Sem câmera, sem 3D, sem WebGL (o `Filaments.tsx` e o `book.png` foram removidos).
- **Som:** tapete de órgão em ré menor desde o frame 0, audível em médios (voicing dobrado uma oitava acima); batimento
  cardíaco como acento, desacelerando; um sino quando cada versículo do Evangelho responde; dominante e subida longa na
  rolagem do salmo; 0,8 s de silêncio; ré maior cheio em "Está consumado", até o fim.
- **Narração:** Andre (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), tomada 3 inteira,
  ritmo 1,0, 128 palavras.
- **Legendas:** só nas falas que não estão na tela como versículo (4 e 9).

## Como rodar
```bash
python3 -I tools/analyze.py      # data/stats.json (confere pares, votos do site, BLIVRE, hebraico)
# narração: 3 tomadas do script.PROMPT -> source/narr/take*.mp3 (Higgsfield)
python3 -I tools/takes.py        # avalia as tomadas (Whisper)
# cd motion && npm install --no-save three@0.170.0   (o node_modules é o link para o do vídeo 5)
python3 -I narration.py          # renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py  # motion/src/data.json
python3 -I tools/check.py        # dito = mostrado = dados = BLIVRE
python3 score.py                 # trilha + mix
cd motion && node render.mjs && node render.mjs --cover && cd ..
python3 finalize.py              # -14 LUFS, pico real <= -1 dBTP, <= 29 MB
python3 -I tools/verify_audio.py # o Whisper ouve o vídeo final e compara com o roteiro
```
`motion/node_modules` é um link para o do vídeo 5 (mesmas versões travadas).
