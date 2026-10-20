# Companheiro de estudo — implementação e ativação

Implementação de 20/10/2026. API em `/api/assistente`; interface em `/assistente`.
Os testes automatizados usam dados bíblicos reais e respostas simuladas do provedor. As verificações reais posteriores em Preview e Production estão registradas separadamente abaixo; não são resultados desses testes.

## Estado comprovado em 20/10/2026

**O assistente está habilitado em produção e uma consulta real foi concluída pela interface.** A conferência de metadados da Vercel confirmou `ANTHROPIC_API_KEY` sensível em Preview e Production, sem ler seu valor. O comentário da habilitação de Production registra que os três modos foram testados previamente em Preview.

| Item | Estado confirmado e limite da evidência |
| --- | --- |
| Redis dedicado | `biblia-conectada-ia-budget`, Upstash Free, região `iad1`, evicção desativada; configuração conferida na preparação |
| Integração Vercel | A mesma base vinculada a Preview e Production; aliases `KV_REST_API_URL` e `KV_REST_API_TOKEN` disponíveis ao servidor |
| Ledger | Hash `bc:{assistant}:ledger` inicializado; GET público atual confirmou a configuração básica válida (`schema=1`, `limitMicros=20000000`, `blocked=0`). O saldo atual não foi auditado nesta atualização |
| Identidade por HMAC | `ASSISTANT_RATE_LIMIT_SECRET` aleatório configurado como sensível em Preview e Production; seu valor não foi lido |
| Habilitação | `ASSISTANT_ENABLED=true` em Preview e Production; produção também conferida por GET e POST reais |
| Anthropic | Chave sensível presente nos dois ambientes; uma geração real em produção confirmou atendimento naquele momento. Créditos restantes, faturamento e limite independente do workspace não foram auditados |

### Verificações reais, separadas dos testes simulados

- **Preview:** os modos entender, explorar e narrar concluíram uma geração cada em 20/10, entre 19h19 e 19h22 UTC, no deployment `dpl_b1AckioAQUwGB8j6N2o68YVAdBX9`, commit `a05b40b475d71d5a3842052b0d6cb6bc684b05b4`. A leitura posterior do ledger, às 19h29 UTC, confirmou três requisições liquidadas, total de US$0,101672 e nenhuma reserva ainda aberta entre essas requisições. Essa é uma fotografia histórica do Preview, não o gasto atual de produção. O registro sanitizado é `assistant-live-qa.json`, na pasta local de evidências do Codex.
- **Produção:** `GET https://alexpiraginet-bot-biblia-conectada.vercel.app/api/assistente` retornou `available:true` e a mensagem “Escolha uma passagem e comece a explorar.”. Depois, um POST real pela interface, no modo entender, sobre João 2:7, concluiu a resposta “João 2:7 — Encher os vasos com água”, com blocos contextuais e 12 citações BLIVRE, incluindo João 2, 1 Reis 17 e 2 Reis 4–5. A conferência foi feita pelo responsável pela integração; nenhuma chave ou consulta de saldo fez parte desta atualização.
- **Limites:** o GET verifica configuração e integridade básica do ledger; não testa a Anthropic nem consulta o gasto mensal. O POST real confirma funcionamento naquele pedido e a presença das fontes, não infalibilidade da interpretação. O custo desse pedido de produção, o saldo atual e o teto independente da conta Anthropic não foram auditados. O teto implementado na aplicação continua sendo US$20 por mês UTC, compartilhado entre Preview e Production.

**Histórico da preparação:** antes dessas verificações, a chave nova aguardava preenchimento e Production estava desabilitado. Os testes locais iniciais não haviam exercitado o provedor nem o REST/EVAL real. Os sucessos posteriores em Preview e Production substituem aquele estado de ativação; os registros dos testes simulados abaixo continuam válidos com seus limites originais.

## O que faz

Três modos: **entender** explica uma passagem; **explorar** compara suas ligações; **narrar** prepara três cenas breves para leitura ilustrada. A perspectiva é cristã e explicitamente assistida por IA. O sistema não alega fé pessoal, revelação ou autoridade pastoral. Reconhece diferenças de interpretação e limites das fontes.

A interface aceita qualquer versículo canônico por `/assistente?ref=jeremias/17/8` ou pelo campo de referência, e preserva dez passagens da jornada como atalhos. O servidor valida livro, capítulo e versículo antes de recuperar o texto. Referências inválidas mostram aviso, sem enviar consulta automaticamente. Uma passagem arbitrária mostra seu texto real, sem reutilizar a ilustração de outro episódio como se fosse dela.

Independentemente do modo, há três estilos: **Bem simples**, com palavras familiares também para crianças; **Contexto bíblico**, com os limites das fontes; e **No dia a dia**, com aplicações identificadas como reflexão. Cada envio é independente: não mantém memória de conversa nem histórico persistido. As sugestões preenchem a pergunta, mas não enviam automaticamente. “Ouvir texto” e “Ouvir resposta” usam a voz do aparelho, somente após acionamento da pessoa, com parada e mensagem quando indisponível. O suporte e a voz variam entre navegadores; não há serviço pago de áudio.

O servidor carrega o capítulo BLIVRE selecionado e até oito parceiros realmente presentes nas referências cruzadas. Capítulos com mais de 60 versículos usam uma janela de 40 ao redor do versículo escolhido, identificada no contexto. O modelo recebe texto, referências e IDs; não navega na internet nem usa ferramentas. A seleção de parceiros de um versículo prioriza as ligações desse versículo; uma consulta ao capítulo usa as ligações do recorte completo.

Cada bloco deve citar IDs existentes no conjunto recuperado. O servidor devolve o texto BLIVRE exato e constrói links canônicos. Citações inexistentes, HTML, links produzidos pelo modelo e propriedades inesperadas são recusados. Isso garante a procedência das citações, **não a correção de toda interpretação**; a interface convida a conferir o texto.

No modo narrar, exatamente três cenas são validadas; imagens, legendas de recriação e ações são atribuídas pelo servidor a partir dos arquivos do projeto. Não há geração de imagens, execução de código ou promessa de vídeo. As cenas reutilizam a imagem editorial do momento correspondente; uma passagem fora desses momentos usa uma paisagem da Galileia explicitamente identificada como ambientação, sem afirmar que ilustra o evento.

Texto e referências mantêm as atribuições de [fontes/README.md](../fontes/README.md): BLIVRE, CC BY 4.0; referências OpenBible.info, CC BY. As imagens conservam a identificação de recriação e a procedência registrada no projeto. O assistente não importa outra tradução.

## Modelo e contrato

Modelo fixo `claude-opus-5-5`, até 1.600 tokens de saída incluindo pensamento, esforço baixo, pensamento adaptativo e tier padrão. Sem cache de prompts, ferramentas, fast mode, troca automática de modelo ou repetição automática. Preços consultados em 20/10/2026: US$4 por milhão de tokens de entrada e US$20 por milhão de saída. [Visão oficial do Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview), [Messages API](https://platform.claude.com/docs/en/api/messages/create).

O request fixa `inference_geo: "global"` para não herdar uma configuração regional com acréscimo de preço. Região, tier, cache ou campos de cobrança inesperados na resposta impedem a devolução da reserva. [Preço por região de inferência](https://platform.claude.com/docs/en/about-claude/pricing).

A API recebe um UUIDv4 `requestId`, modo, estilo opcional `style: "simples" | "contexto" | "cotidiano"`, pergunta de 3 a 800 caracteres e `passage: {book, chapter, verse?}`. O estilo omitido é normalizado para `contexto`; estilos inválidos são rejeitados, e o estilo entra na identidade do pedido. Corpos JSON são limitados a 8 KiB, inclusive em transferência por partes. O tipo público completo está em `site/src/lib/assistant/types.ts`.

`GET /api/assistente` informa disponibilidade sem chamar Anthropic. Ele verifica configuração, ambiente Vercel e os campos básicos do ledger persistente. Não consulta o gasto do mês: pode retornar `available:true` mesmo quando uma nova reserva seria recusada por orçamento. `assistantAvailability()` é apenas a indicação inicial de configuração para a página; o GET confirma essa verificação de execução, não créditos ou uma geração bem-sucedida.

`POST /api/assistente` exige origem igual à do site, IP informado pela Vercel, entrada válida e reserva financeira antes do provedor. Em sucesso retorna título, blocos, citações exatas, sugestões e, no modo narrar, cenas. Falhas retornam mensagens públicas com códigos `unavailable`, `invalid`, `limit`, `provider` ou `in_progress`, sem diagnósticos privados.

O formato usa `output_config.format` com JSON Schema. A API não aceita `maxItems` nem `minItems` maior que 1: quantidades exatas e comprimentos são conferidos novamente em `response.ts`. Respostas cortadas, recusas ou JSON inválido não são exibidos como estudo. [Structured outputs: limitações e motivos de parada](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

## Teto e concorrência

O teto da aplicação é **US$20 por mês de calendário UTC**, compartilhado entre Preview e Production. Valores usam inteiros em milionésimos de dólar. Não existe contador financeiro em memória.

Antes de cada chamada, um script Lua `EVAL` verifica saldo, bloqueio, identidade da requisição e limites por visitante; reserva o custo máximo conservador e registra o ID na mesma operação atômica. O saldo conta gastos concluídos **e reservas ainda abertas**. As chaves compartilham o hash tag `{assistant}` para permanecerem no mesmo slot Redis. [EVAL da Upstash](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval), [REST API](https://upstash.com/docs/redis/features/restapi).

A reserva considera duas vezes os bytes UTF-8 do pedido completo como tokens de entrada, mais 4.096 tokens de margem de protocolo, além de toda a saída permitida. O pedido serializado não pode exceder 90.000 bytes. É uma margem deliberadamente superior ao consumo esperado de texto; não é uma medição oficial de tokens. Alterar modelo, preços, ferramentas ou recursos de cobrança requer rever esse cálculo e os testes antes da ativação. Configure também o limite de US$20 no workspace/organização Anthropic usado pela chave como proteção independente. O controle desta aplicação não cobre chamadas feitas por outras aplicações nem custos de hospedagem/Redis.

Somente uma resposta concluída com uso validado permite devolver a parte não consumida da reserva. Timeout, aborto, erro de provedor, uso desconhecido ou falha no Redis **mantêm a reserva**. Isso pode pausar consultas antes de consumir US$20 reais; não há liberação automática que possa ignorar uma cobrança incerta.

A liquidação marca o ID como concluído antes de reduzir o saldo, impedindo uma segunda devolução inclusive se uma operação seguinte falhar. Custo observado superior à reserva registra a diferença e aciona bloqueio persistente para análise. Uma resposta inválida com uso conhecido ainda é cobrada conforme o uso informado, pois a geração aconteceu.

Cada IP possui limite de quatro consultas por minuto de calendário e doze por dia UTC. Usa-se HMAC do IP, sem gravar o IP bruto, a pergunta ou a resposta. O adaptador aceita exclusivamente a Vercel e um IP único válido em `x-forwarded-for`, que a plataforma sobrescreve. Outro proxy/host precisa de adaptação explícita; não se aceita uma cadeia arbitrária enviada pelo visitante. [Cabeçalhos de requisição da Vercel](https://vercel.com/docs/headers/request-headers).

IDs são mantidos por 45 dias; contadores por minuto/dia expiram. O hash financeiro não expira. Repetir um ID já recebido retorna `in_progress` e não inicia outra geração. Não armazenamos respostas para recuperar uma resposta perdida; uma nova consulta deve ser uma ação explícita com novo ID.

## Configuração sem exposição de segredos

O `HANDOFF.md` registra a exposição de duas chaves Anthropic em 19/10/2026. **Não reutilizar nenhuma chave desse incidente.** Revogar as antigas e fornecer uma chave nova, restrita ao workspace do projeto, diretamente nas configurações seguras da Vercel. Não colocar chaves em chat, logs, arquivos versionados, variável `NEXT_PUBLIC_*` ou no navegador.

Variáveis do servidor:

| Nome | Uso |
| --- | --- |
| `ANTHROPIC_API_KEY` | Chave nova do workspace Anthropic |
| `ASSISTANT_ENABLED` | Somente o valor literal `true` habilita |
| `UPSTASH_REDIS_REST_URL` ou `KV_REST_API_URL` | URL HTTPS REST do Redis dedicado |
| `UPSTASH_REDIS_REST_TOKEN` ou `KV_REST_API_TOKEN` | Token com permissão de escrita/EVAL; não usar o token somente leitura |
| `ASSISTANT_RATE_LIMIT_SECRET` | Segredo aleatório com pelo menos 32 caracteres para HMAC |

As variáveis Upstash explícitas têm precedência sobre os aliases da integração Vercel. Preview e Production devem apontar para **a mesma base** financeira. Usar Redis dedicado com evicção desativada. O `VERCEL=1` é fornecido pela plataforma; não configura uma rota pública de teste local.

**A base deste projeto já está inicializada; não repetir sua criação.** Para uma base nova, inicializar uma única vez a chave `bc:{assistant}:ledger`, sem TTL. O comando abaixo funciona em um cliente Redis que preserve o argumento Lua inteiro. Ele é idempotente: se a chave existir, apenas lê os três campos; não zera gastos:

```text
EVAL "if redis.call('EXISTS',KEYS[1])==0 then redis.call('HSET',KEYS[1],'schema','1','limitMicros','20000000','blocked','0'); return 'initialized' end; return redis.call('HMGET',KEYS[1],'schema','limitMicros','blocked')" 1 "bc:{assistant}:ledger"
```

Resultado esperado: `initialized`; nas execuções seguintes, `1`, `20000000`, `0`. Não executar `DEL`, `FLUSHDB`, recriar o hash ou reduzir seus campos de gastos como forma de “destravar” consultas. Se a base for perdida, restaurar o ledger e reconciliar cobranças antes de habilitar; o código recusa uma base sem inicialização.

Na configuração de 20/10, o REPL da integração Vercel separou incorretamente os argumentos do comando `EVAL` colado e o rejeitou. A inicialização foi concluída somente após confirmar `HGETALL` vazio, usando `HSETNX` separado para os três campos, seguido do `HMGET` acima. Isso não testou os scripts financeiros da aplicação: o cliente REST envia um array JSON de argumentos, sem depender do parser desse REPL.

Verificação somente leitura:

```text
HMGET "bc:{assistant}:ledger" schema limitMicros blocked
HGET "bc:{assistant}:ledger" "spent:2026-10"
```

A chave e a ativação já foram concluídas, com os testes reais descritos no início deste documento. Permanecem sem auditoria nesta atualização o saldo atual, o faturamento e o limite independente do workspace Anthropic. Para uma nova conferência autorizada, registrar o pedido, verificar as fontes e comparar seu uso/cobrança com o ledger, sem resetar o histórico financeiro. Não considerar o GET uma prova de saldo ou qualidade da resposta. Rever o cálculo de orçamento e os testes antes de alterar modelo, preço ou recursos cobrados.

## Testes executáveis

Resultados já obtidos em 20/10/2026, antes da separação da entrega em PR:

| Verificação | Resultado e limite |
| --- | --- |
| `assistant.test.ts` | 19 testes aprovados, com dados bíblicos reais e provedor simulado |
| Scripts Lua de produção | Seis cenários aprovados em Lua 5.1 local, incluindo 100 reservas concorrentes; 18 reservas de US$1,10 aceitas, total US$19,80, e 82 recusadas |
| TypeScript e ESLint do backend | Aprovados; sem declaração explícita de `runtime` na rota, compatível com `cacheComponents` |
| Rota local indisponível | GET HTTP 200 com `available:false`; POST HTTP 503 com `unavailable`; respostas `no-store`, sem chamada ao provedor |
| Interface em Edge | Dez passagens, três modos, seleção de texto/imagem/link e estado indisponível conferidos; sem overflow em 375 px e desktop |

A [evidência inicial de interface](evidence/assistant-qa.json) é histórica: naquela rodada não foi obtida resposta real do modelo; apresentação de respostas, navegação das cenas e retry foram revisados no código. A rodada real posterior de Preview conferiu respostas dos três modos e navegação das três cenas, conforme o registro no início deste documento. A síntese de voz foi detectada, mas reprodução audível não foi confirmada nessas evidências. A [verificação da crítica local](../design/local-ai/gemma-study-companion-verification.md) distingue sugestões do modelo local de achados efetivamente reproduzidos, incluindo a correção da entrada `mode` como array antes de chegar ao provedor.

Na pasta `site`:

```text
npx vitest run tests/assistant.test.ts
npx tsc --noEmit
npx eslint src/lib/assistant src/app/api/assistente tests/assistant.test.ts
```

Os testes verificam dados BLIVRE reais, ligações canônicas, entrada e tamanho, configuração fechada, rejeição de citações inventadas, três cenas, contrato do provedor, pensamento não exposto, erros sem repetição, reserva antes da chamada e ausência de devolução após falha ambígua.

`site/scripts/test-assistant-ledger.py` executa **os próprios scripts Lua de produção em Lua 5.1**, usando `lupa` instalado numa pasta temporária externa ao repositório. O harness fornece apenas comandos Redis em memória e serialização; não substitui uma verificação do serviço Upstash. Cenários: 100 concorrentes, teto, duplicatas, devolução única, dados ausentes/corrompidos, falha parcial, bloqueio por custo inesperado, virada de mês e limites por visitante.

```text
python -m pip install --target <pasta-temporaria> lupa
python site/scripts/test-assistant-ledger.py <pasta-temporaria>
```

O backend não inclui logs de perguntas, respostas, chaves ou erros privados. Ao pedir um estudo, pergunta e passagens são enviadas à Anthropic; essa transmissão deve ficar clara na interface. Manter as fontes e o aviso de interpretação junto da resposta.
