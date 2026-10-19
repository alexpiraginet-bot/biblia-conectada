# Créditos e licenças

Este repositório só publica material livre. As fontes abaixo pedem crédito. O site precisa mostrar estes créditos numa página "Sobre / Créditos" e um resumo no rodapé.

## Textos bíblicos

### Bíblia Livre (BLIVRE): texto principal do site

Licença: Creative Commons Atribuição 4.0 Brasil. Crédito sugerido pelos autores, para copiar exatamente:

> Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, http://sites.google.com/site/biblialivre/ - fevereiro de 2018. Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). Reprodução permitida desde que devidamente mencionados fonte e autores.

- Onde não houver espaço, basta "BLIVRE".
- Se o texto for alterado, é preciso indicar a alteração.
- Arquivo: `fontes/blivre/porbr2018_vpl.zip`, via eBible.org.

### Outras traduções abertas (`fontes/ebible/`)

- **Bíblia Portuguesa Mundial:** domínio público. É um rascunho em revisão.
- **Biblica® Open Nova Bíblia Viva™:** CC BY-SA 4.0. Aviso obrigatório, para copiar exatamente:
  - "Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc."
  - "The original Work by its copyright holders is available for free at www.biblica.com and open.bible."
  - "Biblica" é marca registrada da Biblica, Inc.
  - Não alterar o texto nem o título. Alterar cria obra derivada: aí é preciso listar as mudanças e manter a mesma licença.
- **Bíblia Livre Para Todos (NT):** Copyright © 2022 Free Bible Ministry, Inc. CC BY-SA 4.0.
- **A Bíblia Sagrada, Tradução para Tradutores (NT):** Copyright © 2018 Ellis W. Deibler, Jr. CC BY-SA 4.0.

### Citações curtas da ACF e da AA (só nos estudos)

- `estudos/biblia-natal/data/verses.json` guarda de cada uma só os versículos que aparecem nos vídeos (e uma lista de nomes de livros).
- Os vídeos mostram trechos com a referência na tela.
- Base legal: citação para fins de estudo, com a fonte indicada (Lei 9.610/98, art. 46, III).
- **Os textos completos dessas traduções e de outras protegidas (NVI, ARA etc.) não entram no repositório nem no site.** Tradução é obra protegida (art. 7º, XI). Quem traduz obra em domínio público tem direito sobre a própria tradução (art. 14).

### Línguas originais e domínio público (`fontes/ebible/`)

- **Westminster Leningrad Codex** (hebraico), **Textus Receptus** e **Septuaginta** (grego), **Vulgata Clementina** (latim), **King James Version**, **World English Bible**, **Berean Standard Bible**, **American Standard Version**, **Young's Literal Translation**, **Reina-Valera 1909**: domínio público. "World English Bible" é marca da eBible.org; o texto é livre.
- **SBL Greek New Testament:** CC BY 4.0. Crédito: "SBLGNT © 2010 Society of Biblical Literature and Logos Bible Software".

### Hebraico e grego com morfologia

- **Open Scriptures Hebrew Bible** (`fontes/oshb/`): CC BY 4.0. Crédito: "Open Scriptures Hebrew Bible (openscriptures/morphhb), based on the Westminster Leningrad Codex".
- **MorphGNT** (`fontes/morphgnt/`): o texto é o SBLGNT (CC BY 4.0); a análise morfológica é CC BY-SA 3.0. Dados derivados da análise saem CC BY-SA.
- **Dicionários de Strong** (`fontes/strongs/`): domínio público (edição XML de Ulrik Petersen e Open Scriptures).
- **STEPBible Data** (`fontes/stepbible/`, TAHOT, TAGNT, léxicos, TIPNR, TVTMS): CC BY 4.0. Crédito, com link para www.STEPBible.org: "Data created by www.STEPBible.org based on work at Tyndale House Cambridge". Quem alterar os dados deve registrar as mudanças e apontar o repositório deles como origem.

## Dados

| Base | Licença | Crédito |
|---|---|---|
| Referências cruzadas (OpenBible.info) | CC BY | "Referências cruzadas: OpenBible.info". A base é derivada principalmente do Treasury of Scripture Knowledge. Fonte: https://www.openbible.info/labs/cross-references/ (o cabeçalho do arquivo diz `CC-BY`, sem versão) |
| Bible Geocoding Data (OpenBible.info) | CC BY 4.0 | "Geocodificação: OpenBible.info" |
| Theographic Bible Metadata (Viz.Bible) | CC BY-SA 4.0 | "Theographic Bible Metadata, Viz.Bible". O projeto pede também crédito às fontes originais dele. **Dados derivados saem sob CC BY-SA 4.0** |
| STEPBible Data (TAHOT, TAGNT, léxicos, TIPNR, TVTMS) | CC BY 4.0 | "STEP Bible", com link para www.STEPBible.org: "Data created by www.STEPBible.org based on work at Tyndale House Cambridge" |
| Natural Earth | Domínio público | Opcional: "Natural Earth" |
| AWS Terrain Tiles (relevo dos vídeos) | Atribuição | SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Mapzen |

## Fontes tipográficas

Space Grotesk, Space Mono e Cormorant (as três dos vídeos), Literata (texto bíblico do site) e Newsreader (títulos do site), sob a SIL Open Font License 1.1. Os textos da licença estão em `estudos/*/assets/fonts/OFL-*.txt` e, junto das cópias WOFF2 usadas pelo site, em `site/src/fonts/OFL-*.txt`. As cópias do site são recortes gerados por `site/scripts/subset-fonts.sh`; a da Newsreader é uma instância fixa (tamanho óptico 72, peso 440) da fonte variável.

## Mídia gerada pelo projeto

- **Recriações e clipes:** gerados via Higgsfield, com GPT Image 2.5 e Kling 3.0.
- **Narração:** voz sintética, ElevenLabs via Higgsfield.
- **Trilha:** sintetizada por código (`score.py`).
- Sem rostos de pessoas.
- Prompts e ids dos jobs: `estudos/biblia-natal/source/PROMPTS.md`.
- **Medalhões do Explorar:** ilustrações geradas por IA (OpenAI `gpt-image-2.5-sunburst-2026-09-08`), conferidas uma a uma e marcadas como "Ilustração" no site. Prompts e revisão: `site/scripts/data/medallions-review.json`.

## Código e dados deste repositório

- **Código-fonte** (`site/`, `scripts/` e o código Python de `estudos/`): licença MIT, ver `LICENSE`.
- **Dados derivados** gerados pelo projeto (`site/src/data/generated/`, `site/public/data/` e o pacote de dados abertos `site/public/dados/v1/`, servido em `/dados` e descrito em `DADOS.md`): CC BY-SA 4.0, ver `LICENSE-DATA.md`. Quem reutilizar mantém os créditos das fontes listados acima.
- **Mídia dos estudos e textos do site:** ainda sem licença definida, o que por padrão significa todos os direitos reservados.
