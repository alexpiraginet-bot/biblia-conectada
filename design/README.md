# Direção de design: Bíblia Conectada

Status: proposta pronta para virar código. Quem implementar deve rodar as skills (seção 9) antes de fechar os tokens.

## 1. Brief

- **Assunto:** as ligações da Bíblia. São 31.102 versículos e 344.799 referências cruzadas (301.584 pares únicos), mais lugares, pessoas, eventos e as profecias dos estudos.
- **Público:** gente que chega pelos Reels (celular, 4G, PT-BR), curiosos e estudantes. É mobile-first de verdade.
- **Trabalho principal:** abrir qualquer versículo e seguir as ligações dele. Do texto vai pro grafo, do grafo pro mapa, e volta.
- **A coisa memorável (uma só): o céu de ligações.** Os arcos do vídeo 1, vivos e tocáveis. Ao tocar um capítulo ou versículo, as ligações dele acendem em ouro e o resto apaga. Tudo em volta fica quieto e disciplinado.

## 2. Continuidade com os vídeos (tirado do código e dos vídeos)

| Elemento | Valor | De onde |
|---|---|---|
| Ouro (destaque, luz) | `#FFCC6B` | `GOLD = (1.0, 0.80, 0.42)` em `estudos/*/fx.py` e `film.py` |
| Creme das citações | `#FFE2AA` | `color=(255, 226, 170)` na citação de Is 9:6 (`biblia-referencias/film.py`) |
| Vitral dos arcos (curto → longo) | `#2980FF` `#2442FF` `#8C33FF` `#FF2966` `#FF801F` `#FFD15C` | `PAL_C` em `biblia-referencias/film.py` |
| Fundo dos arcos (vídeo 1) | `#010101` | mediana de quadros em 3 s e 50 s |
| Céu noturno (vídeo 2) | `#07172D` a `#1C283B` | mediana de quadros em 8 s e 62 s |
| Fontes | Space Grotesk, Space Mono, Cormorant (OFL) | `estudos/*/assets/fonts/` |

## 3. Tokens propostos (contraste WCAG calculado por código em 19/10)

**Noite** é o tema padrão (céu de Belém). **Dia** é o tema claro de leitura (céu de manhã, não "papel creme").

| Token | Noite | Dia | Uso | Contraste no fundo (`bg`) |
|---|---|---|---|---|
| `--bg` | `#060D1A` | `#EEF2F7` | página | |
| `--surface` | `#0C1A2E` | `#FFFFFF` | painéis, sheets | |
| `--raised` | `#15253D` | `#E2E8F1` | hover/selecionado | |
| `--text` | `#F2EBDD` | `#0E1733` | texto principal | 16,39 / 15,71 |
| `--text-2` | `#A9B4C8` | `#46526B` | secundário | 9,30 / 6,97 |
| `--gold` | `#FFCC6B` | `#8A5A00` | destaque, ligação ativa, foco | 13,05 / 5,27 |
| `--quote` | `#FFE2AA` | (usar `--text`) | citação bíblica em destaque | 15,47 |
| `--hairline` | `#2A3B57` | `#AEB9CA` | divisórias decorativas | 1,72 / 1,76 (só decoração) |

- **Bordas de controle** (input, botão) precisam de pelo menos 3:1 (WCAG 1.4.11). Crie um `--control-border` mais forte; `--hairline` não serve pra isso.
- **Arcos no fundo Noite:** todos ficam em 3:1 ou mais (de 3,05 a 13,45). O mais fraco é o `#2442FF`. Num arco isolado e fino, aumente o brilho/espessura em vez de depender só da cor.
- **Cor nunca sozinha:** o número de ligações ou de votos sempre aparece em texto ao lado da cor.

## 4. Tipografia

- **Cormorant:** texto bíblico e citações. No celular, 20–22 px, peso 500, `line-height` 1,6. Teste a leitura longa no aparelho. Se cansar, troque o corpo do texto por uma serifada de texto OFL (ex.: Literata ou Source Serif 4) e deixe a Cormorant só em títulos e citações.
- **Space Grotesk:** interface, navegação, rótulos. Números pequenos com `font-variant-numeric: tabular-nums`. Confira se a fonte tem `tnum`.
- **Space Mono:** só nos contadores grandes, como nos vídeos (344.799, 212…). Não use como fonte de rótulo pequeno.
- **Evitar:** caixa-alta em rótulos (exceto nomes no mapa, que é convenção cartográfica), sobrescrito decorativo acima de títulos, e destacar uma palavra só no título.

## 5. Layout

Desktop (≥ 1024 px): três colunas, com o texto no centro e as ligações à direita.
```
┌────────────────────────────────────────────────────────────────────────┐
│ Bíblia Conectada      [ Buscar versículo, lugar, pessoa   ⌘K ]   Ler Grafo Arcos Mapa │
├───────────────┬──────────────────────────────────────┬─────────────────┤
│ Livros        │ Isaías 9                             │ Ligações · 9:6  │
│  Gênesis      │                                      │ Lc 2:11    228  │
│  …            │ 6 Porque um menino nos nasceu…  212  │ Mt 1:23    …    │
│  Isaías ▾     │ 7 …                                  │ ── chegam aqui ──│
│   1 2 … 9 …   │                                      │ [grafo local]   │
└───────────────┴──────────────────────────────────────┴─────────────────┘
```
Celular (375 px): uma coluna. As ligações abrem num bottom sheet e a navegação fica embaixo (4 itens, ícone + rótulo).
```
┌───────────────────────────┐
│ Bíblia Conectada    Buscar │
├───────────────────────────┤
│ Isaías 9                   │
│ 6 Porque um menino…   212 ▸│  ← toque abre o sheet de ligações
│ 7 …                        │
├───────────────────────────┤
│  Ler   Grafo   Arcos  Mapa │
└───────────────────────────┘
```
- O texto fica alinhado à esquerda, com no máximo cerca de 70 caracteres por linha.
- Números ficam alinhados à direita na lista de ligações.
- Respeitar a safe area no celular. Usar `min-h-dvh`, nunca `100vh`. Nada de rolagem horizontal.

## 6. Interação

- **Ler:** tocar num versículo abre as ligações, ordenadas por votos. O número sempre aparece em texto.
- **Pré-visualização:** no desktop, hover + foco mostram o texto do versículo ligado sem sair da página. No celular, um toque abre o sheet.
- **Grafo:** capítulos são estrelas (1.189) e livros são constelações.
  - Pinça/scroll faz zoom e arrastar move.
  - Tocar seleciona e mostra as ligações. Duplo toque abre a nota.
  - Sempre tem uma alternativa em lista, para teclado e leitor de tela.
- **Arcos:** tocar ou passar sobre um capítulo acende os arcos dele.
  - Filtros: votos mínimos e "só AT↔NT".
  - O link do versículo escolhido entra na URL.
- **Mapa:** marcadores de lugar levam à nota do lugar (versículos, pessoas, eventos). As rotas dos estudos são uma camada.
- **Busca ⌘K:** entende "Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13", nomes de lugar e de pessoa, e texto livre. Mostra os recentes.
- **URLs:** toda tela tem link próprio e compartilhável. O voltar do navegador preserva a posição.

## 7. Movimento

- **Um momento orquestrado só:** na home, os arcos se desenham como no vídeo 1, em até cerca de 1,5 s. Com `prefers-reduced-motion`, aparecem prontos.
- **O resto responde a ação:**
  - Seleção acende ligações (cerca de 200 ms, ease-out).
  - A câmera do grafo e do mapa leva 300–400 ms.
  - O sheet sobe em 250 ms e desce mais rápido.
  - Toda animação pode ser interrompida.
- **Proibido:** fade-and-slide em cada seção, hover animado em todo card, parallax decorativo.

## 8. Qualidade mínima (checklist ui-ux-pro-max, prioridades 1–3)

- **Acessibilidade:**
  - Contraste AA (seção 3).
  - Foco visível (ouro, 2 px).
  - Navegação completa por teclado, skip link e títulos em ordem.
  - `aria-label` em botão só de ícone.
  - Alternativa textual para grafo, arcos e mapa.
- **Toque:** alvos de pelo menos 44×44 px com 8 px de espaço entre eles, feedback em menos de 100 ms e `touch-action: manipulation`.
- **Performance:**
  - Páginas de leitura com até cerca de 100 KB de JS (gzip).
  - Visões WebGL carregadas só quando abertas.
  - Imagens em AVIF/WebP com `width`/`height`, CLS < 0,1 e fontes com `font-display: swap`.
- **Ícones:** SVG de uma família só (ex.: Lucide), nada de emoji como ícone.

## 9. Skills e referências

- **Skills para usar no Claude Code:** comandos de instalação no `HANDOFF.md` §7. As fontes desses comandos são páginas de terceiros; confira o repo antes de instalar.
  - ui-ux-pro-max (versão completa, com o CLI de design system)
  - impeccable (`/audit`, `/polish`, `/critique`…)
  - taste (`design-taste-frontend`)
  - frontend-design
- **A skill taste recomenda Next.js + Framer Motion + Radix.** Este projeto propõe Astro (ver `HANDOFF.md` §5.4). O objetivo é ficar com pouco JS nas páginas de leitura.
- **Referências** (21st.dev e outras): ver `design/referencias.md`.
