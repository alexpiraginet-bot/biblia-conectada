# Publicação, voz e ferramentas locais — 22/10/2026

## Estado publicado

Produção READY: `dpl_J8dJUBdEuESg3FdBYDm6LKJgkiPj`, fonte `6d8ab82841a4cce5516127cb2ccc4e8e7a233cce`, no endereço público habitual. PR #32 corrigiu a geometria móvel; PR #33 permite republicar o mesmo commit para atualizar variáveis/configurações. Seis casos Git/Bash confirmaram a regressão e a preservação do skip para commits distintos somente de documentação externa.

Seis casos reais de navegador em produção (375×667, 393×852, 1440×900, Dia/Noite) passaram sem overflow horizontal, erro JS ou sobreposição do compositor pela navegação. Três sugestões completas nas telas baixas, painel de privacidade utilizável. Evidência local: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/heart-geometry/production-voice-enabled/`. Nenhum POST pago nessa matriz. O teste anterior de WebKit não substitui um iPhone físico.

## Voz: ativada para teste, geração ainda falhou

Alex substituiu novamente a chave e pediu publicar para testar. `ASSISTANT_VOICE_PROVIDER=openai` e `ASSISTANT_VOICE_ENABLED=true` estão agora em Preview e Production. O segredo não foi lido, registrado ou copiado para arquivo.

A prévia nova `dpl_8h4cbrrge6V3zFaqDHHMPpYBdD1H` carregou a configuração atualizada. Uma primeira pergunta curta recebeu HTTP502 na etapa textual, sem tentativa de áudio. Outra pergunta, já usada no teste anterior, recebeu texto HTTP200 com citações idênticas à Open NBV local. A chamada de voz recebeu HTTP502: `phase=connecting`, `reason=provider_event`, `audioBytes=0`, duração 1133 ms. O código anterior `invalid_api_key` não apareceu neste registro; isso não basta para concluir a validade da credencial nem atribuir a falha a saldo, modelo ou permissões.

Relatório: `heart-geometry/voz-chave-atualizada/2026-10-22T02-44-50-456Z-e377d638/report.json`. Nenhum WAV foi produzido. Autoplay, timbre e reprodução com iPhone no silencioso continuam sem validação real. A interface da voz está habilitada por solicitação de publicação, mas não declarar que o áudio funciona. A conversa por texto permanece disponível; não repetir chamadas pagas em loop. Um diagnóstico local por `vercel env run` não recebeu o segredo sensível e não fez nenhuma chamada OpenAI.

## Instalação compartilhada concluída

Raiz fora do repositório: `D:/BentoLabs/00-Ferramentas/agent-stack`. Consultar `ROTEAMENTO.md`, `manifest.json` e os manifestos individuais.

- Trail-Code 0.23.1 e Codebase Memory MCP 0.12.1: fontes oficiais, launchers, testes estruturais e MCPs registrados em Codex/Claude. As novas sessões carregam os servidores.
- Agency Agents:282 perfis / 18 divisões em biblioteca sob demanda, com conversões e validação; não 282 agentes simultâneos.
- OpenMontage: exportação oficial completa, sem histórico Git, 90 skills compatíveis validadas; 46 testes e render real pelo VideoCompose/Remotion. Oito referências já ausentes no upstream estão documentadas.
- Cinco skills roteadoras em ambos os clientes, com instruções globais e configurações anteriores preservadas.

Teste de vídeo: `openmontage/projects/biblia-openmontage-test/renders/Biblia-Conectada-OpenMontage-Teste-Final.mp4`, 25 s, 1080×1920, H.264/AAC. SHA256 `296804ede54b882a9d96352c34eb726f7306322a1e1d010797a330d6011e56f6`. Decodificação integral, áudio, metadados e 15 quadros conferidos. Usa capturas anteriores do site, sem narração; a cadência original de algumas capturas é 5–13 fps apesar da saída 30 fps. É teste de integração, não peça final aprovada nem publicação social.

A limpeza opcional de downloads parciais/cache vazio foi rejeitada pela revisão automática; os arquivos foram preservados. Não houve gasto em provedores de geração pela instalação nem disputa de GPU com a sessão de vídeos.
