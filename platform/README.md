# Fundação local — Bíblia Conectada para Igrejas

Uma API real com banco persistente e isolamento de duas igrejas fictícias. Não é uma plataforma pronta para receber igrejas reais, pagamentos ou submissões de apps. Não modifica o site público nem os dados bíblicos. Nenhuma conta de nuvem foi criada.

## Executar no Windows

Requisito: Node.js 24. As versões estão fixadas em `package.json` e `package-lock.json`.

```powershell
cd D:/BentoLabs/01-Projetos/biblia-conectada-qr-app/platform
npm ci
npm run setup
npm run dev
```

Abrir `http://127.0.0.1:4318/console`. O console é mantido em `../deliverables/saas-igrejas/console.html`; `/projeto` abre a proposta visual. São rotas somente de desenvolvimento, servidas no mesmo host da API. Os blocos de script/style recebem hashes CSP; estilos de atributos são permitidos somente nessas páginas locais. Não existe endpoint de auto-login ou de divulgação das credenciais.

`setup` aplica migrações e cria a demonstração uma única vez. `platform/.local/demo-credentials.json` tem o formato abaixo, com senhas aleatórias geradas no computador. **Abrir o arquivo local para copiar a conta; nunca publicar, enviar para o git ou colar em logs.** O diretório `.local/` é ignorado. No Windows, `mode:0600` não substitui ACLs NTFS: manter o perfil do usuário protegido.

```text
{ "accounts": [{ "email": "...", "password": "...", "role": "owner|editor|finance", "churchSlug": "..." }] }
```

Igrejas fictícias: `comunidade-esperanca` e `igreja-caminho`, cada uma com `owner`, `editor` e `finance`. Nenhuma senha conhecida ou padronizada foi incluída no código. O banco está em `.local/database/` e persiste após fechar o processo. **Só um processo pode abrir esse diretório PGlite por vez.** Parar o servidor antes de executar `setup` novamente. Setup preserva contas e dados existentes; se o arquivo de credenciais se perder, falha sem redefinir senhas. Não há reset destrutivo automático.

Também existem `npm run migrate`, `npm run seed:demo`, `npm run typecheck`, `npm test`, `npm run build`, `npm start` e `npm run check`. `start` usa `dist/` depois do build. Migrações SQL permanecem em `migrations/`, inclusive ao executar `dist/`. Para mudar configuração, definir variáveis no ambiente do processo; `.env.example` é documentação, não contém chaves e não é carregado implicitamente.

## Contrato da API v1

Todas as respostas são JSON, sem cache, exceto as duas páginas locais. Erros: `{error:{code,message}}`. Os campos de corpo são estritos: propriedades desconhecidas são rejeitadas. Os textos são **texto simples**, não HTML confiável; clientes devem renderizar como texto. Listas são limitadas a 100 itens, ordenadas por criação. Paginação, busca e aprovação editorial ainda não foram implementadas.

| Método/rota | Contrato |
| --- | --- |
| `GET /health` | `{status:"ok",service:"church-platform",demo:boolean}` e teste de conexão |
| `POST /v1/auth/login` | `{email,password}` → `{token,expiresAt,user:{id,email,name}}` |
| `GET /v1/auth/me` | Bearer → `{user,memberships:[{churchId,slug,name,role}]}` |
| `POST /v1/auth/logout` | Revoga o bearer imediatamente, resposta 204 |
| `GET /v1/churches/:slug` | `{church:{id,slug,name,tagline,primaryColor,accentColor}}` |
| `GET /v1/churches/:slug/posts` | `{items:[...]}`, somente publicados |
| `GET /v1/churches/:slug/events` | `{items:[...]}`, somente publicados |
| `GET /v1/churches/:slug/campaigns` | `{items:[...]}`, somente publicados |
| `GET /v1/admin/:slug/{posts,events,campaigns}` | Bearer + vínculo/função, inclui rascunhos autorizados |
| `POST /v1/admin/:slug/{posts,events,campaigns}` | Cria → 201 `{item}` |
| `PATCH /v1/admin/:slug/{posts,events,campaigns}/:id` | Atualização parcial → `{item}` |
| `DELETE /v1/admin/:slug/{posts,events,campaigns}/:id` | Exclui conteúdo → 204; mantém a auditoria |
| `GET/PATCH /v1/admin/:slug/branding` | Owner, `{item}`; alteração parcial da marca |
| `GET /v1/admin/:slug/audit` | Owner, `{items:[{id,churchId,actorId,action,entityType,entityId,changes,createdAt}]}` |

Corpos de criação:

- Posts: `{title,body,status:"draft"|"published"}`.
- Eventos: mesmos campos + `startsAt` ISO8601 com fuso, `endsAt` opcional/null posterior ao início, `location` texto. Não há recorrência ainda.
- Campanhas: mesmos campos + `goalCents`, inteiro em centavos entre 100 e 1.000.000.000. A meta não é saldo nem pagamento confirmado.
- Branding: `name`, `tagline`, `primaryColor`, `accentColor`; cores hexadecimais `#RRGGBB`. Sem CSS/JS arbitrário, upload, mudança de slug ou alteração de recebedor.

Itens têm `id` UUID, `churchId`, `kind`, título, corpo, status, datas de criação/alteração e os campos de seu tipo. Campanhas **não têm total confirmado editável, chave Pix, checkout, PSP ou doação simulada**. Não existem pontos por doações.

## Permissões e isolamento

| Função | Avisos/eventos | Campanhas | Marca | Auditoria |
| --- | --- | --- | --- | --- |
| Owner | Ler/escrever | Ler/escrever | Ler/escrever | Ler |
| Editor | Ler/escrever | Sem acesso privado | Sem acesso | Sem acesso |
| Finance | Sem acesso privado | Ler/escrever | Sem acesso | Sem acesso |
| Visitante | Só publicados | Só publicadas | Marca pública | Sem acesso |

O slug resolve a igreja no servidor. A sessão identifica o usuário; o servidor consulta `memberships` dentro da transação antes de administrar conteúdo. Não se usa `tenant_id`, função ou usuário enviados no corpo como autorização.

Cada operação abre uma transação em uma única conexão, aplica **`SET LOCAL ROLE` para uma função PostgreSQL sem superuser/BYPASSRLS**, configura `app.user_id` e `app.church_id` localmente e executa SQL parametrizado. A política RLS verifica igreja **e vínculo/função real**. A transação limpa contexto no commit/rollback. Consultas de conteúdo sem `WHERE church_id` também são isoladas pela política. Não se concede TRUNCATE, alteração de política, acesso a hashes de senha ou escrita direta em auditoria aos papéis de conteúdo.

O login usa um papel separado, que só executa funções fixas `SECURITY DEFINER`, com `search_path` fixo e execução pública revogada. Hash de senha scrypt com salt aleatório; token opaco de 256 bits, somente SHA-256 no banco, validade de 8h por padrão (máximo 24h), revogação em cada leitura sem cache. O token deve permanecer em memória no console. Clientes nativos futuros precisam de Keychain/Keystore, ciclo de sessão e revisão própria.

O banco registra criação, alteração e exclusão de conteúdo e alteração da marca através de triggers, na mesma transação. Registra ator, momento e antes/depois. Aplicação não pode inserir, editar nem apagar a trilha. **Um administrador do banco/migrações continua sendo confiável e pode mudar a estrutura; isso não é armazenamento WORM contra o proprietário do banco.**

**Limite de confiança:** RLS protege contra ausência de filtro/tenant errado e acesso indevido dos papéis restritos. O backend continua sendo a autoridade que resolve uma sessão e define o contexto. Se alguém controlar o processo da API, suas credenciais de banco ou puder executar SQL arbitrário no papel de autenticação, pode forjar o contexto ou emitir sessões. GUCs não são uma barreira contra um servidor completamente comprometido. Não expor PostgreSQL/PGlite ou permitir SQL enviado pelo cliente.

## PGlite local versus PostgreSQL de produção

O adaptador local usa PostgreSQL em WASM com filesystem Node persistente. Testes exercitam SQL e políticas reais, não mocks de banco. PGlite serializa transações em um processo; os testes concorrentes demonstram que o adaptador não mistura contextos, **não comprovam carga ou pool multi-conexão do PostgreSQL de produção**.

Bootstrap local abre como proprietário para migrar/semear e então muda a autorização de sessão para `bc_platform_local`, NOINHERIT e sem privilégios administrativos. Cada requisição baixa para o papel próprio. Como o processo local iniciou o mecanismo e controla seus arquivos, isso não é uma fronteira de segurança contra o operador do computador. **PGlite é recusado em `NODE_ENV=production`.**

Há adaptador `pg` pronto, mas não foi executado contra um servidor PostgreSQL externo nesta máquina (não há Docker/psql). Antes de produção, rodar a mesma matriz de isolamento contra PostgreSQL real, com conexões paralelas, backup/restauração e usuário runtime real. Nenhuma instância ou custo de nuvem foi criado.

## Configuração futura de produção — falha fechada

1. Provisionar PostgreSQL dedicado e TLS com certificado validado. Usar segredo de migração separado e `MIGRATION_DATABASE_URL` somente no processo de migração. A migração requer dono do schema e criação dos três papéis; não executá-la com o usuário runtime.
2. O operador cria um login runtime **NOINHERIT, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOREPLICATION** e concede SET/membership apenas para `bc_platform_public`, `bc_platform_member`, `bc_platform_auth`. Não conceder propriedade dos schemas/tabelas nem membership do migration owner. Configurar senha/secret pelo mecanismo seguro do provedor, fora do repositório. Papéis reservados existentes devem respeitar as mesmas restrições.
3. Rodar `NODE_ENV=production DB_ENGINE=pg npm run migrate` com URLs distintas no ambiente. Nunca rodar seed: `setup/seed` recusam PostgreSQL e produção.
4. Configurar runtime `NODE_ENV=production`, `DB_ENGINE=pg`, `DATABASE_URL` do login restrito e `PUBLIC_ORIGIN` HTTPS exato. O servidor testa privilégios de sessão, memberships transitivos administrativos, propriedade de tabelas, NOINHERIT e os três papéis de requisição; inicia somente se forem seguros. Console/proposta não têm rotas em produção. `DEMO_SEED=true` é recusado.
5. Configurar gateway TLS, rede privada do banco e política de host/Origin. Não há CORS aberto. `trustProxy=false` por padrão: atrás de um proxy, o IP visto pode ser o proxy e compartilhar o limite de login; configurar uma cadeia de proxy confiável específica antes de produção, nunca confiar indiscriminadamente em `X-Forwarded-For`.

O servidor nunca migra automaticamente ao iniciar. Falhas de migração deixam a transação sem aplicação parcial; checksums impedem alterar migrações já aplicadas. A fundação ainda não fornece provisionamento de usuários reais, convite, recuperação de senha, reset administrativo ou gestão de memberships por API.

## Segurança já presente e etapas antes de um piloto real

Presente: limite de corpo 32KiB, limites/validação de campos, sessão expirada/revogada, autenticação sem diferença pública entre e-mail inexistente/senha errada, scrypt assíncrono, tentativas de login persistidas por hash de IP e e-mail (20/10min), host/Origin fechados, consultas parametrizadas, RLS, funções separadas, CSP, no-store, proteção contra frame. Logs de requisição estão desativados para não armazenar tokens, corpos ou senhas.

Ainda obrigatório: OIDC/MFA para administradores; convites/recovery e revogação global; consentimentos/LGPD e política de retenção; limpeza de sessões/limites expirados; quotas/rate limits gerais no gateway e proteção de hash de senha contra esgotamento de recursos; observabilidade com redaction e IDs de erro; backup/restauração; testes com PostgreSQL real; testes de carga; testes em dispositivos; regras de edição concorrente (hoje última gravação vence); revisão de acessibilidade e segurança independente. Auditoria guarda o texto anterior: não inserir dados pessoais sensíveis nos testes nem alegar exclusão completa ao apagar um aviso.

Não implementados: cobrança SaaS, PSP/Pix, webhooks, doações, push, uploads/storage, domínios por igreja, links nativos multi-app, apps compilados, migração do catálogo bíblico ou dos cookies da Jornada, integração de IA. A aplicação atual Bíblia Conectada continua separada. Estas interfaces são uma primeira fundação para o piloto, sem prometer o backend completo de todas as áreas da proposta.

## Evidência e referências

`npm test` cobre API e SQL direto: duas igrejas, rascunhos anônimos, CRUD/publicação, UUID estrangeiro, campos forjados, permissões editor/finance, marca, audit trigger, tentativas de desligar RLS/TRUNCATE/escalar papel, membership inexistente mesmo com tenant correto, SQL parametrizado, chamadas concorrentes e rollback, sessão/logout/expiração, limitação de login e reabertura do banco em disco com credenciais preservadas. Os dados dos testes ficam em memória ou em `.local/test-databases/` e não tocam o banco de demonstração.

- [PGlite API](https://pglite.dev/docs/api) e [filesystem Node](https://pglite.dev/docs/filesystems).
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) e [SET ROLE](https://www.postgresql.org/docs/current/sql-set-role.html).
- [node-postgres: uma conexão por transação](https://node-postgres.com/features/transactions).
- [Fastify: servidor](https://fastify.dev/docs/latest/Reference/Server/) e [testes inject](https://fastify.dev/docs/latest/Guides/Testing/).
- [Node crypto/scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).
