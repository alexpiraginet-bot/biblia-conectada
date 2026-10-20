# Home, mobile e apresentação dos recursos — 20/10/2026

## Mudança

O véu escuro do hero escondia as ondas no celular. O visual agora tem um quadro próprio de 220 px, estrelas e SVG entregue no HTML antes da hidratação. WebGL acrescenta movimento no mesmo enquadramento; falha ou perda de contexto preserva o desenho estático. Desktop mantém texto e ondas lado a lado, com transição suave entre as áreas.

A capa apresenta o companheiro de estudo, seus três modos reais e um guia expansível com oito experiências: leitura, constelação, céu 3D, mapa, cronologia, desafios, IA e salvos. Atalhos para IA e guia ficam junto às ações iniciais. A âncora `#sua-jornada` também aponta para os desafios.

## Verificação

- `npm run build`: 543 testes em 35 arquivos, Next e check-dist passaram. Após ajuste final exclusivamente CSS na máscara desktop, Next foi recompilado e as capturas repetidas.
- ESLint, TypeScript e `git diff --check`: passaram.
- JavaScript inicial, gzip: home 167.037 bytes (163,1 KiB); `/arcos` permanece 168.871 bytes (164,9 KiB). Teto 168.960 bytes. Nenhuma dependência adicionada.
- Playwright/Chrome com build de produção local: 375 × 812 e 1440 × 900, Dia/Noite; pausa e retomada; oito etapas do guia; teclado com setas/End; anterior/próxima/recomeçar; busca João 1:14 e foco após Escape; resposta de desafio. Sem overflow ou erros de página.
- WebKit/Windows: hero em 375 × 812 e 430 × 932; sem WebGL, movimento reduzido e perda de contexto. Fallback visível, sem overflow. Pausa/retomada do WebGL também confirmadas.
- Agent Browser/Chrome: inspeção por árvore acessível; axe 4.12.1 no guia aberto sem violações. No destaque de IA, zero violações automáticas. As áreas em gradiente foram conferidas separadamente: composição máxima de `#26475266` sobre `#10212a`, com os cinco tons de texto da seção, resulta em contraste mínimo de 7,18:1.
- Smoke em produção das rotas não alteradas: `/arcos` abriu Daniel 9; `/caminhos` selecionou Nazaré; `/cronologia` trocou Lucas por Mateus; `/ler` abriu Gênesis. WebKit 375 × 812, HTTP 200, sem overflow ou erros observados.
- IA real em produção: GET disponível e uma consulta de entendimento de João 2:7 concluída, com título “João 2:7 — Encher os vasos com água”, contexto e doze referências BLIVRE conferíveis. A chave não foi lida nem modificada. Saldo atual e limite independente da Anthropic não foram auditados.

## Evidências locais

PR #16 integrado em `24cb51790a1a2e8908f063b31e2aa6fce912b69a`. Produção Vercel `dpl_8SsNCkfHvwxssnovkovyqPLXujSs`, estado READY e alias público conferidos. Capturas do domínio público em 375/1440, Dia/Noite, confirmaram o visual; ondas, guia, busca e desafio passaram. A verificação adicional de voltar do assistente após uma âncora da home revelou falha de histórico: a URL voltava, mas a tela permanecia no assistente. Correção incluída no trabalho seguinte, sem tratar esse retorno como aprovado.

Diretório fora do Git: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/`.

- `home-guide-qa.cjs`, `local-guide-qa.json` e `local-guide-{375,1440}-{dia,noite}.png`.
- `local-guide-tour-{375,1440}.png`, `local-guide-ai-{375,1440}.png`.
- `webkit-hero-*.png`, `webkit-real-routes-smoke.json`, `webkit-smoke-*-375.png`.
- `assistant-live-production.jpg`.
- `published-guide-qa.json`, `published-guide-{375,1440}-{dia,noite}.png` e `navigation-debug.png`.

WebKit no Windows não é um iPhone físico. Safari/iOS no aparelho, Lighthouse móvel e custo formal de GPU continuam sem medição. O Motion/Reels está em uma sessão separada; este release não inclui vídeo novo.
