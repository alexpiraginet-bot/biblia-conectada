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
- Build Next.js e TypeScript, ESLint e `git diff --check` passaram. Ambiente local Node 24.19.0; logs da Vercel confirmam Node 22.x, escolhido pelo `engines` do pacote apesar da configuração geral do projeto em 24.x.
- `check-dist` do build final: 3.801 páginas pré-renderizadas e 404; 33.944 arquivos de texto sem as 38 citações protegidas; créditos e dados íntegros.
- Playwright: 11 casos aprovados. Chrome em 375×812, 1440×900, 320×568 e 812×375, Dia/Noite; WebKit em 375×812, Dia/Noite; menu sem JavaScript. Sem erros JavaScript, contagem acima da pílula, seleção/rolagem/filtros/zero e navegação conferidos.
- Cinco cenários adicionais passaram: carregamento/falha/retry sem anunciar zero; busca sobre o versículo e retorno de foco; toque externo; reinício da rolagem ao trocar seleção; primeiro toque anterior à hidratação.
- WebKit com eventos `tap()` chegou a Mapa de Jesus e Cronologia, fechando o menu. Corrigido um blur sem destino que antes fechava o painel antes do clique.
- Corrigidos também o espaço da seleção em celulares baixos e a sobreposição do botão de fechar no desktop. Revisões independentes de contagens, UI/UX e performance não encontraram bloqueios restantes.
- A revisão visual final detectou ausência de blur na pílula do Chromium: a saída CSS preservava apenas a propriedade prefixada, não suportada nesse navegador. A ordem foi corrigida para prefixada antes da propriedade padrão. O build final passou novamente pelos 11 casos de navegador; oito casos adicionais confirmaram `blur(20px) saturate(1.25)` efetivo em Chromium/WebKit, Dia/Noite e menu aberto/fechado. Capturas antes/depois comprovam a remoção da interferência do texto do rodapé nos rótulos.

## Custo e limites

JS inicial gzip nível 9: Arcos **168.363 B** (597 B abaixo do teto de 168.960 B), capa **166.832 B**, Explorar **151.799 B**. Motor adiado **13.253 B**, controles **679 B**, painel de seleção **3.329 B**; subtotal conhecido de Arcos com esses módulos **185.624 B**. HTML, dados, fontes, imagens e módulos de ações posteriores ficam fora desse subtotal. Mover `placeLabels` para o motor adiado preservou seu corpo e reduziu o inicial em 566 B; adiar não elimina o custo posterior.

Chrome foi executado sem GPU para preservar a produção de vídeo de outra sessão. WebKit no Windows é emulação, não comprovação em iPhone físico. Não foram medidos FPS, uso de GPU nem Lighthouse. Não houve chamadas pagas de IA, credenciais, alteração de tradução ou publicação em redes.

Artefatos externos: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261023/connections-menu/`. `local-final/report.json`, `local/touch-report.json`, `edge-local/report.json`, `nav-blur/after/report.json`, capturas Dia/Noite e logs de build, testes, orçamento e `check-dist` preservam as provas. A publicação e a conferência do domínio público serão registradas separadamente.

## Prévia e integração

PR #37: fonte final `e6f8a19269ef07f5bfda33b34d97eeee9bdf893a`. Prévia Vercel `dpl_3QWiXN2z6RnJdcZ37NFmN4Grutbp` READY, status do GitHub aprovado. Quatro fluxos autenticados passaram em Chrome/WebKit, Dia/Noite: total de 789, sete destinos no menu, toque em Mapa de Jesus e Cronologia, zero erros JavaScript. Relatório e oito capturas em `preview/`. Nenhum endereço de autenticação foi incluído no repositório.

## Produção

Integrado por squash em `a89dced53843a93bdc370d8a4c0aaadaff7fca01`. Deploy de produção `dpl_7NmKomEhSHpD4ikipkmeQN2MdQU2` READY, `target: production`, SHA e aliases conferidos. Consultar o próprio domínio `www.bibliaconectada.company` na Vercel devolveu esse mesmo deployment; apex redireciona para www e o host anterior permanece acessível.

Cinco GETs públicos (`/`, `/arcos`, `/explorar/isaias/9`, `/caminhos`, `/cronologia`) retornaram 200, menu completo e 826 conexões externas no capítulo de Isaías 9. Cache: um HIT e quatro PRERENDER. JS inicial gzip9 entregue em produção: capa **167.057 B**, Arcos **168.595 B**, Explorar **152.030 B**, Mapa de Jesus **160.438 B**, Cronologia **159.956 B**. Todos abaixo de 168.960 B; Arcos conserva 365 B de margem. Os valores públicos incluem as diferenças do build remoto e substituem os locais para avaliar a carga entregue. `production/http-report.json` registra a medição; módulos adiados não estão nessa soma.

Os mesmos 11 casos de navegador passaram no domínio público, assim como a navegação por `tap()` do WebKit para Mapa de Jesus e Cronologia e oito casos de blur efetivo. Totais 789/212/zero, filtro, rolagem, foco, menu completo, tamanhos de tela e dois temas conferidos; zero erros JavaScript. Relatórios em `production/report.json`, `production/touch-report.json` e `nav-blur/production/report.json`. O servidor local de QA foi encerrado. As limitações de iPhone físico e medição de GPU permanecem.

### Limite gráfico observado no WebKit emulado

O harness principal usa `reducedMotion: reduce`. Nesse contexto, a captura WebKit de 2 Coríntios 6 mostrou eixos/rótulos e a contagem, mas não os arcos, inclusive após esperar 1,5 s. Na triagem de 2 Coríntios 6 e Isaías 9:6, dados retornaram 200, sem requests/JavaScript com erro, contexto WebGL2 ativo, sem perda de contexto e sem erro GL. O mesmo capítulo em sessão nova com `no-preference` desenhou os arcos corretamente: `production/webkit-no-preference-chapter.png`, conferida visualmente.

Isso limita a aprovação gráfica: os testes aprovam contagens/navegação, não comprovam o quadro 3D com movimento reduzido. `engine.setLit`, `tick` e o renderer não mudaram no PR #37; não foi demonstrada regressão desta rodada nem falha em Safari/iPhone físico. O comportamento com movimento reduzido no WebKit emulado fica registrado para investigação separada. O print `final-chapter.png` não é prova de arcos visíveis.
