# Sua história também se conecta — integração do motion enviado

## Escopo e decisão

Alex enviou `Biblia_Conectada_Editavel.zip` e pediu descobrir como usá-lo no site. O pacote contém a composição editável, não o MP4 descrito em um relatório antigo. A integração usa o movimento original digital → portal → rede como entrada editorial para `/coracao`, com caminhos secundários para `/ler` e `/arcos`.

Detalhes de produto em [LIVING-STORY.md](../LIVING-STORY.md). Reprodução, hashes, preservação e limites da arte em [design/living-story](../../design/living-story/README.md). Não houve chamada paga, alteração de credenciais, publicação social ou mudança nos estudos da sessão de vídeo.

## Validação durante a implementação

- Vinte testes focados de ciclo de vida passaram: visibilidade, autoplay recusado, gesto explícito, pausa, fim, preferências, carregamento, retry, seek, descarte e retorno pelo Next Activity.
- Oito cenários em servidor de desenvolvimento passaram: Chromium e WebKit, larguras 375/1440, Dia/Noite. Vídeo real, três estágios, pausa/retomada, fim, volta do Coração, links, botões de pelo menos 44 px, ausência de overflow e de erros de JavaScript.
- Revisão independente: seis casos adicionais de movimento reduzido, Save-Data, ausência de JavaScript, falha 404, recusa de autoplay e texto ampliado/teclado. Os botões receberam quebra de palavra para o aumento de 200%; reteste no build passou, com `scrollWidth = clientWidth = 101 px` nas três etapas e Enter/Espaço/Tab operantes.
- Renderização preservou toda a geometria: 360 quadros a 30 fps, 12 s, 720 × 1080, H.264 sem áudio. Recorte removeu somente preto; decodificação integral sem erros e faststart conferido.
- Vídeo 2.540.919 B; pôster 159.986 B. Three.js/GSAP/editor não integram o frontend; controlador próprio adiado e exclusivo da home. O pôster chega antes do vídeo; o MP4 só é solicitado para reprodução/seleção.

Evidências locais: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261025/`, subpastas `dev-final`, `local-production`, `extra-qa` e `living-story-render`. Scripts e metadados de reprodução do asset também foram versionados.

## Build e revisão final

Fonte `76a0567faf970c2340d9ec7ed4b1d3a4c7d2007e`, PR #39. Build completo, 826 testes em 59 arquivos, TypeScript, ESLint e orçamento passaram. `check-dist` conferiu 3.803 páginas pré-renderizadas e a 404, números e créditos, texto integral Open NBV e ausência das citações protegidas nos 33.796 arquivos entregues. O primeiro build detectou que a nova pasta pública precisava constar nos segmentos reservados; registro corrigido antes da rodada aprovada.

| Custo medido localmente | Bytes |
| --- | ---: |
| JS inicial home, gzip9 | 167.262 |
| JS inicial Arcos, gzip9 | 168.491 |
| Limite inicial por página, gzip9 | 168.960 |
| Controlador da animação adiado, gzip9 | 1.286 |
| Vídeo, separado do JS | 2.540.919 |
| Pôster, separado do JS | 159.986 |

Oito cenários também passaram no **build de produção local**, Chromium/WebKit, 375/1440, Dia/Noite, sem erros. Foram conferidas capturas da janela inteira para evitar que capturas longas de elementos incluam o cabeçalho fixo sobre a seção. Não houve transbordamento horizontal; controles de 44 px e links principais de 52 px. Revisão independente de UI: contraste sRGB da nota/legenda 10,83:1, CTA 10,94:1, corpo 12,74:1, botão de reprodução 16,89:1; sem bloqueador restante. O status de carregamento reserva espaço para evitar deslocar o conteúdo.

## Diagnósticos e limites

O primeiro harness desktop rolava para o topo mas deixava parte da arte visível, então esperava pausa no momento errado. Foi corrigido para sair integralmente da viewport. WebKit exigiu aguardar o evento de fim/atualização do controle, além da propriedade `ended`. Uma execução extra usou `127.0.0.1`, origem bloqueada pelo servidor Next em desenvolvimento; a repetição em `localhost` passou, sem mudar a configuração do produto.

Prévia `dpl_CdY1nH2kj1HkHC1vXzsz4xVFqgZZ` READY, fonte `76a0567`. Os quatro cenários Chrome hospedados passaram. Os quatro WebKit falharam na reprodução de mídia da prévia protegida. A investigação independente confirmou o limite do WebKit Windows/Windows Media Foundation: o navegador possuía o cookie, mas o pedido nativo NSPlayer saiu sem cookie. Um servidor local exigindo cookie reproduziu o erro 4; o mesmo MP4 com 200/206 sem proteção reproduziu normalmente. O arquivo remoto foi comparado por SHA-256 ao local e é idêntico. Não foi criado workaround no produto; a confirmação final deve ocorrer no domínio público. Evidências em `extra-qa/PREVIEW-WEBKIT-DIAGNOSTIC.md` e nos três JSONs de isolamento. O link temporário criado para essa QA foi revogado ao terminar.

## Produção publicada e conferida

PR [#39](https://github.com/alexpiraginet-bot/biblia-conectada/pull/39) integrado por squash `9ec27c634e54e2ac4175cd528aca74959b4b86a5`. Vercel `dpl_8dKX7QCChUBnNSt6oNf3pHcdhoTg` READY, target Production, com esse SHA confirmado também pela consulta do alias `www.bibliaconectada.company`. Seção pública: <https://www.bibliaconectada.company/#sua-historia>.

- **Oito de oito cenários públicos passaram**, Chromium e WebKit, 375/1440, Dia/Noite. Reprodução real, pausa, etapas, fim/replay, suspensão fora da tela, navegação ao Coração e retorno preservando intenção, links, alvos de toque e ausência de overflow/erros conferidos. Os quatro WebKit públicos passaram sem a proteção de login da prévia, concluindo o diagnóstico acima.
- Cinco rotas (`/`, `/coracao`, `/ler`, `/arcos`, `/sobre`) retornaram HTTP 200/HIT. Os quatro assets retornaram 200 com tipos corretos e hashes idênticos aos locais. MP4 SHA-256 `5eac3d4d24e7b058c0ce9b3eb144b56582a993ecf505a8fc9570d3f23b62183f`; Range respondeu 206, `bytes 0-63/2540919`.
- JS inicial público gzip9: **home 167.500 B**, **Arcos 168.726 B**; ambos abaixo do teto de 168.960 B. O vídeo é download separado, adiado para reprodução.
- Relatórios em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261025/production/report.json` e `http-budget.json`. Capturas finais: `showcase-1440.png`, `showcase-1440-network.png`, `showcase-375.png`, `showcase-375-art.png`, `showcase-375-network.png` na mesma pasta.

As capturas em WebKit são emulação; não comprovam Safari em iPhone físico, consumo de bateria, FPS ou nota Lighthouse. A arte é ilustrativa, não uma fonte de números ou relações bíblicas. Não houve chamadas pagas nem publicação social.
