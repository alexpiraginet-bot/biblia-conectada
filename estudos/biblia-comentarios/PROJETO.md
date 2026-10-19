# "Os versículos de vocês": Reels resposta aos comentários (19/10/2026)

Pedido do Alex (19/10, 07:57): "Crie um com as citações dos comentários citando os @ de quem pediu", "Motion no mesmo
estilo desse primeiro das conexões", e depois "Pode ter narração do mesmo narrador! Sempre, padrão crie".

É a entrega da promessa do vídeo 1 ("Comenta teu versículo favorito. Os mais pedidos ganham o próprio mapa"). Cada
versículo citado nos comentários (5 prints enviados pelo Alex) ganha o próprio mapa: as referências cruzadas reais dele,
desenhadas como arcos dourados que convergem para ele, com o @ de quem pediu.

## Entregáveis
- `renders/versiculos-de-voces.mp4`: 1080×1920, 30 fps, 62,2 s (1.866 quadros), 28,1 MB, −14,2 LUFS / pico −1,9 dBTP.
- `renders/capa-versiculos-de-voces.jpg` (`cover.py`).
- Legenda: `LEGENDA.md` (gerada por `tools/legenda.py` a partir dos dados).

## Comentários → versículos (`data/comentarios.json`)
- **20 comentários citam versículo, de 20 pessoas → 19 mapas.** João 3:16 foi pedido duas vezes (@neilson.allves,
  @lgnd123165) e Filipenses 3:13–14 é um trecho.
- **Sem referência no comentário, identificados pela frase:**
  - @fernandocastr35 → 1 Tessalonicenses 4:16.
  - @edy_bueno_ ("Amai os vossos inimigos e lhes façam o bem") → Lucas 6:35 ("amai ... inimigos" + "façam-lhes o bem").
    Parecidos: Lucas 6:27 e Mateus 5:44.
- **@oliveira____sm:** os underlines se juntam num traço no print. Medi 4: o traço tem 84 px, 1 underline tem 22 px,
  e a diferença de 62 px dá 3 avanços. **Conferir antes de postar.**
- **Fora (não citam versículo):**
  - Perguntas: "Como ter acesso a esse gráfico?" (6 curtidas), "tem no github o projeto?", "Os apócrifos tão aí também?".
    As três foram respondidas na legenda.
  - Reações, marcação e louvor.
  - "Isaías a mini bíblia, fato!" (16 curtidas): Isaías tem 66 capítulos, conferido no código.

## Dados (`tools/analyze.py` → `data/stats.json`; base e definição do vídeo 1)
- **Base:** `../biblia-referencias/data/xref.npz` (OpenBible.info, CC BY, 301.584 pares únicos).
- **"Versículos ligados"** = parceiros únicos, qualquer voto, sem o próprio versículo.
  - Num trecho: a união dos parceiros dos versículos do trecho, menos o próprio trecho.
  - O método reproduz Isaías 9:6 = 212 do vídeo 1 (assert).
- **Resultados:**
  - O mais conectado entre os pedidos é **Isaías 55:6, com 121** (@caetanopaulo469). Depois vêm Romanos 8:28 (117) e Romanos 12:2 (89).
  - **Juntos:** 1.024 versículos ligados aos pedidos, em 59 dos 66 livros. Ficam de fora Obadias, Naum, Habacuque,
    Ageu, Filemom, 2 João e 3 João. Naum 1:7 foi pedido, mas nenhum versículo ligado aos pedidos está em Naum.
  - **Pedidos ligados entre si:**
    - Oseias 6:3 ↔ Filipenses 3:13 (13 votos).
    - Romanos 8:28 ↔ Filipenses 3:14 (44 votos).
    - Ou seja, três pessoas: @diogoribeiro.adv, @oliveira____sm e @criador7063.

## Narração (padrão do Alex a partir de 19/10: sempre com o mesmo narrador)
- **Voz:** "Andre" (ElevenLabs via Higgsfield `text2speech_v2`, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`).
  - O texto enviado está em `script.py`.
  - Foram 3 tomadas (3,15 créditos cada). Os números foram escritos por extenso ("João três, dezesseis") e há uma
    frase de aquecimento no começo ("Olá, pessoal…"), cortada na montagem.
  - Isso ataca a queixa do vídeo 1 ("o sotaque tem mudanças e falhas principalmente no começo").
- **Escolha por linha (`tools/takes.py` → `source/narr/takes.json`):**
  - Whisper large-v3-turbo mede, em cada linha de cada tomada: probabilidade de português, semelhança com o roteiro
    e log-probabilidade média.
  - **Resultado:** só a tomada 0 teve todas as 25 linhas ouvidas exatamente (semelhança 1,00, português 0,998–0,999).
    A tomada 1 perdeu as linhas 3–9 na transcrição e a 2 teve linhas cortadas. **O vídeo usa a tomada 0 inteira:**
    uma tomada só dá entrega consistente, e a queixa do vídeo 1 era o sotaque *mudando*.
  - `narration.py` corta cada linha nos trechos de fala entre pausas reais (silêncio digital de ~0,5 s que o TTS põe
    no "..."). Os inícios de palavra do Whisper caem dentro da pausa, então não servem de corte.
  - Depois encurta pausas internas para 0,20 s, aplica rubberband (rol 1,20×, frases 1,00–1,14×), nivela (±3 dB) e monta a linha do tempo.
  - No rol, cada versículo fica no mínimo 1,9 s na tela.

## Pipeline
```bash
python3 -I tools/analyze.py      # comentários -> data/stats.json
python3 -I tools/takes.py        # pontua as 3 tomadas (Whisper) -> source/narr/takes.json
python3 -I narration.py          # melhor tomada por linha -> renders/.film/narr.wav + narr.json
python3 film.py --still 1.0,9.5  # quadros de conferência
python3 film.py                  # vídeo -> renders/.film/video.mp4
python3 score.py                 # trilha (instrumentos do vídeo 1, sound.py) + ducking -> mix.wav
python3 finalize.py              # -14 LUFS / TP -1, <= 29 MB, mux
python3 cover.py                 # capa
python3 -I tools/legenda.py      # legenda
```
`engine.py` e `sound.py` são cópias literais do motor de imagem e dos instrumentos do vídeo 1, para manter o mesmo visual e o mesmo som.
Depende de `../biblia-referencias/` (dados, `arcs.py`, fontes via `assets` → `../biblia-referencias/assets`).

## Decisões
- **Ordem bíblica (Salmos → Apocalipse):** a estrela anda pela Bíblia da esquerda para a direita, e o rol tem lógica.
- **O narrador lê só as referências, não os @:** @ lido em voz alta fica estranho. Os @ ficam na tela, embaixo de "pedido por".
- **Sem texto dos versículos na tela:** não daria tempo de ler, e assim nenhuma tradução protegida entra no vídeo.
- **Sem link do GitHub queimado no vídeo:** ele vai na legenda, que dá para editar depois.

## Verificação (19/10)
- **`tools/check.py`:** o que é falado bate com o que aparece nos 19 versículos (roteiro, transcrição da tomada usada e
  ordem bíblica): ALL OK.
- **`tools/sheets.py`:** quadros tirados do MP4 final, um por versículo. Conferi um a um referência, número e @: os 19 certos.
- **`tools/verify_audio.py`:** Whisper em cada linha do áudio final.
  - 22 de 25 linhas saem idênticas. Duas só diferem na grafia dos números ("Lucas 635", "Apocalipse 2010").
  - "Naum um, sete" vira "Na 1.1.7" com a música por baixo. Sem música sai "Naum 1-7", e com cada camada da trilha separada também.
  - O idioma detectado nos primeiros 6 s é português, com 1,000.
- **Não verificado:** ninguém ouviu o áudio. Voz e música foram medidas (ducking 0,82, a voz fica ~15 dB acima da
  trilha), não escutadas. Ouvir antes de postar, principalmente "Naum um, sete".
