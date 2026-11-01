# Minha jornada: constância com saldo confirmado no servidor

Este documento descreve os **pontos e dias ativos**, confirmados no servidor. O [progresso de leitura bíblica](READING-PROGRESS.md), apresentado em `/jornada#leitura`, é um histórico separado de versículos e capítulos salvo no navegador, com backup próprio. Marcações manuais, automáticas e importações desse histórico não concedem pontos nem alteram as regras abaixo.

## Regras da primeira versão

A participação é opcional: **Começar minha jornada** cria um perfil anônimo. Abrir a página, clicar, atualizar ou editar o armazenamento do navegador não concede pontos.

Em cada dia civil de **America/Sao_Paulo**:

| Atividade | Condição | Pontos |
|---|---|---:|
| Ler com atenção | 120 segundos ativos em leitura ou liturgia, com texto de leitura disponível | 20 |
| Acompanhar a liturgia | 180 segundos ativos na liturgia com leituras carregadas | 20 |
| Explorar as conexões | 90 segundos ativos, passando por ao menos duas áreas elegíveis com tempo qualificado | 20 |

As áreas de exploração são Arcos, Explorar, Mapa de Jesus, Cronologia, Linha do tempo e Interlinear. Uma área só entra na contagem depois de um intervalo de atividade confirmado; tocar em várias opções não basta. O índice Interlinear conta como exploração, mas não como leitura. Coração, Ponte, Trilha, Temas e Palavras continuam acessíveis, sem pontuação automática nesta versão.

A leitura dentro da liturgia pode avançar as duas primeiras atividades ao mesmo tempo. Cada atividade concede seus pontos uma única vez por dia. Um **dia ativo** é um dia em que pelo menos uma atividade foi concluída. A cada **sete dias ativos acumulados**, o perfil recebe mais **80 pontos**, uma vez. Esses sete dias não precisam ser consecutivos. A sequência diária é apenas um indicador: faltar um dia não apaga pontos nem o ciclo de bônus.

A meta é **4.800 pontos e 60 dias ativos**, ambas necessárias. Com as três atividades diárias e todos os bônus, o primeiro dia possível é o 68º dia ativo: 68 × 60 + 9 × 80 = 4.800. No 60º dia, o total máximo é 4.240. Não há pontuação por compra, indicação, comentário ou respostas da IA.

## Mini Jesus Bentô 3D Labs: planejado, sem resgate habilitado

O Mini Jesus é uma proposta de reconhecimento futuro. `rewardStatus` permanece **`planned`** mesmo após atingir a meta. `milestoneReached` significa apenas que as duas condições numéricas foram atendidas.

Não existe estoque reservado, promessa automática de envio, escolha de endereço, pagamento de frete, sorteio ou botão de resgate nesta versão. Antes de ativar qualquer entrega, definir e publicar condições, disponibilidade, prazo e validação de elegibilidade. A aplicação não deve anunciar “presente garantido”. O acompanhamento de atividade é uma barreira básica contra duplicação, não uma prova de identidade ou de leitura humana; qualquer resgate futuro exige validação adicional.

## Identidade, privacidade e retenção

- Sem login e sem Google OAuth. A opção de conta pode ser estudada depois; nenhuma integração inexistente é simulada.
- Opt-in cria um cookie aleatório de **256 bits**, `HttpOnly`, `Secure`, `SameSite=Lax`, host-only e `Path=/`. O prefixo `__Host-` protege o escopo. A validade é de 365 dias, renovada durante o uso.
- O Redis guarda somente um HMAC desse segredo, com separação de domínio própria da jornada. O cookie bruto não vai para logs, banco ou JavaScript.
- O registro contém saldo, contadores, datas, sequência, categorias do dia, estado mínimo do relógio e um nonce de idempotência. Não guarda versículos lidos, URLs de passagens, texto de pesquisa, mensagens, orações, nome, e-mail ou endereço.
- O IP verificado pela Vercel é transformado em HMAC separado, usado só para limite de frequência. Não é reutilizado como identidade da jornada nem compartilha a chave lógica do assistente. Chaves de frequência expiram em 120 segundos; limite de novas jornadas em até dois dias.
- Perfis expiram após **365 dias sem uso**. Os índices são podados por data e também expiram após 365 dias sem atualização, para não conservar os identificadores antigos indefinidamente.
- **Apagar jornada** remove perfil e presença nos índices, invalida o cookie e permite à interface apagar seu espelho local. Os limitadores temporários de IP continuam até seu TTL para impedir que apagar/recriar conceda novas tentativas ilimitadas.
- O navegador guarda somente um espelho de exibição. Sem o cookie, limpar os dados do navegador ou mudar de aparelho/domínio perde o vínculo com esse perfil anônimo. Esta versão não oferece recuperação ou sincronização entre aparelhos.

## Confirmação de tempo e idempotência

O frontend informa somente a categoria, se há atividade e o nonce recebido na resposta anterior. Não pode enviar pontos, data, tempo decorrido ou atividades concluídas; campos extras são rejeitados.

O servidor determina o instante e o dia. O primeiro pulso apenas arma o relógio. Pulsos seguintes precisam ocorrer na mesma área e com atividade nos dois extremos. Um intervalo entre **15 e 30 segundos** acrescenta no máximo **15 segundos**. Intervalos menores não pontuam; acima de 30 segundos o relógio é rearmado sem compensação retroativa. Pausar, ocultar a aba ou mudar de área também exige rearmar. O tracker deve suspender atividade quando o conteúdo não está disponível, a página não está visível ou o visitante deixa de interagir.

Uma única operação Lua no Redis compara o nonce e altera relógio, contadores, atividades, dia ativo e bônus de forma atômica. Abas simultâneas compartilham esse relógio. Repetir o mesmo nonce retorna o estado atual sem acrescentar tempo. Após uma resposta perdida, consultar o estado recupera o saldo verdadeiro; reenvio não duplica a recompensa. A virada do dia zera apenas as tarefas diárias e não conta intervalos atravessando a meia-noite.

Isso limita cliques repetidos, atualização, múltiplas abas e manipulação simples de `localStorage`. Um cliente modificado ainda pode declarar atividade falsa em tempo real; a solução **não é antifraude completa**, identificação pessoal ou prova de atenção.

## API e infraestrutura

- `GET /api/jornada`: consulta status sem criar perfil nem cookie. Antes do opt-in, faz somente um `PING` para verificar a disponibilidade real do banco.
- `POST /api/jornada` com `{ "op": "start" }`: inicia explicitamente.
- `POST` com `{ "op": "pulse", "token": "nonce", "area": "liturgy", "active": true }`: atividade. `active: false` pausa.
- `POST` com `{ "op": "reset" }`: exclusão.

Respostas usam `private, no-store`, sem cache de CDN ou navegador. Escritas exigem `Origin` igual ao host do app e rejeitam `Sec-Fetch-Site: cross-site`. O corpo aceita até 1 KB. Chamadas ao banco têm timeout de seis segundos e não seguem redirecionamentos. O limite é de 24 operações por minuto por IP e três novas jornadas por dia por IP; uma ação de apagar não dá pontos nem restaura o limite.

O serviço usa as variáveis existentes `KV_REST_API_URL`/`KV_REST_API_TOKEN` (ou equivalentes Upstash) e `ASSISTANT_RATE_LIMIT_SECRET`, com domínios HMAC separados. Não lê chaves Anthropic/OpenAI, não usa o ledger de IA e não exige habilitar o assistente. Não cria plano, banco ou assinatura novos. Cada pulso consome uma requisição ao Redis; `GET` antes do opt-in também tem custo de uma requisição dentro da cota existente. Não há cache de saúde que finja disponibilidade após uma falha.

Namespaces:

| Ambiente | Prefixo | Cookie |
|---|---|---|
| Produção | `bc:{journey}:production:` | `__Host-bc-journey` |
| Preview | `bc:{journey}:preview:` | `__Host-bc-journey-preview` |
| Desenvolvimento local | Desabilitado por padrão | Nenhum |

Somente Vercel com ambiente `production` ou `preview` e credenciais válidas ativa a rota. Ausência de configuração ou falha do banco retorna `available: false`; não há saldo fictício elegível ou gravação silenciosa em outro lugar. Testes Redis locais usam um prefixo isolado fora desses ambientes e não apontam ao banco do usuário.

## Gestão inicial

Com as credenciais já fornecidas pelo ambiente seguro, em `site/`:

```powershell
npx tsx scripts/journey-admin.ts summary production
npx tsx scripts/journey-admin.ts eligible production
npx tsx scripts/journey-admin.ts eligible production 50
```

Trocar `production` por `preview` consulta somente testes. Nunca passar token/chave pela linha de comando nem colá-los em logs. O script aceita somente operações de leitura; não ativa resgate e não concede pontos. `summary` informa perfis ativos e perfis que atingiram a meta dentro da retenção. `eligible` verifica os registros atuais e lista até 50 IDs opacos com saldo e dias ativos. Esses IDs não identificam uma pessoa, não autenticam um visitante e não revelam o cookie.

**Operação de segredos:** rotacionar `ASSISTANT_RATE_LIMIT_SECRET` também muda o HMAC dos perfis da jornada e perde o vínculo dos cookies existentes com seus saldos. Uma rotação necessária por segurança deve ocorrer mesmo assim; para rotações programadas que preservem acesso, implementar antes uma migração com identificação de versão do segredo. Não há migração automática nesta versão.

A listagem é uma fotografia administrativa paginada, não um sistema de estoque ou expedição. Atividade concorrente pode reordenar páginas; validar novamente o registro no futuro fluxo de resgate.

## Evidência

`tests/rewards.test.ts` confere configuração, separação de ambientes e HMAC, opt-in, origem, limites de corpo, recusa de saldo/tempo falsificado, data de Brasília, espelho sem autoridade, falhas sem créditos fictícios e regras de apresentação da meta. A lógica atômica foi exercitada adicionalmente no Redis real portátil, em loopback e sem persistência; resultados ficam junto às evidências da rodada. A validação local não é uma prova de durabilidade ou disponibilidade futura da Upstash.

### Reproduzir a validação atômica em Redis local

Teste opcional, separado do CI e sem dependência nova. Inicie uma instância de Redis isolada, vinculada somente a `127.0.0.1`, sem persistência, na porta `6389`. Em `site/`, execute:

```powershell
node --import tsx scripts/check-journey-ledger.mjs
# Opcional: gravar o relatório completo fora do repositório.
node --import tsx scripts/check-journey-ledger.mjs C:/caminho/qa-jornada.json
```

`JOURNEY_QA_REDIS_PORT` permite outra porta local entre 1024 e 65535; o host permanece fixo em loopback. O script não lê credenciais de nuvem, não aceita outro host e não instala nem inicia o Redis. Sem a instância local, ele falha explicitamente, sem substituir o teste por um mock.

Os onze cenários executam o Lua real com relógio de servidor controlado: concorrência e replay, intervalos curtos e longos, pausa, virada do dia, limites diários, bônus, meta de 4.800 pontos, exclusão, retenção e separação entre leitura e interlinear. Cada execução usa um namespace `qa-only:journey:<UUID>:` e remove somente suas próprias chaves com `SCAN`/`DEL`; nunca usa `FLUSHDB`, `FLUSHALL` ou `KEYS`. Não são dados de participação reais nem uma prova de atenção humana. Encerre a instância isolada ao concluir os testes.
