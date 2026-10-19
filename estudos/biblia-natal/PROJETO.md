# "Antes do Natal, já estava escrito" — Reels documental (19/10/2026)

Pedido do Alex (19/10): seguir com as ideias mais votadas + o bônus do mapa ("Os passos de Jesus"), com mais motion que
"A Bíblia, conectada", números que sobem e descem, uma trilha que se move e leva a imagens reais ou recriações dos lugares.
Depois pediu um trecho do momento mais forte no começo (visual + narração) antes do roteiro padrão.
GPT Image 2.5: usado pelo Higgsfield (`gpt_image_2_5`). A chave da OpenAI não foi buscada: a busca de credencial foi
bloqueada pela segurança da sessão.

## Entregáveis
- `renders/antes-do-natal.mp4`: 1080×1920, 24 fps, ~63,9 s, ≤ 29 MB, −14 LUFS / TP ≤ −1 dBTP.
- `renders/capa-antes-do-natal.jpg` (`cover.py`). A estrela cai dentro do recorte do grid (y 240–1680).
- Legenda: `LEGENDA.md`.

## Estrutura
1. **Flash-forward (0–3,7 s).**
   - Voo dos 111 km, depois o pouso em Belém e a recriação de Belém.
   - Narração: "…a resposta é: 'Em Belém. Porque assim está escrito.'"
   - Carimbo ASSIM / ESTÁ / ESCRITO, sincronizado palavra por palavra.
2. **Rebobina (3,7–4,6 s).** As imagens voltam e o contador de anos gira de 2026 d.C. até 700 a.C.
3. **Gancho.** Descida do espaço até Belém. Na tela: "700 anos antes do Natal", "Miqueias" e a citação de Mq 5:2.
4. **Dados.**
   - As 2.094 ligações do Antigo Testamento pousam nos 4 capítulos do nascimento.
   - Contadores rolando: 4 capítulos · 180 versículos → 1.561 versículos · 2.094 ligações → 38/39 livros (Jonas fica de fora).
5. **Jornada no relevo real.**
   - Nazaré → recriação + Is 7:14 → Mt 1:23 → ranking dos votos (333 / 241 / 228).
   - Voo Nazaré → Belém (111 km em linha reta).
   - Magos vindos do oriente até Jerusalém, com a estrela → recriação do Templo.
   - Jerusalém → Belém (8 km) → recriação de Belém, "assim está escrito" + Mq 5:2 → Mt 2:6 (226 votos).
   - Fuga ao Egito (rota aproximada) → recriação do Nilo + Os 11:1 → Mt 2:15 (104 votos).
   - Volta a Nazaré.
6. **Clímax.**
   - A Bíblia inteira (344.799 referências) → Isaías 9:6 (212 versículos ligados).
   - Arco dourado até Lucas 2:11 (228 votos) → recriação dos pastores (+700 anos).
   - Mapa final com a jornada inteira: "Antes do Natal, já estava escrito." → CTA.

## Dados (tudo calculado por código)
- **Referências cruzadas:** OpenBible.info (CC BY). É o mesmo arquivo do 1º vídeo (SHA-256 `2aba58d2…ccff8`).
  - `tools/analyze.py` → `data/natal-stats.json`.
  - `dome.py` repete as contas com `assert`.
  - Os capítulos do nascimento (Mt 1–2 e Lc 1–2) somam 180 versículos.
  - 2.094 pares únicos ligam versículos do AT a esses capítulos (2.053 com voto > 0).
  - São 1.561 versículos do AT, de 38 dos 39 livros. O único ausente é Jonas.
- **Votos:** soma das duas direções da ligação, a mesma definição do 1º vídeo.
  - Is 7:14↔Mt 1:23 = 333 (1º do Natal)
  - Jr 32:17↔Lc 1:37 = 241
  - Is 9:6↔Lc 2:11 = 228
  - Mq 5:2↔Mt 2:6 = 226
  - Os 11:1↔Mt 2:15 = 104
  - Nm 24:17↔Mt 2:2 = 47 (não usado na tela)
- **Is 9:6:**
  - 212 parceiros únicos — vem do 1º vídeo, conferido no `dome.py`.
  - 344.799 referências no total (linhas da base).
- **Lugares:** OpenBible.info Bible Geocoding (CC BY 4.0), `tools/places.py` → `data/places.json`.
  - Distâncias por haversine: Nazaré–Belém 111,28 km (o vídeo diz "111 km em linha reta"); Belém–Jerusalém 8,43 km.
  - O ponto "Egito" é o ponto representativo do OpenBible. Por isso o vídeo não diz distância até o Egito.
- **Datas (Britannica):**
  - Miqueias: 2ª metade do séc. VIII a.C. A Britannica nota que partes do livro podem ser posteriores.
  - Isaías: chamado c. 742 a.C. (séc. VIII).
  - Oseias: c. 786–746 até 721 a.C. → "~750 anos antes".
  - Jesus: nascido c. 6–4 a.C. em Belém.
  - "700 anos" é número redondo, marcado com "~" nos cartões.
- **Textos:** ACF (Almeida Corrigida Fiel), via `thiagobodruk/biblia` JSON (`tools/verses.py` → `data/verses.json`).
  - Só trechos curtos, com a referência na tela.
  - O JSON "AA" tem versículos trocados em Mt 2 e foi descartado.

## Mapa 3D (`mapgl.py`, `mapscenes.py`)
- **Relevo:** AWS Terrain Tiles (terrarium), em 4 níveis: z7, z9, z11 e z12 (`tools/terrain.py`).
  - Atribuição exigida, colocada nos créditos e na legenda: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Mapzen.
- **Água:** Natural Earth (domínio público), via `tools/masks.py` e `tools/coast.py`.
  - Ficaram de fora os canais modernos (Suez, Ismailia) e as represas do séc. XX.
- **Render:** OpenGL 3.3 headless (moderngl + Mesa llvmpipe), MSAA 4×.
  - Noite de lua (azul) com a luz quente da cabeça da trilha.
  - Exagero vertical de 2–3×, cavidade/AO e estrelas que o relevo esconde.
- **Rotas:**
  - Linha reta onde a narração dá a distância (Nazaré → Belém, Jerusalém → Belém).
  - Tracejado "rota aproximada" onde os Evangelhos não dão o caminho: magos, ida ao Egito pela costa e volta.

## Recriações (Higgsfield)
- **Imagens:** GPT Image 2.5, alta, 2K, 9:16. Prompts com "sem pessoas / sem rostos" e luz natural.
  - Os pastores aparecem só como silhuetas de costas.
- **Movimento:** Kling 3.0 pro, 5 s, sem som. O Higgsfield sugeriu o preset "IN THE DARK"; foi recusado para manter
  o movimento descrito.
- **Custo:** 484,26 → 423,76 créditos = **60,5 créditos** (narração + 5 imagens + 5 clipes).
- **Na tela:** todas as cenas levam a etiqueta "RECRIAÇÃO". Arquivos em `source/img`, `source/clips`.

## Render
- `film.py`: ~33 min para o vídeo inteiro em 2 CPUs. Os trechos corrigidos foram re-renderizados com `--range` e
  emendados no intermediário (sem diferença de enquadramento: emenda conferida quadro a quadro).
- **Motion blur só no relevo:** o GL é a média de 3 sub-quadros, e trilha, rótulos e números são desenhados uma vez,
  nítidos. A primeira versão fazia a média do quadro inteiro e duplicava a trilha.
- **Clarões:** o mergulho em Nazaré foi suavizado (eram 8 quadros quase brancos). Os outros clarões têm 1–2 quadros,
  nunca 3 por segundo.

## Som (`score.py`)
- Trilha original sintetizada: ostinato em semicolcheias a 100 BPM, taikos nos voos e o órgão do 1º vídeo.
- Cores harmônicas:
  - Mib maior sobre ré no Egito.
  - Ré MAIOR no "Porque um menino nos nasceu".
- Efeitos: hits em cada palavra carimbada (60 ms antes, para não comer a consoante), ticks seguindo os contadores,
  rebobinada de fita e risers nos pousos.
- Medido (`tools/levels.py`): música ~14 dB abaixo da voz na mediana durante a fala (p10 ≈ 5 dB).

## Pipeline
```bash
python3 -I tools/analyze.py; python3 -I tools/places.py data/ob-*.kml; python3 -I tools/verses.py source/text/acf.json
python3 tools/terrain.py wide 9 29.5 28.6 37.2 34.2   # + corridor 11, judea12 12, nazare12 12, ultra 7 (ver docstring)
python3 -I tools/masks.py data/ne_10m_land.geojson data/ne_10m_lakes.geojson data/ne_10m_rivers_lake_centerlines.geojson
python3 -I tools/coast.py data/ne_10m_coastline.geojson
python3 narration.py          # corta/estica a narração (Andre) e monta a linha do tempo
python3 film.py --still 1,12  # quadros de conferência; python3 film.py -> renders/.film/video.mp4 (~45 min em 2 CPUs)
python3 score.py && python3 finalize.py && python3 cover.py
```

## Pendências / riscos
- **Áudio:** voz e música foram medidas, mas não ouvidas por um humano. Ouvir antes de postar.
- **Citações:** os trechos da ACF são curtos (direito de citação) e vêm com a referência.
- **Recriações:** o Templo segue a reconstrução usual de Herodes. A cidade ao fundo é ilustrativa.
- **Conta:** confirmar em qual perfil vai.
