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

Matriz final: 16/16 casos Chromium/WebKit, os três tamanhos móveis acima e 1440 × 900, Dia/Noite. Expansão, rolagem única, último versículo, referência fixa, timeout e retorno, menu aberto, navegação para Mapa e limpeza ao sair de Arcos aprovados, sem erros JavaScript nem overflow horizontal. Três casos adicionais passaram: menu sem JavaScript, movimento reduzido e redução da altura da janela.

Revisão independente confirmou o primeiro toque sobre um versículo atrás do dock nos dois motores: `pointerdown`, `pointerup` e `click` atingem o versículo, e o menu recupera os eventos no frame seguinte. Cinco verificações de gesto/foco/menu por motor passaram. Parecer de performance verificou cleanup e um único timer mesmo após 10 mil movimentos, sem loop novo de animação. Contraste dos textos medidos no painel: mínimo 7,08:1 em Dia e 7,98:1 em Noite.

## Evidências e limites

Pasta externa: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261023/reading-space/`.

- `before.png`: reprodução anterior em WebKit, 375 × 650.
- `final/`: matriz de interface e parecer independente de performance.
- `independent-gesture/`: toque sobre conteúdo antes coberto pelo dock, foco e menus.
- `build-final.log`, `budget-final.log`: verificação da fonte final.

Os navegadores de teste são Chromium (GPU desabilitada para preservar a produção de vídeo) e WebKit emulado. Nenhum teste substitui Safari em iPhone físico, leitor de tela real ou medição de FPS/GPU. O palco ocupa mais pixels; não há alegação de ganho de FPS. A limitação anterior do céu em WebKit com movimento reduzido está registrada na evidência do PR #37 e não foi investigada nesta correção de layout.

**Prévia aprovada:** `dpl_4WY8YRLNXKUnVcjANoPApkCp4hZy`, READY, fonte `2013dde`. Oito casos adicionais passaram no endereço hospedado (375 × 650 e 1440 × 900, dois motores, dois temas), sem erros JavaScript. Ajustar o céu passou mais quatro verificações independentes em 320/375 px: controle de 44 px, hit-test correto e painel dentro da janela.

## Produção

PR #38 integrado como `0435dbc34905a7d0beac53508d187158ccdef820`. Deploy `dpl_51ysMakYJmSyUZvM1RJZCxMsEHbD` READY, com SHA e alias `www.bibliaconectada.company` confirmados. O código em `site/` é idêntico à fonte validada `2013dde`.

Cinco GETs públicos passaram: home, Arcos, Explorar/Isaías 9, Mapa e Cronologia retornam 200, com menu completo. JS inicial público gzip9: home 167.171 B, Arcos 168.726 B, Explorar 152.144 B, Mapa 160.552 B e Cronologia 160.070 B; todas as rotas ficam abaixo de 168.960 B. A margem de Arcos é 234 B; o módulo de navegação adiado é contabilizado separadamente. Relatório em `production/http-report.json`.

Matriz pública final: **8/8 casos passaram**, Chromium/WebKit × 375 × 650/1440 × 900 × Dia/Noite. Confirmados referência e 789 conexões, 195 px iniciais para o texto no telefone, painel ampliado de 588 px, recolhimento e retorno do menu, rolagem única, último versículo e compartilhamento, menu aberto e navegação para Mapa. Sem erros JavaScript ou overflow horizontal. Capturas e medidas em `production/`; relatório em `production/report.json`. O print `production/webkit-375x650-noite-expanded.png` mostra a leitura ampliada no domínio público. Revisões independentes de interface, interação e performance concluíram sem bloqueador desta entrega; permanecem os limites físicos e gráficos descritos acima.
