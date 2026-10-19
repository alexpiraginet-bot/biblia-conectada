# Fontes abertas

Cópias exatas das bases livres usadas, ou planejadas, no site. Foram baixadas em 19/10/2026 e cada arquivo tem SHA-256 em `SHA256SUMS`.

`scripts/fetch_sources.sh` baixa tudo de novo e compara (sai com 1 se algo mudou na origem). Com `--update`, substitui os arquivos. Créditos obrigatórios: `ATTRIBUTION.md`.

## Traduções em português (eBible.org, um versículo por linha: `.txt`, `.xml`, `.sql` + `*_about.htm` com a licença)

| Pasta | Tradução | Licença | Conferido em 19/10 (contra a grade de versículos KJV/OpenBible) |
|---|---|---|---|
| `blivre/` | **Bíblia Livre (BLIVRE)**, texto principal | CC BY 4.0 Brasil | 66 livros, 1.189 capítulos, 31.102 versículos, nenhum vazio. **0 diferenças de numeração** |
| `ebible/porbrbsl/` | Bíblia Portuguesa Mundial | Domínio público (rascunho em revisão) | 81 livros, inclui deuterocanônicos (213 capítulos fora da grade). Nos 66, Rm 16:25–27 aparece como Rm 14:24–26. 29 versículos vazios |
| `ebible/poronbv/` | Biblica® Open Nova Bíblia Viva™ (2007) | CC BY-SA 4.0 | 66 livros. Versículos a mais: Jz 5:32, 1Sm 20:43, 3Jo 1:15 |
| `ebible/porblt/` | Bíblia Livre Para Todos (só NT) | CC BY-SA 4.0 | 27 livros. A mais: 3Jo 1:15, Ap 12:18. 17 vazios |
| `ebible/portft/` | Tradução para Tradutores (só NT) | CC BY-SA 4.0 | 27 livros. 47 capítulos com versículos agrupados (números que faltam na grade) |

Fora: "Novo Testamento: Versão Fácil de Ler" (`por-WBTC`), marcado como não redistribuível no catálogo do eBible.

## Lugares, pessoas, eventos, nomes

| Pasta | Base | Licença | Conteúdo |
|---|---|---|---|
| `openbible-geo/` | OpenBible.info Bible Geocoding Data | CC BY 4.0 | `ancient.jsonl`: 1.342 lugares bíblicos com identificações e grau de confiança. `modern.jsonl`: 1.596 locais modernos com `lonlat` |
| `theographic/` | Theographic Bible Metadata (Viz.Bible) | CC BY-SA 4.0 | 3.067 pessoas, 1.298 lugares (com lat/long), 450 eventos, 23 grupos, 66 livros, 1.189 capítulos, 31.102 versículos (texto KJV + ligações), 6.519 verbetes do dicionário Easton |
| `stepbible/` | STEPBible TIPNR (nomes próprios) | CC BY 4.0 | Todos os nomes próprios (pessoas e lugares) com forma em hebraico/grego, Strong desambiguado e todas as ocorrências. Nomes em inglês (ESV) |

**Nomes em português:** OpenBible, Theographic e TIPNR trazem os nomes em inglês. O nome em PT precisa sair do próprio texto da BLIVRE nos versículos de cada lugar ou pessoa, com revisão humana nos mais citados. Não traduzir de cabeça.

## Referências cruzadas

`estudos/biblia-referencias/data/`:
- `cross-references.zip`: OpenBible.info, CC BY, arquivo de 12/10/2026.
- `openbible-cross_references.txt`: o mesmo, extraído. SHA-256 `2aba58d2adc91609a090f80bb05dfbc7a1518ff10ee798f6b452dfeaf01ccff8`.

Ficam lá porque os vídeos dependem deles. O script de conferência também checa essa cópia.

- 344.799 linhas.
- 301.584 pares únicos (`xref.npz`), com 45 pares de um versículo com ele mesmo.
- Votos vão de −86 a 1.477.
- 30.303 dos 31.102 versículos têm ao menos uma ligação.

## Próximas fontes livres (não baixadas ainda; conferir licença antes)

- **STEPBible:** TAHOT/TAGNT (hebraico/grego marcados), TBESH/TBESG (léxicos), TVTMS (versificação). CC BY 4.0, mesmo repositório do TIPNR.
- **Textos originais:**
  - Westminster Leningrad Codex: domínio público.
  - Morfologia do Open Scriptures Hebrew Bible.
  - SBLGNT.
  - Berean Standard Bible e interlinear: declarados domínio público em 2023.
- **Inglês em domínio público:** KJV, WEB, ASV (todas no eBible).
- **Dicionários e índices antigos (domínio público pela idade):** Nave's Topical Bible, Smith's Bible Dictionary, Hitchcock's Bible Names. O Easton já vem no Theographic.
