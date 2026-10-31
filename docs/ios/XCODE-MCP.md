# Codex + Xcode no Mac

Pesquisa conferida em 31/10/2026. Este documento prepara a instalação; não afirma que o Mac de Alex foi acessado, configurado ou testado.

## O repositório e a integração oficial

O projeto conhecido como **XcodeBuildMCP** agora redireciona para [getsentry/MobileBuildMCP](https://github.com/getsentry/MobileBuildMCP). A versão estável conferida é **2.7.1**, publicada em 23/09/2026. O pacote npm também se chama `mobilebuildmcp`. Ele fornece automação de build, testes, simuladores, depuração e instalação em dispositivos com assinatura configurada. Tem suporte documentado ao Codex e licença MIT.

Separadamente, a própria Apple oferece integração com agentes desde Xcode 26.3. Para um Codex externo ao Xcode, o servidor oficial é `xcrun mcpbridge`. O Xcode deve permitir agentes externos em **Settings → Intelligence → Allow external agents to use Xcode tools**. Abra o projeto correto no Xcode antes de pedir ações. A versão efetivamente disponível e compatível com o Mac deve ser verificada na nova sessão.

Escolha desta preparação:

- **MCP oficial Apple:** projeto aberto, diagnósticos, documentação e capacidades do IDE.
- **MobileBuildMCP:** execução, testes, captura e interação com simulador. Habilitar o workflow de dispositivo quando houver iPhone pareado e assinatura conferida.
- Sem habilitar simultaneamente o proxy `xcode-ide` do MobileBuildMCP: o servidor oficial já está configurado, evitando duplicação.
- Ferramentas de desenvolvimento apenas. Nada desse pacote entra no binário iOS, no site, ou nas respostas da IA aos leitores.

## Instalação preparada

Na raiz do checkout no **Mac**, a nova sessão deve primeiro executar:

```bash
bash scripts/ios/preflight.sh
```

O diagnóstico lê versões e disponibilidade de Xcode, `mcpbridge`, `simctl`, Node e npm. Ele não instala Xcode, não aceita contratos e não seleciona outro Xcode automaticamente. As ferramentas aceitam Node 22 ou posterior; use **Node 22.x** para reproduzir o ambiente declarado pelo site. Se faltar uma dependência, instalar somente a necessária e executar o diagnóstico de novo.

Com os pré-requisitos satisfeitos:

```bash
bash scripts/ios/setup-mcp.sh
```

Esse script:

1. Instala `mobilebuildmcp@2.7.1` a partir do lockfile em `tools/ios-mcp`, com verificação de integridade pelo npm e sem hooks de instalação.
2. Grava os dois servidores no `.codex/config.toml` **local do checkout**, com caminhos absolutos desse Mac, sem alterar a configuração global.
3. Grava `.mobilebuildmcp/config.yaml` com simulador, automação de interface e depuração. Telemetria Sentry desativada por configuração e variável de ambiente.
4. Instala a skill oficial revisada em `.agents/skills/mobilebuildmcp/SKILL.md`, preservando a licença no pacote de origem.
5. Para antes de escrever se encontrar configuração existente diferente. A sessão deve revisar e mesclar somente os blocos necessários, sem apagar MCPs alheios.

Os três arquivos gerados têm caminhos locais e são ignorados pelo Git. Não há chave Apple, OpenAI, Anthropic, certificado ou perfil de provisionamento no script. O MCP usa `stdio`; não abre uma porta pública no Mac.

Reabra a sessão Codex no checkout confiável após configurar o MCP. Confirme os servidores e as ferramentas disponíveis. Na CLI, `codex mcp list` mostra o cadastro, mas a prova de funcionamento é uma chamada real ao projeto e um build/teste com resultado.

Se desejar usar somente a integração oficial, sem nosso script, a Apple documenta:

```bash
codex mcp add xcode -- xcrun mcpbridge
```

Este comando registra no perfil do Codex. **Não o execute junto com o setup local sem verificar se já existe uma configuração equivalente.** Na opção pelo Codex dentro do Xcode, ative e autentique o agente em Intelligence; a configuração e as permissões podem diferir da sessão externa. Não criar uma nova chave da API apenas para habilitar o assistente de desenvolvimento.

## Primeira prova no Mac

Depois de o projeto SwiftUI existir:

1. Verificar o projeto aberto, esquema, configuração e destino reais; nunca adivinhar UUID de simulador ou Team ID.
2. Consultar `session_show_defaults`; descobrir projetos apenas se os defaults estiverem vazios ou incorretos.
3. Definir os defaults com os valores encontrados. Usar build-and-run quando o objetivo já for abrir o app.
4. Confirmar primeira tela visível, navegação, leitor offline e captura no simulador; rodar testes unitários e de interface.
5. Para instalar no iPhone: conferir Developer Mode, pareamento, assinatura e equipe; habilitar o workflow `device` no MobileBuildMCP e recarregar as ferramentas se necessário. A conexão remota ao Mac não implica que o iPhone esteja pareado.
6. Guardar logs/resultados `.xcresult` e capturas com revisão/versão do app. Não enviar identificadores privados, certificados ou credenciais ao repositório público.

O script não compila uma aplicação ainda inexistente. Compilar no simulador, instalar no iPhone, enviar ao TestFlight e disponibilizar na App Store são quatro evidências distintas. MCP não substitui assinatura, cadastro, materiais de loja nem análise da Apple.

## Procedência e atualização

- Release: [v2.7.1](https://github.com/getsentry/MobileBuildMCP/releases/tag/v2.7.1).
- Commit do release: `d13ff0c707b0681769cf31da0eb42c4f94ceafff`.
- Versões transitivas e integridades: `tools/ios-mcp/package-lock.json`.
- Skill e licença preservadas: `tools/ios-mcp/upstream-skill/`.
- Registro de hashes e fonte: `tools/ios-mcp/PROVENANCE.json`.

Não usar `@latest` a cada inicialização. Atualizar exige revisar release/diff, gerar lockfile e repetir a prova no Mac. Não rodar comandos de apagar simulador, limpar dados, revogar certificados ou instalar no app interno de Alex como parte de uma simples verificação.

## Validação desta preparação

No Windows: lockfile resolvido, integridade raiz conferida com registro npm, sintaxe Bash/Node validada, dry run sem escrita e recusa do preflight fora do macOS conferidos. **Não testados:** instalação das dependências no Mac, inicialização MCP, Xcode, Simulator, assinatura e App Store Connect. Registrar esses resultados no handoff após a execução real.

## Fontes consultadas

- [Apple: acesso de agentes externos ao Xcode](https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode).
- [Apple: configuração de Coding Intelligence](https://developer.apple.com/documentation/xcode/setting-up-coding-intelligence).
- [OpenAI: configuração MCP](https://developers.openai.com/codex/mcp/).
- [MobileBuildMCP: clientes e Codex](https://github.com/getsentry/xcodebuildmcp.com/blob/main/app/docs/_content/clients.mdx).
- [MobileBuildMCP: configuração](https://github.com/getsentry/xcodebuildmcp.com/blob/main/app/docs/_content/configuration.mdx).
- [MobileBuildMCP: privacidade e desligamento da telemetria](https://github.com/getsentry/xcodebuildmcp.com/blob/main/app/docs/_content/privacy.mdx).
- [MobileBuildMCP: skills](https://github.com/getsentry/xcodebuildmcp.com/blob/main/app/docs/_content/skills.mdx).

Revalidar versões, nomes de menus e exigências de SDK no Mac e antes da submissão; estas fontes podem evoluir.
