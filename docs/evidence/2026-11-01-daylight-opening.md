# Abertura clara e pulsos ao toque — 01/11/2026

Base: `a7320be` (PR47). Branch: `codex/daylight-home`. Mudança aprovada: abertura Dia pérola/azul e assinatura bordô em vidro, fios dourados com luz que percorre a conexão tocada. Não inclui a proposta posterior de túnel de 1 segundo.

## Verificação local

- `npm run build`: 1090 testes em 70 arquivos, compilação Next/TypeScript e `check-dist` aprovados. Conferidos créditos, números, traduções e ausência de citações protegidas nas saídas.
- `npm run lint`, `npm run typecheck` e `git diff --check`: aprovados.
- `npm run budget`: todas as rotas abaixo de 168960 bytes gzip9. Home 161524 bytes; Arcos 167485 bytes (margem 1475). Sem biblioteca nova de animação ou WebGL no hero.
- Céu WebP: 17664 bytes na variante móvel e 48136 na desktop; somente uma variante CSS por largura.
- Dois testes de dados verificam as conexões João 1/Gênesis 1/Colossenses 1/Salmos 33 e a ausência de arestas decorativas quando a fonte não contém a ligação.
- QA contra o **build de produção local**, porta 3023: 9/9 casos. Chrome e WebKit, 375 × 812 e 1440 × 900, Dia/Noite, mais fallback sem JavaScript.
- QA mede a posição da cabeça SVG em dois momentos após o toque e confirma deslocamento real, seleção exclusiva e URL de destino de cada conexão. Testa pausa, retomada, movimento reduzido, pausa fora de vista, volta à home e menu completo.
- Sem overflow horizontal; todos os alvos da constelação com pelo menos 44 px; CTA inicial visível antes da dobra. Nenhum erro JS ou requisição de escrita nos fluxos testados.
- Contraste conservador calculado sobre cada pixel do céu móvel, composto com a opacidade máxima: texto secundário Dia 5,24:1 e Noite 7,98:1; CTA bordô/dourado 7,13:1. O texto Dia foi escurecido após a primeira medição. O desvanecimento da imagem reduz a variação de fundo junto às ações.
- Chrome Dev local usou `localhost`, pois o Next bloqueia HMR de `127.0.0.1` por padrão. A rodada Dev foi substituída por QA em build de produção, sem o overlay de desenvolvimento que cobria parte do menu. Não se alterou `allowedDevOrigins`.

Evidências locais: `C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/daylight-opening-20261101/build/` (relatório e capturas), scripts `qa.mjs`, `preview.mjs` e `motion-check.mjs` no diretório pai.

## Limites e publicação

WebKit emulado não é teste em iPhone físico. Lighthouse e consumo real de bateria não foram medidos. A confirmação pública exige merge, Vercel READY e repetição da QA no domínio; este registro de build local não é essa confirmação.

Arte, hashes, decisão de marca e melhorias propostas para as demais áreas: [direção aprovada](../../design/ABERTURA-DIA-20261101.md). A paisagem é decorativa; dados e texto bíblico ficam separados.
