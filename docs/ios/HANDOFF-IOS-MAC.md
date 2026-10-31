# Bíblia Conectada — handoff para a sessão no Mac

Preparado em 31/10/2026. Objetivo autorizado por Alex: criar um aplicativo iOS nativo da Bíblia Conectada e prepará-lo para distribuição pública na App Store. Alex confirmou acesso a um Mac remoto e pediu um documento para continuar em uma nova sessão nesse computador.

**Ponto de partida: ainda não existe código iOS neste branch.** Há uma arquitetura auditada, documentação e ferramentas de desenvolvimento preparadas. Nenhuma compilação Swift, execução no Simulator, assinatura, instalação, upload para TestFlight ou aprovação Apple foi realizada nesta preparação no Windows.

## 1. Abrir o projeto certo

| Identificação | Valor |
|---|---|
| Repositório | `https://github.com/alexpiraginet-bot/biblia-conectada.git` |
| Branch desta frente | `codex/ios-native-app` |
| Base web desta preparação | `ddc6909` — `Add daily liturgy, complete navigation and reading rewards (#42)` |
| Worktree usado no Windows | `D:/BentoLabs/01-Projetos/biblia-conectada-ios` |
| Diretório proposto para código nativo | `apps/ios/` |
| Domínio canônico | `https://www.bibliaconectada.company` |
| Nome público | **Bíblia Conectada** |
| Bundle ID, Team ID e registro App Store Connect | **Ainda não definidos/verificados nesta frente** |

O agente principal publicará o branch com este handoff. No Mac, confira sua existência e o commit recebido; não confunda o commit-base acima com o último commit dos documentos.

**Estado público comunicado pela sessão principal em 31/10/2026:** o PR #42 está em produção **READY**. Na Jornada, o GET anônimo informou disponibilidade, mas o único POST `start` de QA retornou **503**. Diagnóstico/correção seguem na sessão Windows, branch **`codex/journey-cloud-fix`**, ainda sem validação conclusiva. Não tomar o backend da Jornada como totalmente saudável, não alterar essa branch a partir do Mac e não duplicar a correção. Após merge e confirmação pública, atualizar `origin/main` e integrar a mudança no branch iOS preservando o trabalho local. O GET disponível sozinho não fecha esse teste.

Se ainda não houver checkout local:

```bash
mkdir -p "$HOME/Developer"
cd "$HOME/Developer"
git ls-remote --heads https://github.com/alexpiraginet-bot/biblia-conectada.git codex/ios-native-app
git clone --filter=blob:none --single-branch --branch codex/ios-native-app https://github.com/alexpiraginet-bot/biblia-conectada.git biblia-conectada-ios
cd biblia-conectada-ios
git status --short
git branch --show-current
git log -1 --oneline
```

Se a pasta já existir, inspecione-a e preserve alterações de outra sessão. Não apague o checkout para recriá-lo, nem use `reset --hard`. Um clone parcial não impede o download de blobs necessários ao checkout; não baixar o Release `film-intermediates` nem intermediários audiovisuais.

### App que já existe no TestFlight

Há um aplicativo preexistente no TestFlight. **Ele não é o destino desta tarefa. Não alterar seu código, Bundle ID, assinatura, registro, builds, grupos de teste ou versão.** Seu nome e identificadores não foram estabelecidos neste handoff.

No início, faça inventário somente leitura dos projetos Xcode existentes e dos registros disponíveis à conta. Registre nome, caminho, Bundle ID e Team ID do que for relevante para distinguir o novo projeto. Não abra um projeto antigo por conveniência e troque o nome. Crie a Bíblia Conectada em `apps/ios/` e use uma identidade separada, após conferir titular e disponibilidade. Se a identidade de destino continuar ambígua, avance com dados, código e Simulator e deixe assinatura/upload pendentes até resolver essa identificação.

## 2. Documentos e ferramentas

Leia nesta ordem:

1. `AGENTS.md` e **todo** o `CLAUDE.md`.
2. `docs/HANDOFF-CODEX.md`, **todo** o `HANDOFF.md`, `design/README.md` e `fontes/README.md`, conforme as regras do repositório. Trechos históricos permanecem no registro; as decisões mais recentes e este novo escopo prevalecem.
3. Este handoff, [ARCHITECTURE.md](ARCHITECTURE.md) e [XCODE-MCP.md](XCODE-MCP.md).
4. `ATTRIBUTION.md`, `LICENSE-DATA.md`, `DADOS.md`, `docs/INTERLINEAR.md`, `docs/LITURGIA.md`, `docs/JORNADA.md`, `design/APP-IDENTITY.md` e os contratos de API pertinentes antes de implementá-los.

Antes de alterar `site/`, leia `site/AGENTS.md` e o guia correspondente em `site/node_modules/next/dist/docs/`. Não é preciso reconstruir a interface web para iniciar o app.

Ferramentas preparadas pelo agente principal:

- `scripts/ios/preflight.sh`: diagnóstico somente leitura no Mac.
- `scripts/ios/setup-mcp.sh`: instalação das dependências fixadas e configuração local de MCP.
- `scripts/ios/configure-mcp.mjs`: gera configurações locais sem substituir silenciosamente arquivos diferentes.
- `tools/ios-mcp/package-lock.json`: lockfile do MobileBuildMCP **2.7.1**; ferramenta de desenvolvimento, nunca dependência do app ou do site.
- `tools/ios-mcp/upstream-skill/`: skill oficial e licença preservadas; o setup instala a skill local ao projeto.

O repositório conhecido como XcodeBuildMCP foi renomeado para **MobileBuildMCP**. A integração proposta combina o MCP oficial do Xcode, `xcrun mcpbridge`, com workflows complementares de Simulator, automação e depuração. Detalhes, fontes, versão e limitações ficam em `XCODE-MCP.md`; não substituir o lockfile por `@latest` sem necessidade demonstrada. A telemetria do complemento foi configurada como desligada.

A disponibilidade dessas ferramentas não comprova que o Xcode ou o Simulator funcionam. Confirme a conexão real no Mac, o projeto e o scheme antes de cada frente de execução. Pela skill oficial, consulte `session_show_defaults` antes do primeiro build/run/test; descubra projetos somente se o contexto estiver ausente ou incorreto. Não duplique um build isolado e um build-and-run sem motivo.

## 3. Decisão de produto e arquitetura

**SwiftUI nativo, útil offline, com backend compartilhado.** A identidade continua bordô, ouro, marfim, arcos e estrelas; leitura confortável ocupa o centro. O vidro pertence aos controles e à navegação, sem reduzir contraste ou cobrir a passagem. Adotar materiais nativos disponíveis com fallback adequado à versão do sistema, Dynamic Type, VoiceOver, redução de movimento e redução de transparência. Não presumir uma API a partir do nome informal “iOS 27” usado como referência visual por Alex.

Primeiro incremento técnico: leitor completo BLIVRE, busca local, favoritos, retorno à última leitura, lista de conexões de um versículo e compartilhamento nativo. **A versão pública com paridade também precisa oferecer Open NBV e seleção de edição**, pois Alex já a escolheu no site. BLIVRE primeiro facilita o reaproveitamento do grafo; não é uma decisão de retirar a outra tradução. Depois, Hoje/liturgia com cache datado. O 3D pode usar uma `WKWebView` restrita à visualização Arcos, carregada sob demanda, com alternativa nativa de lista/2D. Não transformar o aplicativo inteiro em um site dentro de WebView.

O menu do app deve dar acesso claro a todas as funções realmente implementadas, preservando a direção de botão central flutuante quando compatível com leitura e acessibilidade. Não exibir dezenas de destinos vazios para simular completude. Mapa, cronologia, interlinear, Coração e Jornada entram por fatias funcionais verificadas.

O site usa Next com recursos de servidor; copiar `.next` para Capacitor não cria um aplicativo offline. Uma versão Capacitor exigiria extrair um frontend cliente e separar APIs. O comparativo e os motivos da escolha estão em `ARCHITECTURE.md`.

Proposta inicial de deployment target: iOS 17+, a confirmar com o Mac real. Compilar com SDK aceito pela Apple na data do envio; o requisito consultado desde 28/04/2026 é SDK iOS 26 ou posterior. Deployment target e SDK de compilação são decisões distintas. O setup de MCP pede Xcode compatível com `mcpbridge`; a ausência do bridge não significa que todos os builds Swift sejam impossíveis. [Requisito oficial de SDK](https://developer.apple.com/news/?id=ueeok6yw).

## 4. Sequência de execução no Mac

### Etapa A — contexto e ambiente

1. Confirme branch, alterações locais e os documentos acima.
2. Execute `bash scripts/ios/preflight.sh` e guarde um relatório sem dados sensíveis.
3. Confira Xcode selecionado, versão do macOS/arquitetura e runtimes realmente instalados. Não apague simuladores ou dados de outros apps para abrir espaço.
4. Execute `bash scripts/ios/setup-mcp.sh`. Em caso de configuração diferente já existente, revise e mescle os itens do projeto sem substituir a configuração de outra sessão.
5. Habilite no Xcode a integração de ferramentas externas descrita em `XCODE-MCP.md`; recarregue a sessão e confirme as ferramentas disponíveis. Login Apple e interação de conta ficam com o titular, sem registrar senhas ou códigos.
6. Confirme o isolamento do aplicativo antigo no TestFlight. Para os primeiros testes, escolha um Simulator disponível e mantenha assinatura/distribuição fora dessa etapa.

O setup ainda não foi executado no Mac nesta preparação. Não declarar instalação concluída só porque os arquivos existem.

### Etapa B — projeto nativo e corpus offline

Crie um projeto SwiftUI em `apps/ios/` com scheme compartilhado, unit tests e UI tests. Preferir dependências mínimas. Se usar um gerador de projeto, versionar a especificação e fixar sua versão. Não alterar o target de um aplicativo preexistente.

Proposta de organização:

```text
apps/ios/
  BibliaConectada/        App, Features, Design, Services e Resources
  BibliaConectadaTests/   contrato do corpus, busca, referências e cache
  BibliaConectadaUITests/ leitura offline, navegação, sheets e acessibilidade
  README.md              abrir, gerar dados, compilar e testar
  [projeto Xcode ou especificação reproduzível]
```

Dados derivados públicos são gerados e podem não existir em um clone novo. A partir da raiz, a preparação existente é:

```bash
cd site
npm ci
npm run data
cd ..
```

Isso gera dados do site; não exige deploy nem nova chamada paga de IA. Para reproduzir o pipeline web, usar Node 22.x, conforme `site/package.json`; o complemento MCP aceita Node 22 ou posterior. O pipeline lê fontes abertas já inventariadas, inclusive dados que os estudos compartilham. **Não editar `estudos/`** para ajustar a importação. Se alguma fonte estiver ausente, identificar o arquivo e sua origem registrada; não substituir por texto obtido informalmente.

Crie um importador específico do app que use `site/public/dados/v1/manifest.json`, `livros.json`, `texto/*.json` e relações verificadas. Fixe a versão/hashes usados no artefato nativo; conte livros, capítulos, versículos e pares. O contrato usa chaves em português, descritas na arquitetura. O texto deve permanecer byte a byte semanticamente intacto; normalização de acentos pertence somente à busca.

O snapshot auditado tem 66 livros, 1.189 capítulos, 31.102 versículos; os 66 JSON de texto somam aproximadamente 4 MB sem compressão. Use esses valores como expectativa de teste, nunca como substituto de validar o snapshot importado. Construa um índice SQLite/FTS de leitura e relações fora do caminho crítico da interface. Inclua créditos e licenças offline.

### Etapa C — primeira fatia que a pessoa consegue usar

Implemente e execute no Simulator antes de adicionar várias frentes:

- Abrir livro/capítulo, ler passagem completa, selecionar versículo e voltar ao contexto.
- Buscar referência ou texto local, incluindo acentos e entradas inválidas compreensíveis.
- Salvar/remover favorito e restaurar a última leitura após encerrar e abrir.
- Mostrar conexões reais, contagem e texto; distinguir votos de número de conexões. Lista acessível acompanha qualquer desenho.
- Compartilhar referência, URL canônica e imagem nativa do texto licenciado. Não prometer postagem automática em Stories; usar o share sheet do sistema.
- Ajustar tamanho da leitura, tema e movimento sem corte em tamanhos grandes.

**Aceite desta fatia:** instalação nova abre a Bíblia completa em modo avião; busca/favoritos funcionam sem login ou servidor; João 1:1 leva à ligação real com Gênesis 1:1; relançar mantém estado local; nenhum segredo de provedor no bundle ou logs. Capturar o binário real, não uma tela web ou mockup.

Em seguida, integrar a Open NBV completa com catálogo e seleção persistida. Preservar `edition + slug + chapter + verse` em favoritos, último ponto de leitura e rotas. Ela tem 31.105 posições e diferenças próprias; testar 3 João 1:15, Juízes 5:32 e 1 Samuel 20:43 sem forçar a grade BLIVRE. Fonte, direitos e importação em `docs/open-nbv-alignment.md`; não reescrever o texto. Pode ser download explícito para offline, desde que a interface informe isso claramente. Uma beta ainda restrita à BLIVRE pode ser testada, mas precisa dizer seu escopo e não ser apresentada como paridade pública concluída.

### Etapa D — liturgia, links e exploração

Consumir `GET /api/liturgia?date=AAAA-MM-DD`, com contrato `Codable`, timeout, cancelamento e erros tipados. Cache somente de sucesso sanitizado por data, preservando fonte, edição e `fetchedAt`. O dia salvo continua com sua data quando offline. Um erro 503 nunca vira uma leitura de exemplo.

O calendário é de procedência católica no Brasil; o texto de estudo é BLIVRE, não o Lecionário oficial. Manter o aviso e o acesso à CNBB, inclusive quando a referência não tem texto na coleção. Não copiar o texto protegido retornado por serviços terceiros.

Links de partilha: `/livro/capitulo/versiculo` para BLIVRE, `/ler/open-nbv/livro/capitulo/versiculo` para Open NBV e `/dia/AAAA-MM-DD` para o dia. O PNG pode vir de `/og?path=...&format=story|landscape&v=1`, com status, MIME e bytes validados. Offline, o render local usa apenas texto já verificado e declara a edição correta.

Mapas/cronologia/interlinear entram em módulos próprios a partir dos dados existentes e das limitações de origem. O interlinear atual é uma coleção inicial com glosas assistidas por IA, sem revisão acadêmica independente; não é a Bíblia completa nem uma tradução exata. Não alinhar automaticamente Open NBV ao grafo BLIVRE.

A WebView de Arcos, se implementada, aceita somente host e rotas permitidos; pausa ao sair e encaminha a seleção de versículo ao leitor por payload tipado/validado. Nada de JavaScript arbitrário, acesso ao Keychain ou navegação livre privilegiada. Não anunciar 3D remoto como offline.

### Etapa E — IA e voz com sessão própria

**Não chamar os POSTs web como se já fossem API nativa.** Os guards atuais exigem origem de navegador; `URLSession` pode receber 403. Não remover CSRF/CORS, forjar `Origin` para contornar a proteção, embutir chave fixa nem abrir credenciais para qualquer origem.

Implemente a fronteira mobile proposta na arquitetura em uma mudança isolada de backend: sessão anônima revogável, validação de instalação quando disponível, tokens curtos, renovação no Keychain e o mesmo ledger de custo. Testar a fronteira no servidor antes de ligar a UI. A leitura offline continua funcionando sem essa integração.

Texto vem da **Anthropic no servidor**. Voz usa o adaptador de voz configurado no servidor, incluindo OpenAI; não usar a chave OpenAI para substituir o motor de texto. As chaves permanecem no ambiente Vercel. O modelo não é escolha fixa do app. GET de disponibilidade não comprova que uma chamada real/áudio passa; registrar o resultado real sem expor chave.

Antes do primeiro envio, explicar e colher consentimento para enviar pergunta/contexto ao provedor; voz tem explicação própria sobre o texto enviado para gerar áudio. Revogação impede novos envios. Histórico fica temporário por padrão. “À luz de Jesus” é reflexão fundamentada e sugestão adaptável, nunca Jesus falando pela IA.

Voz usa ticket do texto validado; não é TTS arbitrário. O vínculo atual de visitante depende do IP e precisa de adaptação à sessão mobile para não falhar ao trocar Wi-Fi por celular. Reproduzir somente binário de sucesso, respeitar `partial`, expiração e cancelamento. `AVAudioSession.playback` pode reproduzir com o interruptor silencioso ativo após a opção de voz e o envio; isso não vence volume zerado nem substitui controles de pausa/volume/interrupção.

### Etapa F — Jornada

Antes de integrar, confirmar a resolução do `start` 503 registrado acima e trazer a correção já revisada da `main`. Se continuar pendente, seguir com os módulos independentes e apresentar a Jornada como indisponível; não criar saldo fictício para preencher a tela.

Adapte o acompanhamento à visibilidade real da leitura e ao `scenePhase`, pausando com bloqueio, background, overlays, ausência prolongada de interação e falha de rede. **Saldo é do servidor**; não somar XP offline nem aceitar tempo declarado pelo cliente. Não copiar cookie de Safari, nem prometer que a Jornada web migrará automaticamente para o app.

Regras atuais: leitura de 120 s, liturgia de 180 s no dia real e exploração de 90 s em pelo menos duas áreas; 20 pontos por atividade, bônus de 80 a cada sete dias ativos acumulados. Meta: 4.800 pontos **e** 60 dias ativos; melhor ritmo completa a meta em cerca de 68 dias. O Mini Jesus é uma recompensa futura planejada; resgate/estoque/entrega não estão disponíveis nem garantidos. Revalidar `docs/JORNADA.md` e as constantes do servidor ao implementar. Não medir a fé da pessoa por pontos.

### Etapa G — identidade, beta e App Store

1. Confirmar o Bundle ID novo, Team ID, titular e registro exclusivo da Bíblia Conectada. A conta Apple do Mac não deve ser confundida com a titularidade do app existente. Conferir a seleção Open NBV/BLIVRE e a preservação de edição antes de declarar paridade pública; se houver beta de escopo menor, descrevê-la explicitamente.
2. Gerar Assets/AppIcon a partir da marca atual, sem letter fallback, e validar ícone no Simulator e no iPhone físico.
3. Implementar Universal Links com entitlements e AASA nos hosts `www` e apex usando **os identificadores reais**; não registrar placeholders em produção. Links continuam abrindo o site sem o app.
4. Conferir `PrivacyInfo.xcprivacy`, APIs com razão declarada, dependências, política pública e informações App Privacy conforme o fluxo efetivamente implementado. Sem microfone/localização/contatos se não houver função que precise deles.
5. Preparar screenshots reais, suporte, créditos, notas de revisão, classificação etária e descrição que só prometa recursos presentes no binário.
6. Compilar release, executar testes, arquivar e validar assinatura no projeto novo. Só então preparar o upload do novo app para TestFlight e acompanhar processamento/avaliação. Não distribuir um placeholder nem atualizar o registro antigo.
7. Submissão e liberação pública são etapas rastreáveis do objetivo autorizado; registrar exatamente build, Bundle ID, versão e resultado. Termos, identidade do titular ou ação que exija interação pessoal devem ser apresentados concretamente, preservando tudo que já puder ser concluído.

O uso de SwiftUI ou MCP não garante aprovação Apple. Reportar separadamente: código criado, build compilado, teste realizado, build processado no TestFlight, enviado para revisão e publicado.

## 5. Verificação e evidências

Começar com testes significativos, em sequência, evitando builds concorrentes desnecessários:

| Área | Evidência necessária |
|---|---|
| Corpus | Hashes, contagens e amostras exatas; zero alteração de texto; versão/edição preservada |
| Busca e leitor | Unit tests do parser/índice e UI real em modo avião, tamanho grande e retomada |
| Conexões | Par conhecido existente, contagem do índice integral e votos separados; nenhum fio inventado |
| Liturgia | Dia escolhido preservado; cache datado; erro/sem cobertura; share URL e capa concordam |
| Navegação | Teclado quando aplicável, VoiceOver, foco, safe areas e sheets; nenhuma ação escondida atrás do menu |
| Privacidade | Nenhuma chamada IA antes do consentimento; nenhuma chave em artefatos; revogação funcional |
| Sessão/voz | Expiração, 403/429/503, retry idempotente, cancelamento, troca de rede e silêncio físico |
| Jornada | Pausa em background e exclusão real; servidor como autoridade; nenhuma promessa de prêmio ativo |
| Links/partilha | URL recebida abre o conteúdo correto; app ausente abre site; share sheet real |
| Distribuição | Novo Bundle ID correto, versão/build, arquivo de resultado e limites ainda não testados |

Guardar relatórios curtos e capturas em `docs/ios/evidence/` quando apropriado, sem binários pesados, dados pessoais, tokens ou logs sensíveis. Arquivos de build/assinatura e configurações locais já estão protegidos por ignore específico. Confirmar `git diff --check` e estado final antes de entregar. Se a fase exigir mudança compartilhada web, rodar os checks pertinentes e `npm run budget`; a margem do Arcos é historicamente pequena, e uma mudança nativa não justifica regressão web.

## 6. Limites e colaboração entre sessões

- Não alterar `estudos/`, a composição Remotion, automações de vídeo ou o aplicativo antigo no TestFlight.
- O anúncio de 48 s está em uma frente separada no Windows; a narração própria de Alex ainda era pendente no momento deste handoff. Não substituí-la nem tratar preparação de vídeo como publicação.
- Nenhuma chave pessoal do agente existe. Não pedir segredo em conversa, nem copiá-lo de arquivos, logs, sessão remota ou ambiente de outro projeto.
- Não comprar serviços/domínios ou aumentar plano por suposição. Instalação de ferramenta e geração de código não equivalem a autorização para gasto novo.
- Usar os agentes/especialistas e skills pertinentes disponíveis no Mac; não supor que caminhos `C:/` ou modelos Ollama do Windows existem lá. Preserve o trabalho se a ferramenta local não estiver disponível e use a alternativa concreta adequada.
- Relatórios históricos do site não provam o estado público neste instante. O agente principal cuida da confirmação web desta rodada; verifique o commit/alias quando essa informação for material à integração.

## 7. Próximo resultado esperado

Na próxima sessão, entregar **a primeira fatia SwiftUI rodando no Simulator**, com corpus BLIVRE offline, navegação, busca, favoritos, conexões e partilha, além do diagnóstico do Mac/MCP. Continuar pelas fases seguintes dentro do que estiver disponível. Se o Mac bloquear um passo específico, mostrar o erro e a condição faltante; prosseguir com código/testes independentes sem confundir isso com um aplicativo compilado ou publicado.

O texto pronto para abrir essa sessão está em [PROMPT-INICIO-MAC.md](PROMPT-INICIO-MAC.md).
