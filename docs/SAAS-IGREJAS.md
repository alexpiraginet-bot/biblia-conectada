# Bíblia Conectada para Igrejas — proposta de produto

Data: 31/10/2026. Estado: proposta pesquisada, HTML interativo e fundação de backend validada localmente; não é um SaaS comercial completo nem uma promessa de aprovação nas lojas. Nome de trabalho, sem pesquisa de disponibilidade de marca. Implementação, evidências e limites em [SAAS-ENTREGA.md](SAAS-ENTREGA.md).

## Tese

Uma plataforma que une a vida da igreja ao estudo da Bíblia durante toda a semana. A igreja administra sua presença digital; a pessoa encontra a comunidade, acompanha sua programação e continua aprendendo pelas passagens reais. A vantagem que já temos é o núcleo de leitura, conexões, mapas, cronologia, interlinear, liturgia, IA com referências e compartilhamento.

Experiência principal: mensagem de domingo → passagens citadas → conexões bíblicas → plano da semana → próxima atividade da igreja. A liderança prepara ou aprova o plano antes de publicar; sugestões de IA permanecem identificadas como assistência, com referências e fontes distintas.

## Referências e o que aproveitar

Pesquisa em páginas oficiais; funcionalidades descritas pelos fornecedores, sem teste de contas administrativas ou benchmark de desempenho.

| Referência | Prática escolhida | Aplicação nossa |
| --- | --- | --- |
| [Church Center](https://www.planningcenter.com/church-center) e [configuração](https://help.planningcenter.com/en/179950-set-up-church-center-and-publishing.html) | App do membro separado da administração; páginas por blocos; rascunho/publicação; entrada na igreja por QR. | Conhecer sem cadastro, igreja pré-selecionada, editor com prévia e publicação controlada. |
| [Subsplash](https://www.subsplash.com/product/custom-church-apps) | Conteúdo centralizado distribuído entre canais e mensagens ligadas às passagens. | Uma publicação alimenta app e site; sermão/homilia abre os textos e conexões da Bíblia Conectada. |
| [InPeace](https://inpeaceapp.com/) e [pagamentos](https://help.inpeaceapp.com/pt-BR/articles/15649607-quem-e-o-asaas-e-qual-e-o-papel-dele-nos-pagamentos-da-inpeace) | Operação brasileira, administração, Pix e conta financeira vinculada à igreja. | PSP recebe para a igreja; campanhas e conciliação separadas da assinatura do nosso SaaS. |
| [YouVersion para igrejas](https://www.youversion.com/churches) | Perfil da igreja, planos e atualizações próximos da leitura bíblica. | Jornada semanal ligada à comunidade, com nossos grafos, mapas e estudo contextual. |

Usar padrões de organização e interação; criar nossa identidade, textos e componentes. Não copiar assets, marcas, conteúdo protegido ou código desses serviços.

## Duas ofertas, um núcleo

1. **Comunidade:** espaço personalizado dentro do app principal e na web. Logo, cores, conteúdo, equipe e link próprios. A pessoa entra por QR ou convite já na igreja; pode escolher outra comunidade conscientemente. Menor custo de operação e publicação.
2. **Marca própria:** app separado com nome, ícone, ficha e conta de publicação da igreja, quando houver conteúdo e experiência suficientes. Mesmo motor e componentes, configuração por cliente e builds separados, sem copiar repositórios. Inclui manutenção, testes e acompanhamento de loja como serviço premium.

A Apple exige que apps de serviços de templates sejam submetidos pelo provedor do conteúdo e admite uma alternativa agregada em um app; o Google restringe experiências repetitivas. Trocar apenas logo e cor não garante aprovação. Contas separadas não eliminam a exigência de valor próprio. [Apple 4.2.6](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), [Google](https://support.google.com/googleplay/android-developer/answer/9899034/spam?hl=en-GB).

A primeira oferta pode nascer com a primeira igreja; a segunda passa por piloto e revisão de loja antes de ser vendida como entrega garantida.

## App da comunidade

Navegação proposta: **Hoje · Bíblia · Agenda · Comunidade · Mais**. Doação é ação voluntária contextual, não o centro obrigatório da navegação. Vidro e transparência como acabamento, com fundo suficiente para leitura, rótulos claros, fonte ampliável, movimento reduzido e controles nativos. Manter navegação previsível; reduzir elementos na leitura sem esconder o caminho de retorno. [Apple: tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars).

| Área | Conteúdo e ações |
| --- | --- |
| Hoje | Identidade da igreja, próximo encontro e horário, continuar leitura, mensagem da semana, avisos relevantes. |
| Bíblia | Leitura e edições identificadas, conexões e 3D, mapas, cronologia, interlinear, liturgia opcional, IA com fontes, favoritos e áudio. |
| Agenda | Cultos/missas/encontros conforme configuração, endereço, rota, inscrição e adicionar ao calendário. |
| Mensagens | Séries, sermões/homilias em áudio/vídeo, passagens citadas, notas pessoais e plano semanal aprovado. |
| Comunidade | Apresentação, líderes/contatos públicos autorizados, ministérios/grupos e pedido de participação. |
| Campanhas | Finalidade, prazo, responsável, recebedor, Pix e prestação de contas; total somente de pagamentos confirmados. |
| Minha caminhada | Progresso privado, planos e conquistas por aprendizado. Nenhum ranking de fé, doações ou exposição das reflexões. |

Home por contexto: visitante vê como chegar, horários e acolhimento; membro pode retomar leitura e inscrições. Não obrigar login para conteúdo público. Pedir conta ao salvar/sincronizar, participar ou acessar informação privada. Preferências e consentimentos explícitos para notificações; mensagens de oração nunca aparecem detalhadas na tela bloqueada. [Apple: notifications](https://developer.apple.com/design/human-interface-guidelines/notifications), [onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding).

## Painel da igreja

Administração web responsiva, utilizável também no celular. Editor guiado por blocos em vez de uma tela livre que permita quebrar layouts. Prévia de celular, rascunho, aprovação, agendamento, publicação e histórico/restauração.

- **Identidade e presença:** nome, logo, paleta com contraste validado, endereço, horários, contatos, domínio e módulos habilitados.
- **Conteúdo:** avisos, notícias, agenda, séries, mensagens, passagens citadas, planos semanais, mídia e capas sociais.
- **Comunicação:** públicos consentidos, prévia do push, agendamento, limites de frequência e registro de envios; uma publicação alimenta web e apps.
- **Campanhas:** cadastro de objetivo e prazo, PSP/conta verificada, conciliação, histórico de alteração do recebedor, comprovantes e prestação de contas. Troca de conta/Pix com autenticação reforçada e aprovação separada.
- **Equipe:** administrador, comunicação/editor, financeiro, liderança de grupo e suporte; permissões por função, não uma senha compartilhada.
- **Relacionamento:** solicitações de participação e contato, agenda pastoral quando houver equipe responsável. Pedidos privados com acesso restrito; não são feed público por padrão.
- **Indicadores:** alcance, inscrições, leitura agregada e andamento das campanhas. Não mostrar conversas de IA, notas pessoais ou lista de quem “tem pouca fé”.

## Painel da plataforma

Nossa equipe administra igrejas, unidades, planos, contrato, cobrança do SaaS, domínios, contas de publicação, versões do app, funcionalidades habilitadas, armazenamento e cotas de IA. Monitorar erros e entregas de notificações por cliente. Acesso excepcional de suporte exige motivo, prazo e auditoria. Suspensão de contrato não apaga dados automaticamente: prever exportação e retenção contratual.

## Arquitetura recomendada

Começar com monólito modular e banco relacional, evitando uma frota de microsserviços no MVP. PostgreSQL com isolamento por igreja, políticas de acesso no banco e validação no servidor; storage privado com URLs temporárias, fila para notificações e tarefas, cache com chave de igreja/edição/versão.

Camadas:

- **Catálogo bíblico compartilhado:** corpus e licenças preservados, IDs de referência/edição, conexões e índices; não duplicar a Bíblia por igreja.
- **Domínio da igreja:** `churches`, `campuses`, `memberships`, `roles`, `posts`, `events`, `sermons`, `campaigns`, `payment_events`, `notification_preferences`, `audit_events`.
- **Conta e pertença:** identidade global com vínculos explícitos por igreja. Escolher uma igreja não autoriza acessar suas áreas privadas. Administrador financeiro não recebe automaticamente permissão para pedidos pastorais.
- **APIs versionadas:** cliente web e apps usam contratos comuns; credenciais de provedores ficam no servidor. Sessão móvel deve ser projetada com tokens seguros e revogação, não reaproveitando cookies anônimos como autenticação de membros.
- **Aplicativos:** React Native/Expo é candidato para compartilhar interface iOS/Android e aproveitar TypeScript. Antes de substituir qualquer trabalho nativo, auditar o app real do Mac e validar uma tela de leitura, áudio, push, QR e o 3D em aparelhos. JSX do Next não vira interface nativa automaticamente. [React Native](https://reactnative.dev/docs/getting-started), [variantes Expo](https://docs.expo.dev/build-reference/variants/).
- **Configuração de marca:** nomes, assets, tema, módulos, links e IDs por cliente. Um sistema de builds assina cada distribuição com a identidade correta; nenhum segredo no pacote de configuração público.

O servidor resolve a igreja a partir de host verificado ou prefixo `/i/slug`, confirma a autorização da sessão e aplica escopo aos dados. Nunca confiar apenas em `tenant_id` enviado pelo app. Testar com duas igrejas desde o primeiro CRUD para detectar vazamento entre clientes, inclusive arquivos, cache, jobs e relatórios.

## O que precisa mudar no código atual

Hoje há identidade/URL globais, links de loja por variáveis de ambiente, uma configuração de associação nativa e estado anônimo de Jornada/IA. Essas peças não constituem autenticação, painel ou isolamento entre igrejas.

1. Extrair domínio bíblico, contratos e tokens visuais compartilháveis, preservando traduções e sua proveniência.
2. Introduzir contexto de igreja e APIs de conteúdo/publicação. Estado global de leitura privada não é transferido silenciosamente para uma comunidade.
3. Acrescentar autenticação, vínculos, autorização, banco, auditoria e limites por cliente antes de liberar administração.
4. Fazer identidade, manifestos, metadados sociais, QR e instalação reconhecerem a igreja. QR conserva igreja, página, edição e referência.
5. Para app compartilhado, links `/i/slug/...`; para marca própria, domínio dedicado preferencial, AASA/assetlinks e loja da igreja. Não associar todos os aplicativos a todas as rotas do domínio. Os links bíblicos globais continuam destinados ao produto global.

## Pix, privacidade e IA

O dinheiro deve ir à conta da igreja por um PSP habilitado; o SaaS cobra sua assinatura separadamente. Chave Pix estática/copiar código não comprova pagamento. A evolução para acompanhamento automático exige cobrança identificada, webhook autenticado, idempotência, conciliação e tratamento de estorno. Não creditar progresso da campanha a partir de captura de comprovante enviada pelo cliente.

O fluxo dentro de cada loja precisa ser aprovado para a modalidade real de arrecadação. No iOS, a coleta interna tem condições para organizações aprovadas; fora dessas condições, a diretriz prevê arrecadação fora do app gratuito. No Google há exceção de billing para doações isentas. Não tratar esses casos como autorização automática para qualquer igreja ou para vender conteúdo digital via Pix. [Apple 3.2](https://developer.apple.com/app-store/review/guidelines/#other-business-model-issues), [Google Payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

Filiação e convicção religiosa são dados sensíveis na LGPD. O desenho exige minimização, finalidade/base legal apropriada, controle de acesso, retenção/exclusão e contrato definindo responsabilidades; login Google não substitui esse trabalho. [ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes). Cadastro infantil, aconselhamento e prontuários pastorais ficam para uma etapa específica com governança adequada.

IA: duas fontes distinguíveis — Bíblia e materiais autorizados da igreja — com citação e revisão editorial para conteúdo publicado. Não representar respostas como fala de Deus ou da liderança. Não usar conversas privadas para marketing, campanhas ou treinamento compartilhado. Orçamento de texto/voz por cliente; franquia e limites transparentes, sem plano ilimitado antes de medir custo real.

## Modelo comercial

Membro acessa gratuitamente. A igreja contrata implantação e assinatura B2B; contratação/gestão no painel web, com revisão da apresentação nas lojas. Não há preço validado nesta proposta.

| Oferta | Escopo |
| --- | --- |
| Comunidade | Espaço no app principal + web, identidade, agenda, avisos, Bíblia, mensagens e campanhas. |
| Crescimento | Publicação/aprovação avançada, equipes, unidades, inscrições, planos guiados e cotas maiores. |
| Marca própria | Aplicativos exclusivos, domínio, contas da igreja, pipeline de publicação, testes e manutenção adicional. |

Cobrar adicionais por unidades, armazenamento, uso de IA/voz e serviços operacionais conforme custos medidos. Recomendo receita recorrente do software sem comissão nossa sobre dízimos/doações; taxas do PSP transparentes. Customizações devem virar módulos reutilizáveis quando fizer sentido, sem manter uma branch divergente por cliente.

## Sequência de entrega

1. **Protótipo e igreja piloto:** validar Hoje, Agenda, Mensagem e Campanha com pessoa visitante e equipe administrativa. Testar publicação em prévia de celular. Auditar o código nativo do Mac.
2. **Fundação SaaS:** duas igrejas de teste, identidade, login/equipe, permissões, isolamento e CRUD de agenda/avisos/mensagens; editor com prévia e publicação. Critério: editor altera uma igreja e nenhuma informação aparece na outra.
3. **MVP operacional:** QR/contexto, favoritos sincronizados, mídia por provedores existentes, notificações consentidas, campanhas com recebedor verificado e fluxo de pagamento compatível. Critérios: conteúdo publicado chega no canal certo; webhook duplicado não duplica pagamento; push abre o item correto.
4. **Piloto nativo:** leitura, áudio, calendário, push, links e acessibilidade em aparelhos; testar retorno após instalar, indisponibilidade de rede e permissões negadas. Preparar fichas e revisão das lojas.
5. **Marca própria:** automatizar configuração, assets, assinatura, builds e QA depois que a operação piloto estiver estável. Cada app exclusivo tem conteúdo real e avaliação de conformidade própria.

Fora do MVP: contabilidade/folha, ERP completo, chat aberto irrestrito, streaming próprio, TV/carro, check-in infantil e automações pastorais que decidam sem responsável humano. Medir ativação da igreja, facilidade de publicar, retorno semanal, utilidade do estudo e custo por cliente antes de ampliar.
