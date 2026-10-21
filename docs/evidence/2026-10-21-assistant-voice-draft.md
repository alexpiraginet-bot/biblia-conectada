# Voz do companheiro de estudo — preparo, não ativado

Estado em 21/10/2026: **rascunho de servidor, sem commit, deploy, chave nova ou chamada paga**. Durante a implementação Alex pediu avaliar uma voz local própria e natural em PT-BR. A escolha final de voz/provedor permanece pendente. A implementação de reprodução automática no frontend foi pausada antes de alterar a interface.

## O que está preparado

- Contrato de provedor explícito (`voice-provider.ts`), sem fornecedor padrão e sem aceitar URL, modelo ou voz enviados pelo navegador.
- Capability HMAC de 15 minutos emitida somente depois de validar a resposta e suas fontes. Associa texto exato, visitante pseudonimizado, ID da pergunta e revisão do provedor. O endpoint não é um proxy aberto de texto para fala.
- `POST /api/assistente/voz`, com mesma origem, corpo máximo de 32 KiB, ticket validado, identidade Vercel, timeout, retorno MP3 limitado a 8 MB e erros públicos sem detalhes do fornecedor.
- Reserva Redis em um único EVAL para **o total já existente de US$20/mês e seu subteto de voz de US$5/mês**. Não acrescenta US$5 ao orçamento. Usa o mesmo hash de ledger e o mesmo mês UTC. Bloqueio por ticket repetido, 2 gerações/minuto e 12/dia por visitante. Nenhum texto de resposta é persistido no ledger.
- Falha, cancelamento ou entrega incerta conservam a reserva; não há retry de geração nem reembolso presumido. O futuro cliente deve repetir um áudio já recebido usando o blob em memória, sem novo POST.
- Respostas grandes têm áudio de até 6.000 caracteres, com `partial=true`; o texto completo permanece inalterado. A futura interface precisa sinalizar esse recorte.

## Adapter de avaliação existente

O adapter ElevenLabs reproduz o perfil do take anterior: James `EkK5I93UQWFDigLMpZcX`, `eleven_v4`, idioma `pt`, stability 0,5 e similarity_boost 0,75. **Isso não é a definição da nova voz solicitada.** O ID provém de `outputs/seriado/episodio-01/revisao-r5/audio/elevenlabs/JAMES-SELECTION.json` no projeto local Bíblia em Cena; não é um preset UUID Higgsfield.

Continua desligado sem os três requisitos simultâneos: `ASSISTANT_VOICE_ENABLED=true`, `ASSISTANT_VOICE_PROVIDER=elevenlabs` e `ELEVENLABS_API_KEY`. Nenhuma dessas variáveis foi criada/alterada nesta tarefa. Não configurar antes de Alex definir a voz e o root revisar a entrega completa. Os segredos existentes do assistente/Redis continuam sendo requisitos. Não se deve copiar chaves para chats, repositório ou variáveis públicas.

A tarifa pública consultada para v4 foi US$0,08/1.000 caracteres. O rascunho reserva **US$0,16/1.000 caracteres**, margem conservadora de 2×, sem desconto após síntese. Esse contador é uma alocação do app, **não a fatura**: plano, impostos ou multiplicadores particulares da voz precisam de verificação antes de ativar. Um adapter local deve ter política própria de recursos/custo; não herdar essa tarifa como se fosse gasto de API real.

## Próximo passo para voz local

Comparar amostras reais PT-BR, escolher voz e identidade de forma explícita e então implementar adapter e frontend. Vercel não acessa um processo do PC como se fosse um endpoint público. Uma solução local precisa de hospedagem HTTPS autenticada disponível, limites, observabilidade, cancelamento, política de dados e autorização para sua exposição. Nenhum túnel, servidor público, modelo GPU ou serviço local foi iniciado aqui.

Plano frontend ainda **não implementado**: armar áudio e retomar AudioContext no gesto de Enviar, informar geração/reprodução, permitir desligar som e retomar quando o navegador exigir outro toque, preservar texto se áudio falhar e cancelar ao fechar/perguntar novamente. Nenhuma promessa de burlar volume zero, interrupções, restrições de WebViews ou autoplay. `navigator.audioSession.type = 'playback'`, quando disponível, pode ajudar no modo silencioso do iOS 17+, mas exige validação física. Não usar silêncio em loop nem voz Windows como substituição automática.

## Verificação

- 90 testes focados passaram: assistente existente, edições BLIVRE/Open NBV, UI existente e 19 testes novos de voz. Todas as chamadas Redis/ElevenLabs nos testes são simuladas. Typecheck completo (`tsc --noEmit`) e ESLint nos arquivos alterados também passaram.
- Cobertura nova: habilitação explícita, adulteração/expiração/vínculo de ticket, recorte, contrato de reserva atômica, refusas de orçamento, mesmo-origin, limites de entrada/saída, MIME/assinatura MP3, replay sem segunda geração e detalhes de erro suprimidos.
- Nenhum EVAL foi executado em Redis real nesta tarefa. O teste valida o contrato de uma única transação e o fluxo de bloqueios; revisão/exercício do Lua em Redis de teste permanece necessário antes de ativar cobrança.
- Nenhum build/deploy foi iniciado por este agente. A interface atual de voz do aparelho não foi alterada, pois a implementação frontend foi pausada antes de aplicar o patch.

### Correção do limite binário após revisão independente

- O retorno HTTP agora copia somente a região do `Uint8Array` entregue pelo adapter, respeitando `byteOffset` e `byteLength`, inclusive quando ele retorna um `Buffer`. Bytes vizinhos do armazenamento compartilhado não entram na resposta.
- Dois testes de regressão exercitam o handler com uma região de 256 bytes dentro de um armazenamento de 288 bytes. Antes da correção, ambos falharam porque os 288 bytes eram devolvidos; depois, receberam exatamente os 256 bytes esperados, sem prefixo ou sufixo.
- Verificação focada: `node node_modules/vitest/vitest.mjs run tests/assistant-voice.test.ts` — **21 testes passaram**. Redis e adapter continuam simulados. Esta correção não altera habilitação/provedor, frontend ou variáveis de ambiente; não executa build, deploy ou chamada paga. Os limites de validação do Lua e da reprodução real registrados acima permanecem.

## Fontes primárias

- [ElevenLabs HTTP TTS streaming](https://elevenlabs.io/docs/api-reference/text-to-speech/stream)
- [ElevenLabs modelos](https://elevenlabs.io/docs/overview/models)
- [ElevenLabs preços da API](https://elevenlabs.io/pricing/api)
- [WebKit: políticas de reprodução no iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [WebKit: modo silencioso e audioSession playback no iOS 17](https://bugs.webkit.org/show_bug.cgi?id=237322)
- [W3C Audio Session](https://www.w3.org/TR/audio-session/)
