# "João 3:16, por dentro" (vídeo 5, 20/10/2026)

Pedido do Alex (20/10): "João 3:16, mas agora detalhando como a ligação tem a ver! E no mínimo 5 ligações reais com
documentação e como são feitas essas ligações! Prepare esse Motion. De emoção! Arrepiar". Depois: usar o Remotion para as
animações no meio dos gráficos, cenas ilustradas "algo assim mas melhorado" (print de um Reel ilustrado da BibleProject
Português) e "use o nosso site para buscar as referências sempre".

## Entregáveis
- `renders/joao-316-por-dentro.mp4`: 1080×1920, 30 fps, 3.062 quadros (102,07 s), 28,06 MB. Áudio medido no AAC:
  −14,2 LUFS, pico real −1,9 dBTP. Voz de 11 a 18 dB acima da música em toda fala (mediana 18,2).
- `renders/capa-joao-316-por-dentro.jpg`: a capa.
- `LEGENDA.md`: a legenda.

## História (o roteiro está em `script.py`)
Gancho no frame 0: "A primeira vez que a Bíblia diz 'amar'…". É Gênesis 22:2: um pai, um filho único e um monte.
Depois vem como as ligações são feitas, as 5 ligações (mais uma no fecho), cada uma com o "como liga" documentado, e o
clímax: "O filho de Abraão foi poupado. O Filho de Deus… não." A trilha só resolve em ré maior no "Porque Deus amou".

| # | Ligação de João 3:16 | Votos (site = base) | Como liga (conferido por código) |
|---|---|---|---|
| 1 | Romanos 5:8 | 1.146 | Tema: o amor provado. É a 5ª ligação mais votada entre 301.539 pares |
| 2 | 1 João 4:9 | 755 | Mesmas palavras no grego: θεός, κόσμος, υἱός, μονογενής (MorphGNT). μονογενής aparece 9× no NT (SBLGNT); uma delas, Hb 11:17, é sobre Isaque |
| 3 | Gênesis 22:2 (e 22:12) | 43 (e 172) | 1ª ocorrência de "amar": אהב (H157) no hebraico (OSHB), ἀγαπ- na Septuaginta, "amas" na BLIVRE. ἠγάπησας (Gn 22:2, LXX) é o mesmo verbo de ἠγάπησεν (Jo 3:16) |
| 4 | João 1:29 | 256 | Pergunta e resposta: "onde está o cordeiro?" (Gn 22:7) → "Eis o Cordeiro de Deus". Gn 22:7 ↔ Jo 1:29 também é ligação (15 votos) |
| 5 | Romanos 8:32 | 591 | Mesmo verbo: οὐκ ἐφείσω (Gn 22:12 e 22:16, LXX) → οὐκ ἐφείσατο (Rm 8:32), "poupar". Gn 22:12 ↔ Rm 8:32 também é ligação (17 votos) |
| + | 1 João 4:19 | 400 | Mesma forma: ἠγάπησεν (Jo 3:16) = ἠγάπησεν (1Jo 4:19) |

## Como as ligações são feitas (o que o vídeo diz e de onde vem)
- A página da OpenBible.info (cópia de 20/10 em `source/site/openbible-labs-cross-references.html`) diz: "About 340,000
  cross references identify commonalities between different parts of the Bible—chains of similar themes, words, events,
  or people", "This data draws primarily from public-domain sources, especially the Treasury of Scripture Knowledge, which
  provides most of the data. It also includes data (to seed the initial votes) from my Topical Bible and Twitter Bible
  Search". Cada referência tem botões de voto na página do versículo.
- O site Bíblia Conectada (`/joao/3/16`, cópia de 20/10 em `source/site/joao-3-16.html`, print em
  `motion/public/img/site-joao316.png`) lista as 80 ligações com os votos. `tools/analyze.py` confere voto a voto que o
  site e a base (`../biblia-referencias/data/xref.npz`) dizem o mesmo.
- O "como liga" de cada ligação vem do texto original: MorphGNT/SBLGNT (grego do NT), OSHB (hebraico), Septuaginta da
  eBible (`grclxx`, domínio público) e a BLIVRE para as citações.

## Visual
- **Cenas ilustradas** (9, `motion/public/img/`), geradas com GPT Image 2.5 via Higgsfield num estilo próprio: traço de pincel
  preto, cor chapada levemente deslocada do traço e o pergaminho do tema Dia do site. A referência do Alex era um Reel da
  BibleProject. Personagens, paleta e marca dela não foram copiados, e o print dela não foi usado como referência de
  imagem; a referência de estilo foi a primeira cena gerada aqui (`walk.jpg`).
- **Regras do repo:** sem rosto de criança (Isaque aparece sempre de costas, conferido em recorte); a marca "ILUSTRAÇÃO"
  aparece em toda cena ilustrada; a legenda do post diz que as ilustrações foram geradas por IA.
- **Remotion 4.0.532** (`motion/`): câmera lenta e "boil" de traço nas ilustrações, luz e poeira; arcos reais de João 3:16
  (80, cor pela distância como no vídeo 1; ouro no clímax); fichas das ligações com os votos contando; palavras gregas e
  hebraicas; legenda queimada palavra a palavra, com as citações em serifa e a referência embaixo.
- **Fontes OFL:** Newsreader, Space Grotesk e Space Mono (as do site), Gentium Book Plus (grego) e Noto Serif Hebrew
  (hebraico), em `motion/public/fonts/`.

## Som
- **Narração:** "Andre" (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), o narrador da série,
  em 3 tomadas. `tools/takes.py` mede por fala o português (Whisper) e escolhe a tomada.
- **Trilha:** `score.py`, com os instrumentos do vídeo 1 (`sound.py`): órgão em ré menor, silêncio antes de "O Filho de
  Deus… não." e ré maior em João 3:16.

## Pipeline
```bash
python3 -I tools/analyze.py        # dados + asserts (site = base, grego, hebraico, LXX, BLIVRE)
# narração: 3 tomadas do script.PROMPT -> source/narr/take*.mp3 (Higgsfield)
python3 -I tools/takes.py          # Whisper por fala e por tomada -> source/narr/takes.json
python3 -I narration.py            # corte, rubberband, nível -> renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py    # -> motion/src/data.json
cd motion && npm ci && node render.mjs --still 0,30 && node render.mjs && cd ..   # -> renders/.film/video.mp4
python3 score.py                   # trilha + ducking -> renders/.film/mix.wav
python3 finalize.py                # -14 LUFS / TP -1, <= 29 MB, mux
python3 -I tools/check.py          # dito == mostrado == dados == BLIVRE
```
O Remotion usa o Chromium headless do Playwright (`render.mjs`, `browserExecutable`); em outra máquina, troque o caminho
ou apague a opção para o Remotion baixar o dele.
