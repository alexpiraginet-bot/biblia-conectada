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

O script externo só carrega após consentimento em `/sobre#audiencia`. A contagem própria é independente. Não há Google Signals, personalização, remarketing ou listas baseadas em crenças. A revogação desliga a tag e remove cookies `_ga` acessíveis ao site. A configuração do fluxo deve manter **Medição otimizada desligada**, pois eventos automáticos poderiam enviar URLs e títulos que este app evita.

Eventos definidos: `page_view` e `visible_30_seconds`. Contexto de página é substituído por `/area/<categoria>` e título genérico; buscas e referências bíblicas não são enviadas. Consentimento do Google não representa consentimento para publicidade personalizada.

Configurar a tag não concede ao servidor acesso à API de relatórios do Google. O painel apresenta métricas próprias e sinaliza essa distinção. Para conferir os relatórios oficiais no assistente, concluir a autorização do conector e selecionar a propriedade correta. Não copiar credenciais pessoais para o código.

## Rascunho de pesquisa patrocinada

**Não ativado. Sem orçamento aprovado ou gasto iniciado.**

Objetivo: levar pessoas que já buscam uma Bíblia ou a liturgia para a página correspondente. Começar na Rede de Pesquisa, Brasil, português, intenção por palavras-chave. Não segmentar religião presumida de pessoas; não usar Customer Match/remarketing.

| Grupo | Destino | Termos iniciais (frase/exata) |
| --- | --- | --- |
| Bíblia online | `/ler?utm_source=google&utm_medium=cpc&utm_campaign=bible_search` | bíblia online; ler a bíblia; bíblia com conexões |
| Liturgia diária | `/liturgia?utm_source=google&utm_medium=cpc&utm_campaign=liturgy_search` | liturgia diária; leituras de hoje; evangelho do dia |

Rascunhos para anúncios responsivos (sem superlativos não comprovados):

**Bíblia online** — títulos: `Bíblia Conectada`, `Leia. Descubra. Conecte.`, `Explore Conexões Bíblicas`. Descrições: `Leia a Bíblia e descubra conexões entre passagens. Um novo caminho de estudo.` / `Explore arcos, mapas e cronologia. Comece pela passagem que toca seu coração.`

**Liturgia diária** — títulos: `Liturgia Diária`, `Leituras Para o Seu Dia`, `Bíblia Conectada`. Descrições: `Encontre as leituras do dia, siga suas conexões e reserve um tempo para a Palavra.` / `Leitura simples, referências e conexões. Explore o texto em seu contexto.`

Links adicionais: Coração, Conexões, Cronologia e Liturgia. A edição para estudo deve continuar identificada na página; não anunciar texto litúrgico oficial licenciado sem autorização.

Próximo passo: vincular a conta Google Ads correta, conferir conversões sem duplicidade e revisar termos/correspondências com Keyword Planner. Somente então apresentar a Alex o orçamento diário, estratégia de lance e limite de CPC para aprovação. Nenhuma promessa de primeira posição ou de superar a Canção Nova: a posição depende do leilão e da qualidade/relevância.

## Operação e validação

Variáveis: `AUDIENCE_ENABLED`, `AUDIENCE_ADMIN_PASSWORD_HASH` (sensível), `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` (público); KV e segredo de rate limit existentes. Chave de administração local fora do repo, com ACL restrita. Mudanças de ambiente exigem novo deploy.

`tests/audience.test.ts`: validação, privacidade, autenticação, limites, CSV e hashes. Teste real do Lua é opt-in com `AUDIENCE_INTEGRATION=1`, usa namespace aleatório `audience-qa`, confere virada do dia e remove somente suas próprias chaves. As credenciais sensíveis da Vercel não são exportáveis por `env run`; a integração é verificada no build de prévia, onde elas já estão disponíveis. Não criar endpoint de reset ou teste na produção.

Fontes consultadas em 01/11/2026:
- [Configuração oficial do GA4](https://support.google.com/analytics/answer/9304153?hl=pt-BR)
- [Consent Mode básico](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [Classificação dos anúncios](https://support.google.com/google-ads/answer/1722122/about-ad-position-and-ad-rank?hl=en-GB)
- [Categorias sensíveis e personalização](https://support.google.com/adspolicy/answer/16701958?hl=en)
