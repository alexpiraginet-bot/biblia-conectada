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
- `estudos/biblia-referencias/` e `estudos/biblia-natal/`: código, dados, fontes OFL, mídia gerada (recriações, clipes, narrações), vídeos finais e capas.
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
- **Projeto da Vercel: não criado.** O conector da Vercel desta sessão recebeu 403 ao criar projeto, nas duas rotas (`create_project` e `create_git_project`). O Alex é OWNER do time "Lex Technology projects"; falta permissão do conector, não do time. Passo a passo em §9.

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
| Estudo | 2 (vídeos) | Versículos, lugares, números do estudo |

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

| Fase | Entrega | Critério de aceite |
|---|---|---|
| 0. Arranque | Skills instaladas (§7). `site/` criado (stack decidida e registrada aqui). Projeto Vercel `biblia-conectada` ligado ao repo, com Root Directory `site` | `npm run build` passa. Preview `*.vercel.app` responde 200. Comandos documentados no `CLAUDE.md` |
| 1. Dados | `build-data` + testes da §5.5. Tabela de livros PT com abreviações e parser de referência ("Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13") | Testes verdes. Contagens batendo. Nenhum número escrito à mão |
| 2. Leitura | Páginas de livro e capítulo (BLIVRE). Painel de ligações com votos. Backlinks. Prévia. Deep link de versículo. Créditos no rodapé e em `/sobre` | Screenshot 375/1440 nos dois temas. Navegação por teclado. Lighthouse acessibilidade ≥ 95 |
| 2b. Assistente de estudo (IA) | Perguntas sobre um versículo ou tema, respondidas só com o que o site tem: texto BLIVRE e ligações. Plano abaixo da tabela | Toda resposta cita versículos com link e nada fora deles. Teste com perguntas que pedem invenção (deve recusar). Limite por visitante e de tamanho funcionando. Chave só no servidor |
| 3. Busca ⌘K | Referências, livros, texto, lugares e pessoas, com os recentes | Casos de teste do parser. Busca de texto carregando sob demanda |
| 4. Arcos + Grafo | Céu de ligações na home, `/arcos` e `/grafo` | 60 fps no desktop e fluido no celular médio (com LOD). Alternativa em lista. Movimento reduzido respeitado |
| 5. Mapa + Pessoas/Lugares | Base unida (§4.3), nomes PT revisados nos ~150 principais, notas de lugar e pessoa, mapa com relevo e rotas dos estudos | Nomes PT tirados do texto. Lista de incertos registrada |
| 6. Estudos + Home | Páginas dos 2 vídeos (números do `natal-stats.json` e do `stats.json`) com "abrir no grafo" | Vídeo leve (poster + `preload="none"` ou link para o post) |
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
8. **Chave da Anthropic (urgente):** a chave colada no chat em 19/10 deve ser revogada em console.anthropic.com e trocada por outra, que vai só para a variável `ANTHROPIC_API_KEY` da Vercel. Definir no console o teto de US$ 20/mês (Fase 2b).
5. **Tom do texto** do site. Proposta: claro, de estudo, sem jargão, sem "maior do mundo" sem prova.

---

## 9. Deploy na Vercel (passo a passo)

1. Dar acesso do app da Vercel ao repo, se a instalação estiver em "repositórios selecionados". É o mesmo tipo de passo que o Alex fez para o Claude.
2. Criar o projeto `biblia-conectada`:
   - Framework: Next.js. Root Directory: `site`.
   - Install `npm ci`, build `npm run build` e o Ignored Build Step já vêm de `site/vercel.json`; não precisa mexer no painel.
   - A opção que inclui arquivos fora da Root Directory precisa estar ligada, porque o build lê `../fontes` e `../estudos`. Confira.
   - **Estado em 19/10:** o conector da Vercel (time "Lex Technology projects", `team_imSH7u74mbysZKluH23ZCgsN`) achou o repo, mas recebeu 403 ao criar o projeto. Caminhos:
     - (a) O Alex cria no painel: Add New → Project → importar `alexpiraginet-bot/biblia-conectada`. Enquanto o PR #1 não entra no `main`, a pasta `site` ainda não existe lá: importe e, em Settings → Build and Deployment, ponha Root Directory `site`. O primeiro deploy do `main` vai falhar até o merge; os pushes na branch do PR geram preview.
     - (b) O Alex reconecta o conector da Vercel com permissão de escrita e pede para o Claude criar.
3. URL: `biblia-conectada.vercel.app` se o nome estiver livre. Se não estiver, a Vercel acrescenta um sufixo. Registrar aqui a URL final.
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
