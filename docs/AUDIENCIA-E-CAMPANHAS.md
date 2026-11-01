# Audiência e campanhas — 01/11/2026

## Painel do projeto

`/admin` é a entrada privada. O HTML inicial contém somente a tela de acesso. As consultas, CSV e JSON exigem sessão válida de administração. **Manter conectado** vem marcado: sessão de até 30 dias; desmarcado, até oito horas. Cookie HttpOnly/Secure/SameSite=Strict, sessão revogável no Redis. **Segurança** permite trocar a senha e cadastrar chaves de acesso com a biometria do aparelho. A senha inicial aleatória continua válida até a troca; depois, só o novo hash scrypt é aceito. Nenhuma senha em git, URL ou armazenamento do site. [Operação e limites](SEGURANCA-DO-PAINEL.md).

O backend reutiliza o Redis da Jornada em namespace separado `bc:{audience}:<ambiente>:`. Os pontos dos leitores não são audiência, e não são usados no relatório. Nenhuma nova assinatura de infraestrutura foi criada.

- Visualização: abertura de uma rota elegível; recargas podem contar novamente.
- Atenção: página mantida visível por 30 segundos. Não significa leitura concluída.
- Dimensões: dia em America/Sao_Paulo, categoria da página, origem geral e campanha de uma lista fechada.
- Não coletar: passagem escolhida, texto de busca, conversa, nome/e-mail, URL completa, UTM livre, gclid ou identificador persistente de visitante.
- Nonce por visualização: deduplicação/tempo mínimo, TTL de uma hora; não liga pessoas entre páginas. Limite por IP usa HMAC rotativo por minuto, TTL de 120 segundos, sem IP no relatório.
- DNT/GPC, automação de teste e bots conhecidos excluídos. Bloqueadores e falhas limitam cobertura; isso não constitui detecção completa de fraude.
- Contadores diários por 400 dias; máximo de 25.000 eventos aceitos/dia. Excesso aparece como cobertura parcial. Aumentar somente após avaliar capacidade/custo do serviço existente.
- Visitantes únicos e recorrentes são **não medidos** nos contadores próprios. Não renomear visualizações como pessoas.
- Nenhum histórico retroativo inventado. Dias antes do primeiro evento ficam sem cobertura. Uma indisponibilidade devolve erro, nunca zeros fabricados.

CSV/JSON têm período, fuso, origem, início de coleta, metodologia e horário de geração. SHA-256 identifica a versão; **não é auditoria independente**. Para parceiros, anexar também os relatórios oficiais do GA4 e de mídia quando disponíveis. Impressões futuras de anúncios no site precisarão de instrumentação específica; não confundir uma visualização de página com uma impressão visível de anúncio.

## Google Analytics

Conta escolhida por Alex: `alex.piragine@gmail.com`.
Propriedade criada pelo usuário: Bíblia Conectada. Identificador enviado: `G-M3ELNBD0GH`.

O script externo só carrega após consentimento. Um convite discreto na primeira visita oferece contagem básica, Analytics ou Analytics e campanhas; a escolha continua disponível em `/sobre#audiencia`. A contagem própria é independente. Não há Google Signals, personalização, remarketing ou listas baseadas em crenças. A revogação remove cookies `_ga` e `_gcl_` acessíveis e recarrega a página para interromper a biblioteca já carregada. DNT/GPC e automação continuam excluídos. A configuração do fluxo deve manter **Medição otimizada desligada**, pois eventos automáticos poderiam enviar URLs e títulos que este app evita.

Eventos definidos: `page_view` e `visible_30_seconds`. Contexto de página é substituído por `/area/<categoria>` e título genérico; buscas e referências bíblicas não são enviadas. Consentimento do Google não representa consentimento para publicidade personalizada.

A medição Google só é habilitada em builds com `VERCEL_ENV=production`; prévias e desenvolvimento não enviam eventos ao Google. O relatório GA4 filtra `hostname=www.bibliaconectada.company`, excluindo diagnósticos locais e outros hosts. Em 01/11, um teste local consentido recebeu HTTP 204 para `page_view`, com categoria genérica e sem conversão Ads; esse evento de diagnóstico não representa audiência pública e fica fora desse filtro.

Configurar a tag não concede ao servidor acesso à API de relatórios do Google. O conector do assistente reconheceu a propriedade `561809611` e a conta Ads `625-087-8348`, de `alex.piragine@gmail.com`. A consulta GA4 em 01/11 ainda retornou sem linhas: isso não é prova de zero pessoas.

`/api/admin/marketing` consulta o Windsor somente após autenticação de administração. `WINDSOR_API_KEY` fica exclusivamente no ambiente do servidor; `GA4_PROPERTY_ID`, `GOOGLE_ADS_CUSTOMER_ID` e `GOOGLE_ADS_CAMPAIGN_ID` fixam o escopo. Não há seletor público de contas, endpoint de escrita em anúncios ou key no navegador. O servidor usa HTTPS sem redirects e não registra a URL autenticada nem mensagens brutas do provedor. A consulta não força atualização paga nem muda o plano existente.

O painel separa usuários ativos distintos do GA4, sessões, visualizações GA4, cliques, impressões, gasto e conversões Ads dos contadores próprios. Usuários são consultados para o período inteiro, sem dimensão diária; somar usuários diários duplicaria pessoas. A campanha é filtrada por ID para não misturar outros negócios da conta. Cache de dez minutos, limite compartilhado de consultas e última leitura preservada em falhas, com data e aviso. Processamento e cache do Google/Windsor podem atrasar os dados. Resposta vazia é “Aguardando dados”; erro não é transformado em zero. O JSON privado de Google inclui fonte, período, horário e SHA-256.

## Teste de pesquisa patrocinada autorizado

Alex autorizou cinco dias, média de R$20/dia, total R$100, Liturgia e Evangelho e inclusão de domingo. Pix de R$100 confirmado na interface de faturamento. Campanha `24419681243`, **BC | Liturgia e Evangelho | Teste 5 dias | R$100**, criada e habilitada para **04–08/11/2026** inclusive, em horário de Brasília. Orçamento **total da campanha de R$100**, não orçamento diário sujeito a multiplicação. CPC máximo R$2,80; maximizar cliques. Em 01/11, estado `ENABLED` / `PENDING`, anúncios em análise. Não confundir programada com já exibida.

Rede de Pesquisa Google, somente Brasil por presença, português. Parceiros de pesquisa e Display desligados; AI Max e expansão automática de URL/texto desligados. Sem públicos, Customer Match ou remarketing. A inclusão de domingo testa a hipótese de demanda apontada por Alex, sem presumir o resultado.

| Grupo | Destino | Termos iniciais (frase/exata) |
| --- | --- | --- |
| Liturgia diária (`207410666291`) | `/liturgia?utm_source=google&utm_medium=cpc&utm_campaign=liturgy_search` | liturgia diária; liturgia de hoje; leituras de hoje |
| Evangelho do dia (`203238088522`) | `/liturgia?utm_source=google&utm_medium=cpc&utm_campaign=liturgy_search#gospel-1` | evangelho do dia; evangelho de hoje; evangelho diário |

Cada termo tem uma correspondência exata e outra de frase (12 critérios). Negativas: pdf, download, mp3, cifra, cifras, partitura, emprego, vagas; frase “missa ao vivo”. Recursos: Leitura gratuita, Conexões bíblicas, Ler no contexto e Conexões bíblicas. Anúncios identificam a Bíblia Livre como texto de estudo; não prometem texto oficial licenciado.

Tag Google Ads pública: `AW-18519314069`. Conversão “Visualização de página”, ação `7885384940`, destino `AW-18519314069/L6pdCOzZhbAdEJWd2f5E`, conferido no fragmento oficial. Contagem **Uma conversão** por clique e **sem valor monetário**. Conversões otimizadas não configuradas. Uma visita não é compra, doação ou receita.

`audience-v2.js` usa um carregador Google compartilhado, destinos explícitos e opt-in de campanhas separado da permissão antiga de Analytics. Consentimento padrão negado; personalização sempre negada. A conversão só é emitida depois da permissão de campanhas, em visita identificada como Google Ads e área pública elegível, uma vez por documento. Coração, busca, jornada e administração não configuram Ads. O contexto enviado é a categoria, sem URL real, texto da passagem, busca ou mensagem. A política informa que o Google pode usar o identificador de clique para atribuição após permissão.

O link do anúncio de Evangelho usa uma âncora existente. O componente de atualização da liturgia reposiciona a chegada depois do streaming, para abrir a seção certa na primeira navegação.

Nenhuma promessa de primeira posição ou de superar a Canção Nova: a posição depende do leilão e da qualidade/relevância. Aprovação dos anúncios e detecção da tag pelo Google são etapas externas, separadas de publicação do código.

## Operação e validação

Variáveis: `AUDIENCE_ENABLED`, `AUDIENCE_ADMIN_PASSWORD_HASH` (sensível), `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` (identificadores públicos), `WINDSOR_API_KEY` (sensível), `GA4_PROPERTY_ID`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_CAMPAIGN_ID`; KV e segredo de rate limit existentes. Chaves fora do repo. Mudanças de ambiente exigem novo deploy. A conexão do assistente não instala automaticamente a credencial do servidor; conferir o estado real no registro de publicação.

`tests/audience.test.ts`: validação, privacidade, autenticação, limites, CSV e hashes. Teste real do Lua é opt-in com `AUDIENCE_INTEGRATION=1`, usa namespace aleatório `audience-qa`, confere virada do dia e remove somente suas próprias chaves. As credenciais sensíveis da Vercel não são exportáveis por `env run`; a integração é verificada no build de prévia, onde elas já estão disponíveis. Não criar endpoint de reset ou teste na produção.

Fontes consultadas em 01/11/2026:
- [Configuração oficial do GA4](https://support.google.com/analytics/answer/9304153?hl=pt-BR)
- [Consent Mode básico](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [Classificação dos anúncios](https://support.google.com/google-ads/answer/1722122/about-ad-position-and-ad-rank?hl=en-GB)
- [Categorias sensíveis e personalização](https://support.google.com/adspolicy/answer/16701958?hl=en)
- [Google Tag com Google Ads e conversão](https://support.google.com/google-ads/answer/7548399?hl=en)
- [API Windsor, cache e autenticação](https://windsor.ai/api-documentation/)
- [Critérios de relatórios e usuários distintos do GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/reporting-data-expectations)
