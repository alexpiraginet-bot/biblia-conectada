# Handoff para o Codex (20/10/2026, noite)

Escrito pelo Claude a pedido do Alex: "Prepare handoff para o códex seguir". Daqui em diante o Codex conduz. Este é o handoff de transferência que o `docs/claude-coordination.md` ainda não tinha visto: o Claude não tem trabalho aberto no site além do PR deste documento. Tudo marcado como **conferido** foi rodado ou lido nesta data. O que é sugestão está escrito como sugestão.

**Continuidade do Codex, 20/10:** item 4.1 publicado pelo PR #14, commit `6bbca4d94536dde42ae0514588f3b1e80e84e4cf`, com autorização explícita do Alex após informar Lighthouse/LCP pendentes. Deploy de produção `dpl_BBGdYhunFt3QqWFSYh7fUDe5Fnhq` confirmado READY e domínio público conferido. Caderno local e ampliação das jornadas seguem no plano; vídeos continuam em sessão separada. O retrato original das 18h43 UTC permanece como histórico.

## 0. Prompt para colar no Codex

> Leia `AGENTS.md`, `CLAUDE.md` e `docs/HANDOFF-CODEX.md` inteiros antes de mexer em qualquer arquivo. Atualize a `main` e rode `npm run build` em `site/`. Depois siga o plano do §4 do handoff, na ordem: um PR por item, cada um numa branch nova a partir da `main`, com as provas do §7. Fale com o Alex em PT-BR.

## 1. Antes de começar

- **Leia, nesta ordem:** `AGENTS.md`, depois `CLAUDE.md` (as regras valem para qualquer agente), este documento, depois os seus `docs/NOVA-EXPERIENCIA.md` e `docs/cronologia-fontes.md` (PR #9) e `docs/ASSISTENTE-IA.md` (PR #11). Por fim, `design/README.md` §1 a §8 e §6.2, e o fim de `HANDOFF.md` §12 (registro).
- **Next.js 16** mudou APIs: `site/AGENTS.md` manda ler `site/node_modules/next/dist/docs/` antes de escrever código do site.
- **Branches:** os seus PRs #9 e #11 entraram na `main` (§2), depois dos #8 e #10. Comece cada item do §4 numa branch nova a partir da `main` atualizada.

## 2. Estado e continuidade

### Interlinear nativo — publicado e conferido (26/10)

Pedido de Alex atendido com estudo original acima/glosa PT abaixo, transliteração opcional e detalhe ao toque. `/interlinear` apresenta coleção inicial de 22 passagens/282 unidades; links somente nas referências BLIVRE explicitamente cobertas, acesso pelo menu e índice de leitura, OG próprio. Fontes STEP TAHOT/TAGNT fixadas por hash, variantes separadas, comparação BLIVRE inalterada. Glosas editoriais assistidas por IA, sem revisão acadêmica independente; não é Bíblia interlinear completa nem tradução exata.

PR #41, squash `90b09d0139a47fd9c5c88b387001e23a5276da02`, Vercel `dpl_8nJxC43JSmBML5jWZCaUYrTLCpxn` READY no domínio principal. Build final com 819 testes, tipos, lint, check-dist e orçamento passou. Matriz local e pública de 19 casos Chromium/WebKit, 375/1440, Dia/Noite aprovada; no celular, primeira palavra em 358,5 px e detalhe revelado em 76 px. Fontes por hash, capas PNG, contraste e isolamento do corpus conferidos. JS público: índice 149.615 B, estudo 152.245 B, Arcos 168.760 B gzip9; margem de Arcos só 200 B. [Método](INTERLINEAR.md) e [evidências](evidence/2026-10-26-interlinear.md). Sem editar estudos, fazer chamadas pagas ou validar iPhone físico.

### Motion enviado por Alex — rejeitado e retirado da produção (25/10)

**Decisão atual de Alex:** a seção com vídeo não atende ao pedido. Ele quer interpretação nativa da referência ou a retirada. Esta rodada remove a seção, o player e as mídias públicas, preservando originais e evidências; não entrega outra peça decorativa. A direção para eventual nova implementação é o grafo existente, com fios ligados a passagens reais e resposta ao toque/ponteiro. Detalhes em `docs/LIVING-STORY.md`; o parágrafo seguinte registra a publicação anterior, agora rejeitada criativamente.

**Retirada publicada:** PR #40, squash `3c33d8a89c527adfe4d66a6ba6845b9ee3c93aa8`, Vercel `dpl_CCDTKxVYyaxBEmjcg6MMt4nCcwoa` READY com alias principal. Build com 806 testes, lint e orçamento passou; oito cenários públicos Chromium/WebKit, 375/1440, Dia/Noite passaram, com guia/grafo/links preservados e nenhuma requisição às mídias retiradas. Os quatro arquivos retornam 404. Home pública 167.171 B gzip9; Arcos 168.726 B. [Evidências da retirada](evidence/2026-10-25-living-story-withdrawal.md). A aprovação técnica anterior não significou aprovação criativa.

PR #39, squash `9ec27c634e54e2ac4175cd528aca74959b4b86a5`, Vercel `dpl_8dKX7QCChUBnNSt6oNf3pHcdhoTg` READY no domínio principal. Seção da home **Sua história também se conecta**, a partir do ZIP editável enviado por Alex. Movimento fiel digital/portal/rede sobre a Bíblia; entrada para Coração, leitura e conexões reais. Vídeo silencioso de 12 s/2,54 MB, controlador adiado, pausa/replay e seleção de formas, sem Three/GSAP no frontend. Arte identificada como recriação ilustrativa; originais preservados. Build com 826 testes, tipos, lint, check-dist e orçamento passou. Oito cenários públicos Chromium/WebKit, 375/1440, Dia/Noite passaram; cinco rotas HTTP 200/HIT, hashes dos assets e Range 206 conferidos. JS inicial público home 167.500 B/Arcos 168.726 B gzip9, abaixo do teto. O limite de mídia da prévia protegida foi isolado e não se repetiu em produção; Safari em iPhone físico e FPS não verificados. [Decisão](LIVING-STORY.md) e [evidências](evidence/2026-10-25-living-story.md). Estudos 6/7 do Claude incorporados sem edição; sem chamadas pagas ou publicação social.

### Leitura móvel e menu em repouso — publicados e conferidos (23/10)

PR #38, squash `0435dbc34905a7d0beac53508d187158ccdef820`, Vercel `dpl_51ysMakYJmSyUZvM1RJZCxMsEHbD` READY no domínio `www.bibliaconectada.company`. Em Arcos móvel, painel maior e com rolagem única, cabeçalho de referência/contagem compacto e botão Ampliar leitura/Voltar ao céu. A pílula some após 1,5 s e reaparece ao toque, movimento, rolagem ou teclado, sem deslocar o texto nem consumir o primeiro toque. Menu aberto e foco de teclado mantêm a navegação disponível. Mapa de Jesus e Cronologia estão no menu completo; as outras rotas preservam o menu visível. Build com 806 testes, lint e orçamento passou; 16 casos locais, oito na prévia e oito públicos aprovados. Arcos público usa 168.726 B gzip9 inicial, abaixo do teto de 168.960 B, com módulo adiado discriminado. Revisões independentes de performance e UI/UX concluídas. Safari em iPhone físico e FPS não medidos; a limitação gráfica anterior de WebKit com movimento reduzido permanece documentada. [Evidências](evidence/2026-10-23-mobile-reading-space.md).

### Open Nova Bíblia Viva — publicada e conferida (21/10)

Após autorização de Alex, o PR #28 (`bf608f31805ee26001c8b8972eb3bfce2ad20b9e`) adiciona leitura integral em `/ler/open-nbv`, com 66 livros, 1.189 capítulos e 31.105 posições, importadas sem reescrita do ZIP já preservado em `fontes/`. Texto, IA, voz do aparelho e imagens de compartilhamento mantêm a edição. A troca de tradução abre o capítulo; conexões da Open NBV são por capítulo, sem equivalência de versículos presumida. Busca por palavras, cronologia e grafos originais continuam BLIVRE. A tradução própria é piloto editorial separado, fora desta integração. Build com 705 testes, tipos, lint, check-dist e orçamento passou; agentes de performance, UI e UX concluíram sem bloqueador. Produção `dpl_DQGkFDQ4FzwUK4cgV333e6s9zLaV` READY com alias principal; 64 verificações públicas, capturas 375/1440 Dia/Noite, HTML/PNG/cache e uma resposta real de IA com oito citações da edição conferidos. [Evidências e limites](evidence/2026-10-21-open-nbv.md).

### Item 4.1 — publicado e conferido (20/10)

- **Branch:** `codex/home-immersive-refinement`, a partir da `main` `a5e741c9` (PR #13 já integrado). Esta entrega altera apenas o site; vídeos e sua automação foram transferidos para uma sessão separada. Não inclui IA, credenciais ou geração de vídeo.
- **Capa:** hero como janela noturna nos temas Dia e Noite, ondas sutis em ouro/vitral, ações com aparência de metal e vidro em CSS, busca antes da constelação, cards com moldura dupla e card de cronologia em papel. Textos BLIVRE, conexões reais, créditos e o `HomeAtlas` com os dados exigidos pelo `check-dist` permanecem.
- **Shader:** `site/src/components/ui/web-gl-shader.tsx`, WebGL2 próprio, um triângulo, sem dependências novas; no máximo 30 quadros/s, DPR até 1,5 e raster até 1440 × 900. Pausa manual, movimento reduzido com quadro estático, suspensão com aba oculta/fora da tela e fallback CSS sem WebGL ou após perda de contexto. O canvas é decorativo; o botão de pausa continua acessível. Seis testes verificam seu ciclo de vida.
- **Conferido localmente:** build, `check-dist`, lint, TypeScript e orçamento de JS; 541 testes em 35 arquivos. Execução local com Node 24; build de produção na Vercel confirmado com Node 22 e estado READY.
- **JS inicial, gzip nível 9:** capa **163.942 bytes (160,1 KiB)**; `/arcos` **168.871 bytes (164,9 KiB)**, inalterado. O teto continua em 168.960 bytes (165 KiB). Esta medida não inclui HTML, imagens, fontes, dados ou módulos carregados depois.
- **Navegador, build de produção local em `http://localhost:3003`:** capturas em 375 × 812 e 1440 × 900, Dia e Noite; pausa/retomada das ondas, busca por João 1:14, Escape com devolução do foco, âncora da constelação e seleção de Gênesis 1 conferidas.
- **Contraste corrigido e conferido:** véus reais sob o texto dos cards; cálculo conservador sobre imagem branca e brilho máximo do hover: paisagem 7,28:1 na categoria e 9,02:1 no título; céu 8,87:1 e 10,99:1. Capturas do build final confirmam a leitura. **Medição pendente, publicação autorizada pelo Alex:** o requisito Lighthouse móvel ≥ 90 e a comparação de LCP estão **pendentes**: a Google PageSpeed API respondeu `429 quota exceeded`, sem nota ou medição de LCP. Não há nota de performance comprovada. [PR #14](https://github.com/alexpiraginet-bot/biblia-conectada/pull/14) integrado com a autorização posterior do Alex: "Vamos publicar". Prévia respondeu HTTP 200; produção READY, capturas 375/1440 Dia/Noite, pausa/retomada e busca por João 1:14 com Escape/devolução do foco conferidos no domínio público; console sem erros ou avisos.

### Retrato histórico: 20/10, 18h43 UTC — `main` = `ddf090a`, toda no ar
- **PR #7**, `5bbb11a`:
  - na escultura de `/arcos`: caminho entre dois versículos, palavra acesa, grupos de livros no eixo, força das ligações e imagem para compartilhar;
  - na leitura: no painel do versículo, toda ligação com o texto inteiro da BLIVRE, e embaixo a **lista sem fim** (`site/src/components/reader/LinksFeed.tsx`, regra em `site/src/lib/links-feed.ts`, design §6.2).
- **PR #8**, `ef1cdf6`, integrado com autorização do Alex:
  - todo arquivo de `public/data` pedido no navegador desiste em 10 s (`DATA_TIMEOUT_MS` em `site/src/lib/community/fetchers.ts`);
  - a lista sem fim tenta a seção de novo uma vez e já busca a seguinte.
- **PR #10**, `42039b7`:
  - corrige um corte de texto que eu (Claude) tinha posto no ar: `contain-intrinsic-size` dava 1.280 px de largura às seções puladas da lista sem fim;
  - na produção, às 18h38 UTC, a folha de Lv 26:3 no celular (390 px, 3 rodadas): 388 px de conteúdo para 388 visíveis, com 3 seções da lista. Antes da correção eram 1.296 para 388.
- **PR #9**, o seu, `766c727`, integrado às 18h30 UTC:
  - a capa com o atlas ilustrado (a constelação de capítulos com os oito medalhões), `/caminhos`, `/cronologia`, o "Ouvir passagem", as Descobertas e as ilustrações locais;
  - os tokens v5: o Noite passou do azul-marinho da v4 para verde profundo (`#091c17`). Pelo `docs/NOVA-EXPERIENCIA.md`, a capa é azul profundo, ouro e papel, e a cronologia é em papel. A Figtree entrou na interface;
  - o `tests/tokens.test.ts` confere toda a tabela de contraste contra os tokens, e passou com a v5. Mas o `design/README.md` e o `DESIGN.md` ainda descrevem a v4: a tabela nova do design §3 sai de `npx tsx scripts/contrast-table.ts` (em `site/`);
  - na escultura, o atalho "Começar por Daniel 9" (`?v=` e `#daniel/9`).
- **PR #11**, o seu, `ddf090a`, integrado às 18h34 UTC:
  - o companheiro de estudo com IA em `/assistente` e `/api/assistente`, com teto de US$ 20 por mês num ledger no Redis (`docs/ASSISTENTE-IA.md`);
  - desligado na produção: às 18h43 UTC, `GET /api/assistente` respondeu `"available": false`. A chave nova da Anthropic depende do Alex (`docs/ASSISTENTE-IA.md`);
  - nada dele fica no navegador (nenhum `localStorage` ou IndexedDB em `components/assistant` e `lib/assistant`), e nenhum padrão de chave nem `.env` entrou no repositório.
- **Medido na `main` `ddf090a`**, neste ambiente:
  - `npm run build`: 529 testes em 33 arquivos; o `check-dist` passou em 2.539 páginas pré-renderizadas e na 404;
  - `npm run budget` (JS por página, gzip, teto de 165 KiB): **`/arcos` 165,0, no teto**; capa 157,8; `/caminhos` 154,4; `/cronologia` 154,0; `/assistente` 153,9; versículo 153,0; capítulo 148,9.

### Inventário do handoff original (18h43 UTC)
| Assunto | Onde | Como está |
|---|---|---|
| Passagens salvas | `site/src/lib/salvos.ts`, chave `bc:salvos:v1`, página `/salvos` | `localStorage`, só no aparelho |
| Buscas recentes | `site/src/components/search/SearchPanel.tsx`, chave `bc-recent-searches` | As 5 últimas |
| Comunidade | `site/src/lib/community/store.ts` (`bc:ponte`, `bc:ponte-faixa`, `bc:trilha:<slug>`, `bc:mesa`) | `localStorage`, leitura e escrita protegidas |
| Progresso das Descobertas | `site/src/lib/journey.ts`, chave `bc:journey:v1` | `localStorage` |
| Eventos com lugares e datas | `site/src/data/generated/linha-do-tempo/events.json` (pipeline `site/scripts/data/timeline.ts`), nomes em `place-names.json` | 450 eventos do Theographic (cronologia de F. N. Jones). 123 tocam os evangelhos (versículos de Mateus a João), e 85 desses têm lugar. Cada evento tem `sortKey`, `year`, `places` (nome tirado da BLIVRE, `placeID`, `gv`), `verses` e `predecessor` |
| Capa de hoje | `site/src/app/page.tsx` (PR #9) | Hero com selo e ponto vivo, título "Uma história. Tudo se conecta.", abas de experiência e a constelação (`LivingGraph`) ao lado. Embaixo: busca, cards, céu, história, Descobertas e, dentro de um `<details>`, o atlas de Isaías 9 (`HomeAtlas`), com os números que o `check-dist` confere (§6) |
| Fontes livres | `fontes/` (`catalogo.json`, `SHA256SUMS`): `theographic`, `openbible-geo`, `wikidata-recepcao`, `blivre`, `morphgnt`, `oshb`, `stepbible`… | Toda fonte nova entra aqui antes de ser usada (regra 1) |
| Imagens com procedência | Medalhões (manifesto com prompt, modelo, data e SHA-256, mostrado em `/sobre`, com teste); as suas ilustrações em `design/local-flux/` | Modelo a seguir |
| WebGL próprio | `site/src/components/sculpture/` (escultura) e `site/src/components/sky/renderer.ts` | `softwareRenderer()` reconhece GPU por software; a escultura só desenha ao vivo com GPU de verdade |
| Tailwind, shadcn, three.js, `components/ui` | — | **Não existem no projeto.** Estilo é CSS modules + tokens (`site/src/styles/tokens.json` → `tokens.css`) + `ds.css` |

## 3. O que o Alex pediu (20/10, noite, palavras dele)

1. "Visual de hero também vamos mudar. Assim será sua referência nova! Use botões e cards semelhantes a esse visual moderno! Muito scroll e design."
   - Com o código de um componente `WebGLShader` (three.js) e dos botões `LiquidButton` e `MetalButton` (shadcn, Tailwind, `class-variance-authority`, `@radix-ui/react-slot`).
   - O resumo da referência está no §4.1. O código está na mensagem dele.
2. "Precisamos que dados sejam salvos no navegador de cada pessoa, pesquisas, anotações, memórias e etc!"
3. "E precisamos de mais imagens que represente capítulos e versículos mais importantes!"
4. "Uma parte visual, com Mapas, leitura diferente, aonde a pessoa ler pelas idas e vindas de Jesus e cronologia."

Antes disso, no mesmo dia, ele pediu a lista sem fim da leitura: "As conexões aqui precisam estar toda visível! … algo fácil para qualquer pessoa adorar rolar e ler! Um ciclo infinito". Está no ar (§2). O que vier agora não pode esconder texto de novo.

## 4. Plano, em ordem (um PR por item)

### 4.1 Hero e botões/cards novos (a referência do Alex)

**Estado atual:** publicado pelo PR #14; conferências e medições ainda pendentes no §2. O shader já ocupa `components/ui`; os efeitos de metal/vidro e a moldura dos cards usam o CSS da capa, sem Tailwind, shadcn ou three.js. Publicação autorizada pelo Alex sem declarar atendido o requisito de Lighthouse/LCP.

**Base do pedido:** a capa do PR #9. O pedido troca o hero, a primeira tela, e renova os cards. A referência e o plano original abaixo ficam preservados para comparação com a implementação.

**A referência**
- Fundo preto com linhas de luz que ondulam, desenhadas por um shader em tela cheia:
  - três ondas senoidais, uma por canal de cor;
  - levemente separadas perto das bordas (aberração cromática);
  - animadas pelo tempo.
- Por cima:
  - uma moldura de 1 px (`#27272a`) dentro de outra;
  - título enorme, extra negrito e apertado;
  - uma linha de apoio em branco a 60%;
  - um selo com ponto verde pulsando;
  - um botão redondo de "vidro líquido": sombras internas e um filtro SVG de distorção.
- O `MetalButton` tem variantes `gold` e `bronze`, que combinam com o ouro e o bronze do site.

**Como encaixar neste projeto.** O padrão sugerido não instala Tailwind, shadcn nem three.js:
- **three.js** (0.186.1): só o que o `WebGLShader` usa dele, empacotado e minificado com esbuild, dá 129 KiB em gzip (medido em 20/10), para desenhar um retângulo com um shader. A capa tem hoje 157,8 KiB: com three, passaria muito do teto de 165. O mesmo efeito em WebGL2 puro cabe em poucas dezenas de linhas (estimativa), e o projeto já tem o próprio WebGL.
- **Tailwind + shadcn** criariam um segundo sistema de estilo ao lado dos tokens. As classes dos botões são do Tailwind v4 (`bg-linear-to-t`, `inset-shadow-*`) e pedem as variáveis de tema do shadcn (`--primary`, `--ring`…).
- **A pasta `site/src/components/ui/`:** crie-a assim mesmo. É a convenção do shadcn para os primitivos compartilhados (botão, card, shader). Com ela, um componente que o Alex trouxer do 21st.dev entra sempre no mesmo lugar, com a mesma API (`<LiquidButton size="xl">`), e quem ler o código acha os primitivos num só ponto.
- **Se o Alex preferir colar componentes do 21st.dev sem portar:**
  1. em `site/`: `npm install tailwindcss @tailwindcss/postcss postcss`;
  2. crie `postcss.config.mjs` com o plugin `@tailwindcss/postcss`;
  3. ponha `@import "tailwindcss";` no topo de `src/app/globals.css`;
  4. rode `npx shadcn@latest init`: ele cria `components.json`, `src/lib/utils.ts` (`cn`) e aponta `@/components/ui`;
  5. instale `class-variance-authority @radix-ui/react-slot clsx tailwind-merge`;
  6. mapeie `--primary`, `--background`, `--ring` etc. para os tokens existentes, nunca para cores soltas.

  O custo (dois sistemas de estilo, mais JS) vai para o Alex decidir (§8).

**Plano original de construção (registro)**
- `site/src/components/ui/web-gl-shader.tsx`:
  - **render:** WebGL2 puro com o mesmo fragment shader. A matemática é `0.05 / abs(p.y + sin((x + time) * xScale) * yScale)` por canal, com `x` distorcido por `length(p) * distortion`, e `xScale` 1, `yScale` 0,5, `distortion` 0,05;
  - **cores:** sugiro tingir os três canais com o ouro e o vitral dos vídeos (`sky-gold`, os azuis e o violeta de `PAL_C`, design §2) em vez do RGB puro. Assim a capa continua com a cara dos Reels (anti-objetivo A3);
  - **tela:** `position: absolute` dentro do hero, não `fixed` na página inteira; `aria-hidden`; DPR no máximo 2;
  - **para quando ninguém vê:** fora da tela (IntersectionObserver), com a aba escondida (`visibilitychange`) e com `prefers-reduced-motion` (um quadro parado);
  - **sem GPU de verdade** (`softwareRenderer()`, `failIfMajorPerformanceCaveat`): um fundo estático no lugar.
- `site/src/components/ui/liquid-glass-button.tsx` e `metal-button.tsx`: porte para CSS module com tokens.
  - O filtro SVG em `backdrop-filter: url(#…)` não funciona no Safari. Lá o botão precisa ficar bonito sem ele.
  - Alvo de toque de 44 px e foco visível (design §8).
- `site/src/components/ui/card.tsx`: a moldura dupla de 1 px como card padrão das seções da capa e das listas novas.
- **Conteúdo verdadeiro no lugar do texto de exemplo:**
  - **título:** a marca, ou "Leia a Bíblia pelas ligações";
  - **apoio:** números do pipeline. Os 31.102 versículos e as 344.799 referências saem de `summary.json`, e o `check-dist` já confere esses números na capa (regra 3; hoje eles estão no `HomeAtlas`, §6);
  - **selo:** algo verdadeiro e vivo, por exemplo "Ponte de hoje: nº N" ou, com histórico salvo (§4.2), "Continuar em Levítico 26";
  - **botão principal:** "Começar a ler" ou "Continuar".
  - Nada de "Available for New Projects".
- **"Muito scroll e design":** seções ligadas à rolagem, como você já fez no PR #9. Sem prender a rolagem, com o conteúdo visível sem JavaScript, e nada animando por cima de texto em leitura.
- **Contraste:** sobre o pior quadro do shader, o título precisa de 7:1 e o apoio de 4,5:1, como `sky-ink` e `sky-ink-2` no céu (design §3). Meça com a auditoria do navegador; se uma onda cruzar o texto, ponha um véu atrás dele ou baixe o brilho ali.
- **Aceite:**
  - JS da capa ≤ 165 KiB (base original: 157,8; medição local atual no §2);
  - Lighthouse da capa no celular ≥ 90, sem piorar o LCP de hoje;
  - capturas em 375 e 1440 px, Noite e Dia;
  - movimento reduzido: um quadro parado;
  - sem GPU: o fundo estático.

### 4.2 Dados salvos no navegador (buscas, anotações, memórias…)

Tudo fica no aparelho: sem conta, sem servidor. A frase "Ficam só neste aparelho" já existe em `/salvos`.

- **Onde guardar:**
  - **IndexedDB** para o que cresce (anotações, histórico, memórias), com um wrapper pequeno escrito no projeto, sem dependência nova de produção;
  - **`localStorage`** continua para o que é pequeno e já existe;
  - um módulo único `site/src/lib/local/` com esquema versionado e migração das chaves atuais (§2): `bc:salvos:v1` e `bc-recent-searches` entram sem perda.
- **O que guardar:**
  - **buscas:** as últimas 50, com data e "Apagar histórico";
  - **anotações:** por versículo ou trecho (`from`/`to` em índice global de versículo), texto livre, criada e editada em;
  - **memórias**, em dois sentidos (o Alex escolhe se ficam os dois, §8):
    - **Decorar:** versículos para memorizar, com revisão em caixas de Leitner (1, 2, 4, 8 e 16 dias);
    - **Diário:** entradas livres ligadas a uma passagem;
  - **conversas com o companheiro de estudo** (PR #11), se o Alex quiser: hoje nada dele fica no aparelho;
  - **histórico de leitura:** o último capítulo e versículo, para o "Continuar" do hero, e os capítulos lidos;
  - **progresso:** Descobertas, caminhos e cronologia lidos, Ponte, Trilha, Mesa.
- **Onde aparece:**
  - **no painel do versículo:** "Anotar" e "Decorar", ao lado do "Salvar" que já existe na barra de seleção. É uma ilha de cliente pequena, porque o painel é server component;
  - **`/salvos` vira o caderno:** abas Salvos, Anotações, Decorar, Histórico e Buscas;
  - **na busca:** as recentes;
  - **na capa:** "Continuar".
- **Nunca perder:**
  - "Exportar meu caderno" baixa um arquivo JSON com tudo, `localStorage` `bc:*` e IndexedDB;
  - "Importar" mescla sem duplicar;
  - "Apagar tudo" pede confirmação;
  - peça `navigator.storage.persist()` na primeira anotação;
  - aba anônima e cota cheia: avise, não quebre.
- **Testes:**
  - o armazenamento com um backend em memória injetável;
  - a migração das chaves antigas;
  - exportar e importar ida e volta;
  - Leitner (próxima revisão).
  - `fake-indexeddb` só como dependência de desenvolvimento, se precisar.

### 4.3 Mais imagens para os capítulos e versículos mais importantes

- **Quais:** por regra calculada, nunca por lista digitada (regra 3). Por exemplo:
  - os 40 capítulos com mais pares de versículos ligados (`chapter-pairs.json`, empates mantidos);
  - os 40 versículos mais ligados (contagem das páginas de leitura).

  Um script gera o manifesto (`site/src/data/imagens.json`: alvo, arquivo, fonte, licença, crédito, SHA-256, `alt` em PT-BR, rótulo). Um teste confere que a seleção bate com os dados e que toda imagem tem licença, crédito e `alt`.
- **De onde, nesta ordem:**
  1. **Arte em domínio público**, via Wikimedia Commons, com a licença conferida na página de cada arquivo:
     - as gravuras de Gustave Doré para a Bíblia (1866), num estilo só;
     - "Die Bibel in Bildern", de Schnorr von Carolsfeld (1860);
     - James Tissot, "A vida de Cristo" (1886–1894), no Brooklyn Museum.

     Registre em `fontes/` (`catalogo.json`, `SHA256SUMS`), em `ATTRIBUTION.md` e em `/sobre`. Rótulo: "Gravura de Gustave Doré (1866), domínio público". Não é "Recriação".
  2. **Geração local**, como as suas FLUX, com o metadado em `design/local-flux/` e o rótulo visível "Recriação".
- **Regras de imagem:**
  - **sem rosto de criança** (regra 8): você já recusou versões da Natividade por isso; mantenha;
  - **Unsplash fica de fora:** a licença dele não é domínio público nem CC BY ou CC BY-SA (regra 1), a não ser que o Alex aprove.
- **Peso:**
  - AVIF/WebP, até 120 KB a 1200 px (sugestão de teto);
  - `loading="lazy"` fora da primeira tela;
  - tamanhos por largura;
  - o crédito junto da imagem e em `/sobre`.
- **Onde aparece:** no topo do capítulo, no painel dos versículos escolhidos (o versículo pode herdar a imagem do capítulo), nos cards da capa e nos caminhos.

### 4.4 Mapas, leitura pelas idas e vindas de Jesus e cronologia

- **Ampliar os seus `/caminhos` e `/cronologia`** dos recortes editoriais (8 paradas, 10 momentos) para os dados:
  - **eventos:** os 123 eventos do Theographic nos evangelhos, em ordem de `sortKey`;
  - **lugares:** os 85 eventos com lugar ganham coordenadas do Theographic e da `openbible-geo`, já em `fontes/`;
  - **nomes:** saem do texto da BLIVRE (`place-names.json`, regra 4).
  - A cronologia de Jones é uma proposta; diga isso na página como o `docs/cronologia-fontes.md` já faz.
- **"Leitura diferente":** ler a vida de Jesus em ordem com o mapa acompanhando, em rolagem contínua (o "muito scroll" do pedido 1):
  - **cada evento é uma seção:** lugar e data aproximada; o texto inteiro do relato principal; os paralelos em abas, dizendo quando um evangelho não tem o episódio; as ligações (pode usar a lista do painel do versículo);
  - **o mapa:** no desktop fica preso ao lado e anda até o lugar da seção na tela, desenhando o trajeto desde o anterior (as idas e vindas); no celular vira um mapa pequeno no topo;
  - **endereço:** cada passo tem o seu (`/caminhos/<slug>`), e o teclado funciona.
- **Mapa:**
  - SVG próprio, como o seu `AncientJourneyMap`, sem servidor de tiles nem chave;
  - se faltar contorno de costa, lagos ou rios, use o Natural Earth (domínio público), registrado em `fontes/`.
- **Depois**, com o mesmo motor: Abraão, o Êxodo e as viagens de Paulo.

## 5. Regras que não mudam (resumo do `CLAUDE.md`)

1. **Só fontes livres:** domínio público, CC BY ou CC BY-SA. Texto de tradução protegida (ACF, NVI, ARA…) nunca entra.
2. **Créditos visíveis:** em `/sobre` e no rodapé.
3. **Números:** todo número no site sai de código, com teste.
4. **Nomes de lugares e pessoas:** saem do texto da BLIVRE.
5. **Hospedagem:** Vercel. Alex comprou e autorizou `www.bibliaconectada.company` em 22/10; esse é o domínio principal. Novas compras e mudanças de plano continuam exigindo autorização.
6. **`estudos/`:** só se lê, não se mexe.
7. **Segredos:** nenhum no repositório nem em log. O link de compartilhamento da prévia da Vercel (`_vercel_share`) também é segredo.
8. **Imagens:** sem rosto de criança, e recriação sempre marcada.
9. **"Pronto":** só com build, testes e capturas em 375 e 1440 px, Noite e Dia. O que não foi conferido, diga.

## 6. Armadilhas que já custaram tempo (aprendidas nesta semana)

- **Páginas escondidas no DOM:** o roteador do Next 16 mantém a página anterior escondida no documento (Activity).
  - Ids fixos se repetem: use `useId()`.
  - Em testes de navegador, procure só no que está visível (`getClientRects().length > 0`).
- **`content-visibility: auto`:** nunca com largura intrínseca. Use `contain-intrinsic-block-size`, e numa grade, coluna `minmax(0, 1fr)`. O PR #10 corrigiu exatamente isso.
- **Listas longas de links:** `prefetch={false}`. Senão cada linha que passa na tela baixa uma página inteira.
- **Números da capa:** o `check-dist` exige no `index.html` os números de `summary.json`, o parágrafo `data-definition` e os versículos mais ligados (`data-top-verse`), hoje dentro do `HomeAtlas`. Se o hero novo tirar o atlas da capa, leve isso junto, ou o build falha.
- **Tokens:** `tests/css-vars.test.ts` acusa qualquer `var(--x)` que ninguém declara. Rode `npm test` depois de mexer em tokens.
- **Arquivos de `public/data`:** use `site/src/lib/community/fetchers.ts`, que já tem cache e o limite de 10 s.
- **Orçamento de JS:** `/arcos` está no teto (§2). Todo JS novo no que é comum às páginas (cabeçalho, menu, rodapé, layout) passa `/arcos` de 165 KiB. Ponha o código novo só nas páginas que o usam, ou carregue depois. Para partes só de cliente carregadas depois, `React.lazy` saiu mais leve que `next/dynamic`.
- **Lint e hooks:** o lint barra `setState` síncrono em effect e acesso a ref no render. Para "estou no cliente", use `useSyncExternalStore`.
- **Prévias da Vercel:** são protegidas. O acesso é pelo link de compartilhamento do conector da Vercel, passado a scripts por variável de ambiente e nunca impresso.
- **Proxy deste ambiente de testes:** às vezes devolve 502 ou segura um pedido. Conte falhas de rede à parte dos erros da página, e espere por condição, não por tempo fixo.
- **Pôsteres de `/arcos`:** saem de `site/scripts/render-sculpture-poster.mjs`. Refaça-os se o visual da escultura mudar.
- **iPhone do Alex:** uma aba antiga mostra a versão velha. Peça para recarregar antes de concluir que algo não entrou.

## 7. Como verificar e entregar

- **Em `site/`:**
  - `npm ci`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test` (gera os dados e roda o vitest);
  - `npm run build` (inclui os testes e o `check-dist`);
  - `npm run budget`.
- **No navegador**, no servidor de produção local (`npx next start`):
  - capturas em 375 e 1440 px, Noite e Dia, de cada tela tocada;
  - auditoria de contraste.
  - O Claude usou scripts Playwright próprios fora do repo; o seu `docs/evidence/` cumpre o mesmo papel.
- **Entrega:**
  - um PR por item do §4, em rascunho, com as provas no corpo;
  - prévia da Vercel conferida;
  - o Alex faz o merge, ou autoriza;
  - registre cada entrega no fim de `HANDOFF.md` §12, no mesmo formato das entradas de 20/10. O `HANDOFF.md` e o `design/README.md` agora são seus também: atualize o que ficar velho.

## 8. Decisões para o Alex

1. **Paleta do hero — aplicada localmente no item 4.1:** janela sempre noturna nos dois temas, com ondas em ouro/vitral; o restante segue Dia e Noite. A revisão visual está descrita no §2.
2. **Ferramental — aplicado no item 4.1:** WebGL2 próprio e CSS modules, sem dependências novas. A alternativa Tailwind/shadcn/three.js acima permanece como registro, não como instalação pendente desta entrega.
3. **"Memórias":** versículos para decorar, diário pessoal, as conversas com o companheiro de estudo (PR #11), ou mais de um?
4. **Imagens:** gravuras em domínio público (Doré, Schnorr, Tissot), geração local, ou as duas, com qual estilo dominante?
5. **Itens de §14 do `design/README.md`** ainda abertos, em especial a escultura abrir na Bíblia inteira ou em Isaías 9:6 (9; o PR #9 acrescentou o atalho para Daniel 9, sem mudar a abertura) e a escultura no Dia (12).

## 9. Continuação de 21/10: conversa e voz (PR31)

Os registros desta seção são históricos. O diagnóstico mais recente consta no §10.

`/coracao` acrescenta conversa com Sonnet 5.5, fontes reais Open NBV/BLIVRE e o modo À luz de Jesus. Navegação móvel flutuante revisada; Buscar/Ponte continuam em Mais. Build e 773 testes passaram na fonte `c3d43cb`, prévia READY e três respostas reais de texto conferidas. Evidência detalhada: `docs/evidence/2026-10-21-heart-conversation-voice.md`.

Voz OpenAI implementada com chave exclusivamente server-side, ticket assinado, teto total existente de US$20/mês e subteto de US$5 para voz. A conta recusou a credencial da Vercel com `invalid_api_key`. A variável tem o nome correto, mas isso não comprova validade do valor. Production continua sem ativação da voz; não recuperar nem registrar o segredo. Após o usuário substituir o valor, fazer novo deploy Preview e teste real antes de ativar Production. Não há prova de áudio real, sotaque, autoplay ou silencioso em iPhone.

**Atualização 22/10:** PR #32 corrige altura e espaçamento do Coração no celular, sugestões e painel de privacidade em telas baixas. Build773, geometria em16contextos e revisão independente Chromium/WebKit passaram. A chave foi substituída após o deploy anterior, porém a nova prévia recebeu novamente `invalid_api_key`, sem áudio; Production mantém voz desligada. [Evidência e limites](evidence/2026-10-22-heart-mobile-geometry.md).

**Estado posterior da mesma rodada:** PRs #32 e #33 publicados em `6d8ab82`, Vercel READY. Seis casos de tela passaram no endereço público. Após nova troca da chave e pedido expresso de publicar para teste, a voz foi habilitada em Preview/Production. Texto real HTTP200; áudio ainda HTTP502 na conexão com a OpenAI, sem código diagnóstico específico nem WAV. A nota anterior de voz desligada é histórica: ela agora está habilitada, porém não validada como funcional. Ferramentas compartilhadas e teste OpenMontage concluídos. [Registro final, caminhos e limites](evidence/2026-10-22-release-and-local-tools.md).

## 10. Domínio e correção do Coração — 22/10

PR #35 integrado em `1c9201d9130c31cdf26a564db4670c14383f68ce`. Domínio principal `https://www.bibliaconectada.company`, apex com redirecionamento 308 preservando caminho e query, HTTPS válido. O host antigo permanece acessível; dados locais não migram entre origens.

Texto continua na Anthropic (`claude-sonnet-5-5`). Na prévia READY, “Alguém me xingou no WhatsApp” retornou HTTP 200 em 8,5 s, com sete citações conferidas contra a Open NBV. Falhas técnicas deixaram de culpar a pergunta; uma nova tentativa após falha confirmada exige ação explícita e avisa sobre o limite.

OpenAI é usada somente para voz. O diagnóstico atual é `insufficient_quota`, antes de gerar áudio; os registros anteriores de `invalid_api_key` são históricos. A voz está habilitada para teste por pedido do Alex, mas não há WAV nem validação de qualidade, autoplay ou silencioso no iPhone. Nenhuma chave foi substituída, cota aumentada ou crédito comprado nesta rodada. Conferir crédito/limites do projeto “Bíblia” na conta OpenAI antes de outra chamada de voz.

Build local: 796 testes em 57 arquivos, tipos, lint, check-dist e orçamento aprovados. Evidência: [registro desta rodada](evidence/2026-10-22-domain-heart-voice-diagnosis.md).

**Produção conferida:** `dpl_nZCBs7SDKhGNmSB3eYiF9qGJS6Bk` READY no domínio novo. A pergunta do print respondeu em 8,1 s pela interface publicada, com sete citações exatas e sugestão para copiar. Seis contextos de tela e dez verificações de domínio/identidade passaram. Voz desligada somente no teste textual para evitar repetir a falha de cota já diagnosticada; configuração da voz permanece habilitada para teste. Servidor local encerrado.
