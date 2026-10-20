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
| Céu e dados | `/arcos`, `/arcos/plano`, `/dados`, `/sobre` | Experience na escultura, Read no resto | `/arcos` é a escultura de luz em 3D, no palco inteiro e nos dois temas (§15); o céu 2D, em `/arcos/plano`, é uma janela emoldurada |
| Busca | paleta (Ctrl K, aba Buscar) e `/buscar` | Operate | Combobox padrão, resultados agrupados |

## 2. Continuidade com os vídeos

| Elemento | Valor | De onde |
|---|---|---|
| Ouro (luz) | `#FFCC6B` (`sky-gold`) | `GOLD = (1.0, 0.80, 0.42)` em `estudos/*/fx.py` e `film.py` |
| Vitral dos arcos (curto → longo) | `#2980FF` `#2442FF` `#8C33FF` `#FF2966` `#FF801F` `#FFD15C` | `PAL_C` em `biblia-referencias/film.py`; só dentro do canvas do céu e da escultura ("Cor pela distância", §15) |
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
- **Aceso (`accent-strong`, `lit`):** a ligação escolhida e o item selecionado. O mesmo matiz do acento, mais forte: ouro claro no Noite, bronze escuro no Dia (#683c00, no mínimo 7,07:1 nas superfícies do Dia).
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
- **Mapa (capa e Explorar):** o desenho sai de um resolvedor determinístico em unidades do próprio quadro (`site/src/lib/explore/atlas.ts`), que a página escala pela largura; abaixo de 760px vale a versão de celular. No centro o selo do capítulo (um traço no mostrador por capítulo ligado); em órbita os oito medalhões, com tamanho e tronco pela soma dos votos do grupo; até três capítulos mais votados por grupo, sem encostar uns nos outros (a lista abaixo do mapa nomeia todos); pontilhado entre capítulos desenhados que se ligam. Uma tecla de Tab no mapa (o capítulo escolhido); setas entre medalhões e capítulos.
- **Capa:** o mapa de Isaías 9. No centro o selo do capítulo, em órbita os oito medalhões dos grupos e os capítulos mais votados de cada grupo, com traços de ouro que engrossam com os votos. Ao lado, o painel "Conexão selecionada" (Isaías 9 ⇄ Lucas 2) e o botão "Ler lado a lado". No celular o mapa fica em cima e o painel espia por baixo. A busca grande fica logo abaixo do título.
- A página nunca rola de lado; o que é largo (barra de capítulos, chips, tabelas) rola dentro do próprio contêiner.

## 6. Interação

- **Busca:** a mesma em todo lugar (`site/src/components/search/`). Abre pelo campo da barra, por Ctrl K (⌘K no Mac) ou /, pela aba Buscar e pelo campo grande da capa; sem JavaScript, esses caminhos levam a `/buscar`. No celular ocupa a tela; no desktop é um diálogo de até 44rem.
  - Uma busca à vista: na capa e em `/buscar`, o campo da barra sai de cena enquanto o campo da própria página aparece, e volta quando ele passa para baixo da barra (`page-search.ts`). Ctrl K, / e a aba Buscar valem sempre.
  - Entende referência em qualquer forma ("Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13") e põe "Ir para Isaías 9:6" no topo; livro pelo começo do nome ("ezeq") ou pela abreviação; palavra e frase no texto da BLIVRE (sem acento e sem diferença de maiúscula); temas.
  - Resultados de texto: a referência, quantas ligações o versículo tem e o trecho em Literata 17px, com a palavra em `<mark>`. Os mais ligados primeiro; "Ver os N versículos" leva a `/buscar`.
  - Teclado: setas escolhem, Enter abre, Esc fecha e devolve o foco a quem abriu. `role="combobox"` sobre `role="listbox"` com `aria-selected`.
  - Vazio: exemplos para tocar e as últimas buscas do aparelho. Sem resultado: diz o que foi buscado e o próximo passo ("Não achei “João 22”: João tem 21 capítulos.").
  - **Índice de palavras** (gerado no build, `site/scripts/data/search-index.ts`): palavra é uma sequência de letras, sem acento e em minúsculas; todas as palavras ficam, sem lista de palavras vazias. Cada palavra aponta para os versículos em ordem de ligações (o mesmo número das páginas de leitura) e depois em ordem canônica. Várias palavras: todas precisam estar no versículo; frase entre aspas: as palavras em sequência. A palavra é exata ("luz" não acha "luzes").
  - `/buscar` mostra os versículos de 20 em 20 ("Mais resultados"), com `?q=` no endereço. De 75rem, ao lado, "Como buscar": as cinco regras (referência, livro, palavras, frase, tema), com um exemplo cada. Sem JavaScript a página não mostra resultados (o `?q=` só existe no pedido, e a página é estática); um aviso leva à leitura.
- **Ler:** escolher um versículo acende a contagem e abre as ligações, ordenadas por votos, com o número sempre em texto. Cada versículo é uma rota (`/isaias/9/6`) cujo painel vem pronto do servidor; o texto do capítulo fica no layout e não recarrega ao trocar de versículo.
- **Painel "A partir deste trecho / deste capítulo":** manchete de dados, mini grafo dos até 6 mais votados (a lista é o caminho acessível), a ligação mais forte em destaque com "Ler lado a lado" e "Ver no Explorar". No celular o painel do capítulo fica depois do texto e espia por baixo ("Ligações de Isaías 9", com quantos capítulos estão ligados) até ser alcançado; some enquanto há um trecho selecionado. "Mais ligados" e o Explorar usam a mesma ordem (`site/src/lib/chapter-rank.ts`).
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
- **Revisão final (20/10):** a revisão independente do site pronto pediu oito correções, todas feitas:
  - no celular, o mapa da capa ficou na escala do desenho (1 unidade = 1px: moedas de 44 a 50px, nomes de 14px), e os oito medalhões e o traço aceso cabem acima do painel que espia;
  - uma busca à vista (ver §6);
  - o capítulo no celular ganhou o painel que espia, com as ligações do capítulo;
  - "anterior e seguinte" virou uma linha entre filetes (antes, duas caixas), no capítulo, no livro e no evento; e, no Noite, a janela do mapa e dos arcos se abre no próprio painel, sem moldura (nada de caixa dentro de caixa);
  - o aceso do Dia deixou o vinho e virou bronze escuro, como pede o contrato ("ouro e bronze para números e ligações acesas");
  - a opção escolhida (busca, Mesa) ganhou contorno inteiro, sem faixa num lado só;
  - os separadores da trilha de navegação e a seta da Ponte são o ícone desenhado, não "›" e "→" digitados;
  - na capa, os títulos de seção passaram ao degrau `title`, e de 75rem os versículos mais ligados vêm em duas colunas; `/buscar` ganhou "Como buscar" ao lado.
  - Junto: o selo do capítulo escreve o livro como no texto ("Isaías", não "ISAÍAS"), igual ao da capa; e o nome acessível dos medalhões do mapa começa pelo que eles mostram (nome e votos), para comando de voz.

## 14. Pendências para o Alex

| # | Decisão | Como está |
|---|---|---|
| 1 | Medalhões no tema Dia | Moedas escuras com anel (alternativa: gerar versões claras) |
| 2 | Ponte: calendário público de pontes futuras (`public/data/ponte/calendar.json`) | Proposta: publicar só até o dia do build |
| 3 | Botão principal no Dia | Verde (`action-fill`), como nas referências; alternativa: bronze |
| 4 | Linha do tempo: os 10 períodos | Nomes e limites são convenção do site, ditos na página; "Ministério de Jesus" inclui a Paixão e a ressurreição, e Daniel cai em "Reino dividido". Revisar |
| 5 | Linha do tempo: título dos eventos | Em inglês, do Theographic, marcado `lang="en"` (traduzir à mão não é permitido); alternativa: as primeiras palavras do texto da BLIVRE |
| 6 | Busca: palavra exata | "luz" não acha "luzes"; alternativa: famílias de palavras. Toda palavra está no índice ("e" sozinho: 24.589 versículos) |
| 7 | Capa: tamanho do título | `display` (56px) em vez de `display-xl`, para título, mapa e botão principal caberem na primeira tela de 1440px |
| 8 | Mapa: quantos capítulos desenhar | Até 3 por grupo (cerca de 19 de 24 desenhados; a lista nomeia todos); no celular, os 8 medalhões |
| 9 | Escultura em `/arcos` (§15) | No palco inteiro, nos dois temas; o céu 2D foi para `/arcos/plano`, emoldurado. Abrir em Isaías 9:6 aceso (como o céu 2D abria) ou na Bíblia inteira (como está)? |
| 10 | `/dados`, 404, comunidade | "Baixar tudo" como botão principal de `/dados`; "Buscar" como primeiro caminho da 404; "Outros caminhos" entre Trilha, Ponte e Mesa |
| 11 | Mapa da leitura | Azul-marinho nos dois temas (os medalhões no próprio chão) |
| 12 | Escultura no tema Dia (§15.2) | Gravura em tinta no pergaminho, no palco inteiro (exceção à regra do céu noturno do `DESIGN.md`); alternativa: céu noturno também no Dia |

## 15. Escultura de luz (`/arcos`, 20/10/2026)

**Pedido do Alex (20/10):** a página "Conexões da Bíblia em 3D" do porqueelevive.com (aberta em Isaías 53:5) como conceito: "fazer igual e melhor". A referência foi estudada só de leitura, e o código dela não tem licença declarada. As técnicas foram descritas com palavras próprias, e a escultura daqui é código novo, sem biblioteca 3D. O céu em 2D continua em `/arcos/plano`, com link na legenda.

### 15.1 Forma

- Cada um dos 301.539 pares de versículos da OpenBible.info é um fio de luz: meia elipse sobre o eixo da Bíblia, de Gênesis (à esquerda) a Apocalipse.
  - Os capítulos têm largura igual, e o versículo fica no ponto proporcional dentro do capítulo. É a mesma geometria do céu 2D (`sky/model.ts`).
- A altura do fio é 0,62 × a metade da distância (`FLAT`, em `space.ts`).
- O plano de cada fio gira em torno do eixo conforme a relação (`arcAngle`):
  - as 67.293 pontes entre os Testamentos sobem, em leque;
  - as 163.383 ligações dentro do Antigo pendem para trás e para baixo;
  - as 70.863 dentro do Novo pendem para a frente e para baixo.
- O plano gira um pouco ao longo do eixo (`TWIST`), e cada par tem um desvio fixo (`pairJitter`), igual em toda carga.
- O resultado: a cúpula das pontes por cima, a saia âmbar do Antigo atrás e os laços azulados do Novo na frente. A estrutura dos Testamentos se lê de relance.

### 15.2 Luz e cor

| Tema | Chão do palco | Fios: Antigo / Novo / pontes | Aceso |
|---|---|---|---|
| Noite | o `ground` do tema (`#06121B`) | âmbar, azul névoa, creme; luz somada | ouro do vídeo (`sky-gold`); o fio em foco quase branco |
| Dia | o `ground` do tema (`#F6F1E6`) | bronze, azul fundo, grafite; a luz vira tinta, como numa gravura | bronze escuro, o `lit` do Dia (`#683C00`); o fio em foco sépia quase preto |

- No Dia, cada cor de luz é escrita como o complemento da tinta que se quer (o canal que a luz tem absorve): a luz [0,59; 0,76; 1] dá o bronze `#683C00`.
- O canvas, o pôster e o palco usam o mesmo chão (`GROUND` em `renderer.ts`, conferido contra `tokens.json` em `tests/sculpture-poster.test.ts`): não há emenda entre eles.
- **Cor pela distância** (botão na legenda): o vitral do vídeo 1 (§2), azul nas ligações curtas e ouro nas longas.
- **Exposição:**
  - a densidade dos fios é somada num alvo de ponto flutuante e passa por uma curva logarítmica;
  - os 14.248 pares com 25 votos ou mais (`HERO_VOTES`) têm camada própria e ficam nítidos por cima da névoa;
  - o brilho (bloom) existe só dentro do canvas, em duas escalas.
- **Com algo aceso:** a escultura recua (escurece) e só os fios da seleção brilham. Eles crescem a partir do versículo (1,1 s), e um pulso de luz corre deles até os parceiros (1,3 s), uma vez.
- **Nada se mexe sozinho:** o canvas só desenha quando a câmera, a seleção ou o tamanho mudam (o único momento orquestrado continua sendo o aceso, §1.1).

### 15.3 Calibração da exposição (para quem mexer no `renderer.ts`)

- `P99_HOME = 340` e `H99_HOME = 38` são o percentil 99,5 da densidade na vista de abertura: o primeiro com todos os fios, o segundo só com os de 25 votos ou mais.
  - Foram medidos com `engine.measure(0.995, "all")` e `measure(0.995, "hero")`, no arquivo completo, numa janela de 1440 × 900: câmera a 2,41 e quadro de 836 px de altura (`EXPOSURE_REF`, em `space.ts`).
  - São constantes de desenho, não números da página.
- `exposureZoom` compensa o tamanho do quadro e a distância da câmera, para a luz não mudar quando a janela ou o zoom mudam.
- Meça de novo depois de mexer na forma (`FLAT`, `TWIST`, `arcAngle`), nos pesos (`arcWeight`) ou na regra dos fios nítidos:
  1. abra `/arcos` com `window.__SCULPTURE_ALLOW_SOFTWARE__ = true` definido antes da carga (os scripts de teste fazem isso; também libera o desenho em software);
  2. espere o arquivo completo;
  3. chame `window.__sculpture.measure()`.

### 15.4 Câmera e enquadramento

- **Órbita:** guinada, inclinação, distância e alvo, mais o quadro da tela onde a imagem é desenhada.
- **O quadro e o deslocamento da lente:** o quadro é desenhado por deslocamento da lente (`viewMatrix`, em `space.ts`). Assim a escultura ocupa a área livre sem girar a câmera:
  - no desktop, à direita da introdução (a coluna dela termina 24 px antes da área, então a luz nunca passa por baixo do texto);
  - no celular, uma faixa abaixo do campo de busca, da altura da escultura na largura do aparelho; a introdução fica abaixo dela, com rolagem própria, e nunca cobre a escultura;
  - com seleção, ao lado do painel ou acima da folha.
- **Abertura:** `HOME_ORBIT` é calculada uma vez (`fitOrbit` sobre o contorno da escultura, num quadro de aspecto 1,4, o da escultura vista dessa posição) e é a mesma no pôster.
  - `homeArea` dá a área livre, com a mesma conta no TypeScript e no CSS (`sculpture.module.css`, em unidades do contêiner). Por isso o pôster e o primeiro quadro vivo coincidem.
- **Enquadrar:** `fitOrbit` centra a imagem projetada, não a caixa 3D (a perspectiva e o giro deslocam uma da outra), e aproxima a câmera até a imagem encostar na margem de 3%. Vale para a abertura e para cada seleção.
- **Voo até a seleção:** 1,15 s, com entrada e saída suaves. O enquadramento cobre o versículo e todos os fios acesos.
- **Gestos:**
  - arrastar gira;
  - roda ou pinça aproxima;
  - a inércia para sozinha.
- **Redimensionar:** sem seleção e sem a câmera mexida à mão, a escultura volta ao enquadramento da Bíblia inteira.

### 15.5 Interação

- **Endereço:** "#isaias/53/5" abre um versículo e "#isaias/53" um capítulo.
  - A troca é por `replaceState`, então não cria histórico; a trilha na página é o caminho de volta.
  - O endereço sobrevive ao recarregar e pode ser compartilhado.
- **Abrir:**
  - pelo campo ("Is 53:5", "Jo 3", com o parser do site e erros que dizem o que falta);
  - pelos exemplos;
  - por "Um versículo ao acaso" (uma ponta de um dos 2.000 fios mais votados);
  - clicando na linha do meio, que abre o capítulo sob o ponteiro.
- **Prévia:** passar o mouse na linha acende as 80 ligações mais fortes do capítulo e mostra "Isaías 53 · N ligações · clique para abrir". A dica acompanha o que está sob o ponteiro também quando a câmera se move por baixo dele (voo, inércia, roda): o clique abre sempre o capítulo que ela mostra.
- **Versículo aberto:**
  - o painel (folha no celular) tem o texto da BLIVRE, "Ler Isaías 53" e "Copiar link";
  - os filtros Todas, Antigo e Novo (o filtro apaga os outros fios e reenquadra);
  - a lista completa, das mais votadas às menos, 20 por vez, com votos e trecho;
  - e "Ver as ligações de Isaías 53 inteiro".
- **Fios e rótulos:**
  - passar o mouse num fio aceso mostra os dois versículos e os votos (a dica abre do outro lado do ponteiro quando não cabe no quadro, nunca por baixo do painel);
  - clicar num fio, num rótulo ou num item da lista põe a ligação em foco e abre o cartão "Seguir para…", "Ler lado a lado" e "Abrir…".
  - Os rótulos ficam presos ao eixo e empilham (embaixo, em cima, mais embaixo, mais em cima) antes de sumir, sempre dentro do quadro e nunca atrás do painel.
- **Capítulo aberto:** os versículos do capítulo, ordenados por número de ligações, com o texto, e o capítulo anterior e o seguinte (`bc-pager`, como na leitura). No celular, o toque no eixo cai perto (são 1.189 capítulos numa linha), e o anterior e o seguinte acertam.
- **Teclado no canvas:**
  - sem seleção, as setas andam pelos capítulos (Shift: pelos livros) e Enter abre;
  - com um versículo aberto, as setas andam pelas ligações dele e Enter segue a ligação em foco;
  - setas para cima e para baixo aproximam;
  - Esc fecha o foco, depois a seleção.
  - Abrir algo leva o foco ao título do painel (um `h2`; o `h1` "Céu de ligações" continua na página, oculto à vista, enquanto a introdução sai), e uma região `aria-live` diz o que está aceso ("Isaías 53:5: 37 ligações.").
- **Folha do celular:** tem meia altura e cheia, com alça e "Fechar" fixos no topo.

### 15.6 Carga e desempenho

- **Ordem de carga:**
  1. a primeira pintura é o pôster (§15.7);
  2. depois vêm, juntos, o motor WebGL (`engine.ts`, `renderer.ts` e `shaders.ts`, 9,2 KB gzip, fora do orçamento de JS da página) e o `sky.json`; em seguida, os 20.000 pares mais votados (`sky-head.bin`);
  3. no desktop, todos os 301.539 (`arcs.bin`).
  - Aparelhos de toque, janela estreita e Save-Data ficam nos 20.000 e oferecem "Mostrar as 301.539 ligações".
  - Sem o arquivo completo, as ligações de um versículo vêm do arquivo do capítulo (`verse-links`), com a lista completa do mesmo jeito.
- **Desenho:**
  - os fios são instanciados, com segmentos pelo tamanho na tela;
  - enquanto a câmera se mexe, o quadro usa menos segmentos, menor resolução e só os fios mais votados (100.000; 30.000 nos aparelhos leves);
  - o quadro seguinte, parado, desenha tudo;
  - as camadas da escultura são reaproveitadas quando só o aceso muda.
- **Sem WebGL2, sem render em ponto flutuante ou com WebGL desenhado pela CPU** (SwiftShader, llvmpipe): o pôster fica.
  - A busca, o painel e a lista funcionam do mesmo jeito, com o aviso e o link para o céu em 2D.
- **Erro de rede:** se `sky.json` ou os 20.000 pares não chegam, o pôster fica e a introdução diz "Não deu para carregar as ligações." com "Tentar de novo". Se só o arquivo completo falha, os 20.000 continuam e a introdução oferece o resto de novo.

### 15.7 Pôster

- Imagens da vista de abertura feitas com o próprio renderizador, a partir dos dados reais: `site/public/sculpture/{noite,dia}-{854,2002}.{avif,webp}`, por `site/scripts/render-sculpture-poster.mjs`.
- Ficam no git e não são refeitas no build. Refaça quando mudarem os dados, a forma, a luz ou a câmera de abertura.
- O do celular (854 px) tem os 20.000 pares mais votados, que é o que o celular desenha; o de 48rem para cima (2002 px) tem todos.
- O quadro da escultura ocupa os 90% do meio de cada imagem (`box` em `poster.ts`): a borda leva o brilho além do quadro, como o canvas faz, e some antes da beira da imagem. Assim não aparece emenda entre o pôster e o chão.
- O pôster ocupa a mesma área que o primeiro quadro vivo (`homeArea`) e fica por cima do canvas até o canvas desenhar o mesmo tanto de fios, ou até a pessoa mexer na escultura (ponteiro na linha, arraste, roda, teclado ou uma seleção). Aí some em 420 ms (`dur-slow`).
- Só a imagem do tema e do tamanho em uso é baixada (fundo CSS com `image-set`, AVIF e WebP). O pôster do celular é pedido junto com o documento (`<link rel="preload">` com `media` pela largura e pelo tema do aparelho), porque é o maior elemento da primeira pintura; quem escolheu à mão um tema diferente do aparelho recebe a imagem certa pelo CSS.
- Sem canvas vivo, o pôster fica, com os nomes do eixo no lugar; com uma seleção aberta, fica esmaecido atrás do painel.

### 15.8 O que ficou melhor que a referência (medido no estudo)

| Referência | Aqui |
|---|---|
| Desenha 11.199 fios de capítulo (pares com uma ligação de 20 votos ou mais) e lista até 25 ligações de saída por versículo, com 5 votos ou mais: Isaías 53:5 mostra 19 | Os 301.539 pares de versículos, nas duas direções; Isaías 53:5 lista as 37 ligações, com votos |
| Texto de um rascunho sem crédito na página 3D | BLIVRE sem alteração, com crédito no painel |
| Sem WebGL, a página fica presa no "carregando" | Pôster e lista funcionam sem 3D; aviso com o caminho para o 2D |
| Redesenha a cena inteira com brilho a cada quadro e gira sozinha | Nada se desenha parado; nada gira sozinho |
| Com seleção aberta, as setas não fazem nada; botões invisíveis no Tab | Setas andam pelas ligações; foco no título do painel; anúncio curto |
| 4 dos 7 rótulos escondidos por colisão em Isaías 53:5 | Rótulos empilham antes de sumir e respeitam o filtro |
| Trilha de um passo só; histórico que apaga o plano geral | Trilha visível dos últimos 12 versículos, com volta direta |
| Só tema escuro | Noite (luz) e Dia (gravura em tinta) |

### 15.9 Não verificado

- Desempenho em GPU de verdade (desktop, celular médio e fraco): este ambiente só tem SwiftShader.
- Safari/iOS e Firefox, pinça no toque real, leitor de tela (a ordem de foco e o ARIA foram conferidos no DOM).
