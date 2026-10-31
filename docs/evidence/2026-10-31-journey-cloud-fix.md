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

Evidências sanitizadas e scripts de QA ficam em `C:/Users/R2/.codex/visualizations/biblia-liturgia-20261031/`. O ciclo real de escrita/limpeza em um único contexto Preview e a publicação da correção serão registrados depois de executados; este documento não afirma que a correção já está em produção.
