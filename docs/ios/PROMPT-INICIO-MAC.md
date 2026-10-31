# Prompt para iniciar no Mac

Cole o texto abaixo na nova sessão do Codex aberta no checkout do projeto no Mac. O handoff e os scripts estão no branch `codex/ios-native-app` do repositório `alexpiraginet-bot/biblia-conectada`.

---

Você vai continuar a criação do **app iOS nativo Bíblia Conectada**, com objetivo de distribuí-lo publicamente na App Store. Eu já confirmei que este Mac remoto está disponível. A direção visual e a implementação são suas: quero um aplicativo bonito, moderno, interativo e legível, com nossa marca bordô/dourado, e não somente o site empacotado.

Comece lendo `AGENTS.md`, o `CLAUDE.md` completo e os documentos obrigatórios que ele aponta. Depois leia:

- `docs/ios/HANDOFF-IOS-MAC.md`
- `docs/ios/ARCHITECTURE.md`
- `docs/ios/XCODE-MCP.md`

Confirme repositório, branch e alterações locais antes de editar. A base web usada na preparação é `ddc6909`, PR #42; o último commit do branch incluirá estes documentos. **Ainda não foi criado código iOS nem feito build, assinatura, upload ou teste no Mac.** Não apresente a preparação no Windows como aplicação pronta.

**Existe outro aplicativo no TestFlight. Não o altere.** Faça inventário somente leitura para distinguir projeto, Bundle ID, Team ID e registro. Crie a Bíblia Conectada separadamente em `apps/ios/`. Se a identidade para assinatura continuar desconhecida, avance no Simulator e na implementação sem mexer no app antigo.

Execute primeiro `bash scripts/ios/preflight.sh`. Depois use `bash scripts/ios/setup-mcp.sh` e o documento XCODE-MCP para conectar o MCP oficial do Xcode e o MobileBuildMCP 2.7.1 já fixado no lockfile. Confirme as ferramentas reais e o projeto/scheme da sessão; arquivos de configuração não provam conexão. Preserve configurações existentes diferentes e faça uma mesclagem controlada se necessário. Não reinstale tudo por padrão nem apague simuladores de outros trabalhos.

A decisão inicial é **SwiftUI + backend existente**, com dados BLIVRE completos no bundle. O primeiro incremento precisa rodar no Simulator com leitor offline, busca local, favoritos/última leitura, conexões reais e compartilhamento nativo. **Eu já escolhi Open NBV no site: integre também sua leitura integral e seleção persistida antes de declarar paridade pública.** Preserve a edição em favoritos, links, IA, voz e partilha, com créditos e numeração próprios. Uma beta técnica só BLIVRE deve declarar esse escopo incompleto. Crie testes úteis do corpus e das interações. Em seguida integre Hoje/liturgia com cache por data, exploração e os demais módulos. O 3D pode usar WebKit restrito, sob demanda; o restante precisa ter valor nativo real. Não crie abas vazias para aparentar funções prontas.

Use a marca e as fontes/licenças atuais. Preserve cada texto bíblico, edição, crédito e contagem. Os dados gerados podem precisar de `npm ci` e `npm run data` em `site/`; não editar `estudos/` nem baixar intermediários de vídeos. O contrato dos JSON tem chaves em português e está detalhado na arquitetura. Não misture numeração Open NBV com o grafo BLIVRE. Interlinear é coleção inicial, não tradução exata ou completa. Liturgia usa calendário/referências de origem católica e texto de estudo BLIVRE, mantendo indicação de fonte e diferenças para o lecionário.

**IA de texto continua na Anthropic do servidor; a voz usa o adaptador de voz do servidor, incluindo OpenAI.** Nenhuma chave de provedor pode ir para o app, Keychain do usuário, plist ou logs. POSTs atuais têm guarda de origem e não são endpoints nativos prontos: implemente uma fronteira mobile apropriada reutilizando o orçamento e a validação, sem remover CSRF/CORS ou falsificar origem para contornar proteção. Obtenha consentimento claro antes de enviar perguntas e antes de ativar envio para voz. A reflexão “À luz de Jesus” não pode personificar Jesus.

Jornada permanece opcional e confirmada no servidor. **A produção do PR #42 está READY, mas o único POST de QA para iniciar a Jornada retornou 503; o GET disponível não comprova o fluxo.** A sessão Windows cuida da correção em `codex/journey-cloud-fix`, ainda não validada no handoff. Não altere essa branch nem duplique seu trabalho: integre a `main` depois do merge e da confirmação pública. Enquanto isso, continue os módulos independentes. Não inventar pontos locais ou contabilizar leitura em background. A recompensa Mini Jesus ainda é planejada, sem resgate/entrega garantidos. Cookie do Safari não migra automaticamente para o app. Preserve exclusão e privacidade.

Valide leitura em modo avião, Dynamic Type, VoiceOver, safe areas, tema, redução de movimento/transparência, retorno de sheets, partilha e restauração. Guarde capturas do binário real e um relatório com projeto/scheme/Simulator e resultados. Depois avance para iPhone físico, sessão mobile, voz, Universal Links, privacidade, assinatura e TestFlight do **novo** app conforme os pré-requisitos estiverem disponíveis. Reporte separadamente código, build, instalação, TestFlight, revisão e publicação.

Siga com o trabalho autorizado sem parar em um plano. Faça primeiro tudo que puder ser executado e testado. Se faltar login pessoal, identidade do titular ou um pré-requisito externo, explique exatamente o ponto e continue o trabalho independente. Não modifique o site publicado, a frente de vídeos ou o app preexistente no TestFlight como atalho.

---

O handoff é a fonte dos contratos e da sequência; este prompt não substitui sua leitura. O usuário não precisa colar chaves, senhas, códigos Apple ou dados de assinatura na conversa.
