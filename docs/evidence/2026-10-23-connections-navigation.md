# Contagens e navegação completa — 23/10/2026

## Pedido e resultado

Alex não encontrava o número de conexões em Arcos, nem Mapa de Jesus e Cronologia na navegação móvel. A seleção agora apresenta a contagem antes do texto e a mantém visível ao rolar a folha. A pílula conserva quatro destinos frequentes e abre um Menu completo, com Mapa de Jesus e Cronologia em primeiro lugar. Os mesmos nomes aparecem na navegação de desktop.

Uma conexão é um par distinto de versículos, com qualquer quantidade de votos. Em Arcos, pares internos ao capítulo contam uma vez; o total não depende dos fios da amostra desenhada. Em Explorar, o texto informa explicitamente que são pares com outros capítulos. A edição e as fontes existentes foram preservadas.

| Caso conferido | Total |
| --- | ---: |
| 2 Coríntios 6 | 789 |
| Isaías 9, incluindo 4 ligações internas | 830 |
| Isaías 9 em Explorar, apenas outros capítulos | 826 |
| Isaías 9:6 | 212 |
| Gênesis 2:6 | 0 |

O total do capítulo usa `sky.json`, já carregado. O detalhamento por versículo busca o arquivo completo apenas quando aberto. Carregamento, falha e zero têm estados distintos; falha oferece nova tentativa. Filtros não substituem o total da base por uma amostra.

## Validação local

- Dados regenerados; 806 testes em 58 arquivos passaram. A nova recontagem compara todos os 1.189 capítulos e 31.102 versículos com os 301.539 pares distintos do binário completo.
- Build Next.js e TypeScript, ESLint e `git diff --check` passaram. Ambiente local Node 24.19.0; a compilação na Vercel com Node 22 será conferida no deploy.
- `check-dist`: 3.801 páginas pré-renderizadas e 404; 33.937 arquivos de texto sem as 38 citações protegidas; créditos e dados íntegros.
- Playwright: 11 casos aprovados. Chrome em 375×812, 1440×900, 320×568 e 812×375, Dia/Noite; WebKit em 375×812, Dia/Noite; menu sem JavaScript. Sem erros JavaScript, contagem acima da pílula, seleção/rolagem/filtros/zero e navegação conferidos.
- Cinco cenários adicionais passaram: carregamento/falha/retry sem anunciar zero; busca sobre o versículo e retorno de foco; toque externo; reinício da rolagem ao trocar seleção; primeiro toque anterior à hidratação.
- WebKit com eventos `tap()` chegou a Mapa de Jesus e Cronologia, fechando o menu. Corrigido um blur sem destino que antes fechava o painel antes do clique.
- Corrigidos também o espaço da seleção em celulares baixos e a sobreposição do botão de fechar no desktop. Revisões independentes de contagens, UI/UX e performance não encontraram bloqueios restantes.
- A revisão visual final detectou ausência de blur na pílula do Chromium: a saída CSS preservava apenas a propriedade prefixada, não suportada nesse navegador. A ordem foi corrigida para prefixada antes da propriedade padrão; o build final deve preservar ambas e o estilo calculado é conferido nos navegadores.

## Custo e limites

JS inicial gzip nível 9: Arcos **168.363 B** (597 B abaixo do teto de 168.960 B), capa **166.832 B**, Explorar **151.799 B**. Motor adiado **13.253 B**, controles **679 B**, painel de seleção **3.329 B**; subtotal conhecido de Arcos com esses módulos **185.624 B**. HTML, dados, fontes, imagens e módulos de ações posteriores ficam fora desse subtotal. Mover `placeLabels` para o motor adiado preservou seu corpo e reduziu o inicial em 566 B; adiar não elimina o custo posterior.

Chrome foi executado sem GPU para preservar a produção de vídeo de outra sessão. WebKit no Windows é emulação, não comprovação em iPhone físico. Não foram medidos FPS, uso de GPU nem Lighthouse. Não houve chamadas pagas de IA, credenciais, alteração de tradução ou publicação em redes.

Artefatos externos: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261023/connections-menu/`. `local/report.json`, `local/touch-report.json`, `edge-local/report.json`, capturas Dia/Noite e logs de build, testes, orçamento e `check-dist` preservam as provas. A publicação e a conferência do domínio público serão registradas separadamente.
