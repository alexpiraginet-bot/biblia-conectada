# "Antes de João 3:16": remake no padrão de "A Bíblia, conectada" (19/10/2026)

Pedido do Alex (19/10): refazer o episódio 02 ("Antes de João 3:16", projeto HyperFrames do zip
`antes-de-joao-316-editavel.zip`) no mesmo estilo e padrão do primeiro vídeo, o mais viral. Isso inclui o gancho, a leitura
visual fácil, o tema, a instrumentação e o tom.

## Entregáveis
- `renders/antes-de-joao-316.mp4`: 1080×1920, 30 fps, ≤ 29 MB, −14 LUFS / TP ≤ −1 dBTP.
- `renders/capa-antes-de-joao-316.jpg`: a capa (`cover.py`).
- `LEGENDA.md`: a legenda.

## O que mudou em relação ao episódio 02 original
- **Arcos de dados reais:** os 240 arcos decorativos e as imagens geradas saíram. Agora é o domo real de referências
  cruzadas do vídeo 1 (`engine.py`, cópia literal).
- **Um arco só:** a história gira em torno do arco de João 3:14 até Números 21, a ligação mais votada de João 3:14 na base
  aberta.
- **Gancho no frame 0**, como no vídeo 1. O domo inteiro e o arco dourado já estão na tela, com o texto "ESSE ARCO LIGA
  JESUS A UMA SERPENTE."
- **Símbolos simples:** a haste com a serpente de bronze (Nm 21:9) e a mesma haste virando cruz (Jo 12:32–33) são
  desenhadas em luz, nas duas pontas do arco. É a leitura em um olhar.
- **Trilha:** o mesmo órgão que respira em ré menor. Ele só resolve em **ré maior** quando João 3:16 é citado, como o vídeo 1
  fez com Isaías 9:6.
- **Narração:** "Andre" (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`). Roteiro novo, frases
  curtas no tom do vídeo 1.
- **Duração:** ~57,6 s. O episódio 02 tinha 72 s.

## Dados (tudo por código: `tools/analyze.py` → `data/stats.json`, com asserts)
- **Base:** OpenBible.info (CC BY), 301.584 pares únicos (`../biblia-referencias/data/xref.npz`).
- **João 3:14:**
  - 34 versículos ligados.
  - O par mais votado nas linhas brutas é `John.3.14 → Num.21.7-Num.21.9`, com 81 votos.
  - Também há Num 21:8 → Jo 3:14 (24 votos) e Num 21:9 → Jo 3:14–15 (24 votos).
- **João 3:16:** 80 versículos ligados.
- **Distância:** João 3 é o capítulo 1.000 da Bíblia (cânon protestante, 1.189 capítulos) e Números 21 é o 138. A
  diferença dá **862 capítulos pra trás**. O contador da tela é a posição da cabeça do arco, e os capítulos são
  equidistantes no eixo.
- **Citações (BLIVRE, CC BY 4.0 BR, `fontes/blivre`):**
  - Jo 3:14 inteiro.
  - Jo 3:16, primeira oração, com "…".
  - Paráfrases ancoradas no texto: Nm 21:6, 8–9 ("olhava à serpente de bronze, e vivia"), Jo 3:15 e Jo 12:32–33.

## Pipeline
```bash
python3 -I tools/analyze.py     # dados + asserts
# narração: 3 takes (script.PROMPT) -> source/narr/take*.mp3 (jobs c013b4a4…, f3ea5146…, 7669e279…; 3,15 créditos cada)
python3 -I tools/takes.py       # Whisper large-v3-turbo por fala e por take -> takes.json (escolhido: take1, completo)
python3 -I narration.py         # corte nas pausas, rubberband 1,00–1,18×, nível -> renders/.film/narr.wav/json
python3 film.py --still 0,15.9  # quadros de conferência
python3 film.py                 # vídeo (~11 min)
python3 score.py                # trilha + sound design + ducking (0,86)
python3 finalize.py             # -14 LUFS / TP -1 no AAC, two-pass <= 29 MB, mux
python3 cover.py                # capa
python3 tools/check.py          # dito == mostrado == dados == BLIVRE
python3 tools/sheets.py         # quadros do MP4 final
python3 -I tools/verify_audio.py   # Whisper no mix final, por fala
```

## Pendências / riscos
- **Áudio:** foi medido (palavras ≥ 8 dB acima da música na banda da voz) e transcrito pelo Whisper, mas ainda não foi
  ouvido por um humano.
- **Tema sensível:** o texto e o visual deixam claro que é a serpente de bronze ordenada por Deus, e que o paralelo é o
  "ser levantado" (Jo 3:14). Não há equivalência Jesus = serpente.
