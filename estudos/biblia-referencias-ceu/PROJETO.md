# "A Bíblia, conectada" — versão céu (vídeo 9, 27/10/2026)

Pedido do Alex (27/10, 08:48): refazer o vídeo 1 ("Isso não é um arco-íris", 18/10), que passou de 1 milhão de
visualizações segundo ele, "usando exatamente os mesmos parâmetros de imagem, gancho, narração, entrada, tempo". Mudam
só a identidade visual (um céu acolhedor: branco, fundo azul, dourado, paz, mais vivo e com mais estímulo visual) e a
passagem do clímax (uma mais acolhedora, com narração já pronta e validada; ele sugeriu João). Depois, vendo os quadros:
"cores de arco-íris para as linhas", "remeteria melhor o que é dito no gancho", "sem poluição visual" e "se
transformando em dourado na hora de conectar apenas".

## O que ficou igual
- **Narração e tempo:** as falas 0 a 11 e a chamada final são os mesmos cortes da mesma tomada
  (`../biblia-referencias/source/narr/narr-andre-v2.mp3`), com o mesmo andamento e as mesmas pausas.
  `narration.py` reproduz o `narr.json` do vídeo 1 ao milésimo: as 14 falas mantidas começam e terminam nos mesmos
  instantes. Duração: 53,49 s, igual.
- **Câmera e cenas:** a lógica de cada cena do `film.py` original foi mantida (gancho com o domo inteiro no quadro 0,
  2007, mergulho nos capítulos, árvore da vida, a ligação mais votada, contador 63.779 → 344.799, 5,4×, 8 meses,
  clímax, chamada).
- **Trilha:** `score.py` é o do vídeo 1, sem mudança. O órgão continua resolvendo em ré maior no versículo do clímax.
- **Dados:** a mesma base OpenBible.info (CC BY), lida de `../biblia-referencias/data/` (nada duplicado).

## O que mudou
- **Clímax:** sai "E o versículo mais conectado de todos? Isaías 9:6. Porque um menino nos nasceu…". Essa pergunta só é
  verdadeira para Isaías 9:6 (212 ligações). Entram duas falas já validadas em "Antes de João 3:16"
  (`../biblia-joao316`, mesmo narrador, take1, nos mesmos pontos de corte do `narr.json` daquele filme):
  "Você conhece João três, dezesseis." e "Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito."
  (texto BLIVRE, conferido naquele estudo). O versículo termina onde terminava o do vídeo 1 (47,22 s), de modo que a
  chamada começa no mesmo instante (47,72 s). Antes dele fica uma pausa de 0,96 s, enquanto a câmera vai até João 3:16.
  Ganho das falas inseridas igualado ao da tomada original: −1,9 dB e −3,3 dB.
- **João 3:16 na base:** 80 versículos ligados (contados no `film.py`, `N316`; é o número que aparece na tela).
- **Fundo:** `assets/ceu-plate.png` é o `02-ceu-das-conexoes.png` que o Alex enviou
  (`D:\BentoLabs\04-Fotos-e-videos\BIBLIA-CEUS-ACOLHEDORES-R1-20261027`). Foi gerado pelo Codex com o gerador de
  imagens integrado, a partir do fundo da loja (`nevoa-cobalto-bento-r4.webp`). SHA-256
  `ABECCC4B4A2B2B274E48DA081DE39367A1535E37FA606124B5EBAFDC9B76C46B`, igual ao `MANIFESTO.json` dele. Tem 941×1672 e
  é ampliado 1,36× para ganhar folga de movimento; é macio de propósito. Não é recriação de lugar real.
  Os testes no FLUX do PC do Alex (ComfyUI) e o céu procedural ficaram de fora.
- **Arcos:** cor de arco-íris pelo vão, como num arco-íris de verdade (os curtos, por dentro, em violeta; os longos, por
  fora, em vermelho). A tinta é translúcida e o detalhe dos fios fica visível (`Dome.image`). O dourado aparece só
  quando uma ligação se conecta, nos destaques: os primeiros arcos de 2007, a árvore da vida, os três exemplos, a ligação
  mais votada, "uma por minuto" e as 80 ligações de João 3:16. Cada uma muda do seu tom de arco-íris para ouro ao chegar.
- **Tipografia:** tinta azul-marinho com halo branco e destaques em ouro escuro. A régua de capítulos fica em
  azul-ardósia.
- **Vida:** o céu respira (zoom lento e balanço) e acompanha a câmera (mergulho, contador, inclinação para João 3:16).
  Há poucas estrelas cintilando, partículas douradas subindo e raios suaves de luz vindos de cima, que crescem no
  versículo. Tudo foi dosado para não poluir.

## Pipeline
```bash
python3 narration.py      # renders/.film/narr.wav + narr.json (mesmos cortes do vídeo 1 + as 2 falas de João 3:16)
python3 film.py --still 0.5,22.5,44.5
python3 film.py           # renders/.film/video.mp4 + keys.json (~20 min com 2 CPUs)
python3 score.py          # renders/.film/mix.wav (órgão + efeitos + voz, ducking)
python3 finalize.py       # renders/biblia-conectada-ceu.mp4 (-14 LUFS, TP <= -1 dBTP no AAC, <= 29 MB)
python3 cover.py          # renders/capa-biblia-conectada-ceu.jpg
```

## Riscos e pendências
- Ninguém ouviu ainda o encaixe das duas falas de João 3:16 entre as do vídeo 1. O timbre é o mesmo (preset Andre),
  mas a gravação é de outro dia.
- A chamada "os mais pedidos ganham o próprio mapa" promete mapas de novo, como no vídeo 1.
- Postar como vídeo novo, não como repost do arquivo antigo.
