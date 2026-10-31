# QR e entrada dos aplicativos — 31/10/2026

## Escopo

PR #45, branch `codex/qr-app-entry`, base `d3a5c52`. Gerador próprio de QR, contexto preservado no menu e na liturgia, instalação iOS/Android e associações de domínio preparadas. Nenhuma alteração nos estudos, nenhuma geração paga de IA, nenhuma publicação social. Sem configurar IDs fictícios, URLs de lojas ou certificados.

## Verificação local

- 1.037 testes / 67 arquivos passaram. A suíte inclui destinos e normalização, privacidade dos parâmetros, datas, contrato das lojas, página de instalação, associações iOS/Android, PNG real 1024×1024 e decodificação independente por jsQR.
- Next.js 16.4.2 compilou, passou TypeScript e gerou 3.868 rotas. O check-dist verificou créditos e idioma em 3.836 páginas e 404, dados, ausência de traduções protegidas e de proveniência no bundle público. Node 24.19 local; projeto e Vercel usam Node 22.
- Lint e orçamento de JS passaram. Teto mantido em 168.960 B gzip9. Antes do ajuste visual final: Arcos 167.289 B (base 167.233, delta 56 B), home 161.393 B, QR 146.559 B. Atualizar o valor QR após o diálogo ampliado; não chamar isso de Lighthouse ou FPS.
- HTTP local: QR PNG, instalador, API pública de disponibilidade e os dois endpoints de associação respondem 200 com tipo correto. Configuração ausente mantém lojas nulas, AASA vazio e assetlinks vazio.
- Matriz Playwright Chrome/WebKit: 375×812 e 1440×900, Dia/Noite, iOS/Android/desktop; 25 cenários funcionais e 30 capturas. Copiar, baixar, rejeitar URL externa, preservar Arcos/edição/data, convite adiado, supressão durante leitura modal, retorno de foco e dispensa passaram. Sem writes de IA ou Jornada.
- Quatro avisos intermitentes de prefetch RSC surgiram na navegação rápida WebKit. Probe repetido com a rede estabilizada teve zero pageerror/requestfailed; não houve falha funcional, e o log original foi preservado.
- Revisão visual encontrou menu sobre o QR mobile. Correção: resultado antes do formulário, layout compacto e modo ampliado com diálogo nativo. Revalidação visual dessa correção e prévia/publicação devem ser acrescentadas ao PR antes do merge.

Artefatos externos ao Git: `C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/qr-app-20261031`, incluindo scripts, capturas e `browser-consolidated-report.json`. Não há tokens de prévia registrados neste documento.

## Limites e continuidade

Os links permanentes funcionam na web. Abrir o mesmo conteúdo dentro de app exige binário real, assinatura, associações e roteamento testados em dispositivo. A disponibilidade da loja exige URL oficial e flag explícita; essas condições não foram ativadas nesta rodada. Android pode ser desenvolvido no Windows, mas SDK/emulador e binário não foram preparados aqui. iOS segue no Mac.

Sem teste em iPhone/Android físico, câmera QR, material impresso, App Store, Google Play ou Smart App Banner real. Instalar PWA não muda seu `start_url=/`. No iOS, não prometer retomada automática do contexto ao abrir pela App Store; retornar ao link no Safari é o caminho documentado. [Contrato e handoff](../APP-LINKS.md).

## Publicação

Confirmar o SHA final, Vercel READY, alias canônico e QA pública no PR #45. Um push ou estado BUILDING não prova publicação.
