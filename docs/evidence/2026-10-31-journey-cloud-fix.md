# Jornada: compatibilidade com tabelas vazias do Upstash

## Falha observada

No primeiro smoke público da entrega `ddc6909`, as páginas, menu e capas passaram, mas o único `POST start` da Jornada respondeu HTTP 503. O teste não confirmou pontos, não enviou pulsos e não repetiu o início. Reset sem cookie retornou 200; isso confirma ausência de cookie no contexto, mas não comprova remoção de eventual perfil órfão que tenha sido persistido antes da rejeição pelo parser.

## Causa reproduzida em Preview protegido

Commit temporário de diagnóstico `8b4ef75`, deployment `dpl_AZcvxDTyL5WuR4QUXXQYTLyb23Ha`. O endpoint foi restrito a `VERCEL_ENV === "preview"`, com 404 nos demais ambientes, sem cache e protegido pela autenticação da Vercel. Não recebeu comandos do cliente, não acessou chaves e não escreveu dados.

Consulta autenticada HTTP 200: PING retornou PONG; EVAL_RO de um estado sintético retornou a forma esperada `['ok', string]`. Porém, as tabelas Lua vazias de `day.areas` e `day.completed` foram codificadas como arrays JSON. O parser do app rejeitou o estado (`parserAccepted: false`). A resposta expôs somente status, tipos e booleanos, sem hosts, segredos ou identificadores.

Esse resultado comprova a incompatibilidade do estado inicial com o parser, mas o teste somente leitura não comprova permissão de escrita nem o ciclo completo de adesão. O endpoint e seus testes temporários foram removidos antes da versão corrigida; não devem entrar no merge.

## Correção e limites

Somente arrays **vazios** nos campos `day.areas` e `day.completed` são normalizados para objetos vazios ao ler JSON armazenado. Arrays não vazios, null, escalares e arrays em `state`, `day` ou `pulse` permanecem inválidos. Nenhuma validação global, regra de saldo, nonce, pontuação, tempo, rate limit ou Lua foi alterada.

Regressões cobrem os dois mapas isoladamente e juntos, preservação de crédito previamente calculado, rejeição dos tipos inválidos e adesão HTTP com o estado inicial compatível, mantendo zero pontos/dias/tarefas e devolvendo o cookie somente após validação.

## Validação real da correção em Preview

Commit `43a54d3a02294dea3e5294b0812bd96f1f7b948c`, deployment `dpl_BrmNYVhPz7J7TnHQvayQA6jtwPz9` confirmado READY. O diagnóstico temporário respondeu **404**. Os 25 testes direcionados de rewards passaram, inclusive em revisão independente; ESLint e diff-check passaram.

Em 31/10/2026, às 15h52 UTC, um único contexto próprio executou:

1. GET antes de adesão: 200, sem cookie e sem perfil iniciado.
2. Único start: 200, cookie recebido com Secure, HttpOnly, SameSite=Lax e Path=/; zero pontos e dias ativos.
3. Status com o mesmo cookie: 200, perfil confirmado e saldo zero.
4. Um pulse com nonce real e `active:false`: 200; as três tarefas continuaram sem tempo/completude, pontos ou dias ativos.
5. Reset com o cookie recebido: 200, pedido de remoção do cookie.
6. GET usando deliberadamente o cookie antigo: 200, `started:false` e remoção do cookie, comprovando que o perfil não estava mais armazenado.

Não houve pulso ativo, avanço de relógio, tarefa concluída ou segunda adesão. Todas as respostas usaram no-store. CLI/API oficial criou acesso temporário somente ao Preview; token de acesso, nonce e cookies permaneceram em memória, sem entrar em comandos literais, logs ou arquivos. O arquivo de guarda preserva a tentativa única.

Evidências sanitizadas e scripts de QA ficam em `C:/Users/R2/.codex/visualizations/biblia-liturgia-20261031/`, especialmente `preview-cjson-diagnostic.json` e `preview-cloud-final/results.json`. Esta validação é do Preview; a publicação e o smoke de produção são etapas posteriores.
