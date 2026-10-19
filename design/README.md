# Direção de design: Bíblia Conectada

Status: revisada em 19/10/2026 com o design system do ui-ux-pro-max, `/impeccable shape` e a skill taste, depois da rodada de perguntas com o Alex. Revista de novo no mesmo dia (v3) com as três imagens de referência do Alex (`HANDOFF.md` §3.8): Noite azul-marinho e ouro, Dia em pergaminho, títulos em serifa. O que mudou e por quê está em §13; o que falta decidir, em §14.

Todo número deste documento foi calculado por código nesta revisão (contrastes WCAG, métricas das fontes, tamanhos de arquivo, contagens do `xref.npz` e dos dados gerados em `site/`). Número que for para o site sai do pipeline, não daqui (regra 3 do `CLAUDE.md`).

## 1. Brief

- **Assunto:** as ligações da Bíblia. São 31.102 versículos e 344.799 referências cruzadas (301.584 pares únicos), mais lugares, pessoas, eventos e as profecias dos estudos.
- **Público:** gente que chega pelos Reels (celular, 4G, PT-BR), curiosos e estudantes. É mobile-first de verdade.
- **Trabalho principal:** abrir qualquer versículo e seguir as ligações dele. Do texto vai pro grafo, do grafo pro mapa, e volta.
- **A coisa memorável (uma só): o céu de ligações.** Os arcos do vídeo 1, vivos e tocáveis. Ao escolher um capítulo ou versículo, as ligações dele acendem em ouro e o resto recua. Tudo em volta fica quieto e preciso.
- **Frase da ideia:** as referências cruzadas viram o céu noturno dos vídeos; cada versículo é uma estrela e cada ligação, um arco que acende em ouro. **Motivo único: o arco.** Ele aparece no marcador de ligação do versículo, nas arestas do grafo local, no carregamento do céu e no ícone do site; nenhuma outra forma decorativa entra.

**Anti-objetivos (respostas do Alex em 19/10).** O site parece errado, mesmo bem acabado, se:

| | Anti-objetivo | Exemplos |
|---|---|---|
| A1 | App devocional genérico | Ornamentos, "versículo do dia", tom de pregação. (O fundo pergaminho saiu desta lista na v3: as referências do Alex usam pergaminho no tema Dia; o que continua proibido é o pergaminho como textura ou moldura, ver §3) |
| A2 | Dashboard tech frio | Neon, brilho, grade de cards, cara de ferramenta de dev, texto bíblico perdendo espaço para a interface |
| A3 | Perder a cara dos vídeos | Quem vem do Reels não reconhece o ouro, o céu noturno e os arcos |
| A4 | Lento ou pesado no celular | Grafo ou arcos travando, ou gastando 4G antes de o texto aparecer |

As regras abaixo citam o anti-objetivo que protegem.

### 1.1 Modo e tipo de tela por superfície

O modo diz o que é sucesso para quem está na tela (impeccable). O tipo diz quais regras de composição valem (taste): em **página**, nada de linha fina decorativa nem rótulo miúdo; em **tela de app**, linha de 1 px e rótulos de 12–14 px são estrutura normal.

| Superfície | Rotas | Modo | Tipo | Consequência |
|---|---|---|---|---|
| Céu de ligações | `/` | Experience, com uma obrigação de Persuade: em uma tela, quem chega entende o que é e acha a ação funcionando | Página | Único lugar com ambição de Experience: cor tomando a tela e o momento orquestrado |
| Leitura | `/isaias`, `/isaias/9`, `/isaias/9/6` | Read | Página no texto; tela de app no trilho de livros e no painel de ligações | Precisão e contenção; o mundo fica na moldura, a coluna de texto fica calma |
| Notas e estudos | `/lugar/*`, `/pessoa/*`, `/evento/*`, `/estudo/*`, `/sobre` | Read | Página | Como a leitura |
| Visões | `/grafo`, `/arcos`, `/mapa` | Experience na 1ª tela; Operate nos filtros, na seleção e na lista | Tela de app | Controles padrão; números de no máximo 40 px |
| Busca | ⌘K | Operate | Tela de app | Componente padrão de combobox |

### 1.2 Home: primeira tela (375 px)

1. O céu ocupa a tela e já aparece no primeiro paint como imagem estática (AVIF/WebP de um quadro dos arcos, gerada no build a partir dos mesmos dados), sem esperar o WebGL. Essa imagem, o título e a busca formam o LCP. (A3, A4)
2. Título em HTML e uma frase factual com números do pipeline (versículos, referências), escritos em frase e nunca como fileira de números grandes com rótulo pequeno. (A2)
3. A busca é um campo real, que funciona desde o primeiro instante e aparece sem rolar.
4. Estado inicial proposto: Isaías 9:6 aceso em ouro, apresentado como dado ("212 ligações", link para `/isaias/9/6`), sem moldura de citação, porque é o clímax do vídeo 1. **Pendente (§14).** (A1, A3)
5. A navegação de baixo fica visível. Abaixo da dobra: a entrada para Ler (livros) e os dois estudos. Nada de versículo do dia, carrossel ou depoimentos. (A1)

## 2. Continuidade com os vídeos (tirado do código e dos vídeos)

| Elemento | Valor | De onde |
|---|---|---|
| Ouro (luz) | `#FFCC6B` | `GOLD = (1.0, 0.80, 0.42)` em `estudos/*/fx.py` e `film.py` |
| Creme das citações | `#FFE2AA` | `color=(255, 226, 170)` na citação de Is 9:6 (`biblia-referencias/film.py`) |
| Vitral dos arcos (curto → longo) | `#2980FF` `#2442FF` `#8C33FF` `#FF2966` `#FF801F` `#FFD15C` | `PAL_C` em `biblia-referencias/film.py` |
| Fundo dos arcos (vídeo 1) | `#010101` | mediana de quadros em 3 s e 50 s |
| Céu noturno (vídeo 2) | `#07172D` a `#1C283B` | mediana de quadros em 8 s e 62 s |
| Fontes | Space Grotesk (manchetes, 26 chamadas `font("grot")`), Space Mono (rótulos de referência, 60 chamadas `font("mono"/"monob")`), Cormorant **só itálica** (citações: 16 chamadas `font("serifi")`, nenhuma `font("serif")`) | `estudos/*/fx.py` e `film.py` (grep de 19/10) |

## 3. Tokens (contraste WCAG calculado por código em 19/10)

**Cena, não categoria:** quem chega de um Reel de fundo noturno, no navegador do Instagram, no celular, precisa reconhecer o vídeo na hora: **Noite** (azul-marinho e ouro). Quem lê capítulos longos num lugar claro escolhe **Dia**, em pergaminho liso, com bronze, vinho e verde (as referências do Alex, v3), e a escolha fica lembrada.

Valores em `site/src/app/globals.css`. A tabela é impressa por `npx tsx scripts/contrast-table.ts` (em `site/`), e `site/tests/tokens.test.ts` falha se algum texto ficar abaixo de 4,5:1 em ground, surface ou raised, ou uma borda de controle abaixo de 3:1. Os nomes antigos (`--bg`, `--text`, `--text-2`, `--gold`) seguem como apelidos de `--ground`, `--ink`, `--ink-2` e `--accent-text` enquanto os componentes migram.

| Token | Noite | Dia | Contraste em ground / surface / raised (Noite · Dia) |
|---|---|---|---|
| `--ground` | `#051219` | `#F8F4ED` | |
| `--surface` | `#051017` | `#F5F2E9` | |
| `--raised` | `#111E25` | `#EEE6D9` | |
| `--ink` | `#F2EBDD` | `#0E1E1A` | 15,99 / 16,20 / 14,32 · 15,71 / 15,39 / 13,91 |
| `--ink-2` | `#D2C8C1` | `#403E3C` | 11,54 / 11,69 / 10,33 · 9,71 / 9,51 / 8,60 |
| `--ink-3` | `#909494` | `#676867` | 6,19 / 6,27 / 5,54 · 5,10 / 5,00 / 4,52 |
| `--accent-text` | `#E7C588` | `#8A5E2C` | 11,51 / 11,66 / 10,31 · 5,15 / 5,05 / 4,56 |
| `--accent-interp` | `#BA6F71` | `#6A3335` | 5,06 / 5,12 / 4,53 · 8,96 / 8,78 / 7,93 |
| `--accent-theme` | `#5C927C` | `#2B453A` | 5,29 / 5,36 / 4,74 · 9,51 / 9,31 / 8,41 |
| `--link-history` | `#599392` | `#436F6F` | 5,43 / 5,50 / 4,86 · 5,12 / 5,01 / 4,53 |
| `--control-border` | `#576A78` | `#838480` | 3,38 / 3,42 / 3,02 · 3,43 / 3,36 / 3,04 |
| `--hairline` | `#252D33` | `#DDD9D2` | 1,36 / 1,37 / 1,21 · 1,28 / 1,26 / 1,14 |
| `--ink` sobre `--highlight` | | | texto sobre a faixa de destaque: 12,20 · 12,49 |
| `--on-gold` sobre `--accent-text` | | | rótulo de botão preenchido com o acento: 11,51 · 5,65 |
| `--on-fill` sobre `--accent-theme` | | | rótulo sobre o verde de Tema: 5,29 · 10,42 |
| `--sky-gold` sobre `--sky` | | | ouro do céu (todos os temas): 13,05 |

Papéis: `--ink` texto principal; `--ink-2` secundário e contagens; `--ink-3` só rótulo de eixo e legenda; `--accent-text` camada "Texto bíblico" (ligação, seleção, foco, item atual da navegação, kicker); `--accent-interp` "Interpretação"; `--accent-theme` "Tema"; `--link-history` "História"; `--highlight` faixa do versículo marcado; `--on-gold` e `--on-fill` rótulo sobre preenchimento.

Regras:
- **O céu é sempre Noite.** Céu da home, arcos, grafo, mapa e as faixas de arcos da leitura pintam o próprio chão `--sky` (`#060D1A`), também no tema Dia (no Dia, a faixa vira uma "janela de céu" dentro do painel claro). Motivo: o vitral perde contraste em fundo claro (no Dia antigo, `#FF801F` dava 2,23:1 e `#FFD15C`, 1,29:1). O cabeçalho que flutua sobre o céu (home, `/arcos`) usa os tokens do céu nos dois temas; a barra de baixo segue o tema escolhido, porque continua visível nas seções claras abaixo do céu. (A3)
- **O vitral é escala de dado, não cor de interface.** Ele codifica a distância do arco e só existe dentro do canvas, com legenda "curta → longa" feita da própria rampa. Nunca em texto, botão, etiqueta ou ícone: `#2442FF` (3,05) e `#8C33FF` (3,73) ficam abaixo de 4,5:1 mesmo no Noite. Na seleção, as ligações acesas ficam em ouro e o vitral recua. (A2)
- **Ouro é luz.** O versículo selecionado, as ligações acesas (texto, lista, canvas), o anel de foco, o item atual da navegação e o kicker (um por painel, como nas referências do Alex). Nunca em títulos, bordas ou fundos de página; o ouro ocupa menos de 5% de qualquer tela. Na capa, o botão principal é preenchido com `--sky-gold` e rótulo `#060D1A` (13,05:1), porque fica sobre o céu. (A2)
- **Foco** = contorno ouro de 2 px com `outline-offset: 2px`, para o vão mostrar o fundo; assim o anel não some sobre um item já ouro. Seleção nunca só por cor: ouro mais peso ou ícone, mais `aria-selected`/`aria-current`.
- **Cor nunca sozinha:** o número de ligações ou de votos sempre aparece em texto ao lado da cor.
- **`--quote` é raro:** tem 1,06:1 contra `--text` (mesma luminosidade); usado em todo lugar, vira um segundo branco.
- **Exceção de marca registrada: o azul-marinho.** O fundo vem do vídeo 2 e fica. Para não virar dashboard "slate", painéis grandes usam `--surface` e o `--raised` só aparece em hover e seleção. (A2, A3)
- **Brilho só dentro do canvas.** Mistura aditiva no WebGL mostra densidade, como no vídeo 1. Na interface, nada de glow, bloom, halo, `text-shadow` ou `box-shadow` luminoso. (A2)
- **Superfícies do navegador no tema:** `::selection` (Noite: `--ground` sobre `--accent-text`; Dia: `--ink` sobre `--highlight`), `caret-color` e `accent-color` no acento, scrollbar em `--hairline`, sublinhado com `text-underline-offset`. `theme-color` acompanha o chão: `#051219` no Noite, `#F8F4ED` no Dia.
- **Aplicação do tema:** Noite na primeira visita (pendente, §14). A escolha fica salva no aparelho e é aplicada antes da primeira pintura por um script inline no `<head>`; `color-scheme` e `theme-color` acompanham o tema. As páginas são estáticas, então o tema não pode vir de cookie no servidor.
- Pergaminho é cor lisa: sem textura de papel, mancha, borda rasgada ou ornamento (A1).

## 4. Tipografia

| Papel | Fonte | Onde | Motivo |
|---|---|---|---|
| Texto bíblico (Read) | **Literata** (OFL, eixo wght, latino), 17–19 px, `line-height` ≈ 1,6, `text-wrap: pretty` | Leitura, notas, prévia, sheet, ⌘K | Altura-x 0,507 em, contra 0,386 em da Cormorant: Cormorant a 20 px tem a altura-x da Literata a 15,2 px. Traço fino da Cormorant fica abaixo de meio pixel no texto claro sobre escuro |
| Citação em destaque | **Cormorant Itálica** 500, `--quote` | Home, estudos, OG, abertura da nota do versículo | É o único papel da Cormorant nos vídeos. A romana sai do site: os vídeos nunca a usam e o "í" dela (Bíblia, Príncipe) fica com o acento deslocado no render de 19/10; na itálica, não |
| Títulos de página (v3) | **Newsreader** numa instância fixa (tamanho óptico 72, peso 440), `--font-title`, sem negrito sintético | `h1` e títulos de seção da leitura, do índice de livros, de Créditos e das páginas novas | As três referências do Alex usam serifa de display nos títulos ("No princípio.", "Linha do tempo"). Uma instância só, recortada para o latim, tem 22.200 B; a variável inteira teria os dois eixos à toa |
| Interface | **Space Grotesk** 400–600, tracking de −0,01 a −0,03 em nos títulos de painel, caixa normal | Tudo que não é Escritura nem título de página; títulos do céu (`/arcos`) | Papel de manchete dos vídeos; tem `tnum` (conferido) e, desde a v3, as setas ←→↔ no recorte |
| Contador e referência dos estudos | **Space Mono** | Só nas páginas de estudo: odômetro da narrativa e referência em caixa-alta espaçada embaixo da citação ("MIQUEIAS 5:2") | Assinatura dos vídeos. **Pendente (§14):** a taste pede tirar a Space Mono do site |

- **Escala de cinco degraus**, sem nada entre eles: pequeno 13–14 px (contagens, legendas), interface 15–16 px, Escritura 17–19 px, título 24–32 px, display só na home e nos estudos (`clamp()`). Nada abaixo de 13 px. Em tela de app, nenhum número passa de 40 px.
- **Números:** `font-variant-numeric: tabular-nums` em toda coluna (os algarismos padrão da Space Grotesk são proporcionais). Número de versículo e contagem em Space Grotesk `--text-2`, nunca nos algarismos de estilo antigo da Cormorant.
- **Carga de fontes por página:** o layout raiz carrega Space Grotesk (27.708 B) e Newsreader (22.200 B), porque toda rota tem interface e título. A leitura soma a Literata (52.496 B). A Cormorant Itálica (54.356 B) e a Space Mono (19.908 B e 20.240 B) entram só onde aparecem. Serifadas com `adjustFontFallback: 'Times New Roman'`. (A4)
- `next/font/local` não faz subset: as cópias WOFF2 saem de `site/scripts/subset-fonts.sh` (que confere o SHA-256 do pacote da Newsreader antes de recortar). As cinco licenças OFL estão em `site/src/fonts/` e no `ATTRIBUTION.md`.
- **Kicker (v3):** uma linha curta em caixa-alta espaçada (0,18 em), 13 px, no acento, acima do título de um painel ("NO PRINCÍPIO", "LINHA DO TEMPO"), como nas referências. No máximo um por painel; nunca acima do `h1` da página de leitura. É a exceção à regra de não usar eyebrow, aberta pelas referências do Alex.
- **Grego e hebraico** (nomes do TIPNR, Fase 5): nenhuma das três fontes atuais tem esses alfabetos. Definir uma fonte OFL de reserva e marcar cada trecho com `lang="grc"` ou `lang="he" dir="rtl"`.
- **Evitar:** caixa-alta em rótulos (exceções: o kicker acima, nomes no mapa, a referência da citação nos estudos e as manchetes nas aberturas da home e dos estudos), mais de um eyebrow por painel, destacar uma palavra só no título.

## 5. Layout

Desktop (≥ 1024 px): três colunas, com o texto no centro e as ligações à direita.
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Bíblia Conectada      [ Buscar versículo, lugar, pessoa   Ctrl K ]  Ler Grafo Arcos Mapa │
├───────────────┬──────────────────────────────────────────┬─────────────────────┤
│ Livros        │ Isaías › 9                               │ Ligações de Is 9:6  │
│  Gênesis      │ ‹ Isaías 8                     Isaías 10 › │ Lc 2:11        228  │
│  …            │ 6 Porque um menino nos nasceu…       212 │ Mt 1:23          …  │
│  Isaías ▾     │ 7 …                                    … │ Chegam aqui         │
│   1 2 … 9 …   │                                          │ [grafo local: céu]  │
└───────────────┴──────────────────────────────────────────┴─────────────────────┘
```
Celular (375 px): uma coluna. A contagem vai no fim do versículo, como botão; as ligações abrem num bottom sheet; a navegação fica embaixo (4 itens, ícone + rótulo).
```
┌───────────────────────────┐
│ Bíblia Conectada    Buscar │
├───────────────────────────┤
│ Isaías › 9                 │
│ 6 Porque um menino nos     │
│ nasceu, um filho nos foi   │
│ dado; … Príncipe da Paz.   │
│ [arco] 212 ligações        │  ← botão com ícone SVG (alvo de 44 px); abre o sheet
│ 7 …                        │
├───────────────────────────┤
│  Ler   Grafo   Arcos  Mapa │
└───────────────────────────┘
```
- **Assinatura da leitura: a margem de ligações.** É a coluna de referências das Bíblias de estudo refeita: cada versículo tem a contagem na margem direita (Space Grotesk tabular, `--text-2`, 13–14 px). Só o versículo selecionado mostra a contagem com o nome ("212 ligações"), em ouro. Um sistema só, usado na margem: sem moldura em volta de cada versículo e sem cards. O texto bíblico é sempre a tinta mais forte da tela. (A2)
- No celular a contagem não ocupa coluna à direita, porque roubaria largura da linha. O texto do versículo continua selecionável: tocar no texto não abre o sheet.
- **Arcos da leitura (feito em 19/10).** No painel do versículo, no do capítulo e na página do livro há uma faixa com os arcos daquela seleção, desenhada como no vídeo 1: linha de base de Gênesis a Apocalipse com os capítulos igualmente espaçados, cada ligação um meio-arco, cor pela distância (paleta do `film.py`) e espessura pelos votos (peso do `arcs.py`). Escala vertical fixa para todas as páginas, então alturas comparam. Fundo Noite também no tema Dia, como o céu. No capítulo e no livro os arcos de versículos que vão ao mesmo capítulo viram um só, com brilho `1 − e^(−Σ)`, a luz somada do vídeo. SVG feito no servidor: zero JS. Legenda curta embaixo diz como ler.
- **Capa da home (19/10):** título dividido "Toda passagem / abre um mundo", com a primeira linha na Cormorant Itálica dos vídeos. Ao rolar, uma janela sobre o céu noturno cresce até ocupar a tela.
  - No horizonte fica a luz do versículo mais ligado, com os arcos dele em ouro: `summary.json`, hoje Isaías 9:6 e 212 arcos.
  - **Céu vivo (pedido do Alex, "com muito Motion vivo"):** WebGL2 com três passadas na GPU.
    - Céu: estrelas piscando, brilho respirando, estrela cadente rara.
    - Arcos aditivos: os dourados do versículo com pulsos de luz correndo da estrela, sobre um véu tênue dos pares mais votados (paleta do `film.py`), carregado depois da primeira pintura e não baixado com economia de dados.
    - Frente: colinas que derivam e respondem ao mouse e à rolagem, névoa, granulação.
    - Pausa fora da tela e em aba escondida; resolução cai sozinha se os quadros ficam lentos.
    - Com renderizador por software (SwiftShader, llvmpipe…) ou com menos de ~8 quadros por segundo, volta para a cena parada em Canvas 2D (três camadas desenhadas uma vez, arcos nascendo por recorte CSS). No Lighthouse, o WebGL por software travava a página 0,2–1 s por quadro.
    - `localStorage["ceu-vivo"] = "1"` força o céu vivo para conferir sem GPU.
  - Com movimento reduzido ou sem JS, a capa é uma página parada e completa.
  - Código em `site/src/components/home/`.
- **Largura da página:** `--page-max: 84rem` vale para o cabeçalho, a grade de leitura e o índice de livros, então a marca, o trilho de capítulos e os títulos começam na mesma linha.
- **Ícones repetidos** (um por versículo ou por ligação) são máscaras CSS (`.i .i-arc`, `.i-out`, `.i-in`, `.i-both`), com o mesmo desenho dos SVG de `icons.tsx`. Em Isaías 9:6 isso, mais os arcos agrupados por cor e força, levou o HTML de 447 KB para 234 KB (27 KB gzip).
- **Medida:** texto bíblico com 60–75 caracteres médios por linha. Não escrever `70ch` sem medir: o `ch` (largura do "0") é maior que o caractere médio da BLIVRE (Literata: 0,579 contra 0,478 em; Cormorant: 0,477 contra 0,391; Space Grotesk: 0,638 contra 0,492), então `70ch` em Literata dá uns 85 caracteres. Fixar `max-inline-size` pelo caractere médio e conferir com o script de medição da Fase 2.
- **Orientação:** trilha `Isaías › 9 › 6` com cada nível como link; capítulo anterior e próximo no topo e no fim; item atual da navegação com cor, peso e `aria-current="page"`.
- Safe area com `env(safe-area-inset-*)` na barra e no sheet, `viewport-fit=cover` na meta viewport, `scroll-padding` do tamanho do header e da barra. `min-height: 100dvh`, nunca `100vh`. Nada de rolagem horizontal. Nunca `user-scalable=no`.
- **Navegação única (v3):** uma lista só (`site/src/components/shell/nav.ts`) alimenta o topo e a barra de baixo. Seções: Explorar, Ler, Linha do tempo, Arcos, Ponte. No desktop (≥ 56 rem) ficam no cabeçalho, com o item atual sublinhado no acento e `aria-current="page"`. No celular o cabeçalho guarda marca, tema e busca, e a barra de baixo mostra quatro itens com ícone e rótulo (Explorar, Ler, Arcos, Ponte); "Linha do tempo" não cabe na barra e entra pela página Explorar. Rótulo pode quebrar, nunca cortar. A barra respeita `safe-area-inset-bottom` e o `body` reserva a altura dela.
- **Rotas reservadas:** todo segmento de topo do app (e pasta de `public/`) está em `RESERVED` (`site/src/lib/canon/redirects.ts`), para nenhum atalho de livro (`/is/9/6`) sequestrar uma página; `site/tests/routes.test.ts` confere.

## 6. Interação

- **Ler:** escolher um versículo acende a contagem e abre as ligações, ordenadas por votos, com o número sempre em texto. O HTML do capítulo traz o texto e a contagem de cada versículo. **Como ficou (19/10):** cada versículo é uma rota (`/isaias/9/6`) cujo painel vem pronto do servidor; o texto do capítulo fica no layout e não recarrega ao trocar de versículo. Os 200 versículos mais ligados saem no build; os outros, na primeira visita. A prévia do hover baixa o texto do capítulo ligado de `public/data/text/`.
- **Sheet (celular):** é um diálogo (`role="dialog"`, `aria-modal="true"`, título "Ligações de Isaías 9:6"). O foco vai para o título e fica preso dentro; Esc e o botão "Fechar" visível fecham, e o foco volta ao botão de origem. Arrastar para baixo é atalho, nunca o único caminho. Abrir o sheet faz `pushState` para `/isaias/9/6`, então o voltar fecha o sheet em vez de sair do capítulo. Tocar numa ligação navega para o versículo de destino, sem empilhar sheets. Opaco, em `--surface`, sem blur; sombra só nele e na prévia, porque flutuam.
- **Prévia (desktop):** hover e foco mostram o texto do versículo ligado. Ela fica aberta enquanto o ponteiro entra nela, fecha com Esc sem mover o foco e não some sozinha. O link continua navegando no clique ou Enter.
- **Arcos e céu:** tocar direto no eixo não serve para escolher capítulo: em 343 px úteis cada capítulo tem cerca de 0,29 px e até Salmos (150 capítulos) fica com cerca de 43 px; em 1440 px, cerca de 1,2 px por capítulo. Formas de escolher: (1) arrastar o dedo pela linha de base, com rótulo grande acima do dedo ("Isaías 9 · 212 ligações") e soltar para fixar; (2) seletor livro → capítulo com ‹ › e a busca; (3) teclado: ← → anda um capítulo, Enter fixa. No desktop, o hover só pré-visualiza; clique ou Enter fixa. A seleção entra na URL.
- **Filtros dos arcos:** votos mínimos e "só AT↔NT", cada um com rótulo que diz a definição ("Votos mínimos (soma das duas direções)"). Ao mudar, um único `role="status"` anuncia "N ligações visíveis, votos ≥ V" sem mover o foco.
- **Grafo:** capítulos são estrelas (1.189) e livros são constelações. Com o zoom inicial o toque cai na constelação; capítulos ficam tocáveis depois do zoom, com raio de acerto equivalente a 44 px. Tocar seleciona e abre o sheet com as ligações e o botão "Abrir nota" (sem duplo toque). Botões + / − / Recentrar sempre visíveis; no teclado, setas andam entre vizinhos e Enter abre.
- **Mapa:** marcadores levam à nota do lugar. Botões + / − / Recentrar, setas movem o mapa com foco, lista "Lugares nesta vista" ordenável por número de versículos, legenda da camada de rotas dos estudos. O grau de certeza do OpenBible aparece em texto, não só por cor.
- **Busca ⌘K:** entende "Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13" (parser pronto em `site/src/lib/canon/reference.ts`), nomes de lugar e de pessoa, e texto livre. O campo visível no topo é o caminho principal; o atalho é extra, com rótulo por plataforma ("⌘K" no Mac, "Ctrl K" nos outros, nenhum no celular). Diálogo com `role="combobox"` e `listbox`; setas, Enter, Esc devolve o foco. Sem resultado: "Tente “Is 9:6” ou “Belém”". Os recentes ficam só no aparelho.
- **URLs:** toda tela tem link próprio. `/[livro]/[cap]/[vers]` é rota própria que renderiza o capítulo com o versículo em foco; o canonical aponta para o capítulo e o `og:url` para o versículo. `/is/9/6` → `/isaias/9/6` por `redirects()` gerado da tabela de livros. O voltar preserva a posição e o versículo em foco.
- **Prefetch:** listas densas (ligações, backlinks, capítulos) usam o prefetch padrão com `partialPrefetching`, que baixa só o shell; `prefetch={true}` só em capítulo anterior/próximo. (A4)

### 6.1 Estados e faixas (do `xref.npz` e dos dados gerados)

- Ligações por versículo: mediana 15, p90 40, p99 81, máximo 212 (Is 9:6).
- **Vazio:** 799 versículos não têm nenhuma ligação na base. O painel diz isso e oferece o capítulo e os versículos vizinhos.
- **Muito cheio:** 107 versículos têm mais de 100 ligações: lista agrupada por livro ou testamento, com "Mostrar todas" e números alinhados à direita. **Como ficou (19/10):** as 5 mais votadas com o texto, as 40 seguintes em linhas e o resto atrás de "Mostrar mais N"; o agrupamento por livro fica para a Fase 7.
- **Carregando o céu:** a imagem estática, com a contagem em texto e `aria-busy`, nunca moldura vazia. Na troca de página, o título do destino aparece na hora e as linhas do texto ficam reservadas com a altura certa (sem shimmer, CLS 0).
- **Sem WebGL ou contexto perdido:** aviso curto e a lista. Um contexto WebGL vivo por vez, descartado ao sair da rota.
- **Erro de rede:** "Não deu para carregar as ligações. Tentar de novo." A lista que já veio continua funcionando.
- **Dados reduzidos** (Save-Data ou rede lenta): o céu não baixa sozinho; mostra a imagem e o botão "Carregar o céu".
- **Versículo fora da grade KJV** (NBV, BLT): aparece no texto da tradução, marcado "sem ligações próprias".

## 7. Movimento

- **Material: luz, não deslocamento.** Selecionar muda brilho e cor (ouro) e recua o resto; a interface não se mexe.
- **Um momento orquestrado só:** na home, os arcos se desenham a partir do céu já visível (a imagem estática), nunca de tela preta. A busca funciona desde o início e qualquer toque interrompe o desenho. Só na primeira visita da sessão. Duração: até 1,5 s, como no vídeo (pendente: encurtar para 1,2 s, §14). Com `prefers-reduced-motion`, o céu aparece pronto.
- **O resto responde a ação:** seleção acende ligações em cerca de 200 ms; câmera do grafo e do mapa em 300–400 ms; o sheet sobe em 250 ms e desce em cerca de 70% disso. Toda animação pode ser interrompida.
- **Curvas nomeadas:** `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` para acender e abrir; `--ease-in-out: cubic-bezier(0.76, 0, 0.24, 1)` para a câmera. Sem overshoot nem bounce.
- **Pulso:** ao selecionar, um único pulso percorre cada ligação acesa, da origem ao destino (300–450 ms), uma vez. Sem loop, sem cintilar, sem partículas. Para quando a aba ou o canvas sai da tela. (A2, A4)
- **Continuidade entre telas:** `<ViewTransition>` do React 19.3 só onde ela é o ponto: estrela do grafo → nota, e Ler ↔ Grafo ↔ Arcos mantendo o versículo selecionado. Cabeçalho e barra fixos. Capítulo → capítulo sem slide. Nada de biblioteca de animação nas páginas de leitura.
- **Movimento reduzido** não apaga feedback: a seleção continua acendendo (cor e opacidade), a câmera corta em vez de voar, o sheet aparece sem deslizar e `scroll-behavior: smooth` só com `no-preference`.
- **"Recuar" tem limite:** no canvas, marcas não selecionadas ficam com pelo menos 0,2 de opacidade ou somem; em texto, nunca baixar a opacidade: o não selecionado vira `--text-2`.

## 8. Qualidade mínima (checklist ui-ux-pro-max, prioridades 1–3)

- **Acessibilidade:**
  - Contraste AA (§3), conferido por teste.
  - Foco visível (§3), navegação completa por teclado, skip link, títulos em ordem, `aria-label` em botão só de ícone.
  - `<html lang="pt-BR">`; trechos em outra língua com `lang` próprio.
  - Depois de navegar pelo cliente, o foco vai para o `h1` da nova página e o título do documento muda ("Isaías 9 · Bíblia Conectada").
  - Nenhum elemento fixo (header, barra, sheet) cobre o controle com foco.
  - Zoom: 200% em 1440 px vira layout de uma coluna; 400% (320 px) funciona sem rolagem horizontal, com sheet, ⌘K e barra. Espaçamento de texto do usuário (linha 1,5; parágrafo 2×; letras 0,12 em; palavras 0,16 em) não corta nada.
  - Cada canvas tem `role="img"` e `aria-label` com a vista e o estado ("Arcos de Isaías 9:6: 212 ligações; lista abaixo"). A lista de adjacência, sincronizada com a seleção, é a fonte acessível dos dados.
- **Toque:** alvos de 44×44 px com 8 px de espaço nos controles (botões, itens de lista, barra, contagens); referência citada dentro do texto corrido é link inline (exceção do WCAG 2.5.8), sem forçar 44 px. Feedback em menos de 100 ms e `touch-action: manipulation`.
- **Performance:**
  - **JS:** o runtime do Next 16.4.2 + React 19.3.1 manda 135,1 KiB gzip numa página sem nenhum componente de cliente (`npm run budget`, 19/10; polyfills `noModule` fora). O teto de ~100 KB não cabe em Next. Proposta: JS próprio na carga inicial ≤ 25 KiB gzip acima do runtime e total ≤ 165 KiB, medido por `npm run budget` a cada fase. **Pendente (§14).** (A4)
  - Páginas de livro e capítulo pré-renderizadas no build com `generateStaticParams` completo e `ensureStatic = 'navigation'` (o build falha se alguém introduzir renderização por request). Server Components por padrão; `'use client'` só nas folhas (contagem, sheet, prévia, ⌘K).
  - Visões WebGL por `next/dynamic(..., { ssr: false })` dentro de um wrapper de cliente, pré-carregadas na intenção (hover, foco ou toque no item da navegação). Com Save-Data, não carregam sozinhas.
  - **Dados do céu em camadas** (`arcs.bin`, ordenado por votos): os 5.000 mais votados (votos ≥ 52) têm 18.931 B em gzip; 10.000 (≥ 32), 36.588 B; 20.000 (≥ 19), 71.595 B; 50.000 (≥ 9), 173.710 B; o arquivo inteiro (301.539 arcos, 1.809.234 B), 848.749 B. No celular, começar por um recorte e baixar o resto sob demanda; o corte é calibrado no aparelho na Fase 4. Conferir no preview se a Vercel comprime `.bin`. (A4)
  - Imagens (pôster do céu, capas, recriações) pré-geradas em AVIF/WebP no build, com `width`/`height`, CLS < 0,1. `font-display: swap` já é o padrão do `next/font`.
- **Ícones:** SVG de uma família só (Lucide), nada de emoji nem glifo como ícone. ⌘ e ▸ não existem nas três fontes do projeto: vêm em SVG.

## 9. Skills e referências

- **Stack: Next.js 16 (App Router) na Vercel**, decidida pelo Alex em 19/10 (a proposta anterior era Astro; motivo e consequências no `HANDOFF.md` §3 e §5.4). Sem Framer Motion: movimento com CSS, Web Animations API e `<ViewTransition>`. Radix só por pacote e só onde a acessibilidade é difícil (diálogo do sheet e do ⌘K), carregado na intenção.
- **Skills** (instalação no `HANDOFF.md` §7): ui-ux-pro-max (com o CLI de design system), impeccable, taste (`design-taste-frontend`). `PRODUCT.md` na raiz guarda o registro de produto do impeccable.
- **O que o CLI de design system do ui-ux-pro-max devolveu, e foi recusado:** para "knowledge graph bible study dark" e "scripture reading study app", o padrão "Hero + Testimonials + CTA", o estilo "Minimalism & Swiss Style", Cormorant Garamond + Crimson Pro com clima "academia, library, parchment" e fundo `#FFFBEB`. Creme com serifa é o A1; depoimentos não existem e não se inventam. **Aproveitado:** o domínio de gráficos (rede com mais de 500 nós pede agrupamento ou LOD; risco alto de acessibilidade; a lista de adjacência é a fonte acessível) e as regras de stack do Next.
- `concept-seed` do impeccable não rodou: o mundo visual está fixado pelos vídeos (compromisso de marca, A3). Cada superfície nova da Fase 2 em diante segue o caso "superfície dentro de mundo estabelecido" do impeccable.
- **Referências** (21st.dev e outras): ver `design/referencias.md`.

## 10. Recusas

| Recusa | Protege |
|---|---|
| Grade de cards iguais; card dentro de card | A2 |
| Fileira de números grandes com rótulo pequeno (hero-metric) | A2 |
| Brilho, halo e borda luminosa na interface (brilho só dentro do canvas do céu) | A2 |
| Monoespaçada fora dos estudos; vitral fora do canvas | A2 |
| Texto em gradiente, vidro ou blur decorativo, borda esquerda colorida acima de 1 px | A2 |
| Citação bíblica solta num card, como "versículo do dia" ou imagem de post: toda citação aparece ligada ao dado que a conecta (contagem, arco ou par) | A1 |
| Pergaminho como textura ou moldura (papel envelhecido, mancha, borda rasgada), ornamentos, carrossel de depoimentos | A1 |
| Fade-and-slide em cada seção, hover animado em todo card, parallax decorativo, loop sem significado | A2, A4 |

## 11. Texto e imagens

**Tom:** claro, de estudo, sem jargão (proposta do `HANDOFF.md` §8.5, ainda não confirmada). Regras que dá para conferir:
1. Número sempre com o nome e a definição: "212 ligações", "333 votos". Numa coluna de contagens, o cabeçalho ou o `aria-label` diz o que é.
2. Fato contável no lugar de adjetivo, vindo do build. Nunca "maior do mundo" sem prova, nem "incrível", "poderoso", "revolucionário", "mergulhe", "jornada", "desbloqueie".
3. Títulos são nomes: "Isaías 9", "Belém", "Ligações de Is 9:6". Sem saudação, sem "versículo do dia", sem imperativo devocional, sem pergunta retórica. (A1)
4. Botões dizem a ação ou o destino em 1 a 3 palavras ("Abrir Is 9:6", "Ver no grafo", "Mostrar todas"), nunca "Saiba mais" ou "Explore". Vazio e erro cabem numa frase com o próximo passo.
5. Rodapé: os créditos com o texto exato do `ATTRIBUTION.md`, em `--text-2`, e o link "Sobre e créditos". Sem colunas de links.

**Imagens**, nesta ordem: (1) quadros dos próprios vídeos, com "Recriação" quando forem gerados; (2) o mapa com relevo das bases abertas; (3) mapas antigos, gravuras e cartas celestes de domínio público, com crédito no `ATTRIBUTION.md`; (4) desenho em código a partir dos dados. Proibido: banco de imagens com mãos, Bíblia, raios de luz ou pomba, ilustração genérica e rosto de criança (regra 8 do `CLAUDE.md`). Nas páginas de estudo, imagens abaixo da dobra e com lazy-load. (A1, A4)

## 12. Autoverificação (antes de dizer "pronto")

Em 375 e 1440 px, nos temas Noite e Dia (regra 9 do `CLAUDE.md`):
1. Cobrindo o nome, dá para adivinhar "app devocional" ou "dashboard dark" só pela categoria? Se sim, refazer.
2. Tem textura de papel, ornamento, versículo solto ou tom de sermão? (A1)
3. Tem neon, cards em grade, brilho fora do canvas, ou texto bíblico perdendo espaço para a interface? (A2)
4. Quem viu o vídeo reconhece o ouro, o céu e os arcos na primeira tela? (A3)
5. No 4G simulado, o texto aparece antes do céu interativo, e o `npm run budget` fica dentro do teto? (A4)
6. O detector do impeccable (`impeccable detect --json`) rodou nas telas mudadas, e o que ele achou foi resolvido ou registrado.

## 13. Revisão de 19/10/2026: o que mudou e por quê

Fontes: CLI do ui-ux-pro-max (`--design-system` e domínios), `/impeccable shape` (SKILL, shape, new-work, mode-read/persuade/operate, typeset, colorize, animate, craft-floor), taste v2 (SKILL, tells, type, colour, motion, layout, app-screens, copy) e a documentação do Next 16.4.2 instalada em `site/node_modules/next/dist/docs/`. Quatro revisões independentes, uma por lente; os números foram refeitos por código antes de entrar aqui.

| Seção | Mudança | Por quê | Fonte |
|---|---|---|---|
| §1 | Anti-objetivos A1–A4 do Alex e frase da ideia com motivo único (o arco) | O shape pede o que faria o resultado parecer errado; cada regra passa a dizer o que protege | impeccable shape/new-work; taste |
| §1.1 | Tabela de modo (Experience/Read/Operate) e tipo de tela (página/app) por superfície | A ambição escala com o modo; as regras de composição mudam entre página e tela de app | impeccable SKILL; taste SKILL |
| §1.2 | Primeira tela da home especificada: imagem estática do céu, título, frase com números, busca funcionando | O README só desenhava a leitura; o céu precisa existir antes do WebGL (A4) e sem hero-metric | impeccable mode-persuade, animate, craft-floor |
| §2 | Uso real das fontes nos vídeos (Cormorant só itálica) | Base da decisão tipográfica: continuidade cobre a citação, não o corpo | grep em `estudos/` |
| §3 | Contraste também em surface e raised; `--control-border` com valor; céu sempre Noite; vitral só no canvas; ouro = luz; foco com vão; exceção do azul-marinho; sem brilho fora do canvas; superfícies do navegador; aplicação do tema antes da pintura | O README só conferia contra `--bg`; no Dia, dois tons do vitral falham (2,23 e 1,29); o token de borda não tinha valor; ouro em foco e seleção some (1,0:1) | as quatro lentes; contraste refeito por código |
| §4 | Corpo do texto em Literata; Cormorant só itálica; Space Grotesk em títulos; Space Mono só nos estudos; escala de 5 degraus; carga de fontes por página; grego/hebraico | Altura-x 0,386 em da Cormorant contra 0,507 da Literata; o README já previa a troca "se cansar", e a medida transformou a condição em decisão; "í" da Cormorant romana | impeccable typeset; taste type; ui-ux-pro-max (piso de 20 px se ficar Cormorant) |
| §5 | Margem de ligações como assinatura; contagem inline no celular; medida medida, não `70ch`; trilha e anterior/próximo; safe area com `viewport-fit=cover` e `scroll-padding` | Coluna à direita no celular encurta a linha abaixo do mínimo; `ch` da Literata e da Cormorant é maior que o caractere médio | impeccable mode-read; ui-ux-pro-max (medida, safe area) |
| §6 | Sheet como diálogo com `pushState`; prévia persistente; arcos por arraste + seletor + teclado; grafo sem duplo toque; filtros com definição e `role="status"`; mapa com botões e lista; ⌘K com rótulo por plataforma; rotas do Next; política de prefetch | Capítulo no eixo tem ~0,29 px no celular: tocar não funciona; duplo toque é gesto escondido; "⌘K" não existe no Android | ui-ux-pro-max; impeccable mode-operate; documentação do Next |
| §6.1 | Estados e faixas (vazio: 799 versículos; >100 ligações: 107) | O README não tinha nenhum estado fora do caminho feliz | ui-ux-pro-max; impeccable shape; craft-floor |
| §7 | Gramática de luz, curvas nomeadas, pulso único, `<ViewTransition>`, desenho da home a partir do céu visível, regras de movimento reduzido e de opacidade | Cobria só a abertura; loop sem significado é sinal de interface gerada e gasta bateria | impeccable animate; taste motion; Next view-transitions |
| §8 | Orçamento de JS medido (runtime 135,1 KiB); `ensureStatic`; WebGL com `ssr: false` e Save-Data; camadas de dados do céu medidas; zoom 200/400%; foco na troca de rota; canvas com `role="img"` | 100 KB não cabe em Next; o arquivo inteiro do céu tem 848.749 B em gzip | medição em `site/`; ui-ux-pro-max; Next docs |
| §9 | Stack Next.js registrada; saída do CLI do ui-ux-pro-max registrada e recusada | O texto antigo mandava seguir Astro; sem o registro, outra sessão adotaria o pergaminho | as quatro lentes |
| §10–12 | Lista de recusas ligada aos anti-objetivos; regras de texto e imagem; autoverificação | Dá critério conferível para o tom e para dizer "pronto" | impeccable craft-floor; taste copy/SKILL |

| §5, §6 (19/10, leitura feita) | Arcos do vídeo 1 no versículo, capítulo e livro; `--page-max` comum; ícones repetidos em CSS; painel por rota; lista longa com "Mostrar mais" | O Alex achou o site amador: faltava a cara dos vídeos na leitura. Cabeçalho e grade não alinhavam (marca em x = 145 px, trilho em 64). O contador do versículo escolhido invadia o texto. HTML de Isaías 9:6 com 447 KB | capturas em 375/1440, Lighthouse, detector do impeccable |

| §1, §3, §4, §5, §10 (19/10, v3) | Tokens novos (Noite `#051219` e ouro `#E7C588`; Dia pergaminho `#F8F4ED` com bronze `#8A5E2C`, vinho e verde) com teste de contraste; Newsreader nos títulos; kicker; navegação única com barra de baixo; rotas reservadas com teste; pergaminho sai do A1 | O Alex mandou três imagens com "Estilo a se seguir" e escolheu "Site inteiro". As imagens mostram o Dia em pergaminho e títulos em serifa, o que contraria o A1 e o §4 antigos; a referência explícita dele vale mais que a resposta anterior. O teste de contraste achou um par ruim (rótulo claro sobre o verde no Noite, 3,02:1) antes de qualquer componente usar | imagens do Alex; `tests/tokens.test.ts`; capturas em 375/1440 nos dois temas |

**O que ficou como estava:** paleta do céu e do vitral dos vídeos, céu sempre Noite, "cor nunca sozinha", um único momento orquestrado, layout de três colunas e bottom sheet, alternativa em lista para grafo, arcos e mapa, alvos de 44 px e ícones Lucide.

## 14. Pendências para o Alex

| # | Decisão | Proposta | Quando |
|---|---|---|---|
| 1 | Orçamento de JS no Next | Runtime medido + até 25 KiB de JS próprio (total ≤ 165 KiB gzip) | Antes da Fase 2 |
| 2 | Céu sempre Noite, mesmo no tema Dia | Sim (alternativa: um segundo vitral só para o Dia) | Fase 2 |
| 3 | Literata no corpo do texto | Sim; confirmar com screenshot 375/1440 nos dois temas e no aparelho | Fase 2 |
| 4 | Space Mono | Só nos estudos (a taste pede tirar de vez) | Fase 6 |
| 5 | Primeira visita | Noite sempre (alternativa: seguir o modo do sistema) | Fase 2 |
| 6 | Home | Is 9:6 aceso como dado no estado inicial; título "Bíblia Conectada" (alternativa: "A Bíblia, conectada", título do vídeo 1) | Fase 4/6 |
| 7 | Contagem em todo versículo | Sim, discreta em `--text-2` (alternativa: só na seleção) | Fase 2 |
| 8 | Botão principal | Preenchido em `--text` (alternativa: ouro) | Fase 2 |
| 9 | Duração do desenho da home | 1,5 s como no vídeo (alternativa: 1,2 s) | Fase 4 |
| 10 | Manchetes em caixa-alta | Só nas aberturas da home e dos estudos | Fase 4/6 |
| 11 | Corte inicial do céu no celular | 5.000, 10.000 ou 20.000 arcos, calibrado no aparelho | Fase 4 |
| 12 | Deep link de versículo | Rota própria (OG por versículo; os ~200 mais ligados no build, o resto no 1º acesso) em vez de rewrite | Fase 2 |
| 13 | Tom do texto | As cinco regras do §11, com uma lista de palavras proibidas em PT virando teste | Fase 2 |
| 14 | Fonte de grego e hebraico | Escolher uma OFL antes de mostrar os nomes do TIPNR | Fase 5 |
