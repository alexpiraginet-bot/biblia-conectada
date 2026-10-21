# Auditorias de performance, UI e UX — 21/10/2026

Alex pediu três auditorias independentes ao fim da rodada de compartilhamento e instalação. Elas avaliaram a produção do PR #25 (`f4ad6ef1`) antes de revisar as correções do PR #26. Os relatórios completos, respostas HTTP, scripts e capturas ficam fora do repositório em `C:/Users/R2/.codex/visualizations/`.

## Achados e correções

- **Primeiro toque:** em 5 de 6 cargas novas, tocar rapidamente em Compartilhar seguia para o PNG antes de o controle React estar pronto. Um pequeno delegado no HTML agora retém a ação explícita, mostra abertura/cancelamento e entrega a intenção ao controlador carregado sob demanda. Há saída manual após oito segundos de falha; JavaScript desativado, modificadores, downloads e links externos preservam o comportamento nativo.
- **Leitura no céu:** uma falha ao buscar o texto deixava o versículo selecionado em espera indefinida. O painel agora distingue carregamento e erro, oferece nova tentativa e ignora respostas antigas depois de mudar de seleção.
- **Imagem para compartilhar:** a prévia de Stories era pequena para leitura. O botão Ampliar prévia reutiliza a imagem preparada em largura maior; as ações continuam acessíveis e o formato novo recolhe a prévia. O botão do WhatsApp explicita que envia um link.
- **Instalação:** as instruções do iPhone agora também ficam em Sobre, acessíveis pelo rodapé, mesmo depois de dispensar o aviso temporário. O ícone Apple recebe um endereço novo, com os mesmos bytes aprovados. O relato do Safari físico continua pendente de confirmação; ver `2026-10-21-iphone-icon-name.md`.
- **JavaScript:** a auditoria encontrou a home pública 91 bytes acima do teto de 168.960 bytes gzip9. Conteúdo estático do guia passou para o servidor; o controlador dos diálogos só é solicitado por uma ação do usuário. Os dados do guia permanecem no HTML/RSC, portanto essa mudança não representa eliminação equivalente do tráfego total.

## Evidência independente inicial

**Performance:** `biblia-conectada-20261021/performance-audit/PERFORMANCE-AUDIT.md`. Doze navegações em três rotas, 375/1440 px, contexto novo e recarga; nove GETs adicionais HTTP200/HIT. LCP observado de 108 a 1.148 ms e CLS máximo de 0,003919 nesta máquina, sem limitação de rede. Não são medidas de iPhone físico, rede 4G, INP, FPS ou nota Lighthouse. O primeiro toque foi reproduzido sem aguardar um sinal artificial de hidratação.

**UI:** `biblia-conectada-20261020/verse-social-sharing/production/ui-audit/UI-AUDIT.md`. Dezesseis estados de home, céu, leitura e compartilhamento, mais quatro capturas da faixa do céu, em Dia/Noite e 375/1440 px. Sem overflow horizontal ou erro JavaScript. PNGs João 3:16 e Ester 8:9 conferidos, com texto e crédito BLIVRE. Labels secundários do céu continuam pequenos no celular; os mesmos destinos têm texto legível no painel.

**UX:** `biblia-conectada-20261021/ux-audit/findings.md`. Leitura → IA → fechar → compartilhar preservou rota, foco e posição. Busca por teclado conferida. A falha de texto foi induzida por HTTP503. WebKit no Windows não substitui Safari físico. Nenhuma pergunta paga nem envio real a WhatsApp/Instagram foi necessário.

## Validação integrada

Fonte congelada `c8348655f03a94da07199f98e574985e08806c99`: build completo, 658 testes em 46 arquivos, tipos, ESLint e check-dist de 2.540 páginas aprovados. O build interrompido anterior está identificado como tal e não é evidência final.

Orçamento local dos scripts iniciais externos, gzip9: home **165.911 bytes**; `/arcos` **167.932 bytes**; versículo **157.765 bytes** no build final. Todas as famílias de páginas dentro do teto. O delegado adicional custa **2.072 bytes brutos / 851 bytes gzip9** isoladamente no HTML; concatenado ao script existente, o incremento é de 778 bytes gzip9. Seu aviso estático renderizado tem 316 bytes brutos / 234 gzip9 isoladamente. Esses custos ficam fora do orçamento de scripts externos. Controlador, diálogo e compartilhamento carregados sob demanda somam **5.901 bytes gzip9** (1.247 + 1.307 + 3.347). HTML, dados, imagens, fontes e outros módulos/prefetch são separados. A medida pública da versão final ainda precisa ser conferida.

Seis primeiros cliques no build local abriram o menu sem sair da leitura; todos devolveram foco ao fechar, sem erro. O controlador não estava carregado antes de nenhum desses toques. `intent-release-qa.json` preserva os seis casos e as capturas. Seis GETs independentes do agente principal aprovaram o head de instalação, manifesto e PNGs reais. O SHA256 do ícone180 permanece `131fa78993af7147a42d42c2fead1a8350a956fd07cb75f8566cebfdd7986355`.

Ampliação e tutorial passaram em seis casos integrados, com quatro capturas complementares para ler a imagem ampliada. Em 375 px, a prévia passou de 106,875 × 190 para 315 × 560 px; os botões permanecem fixos e o mesmo PNG é reutilizado. Dia/Noite e 375/1440 px conferidos, sem distorção ou erro. O tutorial preservou oito etapas e navegação por teclado. `preview-tour-smoke.json` e `preview-reading.json` registram os resultados.

O retry do céu passou em quatro cenários e 18 verificações WebKit, em 375/1440 px: HTTP503 → gesto de nova tentativa → texto recuperado, mantendo URL e seleção; resposta antiga não contaminou o versículo seguinte. Botão com altura de 44 px. `ux-audit/verse-retry-qa.json` e capturas antes/depois preservam a evidência.

A última verificação encontrou o Tab preso no painel de leitura abaixo do aviso de erro. A correção `bbc761f` direciona temporariamente o ciclo de foco ao aviso visível, voltando ao painel depois de fechar. A regressão foi aprovada no navegador com os dois avisos: Tab/Shift+Tab alcançam a saída e Cancelar; Enter fecha, preserva URL/foco e o import tardio não reabre o diálogo. Navegação durante a espera, fallback sem JavaScript e Ctrl+clique também passaram. O build completo desse commit passou novamente com 658 testes, tipos e check-dist; ESLint e orçamento passaram, com os mesmos valores de home e arcos.

Prova adicional anterior à própria hidratação: quatro cenários com todos os scripts externos suspensos, delegado presente e loader ainda indefinido. Toque retido com feedback imediato, abertura correta depois de liberar a rede e cancelamento respeitado. Sem erros ou POST. `intent-functional-qa.json`, `intent-prehydration-qa.json` e `payload-release-analysis.json` registram os resultados finais. Prévia anterior `dpl_BUpbnUBG8nS3R9ijeuiCDEFcp414` READY, HTTP200 e novo ícone no head conferidos; prévia do ajuste de teclado e produção aguardam fechamento. Nenhum envio pago ou publicação em aplicativos externos foi realizado.

## Limites restantes

- Ícone no diálogo nativo do iPhone: depende da conferência de Alex após publicar o novo caminho. Não apagar dados ou atalhos antigos como primeira tentativa.
- Labels secundários do 3D: refinamento posterior de tamanho e colisão.
- Trechos das conexões no céu ainda usam uma busca agrupada que pode descartar os trechos do grupo se uma requisição falhar; o retry implementado nesta rodada cobre o versículo de origem selecionado.
- Lighthouse móvel, desempenho de GPU e destinos reais do compartilhamento nativo não foram medidos nesta rodada.
