# Conversa na leitura e paleta bordô — 20/10/2026

Pedido do Alex: ajuda de IA sem sair do versículo, opções imediatamente acessíveis, espera reconhecível e identidade premium em bordô com dourado.

## Implementação

- `VerseStudyLink` conserva uma URL canônica alternativa e os atalhos de nova aba. Um host pequeno abre um diálogo nativo; chat, cânon e recuperação do texto ficam em módulos adiados.
- A conversa abre sem POST. Três estilos, perguntas prontas, campo fixo e indicador de três pontos ficam no próprio contexto. Só as mensagens rolam. Fechar libera a página e devolve foco/posição; navegação pelo histórico fecha o diálogo sem impor a rolagem da rota anterior.
- Continuidade em memória: até dois pares completos, com descarte dos mais antigos para manter o corpo em 8.192 bytes UTF-8. Backend valida formato e limites; respostas anteriores não viram evidência bíblica. Nova passagem/fechamento descarta o estado. Retry conserva UUID e corpo; nova consulta exige ação explícita.
- Texto, citações, fontes recolhíveis, voz do aparelho e cenas narradas continuam disponíveis. As cenas entram no contexto de continuidade e conservam suas fontes específicas. A página alternativa `/assistente` reutiliza a conversa compacta.
- Bordô, dourado e marfim em tokens globais, home, guia, desafios, mapas, cronologia e controles 3D. Canvas e pôsteres mantêm suas cores de dados. Noite é o padrão; Dia e Sistema continuam como escolhas explícitas persistidas.
- Nenhuma dependência, credencial, modelo, limite de tokens ou orçamento alterado. `estudos/` não foi modificado.

## Verificação local

`npm run build`: 594 testes em 38 arquivos, Next.js 16.4.2 e TypeScript passaram. `check-dist` conferiu créditos/dados em 2.539 páginas pré-renderizadas mais a 404 e verificou ausência das citações protegidas em 23.426 arquivos de texto. Lint e `git diff --check` passaram.

As capturas e relatórios ficam em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/`: `inline-study-qa.json`, `inline-theme-review.json`, `inline-theme-qa.json` e capturas `inline-study-*`/`inline-theme-*`. Chrome e WebKit no Windows foram usados em 375 e 1440 px, Dia e Noite. Os testes locais interceptam a API com respostas claramente simuladas; não são chamadas reais à Anthropic. Retestes de teclado, histórico e acessibilidade são registrados nos relatórios externos.

Os testes do orçamento de JavaScript medem scripts iniciais em gzip; o custo dos módulos adiados deve ser contado separadamente, conforme o relatório externo `inline-study-js-payload.json`.

## Limites

Voz audível e teclado no Safari/iPhone físico não foram medidos. Emulação WebKit no Windows não os substitui. Axe automatizado não certifica conformidade completa, especialmente gradientes e gráficos. Lighthouse, LCP e tempo de GPU não foram medidos nesta etapa. O saldo atual da Anthropic e o faturamento do provedor não foram auditados. Publicação depende de deployment READY e conferência no alias público; os registros reais usam prefixo `published-inline-*` para distingui-los dos testes locais.
