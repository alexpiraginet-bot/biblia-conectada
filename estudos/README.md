# Estudos (os vídeos que deram origem ao site)

| Pasta | Vídeo | O que mostra |
|---|---|---|
| `biblia-referencias/` | **A Bíblia, conectada** (18/10/2026, 1080×1920, 30 fps, cerca de 53,5 s) | As 344.799 referências cruzadas como arcos. De 63.779 (Harrison & Römhild, 2007) até hoje. Isaías 9:6 é o versículo mais ligado (212) |
| `biblia-natal/` | **Antes do Natal, já estava escrito** (19/10/2026, 1080×1920, 24 fps, cerca de 63,9 s) | As profecias do nascimento num mapa 3D do relevo real, com recriações dos lugares |
| `biblia-comentarios/` | **Os versículos de vocês** (19/10/2026, 1080×1920, 30 fps, 62,2 s) | Resposta aos comentários do vídeo 1: os 19 versículos pedidos, cada um com as próprias ligações e o @ de quem pediu. Narração do mesmo narrador (Andre) |
| `biblia-joao316/` | **Antes de João 3:16** (19/10/2026, 1080×1920, 30 fps, 57,6 s) | Remake do episódio 02 no padrão do vídeo 1: o arco de João 3:14 até Números 21 (862 capítulos pra trás), a serpente de bronze e a cruz desenhadas em luz nas duas pontas. Narração do Andre |
| `biblia-joao316-ligacoes/` | **João 3:16, por dentro** (20/10/2026, 1080×1920, 30 fps) | Cinco ligações de João 3:16 com o "como liga" documentado (votos do site + grego, hebraico e Septuaginta), cenas ilustradas e gráficos animados no Remotion (`motion/`). Narração do Andre |
| `biblia-at-no-nt/` | **O Antigo dentro do Novo** (25/10/2026, 1080×1920, 30 fps; completa ~72 s e resumida ~49 s) | As 67.293 ligações AT↔NT como fios de luz entre duas colunas de livros (gráfico calculado em NumPy, câmera e rolagem no Remotion). Em laranja, os 223 pares que repetem 5+ palavras gregas em sequência (Septuaginta × SBLGNT). Narração do Andre |
| `biblia-salmo22/` | **Não foi um grito. Foi uma citação.** (25/10/2026, 1080×1920, 30 fps, ~48 s) | Salmo 22 na cruz: a frase conhecida vira a primeira linha do salmo (o rótulo vira de Mateus para Salmo); quatro pares da base, um por vez, com a linha de luz e os votos; o salmo inteiro rola até o último verso; "Está consumado". Só tipografia e motion (versão 3). Narração do Andre |
| `biblia-marca/` | **A outra marca** (25/10/2026, 1080×1920, 60 fps, ~51 s) | Apocalipse 13 e 22 sem partido: a marca fica na mão e na testa, o lugar de Deuteronômio 6:8 (9 votos); a besta pede adoração; no último capítulo o nome de Deus volta à testa (Ap 13:17 ↔ 22:4, 6 votos). Tipografia cinética com corte seco a cada fala, flash e tremida nos impactos. Narração do Andre |
| `biblia-referencias-ceu/` | **A Bíblia, conectada — versão céu** (27/10/2026, 1080×1920, 30 fps, 53,5 s) | Refação do vídeo 1 com os mesmos cortes de narração, tempos, câmera e órgão, num céu acolhedor (fundo enviado pelo Alex). Os arcos têm as cores do arco-íris por vão e viram ouro só quando uma ligação se conecta. O clímax passa de Isaías 9:6 a João 3:16 (80 ligações), com duas falas do Andre já validadas em "Antes de João 3:16" |

**Números do vídeo 2:**
- 2.094 ligações do AT chegam aos 4 capítulos do nascimento (Mt 1–2 e Lc 1–2, 180 versículos).
- Elas vêm de 1.561 versículos do AT, em 38 dos 39 livros. Só Jonas fica de fora.

**Números do vídeo 3:**
- 20 comentários com versículo, 19 mapas. O mais conectado entre os pedidos é Isaías 55:6 (121).
- Juntos, os pedidos se ligam a 1.024 versículos em 59 dos 66 livros.

**Números do vídeo 4:**
- João 3:16 tem 80 versículos ligados; João 3:14 tem 34. A ligação mais votada de 3:14 é com Números 21:7–9 (81 votos).
- João 3 é o capítulo 1.000 da Bíblia e Números 21 é o 138: 862 capítulos de distância.

**Números do vídeo 5:**
- João 3:16 ↔ Romanos 5:8 tem 1.146 votos: é a 5ª ligação mais votada entre 301.539 pares.
- Gênesis 22:2 é a 1ª ocorrência de "amar" no hebraico (אהב), na Septuaginta (ἀγαπ-) e na BLIVRE. μονογενής aparece 9 vezes no NT (SBLGNT).

**Números do vídeo 6:**
- 67.293 pares AT↔NT; 6.808 dos 7.957 versículos do NT (85,6%) têm ligação com o AT. Salmos lidera (11.484), Isaías vem em 2º (8.468), e Malaquias é o mais denso (12,4 por versículo). No NT, Mateus lidera (8.696).
- 223 pares "palavra por palavra no grego" (5+ palavras iguais em sequência, Septuaginta × SBLGNT, confirmados na OpenBible). Entre eles, Is 7:14 → Mt 1:23 e Is 61:1 → Lc 4:18.

**Números do vídeo 7:**
- Sl 22:1 ↔ Mt 27:46 é o par mais votado de Sl 22:1 (126 votos). Os quatro pares do filme: 22:7↔Mt 27:39 (5), 22:8↔Mt 27:43 (15), 22:18↔Jo 19:24 (60), 22:15↔Jo 19:28 (81).
- Sl 22:16 ("perfuraram") ficou fora (leitura hebraica disputada); Sl 22:31 → Jo 19:30 não é chamado de ligação.

**Onde está o resto:**
- Cada pasta tem `PROJETO.md` (decisões, dados, pipeline), `LEGENDA.md` (legenda do post) e o código.
- `renders/` traz o vídeo final e a capa.
- Os intermediários pesados (`renders/.film/*`) estão na branch `film-intermediates`. Só `narr.json`, `keys.json` e `render.log` ficam no `main`.

## Rodar de novo

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r estudos/requirements.txt
# ffmpeg 6.x no PATH
cd estudos/biblia-referencias && python3 -I tools/analyze.py && python3 film.py --still 3,20,44
cd ../biblia-natal && python3 film.py --still 1.0,31.5     # -> renders/.stills/
cd ../biblia-comentarios && python3 -I tools/analyze.py && python3 -I tools/check.py   # números + fala == tela
cd ../biblia-joao316 && python3 -I tools/analyze.py && python3 -I tools/check.py       # idem, + citações == BLIVRE
cd ../biblia-joao316-ligacoes && python3 -I tools/analyze.py && python3 -I tools/check.py   # idem, + site == base, grego/hebraico
cd ../biblia-at-no-nt && python3 -I tools/analyze.py && python3 -I tools/check.py           # idem, + grego literal LXX × SBLGNT
cd ../biblia-salmo22 && python3 -I tools/analyze.py && python3 -I tools/check.py            # idem, + hebraico do Salmo 22
cd ../biblia-marca && python3 -I tools/analyze.py && python3 -I tools/check.py              # idem, + nenhum partido na fala, na tela e na paleta
cd ../biblia-referencias-ceu && python3 narration.py && python3 film.py --still 0.5,22.5,44.5   # mesmos dados do vídeo 1
```

O pipeline completo de cada vídeo está no `PROJETO.md` da pasta.

**Cuidados:**
- `biblia-natal`, `biblia-comentarios` e `biblia-joao316` leem `../biblia-referencias/data/`; as duas últimas ainda usam `arcs.py` e as fontes de lá (`assets` é um link simbólico), e `biblia-joao316/tools/analyze.py` lê a BLIVRE em `fontes/blivre/`. As pastas precisam continuar lado a lado, dentro deste repo.
- **O mapa 3D (`biblia-natal/mapgl.py`) usa OpenGL 3.3 headless com `backend="egl"` (Linux + Mesa).** No macOS não existe EGL: lá é preciso trocar o backend (CGL) e testar. Uma sessão Linux, como a nuvem do Claude Code, roda sem mudança.
- `words.py` e `narration.py` usam `faster-whisper`, que baixa o modelo na primeira execução.
- **Render conferido em 19/10:** `film.py --still 1.0,50.0` rodou numa cópia deste repo que tinha só `narr.json` em `renders/.film/`.
  - Deu 6,7 s e 14,1 s por quadro.
  - O cache `full_dome.npy` foi recalculado em 13,6 s e saiu idêntico ao original.
  - O vídeo inteiro de `biblia-natal` leva cerca de 33 min em 2 CPUs.
