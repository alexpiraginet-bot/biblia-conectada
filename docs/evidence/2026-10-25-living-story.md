# Sua história também se conecta — integração do motion enviado

## Escopo e decisão

Alex enviou `Biblia_Conectada_Editavel.zip` e pediu descobrir como usá-lo no site. O pacote contém a composição editável, não o MP4 descrito em um relatório antigo. A integração usa o movimento original digital → portal → rede como entrada editorial para `/coracao`, com caminhos secundários para `/ler` e `/arcos`.

Detalhes de produto em [LIVING-STORY.md](../LIVING-STORY.md). Reprodução, hashes, preservação e limites da arte em [design/living-story](../../design/living-story/README.md). Não houve chamada paga, alteração de credenciais, publicação social ou mudança nos estudos da sessão de vídeo.

## Validação durante a implementação

- Vinte testes focados de ciclo de vida passaram: visibilidade, autoplay recusado, gesto explícito, pausa, fim, preferências, carregamento, retry, seek, descarte e retorno pelo Next Activity.
- Oito cenários em servidor de desenvolvimento passaram: Chromium e WebKit, larguras 375/1440, Dia/Noite. Vídeo real, três estágios, pausa/retomada, fim, volta do Coração, links, botões de pelo menos 44 px, ausência de overflow e de erros de JavaScript.
- Revisão independente: seis casos adicionais de movimento reduzido, Save-Data, ausência de JavaScript, falha 404, recusa de autoplay e texto ampliado/teclado. Os botões receberam quebra de palavra para o aumento de 200%; essa correção será reconferida no build.
- Renderização preservou toda a geometria: 360 quadros a 30 fps, 12 s, 720 × 1080, H.264 sem áudio. Recorte removeu somente preto; decodificação integral sem erros e faststart conferido.
- Vídeo 2.540.919 B; pôster 159.986 B. Three.js/GSAP/editor não integram o frontend; controlador próprio adiado e exclusivo da home. O pôster chega antes do vídeo; o MP4 só é solicitado para reprodução/seleção.

Evidências locais: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261025/`, subpastas `dev-final`, `extra-qa` e `living-story-render`. Scripts e metadados de reprodução do asset também foram versionados.

## Diagnósticos e limites

O primeiro harness desktop rolava para o topo mas deixava parte da arte visível, então esperava pausa no momento errado. Foi corrigido para sair integralmente da viewport. WebKit exigiu aguardar o evento de fim/atualização do controle, além da propriedade `ended`. Uma execução extra usou `127.0.0.1`, origem bloqueada pelo servidor Next em desenvolvimento; a repetição em `localhost` passou, sem mudar a configuração do produto.

Build completo, orçamento, prévia hospedada e produção serão registrados após execução. As capturas em WebKit são emulação; não comprovam Safari em iPhone físico, consumo de bateria, FPS ou nota Lighthouse. A arte é ilustrativa, não uma fonte de números ou relações bíblicas.
