# Fontes abertas

Cópias exatas das bases livres do projeto: texto bíblico em 7 línguas, hebraico e grego com morfologia e números de Strong, léxicos, versificação, lugares, pessoas, eventos e referências cruzadas. Cada arquivo tem SHA-256 em `SHA256SUMS` e a licença foi lida no próprio arquivo ou no repositório de origem na data da cópia. O índice legível por máquina é `catalogo.json`.

`scripts/fetch_sources.sh` baixa tudo de novo e compara (sai com 1 se algo mudou na origem). Com `--update`, substitui os arquivos. Créditos obrigatórios: `ATTRIBUTION.md`.

## Texto bíblico (eBible.org, um versículo por linha: `.txt`, `.xml`, `.sql` + `*_about.htm` com a licença)

### Português

| Pasta | Tradução | Licença | Conferido em 19/10 (contra a grade KJV/OpenBible) |
|---|---|---|---|
| `blivre/` | **Bíblia Livre (BLIVRE)**, texto principal do site | CC BY 4.0 Brasil | 66 livros, 1.189 capítulos, 31.102 versículos, nenhum vazio. **0 diferenças de numeração** |
| `ebible/porbrbsl/` | Bíblia Portuguesa Mundial | Domínio público (rascunho em revisão) | 81 livros: 15 deuterocanônicos/apócrifos (213 capítulos fora da grade). Nos 66, Rm 16:25–27 aparece como Rm 14:24–26. 29 versículos vazios |
| `ebible/poronbv/` | Biblica® Open Nova Bíblia Viva™ (2007), leitura integral em `/ler/open-nbv` | CC BY-SA 4.0 | 66 livros, 1.189 capítulos e 31.105 posições com texto. Versículos a mais: Jz 5:32, 1Sm 20:43, 3Jo 1:15 |
| `ebible/porblt/` | Bíblia Livre Para Todos (só NT) | CC BY-SA 4.0 | 27 livros. A mais: 3Jo 1:15, Ap 12:18. 17 vazios |
| `ebible/portft/` | Tradução para Tradutores (só NT) | CC BY-SA 4.0 | 27 livros. 47 capítulos com números de versículo faltando (provavelmente agrupados) |

Fora: "Novo Testamento: Versão Fácil de Ler" (`por-WBTC`), marcado como não redistribuível no catálogo do eBible.

**Integração Open NBV, 21/10/2026:** o VPL preservado em `poronbv_vpl.zip` é importado integralmente e sem reescrita. O build confere o SHA-256 da fonte, todos os textos e os avisos de licença. Leitura, IA e compartilhamento mantêm a edição escolhida. A navegação entre capítulos usa a identidade dos livros e capítulos conferida; o alinhamento de versículos entre edições continua não revisado. A busca por palavras, cronologia e grafos existentes continuam usando a BLIVRE. Ver [importação e diferenças de numeração](../docs/open-nbv-alignment.md). Não é a NVI nem uma tradução criada pelo projeto.

### Línguas originais e antigas

| Pasta | Texto | Licença | Versículos |
|---|---|---|---|
| `ebible/hebwlc/` | Westminster Leningrad Codex (hebraico do AT) | Domínio público | 23.213 |
| `ebible/grcsbl/` | SBL Greek New Testament (SBLGNT, 2010) | CC BY 4.0 (© Society of Biblical Literature e Logos) | 7.939 |
| `ebible/grctr/` | Textus Receptus (grego do NT) | Domínio público | 7.957 |
| `ebible/grclxx/` | Septuaginta (grego do AT, 36 livros) | Domínio público | 27.722 |
| `ebible/latVUC/` | Vulgata Clementina (latim) | Domínio público | 35.809 |

### Inglês e espanhol (domínio público)

| Pasta | Tradução | Versículos |
|---|---|---|
| `ebible/eng-kjv2006/` | King James Version (1769) | 31.102 |
| `ebible/engwebp/` | World English Bible | 31.103 |
| `ebible/engbsb/` | Berean Standard Bible (domínio público desde 2023) | 31.086 |
| `ebible/eng-asv/` | American Standard Version (1901) | 31.102 |
| `ebible/engylt/` | Young's Literal Translation | 31.102 |
| `ebible/spaRV1909/` | Reina-Valera 1909 | 31.102 |

## Hebraico e grego com morfologia e Strong

| Pasta | Base | Licença | Conteúdo (conferido em 19/10) |
|---|---|---|---|
| `oshb/` | Open Scriptures Hebrew Bible (WLC 4.20 + morfologia) | CC BY 4.0 (texto WLC: domínio público) | `wlc/*.xml` em OSIS, 39 livros + `parsing/Oshm.xml`: **23.213 versículos, 306.785 palavras**, cada uma com lema (Strong estendido) e código morfológico |
| `morphgnt/` | MorphGNT (SBLGNT analisado) | Texto SBLGNT CC BY 4.0; análise morfológica CC BY-SA 3.0 | 27 livros, **137.554 palavras em 7.927 versículos**, cada uma com classe, análise, forma, lema |
| `strongs/` | Dicionários de Strong em XML (Open Scriptures) | Domínio público | Hebraico **8.674 verbetes**, grego **5.624 verbetes** |
| `stepbible/` | STEPBible Data (Tyndale House Cambridge) | CC BY 4.0 | Ver abaixo |

### STEPBible (`stepbible/`, commit `ed476a8`)

| Arquivo | Sigla | O que é |
|---|---|---|
| `Translators Amalgamated OT+NT/TAHOT *` (4 arquivos) | TAHOT | AT hebraico, palavra por palavra, com Strong estendido, morfologia e glosa em inglês |
| `Translators Amalgamated OT+NT/TAGNT *` (2 arquivos) | TAGNT | NT grego amalgamado (variantes dos principais textos), com Strong estendido, morfologia e glosa |
| `Lexicons/TBESH`, `Lexicons/TBESG` | TBESH / TBESG | Léxicos breves de Strong estendido, hebraico e grego |
| `Lexicons/TFLSJ *` (2 arquivos) | TFLSJ | Léxico grego completo Liddell-Scott-Jones formatado |
| `Morphology codes/TEHMC`, `TEGMC` | | Expansão dos códigos morfológicos de hebraico e grego |
| `Proper Nouns/TIPNR` | TIPNR | Todos os nomes próprios (pessoas e lugares) com forma em hebraico/grego, Strong desambiguado e todas as ocorrências |
| `Versification/TVTMS` | TVTMS | Mapeamento de versificação entre as tradições inglesa, hebraica, latina e grega |

Fora: as Bíblias árabes marcadas (`Tagged-Bibles/`) e a pasta `Older Formats`.

**Uso nativo no site (26/10/2026):** `/interlinear` apresenta uma coleção inicial alinhada por ID de ocorrência, construída de TAHOT Gen–Deu, TAHOT Job–Sng e TAGNT Mat–Jhn. Hebraico L/Q; grego com seleção SBL explicitamente identificada, sem concatenar variantes de outras edições. O pipeline verifica os hashes já registrados e preserva os campos originais. Glosas e notas PT, com assistência de IA e sem revisão acadêmica independente, ficam separadas em `site/src/data/interlinear-editorial.json`. A leitura de comparação é BLIVRE sem alteração. Não usa dicionário de Strong como substituto de tradução contextual nem presume alinhamento com a Open NBV. Método, limites e transformações: `docs/INTERLINEAR.md`.

## Lugares, pessoas, eventos

| Pasta | Base | Licença | Conteúdo |
|---|---|---|---|
| `openbible-geo/` | OpenBible.info Bible Geocoding Data | CC BY 4.0 | `ancient.jsonl`: 1.342 lugares bíblicos com identificações e grau de confiança. `modern.jsonl`: 1.596 locais modernos com `lonlat` |
| `theographic/` | Theographic Bible Metadata (Viz.Bible) | CC BY-SA 4.0 | 3.067 pessoas, 1.298 lugares (com lat/long), 450 eventos, 23 grupos, 66 livros, 1.189 capítulos, 31.102 versículos (texto KJV + ligações), 6.519 verbetes do dicionário Easton |

A linha do tempo do site usa os 450 eventos do Theographic. As datas seguem a cronologia de Floyd Nolen Jones (readme do Theographic e `docs/chronology-and-dates.md` do repositório deles), em anos astronômicos ISO: `-4003` é 4004 a.C.

**Nomes em português:** OpenBible, Theographic e TIPNR trazem os nomes em inglês. O nome em PT precisa sair do próprio texto da BLIVRE nos versículos de cada lugar ou pessoa, com revisão humana nos mais citados. Não traduzir de cabeça.

## Temas e recepção cultural

| Pasta | Base | Licença | Conteúdo (conferido em 19/10) |
|---|---|---|---|
| `openbible-topics/` | OpenBible.info Topics, `topic-scores.zip` (https://a.openbible.info/data/topic-scores.zip, ligado em https://www.openbible.info/topics/) | CC BY 4.0. O cabeçalho do arquivo diz `# Generated 2026-10-19. CC-BY License: www.openbible.info/topics`; o rodapé do site diz "Unless otherwise indicated, all content is licensed under a Creative Commons Attribution License", com link para a CC BY 4.0 | 71.358 linhas, 6.712 tópicos (todos em inglês), notas de 2 a 100. O arquivo é refeito toda semana; esta cópia é a de 19/10/2026 (`Last-Modified: Mon, 19 Oct 2026 03:29:13 GMT`). O site publica só os tópicos de uma lista revisada, com rótulo em português tirado da BLIVRE (`site/scripts/data/themes.ts`) |
| `wikidata-recepcao/` | Wikidata, duas consultas SPARQL: obras sobre o bom samaritano (`Q261103`) e sobre a criação/"Haja luz" (`Q137651`, `Q2704440`) | CC0 (https://www.wikidata.org/wiki/Wikidata:Licensing: "All structured data (i.e. the main, Property, Lexeme, and EntitySchema namespaces) is released into the public domain under Creative Commons Zero.") | 155 obras (145 pinturas) e 17 obras (10 pinturas), consulta de 19/10/2026. Resposta sem alteração + a consulta (`.rq`) + `LEIA-ME.md`. Não se baixa de novo igual: o Wikidata muda; `scripts/fetch_sources.sh` só confere o SHA-256. `commons-arquivos.json`: licença, autor e data lidos na página de 52 arquivos do Wikimedia Commons (45 em domínio público); só 7 miniaturas puderam ser baixadas (429) e 4 passaram na conferência visual (`LEIA-ME.md` da pasta) |

## Referências cruzadas

`estudos/biblia-referencias/data/`:
- `cross-references.zip`: OpenBible.info, CC BY, arquivo de 12/10/2026.
- `openbible-cross_references.txt`: o mesmo, extraído. SHA-256 `2aba58d2adc91609a090f80bb05dfbc7a1518ff10ee798f6b452dfeaf01ccff8`.

Ficam lá porque os vídeos dependem deles. O script de conferência também checa essa cópia. Os dados derivados (grafo, rankings, imagens) estão em `grafo/`.

- 344.799 linhas.
- 301.584 pares únicos (`xref.npz`), com 45 pares de um versículo com ele mesmo.
- Votos vão de −86 a 1.477.
- 30.303 dos 31.102 versículos têm ao menos uma ligação.

## Ainda não incluído (conferir licença antes)

- Dicionários e índices antigos em domínio público pela idade: Nave's Topical Bible, Smith's Bible Dictionary, Hitchcock's Bible Names. Faltou uma fonte com licença declarada no próprio arquivo.
- Léxico BDB formatado (TFBDB) do STEPBible: ainda não publicado por eles.
- Outras traduções abertas de outras línguas estão no catálogo do eBible (`Redistributable = True`).
