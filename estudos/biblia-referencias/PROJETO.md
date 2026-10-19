# "A Bíblia, conectada" — Reels documental (18/10/2026)

Pedido do Alex (18/10): motion que represente melhor o gráfico das referências cruzadas da Bíblia (que viralizou de novo:
post do @fatosecrencas com 63.779). Estilo documentário Discovery, gancho forte nos 3 s, retenção alta, nada com cara de IA,
"algo que um diretor de Hollywood se orgulhasse". Os números grandes precisam empolgar, e a história começa do começo,
para quem nunca ouviu falar. Narração: a mesma voz IA "Andre" da Parte 2 do mini Jesus.

## Entregáveis
- `renders/biblia-conectada.mp4`: 1080×1920, 30 fps, ~53,5 s, ≤ 29 MB, −14 LUFS / TP ≤ −1 dBTP.
- `renders/capa-biblia-conectada.jpg` (`cover.py`).
- Legenda: `LEGENDA.md`.

## Dados (tudo calculado por código, nada estimado)
- **Base:** OpenBible.info cross references (CC BY; arquivo de 12/10/2026), derivada principalmente do Treasury of Scripture
  Knowledge. Cópia em `data/` com SHA-256.
  - `cross-references.zip` → 3b694f0d…27f1
  - `openbible-cross_references.txt` → 2aba58d2…ff8
- **Cânon:** protestante via `pythonbible`.
  - 66 livros, 1.189 capítulos, 31.102 versículos (KJV); maior capítulo: Salmos 119, com 176 versículos.
  - Os totais conferem com os números clássicos.
- `tools/analyze.py` → `data/stats.json` + `data/xref.npz`:
  - 344.799 referências (linhas), das quais 341.295 têm voto > 0.
  - 301.584 pares únicos de versículos (são os arcos desenhados).
  - 73.313 ligam o Antigo ao Novo Testamento.
  - Ligação mais votada: Isaías 41:10 ↔ Filipenses 4:13, com 1.477 votos.
  - Versículo mais conectado: Isaías 9:6 — 212 parceiros únicos e 238 linhas; é o 1º nas duas medidas.
  - Gênesis 2:9 ↔ Apocalipse 22:2 (árvore da vida) existe na base, com 35 votos.
- **2007 (Harrison & Römhild):**
  - Fonte: chrisharrison.net (BibleViz), que diz "63,779 cross references", colaboração com o pastor Christoph Römhild
    em 2007, dataset da King James.
  - A imagem deles **não** é usada; ela não tem licença comercial. Todo arco do filme é nosso, desenhado a partir da base aberta.
- **Contas do roteiro:**
  - 344.799 ÷ 63.779 = 5,41 → "5,4×" na tela e "cinco vezes mais" na fala.
  - 344.799 minutos = 5.747 horas = 239,4 dias ≈ 7,9 meses → "quase 8 meses".

## Direção (referências)
- *Powers of Ten* (Charles e Ray Eames, 1977) — o zoom que faz sentir a escala: o mergulho nos capítulos e a câmera indo até a estrela.
- *Interstellar* — o órgão da Temple Church (Zimmer: o órgão "só soa se respira"). A trilha é um órgão sintetizado aqui, em ré menor,
  que resolve em **ré maior** no "Porque um menino nos nasceu" (terça de Picardia).
- Vitrais da Sainte-Chapelle — paleta dos arcos pela distância: azul, cobalto, violeta, rubi, âmbar, ouro.
- **Tipografia:**
  - Space Grotesk / Space Mono (padrão Deep Tech Clean do Alex) para títulos e números.
  - Cormorant Garamond itálico para os versículos.
  - Fontes OFL em `assets/fonts`.

## Pipeline
```bash
python3 -I tools/analyze.py         # dados -> data/stats.json, data/xref.npz
python3 narration.py                # corta a narração nas pausas, rubberband 1.0–1.25x, monta a timeline (renders/.film/narr.json)
python3 film.py --still 3,20,44     # quadros de conferência
python3 film.py                     # vídeo (~10 min; arcos rasterizados em numpy, 1600 px de diagrama)
python3 score.py                    # trilha + design de som sintetizados + ducking sob a voz
python3 finalize.py                 # -14 LUFS / TP -1 no AAC, two-pass <= 29 MB, mux
python3 cover.py                    # capa
```

## Decisões
- O título do vídeo é o gancho ("Isso não é um arco-íris. É a Bíblia inteira."): frame 0 já com o domo inteiro, sem fade.
- Saiu a fala "Em média, 11 pra cada versículo" (344.799 ÷ 31.102 = 11,09): com ela o vídeo passava de 58 s.
- Contador de 2007 → hoje: os arcos entram em ordem aleatória (densidade uniforme), não da esquerda pra direita. Senão,
  aos 63.779 parecia que o gráfico de 2007 cobria só o começo da Bíblia, o que é falso.
- Zona segura do Reels: textos entre y 260 e 1560; legenda falada em y 1505.
- A capa usa o mesmo gancho do vídeo.

## Pendências / riscos
- **Conta:** o @bento3dlabs não aparece no vídeo; só os créditos de dados. Confirmar em qual conta vai.
- **Áudio:** voz/música medidos (margem K-weighted de ~15 dB sob a voz), mas não ouvidos por um humano. Ouvir antes de postar.
- **Narração:** a "Andre" foi acelerada até 1,25× nas falas expositivas. A transcrição do Whisper bateu 100% (inteligível).
