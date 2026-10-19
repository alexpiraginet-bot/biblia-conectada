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

**O site ainda não existe.** Nenhum projeto da Vercel foi criado.

**Bloqueios desta sessão (políticas, não erros do repo):** a sessão na nuvem não podia criar repositório (403 em `/user/repos`) nem criar Release (403). Por isso o repo foi criado pelo Alex e os intermediários foram para uma branch órfã.

---

## 3. Decisões tomadas

1. **Traduções protegidas ficam fora.**
   - O Alex pediu "Mantenha tudo! A Bíblia não pode ter direitos autorais!". O texto original é de domínio público, mas tradução moderna é obra protegida.
   - Base legal: Lei 9.610/98, art. 7º, XI (traduções são obras protegidas), art. 14 (quem traduz obra em domínio público tem direito sobre a própria tradução) e art. 41 (70 anos após a morte do autor).
   - Publicar o texto completo da ACF, NVI ou AA num repo público pode tirar repo e site do ar.
   - **Ficam:** citações curtas com a fonte (art. 46, III), como as 22 de `verses.json` e as dos vídeos.
   - **Vão no lugar:** todas as traduções livres achadas (seção 4).
2. **Texto principal do site: Bíblia Livre (BLIVRE, CC BY 4.0).** É a única tradução livre completa com numeração idêntica à da base de referências (0 diferenças em 1.189 capítulos).
3. **Repo leve:** heavy media fora do `main`. Clone raso e deploy da Vercel não baixam a branch `film-intermediates`.
4. **Domínio:** subdomínio gratuito `*.vercel.app`. Comprar domínio só com aprovação do Alex.
5. **Mesma definição dos vídeos para "ligação"** (ver 4.2).

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
  - Os 5 mais ligados: Is 9:6 (212), 1Pe 2:9 (194), Mt 28:20 (169), Tt 2:14 (157) e Ap 11:15 (156).
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
3. **Arcos:** as 301.584 ligações, interativas.
4. **Mapa:** lugares com relevo noturno e as rotas dos estudos.
5. **Linha do tempo:** eventos (fase 2).
6. **Busca ⌘K.**
7. **Estudos.**

### 5.4 Stack recomendada (decidir na Fase 0)

**Recomendado: Astro (site estático) com ilhas interativas.**
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

### 5.5 Pipeline de dados (`site/scripts/build-data.*`)

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

### 5.6 Orçamento e qualidade

- **Desempenho:**
  - Página de leitura com até cerca de 100 KB de JS (gzip).
  - LCP < 2,5 s em 4G simulado e CLS < 0,1.
  - Visões WebGL carregadas sob demanda.
- **Acessibilidade:** checklist em `design/README.md` §8, incluindo alternativa em lista para grafo, arcos e mapa.
- **Telas a conferir:** 375 px e 1440 px, temas Noite e Dia, e `prefers-reduced-motion`.

---

## 6. Plano em fases (cada uma termina com evidência)

| Fase | Entrega | Critério de aceite |
|---|---|---|
| 0. Arranque | Skills instaladas (§7). `site/` criado (stack decidida e registrada aqui). Projeto Vercel `biblia-conectada` ligado ao repo, com Root Directory `site` | `npm run build` passa. Preview `*.vercel.app` responde 200. Comandos documentados no `CLAUDE.md` |
| 1. Dados | `build-data` + testes da §5.5. Tabela de livros PT com abreviações e parser de referência ("Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13") | Testes verdes. Contagens batendo. Nenhum número escrito à mão |
| 2. Leitura | Páginas de livro e capítulo (BLIVRE). Painel de ligações com votos. Backlinks. Prévia. Deep link de versículo. Créditos no rodapé e em `/sobre` | Screenshot 375/1440 nos dois temas. Navegação por teclado. Lighthouse acessibilidade ≥ 95 |
| 3. Busca ⌘K | Referências, livros, texto, lugares e pessoas, com os recentes | Casos de teste do parser. Busca de texto carregando sob demanda |
| 4. Arcos + Grafo | Céu de ligações na home, `/arcos` e `/grafo` | 60 fps no desktop e fluido no celular médio (com LOD). Alternativa em lista. Movimento reduzido respeitado |
| 5. Mapa + Pessoas/Lugares | Base unida (§4.3), nomes PT revisados nos ~150 principais, notas de lugar e pessoa, mapa com relevo e rotas dos estudos | Nomes PT tirados do texto. Lista de incertos registrada |
| 6. Estudos + Home | Páginas dos 2 vídeos (números do `natal-stats.json` e do `stats.json`) com "abrir no grafo" | Vídeo leve (poster + `preload="none"` ou link para o post) |
| 7. Polimento e produção | `/impeccable audit` → `polish`. OG. Performance. Deploy de produção | Checklists da §5.6. URL de produção enviada ao Alex |

**Pare e mostre ao Alex ao fim das Fases 0, 2 e 4.** Mostre screenshots e a URL de preview.

---

## 7. Skills e ferramentas para o Claude Code

Instalar e conferir o repositório de cada uma antes. Os comandos vieram de páginas de terceiros em 19/10.

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

1. **Licença do que é do projeto** (código, textos, dados derivados). Hoje não tem licença, o que significa todos os direitos reservados.
   - Sugestão: MIT para o código e CC BY-SA 4.0 para os dados derivados. O CC BY-SA é obrigatório onde entrar Theographic, NBV, BLT ou TFT.
2. **Plano da Vercel.** O Hobby é para uso pessoal não comercial. Se o site for divulgar negócio (perfil comercial, venda), conferir os termos e talvez ir pro Pro.
3. **Domínio próprio:** só se ele quiser e aprovar a compra.
4. **Stack** (§5.4): Astro, a recomendação, ou Next.js.
5. **Tom do texto** do site. Proposta: claro, de estudo, sem jargão, sem "maior do mundo" sem prova.

---

## 9. Deploy na Vercel (passo a passo)

1. Dar acesso do app da Vercel ao repo, se a instalação estiver em "repositórios selecionados". É o mesmo tipo de passo que o Alex fez para o Claude.
2. Criar o projeto `biblia-conectada`:
   - Framework: Astro (ou o escolhido).
   - Root Directory: `site`.
   - Build `npm run build`, saída `dist`.
   - A opção que inclui arquivos fora da Root Directory precisa estar ligada, porque o build lê `../fontes` e `../estudos`. Confira.
3. URL: `biblia-conectada.vercel.app` se o nome estiver livre. Se não estiver, a Vercel acrescenta um sufixo. Registrar aqui a URL final.
4. **Caminhos para criar e deployar o projeto:**
   - Integração Git, onde todo push no `main` gera produção.
   - CLI: `npx vercel` em `site/`, com login na máquina.
   - Conector da Vercel (MCP), se a sessão tiver.
5. Nunca guardar token no repo.

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
