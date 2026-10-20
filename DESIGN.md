---
name: Bíblia Conectada
description: "Atlas das ligações da Bíblia: o texto numa coluna calma, cada ligação uma linha de ouro sobre um céu azul-marinho."
colors:
  ground-noite: "#06121b"
  ground-dia: "#f6f1e6"
  surface-noite: "#0b1a25"
  surface-dia: "#fcf9f3"
  raised-noite: "#11232f"
  raised-dia: "#eee6d6"
  overlay-noite: "#14293a"
  overlay-dia: "#fffdf8"
  line-noite: "#22374a"
  line-dia: "#dcd3c2"
  line-strong-noite: "#62798c"
  line-strong-dia: "#847b6d"
  ink-noite: "#f2ebdd"
  ink-dia: "#141f1b"
  ink-reading-noite: "#eae3d4"
  ink-reading-dia: "#18231e"
  ink-2-noite: "#cbc3b6"
  ink-2-dia: "#3c4540"
  ink-3-noite: "#a2acb4"
  ink-3-dia: "#565e59"
  accent-noite: "#ecc98a"
  accent-dia: "#7a4f1f"
  accent-strong-noite: "#ffd891"
  accent-strong-dia: "#683c00"
  action-fill-noite: "#e8c27c"
  action-fill-dia: "#2b4a3d"
  on-action-noite: "#06121b"
  on-action-dia: "#ffffff"
  accent-fill-noite: "#e8c27c"
  accent-fill-dia: "#2b4a3d"
  on-accent-noite: "#06121b"
  on-accent-dia: "#ffffff"
  lit-noite: "#ffd891"
  lit-dia: "#683c00"
  highlight-noite: "#1a3343"
  highlight-dia: "#e7dfc9"
  cat-historia-noite: "#86c4c7"
  cat-historia-dia: "#2e6164"
  focus-noite: "#ffd891"
  focus-dia: "#683c00"
  sky: "#060d1a"
  sky-ink: "#f2ebdd"
  sky-ink-2: "#aeb9cc"
  sky-gold: "#ffcc6b"
  danger-noite: "#f2a39b"
  danger-dia: "#8e2a22"
  scrim-noite: "rgba(2, 6, 14, 0.62)"
  scrim-dia: "rgba(20, 31, 27, 0.40)"
typography:
  display:
    fontFamily: '"Newsreader Display", Georgia, "Times New Roman", serif'
    fontSize: "clamp(2.375rem, 1.6rem + 2.6vw, 3.5rem)"
    fontWeight: 440
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  title:
    fontFamily: '"Newsreader Display", Georgia, "Times New Roman", serif'
    fontSize: "clamp(1.5rem, 1.3rem + 0.6vw, 1.75rem)"
    fontWeight: 440
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  scripture:
    fontFamily: 'Literata, Georgia, "Times New Roman", serif'
    fontSize: "clamp(1.1875rem, 1.05rem + 0.35vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.75
  scripture-sm:
    fontFamily: 'Literata, Georgia, "Times New Roman", serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  quote:
    fontFamily: 'Literata, Georgia, "Times New Roman", serif'
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.65
  lede:
    fontFamily: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  radius-sm: "6px"
  radius-md: "10px"
  radius-lg: "18px"
  radius-pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
  space-8: "64px"
  space-9: "96px"
  column: "36rem"
  page-max: "84rem"
  rail-w: "88px"
  bar-h: "64px"
  target: "44px"
components:
  button-primary:
    rounded: "{rounded.radius-md}"
    padding: "0 24px"
    height: "{spacing.target}"
  button-primary-noite:
    backgroundColor: "{colors.action-fill-noite}"
    textColor: "{colors.on-action-noite}"
  button-primary-dia:
    backgroundColor: "{colors.action-fill-dia}"
    textColor: "{colors.on-action-dia}"
  button-primary-hover-noite:
    backgroundColor: "{colors.accent-strong-noite}"
  button-primary-hover-dia:
    backgroundColor: "{colors.accent-strong-dia}"
  button-secondary:
    rounded: "{rounded.radius-md}"
    padding: "0 24px"
    height: "{spacing.target}"
  button-secondary-noite:
    backgroundColor: "{colors.raised-noite}"
    textColor: "{colors.ink-noite}"
  button-secondary-dia:
    backgroundColor: "{colors.raised-dia}"
    textColor: "{colors.ink-dia}"
  button-ghost:
    rounded: "{rounded.radius-md}"
    padding: "0 12px"
    height: "{spacing.target}"
  button-ghost-noite:
    textColor: "{colors.accent-noite}"
  button-ghost-dia:
    textColor: "{colors.accent-dia}"
  button-ghost-hover-noite:
    backgroundColor: "{colors.raised-noite}"
  button-ghost-hover-dia:
    backgroundColor: "{colors.raised-dia}"
  icon-button:
    rounded: "{rounded.radius-md}"
    size: "{spacing.target}"
  icon-button-noite:
    textColor: "{colors.ink-2-noite}"
  icon-button-dia:
    textColor: "{colors.ink-2-dia}"
  chip:
    rounded: "{rounded.radius-pill}"
    padding: "0 16px"
    height: "{spacing.target}"
  chip-noite:
    textColor: "{colors.ink-2-noite}"
  chip-dia:
    textColor: "{colors.ink-2-dia}"
  chip-selected-noite:
    backgroundColor: "{colors.accent-fill-noite}"
    textColor: "{colors.on-accent-noite}"
  chip-selected-dia:
    backgroundColor: "{colors.accent-fill-dia}"
    textColor: "{colors.on-accent-dia}"
  searchbox:
    rounded: "{rounded.radius-md}"
    padding: "0 8px 0 12px"
    height: "{spacing.target}"
  searchbox-noite:
    backgroundColor: "{colors.raised-noite}"
    textColor: "{colors.ink-2-noite}"
  searchbox-dia:
    backgroundColor: "{colors.raised-dia}"
    textColor: "{colors.ink-2-dia}"
  searchbox-hero:
    rounded: "{rounded.radius-lg}"
    padding: "0 12px 0 16px"
    height: "56px"
  search-palette:
    rounded: "{rounded.radius-lg}"
    width: "min(44rem, 100%)"
  search-palette-noite:
    backgroundColor: "{colors.overlay-noite}"
    textColor: "{colors.ink-noite}"
  search-palette-dia:
    backgroundColor: "{colors.overlay-dia}"
    textColor: "{colors.ink-dia}"
  panel:
    rounded: "{rounded.radius-lg}"
    padding: "{spacing.space-5}"
  panel-noite:
    backgroundColor: "{colors.surface-noite}"
    textColor: "{colors.ink-noite}"
  panel-dia:
    backgroundColor: "{colors.surface-dia}"
    textColor: "{colors.ink-dia}"
  sheet:
    rounded: "{rounded.radius-lg}"
    padding: "0 16px 24px"
  sheet-noite:
    backgroundColor: "{colors.overlay-noite}"
    textColor: "{colors.ink-noite}"
  sheet-dia:
    backgroundColor: "{colors.overlay-dia}"
    textColor: "{colors.ink-dia}"
  verse-lit:
    rounded: "{rounded.radius-md}"
    padding: "0.25em 12px"
  verse-lit-noite:
    backgroundColor: "{colors.highlight-noite}"
  verse-lit-dia:
    backgroundColor: "{colors.highlight-dia}"
  verse-links:
    rounded: "{rounded.radius-pill}"
    padding: "0 8px"
    height: "1.75rem"
  verse-links-noite:
    textColor: "{colors.accent-noite}"
  verse-links-dia:
    textColor: "{colors.accent-dia}"
  verse-links-lit-noite:
    backgroundColor: "{colors.accent-fill-noite}"
    textColor: "{colors.on-accent-noite}"
  verse-links-lit-dia:
    backgroundColor: "{colors.accent-fill-dia}"
    textColor: "{colors.on-accent-dia}"
  rail-item:
    rounded: "{rounded.radius-md}"
    height: "60px"
  rail-item-noite:
    textColor: "{colors.ink-2-noite}"
  rail-item-dia:
    textColor: "{colors.ink-2-dia}"
  rail-item-current-noite:
    backgroundColor: "{colors.raised-noite}"
    textColor: "{colors.accent-noite}"
  rail-item-current-dia:
    backgroundColor: "{colors.raised-dia}"
    textColor: "{colors.accent-dia}"
  sky-window:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.sky-ink}"
    rounded: "{rounded.radius-md}"
---

# Design System: Bíblia Conectada

## Overview

**Creative North Star: "O Atlas das Ligações"**

Toda passagem abre um mapa. O sistema trata a Bíblia como um atlas: o texto se lê numa coluna calma, em Literata grande, e cada ligação é uma linha de ouro sobre um céu azul-marinho. O ouro, o céu noturno e os arcos vêm dos dois vídeos, para que quem chega pelo Reels reconheça a luz. O motivo é um só, o arco sobre a linha de base: está na marca, no ícone de ligação, nos mapas e no céu.

A densidade segue o modo de cada superfície. Ler é contenção: uma coluna de 36rem, fios em vez de caixas, cada número escrito em texto e com a sua regra. O mapa é o único lugar de espetáculo, e mesmo ele sai de um desenho determinístico a partir dos votos: o selo do capítulo no centro, oito medalhões gravados em órbita, traços de ouro que engrossam com os votos. Só uma superfície flutua de cada vez (folha, busca, menu), e só um movimento é orquestrado: o traço aceso que corre do selo até o capítulo escolhido.

Noite e Dia são temas de primeira, com a mesma hierarquia e o contraste conferido por teste; a primeira visita segue o aparelho. As rejeições são as do Alex (19/10/2026): app devocional genérico (creme com ornamentos, versículo do dia), dashboard tech frio (neon, brilho, grade de cards), perder a cara dos vídeos, e ler ou buscar com esforço (contraste fraco, letra pequena, busca escondida).

**Key Characteristics:**
- Dois temas: Noite (azul-marinho, tinta de pergaminho, ouro) e Dia (pergaminho liso, tinta verde-negra, bronze), com 7:1 para texto e Escritura nos dois.
- Três vozes: Newsreader Display nos títulos, Literata na Escritura (19 a 21px), Space Grotesk na interface.
- Ouro e bronze só para números, ligações e o que está aceso.
- Fios de 1px em vez de caixas; cartão só para o que é objeto separado.
- Um motivo, o arco sobre a linha de base, e um momento orquestrado, o traço aceso do mapa.
- O céu dos mapas é noturno nos dois temas, com o ouro dos vídeos.

## Colors

Dois temas com a mesma hierarquia: no Noite, chão azul-marinho profundo, tinta de pergaminho e ouro de lamparina; no Dia, pergaminho liso, tinta verde-negra e bronze; o céu dos mapas é o mesmo azul-noturno nos dois.

Os valores do frontmatter são os de `site/src/styles/tokens.json`, literais. Cada cor tem duas chaves, `<token>-noite` e `<token>-dia`; as quatro cores do céu têm uma chave só (`sky`, `sky-ink`, `sky-ink-2`, `sky-gold`) porque o arquivo dá a elas o mesmo valor nos dois temas. No código, o nome é o do token sem sufixo (`var(--accent)`) e o tema escolhe o valor; `tokens.css` é gerado de `tokens.json` e nunca se edita à mão.

### Primary
- **Ouro de Lamparina / Bronze** (`accent`: #ecc98a no Noite, #7a4f1f no Dia): número de versículo, contagem de ligações, ícone ativo, link, traços e riscos do mapa e do selo, barra de votos, marca da barra superior. Como texto, no mínimo 4,5:1 (medido 7,4 no Noite e 5,6 no Dia).
- **Ouro Aceso / Bronze Escuro** (`accent-strong`, `lit` e `focus`: #ffd891 no Noite, #683c00 no Dia): a ligação acesa no mapa, o item escolhido, o anel de foco. O mesmo matiz do acento, mais forte: ouro claro no Noite, bronze escuro no Dia (no mínimo 7,07:1 nas superfícies do Dia). O vinho que o Dia usava aqui saiu na revisão de 20/10.

### Secondary
- **Ouro de Ação / Verde-Pinho** (`action-fill` com `on-action`: #e8c27c com #06121b no Noite, #2b4a3d com #ffffff no Dia): o botão principal, um por área. Rótulo a 11,21:1 no Noite e 9,77:1 no Dia. O verde do Dia é decisão em aberto (design/README.md §14, item 3; a alternativa é bronze).
- **Marca Cheia** (`accent-fill` com `on-accent`, os mesmos valores): chip escolhido, pílula de ligações do versículo aceso; `on-accent` também escreve o número do capítulo escolhido sobre `lit` no mapa.

### Tertiary
- **Céu dos Vídeos** (`sky`, #060d1a nos dois temas): fundo das janelas de céu (mini mapa da leitura, arcos, céu completo).
- **Ouro dos Vídeos** (`sky-gold`, #ffcc6b): arcos, estrelas e traços sobre o céu; é o `GOLD` dos vídeos.
- **Tinta do Céu** (`sky-ink` #f2ebdd e `sky-ink-2` #aeb9cc): texto e legenda sobre o céu (16,39:1 e 9,82:1).
- **Coral de Erro / Vermelho-Óxido** (`danger`: #f2a39b no Noite, #8e2a22 no Dia): borda de campo inválido, mensagem de erro, botão destrutivo, sempre com a palavra junto.
- **Verde-Água da História** (`cat-historia`: #86c4c7 no Noite, #2e6164 no Dia): as marcas e a amostra da faixa de história no eixo das eras da linha do tempo, sempre com o nome da faixa; é a única cor de categoria que já pinta alguma coisa.

### Neutral
- **Azul-Marinho da Noite / Pergaminho Liso** (`ground`: #06121b, #f6f1e6): fundo da página, da barra superior, do trilho e das abas. O pergaminho é liso, nunca textura nem moldura.
- **Painel** (`surface`: #0b1a25, #fcf9f3): o que fica no plano da página: painel de ligações, rodapé, disco do selo.
- **Elevado** (`raised`: #11232f, #eee6d6): campos, botão secundário, hover, item atual do trilho e da barra de capítulos.
- **Flutuante** (`overlay`: #14293a, #fffdf8): folha, paleta de busca, menus, faixa que espia, barra de seleção, prévia de versículo.
- **Fio** (`line`: #22374a, #dcd3c2): divisória de lista e borda de painel; não carrega informação sozinho.
- **Fio de Controle** (`line-strong`: #62798c, #847b6d): borda de campo, de botão secundário e de chip; no mínimo 3:1 nas quatro superfícies.
- **Tinta** (`ink`: #f2ebdd, #141f1b): interface e títulos. **Tinta de Leitura** (`ink-reading`: #eae3d4, #18231e): só a Escritura, um tom abaixo do `ink` no Noite. **Tinta Secundária** (`ink-2`: #cbc3b6, #3c4540): metadados, legendas, palavras acrescentadas pelos tradutores. As três passam de 7:1 em todas as superfícies.
- **Tinta de Nota** (`ink-3`: #a2acb4, #565e59): notas de fonte e placeholder; no mínimo 5:1.
- **Faixa** (`highlight`: #1a3343, #e7dfc9): versículo aceso, trecho selecionado, `::selection`, palavra achada na busca; `ink` e `ink-reading` continuam acima de 7:1 sobre ela.
- **Véu** (`scrim`: rgba(2, 6, 14, 0.62), rgba(20, 31, 27, 0.40)): atrás da folha e da busca no celular.

### Named Rules
**A Regra do Valor Literal.** Cada tema dá o valor literal de cada cor, e nenhum token aponta para outro. Foi um apelido entre tokens que deixou texto escuro na folha escura no iPhone do Alex (19/10); `site/tests/tokens.test.ts` barra isso, e `site/tests/css-vars.test.ts` barra qualquer `var(--x)` sem declaração.

**A Regra do Ouro que Conta.** Ouro e bronze marcam o que se conta e o que se segue: números, ligações, o ícone ativo, o que está aceso. Não pintam áreas grandes nem enfeitam; a cor cheia fica no botão principal (`action-fill`, um por área) e nas marcas pequenas de escolha (`accent-fill`).

**A Regra do Céu Noturno.** O céu é noturno nos dois temas. No Dia, é uma janela emoldurada de azul-marinho no pergaminho; no Noite, dentro de um painel ou de uma folha, a janela se abre no próprio painel, sem moldura nem recuo (`--window-inset: 0px`): nunca caixa dentro de caixa.

## Typography

**Display Font:** Newsreader Display (com Georgia, "Times New Roman", serif), uma instância estática, tamanho óptico 72, peso 440.
**Body Font:** Literata (com Georgia, "Times New Roman", serif), variável de 200 a 900, só para a Escritura.
**Label/Mono Font:** Space Grotesk (com system-ui, -apple-system, "Segoe UI", sans-serif), variável de 300 a 700, para toda a interface. Monospace do sistema só em código de verdade (nomes de arquivo e comandos em `/dados` e `/sobre`), sem fonte carregada.

**Character:** Três vozes que não trocam de papel. Newsreader Display dá aos títulos o tom de um atlas impresso; Literata é a Escritura, grande e calma; Space Grotesk é a interface, geométrica e exata nos números. As três são OFL e servidas pelo próprio site.

### Hierarchy
- **Display** (`display`: 440, de 38 a 56px em clamp, 1.05, -0.015em): título de página (livro, capítulo, Explorar, Linha do tempo) e o título da capa. `text-wrap: balance`, `font-synthesis: none`.
- **Title** (`title`: 440, de 24 a 28px em clamp, 1.2, -0.01em): título de painel e de folha, e o título de seção maior (`.bc-section-title--major`, usado na lista do mapa e nos versículos mais ligados da capa).
- **Body, Escritura** (`scripture`: Literata 400, de 19 a 21px em clamp, 1.75): o texto bíblico; 19px no celular, 20px a partir de 1024px, 21px a partir de 1440px, na coluna de 36rem (60 a 66 caracteres), com algarismos proporcionais. `quote` (400, 19px, 1.65) é o versículo em foco no topo do painel; `scripture-sm` (400, 17px, 1.6) são trechos em listas, resultados e prévias.
- **Body, interface** (`lede`: 400, 19px, 1.5; `body`: 400, 17px, 1.55): parágrafo de abertura (até 38rem) e texto corrido da interface, que não é bíblico.
- **Label** (`ui`: 500, 16px, 1.4; `meta`: 400, 14px, 1.45; `label`: 600, 13px, 1.3): `ui` em botões, abas, itens de lista e referências, em peso 600 nos botões, nas referências e no título de seção de 16px; `meta` em metadados e legendas, nunca menor que 14px no celular; `label` em número de versículo, contagem na pílula, tecla e grupo de resultados, e nomeia os itens do trilho e das abas em peso 500.

### Named Rules
**A Regra da Escritura Primeiro.** A Escritura é a coisa mais legível da tela: Literata de 19px ou mais, entrelinha 1.75, coluna de 36rem, `ink-reading` a 7:1 ou mais. Nada se desenha atrás dela, e nenhum trecho fica abaixo de 17px.

**A Regra Sem Caixa-Alta.** Hierarquia por tamanho, face e peso, nunca por caixa-alta, espaçamento de letras ou cor fraca. Nenhum sobretítulo acima de título; o selo escreve o livro como no texto ("Isaías", nunca "ISAÍAS").

**A Regra dos Algarismos.** Algarismos tabulares na interface, para as contagens se alinharem, e proporcionais na Escritura; número com separador de milhar e a unidade junto ("212 ligações", "31.102 versículos").

## Layout

Mobile-first de verdade, numa escala de 4px (`space-1` a `space-9`): `space-1` (4px) cola ícone e texto, `space-2` (8px) separa itens de um grupo, `space-3` (12px) é o recuo de uma linha de lista, `space-4` (16px) a margem lateral do celular e o recuo de painel, `space-5` (24px) separa blocos de um painel, `space-6` e `space-7` (32 e 48px) separam seções, `space-8` (64px) separa os blocos grandes de uma página e fecha a página no celular, `space-9` (96px) fecha a página no desktop. Sempre mais espaço acima de um título do que abaixo.

- **Celular:** barra superior de `bar-h` (64px) mais a área segura, com a marca, a lupa e a aparência; barra de abas embaixo (Explorar, Ler, Buscar, Arcos, Ponte), também de 64px. O que a página fixa embaixo (faixa que espia, barra de seleção, faixa da Ponte) fica acima das abas com `--tabbar-h`. A partir de 40rem a barra superior mostra o campo de busca no lugar da lupa.
- **Desktop (a partir de 64rem):** trilho de seções à esquerda (`rail-w`, 88px: Explorar, Ler, Linha do tempo, Arcos, Ponte, Salvos, Dados), as abas somem. A leitura vira uma grade de três partes: trilho de capítulos (rolagem própria), coluna de texto (36rem mais a margem dos números) e painel de ligações fixo ao rolar, de 20rem (24rem a partir de 80rem, 26rem a partir de 90rem).
- **Capa:** título, frase de fatos e o campo grande de busca no alto à esquerda, o mapa de Isaías 9 logo abaixo; a partir de 80rem o painel "Conexão selecionada" fica ao lado (de 21 a 25rem), e no celular ele espia por baixo. O mapa encolhe para caber na primeira tela. Abaixo, em modo de leitura, a lista do mapa e os versículos mais ligados, em duas colunas a partir de 75rem.
- **Mapa:** o desenho sai de um resolvedor determinístico em unidades do próprio quadro, que a página escala pela largura; abaixo de um quadro de 760px vale a versão de celular, e até 30rem uma unidade nunca passa de 1px (moedas de 44 a 50px, nomes de 14px).
- **Medidas:** `column` (36rem) para a leitura, texto de interface até 38rem, `page-max` (84rem) para a página, `target` (44px) para todo alvo de toque.

**A Regra do Contêiner que Rola.** A página nunca rola de lado: o que é largo (barra de capítulos, escopos da busca, tabelas) rola dentro do próprio contêiner.

## Elevation & Depth

Quase plano. A profundidade vem das quatro superfícies em degrau (`ground`, `surface`, `raised`, `overlay`) e dos fios de 1px; a sombra só aparece no que flutua sobre a página e, de leve, no botão e no campo em repouso. No Noite, quem separa o flutuante da página é a borda `line`; a sombra só dá profundidade. Os anéis em volta de medalhões, discos e selos são aros desenhados, não sombras (ver Shapes).

### Shadow Vocabulary
- **Flutuante** (`shadow-float`: `0 16px 48px rgba(0, 0, 0, 0.55)` no Noite, `0 14px 40px rgba(44, 33, 14, 0.16)` no Dia): folha, paleta de busca, menu de aparência, faixa que espia, barra de seleção, prévia de versículo.
- **Em repouso** (`shadow-raise`: `0 1px 0 rgba(255, 255, 255, 0.04)` no Noite, `0 1px 2px rgba(44, 33, 14, 0.10)` no Dia): botão principal, campos em repouso (o campo grande da capa, o da Mesa), segmento marcado; some no botão desabilitado.

### Named Rules
**A Regra da Superfície Única.** Só uma coisa flutua de cada vez, e ela é opaca: fundo `overlay`, borda `line`, `shadow-float` e a própria cor de texto. A faixa que espia some quando a barra de seleção aparece; texto nunca herda cor através de uma superfície flutuante.

**A Regra do Brilho no Céu.** Nenhum brilho, halo, gradiente, vidro ou desfoque na interface. Luz que soma (`mix-blend-mode: screen`) só nos arcos, dentro da janela do céu.

## Shapes

Cantos de quatro tamanhos, cada um com seu papel: `radius-sm` (6px) para tecla, placa de nome no mapa e o canto do anel de foco; `radius-md` (10px) para botão, campo, número de capítulo, faixa do versículo aceso e janela do céu; `radius-lg` (18px) para painel, folha (só os cantos de cima), paleta, menus, faixa que espia, barra de seleção e campo grande da capa; `radius-pill` (999px) para chips, pílula de ligações, pílula de votos, controle segmentado e barras de contagem.

O resto é círculo e linha. Medalhões, selo e discos do mapa são moedas com aro desenhado: um anel de 1px em `line-strong`, um vão de 3px da cor do chão e um anel de 1px em `line`; o aceso troca por um aro de 2px e outro de 1px em `accent-strong`. O selo do capítulo tem um mostrador com um risco por capítulo ligado, de Gênesis (no alto) a Apocalipse, mais longo com mais votos. Listas, paginação e seções se separam por fios de 1px. O arco sobre a linha de base é a única figura que se repete: marca, ícone de ligação, mini mapa da leitura, céu de arcos e a 404.

**A Regra do Fio, Não da Caixa.** Listas são linhas separadas por fio `line`. Cartão só para o que é objeto separado: o painel de ligações, a busca, a folha. Nada de caixa dentro de caixa.

**A Regra do Contorno Inteiro.** O escolhido se contorna inteiro (`inset 0 0 0 1px`, em `accent` ou `lit`), como o trilho marca o capítulo atual; nunca uma faixa de cor num lado só.

## Components

Todo componente está em `site/src/styles/ds.css` (classes `bc-<componente>__<parte>`) e usa só tokens. Os ícones são o conjunto de `site/src/components/icons.tsx`: grade de 24px, traço de 1.75 com pontas redondas (2.1 no item atual), sempre com rótulo visível ou `aria-label`. Movimento: `dur-fast` (120ms) para hover e pressão, `dur-base` (220ms) para a folha entrando, `dur-slow` (420ms) para o traço aceso, com `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`); com `prefers-reduced-motion`, nada se desloca.

### Buttons
Firmes e quietos: o principal é o único bloco de cor cheia da área.
- **Shape:** cantos levemente curvos (`radius-md`, 10px), no mínimo 44px de altura (`target`), recuo de 0 24px, Space Grotesk 600 a 16px, ícone de 22px a 8px do rótulo.
- **Primary:** `action-fill` com `on-action` e `shadow-raise`: ouro com tinta azul-marinho no Noite, verde-pinho com branco no Dia. Um por área, com o verbo do que acontece ("Ler lado a lado").
- **Hover / Focus:** o principal vai a `accent-strong` (ouro claro no Noite; no Dia, do verde-pinho ao bronze escuro, com o branco a 9,4:1); o secundário troca a borda por `accent`; o fantasma ganha fundo `raised`. A cor muda em 120ms. Foco em todo controle: anel `focus` de 2px a 2px de distância.
- **Secondary / Ghost / Tertiary (if applicable):** secundário em `raised`, borda de 1px `line-strong`, tinta `ink` ("Ver no Explorar"). Fantasma sem fundo, tinta `accent`, recuo de 0 12px; na barra de seleção (Copiar, Compartilhar, Salvar, Explorar) o rótulo fica em `ink` e o ícone em `accent`, e "Fechar" da folha é um fantasma com o ícone. Botão de ícone de 44×44px em `ink-2`, que vai a `ink` sobre `raised`. Desabilitado: `raised`, borda `line`, tinta `ink-3`, sem sombra.

### Chips
- **Style:** pílula de 44px, borda de 1px `line-strong`, sem fundo, tinta `ink-2`, Space Grotesk 500 a 14px; no hover, tinta `ink` e borda `accent`.
- **State:** escolhido (`aria-pressed` ou `aria-current`) em `accent-fill` com `on-accent`. São chips os escopos da busca (Tudo, Texto, Livros, Temas), os exemplos e as buscas recentes; o contador do escopo Texto entra sem mudar a largura do chip. O controle segmentado (Sistema, Dia, Noite) é uma pílula em `raised` com borda `line-strong`; o segmento marcado vai a `overlay`, tinta `ink`, `shadow-raise` e um anel de 1px `line`.

### Cards / Containers
- **Corner Style:** `radius-lg` (18px) no painel, na folha (cantos de cima), na paleta, no menu e na faixa que espia; `radius-md` (10px) na janela do céu.
- **Background:** painel em `surface`; folha, paleta, menu, faixa que espia, barra de seleção e prévia em `overlay`, cada um com a sua tinta `ink`; janela do céu em `sky` com `sky-ink`.
- **Shadow Strategy:** painel sem sombra, no plano da página; o resto, `shadow-float` (ver Elevation & Depth).
- **Border:** 1px `line` em todos; a folha não tem borda embaixo.
- **Internal Padding:** painel com 24px e 24px entre blocos; folha com 16px dos lados e 24px embaixo mais a área segura, até 86dvh de altura, com uma barra fixa de 52px (alça de 40×4px em `line-strong` e "Fechar"); a folha entra subindo 24px em 220ms sobre o véu.
- **Faixa que espia (celular):** uma tira opaca de 60px acima das abas, que leva ao painel mais abaixo na página: selo pequeno (círculo de 40px com aro `accent`) e medalhão, título em Newsreader, a contagem em `accent`, chevron. Some quando o painel aparece ou já passou, enquanto há trecho selecionado, e a partir de 64rem.
- **Janela do céu:** `sky` com borda de 1px `line` e `radius-md`, legenda em `sky-ink-2`; no Noite, dentro de painel ou folha, sem moldura, fundo nem recuo.

### Inputs / Fields
- **Style:** a entrada de busca da barra é um campo de 44px em `raised`, borda de 1px `line-strong`, `radius-md`, lupa e texto em `ink-2`, tecla de atalho ("Ctrl K" ou "⌘ K") à direita. A da capa tem 56px, `radius-lg`, texto de 18px e `shadow-raise`. O campo da paleta tem 60px e texto de 19px; placeholder em `ink-3` ("Is 9:6, luz, “grande luz”, Ezequiel").
- **Focus:** a entrada de busca acende a borda em `accent` e o texto em `ink` no hover, e recebe o anel padrão no foco; o campo da paleta mostra o foco como um fio de 2px em `focus` na base (`inset 0 -2px 0`), não como anel dentro da caixa.
- **Error / Disabled:** campo inválido com borda `danger` e a mensagem em `danger`, com palavras que dizem o problema e o próximo passo; sem resultado, a busca diz o que foi buscado ("Não achei “João 22”: João tem 21 capítulos.").

**A Regra da Busca Única.** Uma busca à vista: na capa e em `/buscar`, a entrada da barra sai de cena (opacidade e visibilidade em 120ms, `data-page-search` no `<html>`) enquanto o campo da própria página aparece, e volta quando ele passa para baixo da barra. Ctrl K, / e a aba Buscar abrem a mesma busca sempre.

### Navigation
- **Barra superior:** fixa no topo, 64px, em `ground` com fio `line` embaixo; a marca é o arco duplo sobre a linha de base em `accent` (26px) e "Bíblia Conectada" em Space Grotesk 600 a 17px; o menu de aparência abre um flutuante com o controle Sistema, Dia e Noite.
- **Trilho (a partir de 64rem):** itens de 60px, ícone de 22px sobre o nome, tinta `ink-2`; hover em `raised` com `ink`; atual em `raised` com `accent` e traço de 2.1.
- **Abas (celular):** cinco itens de 64px; o atual em `accent` com traço de 2.1.
- **Trilha de navegação:** 14px em `ink-2`, separada pelo chevron desenhado (16px, `ink-3`), nunca um "›" digitado; o passo atual em `ink` 500; cada link com 44px de alvo.
- **Barra de capítulos:** números em quadrados de 44px (`radius-md`), cada um com uma barrinha `accent` do tamanho das suas ligações (`accent-strong` no atual); o atual em `raised`, contorno inteiro `accent` e peso 600. No celular rola de lado sob a barra; a partir de 64rem vira o trilho de capítulos, e a partir de 80rem os números passam a Newsreader de 22px.
- **Anterior e seguinte:** uma linha entre dois fios (`border-block` de 1px `line`), em duas colunas: "Anterior" ou "Seguinte" com o chevron desenhado (13px, `ink-2`), o capítulo em 600 a 16px e a contagem de ligações; nunca duas caixas. Abaixo de 30rem, um capítulo por linha.

### Verse Line
A unidade da leitura. O número do versículo pendurado numa margem de 1.75rem (Space Grotesk 600 a 13px, `accent`), o texto em Literata `scripture` com `ink-reading`, palavras acrescentadas pelos tradutores entre colchetes em `ink-2`, e no fim a pílula de ligações: `radius-pill`, borda de 1px `line-strong`, o ícone de arco (14px) e a contagem em `accent` 600 a 13px, com um alvo invisível de 44px em volta. Sem ligação, a pílula fica em `line` e `ink-2`. O versículo aceso ganha a faixa `highlight` com `radius-md`, sem mudar o espaço que ocupa, e a pílula vira `accent-fill` com `on-accent`. O trecho selecionado é pintado com `highlight` e sublinhado de 2px em `accent`, sem tocar no HTML do texto.

### Connection Row
Uma ligação numa lista com fios: a referência em Space Grotesk 600 a 16px (`ink`, e `accent` sublinhada no hover) com o ícone de direção (sai, chega, nos dois sentidos) em `ink-2`; à direita, os votos em 500 a 14px `ink-2` com uma barra de 44×6px, pílula em `line` preenchida de `accent` na proporção da mais votada; o trecho em Literata 17px por baixo, quando vem.

### Chapter Seal and Medallions
O selo é um disco em `surface` com traço de 1.5 em `accent` e anel interno `line-strong`, o número do capítulo em Newsreader 440 e o livro acima, como no texto, em Space Grotesk 600 e `accent` (comprimido, nunca espaçado, quando o nome é longo); em volta, o mostrador com um risco por capítulo ligado. Na leitura, mede 76px no celular, 104px a partir de 64rem, 120px a partir de 80rem e 128px a partir de 90rem; no mapa, segue a escala do desenho. Os medalhões são gravuras de objetos, ouro sobre azul-marinho nos dois temas, como moedas; no Dia o aro `line` os assenta no pergaminho. Sempre marcados como ilustração.

### Atlas Map
O selo no centro, uma órbita pontilhada em `line-strong`, oito medalhões dos grupos de livros com tronco em `accent` da espessura dos votos, e até três capítulos por grupo em discos `surface` com aro `accent` e o número em `accent`. Os nomes ficam sobre placas da cor do chão (Newsreader para o nome, Space Grotesk `ink-2` para os votos), e um pontilhado liga capítulos desenhados que se ligam entre si. A ligação escolhida é o traço `lit` de 3.2, desenhado do selo ao capítulo em 420ms (o único momento orquestrado); o capítulo escolhido vira um disco `lit` com o número em `on-accent`. Uma parada de Tab para o mapa inteiro, setas entre medalhões e capítulos, e a lista depois do mapa traz os mesmos números.

### Search Palette
Um diálogo modal sobre o véu, a 12vh do topo, de até 44rem e `radius-lg`; abaixo de 48rem ocupa a tela inteira, sem borda nem sombra. Por ordem: o campo, os escopos, os grupos (rótulo em 600 a 13px `ink-2`, frase comum) e o pé com as teclas. Cada opção tem ícone de 22px em `accent`, título em 600 a 16px, dica em 14px `ink-2` e, nos resultados de texto, o trecho em Literata 17px com a palavra marcada em `highlight` e um fio de 2px em `accent` na base. A opção escolhida fica em `raised` com contorno inteiro de 1px em `accent`. "Procurando…" só aparece depois de 250ms de espera.

## Do's and Don'ts

### Do:
- **Do** tirar toda cor do token do tema (`var(--accent)`), com o valor literal de cada tema em `tokens.json` e `tokens.css` gerado dele.
- **Do** manter a Escritura em Literata de 19 a 21px, entrelinha 1.75, na coluna de 36rem, e os trechos em 17px ou mais.
- **Do** escrever cada contagem em texto e com a unidade ("212 ligações", "296 votos"), e dizer qual regra ela usa.
- **Do** marcar o escolhido com contorno inteiro (`inset 0 0 0 1px`, em `accent` ou `lit`) e o versículo aceso com a faixa `highlight`.
- **Do** separar linhas de lista com fios de 1px `line`; anterior e seguinte são uma linha entre dois fios.
- **Do** desenhar todo ícone com o conjunto de `icons.tsx` (24px, traço 1.75, 2.1 no atual): o separador da trilha de navegação é o chevron, a seta da Ponte é o ícone `out`.
- **Do** manter uma superfície flutuante por vez, opaca em `overlay`, com borda `line`, `shadow-float` e a própria tinta.
- **Do** mostrar o céu sempre noturno: janela emoldurada (`line`, `radius-md`) no Dia; no Noite, dentro de painel ou folha, a janela sem moldura nem recuo.
- **Do** manter uma busca à vista: na capa e em `/buscar`, a entrada da barra sai enquanto o campo da página aparece.
- **Do** dar tema às partes do navegador: `::selection` em `highlight` com `ink`, cursor e `accent-color` em `accent`, barra de rolagem em `line-strong` sobre `ground`, anel de foco de 2px em `focus` a 2px.
- **Do** dar 44px de alvo a todo controle, com área invisível em volta das pílulas pequenas.
- **Do** dar ao título de seção cujos itens têm título próprio o degrau `title` em Newsreader (`.bc-section-title--major`), e às demais seções o título de 16px 600 com fio embaixo (`.bc-section-title`).

### Don't:
- **Don't** usar caixa-alta ou espaçamento de letras para hierarquia, nem sobretítulo acima de título.
- **Don't** montar grade de cards iguais, card dentro de card ou número gigante com rótulo pequeno.
- **Don't** pôr brilho, halo, borda luminosa, gradiente, vidro ou desfoque na interface; a luz fica dentro do céu.
- **Don't** marcar o escolhido com uma faixa de cor num lado só da linha ou do cartão.
- **Don't** digitar "›", "→" ou emoji no lugar de um ícone.
- **Don't** usar pergaminho como textura ou moldura, ornamentos ou citação bíblica solta num card, como "versículo do dia"; toda citação aparece ligada ao dado que a conecta.
- **Don't** deixar a Escritura pequena, cortada com reticências sem jeito de abrir, ou com cor herdada de outra superfície.
- **Don't** usar cinza puro nem opacidade em texto; texto secundário é `ink-2` ou `ink-3`.
- **Don't** confiar só na cor para erro ou categoria: sempre com palavra, ícone ou padrão de linha.
- **Don't** animar cada seção ao entrar, cada card no hover ou com parallax; o traço aceso é o único movimento orquestrado.
