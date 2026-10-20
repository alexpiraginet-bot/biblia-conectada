# Handoff para o Codex (20/10/2026, noite)

Escrito pelo Claude a pedido do Alex: "Prepare handoff para o códex seguir". Daqui em diante o Codex conduz. Este é o handoff de transferência que o `docs/claude-coordination.md` ainda não tinha visto: o Claude não tem trabalho aberto no site além do PR deste documento. Tudo marcado como **conferido** foi rodado ou lido nesta data. O que é sugestão está escrito como sugestão.

**Continuidade do Codex, 20/10:** o item 4.1 está implementado localmente na branch `codex/home-immersive-refinement`, com validação parcial descrita abaixo. A revisão de contraste dos cards, Lighthouse, criação do PR em rascunho e prévia da Vercel continuam pendentes; ainda não houve merge desta etapa. O retrato original das 18h43 UTC permanece como histórico.

## 0. Prompt para colar no Codex

> Leia `AGENTS.md`, `CLAUDE.md` e `docs/HANDOFF-CODEX.md` inteiros antes de mexer em qualquer arquivo. Atualize a `main` e rode `npm run build` em `site/`. Depois siga o plano do §4 do handoff, na ordem: um PR por item, cada um numa branch nova a partir da `main`, com as provas do §7. Fale com o Alex em PT-BR.

## 1. Antes de começar

- **Leia, nesta ordem:** `AGENTS.md`, depois `CLAUDE.md` (as regras valem para qualquer agente), este documento, depois os seus `docs/NOVA-EXPERIENCIA.md` e `docs/cronologia-fontes.md` (PR #9) e `docs/ASSISTENTE-IA.md` (PR #11). Por fim, `design/README.md` §1 a §8 e §6.2, e o fim de `HANDOFF.md` §12 (registro).
- **Next.js 16** mudou APIs: `site/AGENTS.md` manda ler `site/node_modules/next/dist/docs/` antes de escrever código do site.
- **Branches:** os seus PRs #9 e #11 entraram na `main` (§2), depois dos #8 e #10. Comece cada item do §4 numa branch nova a partir da `main` atualizada.

## 2. Estado e continuidade

### Item 4.1 — implementação local em revisão (20/10)

- **Branch:** `codex/home-immersive-refinement`, a partir da `main` `a5e741c9` (PR #13 já integrado). Esta entrega altera apenas o site; vídeos e sua automação foram transferidos para uma sessão separada. Não inclui IA, credenciais ou geração de vídeo.
- **Capa:** hero como janela noturna nos temas Dia e Noite, ondas sutis em ouro/vitral, ações com aparência de metal e vidro em CSS, busca antes da constelação, cards com moldura dupla e card de cronologia em papel. Textos BLIVRE, conexões reais, créditos e o `HomeAtlas` com os dados exigidos pelo `check-dist` permanecem.
- **Shader:** `site/src/components/ui/web-gl-shader.tsx`, WebGL2 próprio, um triângulo, sem dependências novas; no máximo 30 quadros/s, DPR até 1,5 e raster até 1440 × 900. Pausa manual, movimento reduzido com quadro estático, suspensão com aba oculta/fora da tela e fallback CSS sem WebGL ou após perda de contexto. O canvas é decorativo; o botão de pausa continua acessível. Seis testes verificam seu ciclo de vida.
- **Conferido localmente:** build, `check-dist`, lint, TypeScript e orçamento de JS; 541 testes em 35 arquivos. Execução local com Node 24; a validação do deploy em Node 22 permanece pendente.
- **JS inicial, gzip nível 9:** capa **163.942 bytes (160,1 KiB)**; `/arcos` **168.871 bytes (164,9 KiB)**, inalterado. O teto continua em 168.960 bytes (165 KiB). Esta medida não inclui HTML, imagens, fontes, dados ou módulos carregados depois.
- **Navegador, build de produção local em `http://localhost:3003`:** capturas em 375 × 812 e 1440 × 900, Dia e Noite; pausa/retomada das ondas, busca por João 1:14, Escape com devolução do foco, âncora da constelação e seleção de Gênesis 1 conferidas.
- **Contraste corrigido e conferido:** véus reais sob o texto dos cards; cálculo conservador sobre imagem branca e brilho máximo do hover: paisagem 7,28:1 na categoria e 9,02:1 no título; céu 8,87:1 e 10,99:1. Capturas do build final confirmam a leitura. **Ainda não aceito:** O requisito Lighthouse móvel ≥ 90 e a comparação de LCP estão **pendentes**: a Google PageSpeed API respondeu `429 quota exceeded`, sem nota ou medição de LCP. Capturas e build não substituem esse aceite. [PR #14](https://github.com/alexpiraginet-bot/biblia-conectada/pull/14) criado em rascunho; prévia da Vercel iniciada, ainda sem conferência final. Nenhum merge desta etapa.

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

**Estado atual:** implementado localmente em `codex/home-immersive-refinement`; conferências e pendências no §2. O shader já ocupa `components/ui`; os efeitos de metal/vidro e a moldura dos cards usam o CSS da capa, sem Tailwind, shadcn ou three.js. Não declarar esta etapa concluída antes dos aceites restantes.

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
5. **Hospedagem:** Vercel em `*.vercel.app`; nada de domínio pago.
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
