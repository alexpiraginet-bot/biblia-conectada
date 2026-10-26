# Interlinear nativo — evidências de 26/10/2026

## Escopo

Pedido de Alex: estudo palavra por palavra, com original acima e português abaixo, integrado ao site. A entrega é uma coleção inicial explícita, não uma tradução exata ou uma Bíblia interlinear completa. Método e fontes: `docs/INTERLINEAR.md`.

22 passagens e 282 unidades de fonte, derivadas da lista de cobertura e recontadas por teste. Hebraico TAHOT L/Q e grego TAGNT com seleção SBL; variantes não são concatenadas. IDs, hashes e numeração da fonte preservados. Comparação BLIVRE sem alteração. Glosas produzidas com assistência de IA, sem revisão acadêmica independente.

## Verificação local

- Primeira execução completa: 819 testes em 59 arquivos, TypeScript, build Next e check-dist passaram. Check-dist conferiu créditos em 3.827 páginas e na 404, além das bases bíblicas existentes.
- Lint passou. Integridade interlinear: dez testes de fonte, alinhamento, variantes, numeração, cobertura e falhas deliberadas. Teste de compartilhamento distingue fonte BLIVRE e rejeita estudos inexistentes.
- Primeira matriz Playwright: 19 casos aprovados; Chromium e WebKit, 375/1440 px, Dia/Noite, hebraico e grego, seleção/fechamento/foco/teclado, transliteração, ordem visual RTL/LTR, ausência de overflow, fallback sem JS, links do leitor, 404 e OG PNG.
- Inspeção visual do primeiro mobile motivou compactação do cabeçalho e rolagem da seleção para tornar o detalhe visível. A matriz deve ser repetida após esse ajuste, antes da publicação.
- Orçamento inicial medido antes do ajuste: índice interlinear 149.379 B; passagem 151.725 B; Arcos 168.525 B gzip9. Todas as rotas abaixo do teto de 168.960 B. Medida exclui HTML, fontes e módulos adiados.
- Revisão independente de arquitetura/performance: sem P1/P2 confirmado. Corpus completo no servidor; cada estudo recebe sua passagem, fontes restritas às rotas interlineares; Arcos não importa o leitor novo. Revisão de UI/UX e capturas complementares em `C:/Users/R2/AppData/Local/Temp/interlinear-ui-qa/`.
- Revisão editorial: 282 pares original/glosa conferidos pelo implementador editorial e pelo agente principal; notas ajustadas para não descrever uma tradução corrida própria. Isso não é revisão acadêmica especializada.
- Crítica local Ollama tentada em CPU, limite de 45 s, terminou sem resposta. Não é contada como revisão concluída; nenhum modelo ficou carregado.

Artefatos locais, logs e script de QA: `C:/Users/R2/.codex/visualizations/biblia-interlinear-20261026/`. Sem novas dependências, chamadas pagas ou alteração de `estudos/`.

## Publicação

Pendente de build final, QA do ajuste móvel e Vercel READY. Não confundir esta etapa local com validação pública.

## Limites

WebKit automatizado não é Safari em iPhone físico. Nenhuma pronúncia em áudio foi gerada; transliteração representa escrita. Não há cobertura automática fora da coleção, nem alinhamento de versículos com Open NBV. Validação técnica não confirma fidelidade acadêmica de cada glosa.
