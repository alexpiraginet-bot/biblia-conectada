# Entrega SaaS · 31/10/2026

Pedido: projeto em HTML interativo e preparação do backend. Branch `codex/church-saas-proposal`. Esta entrega é independente do site Next.js em `site/`; não altera traduções, Jornada, IA ou os pipelines em `estudos/`.

## Artefatos

| Arquivo | O que é |
| --- | --- |
| `deliverables/saas-igrejas/projeto.html` | Proposta interativa em um único HTML, offline, sem bibliotecas, fontes ou imagens remotas. |
| `deliverables/saas-igrejas/console.html` | Console conectado à API local: login, igreja autorizada, edição/publicação de avisos, vista pública e auditoria. |
| `platform/` | Backend TypeScript/Fastify, migrações SQL, PGlite persistente local, adaptador pg, testes e lockfile. |
| `deliverables/saas-igrejas/Abrir-Backend.ps1` | Início local no Windows com Node24; instalação de dependências, setup idempotente e servidor. |
| `deliverables/saas-igrejas/LEIA-ME.md` | Guia de uso e distinção entre demonstração e banco real. |
| `docs/SAAS-IGREJAS.md` | Proposta pesquisada, referências, arquitetura e modelo de operação. |

O protótipo alterna Comunidade Aurora/Horizonte e mantém rascunho/publicação separados na memória da aba. O backend usa outras duas igrejas, Esperança/Caminho, deliberadamente fictícias e com dados persistidos. Não há ligação automática entre os dois ambientes. Exportar o HTML não exporta o banco ou credenciais.

## Implementado e verificado

- API versionada: leitura pública de marca e conteúdos publicados; CRUD autenticado de avisos, eventos e campanhas; edição da marca; consulta de auditoria.
- Sessões opacas com expiração, hash no banco e revogação; senhas scrypt com salts individuais. Contas de demonstração geradas localmente, sem senha padrão no código.
- Permissões owner/editor/finance, resolução da igreja pelo servidor e verificação de vínculo.
- RLS SQL com papéis restritos e contexto por transação. Auditoria por triggers na mesma transação; restrição de alteração por papéis da aplicação.
- Proteções de host/origem, corpo e campos, consultas parametrizadas, respostas sem SQL/segredos, limitação de tentativas de login e cabeçalhos de segurança.
- PGlite reaberto em disco nos testes, conservando dados, sessão e credenciais. Nenhum seed destrutivo automático.

Validações em 31/10:

| Verificação | Resultado |
| --- | --- |
| `npm run check` em platform | TypeScript, 22 testes e build passaram; confirmado pelo agente principal. |
| Testes de isolamento | Tentativas anônimas, tenant/UUID estrangeiro, campos forjados, papel errado, membership ausente e RLS direto passaram. |
| Sessão e persistência | Expiração, logout, concorrência local, rollback e reabertura do banco passaram. |
| Proposta em Chromium/WebKit | 10 cenários passaram: 375/1440, Dia/Noite, seis áreas, publicação demonstrativa, isolamento, módulos, app, fases e reset. |
| Proposta offline e servida | Mesmo fluxo aprovado por file:// e HTTP local com CSP. |
| Console em Chromium/WebKit | 11 cenários passaram: matriz 375/1440 Dia/Noite, gravação/publicação real, texto escapado, isolamento, logout, cabeçalhos e credenciais inacessíveis por HTTP. |
| Erros JavaScript nos relatórios | Zero. |
| `npm audit --omit=dev` | Zero vulnerabilidades reportadas nas dependências de execução no momento da consulta. Não é auditoria integral de segurança. |
| Revisão independente | Nenhum bloqueador identificado em autenticação/tenant/exposição/XSS; limites de produção revisados. |
| Revisão visual | Capturas de proposta, prévia do app, editor e console inspecionadas pelo agente principal. |
| Servidor compilado e exportação | Login/logout no `npm start`, saúde do banco e HTML exportado reaberto offline passaram. Hashes CSP normalizam CRLF/CR do Windows; regressão coberta por teste. |

Scripts e relatórios locais em `deliverables/saas-igrejas/qa-*` e `qa/`. Os scripts de navegador desta rodada usam o runtime Playwright instalado neste Windows; os testes do backend são portáveis via `npm test`. Capturas e relatórios acompanham o pacote de entrega, não o código versionado. Emulação não comprova uso em iPhone/Android físicos.

A crítica local Gemma apontou concorrência, revogação e falhas de persistência como pontos úteis; alegações imprecisas sobre variáveis de ambiente e necessidades de múltiplos nós foram descartadas. SQL, testes e inspeção foram a evidência final, não a resposta do modelo.

## Próxima etapa operacional

A base está preparada para continuar a implementação, **não para receber dados reais de igrejas**. O adaptador pg e as migrações existem, mas ainda é necessário validar PostgreSQL externo com pool real, TLS, papéis, backup/restauração e carga. PGlite é recusado em produção; as rotas de demonstração não existem nesse modo.

Faltam autenticação de produção/MFA/recuperação, provisionamento de igrejas/equipes, painel completo, aprovação/agendamento, armazenamento, consentimentos e retenção, gateway/quotas/observabilidade, PSP, cobrança SaaS, push e aplicativos. O cadastro de campanha registra finalidade/meta; não comprova recebimento nem movimenta dinheiro.

Nenhuma publicação de site, campanha ou aplicativo, despesa, mensagem a terceiros ou alteração de configuração de nuvem foi realizada. Código e documentos ficam em uma branch própria do repositório. A pesquisa de práticas e distribuição está em `SAAS-IGREJAS.md`, com links oficiais. O próximo piloto deve usar uma igreja escolhida e um ambiente de nuvem próprio, preservando o produto Bíblia Conectada atual.
