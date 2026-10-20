# HANDOFF: Bíblia Conectada (19/10/2026)

Para quem continua daqui, seja o Claude Code ou uma pessoa. **Ordem de leitura:** este arquivo → `CLAUDE.md` → `design/README.md` → `fontes/README.md` → `ATTRIBUTION.md`.

Tudo o que está marcado como "conferido" foi rodado ou lido em 19/10. O que é proposta está escrito como proposta.

---

## 1. Pedido (palavras do Alex)

- "Separe todos estudos em um html público! Na verdade queria criar um site completo no estilo 'obsidian' que as pessoas podem interagir sobre todas ligações e aprender mais sobre tudo! Algo para aprender e tornar interessante a navegação"
- "Crie um novo repositório e domínio na vercel para publicar isso usando as melhores referências existentes no @21stdev /ui-ux-pro-max /impeccable /taste skill para as melhores referências próximas de alto nível e tudo mais para algo memorável"
- "Salve tudo que já tem no repositório criado e prepare Handoff para seguir pelo code"
- "Crie público como será https://github.com/alexpiraginet-bot/biblia-conectada"
- "Mantenha tudo! A Bíblia não pode ter direitos autorais! Use todas referências existentes no mundo que não dependam de direitos! Vamos tornar tudo público e acessível"
- Descrição do repo, escrita pelo Alex: "Maior grafo do mundo sobre a Bíblia".

**Leitura:** um site público, em PT-BR, para explorar e aprender. Ele parte dos dois vídeos já feitos e usa todas as bases livres que existirem, sem nenhuma dependência de direitos autorais.

---

## 2. Estado em 19/10/2026 (conferido)

**Repo:** `alexpiraginet-bot/biblia-conectada`, público. O Alex criou e deu acesso de escrita ao app do Claude.

**Branch `main`:** commits de 19/10 em cima do "Initial commit" do Alex.
- `estudos/biblia-referencias/`, `estudos/biblia-natal/`, `estudos/biblia-comentarios/`, `estudos/biblia-joao316/` e `estudos/biblia-joao316-ligacoes/`: código, dados, fontes OFL, mídia gerada (recriações, clipes, narrações), vídeos finais e capas.
  - Cópia byte a byte das pastas de trabalho, conferida por SHA-256.
  - Exceções: os textos completos da ACF, AA e NVI (`source/text/`), os caches `__pycache__` e os logs do x264.
- `fontes/`: traduções livres em português, OpenBible geo, Theographic e STEPBible TIPNR, com `SHA256SUMS`.
  - `scripts/fetch_sources.sh` baixou tudo de novo e bateu 19/19 arquivos, mais a base de referências cruzadas.
- `design/`: direção visual e referências do 21st.dev.

**Branch `film-intermediates`:** órfã, 7 commits, 91 arquivos.
- 84 intermediários de render: masters `video.mp4` sem áudio, wav, npy, stills. Os masters estão divididos em partes de 45 MB.
- Foram conferidos remontando cada arquivo a partir do git: 84/84 SHA-256 batem.
- Restauração: `README.md` da branch.

**Correção de portabilidade (`biblia-natal`):** 3 caminhos absolutos do scratchpad da sessão em `film.py`, `mapscenes.py` e `mapgl.py` passaram a apontar para `renders/.stills/`.
- Teste 1: `film.py --still 1.0,31.5` → 2 JPGs, 7,0 s e 3,5 s.
- Teste 2: `--still 1.0,50.0` numa cópia que tinha só `narr.json` → 6,7 s e 14,1 s.
  - Nesse teste o cache `full_dome.npy` foi recalculado (13,6 s) e saiu byte a byte igual ao original.
  - Conclusão: o `main` sozinho já renderiza, e os intermediários só poupam tempo.

**Site (sessão de 19/10, Fases 0 e 1, branch `claude/site-phase-0-1`, PR #1):**
- `site/` existe: Next.js 16.4.2 + React 19.3.1. Páginas: `/` (provisória até o céu entrar), `/sobre`, `/ler`, os 66 livros, os 1.189 capítulos e os versículos (os 200 mais ligados saem no build; os outros na primeira visita, e ficam guardados).
- Pipeline `site/scripts/build-data.ts` + 137 testes (vitest). Detalhes em §5.5.
- `npm run build` passa: dados → testes → `next build` → `check-dist` (créditos e `lang` nas 1.458 páginas geradas, números da home iguais ao `summary.json`, nenhum trecho das citações ACF/AA em 11.588 arquivos entregues).
- **Projeto da Vercel:** criado pelo Alex no painel em 19/10 (`alexpiraginet-bot-biblia-conectada`, time "Lex Technology projects"), ligado ao repo. Root Directory `site` gravada pelo Alex depois do merge do PR #1 no `main` (a lista de pastas do painel só mostra o que existe no `main`). O conector desta sessão só lê (403 ao alterar). Estado e URLs em §9.

**Site, onda C (19/10, noite; branch `worktree-agent-a0016f4647e112bf9`, sem push nem PR):** as cinco frentes da onda B juntas, cada uma com merge commit, mais os ajustes de integração (registro em §12).
- Páginas novas:
  - `/explorar` (redireciona para `/explorar/isaias/9`), `/explorar/<livro>/<cap>` e a conexão escolhida em `/explorar/<livro>/<cap>/<livro2>/<cap2>`: grafo local do capítulo com medalhões. A home ganhou, abaixo da capa, o Explorar de Isaías 9.
  - `/conexao/<a>/<b>`: dois capítulos ou versículos lado a lado, com os pares que os ligam.
  - `/linha-do-tempo` e os 450 eventos do Theographic; `/tema` (85 temas da OpenBible.info Topics) e `/palavra`.
  - `/trilha`, a trilha "Antes do Natal" (26 passos), `/ponte` e `/ponte/<n>` (só até a ponte do dia do build), `/mesa`; tudo sem conta, guardado só no aparelho.
  - Leitura redesenhada (trilho de capítulos, barra de seleção, painel "A partir deste trecho") e `/salvos`.
- Navegação completa: Explorar, Ler, Linha do tempo (só no topo), Arcos, Ponte e Dados (só no topo).
- Fontes novas, com licença conferida e SHA-256: OpenBible.info Topics (CC BY 4.0), Wikidata (CC0) e 4 pinturas do Wikimedia Commons em domínio público. Os medalhões são ilustrações geradas, marcadas como "Ilustração".
- `npm run build` passa: 348 testes, `check-dist` em 2.518 páginas geradas e na 404. `npm run budget`: no máximo 155,4 KiB de JS (home), abaixo do teto de 165. O build com o adaptador da Vercel também passa. Detalhes em §12.

**Site v4, "Atlas" (19 e 20/10, branch `claude/site-phase-0-1`, PR #4):** o design system novo, com tokens de contraste testado nos temas Noite e Dia e as classes `bc-*` em `ds.css`. Todas as páginas foram remodeladas nele, e a busca única ganhou índice de palavras do texto da BLIVRE. Teve QA no navegador e uma revisão final independente. Registro em §12 (20/10); direção em `design/README.md` v4 e `DESIGN.md`.

**Bloqueios desta sessão (políticas, não erros do repo):** a sessão na nuvem não podia criar repositório (403 em `/user/repos`) nem criar Release (403). Por isso o repo foi criado pelo Alex e os intermediários foram para uma branch órfã.

---

## 3. Decisões tomadas

1. **Traduções protegidas ficam fora.**
   - O Alex pediu "Mantenha tudo! A Bíblia não pode ter direitos autorais!". O texto original é de domínio público, mas tradução moderna é obra protegida.
   - Base legal: Lei 9.610/98, art. 7º, XI (traduções são obras protegidas), art. 14 (quem traduz obra em domínio público tem direito sobre a própria tradução) e art. 41 (70 anos após a morte do autor).
   - Publicar o texto completo da ACF, NVI ou AA num repo público pode tirar repo e site do ar.
   - **Ficam:** citações curtas com a fonte (art. 46, III), como as de `verses.json` (só os versículos dos vídeos) e as dos vídeos.
   - **Vão no lugar:** todas as traduções livres achadas (seção 4).
2. **Texto principal do site: Bíblia Livre (BLIVRE, CC BY 4.0).** É a única tradução livre completa com numeração idêntica à da base de referências (0 diferenças em 1.189 capítulos).
3. **Repo leve:** heavy media fora do `main`. Clone raso e deploy da Vercel não baixam a branch `film-intermediates`.
4. **Domínio:** subdomínio gratuito `*.vercel.app`. Comprar domínio só com aprovação do Alex.
5. **Mesma definição dos vídeos para "ligação"** (ver 4.2).
6. **Stack: Next.js** (decisão do Alex em 19/10, numa rodada de perguntas). A recomendação era Astro.
   - Motivo registrado: ganha OG dinâmico por versículo (`next/og`) e segue a skill taste; aceita mais JS e uso de funções.
   - Consequência medida: o runtime do Next manda ~135 KB gzip de JS mesmo numa página sem componente de cliente (§5.6).
7. **Licença** (decisão do Alex em 19/10): MIT no código (`LICENSE`) e CC BY-SA 4.0 nos dados derivados (`LICENSE-DATA.md`).
   - Mídia dos estudos e textos do site continuam sem licença definida.
   - Assumption: o titular no `LICENSE` ficou "Alex Piragine Teixeira". Corrija se o titular for outro (pessoa ou empresa).
8. **Direção visual do Explorar** (decisões do Alex em 19/10, numa rodada de perguntas sobre uma imagem de referência que ele mandou):
   - A imagem é a cara do **site inteiro**. Ela mostra um grafo local centrado numa passagem, com nós em medalhões ilustrados, ligações em ouro e o painel "Conexão selecionada" à direita. A home vira esse Explorar; o céu de arcos dos vídeos vai para `/arcos`; leitura e livros ganham a mesma tipografia e as mesmas cores.
   - O nome continua **Bíblia Conectada**. O "ATLAS" da imagem foi só inspiração.
   - Os medalhões são **ilustrações geradas** com gpt-image na chave OpenAI do Alex: um conjunto pequeno por categoria, em WebP leve, marcadas como ilustração, sem rostos, conferidas uma a uma.
   - **Camadas:**
     - "Texto bíblico" (ligações da OpenBible com votos) e "História" (lugares, pessoas e eventos de bases livres) entram já.
     - "Interpretação" (frases como "o tema do princípio aproxima as duas passagens") vem do assistente da Fase 2b, marcada como gerada por IA e citando os versículos.
     - "Arte e cultura" espera uma base livre conferida.

---

## 4. Dados: o que já foi conferido

### 4.1 Bases disponíveis

- **Fontes abertas:** `fontes/README.md` traz a tabela completa, com licença e conferência de cada uma.
- **Grade de versículos:** a do OpenBible/KJV, com 66 livros, 1.189 capítulos e 31.102 versículos.
  - **BLIVRE:** encaixa 100%.
  - **NBV Open:** tem 3 versículos a mais (Jz 5:32, 1Sm 20:43, 3Jo 1:15).
  - **Bíblia Portuguesa Mundial:** traz Rm 16:25–27 dentro de Rm 14:24–26, mais 15 livros deuterocanônicos/apócrifos (Tobias, Judite, Sabedoria, Eclesiástico, Macabeus…).
  - **BLT (NT):** 2 versículos a mais.
  - **TFT (NT):** 47 capítulos com números de versículo faltando, provavelmente versículos agrupados.
  - **Regra:** a grade KJV é a canônica do site. Versículos fora dela aparecem no texto da tradução, mas sem ligações próprias.

### 4.2 Referências cruzadas

Arquivo `estudos/biblia-referencias/data/xref.npz`, construído por `tools/analyze.py`:

| Array | Tipo | Forma | O que é |
|---|---|---|---|
| `a`, `b` | int32 | (301.584,) | Índice global do versículo (0–31.101) de cada par único. Não vêm ordenados (`a<b` nem sempre). Há 45 pares com `a==b` |
| `votes` | int64 | (301.584,) | Soma dos votos das duas direções (−86 a 1.477) |
| `vmax` | int64 | (301.584,) | Maior voto entre as duas direções |
| `chap_verses` | int16 | (1.189,) | Versículos por capítulo |
| `chap_book` | int16 | (1.189,) | Livro (0–65) de cada capítulo |
| `chap_first` | int32 | (1.189,) | Índice global do 1º versículo do capítulo |
| `book_of_gv` | int16 | (31.102,) | Livro de cada versículo |
| `chap_of_gv` | int32 | (31.102,) | Capítulo de cada versículo |

- `stats.json` traz `books_pt` (nomes em PT), `osis`, `chapters_per_book` e `stats`, com `rows_total` = 344.799.
- **Definição usada nos vídeos (mantenha no site):**
  - "Ligações de um versículo" = parceiros únicos, qualquer voto.
  - "Votos de um par" = soma das duas direções.
  - Filtros por voto positivo podem existir, mas o número mostrado precisa dizer qual definição usa.
- **Conferido:**
  - 30.303 versículos com ao menos uma ligação.
  - Os mais ligados: Is 9:6 (212), 1Pe 2:9 (194), Mt 28:20 (169) e Tt 2:14 (157). **Em 5º há empate em 156:** Is 41:10, Ap 5:9 e Ap 11:15.
    - Correção de 19/10: a versão anterior listava só Ap 11:15 em 5º. O empate saiu do pipeline do site e está no teste `site/tests/data.test.ts`.
  - Os 30.303 versículos com alguma referência são os mesmos 30.303 com ao menos um parceiro diferente deles mesmos (os 45 auto-pares não criam versículo isolado).
  - **Os 45 auto-pares** são linhas em que um versículo aponta um trecho que começa nele mesmo (ex.: `Matt.5.3 → Matt.5.3-Matt.5.12`). Não viram arco: **arcos = 301.539**. No site, "pares de versículos ligados" usa 301.539; os 301.584 "pares únicos" ficam como o número da base/dos vídeos.
  - **Trechos contam pelo primeiro versículo** (como nos vídeos). 88.150 das 344.799 linhas apontam um trecho no "To". Se cada trecho fosse expandido versículo a versículo, Is 9:6 teria 251 parceiros e não seria o mais ligado (Gn 35:22 teria 436, Lc 24:44 409, At 4:27 343; conferido por código em 19/10). Por isso o site sempre diz a convenção junto do número (`summary.json` → `definitions`).
- **Estudo do Natal** (`estudos/biblia-natal/data/natal-stats.json`):
  - 2.094 pares AT ↔ Mt 1–2 e Lc 1–2 (180 versículos). São 2.053 com voto > 0.
  - Esses pares vêm de 1.561 versículos do AT, em 38 livros. Falta Jonas.
  - Pares-chave: Is 7:14 ↔ Mt 1:23 = 333 votos, Mq 5:2 ↔ Mt 2:6 = 226.

### 4.2b Grafo pronto (`grafo/`)

- `grafo/build.py` gera, a partir de `xref.npz`: `dados/arestas.csv` e `arestas.bin` (301.539 pares, sem auto-ligações),
  `versiculos.csv` (grau por versículo), `capitulos.csv` + `capitulos-arestas.csv` + `capitulos.gexf` + `capitulos.json`
  (142.082 arestas), `livros.csv` + `livros-matriz.csv`, `resumo.json`, `RANKINGS.md` e as imagens.
- **O site deve ler `grafo/dados/`** em vez de refazer essas contas (a Fase 1 vira "validar e empacotar", não "calcular").
- `arestas.bin` já está no formato da §5.5.

### 4.3b Hebraico, grego, léxicos (`fontes/`, 19/10)

- OSHB (WLC + morfologia, 306.785 palavras), MorphGNT (137.554 palavras), STEPBible TAHOT/TAGNT (palavra a palavra com
  Strong estendido e glosa), léxicos TBESH/TBESG/TFLSJ, dicionários de Strong, TVTMS (versificação), e textos em
  hebraico, grego, latim, inglês e espanhol. Tabela completa em `fontes/README.md`; índice em `fontes/catalogo.json`.
- Isso abre as notas de **palavra** (lema + Strong + ocorrências) como um tipo de nó do grafo. Fica como Fase 8, depois
  do site estar de pé: 8.674 + 5.624 verbetes de Strong ligados a versículos via TAHOT/TAGNT.

### 4.3 Lugares, pessoas, eventos

- **OpenBible geo:**
  - 1.342 lugares antigos com identificações e confiança.
  - 1.596 lugares modernos com `lonlat`.
  - É a melhor base para coordenadas, porque traz o grau de certeza.
- **Theographic:**
  - 3.067 pessoas, 1.298 lugares, 450 eventos (datas, participantes), Easton (6.519 verbetes) e ligações por versículo.
  - É CC BY-SA, então os dados derivados dele saem CC BY-SA 4.0.
- **TIPNR (STEPBible):** todo nome próprio, com hebraico/grego e todas as ocorrências.
- **Pendência de dados:**
  1. Unir os lugares do OpenBible e do Theographic por versículos em comum e semelhança de nome. Marcar os casos incertos.
  2. Tirar o nome em PT do texto da BLIVRE (palavra com maiúscula comum aos versículos do lugar ou pessoa).
  3. Revisão humana dos ~150 mais citados.

---

## 5. O site (proposta)

### 5.1 Para quem e para quê

- **Público:** gente vinda dos Reels, no celular e com 4G, e estudantes.
- **Trabalho principal:** abrir um versículo e seguir as ligações.
- **A coisa memorável:** o céu de ligações, os arcos do vídeo 1 vivos (`design/README.md` §1).

### 5.2 Notas e ligações (modelo Obsidian)

| Tipo de nota | Quantidade | Ligações |
|---|---|---|
| Livro | 66 | Capítulos; livros mais ligados (agregado) |
| Capítulo | 1.189 | Versículos; capítulos mais ligados |
| Versículo | 31.102 | Referências cruzadas (saída/entrada, votos), pessoas, lugares, eventos |
| Pessoa | Até 3.067 | Versículos, família, lugares, eventos |
| Lugar | Cerca de 1.300 após unir as bases | Versículos, pessoas, eventos, mapa |
| Evento | 450 | Versículos, pessoas, lugares, linha do tempo |
| Estudo | 3 (vídeos) | Versículos, lugares, números do estudo, @ dos comentários (vídeo 3) |

Toda nota tem:
- Ligações de saída e de entrada (backlinks).
- Grafo local de 1 a 2 níveis.
- Prévia ao passar o mouse ou focar (no celular, um toque abre o sheet).

### 5.3 Visões

1. **Ler:** livro → capítulo com texto BLIVRE e painel de ligações.
2. **Grafo:** 1.189 capítulos como estrelas, livros como constelações. O zoom chega aos versículos.
3. **Arcos:** os 301.539 pares de versículos ligados, interativos.
4. **Mapa:** lugares com relevo noturno e as rotas dos estudos.
5. **Linha do tempo:** eventos (fase 2).
6. **Busca ⌘K.**
7. **Estudos.**

### 5.4 Stack (decidida em 19/10: Next.js)

**Decisão do Alex: Next.js 16 (App Router) na Vercel.** O texto abaixo, até "Alternativa", era a recomendação anterior (Astro) e fica como registro do trade-off.

Como o Next fica neste projeto:
- Páginas de livro e capítulo pré-renderizadas no build (`generateStaticParams`), como Server Components. Nada de JS de cliente na leitura além do runtime.
- Componentes de cliente só nas ilhas: sheet de ligações, prévia, ⌘K e as visões WebGL (essas com `import()` dinâmico).
- OG: `next/og` gerado no build para livros, estudos e os ~200 versículos mais ligados.
- `cacheComponents` e `partialPrefetching` vieram ligados no modelo do `create-next-app` 16.4.2 e ficaram. Medido: não mudam o tamanho do JS (§5.6).
- O Next 16 tem APIs novas: o guia está em `site/node_modules/next/dist/docs/`.

**Registro: a recomendação era Astro (site estático) com ilhas interativas.**
- Ilhas em TypeScript. React só onde compensar, como a paleta ⌘K e o hover card.
- Por quê:
  - O site é de conteúdo, e páginas estáticas aguentam um viral sem custo de função.
  - O JS mínimo nas páginas de leitura importa pra quem chega do Instagram no 4G.
  - A interatividade pesada é toda client-side e independe de framework.

**Alternativa: Next.js na Vercel.** A skill taste prefere essa stack. Ganha OG dinâmico por versículo (ISR + `@vercel/og`), mas paga com mais JS e uso de funções. Se escolher Next, registre o motivo aqui.

**Peças:**

| Peça | Escolha |
|---|---|
| Grafo | sigma.js + graphology, com layout ForceAtlas2 pré-calculado no build (semente fixa) |
| Arcos | WebGL2 próprio: arcos instanciados com brilho aditivo e LOD no celular (top-N por voto, depois progressivo) |
| Mapa | MapLibre GL JS sem chave de API |
| Busca | MiniSearch ou FlexSearch, com índice gerado no build e carregado sob demanda, mais um parser de referência PT com testes |

Para o mapa, a base sai de Natural Earth simplificado (já está em `estudos/biblia-natal/data/`). O relevo vem de tiles terrarium, que o MapLibre lê como `raster-dem`. O cache atual cobre só as regiões dos vídeos; para o resto, baixar do dataset aberto da AWS com atribuição.

Confirme a versão de cada pacote no npm na hora de instalar e trave no lockfile.

**Não gerar 31.102 páginas.**
- Página estática por livro e por capítulo.
- `/:livro/:cap/:vers` reescreve para a página do capítulo, com o versículo em foco: `rewrites` no `vercel.json` ou rota do framework.
- O canonical aponta para o capítulo.
- OG: gerar para livros, estudos e os ~200 versículos mais ligados. O resto usa o OG do capítulo.

**URLs:**
- `/` (céu de ligações + busca)
- `/isaias/9` e `/isaias/9/6`
- `/is/9/6` redireciona para `/isaias/9/6`
- `/lugar/belem`, `/pessoa/davi`, `/evento/<slug>`, `/estudo/antes-do-natal`
- `/grafo`, `/arcos`, `/mapa`, `/sobre`

Slugs dos livros a partir de `books_pt`, sem acento, com hífen.

### 5.5 Pipeline de dados (`site/scripts/build-data.ts`, feito em 19/10)

**Como está:** `npm run data` (roda sozinho antes de `npm test` e de `npm run build`). Leva ~5 s. Lê só `fontes/` e `estudos/*/data/` e **falha** se:
- a BLIVRE não encaixar na grade (livro, capítulo ou versículo a mais, a menos, repetido ou vazio);
- o SHA-256 das referências cruzadas mudar;
- linhas, pares, auto-pares ou versículos com referência divergirem do `stats.json`, ou os pares divergirem do `xref.npz` elemento a elemento;
- os números do Natal (incluindo o top 40) divergirem do `natal-stats.json`;
- a linha de crédito da BLIVRE no `ATTRIBUTION.md` divergir da página "about" dentro do zip.

Saídas (fora do git; a Vercel gera de novo) e o que ficou para depois estão em `site/README.md`. Ficaram para as fases donas delas: índice de busca em pedaços (Fase 3) e lugares/pessoas (Fase 5).

**Plano original:**

**Entradas:** `fontes/` e `estudos/*/data/`. Hoje não tem nada gerado à mão.

**Saídas:**
- `src/data/` (lido no build): livros, capítulos com texto e ligações principais.
- `public/data/` (lido pelo navegador sob demanda):
  - `arcs.bin`: Uint16 `a`, Uint16 `b`, Int16 `votes`, sem os 45 auto-pares. Cerca de 1,8 MB.
  - Grafo de capítulos com posições.
  - Índice de busca em pedaços.
  - Lugares e pessoas.

**Testes obrigatórios (falham o build):**
- 31.102 versículos e 1.189 capítulos.
- 301.584 pares antes do filtro de auto-pares.
- Is 9:6 = 212.
- 2.094 pares no recorte do Natal.
- Créditos presentes no HTML.
- Nenhum arquivo de tradução protegida em `fontes/` ou `public/`.

**Testes feitos (todos passam, 137 em 19/10):**
- os seis acima;
- o parser de referências, os caminhos de URL, os atalhos `/is/9/6` e a tabela de livros (`site/tests/reference.test.ts`);
- a simetria das ligações, `arcs.bin` decodificado igual ao `xref.npz`, o grafo de capítulos somando todos os pares, listas do topo sem cortar empate e o SHA-256 de cada saída;
- os capítulos ligados que as páginas calculam na hora iguais ao `chapter-links.json` e ao `chapter-pairs.json` nos 1.189 capítulos; a paleta e o peso dos arcos iguais ao `film.py`/`arcs.py` (`site/tests/reading.test.ts`);
- trava contra tradução protegida: sequências de 6 palavras das citações ACF/AA que a BLIVRE não tem não aparecem nas saídas nem em `src/` (`site/scripts/data/leak-guard.ts`).

No fim do build, `site/scripts/check-dist.ts` confere créditos e `lang` em todas as páginas geradas, os números da home, e passa a mesma trava em tudo o que o servidor e o navegador recebem (`.next/server`, `.next/static`, `public/`).

### 5.6 Orçamento e qualidade

- **Desempenho:**
  - Página de leitura com até cerca de 100 KB de JS (gzip). **Não cabe no Next.js** (medido em 19/10 com `npm run budget`): a home provisória, sem nenhum componente de cliente, já manda 135,1 KB gzip (navegador moderno; os polyfills `noModule` ficam fora). Desligar `cacheComponents`/`partialPrefetching` deu 134,7 KB.
    - Proposta (decisão do Alex): orçamento = runtime medido + até 25 KiB gzip de JS próprio (total ≤ 165 KiB), conferido por `npm run budget` a cada fase.
    - Medido em 19/10 nas páginas de leitura: versículo 145,3 KiB, capítulo 143,8, livro 142,9 (runtime + 10,2 KiB próprios no pior caso). HTML gzip: no máximo 43,3 KB (Salmos 119, 176 versículos), Isaías 9:6 27 KB.
    - O HTML chega pronto: o texto aparece sem esperar o JS. O custo do runtime cai na hidratação (interatividade), não na primeira pintura.
  - LCP < 2,5 s em 4G simulado e CLS < 0,1.
    - Lighthouse 13.5.0, celular simulado, servidor local (19/10): Isaías 9 LCP 2,4 s; Isaías 9:6 3,2 s; Salmos 119 2,6 s; livro Isaías 2,4 s. CLS 0 em todas. **Isaías 9:6 e Salmos 119 passam da meta.**
    - Causa achada: o manifesto de fontes do Turbopack pré-carrega fontes fora da rota que as usa (a Cormorant da home em todas as páginas; a Literata também nas páginas de livro), e elas disputam banda com o CSS. A Cormorant sai com a home nova (o céu não a usa). A Literata nas páginas de livro fica como pendência: mover a declaração para um módulo próprio não mudou o manifesto.
  - Visões WebGL carregadas sob demanda.
- **Acessibilidade:** checklist em `design/README.md` §8, incluindo alternativa em lista para grafo, arcos e mapa.
- **Telas a conferir:** 375 px e 1440 px, temas Noite e Dia, e `prefers-reduced-motion`.

---

## 6. Plano em fases (cada uma termina com evidência)

**Andamento (19/10):**
- Fase 0 feita, menos o projeto da Vercel e a URL de preview (bloqueio em §9).
- Fase 1 feita: testes verdes, contagens batendo, nenhum número escrito à mão no site.
- Fase 2 (leitura) feita, exceto a prévia na Vercel:
  - livro, capítulo e versículo com o texto BLIVRE; contagem de ligações na margem; painel (coluna no desktop, folha no celular); prévia no hover; deep link `/livro/cap/vers`; atalhos `/is/9/6`;
  - arcos do versículo, do capítulo e do livro desenhados como no vídeo 1 (SVG feito no servidor);
  - telas em 375 e 1440 px, Noite e Dia, conferidas;
  - teclado e folha testados: foco no título, fundo inerte, Esc fecha e devolve o foco ao contador;
  - Lighthouse acessibilidade 100 nas 6 páginas, celular e desktop (13.5.0, 19/10);
  - detector do impeccable sem achados.
- Fase 4 (céu na home) em andamento.
- **Onda C (19/10, noite):** a onda B entrou numa branch só, ainda sem prévia na Vercel (branch sem push).
  - Fase 2: leitura v2 (trilho de capítulos, painel "A partir deste trecho / deste capítulo", barra de seleção) e `/salvos`.
  - Fase 4: o céu está em `/arcos` e a home virou capa + Explorar de Isaías 9 (§3.8). O Explorar e `/conexao` fazem o grafo local de cada capítulo; o `/grafo` com os 1.189 capítulos ainda falta.
  - Visão 5 da §5.3 feita: linha do tempo com os 450 eventos, mais temas e palavras.
  - Fase 5 começou pelos lugares dos eventos: 1.119 nomes tirados do texto da BLIVRE, com os 45 mais citados conferidos em teste. Mapa e notas de lugar e pessoa ainda faltam.
  - Fora da tabela: comunidade sem conta (trilha "Antes do Natal", Ponte nº N, Mesa da semana) e os medalhões do Explorar.
  - Conferido em 375 e 1440 px, Noite e Dia, em todos os tipos de rota (capturas fora do repo). **Pare e mostre ao Alex** antes de publicar.

| Fase | Entrega | Critério de aceite |
|---|---|---|
| 0. Arranque | Skills instaladas (§7). `site/` criado (stack decidida e registrada aqui). Projeto Vercel `biblia-conectada` ligado ao repo, com Root Directory `site` | `npm run build` passa. Preview `*.vercel.app` responde 200. Comandos documentados no `CLAUDE.md` |
| 1. Dados | `build-data` + testes da §5.5. Tabela de livros PT com abreviações e parser de referência ("Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13") | Testes verdes. Contagens batendo. Nenhum número escrito à mão |
| 2. Leitura | Páginas de livro e capítulo (BLIVRE). Painel de ligações com votos. Backlinks. Prévia. Deep link de versículo. Créditos no rodapé e em `/sobre` | Screenshot 375/1440 nos dois temas. Navegação por teclado. Lighthouse acessibilidade ≥ 95 |
| 2b. Assistente de estudo (IA) | Perguntas sobre um versículo ou tema, respondidas só com o que o site tem: texto BLIVRE e ligações. Plano abaixo da tabela | Toda resposta cita versículos com link e nada fora deles. Teste com perguntas que pedem invenção (deve recusar). Limite por visitante e de tamanho funcionando. Chave só no servidor |
| 3. Busca ⌘K | Referências, livros, texto, lugares e pessoas, com os recentes | Casos de teste do parser. Busca de texto carregando sob demanda |
| 4. Arcos + Grafo | Céu de ligações na home, `/arcos` e `/grafo` | 60 fps no desktop e fluido no celular médio (com LOD). Alternativa em lista. Movimento reduzido respeitado |
| 5. Mapa + Pessoas/Lugares | Base unida (§4.3), nomes PT revisados nos ~150 principais, notas de lugar e pessoa, mapa com relevo e rotas dos estudos | Nomes PT tirados do texto. Lista de incertos registrada |
| 6. Estudos + Home | Páginas dos 3 vídeos (números do `natal-stats.json` e do `stats.json`) com "abrir no grafo" | Vídeo leve (poster + `preload="none"` ou link para o post) |
| 7. Polimento e produção | `/impeccable audit` → `polish`. OG. Performance. Deploy de produção | Checklists da §5.6. URL de produção enviada ao Alex |

**Pare e mostre ao Alex ao fim das Fases 0, 2 e 4.** Mostre screenshots e a URL de preview.

**Plano da Fase 2b (assistente), pedido pelo Alex em 19/10:**
- **Base:** responde só com o texto citado. O servidor junta o versículo ou capítulo em foco, as ligações dele (OpenBible.info) e o texto BLIVRE desses versículos, e manda isso ao modelo. Cada afirmação aponta o versículo com link (`/isaias/9/6`). Não inventa citação, não usa tradução protegida (§3), não cita o que não veio no contexto.
- **Tom:** humilde, de estudo. Quando cristãos leem de jeitos diferentes, mostra as leituras sem escolher uma. Não substitui pastor nem igreja. Diz "não sei" quando o texto não responde.
- **Custo:** teto de US$ 20 por mês que o Alex define no console da Anthropic (limite de gasto da organização). No site: limite de perguntas por visitante (por IP, janela de tempo) e limite de tamanho da resposta (`max_tokens`). Se o teto bater, a página diz que o assistente voltou a dormir até o mês seguinte.
- **Chave:** só na variável de ambiente `ANTHROPIC_API_KEY` da Vercel (criptografada, lado do servidor), colada pelo Alex no painel. Nunca no repositório, em log ou no navegador.
- **Antes de começar:** o Alex precisa revogar a chave que colou no chat de 19/10 e gerar outra (§8). Ao implementar, consultar a skill `claude-api` para modelo e preço do momento.

---

## 7. Skills e ferramentas para o Claude Code

Instalar e conferir o repositório de cada uma antes. Os comandos vieram de páginas de terceiros em 19/10.

**Instaladas em 19/10 (sessão na nuvem, escopo de usuário `~/.claude/skills/`, fora do repo):** impeccable (`pbakaus/impeccable` @ `0665bd8`, licença Apache-2.0), design-taste-frontend (`leonxlnx/taste-skill` @ `b9ca2fd`, MIT) e ui-ux-pro-max (`nextlevelbuilder/ui-ux-pro-max-skill` @ `56ea9cf`, MIT, com o CLI `scripts/search.py`). Na nuvem o container é descartado: numa sessão nova, instale de novo com os comandos abaixo (no lugar do `/plugin` do ui-ux-pro-max, use `npx -y skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -a claude-code -g -y --copy`).

```bash
# ui-ux-pro-max completo (a cópia sincronizada aqui só tinha o SKILL.md, sem o CLI de design system)
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
#   depois: python3 .claude/skills/ui-ux-pro-max/scripts/search.py "knowledge graph bible study dark" --design-system -f markdown
# impeccable (Paul Bakaus): /impeccable shape, craft, polish, audit, critique…
npx skills add pbakaus/impeccable
# taste (design-taste-frontend)
npx -y skills add leonxlnx/taste-skill --skill design-taste-frontend --agent claude-code
```

- **frontend-design** (Anthropic) também se aplica. Os princípios já estão resumidos em `design/README.md`.
- **21st.dev:** o MCP do 21st funcionou nesta sessão (busca grátis de metadados). Os resultados estão em `design/referencias.md`.
  - Para pegar código: `get_component` gasta uma das retiradas diárias.
  - O comando de instalação usa `API_KEY_21ST`, que nunca vai pro repo.

---

## 8. Decisões pendentes do Alex

1. ~~Licença do código e dos dados derivados~~: decidida em 19/10 (§3.7). Falta decidir a licença da mídia dos estudos e dos textos do site.
2. **Plano da Vercel.** O Hobby é para uso pessoal não comercial. Se o site for divulgar negócio (perfil comercial, venda), conferir os termos e talvez ir pro Pro.
3. **Domínio próprio:** só se ele quiser e aprovar a compra.
4. ~~Stack~~: Next.js, decidido em 19/10 (§3.6).
6. **Orçamento de JS** com Next.js (§5.6): aceitar "runtime medido + até 25 KiB de JS próprio (total ≤ 165 KiB)" ou outra regra.
7. **Projeto da Vercel** (§9): criar no painel ou dar ao conector permissão de criar projetos.
8. **Chaves expostas (urgente):** revogar e trocar (a) a chave da Anthropic colada no chat em 19/10, (b) a segunda chave da Anthropic, mandada num arquivo anexo no mesmo dia, e (c) a chave da OpenAI que aparece em texto puro no `SKILL.md` da skill gpt-image sincronizada nesta conta. Nenhuma delas foi gravada no repositório. A chave nova da Anthropic vai só para a variável `ANTHROPIC_API_KEY` da Vercel (criptografada). Definir no console o teto de US$ 20/mês (Fase 2b).
5. **Tom do texto** do site. Proposta: claro, de estudo, sem jargão, sem "maior do mundo" sem prova.
9. **Medalhões no tema Dia** (onda C): as ilustrações foram feitas sobre o azul-marinho do Noite e aparecem como moedas escuras sobre o pergaminho. Manter assim ou gerar uma versão clara.
10. **Pontes futuras** (onda C): as páginas `/ponte/<n>` só existem até o dia do build, mas `public/data/ponte/calendar.json` e os 365 arquivos `public/data/ponte/<n>.json` já trazem todas as pontes do ano para quem abrir os arquivos. Aceitar (o jogo é de honra) ou servir o calendário aos poucos.
11. **Design v4 ("Atlas"):** doze escolhas abertas em `design/README.md` §14, entre elas:
    - o botão principal verde no Dia;
    - os 10 períodos da linha do tempo;
    - os títulos de evento em inglês;
    - a busca por palavra exata;
    - a escultura de `/arcos`: abrir em Isaías 9:6 aceso ou na Bíblia inteira, e o tema Dia em gravura ou com céu noturno;
    - o mapa da leitura azul-marinho nos dois temas.
12. ~~`/arcos` sem GPU~~: feito em 20/10 a pedido do Alex (PR #5). Sem GPU de verdade, o céu fica no pôster; aparelhos com GPU bloqueada também veem o pôster. A escultura 3D segue a mesma regra (design §15.6).

---

## 9. Deploy na Vercel (passo a passo)

1. Dar acesso do app da Vercel ao repo, se a instalação estiver em "repositórios selecionados". É o mesmo tipo de passo que o Alex fez para o Claude.
2. Criar o projeto `biblia-conectada`:
   - Framework: Next.js. Root Directory: `site`.
   - Install `npm ci`, build `npm run build` e o Ignored Build Step já vêm de `site/vercel.json`; não precisa mexer no painel.
   - A opção que inclui arquivos fora da Root Directory precisa estar ligada, porque o build lê `../fontes` e `../estudos`. Confira.
   - **Estado em 19/10 (tarde):** o Alex criou o projeto `alexpiraginet-bot-biblia-conectada` (`prj_86CqaGK6jk98KjoTbUXPrlnnzCuD`, time "Lex Technology projects", `team_imSH7u74mbysZKluH23ZCgsN`, plano Pro que já era do time; nada foi contratado).
     - O import criou o projeto com a raiz do repo e o preset Python (a lista de pastas do import vem do `main`, que ainda não tem `site/`). Todo deploy falha com `PYTHON_ENTRYPOINT_NOT_FOUND`. A Root Directory `site` só pôde ser escolhida depois do merge do PR #1 no `main`, porque a lista de pastas do painel vem do `main`. Com `site` gravado, o preset Python do painel não importa, porque `site/vercel.json` fixa `framework: nextjs`.
     - Um segundo projeto, `estudos` (raiz em `estudos/`), foi criado por engano no import e apagado pelo Alex.
     - O conector da Vercel desta sessão lê projetos, deploys e logs, mas recebe 403 ao alterar o projeto: mudanças de configuração ficam com o Alex.
     - No build da Vercel o Next usa o adaptador da Vercel ("Applying modifyConfig from Vercel" no log), que grava o HTML das páginas em `.next/server/route-cache/APP_PAGE/<hash>/$/` e na saída `.next/output/`, e nada em `.next/server/app/`. O `check-dist` lê as páginas pelos dois formatos (`site/scripts/checks/pages.ts`); reproduzido aqui com o pacote `@vercel/next` 23.0.3 via `NEXT_ADAPTER_PATH`.
3. URLs: produção `alexpiraginet-bot-biblia-conectada.vercel.app` (serve o `main`; só mostra o site depois do merge do PR #1). Prévia da branch do PR: `alexpiraginet-bot-biblia-conectada-git-claud-bf2a0a-lexprojects.vercel.app`, protegida por login da Vercel (Vercel Authentication do time).
4. **Caminhos para criar e deployar o projeto:**
   - Integração Git, onde todo push no `main` gera produção.
   - CLI: `npx vercel` em `site/`, com login na máquina.
   - Conector da Vercel (MCP), se a sessão tiver.
5. Nunca guardar token no repo.
6. **Tamanho:** o `main` tem cerca de 366 MB (471 arquivos), por causa da mídia dos estudos e das fontes. O maior arquivo tem 35,5 MB.
   - Ignored Build Step: feito em `site/scripts/vercel-ignore.sh` (via `site/vercel.json`). Pula o build só quando nada em `site/`, `fontes/`, `estudos/*/data/` ou `ATTRIBUTION.md` mudou desde o último deploy da branch; na dúvida, builda.
   - Se o clone pesar no tempo de build, dá pra decidir depois tirar a mídia dos estudos do `main`.

---

## 10. Pendências dos vídeos (fora do site)

1. **Sotaque da narração.** O Alex disse: "O sotaque do narrador tem mudanças e falhas principalmente no começo".
   - **Diagnóstico:** a voz "Andre" (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`) é nativa de inglês. O Whisper reconheceu a prévia da voz como inglês com 0,996. O modelo multilíngue escorrega no PT-BR, mais no começo.
   - **Opções (nenhuma aprovada):**
     - (a) TTS nativo PT-BR + `voice_change` para o timbre do Andre.
     - (b) Uma voz nativa PT-BR. Não clonar voz de dublador real.
     - (c) Andre com frase de aquecimento e várias tomadas, escolhidas por métrica objetiva.
   - **Se o tempo das falas for preservado** (o `voice_change` preserva): basta restaurar o master da branch `film-intermediates` e rodar `score.py` → `finalize.py`.
   - **Se o tempo mudar:** `narration.py` + `film.py` (~33 min) + `score.py` + `finalize.py`.
2. **Antes de postar:** ouvir o áudio (voz e música só foram medidas, não ouvidas) e confirmar em qual perfil vai cada vídeo.

---

## 11. Como começar no Claude Code

Abra uma sessão neste repositório (web ou desktop) e cole:

```
Continue o projeto biblia-conectada. Leia HANDOFF.md, CLAUDE.md, design/README.md e fontes/README.md.
Depois: (1) instale as skills do HANDOFF §7 e rode o design system do ui-ux-pro-max e /impeccable shape para revisar
design/README.md — registre o que mudar e por quê; (2) faça a Fase 0 e a Fase 1 do HANDOFF §6.
Pare ao fim da Fase 1 e me mostre: estrutura criada, comandos rodados com as saídas, testes, URL de preview.
Regras: só fontes livres; números só de código; subdomínio grátis da Vercel; nada de compra; commits em inglês.
```

Clone leve (sem os 530 MB de intermediários):

```bash
git clone --depth 1 https://github.com/alexpiraginet-bot/biblia-conectada
```

---

## 12. Registro

- **18/10:** vídeo "A Bíblia, conectada" entregue.
- **19/10:**
  - Vídeo "Antes do Natal, já estava escrito" entregue (com abertura em flash-forward).
  - O Alex aponta problemas no sotaque da narração (diagnóstico em §10).
  - O Alex pede o site estilo Obsidian, depois repo + Vercel, depois "salve tudo + handoff".
- **19/10, sessão de handoff:**
  - O Alex criou o repo público e liberou o app do Claude.
  - Subiram os estudos (4 commits), as fontes livres (1) e os documentos (1).
  - Intermediários foram para a branch órfã, porque a sessão não podia criar Release.
  - Traduções protegidas ficaram fora (§3).
- **19/10, sessão das Fases 0 e 1:**
  - Skills do §7 instaladas e conferidas. Design system do ui-ux-pro-max e `/impeccable shape` rodados; revisão registrada em `design/README.md` §10.
  - O Alex escolheu Next.js e a licença MIT + CC BY-SA 4.0, e listou o que faria o site parecer errado: app devocional genérico, dashboard tech frio, perder a cara dos vídeos, lento no celular.
  - `site/` criado com pipeline de dados, parser de referências e 82 testes. PR #1 em rascunho.
  - Verificação adversarial independente (recontagem em Python, fuzz do parser, fidelidade ao `analyze.py`, auditoria das regras). Achados corrigidos: a home usava 301.584 (com os 45 auto-pares) como "pares ligados"; a lista dos mais ligados e o top 40 do Natal cortavam empates; a convenção de trechos não estava dita.
  - Achados: empate em 5º lugar (§4.2) e runtime do Next acima do orçamento de JS (§5.6).
  - Vercel bloqueada por permissão do conector (§9).
- **19/10, mesma sessão, leitura e céu:**
  - O Alex pediu mais cuidado ("tá muito amador"), o céu da home + as páginas de leitura agora, e o assistente de IA logo depois (Fase 2b), só com o texto citado e teto de US$ 20/mês. Ele colou uma chave da Anthropic no chat: não foi gravada em lugar nenhum; precisa ser revogada (§8).
  - Fase 2 feita (ver andamento em §6). Arcos do vídeo 1 nas páginas de versículo, capítulo e livro.
  - Segunda verificação adversarial. Achados corrigidos:
    - o parser caía em outro livro ("Jo 2:28" abria Joel 2:28; "Jó 1:23" abria João 1:23);
    - `/sobre` dizia "22 versículos" da ACF/AA (são 21, mais uma lista de nomes de livros);
    - a licença dos dados não separava o texto BLIVRE (CC BY 4.0);
    - as fontes perdiam os campos de licença no subset;
    - faltava o link da OpenBible.info no rodapé.
  - Novo: trava contra vazamento de tradução protegida. Sequências de 6 palavras das citações ACF/AA que a BLIVRE não tem são procuradas nos testes e em tudo o que o build entrega; testado com um vazamento de propósito.
  - O céu está sendo feito em paralelo (worktree separada) e entra depois de revisado.
- **19/10, mesma sessão, direção visual, céu e capa:**
  - O Alex mandou três imagens de referência e decidiu (§3.8): site inteiro nesse estilo, nome Bíblia Conectada, home vira o Explorar, céu em `/arcos`, medalhões gerados, camadas texto + história agora.
  - Céu de ligações (WebGL2, pôsteres AVIF/WebP, seleção por arraste e teclado) entrou em `/arcos` (merge `f05b788`).
  - Capa da home a partir do componente "Aurelia" (21st.dev) que o Alex mandou. Sem GSAP e sem Tailwind:
    - o site não usa Tailwind nem shadcn; tem CSS modules e tokens próprios;
    - GSAP 3.15.0 + ScrollTrigger medem 46.266 B gzip, acima do orçamento de JS próprio (§5.6);
    - a licença do GSAP ("Standard no-charge") não é de código aberto.
  - A luz do horizonte é Isaías 9:6, com os 212 arcos subindo atrás das colinas, como na cena final do vídeo 1.
  - Desempenho:
    - A primeira versão redesenhava a paisagem a cada quadro: TBT 6,7 s no Lighthouse celular.
    - Agora o canvas é desenhado uma vez, em três camadas, e os arcos nascem por recorte CSS: celular 94–97 (TBT 160–250 ms, LCP 2,0–2,3 s, CLS 0), desktop 100, acessibilidade 100.
  - Depois o Alex pediu "muito Motion vivo": o céu da capa passou a WebGL2.
    - Na GPU: estrelas, pulsos de luz nos arcos, véu dos pares mais votados, colinas com paralaxe, névoa e granulação.
    - Sem GPU real cai na cena parada. Lighthouse: celular 94–96 (TBT 130–220 ms), desktop 100.
    - Conferido só em Chromium sem GPU, com o céu vivo forçado; não testado em GPU real (§5.6).
  - O Alex mandou também o "Atlas Design Kit v2". Ele foi lido e não adotado como direção, porque diz que a direção ainda não fora escolhida e as imagens do Alex já escolhem. Aproveitado: as quatro categorias de ligação com padrão de linha, a regra de fonte e estado editorial, as regras do grafo e as fontes Newsreader e Instrument Sans como candidatas (análise em andamento).
- **19/10, mesma sessão, "junte tudo" (fundação, onda A):**
  - O Alex pediu o céu "com muito Motion vivo", dados do repositório caprichados para outros criarem a partir deles, e "juntar tudo" com as melhores ideias. Ele mandou também um arquivo com outra chave da Anthropic: não foi usada nem gravada, e precisa ser revogada (§8).
  - Fundação comum, antes das telas novas: cores novas (Noite `#051219` e ouro; Dia em pergaminho liso com bronze, vinho e verde), Newsreader nos títulos, kicker, navegação única (topo no desktop, barra de baixo no celular) e lista de rotas reservadas com teste. Registro em `design/README.md` §3–§5 e §13 (v3).
  - O pergaminho saiu da lista do "app devocional genérico" (A1), porque as referências do Alex usam pergaminho no Dia. Continua proibido como textura ou moldura.
  - Novo teste de contraste dos tokens (`site/tests/tokens.test.ts`); ele achou um par ruim antes de qualquer tela usar (rótulo claro sobre o verde no Noite, 3,02:1), já corrigido.
  - A navegação lista só seções com página (hoje Ler, Arcos e Dados; um teste confere). Explorar, Linha do tempo e Ponte entram quando as páginas da onda B chegarem.
- **19/10, manhã (outra sessão, direto no `main`):**
  - Vídeo 3, "Os versículos de vocês" (`estudos/biblia-comentarios/`): resposta aos comentários do vídeo 1, 19 mapas com @.
  - **Padrão novo do Alex: todo vídeo tem narração, sempre com o mesmo narrador (Andre).** O sotaque foi tratado com
    números por extenso, frase de aquecimento e escolha de tomada por métrica (`tools/takes.py`).
  - O Alex pediu "o estudo mais completo existente" dentro do GitHub: entraram as bases abertas de hebraico/grego,
    léxicos e traduções em domínio público (ver `fontes/README.md` e `fontes/catalogo.json`).
- **19/10, tarde, 404 no ar:**
  - O Alex abriu o site pelo navegador do Instagram e caiu na 404 padrão do Next.js: branca, em inglês, com "Ler" aceso na barra. Não deu para saber o endereço: a Vercel não mostra os acessos (sem logs de função nem observabilidade). Um rastreio do site no ar (1.264 páginas, 32.364 links) não achou link quebrado, e a navegação no celular funciona.
  - Correção:
    - Página 404 própria, em português e nos temas Noite e Dia, com caminhos de volta.
    - Endereço "solto" vai para a página certa (redirect 307), desde que a referência exista: `/Isaías/9/6`, `/isaias/9/6)` (pontuação colada pelo app de mensagem), `/Is 9:6`, `/1-co-13`, `/judas/3` (`site/src/lib/canon/loose.ts`).
    - "Ler" só fica aceso em página de leitura que existe; na 404 nenhum item fica aceso.
  - Achado do Next 16: `notFound()` numa rota de leitura com PPR devolve um documento vazio (`__next_error__`) que o navegador monta. O script do tema não roda nesse caso, e por isso o `ThemeToggle` reaplica o tema salvo antes da primeira pintura (`useLayoutEffect`). Sem JavaScript, essa 404 fica em branco; é limite do Next, registrado aqui. O `check-dist` confere a 404 estática nos dois formatos de build.
  - Revisão adversarial (4 frentes) antes do merge. Achados corrigidos:
    - um link de Jó (slug `jo`) com pontuação colada ia para João (`/jo/3/16)` → `/joao/3/16`). Agora o slug exato fixa o livro, e capítulo ou versículo que não existe vira 404;
    - palavras comuns viravam livro pelo prefixo de 3 letras (`/mar` → Marcos). No endereço, o prefixo agora precisa de 4 letras;
    - segmentos longos faziam as expressões regulares gastarem CPU. Agora segmento acima de 64 caracteres não é analisado;
    - o CSS da 404 carregava em toda página. Foi para o `globals.css`, e os caminhos viraram lista com fio, como em `/ler` (design §10), sem animação (§7).
- **19/10, noite, contraste no iPhone:**
  - O Alex mandou um print da folha de ligações de Josué 1:2 com título, versículo e lista quase invisíveis: texto escuro sobre a folha escura, e a página atrás clara.
  - Os elementos com cor própria estavam certos; só o texto que herdava a cor da página ficou com a cor do outro tema. É um estado misturado depois de trocar o tema, que o Chromium daqui não reproduz (não há WebKit no ambiente).
  - Correção:
    - cada tema agora dá todos os valores, sem token apontando para outro (um teste barra o padrão antigo);
    - a troca de tema marca também o `<body>`, que o navegador então recalcula;
    - a folha tem cor de texto própria;
    - o `<html>` não traz mais `data-theme` fixo do servidor.
  - Não verificado em Safari/iPhone. Conferido no Chromium: três trocas de tema seguidas e a folha aberta nos dois temas, com contraste mínimo de 9,7:1.
  - O Alex pediu também um design system muito superior e uma remodelagem total, com leitura e busca mais fáceis.
- **19/10, noite, onda C (junção da onda B):**
  - As cinco frentes da onda B entraram numa branch só (`worktree-agent-a0016f4647e112bf9`, em cima do commit da 404), uma de cada vez e com merge commit: medalhões (B5), linha do tempo, temas, palavras e recepção (B3), Explorar e `/conexao` (B1), comunidade (B4) e leitura v2 com `/salvos` (B2).
  - Conflitos:
    - Só somas em `check-dist`, `build-data`, `js-budget` e no README do site.
    - As telas de capítulo, que o B2 redesenhou e o commit da 404 tinha mudado: o layout continua passando o endereço que não nomeia capítulo para a página, e a página continua chamando `missingPage` (endereço solto vira redirect, o resto é a 404).
    - As conferências do B3 e do B2 liam `.next/server/app` direto. Agora passam pelo leitor de páginas comum (`site/scripts/checks/pages.ts`), que serve aos dois formatos de build.
  - Decisões aplicadas:
    - Navegação completa de novo: Explorar, Ler, Linha do tempo, Arcos, Ponte e, no fim, Dados; a barra do celular com Explorar, Ler, Arcos e Ponte. "Ler" acende só em livro, capítulo ou versículo que existe.
    - Uma ordem só para os capítulos ligados (`site/src/lib/chapter-rank.ts`: soma dos votos, depois pares, depois ordem canônica), usada pelo Explorar e pelo "Mais ligados" da leitura, com teste nos 1.189 capítulos. As duas regras antigas discordavam na lista de 293 capítulos e no capítulo mais votado de 6.
    - Medalhões no Explorar (o B1 já os pedia por `medalhaoForBook`), com a legenda "Ilustração por grupo de livros: …", e "Ilustração do grupo …" na página de evento. O manifesto fica só no servidor (`server-only`), e o `check-dist` confere que a procedência dele não chegou a nenhum arquivo do navegador.
    - `npm run budget` agrupa as páginas pela rota que as gera: `/salvos` e as seções novas deixaram de contar como "livro".
    - Título da 404 em todas as rotas dinâmicas novas; `RESERVED` ganhou "recepcao".
  - Achados na junção, corrigidos:
    - A faixa da Ponte cobria a barra de seleção da leitura abaixo de 64 rem.
    - A home tinha perdido a definição de "ligações" ao lado do número de Isaías 9:6 (§4.2). Voltou, e o `check-dist` cobra.
    - O `check-dist` rodado depois de `next start` lia as páginas que o servidor guardou em execução (até uma 404) e quebrava. Agora só conta as rotas do `prerender-manifest.json`.
    - "Ler" acendia na 404 de endereços dentro de um livro, como `/genesis/51`: o mesmo sintoma que o Alex viu no Instagram.
  - Conferido: `npm run typecheck`, `lint`, `test` (348 testes) e `build` (`check-dist` em 2.518 páginas e na 404); `npm run budget` (máximo 155,4 KiB, na home); o build com o adaptador da Vercel mais o `check-dist`; `scripts/fetch_sources.sh` (todas as fontes iguais às cópias). No Chromium, todos os tipos de rota em 375 e 1440 px, Noite e Dia (39 endereços, 156 aberturas): status HTTP, sem erro de página, sem rolagem horizontal, créditos no rodapé e item atual certo; e a barra de seleção com uma ponte em andamento, em 375, 960 e 1440 px.
  - Não conferido: aparelho real, Safari e Firefox, leitor de tela, Lighthouse e o detector do impeccable.
  - Visto e não mexido:
    - Na primeira visita a um endereço solto (cache vazio do `next start`), o redirect sai com o cabeçalho `location` repetido, com o mesmo valor. O Chromium segue; os outros navegadores não foram testados. Vem do commit da 404, não da onda C.
    - Com seis itens no cabeçalho, a busca fica com 123 px de largura em 896 px (o começo do desktop), 187 px em 960 e 251 px em 1024: funciona, mas o texto de exemplo aparece cortado. Fica para o passo de design.
    - Uma 404 dentro de uma seção (`/ponte/999`, `/linha-do-tempo/nada`) acende a seção pelo começo do endereço; só "Ler" confere se a página existe.
    - A faixa da Ponte encosta 1 px sobre o fio de cima da barra do celular.
- **19/10, noite, PR #3 no ar e design system v4 ("Atlas"):**
  - PR #3 (404 em português, endereços soltos, "Ler" só em página que existe, cores literais por tema) mergeado depois de conferir o preview do commit 1afb23d: 23 sondas HTTP e 36 aberturas no Chromium (375 e 1440 px, Noite e Dia). Produção conferida depois do deploy com as mesmas sondas.
  - A onda C entrou no branch do site (`claude/site-phase-0-1`) por merge, com a `main`. Conflitos em `nav.ts`, no teste de rotas, na página de capítulo e aqui no HANDOFF; as rotas novas passaram a pegar o título da 404 de `site/src/lib/missing.ts`.
  - **Pedido do Alex** (print da folha de Josué 1:2 no iPhone): "Site tem muitos problemas de contraste! Leitura difícil e dificuldade de pesquisa! Não tá nem perto do que queremos! Gere um conceito design sistem muito superior a isso! Remodelagem total sem falhas". Ele escolheu "Atlas + leitura B + busca C" e o tema seguindo o celular.
  - **Design system:** página "Design System" (artifact privado do Alex) com tokens, 15 componentes com dados reais e o livro de marca; no código, `site/src/styles/tokens.json` (fonte), `tokens.css` (gerado por `scripts/tokens-css.ts`, com teste de sincronia) e `ds.css` (classes `bc-*`). Regras de contraste: 7:1 para texto e Escritura em toda superfície, 5:1 notas, 4,5:1 acento, 3:1 controles (`tests/tokens.test.ts`). `design/README.md` virou a v4.
  - **Fundação (commit 6a35179):**
    - Todo CSS do site passou dos nomes antigos para os tokens; `tests/css-vars.test.ts` barra qualquer `var(--x)` sem declaração.
    - As três fontes carregam uma vez no layout raiz; saíram as quatro declarações de Literata por rota.
    - Estrutura nova: trilho de seções no desktop, barra superior com marca, busca e menu de aparência (Sistema, Dia, Noite), cinco abas no celular, rodapé no sistema.
    - Busca única (Ctrl K, /, a caixa da barra, a aba Buscar e `/buscar`), carregada no primeiro uso; entende referência em qualquer forma e livro pelo nome ou abreviação, e diz o que falta ("João tem 21 capítulos").
    - Achados e corrigidos no navegador: a regra base de link do sistema vencia a cor dos botões das páginas ("Abrir conexão" ficou com 1,33:1); o Esc só limpava o campo de busca em vez de fechar; o foco não voltava a quem abriu a busca.
  - **Em andamento:** cinco agentes em paralelo, cada um num worktree a partir de 6a35179: leitura; capa, Explorar e conexão; linha do tempo, temas e palavras; comunidade, céu, dados, sobre e 404; o índice de palavras da busca. Briefing comum em `design/README.md` v4 e no contrato de direção (`.impeccable/surfaces/site-src-app-layout-tsx.md`).
  - Atenção para quem testar no servidor local: `ss` não existe aqui e o `lsof` não enxerga os sockets do Next. Rodar o servidor como um processo só (`node node_modules/next/dist/bin/next start -p N & echo $!`) e parar pelo PID; um servidor velho continua respondendo com os chunks do build anterior (erros 500).
- **19/10, noite, vídeo 4:**
  - Vídeo 4, "Antes de João 3:16" (`estudos/biblia-joao316/`): remake do episódio 02 (projeto HyperFrames que o Alex
    mandou em zip) no padrão do vídeo 1, a pedido dele: gancho no frame 0, arcos de dados reais, órgão em ré menor que
    resolve em ré maior no 3:16, narração do Andre. Citações literais da BLIVRE. Legenda reescrita para tração.
- **20/10, madrugada, integração do Atlas e revisão final (PR #4):**
  - Retomada depois do limite da sessão. Os cinco agentes da remodelagem terminaram, cada um no seu worktree, e entraram por merge commit:
    - linha do tempo, temas e palavras (6ac368c);
    - índice de palavras da busca (608b566);
    - capa, Explorar e conexão (769f937);
    - comunidade, céu, dados, sobre e 404 (3469e18);
    - leitura (7742bbd).
  - Ajustes da integração (d974b11):
    - a lista de capítulos é uma parada só de Tab, com setas, Home e End;
    - um rótulo só para `/conexao`: "Ler lado a lado";
    - a altura da faixa da Ponte passou a ser compartilhada (`--strip-h`);
    - o ícone de compartilhar entrou na família de ícones;
    - saíram as fontes que o site não usa mais.
  - Interrupções: o limite da sessão às 00:50 UTC (os agentes foram retomados às 03:15) e um reinício do contêiner por volta de 03:38, provavelmente falta de memória com três builds ao mesmo tempo (não confirmado). Desde então os builds correm em fila (`flock`).
  - QA do d974b11:
    - `npm run build`: 434 testes, `check-dist` em 2.535 páginas;
    - no Chromium, 34 endereços × 375/1440 px × Noite/Dia, 136 aberturas sem falha. Contraste mínimo de 6,46:1 no Noite e 5,33:1 no Dia, só em acento e notas (regras de 4,5:1 e 5:1);
    - interações (Ctrl K, Enter, Esc devolvendo o foco, aparência, aba Buscar): todas passaram;
    - Lighthouse: acessibilidade 100 nas sete páginas medidas. Desempenho 100 no desktop e 95 a 97 no celular, menos `/arcos` (63 no celular, 69 no desktop): sem GPU, o WebGL roda em software e trava a página por 7 a 10 s. O motor do céu (`renderer.ts`, `SkyCanvas.tsx`) não mudou neste PR; fica a sugestão de mostrar o pôster quando não houver GPU de verdade;
    - JavaScript: no máximo 155 KiB por página (`/buscar`), abaixo do teto de 165.
  - Revisão final independente (skill impeccable): um agente separado, que só lê arquivos, comparou as capturas e o código com o contrato de direção. Disposição: "fix", com oito correções, todas feitas (lista em `design/README.md` §13). Junto delas:
    - o selo do capítulo passou a escrever o livro como no texto;
    - o nome acessível dos medalhões do mapa passou a começar pelo que eles mostram (WCAG 2.5.3, apontado pelo Lighthouse).
  - Medido depois das correções:
    - no celular (375 × 812), os oito medalhões da capa terminam em 662 px e o painel que espia começa em 678 px;
    - a busca da barra some na capa e em `/buscar` e volta ao rolar ou ao navegar para outra página;
    - o painel que espia no capítulo some com um trecho selecionado e quando o painel aparece;
    - o `check-dist` confere a contagem dele nos 1.189 capítulos;
    - o aceso do Dia (#683c00) tem contraste mínimo de 7,07:1.
  - Veredito da revisão, em duas rodadas:
    - na primeira, sete das oito correções saíram resolvidas, e o chip "Texto" da busca ficou parcial: sobrava uma cauda vazia. O revisor achou também uma regressão: entre o painel que espia e as abas aparecia texto cortado;
    - correções: o chip passou a ter a largura do rótulo quando a busca é referência, e o painel encostou nas abas, na largura toda;
    - na segunda rodada, disposição "ship", que vale só para os itens avaliados.
  - Fora da revisão:
    - a grade de 66 capítulos da página do livro, que ainda são caixas;
    - o movimento;
    - o versículo aceso em foco.
  - Procedência dos medalhões: o manifesto guarda prompt, modelo, data e SHA-256; ela aparece em `/sobre`, e `tests/medalhoes.test.ts` confere.
  - `DESIGN.md` e `.impeccable/design.json`: escritos por um agente documentador a partir do código entregue. Ele conferiu por script 48 cores, a escala tipográfica, os raios, os espaços e os componentes contra `tokens.json`: nenhuma divergência. O texto qualitativo veio do contrato de direção e do `design/README.md` v4.
  - LCP no celular (Lighthouse simulado): a mesma página varia ±0,6 s entre medições. Para separar ruído de regressão, comparei 4 a 5 medições alternadas de `/isaias/9/6` no build anterior (média de cerca de 2,9 s) e no corrigido (cerca de 2,6 s): nada piorou. O versículo continua acima da meta de 2,5 s (§5.6), como já estava antes.
- **20/10, manhã, revisão do Codex, PR #4 e PR #5 no ar:**
  - Os dois achados do Codex no PR #4 foram corrigidos (be722cb):
    - enquanto uma busca nova carrega, os resultados de texto da busca anterior ficam na tela, mas inertes, sem virar opção;
    - "Tirar da mesa" desfaz um voto só.
  - O PR #4 entrou na `main` (f43f447), e a produção foi conferida com 136 aberturas sem falha.
  - **Pedido do Alex:** "Keep /arcos on its poster without a real GPU". Feito no PR #5 (f9b0170):
    - o céu só desenha ao vivo com GPU de verdade (`failIfMajorPerformanceCaveat` e o nome do renderizador);
    - sem ela, o pôster fica, com o aviso "Sem aceleração gráfica neste aparelho…".
  - Na produção, a checagem do pôster passou em 20 de 20, e o Lighthouse de `/arcos` deu 91 a 97 de desempenho e 100 de acessibilidade (antes: 63 a 69).
- **20/10, manhã, escultura de luz em `/arcos`:**
  - **Pedido do Alex:** a página "Conexões da Bíblia em 3D" do porqueelevive.com (aberta em Isaías 53:5) como conceito: "Atente-se ao nível nisso use a /tasteskill e /rea para fazer igual\nE\nMelhor".
    - A skill `design-taste-frontend` (tasteskill) foi usada.
    - Não existe skill "/rea" nesta conta; no lugar dela entrou a `impeccable`.
  - **Estudo da referência:** só leitura (o código dela não tem licença declarada). As técnicas foram descritas com palavras próprias, e a escultura daqui é código novo, sem biblioteca 3D.
  - **Entrega** (direção e números em `design/README.md` §15):
    - `/arcos` virou a escultura de luz em 3D (`site/src/components/sculpture/`), e o céu 2D foi para `/arcos/plano`.
    - Os 301.539 pares em 3D, com o painel do versículo (texto da BLIVRE e todas as ligações, com votos e filtros), o modo capítulo com anterior e seguinte, o cartão da ligação, a trilha, o endereço `#livro/cap/vers`, o teclado completo e o pôster sem GPU.
    - Com os pôsteres, o canvas assume quando já desenhou o mesmo tanto.
  - **Ajustes depois da primeira versão:**
    - um chão só para canvas, pôster e palco (o `ground` dos tokens, com teste);
    - o pôster do celular feito com os 20.000 pares que o celular desenha;
    - o enquadramento passou a centrar a imagem projetada, e não a caixa 3D, e o quadro de abertura passou do aspecto 1,7 para 1,4: em 1440 px a escultura ficou 25% mais larga e 36% mais alta, e no celular 25% maior;
    - no celular, a introdução cobria a escultura; agora fica abaixo da faixa, com rolagem própria;
    - o motor WebGL carrega depois da primeira pintura: `/arcos` passou de 169,1 para 160,8 KiB de JS (teto de 165).
    - achado pelo teste de interação: depois de clicar num capítulo no eixo e digitar um versículo, a prévia do capítulo continuava acesa por cima dos fios do versículo até o mouse se mexer, e o hover dos fios ficava bloqueado. Agora o motor guarda o próprio estado de hover, e toda troca de seleção limpa a prévia.
    - achado na revisão das capturas: a dica do ponteiro sobre um fio abria por baixo do painel. Agora ela abre do outro lado do ponteiro quando não cabe no quadro.
    - achado pelo teste de interação: com o ponteiro parado no eixo enquanto a câmera voava, a dica continuava no capítulo de antes e o clique abria outro. Agora o motor reavalia o que está sob o ponteiro a cada quadro em que a câmera se move (voo, inércia, roda). Na roda, ele usa a posição exata do último movimento do ponteiro: o evento de roda só traz o pixel inteiro, e de longe um pixel cobre dois capítulos.
    - achado pela auditoria: com uma seleção aberta, a página ficava sem `<h1>`, porque a introdução sai para dar lugar ao painel. Agora o título "Céu de ligações" continua na página, oculto à vista.
    - achado nas capturas do Dia: os fios acesos saíam azuis, e não bronze, porque no Dia a luz vira tinta e a cor estava escrita como a própria tinta, não como o complemento dela. Corrigido para o bronze do `lit` (#683c00), e o foco para sépia quase preto.
    - LCP no celular: o pôster é o maior elemento da primeira pintura e só era pedido depois do CSS. Agora vem com o documento (`<link rel="preload">` por largura e tema do aparelho), e o LCP simulado caiu de 2,9–3,0 s para 2,3–2,4 s.
  - **Conferido no build final** (servidor de produção local, Chromium com SwiftShader):
    - `npm run typecheck`, `lint`, `test` (461 testes) e `build` (`check-dist` em 2.536 páginas, com os números de `/arcos` e `/arcos/plano`);
    - `npm run budget`: `/arcos` com 160,9 KiB (teto de 165), mais o motor de 9,2 KB gzip carregado depois;
    - teste de interação com 43 checagens, todas passando:
      - desktop: arraste, roda, endereço, prévia, clique no eixo, anterior/seguinte, campo e erros, foco no título, 37 ligações de Isaías 53:5, texto da BLIVRE, rótulos, dica e cartão do fio, seguir, trilha, filtro, teclado, `aria-live`, Esc, copiar link;
      - celular: pôster até os 20.000 fios, oferta do resto, folha em duas alturas;
      - sem GPU: pôster com os nomes do eixo, aviso, busca e painel funcionando;
    - auditoria no navegador:
      - 37 rotas × 375/1440 px × Noite/Dia (148 aberturas);
      - a única falha de verdade, o `<h1>` que faltava com seleção, foi corrigida e as rotas da escultura auditadas de novo: 32 de 32;
      - contraste: texto e Escritura acima de 7:1; o mínimo, 5,39:1, é das contagens dos filtros no Dia (notas, regra de 5:1);
    - Lighthouse em `/arcos`: celular 98 (LCP de 2,3 a 2,4 s, TBT de 50 a 100 ms, CLS 0), desktop 100; acessibilidade 100 nos dois;
    - o pôster coincide com o quadro do motor em 1440 e 375 px; dentro do quadro, a diferença média entre o pôster e o canvas é de 1,5 a 2,8 níveis;
    - capturas em 375 e 1440 px, Noite e Dia: abertura, versículo e capítulo.
  - **Não conferido:** GPU de verdade (desempenho e aparência), Safari/iOS e Firefox, pinça no toque real, leitor de tela.
- **20/10, manhã, vídeo 5:**
  - "João 3:16, por dentro" (`estudos/biblia-joao316-ligacoes/`): pedido do Alex: "João 3:16, mas agora detalhando como a
    ligação tem a ver", no mínimo 5 ligações reais com documentação e como as ligações são feitas, com emoção. No meio,
    ele pediu Remotion para as animações, cenas ilustradas no clima de um Reel da BibleProject ("algo assim mas
    melhorado") e "use o nosso site para buscar as referências sempre".
  - As 80 ligações e os votos foram lidos na página `/joao/3/16` do site e conferidos voto a voto contra a base
    (`tools/analyze.py`). O "como liga" foi conferido no grego (MorphGNT), no hebraico (OSHB) e na Septuaginta.
  - Primeiro vídeo da série feito em Remotion (`motion/`, 4.0.532, render pela API Node com o Chromium do Playwright).
    Ilustrações geradas (GPT Image 2.5 via Higgsfield), estilo próprio, sem rosto de criança, marcadas "ILUSTRAÇÃO".
  - Para liberar disco, com ok do Alex, foram apagadas duas pastas de teste da sessão (`extract-test` e `pctest`, embalagem
    do mini Jesus de 14/10).
- **20/10, tarde, cinco vantagens a mais na escultura e a lista sem fim da leitura:**
  - **Pedido do Alex:** "Precisamos que o nosso tenha 5 pontos positivos a mais de visual e formas de uso que o que está se refenciando! Precisamos estar a frente de tudo".
    - Ele escolheu, entre as opções, caminho entre versículos, imagem para compartilhar, acender uma palavra, grupos de livros no eixo e força das ligações.
    - Pediu o merge do PR #6 antes (feito).
  - **Entrega na escultura** (direção e números em `design/README.md` §15.9):
    - caminho entre dois versículos ("Gn 3:15 até Ap 12:9", ou "Caminho até outro versículo" no painel), aceso salto a salto, com o texto de cada passo;
    - acender uma palavra: todo versículo com ela marcado no eixo, as ligações entre eles acesas e a lista com a palavra destacada;
    - grupos de livros no eixo (divisões do Theographic), com nomes que dão lugar aos dos livros quando a câmera chega perto;
    - força das ligações: todas, 5+, 25+ ou 100+ votos, com a contagem de cada degrau saída do `arcs.bin` no build;
    - imagem para salvar ou compartilhar, com título, texto e créditos: pelo menu de compartilhar no celular, por download no resto;
    - o que só se usa às vezes (parser, caminho, índice de palavras, imagem e os dois painéis novos) carrega quando é usado;
    - os pôsteres foram refeitos com as faixas dos grupos.
  - **Pedido do Alex, com a captura da folha do versículo no iPhone:** "As conexões aqui precisam estar toda visível! Não a pessoa ter que acessar ela para ler! Precisamos de algo fácil para qualquer pessoa adorar rolar e ler! Um ciclo infinito".
    - A captura era de uma versão antiga (texto cortado em três linhas). A atual também escondia texto: só as 5 mais votadas o mostravam.
    - Agora toda ligação do versículo traz o texto inteiro, sem "Mostrar mais". A mais cheia, Is 9:6, tem 212 ligações e 28.124 caracteres.
    - Embaixo vem a lista sem fim (`design/README.md` §6.2):
      - as ligações de cada versículo da lista, na mesma ordem, e depois as dos que forem aparecendo;
      - até 8 por versículo, só com voto positivo, sem repetir versículo;
      - quando uma ilha do grafo se esgota, a lista segue pelo próximo versículo da Bíblia.
    - Leitura de "ciclo infinito" (suposição minha, sem pergunta ao Alex): seguir as ligações, e não repetir a mesma lista nem só andar para o versículo seguinte. É trocar uma regra em `site/src/lib/links-feed.ts` se ele quiser outra.
    - As listas da escultura também mostram o versículo inteiro (sem o corte em duas linhas), e a de uma palavra mostra o versículo todo com a palavra marcada.
    - A prévia ao passar o mouse saiu da leitura: repetia, por cima, o texto que agora está na linha.
    - Peso das páginas de versículo (HTML gzip, produção → agora): Lv 26:3 de 25,7 para 28,3 KB; Jo 3:16 de 26,2 para 35,0 KB; Is 9:6 de 34,4 para 63,0 KB. As linhas deixaram de ser pré-carregadas uma a uma ao rolar.
  - **Conferido no build final** (servidor de produção local, Chromium com SwiftShader):
    - `npm run typecheck`, `lint`, `test` (482 testes, 5 deles da lista sem fim, conferindo a regra contra os arquivos que o navegador baixa) e `build`;
    - o `check-dist` confere, nas 200 páginas de versículo pré-renderizadas, que cada ligação mostra o texto exato da BLIVRE;
    - `npm run budget`: versículo com 152,7 KiB de JS e `/arcos` com 163,3 KiB (teto de 165);
    - teste da folha no navegador, 25 de 25: todas as ligações de Lv 26:3 com texto, seções novas ao rolar na ordem do painel, nenhum versículo repetido em 105, até 8 por seção, nenhuma linha pré-carregada ao rolar, Save-Data só com o botão (e o foco no título da seção), erro de rede com "Tentar de novo", ilha do grafo seguindo pelo próximo versículo, 375 e 1440 px, Noite e Dia;
    - escultura: os 43 testes de interação de antes e 56 das cinco vantagens (incluindo o texto inteiro nas listas), todos passando;
    - auditoria no navegador (contraste de cada texto, rolagem lateral, `<h1>`, erros): 6 rotas de leitura e 5 da escultura, em 375/1440 px e Noite/Dia, 44 de 44;
    - o menor contraste nas rotas de leitura, 5,33:1, é o número do versículo aceso no Dia: o mesmo da produção, acima da regra de 4,5:1 do acento;
    - dois testes antigos da escultura mudaram de expectativa: sem GPU, os nomes do eixo agora são os grupos (Pentateuco … Apocalipse), e o rótulo "Imagem salva", que fica 2,4 s, passou a ser lido logo depois do download.
    - Mutação: com a ordem dos votos invertida, sem o filtro de voto positivo ou sem o fim da lista, os testes falham.
  - **Conferido na prévia da Vercel** (`cfe3bab`):
    - teste da folha, 27 de 27, com mais um caso: tocar numa ligação abre o versículo dela, e a lista dele começa por ele;
    - achado nesse caso, e corrigido: o roteador guarda a página do versículo anterior, escondida, então os ids das seções podiam se repetir; cada lista agora usa ids próprios (`useId`).
  - **Lighthouse no celular, prévia × produção** (3 medições alternadas, mesma máquina):
    - Lv 26:3: LCP de 2,5 a 2,6 s × 1,8 a 2,5 s, desempenho 95 a 97 × 94 a 97, acessibilidade 100 nos dois. A prévia baixa cerca de 150 KiB a menos (315 × 466 KiB), porque as linhas não são mais pré-carregadas;
    - `/arcos`: LCP de 1,5 a 1,7 s × 1,5 s, desempenho 99 a 100 × 100;
    - no servidor local os números saíram piores (LCP de 3,2 s no versículo), mas a produção medida na mesma hora ficou igual à prévia: a diferença era do servidor local, não do código.
  - **Não conferido:** Safari/iOS de verdade (a rolagem com inércia dentro da folha), leitor de tela, GPU de verdade.
- **20/10, tarde, PR #7 no ar e a lista sem fim mais firme:**
  - O Alex aprovou o merge do PR #7 (5bbb11a). Na produção, a folha mostra todas as ligações com texto e a lista sem fim funciona.
  - **Achado na produção:** em algumas visitas a lista parava. Cada seção espera todos os seus arquivos, e um pedido sem resposta (7 a 8 s, às vezes um 502 sem os cabeçalhos da Vercel, provavelmente do proxy deste ambiente) prendia a lista até o navegador desistir. Em 4G isso também acontece.
  - **Correção** (`design/README.md` §6.2):
    - todo arquivo de `public/data` pedido no navegador desiste em 10 s (`DATA_TIMEOUT_MS`), e o pedido seguinte busca de novo;
    - a lista tenta a seção de novo uma vez, 1,2 s depois, antes de mostrar "Tentar de novo";
    - logo que uma seção entra, os arquivos da seguinte já começam a vir.
  - **Conferido no build local:** `npm test` (485 testes, com `tests/fetchers.test.ts`: o arquivo travado é abandonado em 10 s e buscado de novo; sem o limite, o teste falha) e `npm run build`; teste da folha no navegador, 28 de 28, com um caso novo: o primeiro pedido do texto de Deuteronômio 11 fica sem resposta, e a seção chega em 11,4 s, sem aviso de erro.
  - **Conferido na prévia da Vercel** (`f0d0fc1`):
    - teste da folha, 28 de 28; numa das rodadas a rede devolveu dois 502 e a lista seguiu;
    - leitura rápida simulada no celular (30 s rolando, Lv 26:3), antes (uma rodada na produção do PR #7) × agora (duas rodadas na prévia):
      - 1.200 px/s: 0 seções e a lista parada no fim × 20 seções, sem nunca mostrar "Carregando";
      - 2.400 px/s: "Carregando" na tela em 35 de 119 amostras × 2 de 119, com 42 a 43 seções.
- **20/10, fim da tarde, PR #8 no ar e um corte de texto na lista sem fim:**
  - O Alex fez o merge do PR #8 (ef1cdf6). Na produção: teste da folha 28 de 28; rolando a 1.200 px/s, 20 seções sem nunca mostrar "Carregando".
  - **Achado nas capturas da produção:** com algumas seções carregadas, o texto da lista sem fim passava da borda direita da folha, e os votos sumiam.
    - Causa (minha, do PR #7): `contain-intrinsic-size: auto 80rem` nas seções. Uma seção que entra longe da tela é pulada antes de ser desenhada e fica com o tamanho intrínseco, que também valia para a largura: 1.280 px. A coluna da lista tomava essa largura.
    - Reproduzido na produção em 3 de 3 tentativas (folha com 1.296 px de conteúdo para 388 visíveis); com a correção injetada na mesma página, 388 de 388 nas 3.
  - **Correção:** as seções têm só altura intrínseca (`contain-intrinsic-block-size`), e a coluna da lista é `minmax(0, 1fr)`. Teste novo em `tests/links-feed.test.ts` (falha com o CSS antigo).
- **20/10, noite, PR #10 no ar e o handoff para o Codex:**
  - O Alex aprovou o merge do PR #10 (`42039b7`). Às 18h29 UTC o CSS da produção já trazia a correção (`contain-intrinsic-block-size`, sem largura intrínseca).
  - Às 18h38 UTC, já com o PR #9 do Codex no ar, a folha de Lv 26:3 no celular (390 px, 3 rodadas na produção): 3 seções da lista sem fim e 388 px de conteúdo para 388 visíveis (antes da correção, 1.296 para 388).
  - Os PRs #9 (`766c727`, 18h30 UTC) e #11 (`ddf090a`, 18h34 UTC) do Codex entraram na `main`: a capa com o atlas ilustrado, `/caminhos`, `/cronologia` e o companheiro de estudo em `/assistente`, desligado na produção.
  - **Pedido do Alex:**
    - "Visual de hero também vamos mudar … Use botões e cards semelhantes a esse visual moderno! Muito scroll e design", com o código do `WebGLShader` (three.js) e dos botões `LiquidButton` e `MetalButton` (shadcn) do 21st.dev;
    - "Prepare handoff para o códex seguir";
    - "Precisamos que dados sejam salvos no navegador de cada pessoa, pesquisas, anotações, memórias e etc! E precisamos de mais imagens que represente capítulos e versículos mais importantes! Uma parte visual, com Mapas, leitura diferente, aonde a pessoa ler pelas idas e vindas de Jesus e cronologia".
  - **Entrega:**
    - `docs/HANDOFF-CODEX.md`: o estado conferido, o plano em quatro PRs (hero e botões; dados no navegador; imagens dos capítulos e versículos mais ligados; mapas e a leitura pelas idas e vindas de Jesus), as armadilhas, as provas e as decisões que são do Alex;
    - um `AGENTS.md` na raiz, que leva qualquer agente às regras do `CLAUDE.md`.
    - Daqui em diante o Codex conduz.
  - **Conferido na `main` `ddf090a`:**
    - `npm run build`: 529 testes, e o `check-dist` em 2.539 páginas;
    - `npm run budget`: `/arcos` com 165,0 KiB de JS, no teto; capa com 157,8;
    - medido para o handoff: só o que o `WebGLShader` usa do three.js 0.186.1 dá 129 KiB em gzip.
- **20/10, Codex, pulsos de luz nas conexões — branch `codex/fiber-light-connections`:**
  - **Pedido do Alex:** feixes de luz percorrendo as linhas como fibra óptica, mantendo conexões reais e leitura confortável.
  - **Entrega:** a constelação da capa ilumina até 12 arestas reais em repouso e até 18 da seleção, com núcleo claro e cauda dourada. O céu 3D reutiliza a geometria existente e anima até 40 fios na vista geral ou 64 da seleção, mais o fio em foco quando necessário. Caminhos preservam a sequência dos saltos; uma seleção sem ligações permanece sem feixes.
  - **Controle e ciclo de vida:** botão para pausar/retomar; movimento reduzido, aba oculta, visualização fora da tela e perda de contexto suspendem os ciclos. A câmera e os rótulos não se movem por causa dos feixes. O SVG usa animação CSS; o 3D agenda no máximo cerca de 30 quadros/s para a camada de luz, sem repetir os passes de densidade e blur enquanto a cena está estável.
  - **Custo explícito do build local:** `npm run budget` mede scripts iniciais do HTML, gzip nível 9. Capa: 162.163 bytes (158,4 KiB). `/arcos`: 168.871 bytes (164,9 KiB), 89 bytes abaixo do teto de 168.960. Ao abrir o 3D, o motor adiado acrescenta 11.451 bytes e os controles adiados 679 bytes: 12.130 bytes adicionais (11,85 KiB), total inicial + esses dois módulos de **181.001 bytes (176,76 KiB)**. Caminho, palavra, exportação e parser de busca carregam em ações próprias e não entram nesse total de abertura. HTML, fontes, imagens e dados também ficam fora dessa medida de JavaScript. O adiamento preserva a primeira carga, sem eliminar o custo posterior.
  - **GPU:** um alvo RGBA16F com metade da largura e da altura acrescenta aproximadamente 2 bytes por pixel do canvas completo; não há dependência nova nem cópia nova da geometria das conexões. Não foi feita medição formal de tempo por quadro.
  - **Conferido no build final:** `npm run build` passou (34 arquivos, 535 testes; seis testes novos de ciclo de animação), TypeScript, `npm run lint`, `npm run budget` e `git diff --check`. `check-dist`: créditos e dados em 2.539 páginas pré-renderizadas, mais 404; 23.414 arquivos de texto distribuídos sem nenhuma das 39 citações protegidas.
  - **Conferido no Edge com build de produção local:** 375 × 812 px, Gênesis 2:6 com zero ligações, Daniel 9 com 1.123 ligações e 32 fios em destaque, pausa e retomada, controles com pelo menos 44 px, sem rolagem horizontal. Na capa: pausa manual, mudança dinâmica de movimento reduzido e suspensão fora da tela verificadas. Console sem erros ou avisos. Capturas e relatório ficam fora do repositório, na pasta local de evidências do Codex.
  - **Limites:** Safari/iOS em aparelho real e tempo de GPU não medidos. A margem do JS inicial de `/arcos` é pequena; qualquer novo código compartilhado exige medir novamente. O PR desta entrega permanece em rascunho até a revisão final. Nenhuma ativação da IA, mudança de credenciais ou chamada paga faz parte destes checks; o teste real dos três modos da IA é uma etapa separada.

- **20/10, Codex, hero, botões e cards — branch `codex/home-immersive-refinement` (em revisão):**
  - **Escopo:** item 4.1 de `docs/HANDOFF-CODEX.md`, a partir da `main` `a5e741c9`. O site continua nesta sessão; vídeos e sua automação foram transferidos para uma sessão separada. Esta entrega não inclui vídeos, IA ou credenciais.
  - **Implementação local:** hero como janela noturna nos temas Dia e Noite, ondas em ouro/vitral, ações com aparência de metal e vidro em CSS, busca antes do grafo, cards com moldura dupla e cronologia em papel. Dados reais, texto BLIVRE, créditos, constelação e `HomeAtlas` foram preservados; nenhuma dependência nova.
  - **Shader:** WebGL2 próprio em `site/src/components/ui/web-gl-shader.tsx`, um triângulo, no máximo 30 quadros/s, DPR até 1,5 e raster até 1440 × 900. Pausa/retomada acessível, quadro estático com movimento reduzido, suspensão fora da tela e com aba oculta, fallback CSS sem WebGL/render por software ou após perda de contexto. Seis testes novos verificam esse ciclo de vida.
  - **Conferido localmente:** build e `check-dist`, lint, TypeScript e orçamento de JS; **541 testes em 35 arquivos**. O ambiente local usou Node 24; a validação do deploy em Node 22 permanece pendente.
  - **JS inicial medido, gzip nível 9:** capa **163.942 bytes (160,1 KiB)**; `/arcos` **168.871 bytes (164,9 KiB)**, inalterado. O orçamento mede os scripts iniciais declarados no HTML; não inclui dados, imagens, fontes, HTML ou módulos adiados. O custo dos módulos adiados da escultura permanece discriminado no registro anterior.
  - **Conferido no navegador, build de produção local em `http://localhost:3003`:** capturas em 375 × 812 e 1440 × 900, temas Dia e Noite; pausa/retomada, busca por João 1:14, Escape devolvendo o foco, âncora da constelação e seleção de Gênesis 1. Evidências ficam fora do repositório, na pasta local do Codex.
  - **Contraste dos cards:** corrigido após a captura móvel, com véus reais; pior caso branco incluindo brilho do hover: paisagem, categoria 7,28:1/título 9,02:1; céu, 8,87:1/10,99:1. **Pendências de aceite:** Lighthouse móvel ≥ 90 e comparação de LCP pendentes. A Google PageSpeed API respondeu `429 quota exceeded`, sem nota nem LCP: não há aprovação de performance por Lighthouse. [PR #14](https://github.com/alexpiraginet-bot/biblia-conectada/pull/14) criado em rascunho, com prévia da Vercel iniciada e conferência final pendente. Sem merge desta etapa.


- **20/10, Codex, PR #14 publicado com autorização explícita do Alex:**
  - Após o aviso de Lighthouse/LCP ainda pendentes, Alex pediu "Vamos publicar". PR #14 integrado por squash em `6bbca4d94536dde42ae0514588f3b1e80e84e4cf`.
  - Vercel: produção `dpl_BBGdYhunFt3QqWFSYh7fUDe5Fnhq`, Node 22, estado **READY**, alias `https://alexpiraginet-bot-biblia-conectada.vercel.app` confirmado para esse commit. A prévia do mesmo código respondeu HTTP 200; os dois commits posteriores à prévia alteravam só documentação e foram corretamente ignorados pelo build.
  - Domínio público conferido em 375 × 812 e 1440 × 900, temas Dia/Noite. Pausa/retomada das ondas, busca por João 1:14 e Escape devolvendo o foco funcionam. No celular: largura do documento 375 px, CTA com 50 px e pausa com 44 px. Console sem erros ou avisos. Prints salvos na pasta de evidências do Codex, fora do repositório.
  - A entrega é a nova capa e seus cards; os 541 testes, build, lint, tipos e orçamento anteriores cobrem o mesmo código publicado. Lighthouse móvel/LCP, Safari/iOS real e medição formal de GPU continuam sem comprovação. Vídeos, credenciais e ativação da IA não fazem parte deste release.

- **20/10, Codex, correção mobile e descoberta dos recursos — branch `codex/home-guide-mobile`:**
  - Alex mostrou o hero no iPhone com ondas praticamente invisíveis e pediu validação por Agent Browser/Playwright, destaque para a IA e um “como nossa Bíblia funciona”.
  - Ondas agora ocupam uma área própria no mobile, com estrelas e fallback SVG no HTML; movimento WebGL, pausa e respeito à redução de movimento preservados. Desktop separa melhor texto e visual.
  - IA em destaque na capa, atalhos no hero e tour acessível de oito experiências. A âncora de Minha jornada foi ligada aos desafios. Nada de vídeo gerado ou memória de conversa é prometido pelo guia.
  - IA confirmada em produção por GET e pergunta real sobre João 2:7, respondida com contexto e doze referências. `docs/ASSISTENTE-IA.md` foi atualizado; nenhuma credencial alterada.
  - Build, 543 testes, tipos, lint, orçamento e revisão independente passaram. Home 163,1 KiB gzip; `/arcos` 164,9 KiB, sem aumento. Capturas 375/1440, Dia/Noite; Playwright Chrome + WebKit/Windows e Agent Browser, teclado, busca, desafio, pausa, fallback e quatro rotas principais conferidos. Detalhes em `docs/evidence/2026-10-20-home-guide-mobile.md`.
  - O pedido adicional de Motion/Reels foi encaminhado à sessão “Bíblia em cena — produção de vídeos”, mantendo o trabalho de vídeo fora deste checkout. Publicação desta etapa será confirmada pelo deployment e pelo domínio público.

- **20/10, Codex, PR #16 publicado:** squash `24cb51790a1a2e8908f063b31e2aa6fce912b69a`; Vercel `dpl_8SsNCkfHvwxssnovkovyqPLXujSs`, READY, alias público confirmado. Capturas publicadas 375/1440, Dia/Noite, ondas, guia, busca e desafios conferidos. O teste extra de histórico após âncora da home revelou URL restaurada com tela antiga; corrigir no PR seguinte. Alex acrescentou ajuda de IA por qualquer versículo, três estilos e voz, além do texto da passagem selecionada aparecer diretamente no painel 3D.

- **20/10, Codex, ajuda por versículo — branch `codex/verse-study-assistance`:** CTA “Entender com IA” junto aos textos e conexões, referência validada no servidor, estilos Bem simples / Contexto bíblico / No dia a dia, texto e voz do aparelho. Capítulo escolhido no 3D mostra o próprio texto antes das conexões, com rolagem e nova tentativa em caso de falha. Histórico da home e retry após navegação corrigidos. Build completo com 580 testes, tipos, lint e orçamento passaram. Evidência e limites em `docs/evidence/2026-10-20-verse-assistance.md`; publicação e respostas reais dos novos estilos aguardam conferência do deployment.

- **20/10, Codex, PR #17 publicado e conferido:** squash `aba58ec2dddefb2c6576f94148cea70450ec38c8`; Vercel `dpl_3yofAzFMp4ugjNFxkWe5sznrJ7JB` READY no domínio público. Gênesis 6 mostra os 22 versos diretamente no painel, conferido em 375/1440 Dia/Noite. Três respostas reais de Jeremias 17:8 (simples, contexto e cotidiano) concluíram com HTTP 200; todas as citações correspondem à BLIVRE. Sem mudança de modelo, chave ou limites. Voz física/iPhone, Lighthouse e tempo de GPU continuam sem medição. Vídeo e imagens permanecem na sessão audiovisual separada, que recebe o estado desta publicação para capturas finais.

- **20/10, Codex, conversa contextual e bordô — branch `codex/inline-study-burgundy`:** a IA abre sobre a leitura, sem mudar de rota, com três estilos, perguntas prontas, indicador de espera e contexto temporário de até dois pares. Texto, fontes, voz e cenas permanecem acessíveis. Fechar restaura a leitura; Back/Forward fecha o diálogo sem restaurar a rolagem da rota anterior. Paleta bordô/dourado/marfim unificada, inclusive controles do 3D; Noite padrão, Dia/Sistema explícitos preservados. Build completo com 594 testes, tipos, lint e créditos passou. Capturas 375/1440 Dia/Noite, Chrome/WebKit e Agent Browser; achados de foco e contraste corrigidos. Evidência, distinção entre respostas simuladas/reais e limites em `docs/evidence/2026-10-20-inline-study-burgundy.md`. Vídeos seguem na sessão separada, avisada para aguardar as capturas finais desta interface.

- **20/10, Codex, PR #19 publicado:** squash `16e09e5f56a4145fb86954eb6058c3dfddc6a636`; Vercel `dpl_B1LDGTuh5oxDr21EWGSZdxzEMBQT`, READY no domínio público. A conversa contextual foi conferida com respostas reais; esta é a base do ajuste visual seguinte.

- **20/10, Codex, céu arco-íris — branch `codex/complete-burgundy-surfaces`:** Alex pediu mais cor e vida no céu, rejeitou a faixa sépia e escolheu fundo neutro com bordô no entorno. O 3D agora abre em arco-íris seguindo o eixo dos livros, preservando modos Testamento/Distância, seleção e pulsos. Palco carvão/branco neutro, pôsteres sincronizados e faixa da home refeita com Figtree, palco escuro nos dois temas e atalhos reais. Build com 596 testes, tipos e créditos passou; lint e orçamento passaram (`/arcos`: 168.479 bytes, 164,5 KiB gzip). QA encontrou o seletor escondido no celular, corrigido antes da rodada final. Detalhes e limites em `docs/evidence/2026-10-20-burgundy-surfaces.md`. Capturas e scroll reais serão entregues à sessão de vídeos; as oito ilustrações recebidas continuam em pacote externo, ainda sem integração ao site. Voz OpenAI aguarda o seletor seguro de conta/projeto; nenhuma chave pessoal do assistente existe e nenhuma nova chamada paga foi feita.

- **20/10, refinamento celestial após PR20:** Alex pediu um meio-termo mais discreto entre as referências: dourado, violeta/azul e estrelas com profundidade. Branch `codex/refine-celestial-palette`: distância é o modo inicial “Dourado e violeta”, arco-íris e testamento continuam opcionais. Fundo neutro e bordô externo preservados; estrelas em duas escalas no compositor, paralaxe vinculada à câmera, sem animação adicional. Os oito pôsteres foram regenerados e inspecionados. Evidências em `docs/evidence/2026-10-20-celestial-palette.md`; o material `rainbow-motion/` é intermediário e a sessão de vídeos aguarda as capturas finais.
- **20/10, Codex, identidade instalável e compartilhamento — PR #22, branch `codex/app-identity-sharing`:** Alex mostrou o atalho do iPhone com letra automática e título cortado. Ícones próprios, nome curto Bíblia, manifesto e capas sociais por conteúdo implementados; céu usa também query para permitir prévia da passagem. Aviso com tutorial do iPhone incluído a pedido. Código final `6f7e046`: 634 testes, build/tipos, lint e check-dist aprovados; 29 endereços, 12 telas, guia iOS, temas e smoke 3D sem erros. Menu de aparência e cálculos de interação do céu adiados para manter o teto de JS: home 168.953 bytes, céu 168.646 bytes (limite 168.960). Prévia Vercel `dpl_5ak3YmDEHN2qxKFTMx9SkgwDKAxW` READY, HTML e PNG conferidos. Integração/publicação seguem a autorização já dada por Alex; evidências em `docs/evidence/2026-10-20-app-identity-sharing.md`. Sem instalação física, envio a redes ou novas credenciais.
- **20/10, Codex, PR #22 publicado:** squash `9049d1e2a7894c4e00e31a4c3e9a1272b0792a2e`; Vercel `dpl_vD3AMM92L5KbBijWNXmf8H2x9NQp` READY com alias público confirmado. HTML, capas, manifesto e ícones verificados no domínio público; hashes dos PNGs instaláveis idênticos aos aprovados. Novos atalhos usam a marca e o nome Bíblia; atalhos antigos podem precisar ser adicionados novamente. Guia do iPhone é um aviso no site, sem push do sistema, permissão de notificação ou promessa offline.
- **21/10, Codex, correção de descoberta do ícone — PR #23:** Alex informou ausência do ícone na tela inicial e definiu o nome padrão **Bíblia Conectada**. A inspeção identificou metadados tardios fora do head em `/arcos` e ausência dos fallbacks Apple; os arquivos declarados estavam corretos. `c6e4325` põe os metadados no head inicial, gera os PNGs padrão Apple e usa nome completo no manifesto/título Apple. 634 testes, build/check-dist (2.540 páginas), tipos, lint, orçamento e 18 respostas HTML passaram; capturas 375/1440 Dia/Noite conferidas. Prévia `dpl_BQSZh7PLZAFpAFTrmchEBpcV5Adu` READY com head e PNG confirmados. Detalhes e limites físicos em `docs/evidence/2026-10-21-iphone-icon-name.md`.
- **21/10, Codex, preservação do cache — PR #24:** PR #23 publicado em `8d6cee7`, Vercel `dpl_BYfTQDo3hWxWs7cK9zMD4qXzneL7` READY. QA público aprovou os ícones, mas detectou cache BYPASS em todos os browsers devido ao bloqueio global de metadados. Correção `ea48e11`: identidade de instalação estática no head, sem duplicatas, com o comportamento padrão de streaming/crawlers restaurado; URLs e bytes dos ícones preservados. Build, 634 testes, tipos, lint, orçamento e 27 GETs locais passaram. Comparativo de cache e limites em `docs/evidence/2026-10-21-iphone-icon-name.md`; publicação final ainda será conferida. Não houve instalação em iPhone físico, limpeza de dados nem envio a redes.
- **21/10, Codex, PR #24 publicado e conferido:** squash `ca065a974135e6f367a85d4f701e1bb8fe394005`; Vercel `dpl_nz1rXFCK2V9m6vMwa9EV13wAdG4D` READY. 27 GETs públicos aprovados, nome **Bíblia Conectada** e ícone no head inicial, PNGs íntegros. Cache recuperado: 14 HIT/2 PRERENDER/2 MISS nos 18 requests de browsers, nenhum BYPASS; crawlers com OG completo. Quatro telas e navegação cliente aprovadas. Alex acrescentou botão no versículo para WhatsApp e imagem de Stories; implementação segue em worktree isolado, preservando esta correção.
- **21/10, Codex, compartilhamento no versículo — PR #25:** botão junto aos textos abre menu sobre a leitura. WhatsApp recebe referência e link com capa OG; imagens horizontal e Stories 1080 × 1920 podem ser preparadas, conferidas, compartilhadas pelo menu do aparelho ou baixadas. Não há publicação automática em redes. Fonte final `1ff85d9`: 645 testes, build, tipos, lint, check-dist e orçamento aprovados; home 168814 bytes gzip. Quatro telas (375/1440, Dia/Noite) e oito verificações focadas passaram, incluindo foco, Escape, scroll, cancelamento, falhas e PNG real. Prévia `dpl_DJLbVrAsxuw31Jc5zb4KcgNaTR86` READY. Evidências e limites em `docs/evidence/2026-10-21-verse-sharing.md`; publicação será conferida no domínio público. Safari/iPhone físico e destinos do compartilhamento nativo não foram testados.
- **21/10, Codex, PR #25 publicado:** squash `f4ad6ef1c9d5364bf52bd34323346c2d13d6fb2a`; Vercel `dpl_3dAQxQ1fqYsnXLEhuWTtUUNSNTHF` READY. Seis GETs e smoke mobile públicos passaram: PNGs reais, menu, URL/foco/scroll e cache. Primeiro timeout do harness não se repetiu; diagnóstico e limite preservados na evidência. Alex confirmou que o Safari real ainda mostra B na instalação, apesar dos recursos corretos, e pediu agentes de performance, UI e UX ao fim. Investigar o ícone sem afirmar causa de cache não comprovada; auditorias independentes iniciadas.

- **21/10, Codex, auditorias finais — PR #26:** a pedido de Alex, agentes independentes de performance, UI e UX auditaram a produção e revisaram os ajustes. Corrigidos primeiro toque antes da hidratação, abertura/cancelamento/fallback acessível por teclado, erro/retry do versículo de origem no céu, ampliação da prévia e acesso permanente às instruções de instalação. Novo caminho Apple preserva a arte e o nome Bíblia Conectada; instalação física ainda depende da conferência do Safari de Alex. Fonte `bbc761f`: 658 testes, build, tipos, lint, check-dist e orçamento passaram; home165911/arcos167932 bytes gzip9, com inline e módulos adiados discriminados. QA375/1440 Dia/Noite, seis primeiros cliques, quatro cenários pré-hidratação, retry e teclado aprovados. Evidência e limites em `docs/evidence/2026-10-21-final-audits.md`; publicação final em conferência. Sem envio a redes, chaves ou novas chamadas pagas.
- **21/10, Codex, PR #26 publicado e conferido:** squash `45290dab4abec0e17379a62656d4c01d438f0df9`; Vercel `dpl_8R2qKd9hchfhQsM2BdLNMzZvXQqy` READY com alias principal. Seis GETs, seis primeiros cliques e smoke UI público passaram: menu sem sair do versículo, foco restaurado, imagem ampliada legível, instruções permanentes e identidade entregue. JS inicial público: home 166.145 bytes, arcos 168.180 bytes gzip9, abaixo do teto. Relatórios de performance/UI/UX e limitações preservados em `docs/evidence/2026-10-21-final-audits.md`. Confirmar ícone no iPhone físico pelo Safari continua pendente; não houve envio a redes ou chamada paga. Servidor local de QA encerrado.
- **21/10, Codex, leitura integral Open NBV — branch `codex/open-nbv-reader`:** Alex autorizou integrar a alternativa aberta. Fonte completa preservada: 66 livros, 1.189 capítulos, 31.105 posições; rotas próprias em `/ler/open-nbv`, IA e compartilhamento sensíveis à edição. Conexões por capítulo, com alinhamento por versículo ainda não revisado; busca e grafos originais continuam BLIVRE. 705 testes, build, tipos, lint, check-dist e orçamento aprovados. Auditorias independentes de performance/UI/UX, capturas 375/1440 Dia/Noite, 64 verificações UI e quatro fluxos UX sem bloqueador. Não foi criada tradução própria completa nem feita chamada paga. Evidências e limites em `docs/evidence/2026-10-21-open-nbv.md`; publicação pendente de conferência pública.
- **21/10, Codex, PR #28 publicado:** squash `bf608f31805ee26001c8b8972eb3bfce2ad20b9e`; Vercel `dpl_DQGkFDQ4FzwUK4cgV333e6s9zLaV` READY com domínio principal. Dez rotas válidas, quatro 404s e PNGs corretos conferidos; 64 verificações públicas em quatro contextos aprovadas. Uma resposta real da IA sobre 3 João 1:15 retornou em cerca de 9,4 s, com oito citações comparadas à fonte Open NBV. Cache de navegador 6 HIT/2 PRERENDER; scripts públicos da leitura 149.683 bytes gzip9, abaixo do teto. Evidências completas em `docs/evidence/2026-10-21-open-nbv.md`. Sem envio a redes ou nova credencial; iPhone físico e alinhamento de versículos entre edições continuam fora do que foi validado. Servidor local encerrado.
- **21/10, Codex, tutorial animado da Ponte — PR #29:** Alex pediu uma explicação ao entrar e depois um Motion/tutorial mais fácil. Treino interativo com missão, duas ligações reais (João 3:16 → Romanos 5:8 → 1 João 4:9), arcos e contador animados, voltar/pular/pausar e ajuda permanente. Não altera a partida. Fonte final `0b376ab`: 706 testes, build/check-dist, tipos, lint e orçamento aprovados; revisões de arquitetura, UI/UX e performance, 234 verificações de matriz, 12 do delta e 18 de fluxo aprovadas. JS Ponte 159.701 bytes gzip9; contraste mínimo Dia 5,47:1/Noite 7,99:1. Prévia final READY e três GETs conferidos; squash `69cd8fbc2404ff41c529a93e68bf99e9f285e2ac`. Promoção direta da prévia retornou 422; deploy normal de produção `dpl_HMW9FSqiqw3Z2YsRaw19E7ZH6U1L` em conferência. Evidências em `docs/evidence/2026-10-21-ponte-tutorial.md`. Sem notificação do sistema, chamada paga ou validação em iPhone físico.
- **21/10, Codex, PR #29 publicado e conferido:** Vercel `dpl_HMW9FSqiqw3Z2YsRaw19E7ZH6U1L` READY, commit `69cd8fb`, domínio principal confirmado. Quatro contextos públicos (375/1440, Dia/Noite), oito prints e os 18 fluxos reais passaram: treino, reabertura, histórico, storage bloqueado e preservação da partida. IA disponível por GET, sem chamada paga. A demonstração em vídeo e todos os relatórios estão na pasta local `ponte-guide`; ver `docs/evidence/2026-10-21-ponte-tutorial.md`. Sem publicação em redes ou teste em iPhone físico.

- **21/10, Codex, No seu coração e navegação — PR #31:** nova conversa aberta em `/coracao` aceita lembranças, temas e sentimentos, recupera texto integral licenciado com contexto e usa Sonnet 5.5 no orçamento compartilhado existente. Modo À luz de Jesus propõe reflexão e resposta adaptável, sem personificar Jesus. Pílula móvel bordô/dourada, cinco destinos e menu Mais para Buscar/Ponte; home e desktop dão acesso ao Coração. Fonte `c3d43cb`: 773 testes, build/check-dist, tipos, lint, orçamento e matrizes 375/1440 Dia/Noite passaram; agentes de performance/UI/UX revisaram e corrigiram continuidade de busca e posição da resposta. Prévia `dpl_3Nxnkt7eyoNKTcJBQDBDXAFFiTDA` READY. Três respostas reais de texto conferidas, incluindo limites do conhecimento e resposta a ofensa, com citações idênticas à Open NBV. A voz OpenAI foi implementada, mas o teste real retornou `invalid_api_key`; Production permanece sem voz até o usuário substituir a credencial na Vercel e passar nova validação. Evidências em `docs/evidence/2026-10-21-heart-conversation-voice.md`. Publicação em conferência; sem envio a redes, compra de domínio ou comprovação em iPhone físico.

- **22/10, Codex, domínio e correção do Coração — PR #35 publicado:** squash `1c9201d9130c31cdf26a564db4670c14383f68ce`; Vercel `dpl_nZCBs7SDKhGNmSB3eYiF9qGJS6Bk` READY. Alex comprou e autorizou `www.bibliaconectada.company`; domínio com HTTPS, apex 308 e canonical/OG/instalação conferidos. Host antigo preservado. Texto segue na Anthropic; pergunta “Alguém me xingou no WhatsApp” passou na produção em 8,1 s, com sete citações exatas da Open NBV e sugestão para copiar. Retry distingue falha confirmada de rede ambígua. Build796, lint, orçamento, oito casos de retry, seis telas públicas e dez verificações HTTP passaram. OpenAI permanece somente para voz; diagnóstico real atual `insufficient_quota`, sem áudio. Credenciais não foram trocadas nesta rodada; crédito/limites dependem da conta do Alex. Voz habilitada para teste por pedido anterior, sem afirmar que funciona. Registro completo em `docs/evidence/2026-10-22-domain-heart-voice-diagnosis.md`; não houve envio a redes ou nova compra. Servidor local encerrado.

- **23/10, Codex, contagens e navegação completa — branch `codex/connection-counts-navigation`:** a seleção em Arcos mostra o total completo antes da leitura, com cabeçalho fixo; amostra desenhada, filtros e total têm significados separados. Explorar informa os pares com outros capítulos. 2 Coríntios 6 tem 789 conexões, Isaías 9:6 tem 212. Menu móvel completo prioriza Mapa de Jesus e Cronologia, preservando quatro destinos na pílula; nomes consistentes no desktop. 806 testes, build/tipos, lint, check-dist e orçamento passaram; 11 casos de navegador, cinco fluxos adicionais e toque WebKit aprovados. Revisores independentes de dados, UI/UX e performance sem bloqueios; corrigidos telefone baixo, fechamento antes do toque no WebKit e sobreposição do botão fechar. JS inicial Arcos 168.363 B gzip9; custos adiados e limites em `docs/evidence/2026-10-23-connections-navigation.md`. Publicação em preparação sob autorização anterior de Alex. Sem chamadas pagas, redes sociais ou uso da GPU dedicada à sessão de vídeo.

- **23/10, Codex, PR #37 publicado e conferido:** squash `a89dced53843a93bdc370d8a4c0aaadaff7fca01`; Vercel `dpl_7NmKomEhSHpD4ikipkmeQN2MdQU2` READY com domínio `www.bibliaconectada.company`, SHA e aliases confirmados. Corrigido também o blur da pílula no CSS compilado, com prova antes/depois. Prévia passou quatro fluxos Chrome/WebKit; produção passou os 11 casos de navegador, toque WebKit e cinco GETs. Contagens reais, menu completo e filtros aprovados. JS inicial público: home167057/arcos168595/explore152030 bytes gzip9, abaixo do teto. Evidências e limites em `docs/evidence/2026-10-23-connections-navigation.md`; servidor local encerrado. Sem nova credencial, chamada paga ou envio a redes. Não equivale a Safari em iPhone físico nem medição de GPU.
- **23/10, limite da validação gráfica do PR #37:** no WebKit emulado com movimento reduzido, a captura do céu mostrou eixos/rótulos sem arcos; dados e WebGL ativos, sem erros. Em sessão nova com movimento padrão, os arcos aparecem corretamente (`production/webkit-no-preference-chapter.png`). Contagens e navegação aprovadas; quadro estático com movimento reduzido precisa de investigação separada. Não foi demonstrada regressão do PR, nem defeito em iPhone físico. Detalhe na evidência da entrega.

- **23/10, Codex, espaço de leitura e menu em repouso — PR #38:** Arcos móvel ocupa a janela até o limite inferior; painel com uma rolagem, referência/contagem compactas e Ampliar leitura/Voltar ao céu. Dock se recolhe após 1,5 s e retorna ao gesto, rolagem ou teclado, preservando o toque no texto; menu aberto e foco mantêm controles disponíveis. Ajustar o céu contém a seleção da amostra. Fonte `2013dde`: build com 806 testes, tipos, lint, check-dist, orçamento e 16 casos locais passaram; revisão independente de gesto 2/2 e controles 4/4. Prévia `dpl_4WY8YRLNXKUnVcjANoPApkCp4hZy` READY e 8 casos hospedados aprovados. JS Arcos 168.491 B gzip9, módulo adiado 536 B. Evidência em `docs/evidence/2026-10-23-mobile-reading-space.md`. Sem chamadas pagas ou mudança nos trabalhos de vídeo; iPhone físico e FPS não verificados.

- **23/10, Codex, PR #38 publicado e conferido:** squash `0435dbc34905a7d0beac53508d187158ccdef820`; Vercel `dpl_51ysMakYJmSyUZvM1RJZCxMsEHbD` READY com SHA e domínio `www.bibliaconectada.company` confirmados. Oito cenários públicos Chromium/WebKit em 375/1440, Dia/Noite, e cinco GETs passaram. Leitura ampliada, contagem, menu após 1,5 s e retorno ao toque/movimento/rolagem aprovados; sem deslocamento do texto ou perda do primeiro toque. JS inicial Arcos 168.726 B gzip9, abaixo do teto. Relatórios e prints em `reading-space/production`, referenciados na evidência da entrega. Revisões independentes de performance e UI/UX sem bloqueadores; Safari físico e FPS continuam fora da validação. Servidor local encerrado; vídeos preservados.

- **25/10, manhã, vídeo 6:**
  - "O Antigo dentro do Novo" (`estudos/biblia-at-no-nt/`): o Alex mandou o print de um post com o gráfico do Dr. Ben
    Gladd (AT × NT, citações e alusões) e pediu um vídeo com esse visual, muito movimento e rolagem, com gancho no molde
    do vídeo 1. O gancho ficou "Parece fibra óptica. Mas é o Antigo Testamento dentro do Novo." (escolha do Alex, com a
    análise no `PROJETO.md`). A narração é do Andre, a voz do vídeo 1.
  - Os números do Gladd não foram usados, porque não são dados abertos. O gráfico é nosso: 67.293 pares AT↔NT da
    OpenBible, desenhados em NumPy (`tools/layers.py`). As linhas laranja são calculadas por código: 223 pares com 5+
    palavras gregas iguais em sequência (Septuaginta × SBLGNT) que a OpenBible já liga. O vídeo não chama isso de
    "citações". O gráfico do Gladd leva crédito como inspiração, na legenda e no fim do vídeo.
  - Segundo corte (09:15-10:05): o Alex pediu mais curto e emocionante, com Deus guiando as Escrituras no centro desde o
    início, mantendo os dados e as linhas; depois uma versão resumida (~49 s) e um fecho que puxe comentário e
    compartilhamento ("Comenta tua passagem favorita. Ela pode virar o próximo vídeo."). As duas versões saem do mesmo
    pipeline (`CUT=curto`). Só a frase do fecho foi regravada (`source/narr/cta*.mp3`).
  - `motion/node_modules` é um link para o do vídeo 5. Ficou fora do git (`.gitignore`).
  - Para liberar disco, foram apagados os intermediários antigos dos vídeos 1 a 4 em `hf-test/videos/*/renders/.film`
    (fora do repo, refeitos pelo pipeline de cada vídeo).

- **25/10, Claude, o mapa vivo (feito em 20/10, integrado agora):**
  - **Pedido do Alex**, com a captura do mapa de Isaías 9 no celular (tema Dia): "Quero tudo isso vivo! Movimento e fluidez tudo precisa ser ultra moderno e interativo".
  - **Entrega** (`design/README.md` §7.1; o resto do site continua quieto):
    - entrada: o mostrador varre de Gênesis, em sentido horário; os troncos crescem do selo na ordem do cânon, cada medalhão chega com o seu, depois os capítulos, e por último o traço da ligação escolhida;
    - vida: um pulso de luz corre por cada tronco, mais vezes onde há mais votos (a cada 4,4 s no mais fraco, a cada 2,2 s no mais forte), e sem parar na ligação acesa; a órbita, o pontilhado entre capítulos e o aro do selo andam devagar. A legenda ganhou "Pulso de luz mais frequente, mais votos";
    - resposta: apontar, com o mouse ou o teclado, recua as outras ligações; o medalhão cresce sob o mouse e afunda ao toque; o escolhido responde quando o traço chega;
    - um mapa que chega fora da tela espera e faz a entrada quando aparece; os ciclos param fora da tela; com movimento reduzido, nada se mexe.
    - O `DESIGN.md`, o `PRODUCT.md` e o `design/README.md` diziam "um só momento orquestrado"; agora dizem que o movimento mora no mapa.
  - **Conferido** (servidor de produção local, Chromium):
    - `npm run build`: 531 testes, 2 deles novos em `tests/atlas-motion.test.ts` (a entrada segue o cânon; no mapa real de Isaías 9, mais votos dão pulsos mais frequentes; com a regra invertida, o teste falha), e o `check-dist` em 2.539 páginas;
    - `npm run budget`: Explorar com 147,2 KiB (+0,7), capa com 158,3 KiB (+0,5); `/arcos` e versículo iguais;
    - navegador, 28 de 28: entrada e pulsos em 390 px, Noite e Dia; pulsos parados fora da tela e de volta nela; a entrada esperando abaixo da dobra; desktop com mouse e teclado; movimento reduzido em 390 e 1440 px; o atlas da capa ao abrir, com o traço aceso esperando o tronco também ali; a entrada de Isaías 10 ao navegar; nenhum erro na página;
    - quadros da entrada no primeiro carregamento, com o relógio das animações a 10%: o traço aceso só aparece depois do tronco dele;
    - ritmo de quadros igual com e sem movimento (60 por segundo, nenhum acima de 34 ms) e LCP igual (88 a 108 ms contra 88 a 100 ms, 3 rodadas cada);
    - capturas em 375 e 1440 px, Noite e Dia.
  - **Achado, do PR #9, já na produção:** no tema Dia, a capa tem fundo escuro e o atlas de Isaías 9 dentro dela usa os tokens do Dia, com a legenda quase invisível. Ficou para o Codex (`docs/HANDOFF-CODEX.md` §4.1).
  - **Não conferido:** iPhone e GPU de verdade; o ritmo de quadros foi medido no Chromium sem GPU.
