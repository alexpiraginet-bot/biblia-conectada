# Arcos: espaço de leitura e navegação em repouso

Fonte: `2013dde3df70b298c7e136c4b16238411033bddf`, PR #38.

## Problema e mudança

Em 375 × 650, o painel anterior tinha 233 px, duas rolagens e um cabeçalho fixo de 95 px além da alça de 48 px. O texto começava abaixo do limite visível. O rodapé começava em y=562, dentro da tela, embora ainda faltasse espaço para ler.

Agora o palco móvel termina no limite da janela (`dvh`), com créditos no fluxo abaixo. O painel abre com 56% do palco, tem uma única rolagem, referência/contagem compactas e um botão explícito **Ampliar leitura / Voltar ao céu**. A contagem completa não depende da amostra desenhada. Os ajustes da amostra ficam em **Ajustar o céu**, acessíveis também em capítulos longos.

O dock móvel de `/arcos` se recolhe após 1.500 ms sem interação. Toque, movimento, rolagem e teclado o revelam; menu aberto, gesto pressionado e foco de teclado impedem o recolhimento. O primeiro gesto que o revela continua atingindo o controle de leitura atrás dele. O dock não altera a geometria do texto, e as outras rotas mantêm a navegação visível. Sem JavaScript, ele permanece disponível.

## Medições locais

| Janela | Texto visível inicial com dock recolhido | Altura do painel ampliado |
| --- | ---: | ---: |
| 320 × 568 | 149 px | 506 px |
| 375 × 650 | 195 px | 588 px |
| 375 × 812 | 286 px | 750 px |

Em 375 × 650, o painel passou de 233 para 334 px; cabeçalho de referência/contagem de 95 para 59 px. O botão de expansão ocupa 44 px. A medição de texto vai do início do primeiro versículo ao limite inferior do painel; não é uma estimativa de linhas por fonte.

Build local, TypeScript, 806 testes em 58 arquivos, ESLint e check-dist aprovados. Orçamento inicial gzip9: Arcos 168.491 B, home 166.944 B, Explorar/Isaías9 151.911 B; teto 168.960 B. O módulo de navegação adiado adiciona 536 B (Arcos + esse módulo: 169.027 B; demais módulos adiados são contabilizados separadamente). Node 24.19 local; Vercel usa Node 22 pelo `engines` do projeto.

Matriz final: 16/16 casos Chromium/WebKit, quatro tamanhos acima, Dia/Noite. Expansão, rolagem única, último versículo, referência fixa, timeout e retorno, menu aberto, navegação para Mapa e limpeza ao sair de Arcos aprovados, sem erros JavaScript nem overflow horizontal. Três casos adicionais passaram: menu sem JavaScript, movimento reduzido e redução da altura da janela.

Revisão independente confirmou o primeiro toque sobre um versículo atrás do dock nos dois motores: `pointerdown`, `pointerup` e `click` atingem o versículo, e o menu recupera os eventos no frame seguinte. Cinco verificações de gesto/foco/menu por motor passaram. Parecer de performance verificou cleanup e um único timer mesmo após 10 mil movimentos, sem loop novo de animação. Contraste dos textos medidos no painel: mínimo 7,08:1 em Dia e 7,98:1 em Noite.

## Evidências e limites

Pasta externa: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261023/reading-space/`.

- `before.png`: reprodução anterior em WebKit, 375 × 650.
- `final/`: matriz de interface e parecer independente de performance.
- `independent-gesture/`: toque sobre conteúdo antes coberto pelo dock, foco e menus.
- `build-final.log`, `budget-final.log`: verificação da fonte final.

Os navegadores de teste são Chromium (GPU desabilitada para preservar a produção de vídeo) e WebKit emulado. Nenhum teste substitui Safari em iPhone físico, leitor de tela real ou medição de FPS/GPU. O palco ocupa mais pixels; não há alegação de ganho de FPS. A limitação anterior do céu em WebKit com movimento reduzido está registrada na evidência do PR #37 e não foi investigada nesta correção de layout.

**Prévia aprovada:** `dpl_4WY8YRLNXKUnVcjANoPApkCp4hZy`, READY, fonte `2013dde`. Oito casos adicionais passaram no endereço hospedado (375 × 650 e 1440 × 900, dois motores, dois temas), sem erros JavaScript. Ajustar o céu passou mais quatro verificações independentes em 320/375 px: controle de 44 px, hit-test correto e painel dentro da janela. Produção será conferida após a integração do PR.
