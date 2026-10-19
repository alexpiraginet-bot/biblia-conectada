# Direção de design: Bíblia Conectada (v4, "Atlas")

Status: v4, de 19/10/2026 (noite). Substitui a v3 depois do retorno do Alex sobre o site no ar: "muitos problemas de contraste, leitura difícil e dificuldade de pesquisa; não tá nem perto do que queremos". Ele escolheu a direção **Atlas + leitura B + busca C** e o tema **segue o celular**. O que mudou e por quê está em §13; o que falta decidir, em §14.

O sistema está no código e é a fonte de verdade:

- `site/src/styles/tokens.json`: cores dos dois temas, tipo, espaço, raios, sombras, medidas, tempos. É o mesmo arquivo da página do design system (artifact "Design System", privado, do Alex).
- `site/src/styles/tokens.css`: gerado de `tokens.json` por `npx tsx scripts/tokens-css.ts` (em `site/`). Nunca editar à mão; um teste confere.
- `site/src/styles/ds.css`: os componentes, em classes `bc-<componente>__<parte>`. Nenhuma cor própria: só tokens.
- `site/src/app/globals.css`: base, estrutura do site (trilho, barra superior, abas), busca, aparência e a 404.

Todo número deste documento foi calculado por código. Número que vai para o site sai do pipeline, não daqui (regra 3 do `CLAUDE.md`).

## 1. Brief

- **Assunto:** as ligações da Bíblia: 31.102 versículos e 344.799 referências cruzadas (301.584 pares únicos), mais lugares, pessoas, eventos, temas e as profecias dos estudos.
- **Público:** gente que chega pelos Reels (celular, 4G, PT-BR), curiosos e estudantes. Mobile-first de verdade.
- **Trabalho principal:** abrir qualquer versículo, ler com conforto e seguir as ligações dele.
- **Ideia:** um atlas das ligações da Bíblia. Toda passagem abre um mapa: o texto se lê numa coluna calma, e cada ligação é uma linha de ouro sobre um céu azul-marinho. **Motivo único: o arco sobre a linha de base**, na marca, no ícone de ligação e nos mapas.

**Anti-objetivos (respostas do Alex em 19/10).** O site parece errado, mesmo bem acabado, se:

| | Anti-objetivo | Exemplos |
|---|---|---|
| A1 | App devocional genérico | Ornamentos, "versículo do dia", tom de pregação, pergaminho como textura ou moldura |
| A2 | Dashboard tech frio | Neon, brilho, grade de cards, cara de ferramenta de dev, texto bíblico perdendo espaço para a interface |
| A3 | Perder a cara dos vídeos | Quem vem do Reels não reconhece o ouro, o céu noturno e os arcos |
| A4 | Lento ou pesado no celular | Grafo ou arcos travando, ou gastando 4G antes de o texto aparecer |
| A5 | Ler e buscar com esforço (v4) | Texto escuro sobre fundo escuro, cinza fraco, letra pequena, busca escondida ou que só entende um formato |

### 1.1 Princípios

1. **O texto vem primeiro.** A Escritura é a coisa mais legível da tela: Literata grande, coluna de 60 a 66 caracteres, contraste de no mínimo 7:1. Nada se desenha atrás dela.
2. **Toda ligação mostra o número e a regra.** "17 ligações, das mais votadas às menos votadas". Os números vêm do pipeline de dados e têm teste; nenhum é digitado.
3. **Um só momento orquestrado:** a ligação que acende no mapa (o pulso de ouro). O resto responde à pessoa e não se mexe sozinho.
4. **Buscar é sempre um gesto.** Do campo da barra, de Ctrl K ou / no desktop, da aba Buscar no celular: a mesma busca entende referência, palavra, livro e tema.
5. **Os dois temas são de primeira.** Noite e Dia têm a mesma hierarquia e o mesmo contraste. A primeira visita segue o aparelho; a escolha da pessoa fica guardada.

### 1.2 Modo por superfície

O modo diz o que é sucesso para quem está na tela (impeccable).

| Superfície | Rotas | Modo | Consequência |
|---|---|---|---|
| Capa | `/` | Experience na primeira tela, Read abaixo | O mapa de Isaías 9 é a primeira coisa; a busca grande logo abaixo do título |
| Leitura | `/ler`, `/isaias`, `/isaias/9`, `/isaias/9/6`, `/salvos` | Read | Precisão e contenção; a coluna de texto é calma e o mapa fica na moldura |
| Explorar e conexão | `/explorar/...`, `/conexao/...` | Experience no mapa, Operate no painel | Medalhões e selo; o painel "Conexão selecionada" com ação principal |
| Linha do tempo, temas, palavras | `/linha-do-tempo`, `/tema`, `/palavra` e filhas | Read | Listas com fio, não grades de cards |
| Comunidade | `/trilha`, `/ponte`, `/mesa` | Read com uma ação | Um botão principal por área |
| Céu e dados | `/arcos`, `/dados`, `/sobre` | Experience no céu, Read no resto | O céu é uma janela emoldurada no tema Dia |
| Busca | paleta (Ctrl K, aba Buscar) e `/buscar` | Operate | Combobox padrão, resultados agrupados |

## 2. Continuidade com os vídeos

| Elemento | Valor | De onde |
|---|---|---|
| Ouro (luz) | `#FFCC6B` (`sky-gold`) | `GOLD = (1.0, 0.80, 0.42)` em `estudos/*/fx.py` e `film.py` |
| Vitral dos arcos (curto → longo) | `#2980FF` `#2442FF` `#8C33FF` `#FF2966` `#FF801F` `#FFD15C` | `PAL_C` em `biblia-referencias/film.py`; só dentro do canvas do céu |
| Céu noturno (vídeo 2) | `#07172D` a `#1C283B` | mediana de quadros em 8 s e 62 s; o `sky` do sistema é `#060D1A` |

A v4 tira Cormorant e Space Mono da interface: as três vozes do sistema (§4) cobrem título, Escritura e interface. O ouro, o céu e os arcos continuam (A3).

## 3. Cor

Use sempre o token, nunca a cor. Cada tema dá todos os valores sem apontar um token para outro: foi um apelido desses que deixou texto escuro sobre a folha escura no iPhone do Alex (19/10). Um teste (`site/tests/tokens.test.ts`) confere cada regra abaixo nos dois temas, e outro (`site/tests/css-vars.test.ts`) barra qualquer `var(--x)` que ninguém declara.

**Contraste medido** (WCAG 2.2; tabela impressa por `npx tsx scripts/contrast-table.ts`). As regras são mais duras que o mínimo AA:

| Uso | Tokens | Regra | Noite | Dia |
| --- | --- | --- | --- | --- |
| Texto e Escritura | `ink`, `ink-reading`, `ink-2` em `ground`, `surface`, `raised`, `overlay`, `highlight` | 7:1 | ≥ 7,52 | ≥ 7,46 |
| Notas de fonte | `ink-3` nas quatro superfícies | 5:1 | ≥ 6,46 | ≥ 5,39 |
| Acento e categorias como texto | `accent`, `accent-strong`, `lit`, `cat-*`, `danger` | 4,5:1 | ≥ 7,45 | ≥ 5,62 |
| Rótulo sobre o botão principal | `on-action` em `action-fill` | 7:1 | 11,21 | 9,77 |
| Rótulo sobre o acento | `on-accent` em `accent-fill` | 7:1 | 11,21 | 9,77 |
| Bordas de controle e foco | `line-strong`, `focus` nas superfícies | 3:1 | ≥ 3,29 | ≥ 3,36 |
| Céu (sempre noturno) | `sky-ink`, `sky-ink-2`, `sky-gold` sobre `sky` | 7, 4,5 e 3:1 | 16,39 · 9,82 · 13,05 | iguais |

- **Superfícies:** `ground` é a página; `surface` o que fica no plano dela (painel do desktop, rodapé); `raised` campos, botões secundários e hover; `overlay` o que flutua (folha do celular, busca, menus) sobre o véu `scrim`.
- **Texto:** `ink` para interface e títulos, `ink-reading` para a Escritura, `ink-2` para metadados, `ink-3` só para notas de fonte. Nunca cinza puro, nunca opacidade em texto.
- **Ouro e bronze (`accent`):** número de versículo, contagem de ligações, ícone ativo e link em destaque. No Noite é a luz do céu dos vídeos; no Dia é bronze sobre pergaminho.
- **Ação principal (`action-fill` com `on-action`):** um botão por área. Ouro no Noite, verde no Dia.
- **Aceso (`accent-strong`, `lit`):** a ligação escolhida e o item selecionado.
- **Categorias de ligação:** `cat-texto` (referências cruzadas), `cat-interp` (tracejada), `cat-tema` e `cat-historia`. Sempre com rótulo ou padrão de linha junto; a cor nunca é a única pista.
- **Céu (`sky`, `sky-ink`, `sky-ink-2`, `sky-gold`):** janelas de arcos e o céu completo. Noturnos nos dois temas; no Dia aparecem como janelas emolduradas.

## 3.1 Temas

- **Primeira visita:** segue `prefers-color-scheme` (claro: Dia; escuro ou sem ajuste: Noite). Escolha do Alex em 19/10.
- **Menu de aparência** na barra superior: Sistema, Dia e Noite (`site/src/components/header/Appearance.tsx`). Dia e Noite ficam guardados no aparelho (`localStorage` `theme`); Sistema apaga a escolha.
- O tema vai como `data-theme` no `<html>` e no `<body>` e é aplicado antes da primeira pintura (script no `<head>`; nas 404 montadas no navegador, um efeito de layout). Sem escolha, o `<body>` recebe a própria cópia dos valores, então uma troca do ajuste do aparelho também recalcula a página inteira.
- Todo componente com fundo próprio define a própria cor de texto (folha, busca, menus). Texto não herda cor através de uma superfície flutuante.
- Medalhões são ouro sobre azul-marinho nos dois temas, como moedas gravadas; no Dia, o anel `line` os assenta no pergaminho.

## 4. Tipografia

Três vozes, OFL, servidas pelo próprio site e carregadas no layout raiz (`--font-display`, `--font-reading`, `--font-ui`):

- **Newsreader Display** (440, instância de título): `display-xl` na capa, `display` no título de página, `title` em painéis e seções. Sem negrito sintético, `text-wrap: balance`.
- **Literata** (variável 200 a 900): só a Escritura. `scripture` com 19px no celular, 20px de 1024px e 21px de 1440px, entrelinha 1,75. `quote` (19px) para o versículo em foco; `scripture-sm` (17px) em listas e resultados. Nunca abaixo de 17px.
- **Space Grotesk** (variável 300 a 700): a interface. `lede` 19px, `body` 17px, `ui` 16px peso 500 a 600, `meta` 14px, `label` 13px peso 600. Algarismos tabulares onde números se alinham.
- Tamanhos como tokens: `--fs-<estilo>` e `--lh-<estilo>` (rem, os de título e a Escritura fluidos). Medida: `--column` (36rem) para a leitura; texto de interface até 38rem.
- Hierarquia por tamanho e peso, nunca por caixa-alta ou cor fraca. Sem sobretítulo acima de título. Mais espaço acima de um título do que abaixo.

## 5. Espaço, forma e estrutura

- Escala de 4px: `space-1` (4) a `space-9` (96). `space-2` dentro de um grupo, `space-5` entre blocos de um painel, `space-7` entre seções.
- Raios: `radius-sm` (marca de texto), `radius-md` (botões, campos), `radius-lg` (folha, busca, painel), `radius-pill` (chips, pílula de votos).
- Fios em vez de caixas: listas são linhas separadas por `line` (`bc-list`). Cartão só para o que é um objeto separado: o painel de ligações, a busca, a paginação.
- Sombras só no que flutua: `shadow-float` (folha, busca, menu) e `shadow-raise` (botão em repouso).
- Alvo de toque mínimo `target` (44px). Barra superior e barra de abas com `bar-h` (64px) mais a área segura.
- **Desktop (de 1024px):** trilho de seções à esquerda (`rail-w`, 88px: Explorar, Ler, Linha do tempo, Arcos, Ponte, Salvos, Dados) e barra superior com a marca, a busca larga e a aparência. A leitura é uma grade de três partes: trilho de capítulos, coluna de texto, painel de ligações.
- **Celular:** barra superior com marca, lupa e aparência; barra de abas embaixo (Explorar, Ler, Buscar, Arcos, Ponte). O que a página fixa embaixo fica acima das abas com `--tabbar-h`. O painel de ligações vira a folha de baixo.
- **Capa:** o mapa de Isaías 9. No centro o selo do capítulo, em órbita os oito medalhões dos grupos e os capítulos mais votados de cada grupo, com traços de ouro que engrossam com os votos. Ao lado, o painel "Conexão selecionada" (Isaías 9 ⇄ Lucas 2) e o botão "Ler lado a lado". No celular o mapa fica em cima e o painel espia por baixo. A busca grande fica logo abaixo do título.
- A página nunca rola de lado; o que é largo (barra de capítulos, chips, tabelas) rola dentro do próprio contêiner.

## 6. Interação

- **Busca:** a mesma em todo lugar (`site/src/components/search/`). Abre pelo campo da barra, por Ctrl K (⌘K no Mac) ou /, pela aba Buscar e pelo campo grande da capa; sem JavaScript, esses caminhos levam a `/buscar`. No celular ocupa a tela; no desktop é um diálogo de até 44rem.
  - Entende referência em qualquer forma ("Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13") e põe "Ir para Isaías 9:6" no topo; livro pelo começo do nome ("ezeq") ou pela abreviação; palavra e frase no texto da BLIVRE (sem acento e sem diferença de maiúscula); temas.
  - Resultados de texto: a referência, quantas ligações o versículo tem e o trecho em Literata 17px, com a palavra em `<mark>`. Os mais ligados primeiro; "Ver os N versículos" leva a `/buscar`.
  - Teclado: setas escolhem, Enter abre, Esc fecha e devolve o foco a quem abriu. `role="combobox"` sobre `role="listbox"` com `aria-selected`.
  - Vazio: exemplos para tocar e as últimas buscas do aparelho. Sem resultado: diz o que foi buscado e o próximo passo ("Não achei “João 22”: João tem 21 capítulos.").
- **Ler:** escolher um versículo acende a contagem e abre as ligações, ordenadas por votos, com o número sempre em texto. Cada versículo é uma rota (`/isaias/9/6`) cujo painel vem pronto do servidor; o texto do capítulo fica no layout e não recarrega ao trocar de versículo.
- **Painel "A partir deste trecho / deste capítulo":** manchete de dados, mini grafo dos até 6 mais votados (a lista é o caminho acessível), a ligação mais forte em destaque com "Abrir conexão" e "Ver no Explorar". "Mais ligados" e o Explorar usam a mesma ordem (`site/src/lib/chapter-rank.ts`).
- **Barra de seleção:** Copiar (com a referência), Compartilhar, Salvar (só no aparelho) e Explorar. Fica acima das abas e da faixa da Ponte no celular.
- **Folha (celular):** diálogo com título, foco preso, Esc e "Fechar" visível; voltar fecha a folha. Opaca, em `overlay`, com texto em `ink`.
- **Arcos e céu:** escolher capítulo arrastando pela linha de base, pelo seletor livro → capítulo ou pelo teclado (← →, Enter). A seleção entra na URL.
- **URLs:** toda tela tem link próprio; endereços soltos (`/Isaías/9/6`, `/is 9:6`, `/isaias/9/6)`) levam à página canônica; o resto é a 404 em português.

### 6.1 Estados e faixas (do `xref.npz` e dos dados gerados)

- Ligações por versículo: mediana 15, p90 40, p99 81, máximo 212 (Is 9:6).
- **Vazio:** 799 versículos não têm ligação na base. O painel diz isso e oferece o capítulo e os vizinhos.
- **Muito cheio:** 107 versículos têm mais de 100 ligações: as 5 mais votadas com o texto, as 40 seguintes em linhas e o resto atrás de "Mostrar mais N".
- **Erro de rede:** "Não deu para carregar as ligações. Tentar de novo." O que já veio continua funcionando.
- **Dados reduzidos** (Save-Data): o céu não baixa sozinho; mostra a imagem e "Carregar o céu".

## 7. Movimento

- `dur-fast` (120ms) para hover e pressão, `dur-base` (220ms) para folha e busca abrindo, `dur-slow` (420ms) para o pulso da ligação acesa, o único momento orquestrado.
- Saída rápida: `ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`). Tudo começa visível; nada espera rolagem para aparecer.
- Com `prefers-reduced-motion`, nada se desloca; só a cor muda.

## 8. Qualidade mínima

- **Acessibilidade:** o contraste do §3, conferido por teste nos tokens e, na página pronta, por auditoria de cada texto contra o fundo de fato pintado, nos dois temas. Foco visível em tudo (anel `focus` de 2px com 2px de afastamento). Teclado completo: busca, folha (foco preso), mapa (setas entre medalhões). Toda visualização tem a lista equivalente em texto. Zoom de 200% e espaçamento de texto aumentado não cortam texto. `<html lang="pt-BR">`; foco no `h1` depois de navegar.
- **Toque:** alvos de 44×44 px nos controles; referência dentro do texto corrido é link inline (exceção do WCAG 2.5.8).
- **Performance:** JS por página ≤ 165 KiB gzip (`npm run budget`); a paleta de busca e as visões pesadas carregam na intenção. Páginas de livro e capítulo pré-renderizadas no build (`ensureStatic = "navigation"`).
- **Ícones:** o conjunto do sistema (`Icon` em `site/src/components/icons.tsx`): traço único, grade de 24px, traço 1,75 (2,1 no item atual), sempre com rótulo visível ou `aria-label`. Nada de emoji nem caractere no lugar de ícone.

## 9. Componentes

`Navigation` (trilho) e `TabBar` (estrutura), `SearchPalette` (busca), `Scripture` e `ChapterNav` (leitura), `ConnectionPanel` e `ConnectionRow` (ligações), `Medallion`, `ChapterSeal` e `ArcWindow` (atlas), `Button`, `Chip`, `Segmented` e `Toast` (ações), `List` e `Footer`. As classes estão em `site/src/styles/ds.css`; a página do design system mostra cada um com dados reais.

## 10. Recusas

| Recusa | Protege |
|---|---|
| Grade de cards iguais; card dentro de card | A2 |
| Número gigante com rótulo pequeno (hero metric) | A2 |
| Sobretítulo em caixa-alta acima de título; rótulo em caixa-alta | A2, A5 |
| Brilho, halo e borda luminosa na interface (brilho só dentro do canvas do céu) | A2 |
| Texto em gradiente, vidro ou desfoque decorativo, sombra dura deslocada, borda lateral colorida grossa | A2 |
| Citação bíblica solta num card, como "versículo do dia": toda citação aparece ligada ao dado que a conecta | A1 |
| Pergaminho como textura ou moldura, ornamentos, carrossel de depoimentos | A1 |
| Texto bíblico pequeno, cortado com reticências sem forma de abrir, ou com cor herdada de outra superfície | A5 |
| Fade-and-slide em cada seção, hover animado em todo card, parallax decorativo | A2, A4 |

## 11. Texto e imagens

- Português do Brasil, claro, de estudo, sem jargão e sem tom de pregação. Prefira o nome da coisa ("Ligações de Josué 1:2").
- Frases curtas, voz ativa. Botões com verbo que diz o que acontece: "Ler lado a lado", "Abrir Isaías 9:6", "Copiar". Confirmação no particípio: "Copiado", "Salvo neste aparelho".
- Referências por extenso no texto ("Isaías 9:6"); abreviação só em campo de busca e em exemplo ("Is 9:6").
- Números com separador de milhar (31.102) e a unidade junto: "212 ligações", "296 votos", "427 capítulos ligados".
- Nunca "maior do mundo", "versículo do dia" ou frase de efeito sem prova. Nada de emoji.
- Erro diz o que houve e o próximo passo.
- **Imagens:** quadros dos vídeos (com "Recriação" quando gerados), mapas e gravuras de domínio público com crédito, desenho em código a partir dos dados. Proibido: banco de imagens, rosto de criança (regra 8 do `CLAUDE.md`).
- **Medalhões:** 20 ilustrações geradas (8 grupos de livros, 9 tipos de lugar, pessoa, povo e evento), gravuras de objetos sem rostos, em WebP sobre o chão Noite (`site/public/medalhoes/`, procedência em `site/src/data/medalhoes.json`). Sempre marcadas como ilustração, com `alt` que descreve o objeto.

## 12. Autoverificação (antes de dizer "pronto")

Em 375 e 1440 px, nos temas Noite e Dia (regra 9 do `CLAUDE.md`):

1. Todo texto passa na auditoria de contraste contra o fundo pintado (regras do §3)?
2. A Escritura está em Literata de 19px ou mais, na coluna de leitura, sem nada atrás?
3. A busca abre pela barra (ou aba) e por Ctrl K, entende "Is 9:6" e "luz", e o Esc devolve o foco?
4. Trocar Sistema → Dia → Noite três vezes seguidas deixa algum texto com a cor do outro tema?
5. Tem sobretítulo, card em grade, número gigante, brilho fora do céu? (A1, A2)
6. Quem viu o vídeo reconhece o ouro, o céu e os arcos? (A3)
7. `npm run budget` dentro do teto; o detector do impeccable rodou nas telas mudadas.

## 13. v4 (19/10/2026, noite): o que mudou e por quê

- **Contraste:** a v3 pedia 4,5:1 em ground, surface e raised. O print do Alex (folha de Josué 1:2 no iPhone) mostrou texto escuro sobre a folha escura: estado misturado depois da troca de tema, por apelidos entre tokens. A v4 pede 7:1 para texto e Escritura em todas as superfícies (inclusive `overlay` e `highlight`), dá cada valor literal em cada tema e põe `data-theme` também no `<body>`.
- **Leitura:** Escritura de 17–18px passou a 19–21px com entrelinha 1,75 e coluna de 36rem; metadados de 13px passaram a 14px; rótulos sem caixa-alta.
- **Busca:** um campo só, na barra, que entende referência, livro, palavra e tema, com resultados agrupados; antes era um campo que só aceitava referência.
- **Tema:** a primeira visita segue o aparelho (antes, sempre Noite); o menu tem Sistema, Dia e Noite.
- **Estrutura:** trilho de seções no desktop e abas no celular (antes, links no cabeçalho e barra de quatro itens).
- **Tipografia:** três vozes (Newsreader Display, Literata, Space Grotesk); Cormorant e Space Mono saem da interface.
- **Tokens:** os nomes antigos (`--bg`, `--text`, `--gold`, `--hairline`, `--space-1` de 8px…) saíram; o código usa só os do `tokens.json`.

## 14. Pendências para o Alex

| # | Decisão | Proposta |
|---|---|---|
| 1 | Medalhões no tema Dia | Manter como moedas escuras com anel (alternativa: gerar versões claras) |
| 2 | Ponte: calendário público de pontes futuras (`public/data/ponte/calendar.json`) | Publicar só até o dia do build |
| 3 | Botão principal no Dia | Verde (`action-fill`), como nas referências; alternativa: bronze |
| 4 | Onde mora "Salvos" no celular | No menu de cada versículo e em `/salvos` (alternativa: sexta aba) |
