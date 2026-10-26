# Interlinear nativo — evidências de 26/10/2026

## Escopo

Pedido de Alex: estudo palavra por palavra, com original acima e português abaixo, integrado ao site. A entrega é uma coleção inicial explícita, não uma tradução exata ou uma Bíblia interlinear completa. Método e fontes: `docs/INTERLINEAR.md`.

22 passagens e 282 unidades de fonte, derivadas da lista de cobertura e recontadas por teste. Hebraico TAHOT L/Q e grego TAGNT com seleção SBL; variantes não são concatenadas. IDs, hashes e numeração da fonte preservados. Comparação BLIVRE sem alteração. Glosas produzidas com assistência de IA, sem revisão acadêmica independente.

## Verificação local

- Execução final na fonte `6826bd7`: 819 testes em 59 arquivos, TypeScript, build Next e check-dist passaram. Check-dist conferiu créditos em 3.827 páginas e na 404, além das bases bíblicas existentes.
- Lint passou. Integridade interlinear: dez testes de fonte, alinhamento, variantes, numeração, cobertura e falhas deliberadas. Teste de compartilhamento distingue fonte BLIVRE e rejeita estudos inexistentes.
- Primeira matriz Playwright: 19 casos aprovados; Chromium e WebKit, 375/1440 px, Dia/Noite, hebraico e grego, seleção/fechamento/foco/teclado, transliteração, ordem visual RTL/LTR, ausência de overflow, fallback sem JS, links do leitor, 404 e OG PNG.
- Inspeção visual do primeiro mobile motivou compactação do cabeçalho e rolagem da seleção para tornar o detalhe visível. Matriz final de 19 casos repetida e aprovada. Em 375×812, primeira palavra em y=358,5; seleção revela o detalhe em y=76, sem rolagem artificial do teste; fechar retorna à palavra/foco. Fallback sem JS conferido após rolagem normal para deixar seu summary livre da pílula fixa.
- Orçamento final: índice interlinear 149.379 B; passagem 152.003 B; Arcos 168.525 B gzip9. Todas as rotas abaixo do teto de 168.960 B. Medida exclui HTML, fontes e módulos adiados.
- Payload HTTP real: João 1:1 / Salmos 22:6 com HTML de 16.987 / 15.311 B gzip9, apenas IDs de sua própria passagem. Nenhum token lexical no bundle JS; Arcos não carrega CSS ou fontes do interlinear. WOFF2 com assinatura/tamanho/hash preservados: hebraico 8.072 B; grego 18.168+9.356 B.
- Contraste: 16 pares efetivamente usados, Dia/Noite, aprovados. Menor razão de texto medida: 6,55:1; seleção: 7,18:1 Dia / 9,45:1 Noite. `contrast.json` guarda os pares e resultados.
- Revisão independente de arquitetura/performance: sem P1/P2 confirmado. Corpus completo no servidor; cada estudo recebe sua passagem, fontes restritas às rotas interlineares; Arcos não importa o leitor novo. Revisão de UI/UX e capturas complementares em `C:/Users/R2/AppData/Local/Temp/interlinear-ui-qa/`.
- Revisão editorial: 282 pares original/glosa conferidos pelo implementador editorial e pelo agente principal; notas ajustadas para não descrever uma tradução corrida própria. Isso não é revisão acadêmica especializada.
- Crítica local Ollama tentada em CPU, limite de 45 s, terminou sem resposta. Não é contada como revisão concluída; nenhum modelo ficou carregado.

Artefatos locais, logs e script de QA: `C:/Users/R2/.codex/visualizations/biblia-interlinear-20261026/`. Sem novas dependências, chamadas pagas ou alteração de `estudos/`.

## Publicação

PR #41, fonte `6826bd7be3a6654e5c1e1673c48a6f73b384ca9c`, integrado por squash em `90b09d0139a47fd9c5c88b387001e23a5276da02`.

- Prévia `dpl_4pRrjanhN3YWB4C5aTM71bA5Ck93` READY no SHA esperado. Índice, Salmos 22:6 e João 1:1 retornaram 200 pela consulta autenticada da Vercel, com coleção, fonte e tokens esperados. Nenhum link de acesso temporário foi registrado na documentação.
- Produção `dpl_8nJxC43JSmBML5jWZCaUYrTLCpxn` READY, SHA e alias `www.bibliaconectada.company` confirmados pela API. A QA pública esperou o HTML expor esse deployment antes de começar.
- **19 casos públicos passaram** em Chromium/WebKit, 375/1440 px, Dia/Noite. Ordem RTL/LTR, glosas, seleção/revelação móvel, fechamento/foco, Enter/Escape, transliteração, fallback sem JS, cobertura/index, links do leitor, rotas inexistentes 404 e duas capas PNG conferidos. Capturas públicas finais inspecionadas; sem erros de JavaScript nos cenários.
- HTTP público independente: índice 149.615 B, João 1:1 152.245 B e Arcos 168.760 B de JavaScript gzip9. Todas abaixo de 168.960 B; **Arcos tem apenas 200 B de margem**, não ampliar seu bundle global sem nova medição. HTML gzip9: 11.751 / 17.077 / 14.480 B, respectivamente.
- Três fontes com HTTP 200, `font/woff2`, tamanho e SHA-256 idênticos à proveniência. Nenhum JS/CSS com falha; nenhum token lexical no JS, nem CSS/fontes/corpus interlinear em Arcos.
- Evidências públicas: `C:/Users/R2/.codex/visualizations/biblia-interlinear-20261026/public/results.json`, PNGs na mesma pasta e `public-qa.log`. Servidor local de QA encerrado após validação. Nenhuma credencial alterada, chamada paga ou publicação em rede social.

## Limites

WebKit automatizado não é Safari em iPhone físico. Nenhuma pronúncia em áudio foi gerada; transliteração representa escrita. Não há cobertura automática fora da coleção, nem alinhamento de versículos com Open NBV. Validação técnica não confirma fidelidade acadêmica de cada glosa.
