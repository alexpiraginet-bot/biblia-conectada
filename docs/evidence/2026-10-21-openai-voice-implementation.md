# Voz OpenAI — implementação para prévia

Estado em 21/10/2026: código e testes simulados concluídos; qualidade, latência e reprodução real no iPhone ainda aguardam validação. Nenhuma chamada paga foi feita por este agente. Nenhuma publicação feita por este agente.

## Contrato

- Provider explícito `ASSISTANT_VOICE_PROVIDER=openai`, habilitado somente com `ASSISTANT_VOICE_ENABLED=true` e `OPENAI_API_KEY`. A chave fica no servidor. A variável com grafia antiga não é aceita.
- Modelo `gpt-realtime-2.1-mini`, voz `cedar`, português brasileiro acolhedor solicitado nas instruções. A voz é identificada na interface como gerada por IA; não é uma voz humana exclusiva ou clonada.
- Transporte WebSocket de saída no servidor, usando `ws`, sem SDK ou credenciais no cliente. Uma sessão e uma resposta, sem microfone, ferramentas, histórico, reconexão ou nova tentativa automática.
- O texto assinado é um prefixo da prosa já validada. Até 1.200 caracteres, terminando preferencialmente em sentença; `partial:true` mostra “Trecho inicial em áudio”. O texto completo continua visível. Não há segundo resumo gerado.
- `issueVoiceTextTicket` permite o mesmo contrato no estudo e no Coração. Ticket vincula texto, visitante, UUID da consulta, perfil e validade de 15 minutos. A rota não aceita voz, host ou texto arbitrário do navegador.
- `response.output_audio_transcript.done` deve corresponder ao texto assinado após normalização de pontuação, espaços, caixa e diacríticos. Palavras ausentes/adicionadas/reordenadas causam falha fechada. A comparação pode rejeitar um áudio correto se numerais forem escritos por extenso; esse caso requer teste real. Ela não é uma auditoria acústica independente.
- O áudio é entregue como WAV PCM16 mono, 24 kHz, somente depois da verificação. Trata-se de áudio preparado antes de tocar, não de streaming audível incremental. Máximo 80 segundos, 4.096 tokens de saída, timeout de 45 segundos e payload de aproximadamente 3,84 MB. A rota mantém `maxDuration=60`.

## Custo e proteção

Fonte oficial consultada em 21/10/2026: [modelo GPT-Realtime-2.1 Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini). Tarifas publicadas por milhão de tokens: texto de entrada US$0,60; texto de saída US$2,40; áudio de saída US$20. [Contagem Realtime](https://developers.openai.com/api/docs/guides/realtime-costs): áudio de saída usa aproximadamente 20 tokens por segundo, equivalente a cerca de US$0,024/minuto de saída, além de texto. Isso não inclui tributos ou condições particulares de conta.

A reserva conservadora por solicitação é `bytesUTF8(texto) + bytesUTF8(instruções) + 1024 + 4096 × 20`, em micros de dólar: aproximadamente US$0,084–0,086 para prosa comum, menos de US$0,09 no limite Unicode testado. Todos os tokens de saída são reservados à tarifa mais alta, e a entrada usa um teto por byte maior que a tarifa publicada. Não há restituição nesta primeira integração; falhas, cancelamentos e entrega indeterminada mantêm a reserva. Essa reserva de aplicação não representa a fatura efetiva.

O Lua existente registra atomicamente a reserva no total mensal de US$20 e em seu subteto de voz de US$5, sem somar um orçamento novo. Mantém 2 solicitações por minuto, 12 por dia e idempotência do ticket. O root validou separadamente a execução dos scripts Lua reais.

## Reprodução

O gesto de enviar prepara um AudioContext e, quando disponível, a categoria de reprodução da Audio Session. A resposta em texto aparece antes da preparação do áudio. Estados: aguardando resposta, preparando voz, ouvindo, pronto, bloqueado e erro. Parar, desligar voz, fechar ou perguntar novamente cancelam a preparação e invalidam callbacks antigos.

Quando autoplay é bloqueado, “Ouvir resposta” usa outro gesto e o áudio já preparado, sem nova geração. Até três áudios ficam somente na memória da conversa e são descartados ao fechar. A voz do sistema foi removida do estudo; a leitura cronológica independente não foi alterada.

Não há promessa de ignorar o botão silencioso, volume zero, interrupções ou políticas de todos os navegadores. [WebKit: políticas de reprodução iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/) e [Audio Session](https://www.w3.org/TR/audio-session/) fundamentam a preparação por gesto e o fallback explícito.

## Verificação executada

- 107/107 testes passaram em seis arquivos: `assistant-voice`, `assistant-voice-openai`, `assistant-voice-player`, `assistant-ui`, `assistant` e `assistant-translations`.
- TypeScript completo sem erros; ESLint focal sem erros ou avisos.
- Testes WebSocket e HTTP inteiramente simulados: configuração, autenticação só servidor, ACK de sessão, tokens, WAV, texto divergente, resposta incompleta, timeout, duração, abort, socket fechado, erro sanitizado e nenhum retry.
- Testes do player: gesto inicial, reprodução após texto, fallback de autoplay, replay sem segunda solicitação, cancelamento com resposta tardia, limpeza de blobs e callbacks antigos.
- Não executados por este agente: geração paga, audição subjetiva, Safari físico, build integral, deploy. Essas são etapas do root.

## Referências de API

- [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech): os modelos Speech anteriores estão depreciados e encerram em 06/01/2027; a recomendação é migrar de workflow para Realtime, não usar o novo modelo em `/audio/speech`.
- [WebSocket Realtime](https://developers.openai.com/api/docs/guides/voice-websockets?api=realtime), [conversas](https://developers.openai.com/api/docs/guides/realtime-conversations) e [tipos oficiais OpenAI Node](https://github.com/openai/openai-node/blob/master/src/resources/realtime/realtime.ts): formatos de sessão/resposta, `cedar`, PCM24k, eventos de áudio/transcrição e limites de tokens.

Os textos documentais consultados foram guardados fora do repositório em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/voice-openai-docs/`.

## Diagnóstico restrito após a primeira prévia

O root informou que seu teste real obteve resposta de texto HTTP 200 em cerca de 8,1 segundos, seguida de voz HTTP 502 em aproximadamente 665 ms. Esse tempo é compatível com uma falha precoce, mas sozinho não prova falha de credencial, quota ou protocolo. A primeira versão não distinguia as causas.

Foi acrescentado um único registro `assistant_voice_failure` por tentativa malsucedida. Campos permitidos: UUID aleatório de correlação, provider/modelo fixos, fase, motivo enumerado, duração, bytes de áudio e contagens de caracteres. O status HTTP só é aceito no intervalo 100–599; códigos externos só são emitidos se estiverem na lista explícita do adaptador, incluindo erros em `response.status_details`. `upstreamParam` aceita somente nomes exatos dos parâmetros enviados, em lista fechada, nunca valores ou caminhos livres. Corpo HTTP, evento, mensagem/stack externo, cabeçalhos, chave, ticket, prompt, texto, transcrição e hashes de conteúdo nunca são registrados.

Fases: conexão, configuração, solicitação, recebimento e verificação. Motivos distinguem handshake HTTP, transporte, fechamento precoce, erro do provider, protocolo, timeout, cancelamento do cliente, teto de áudio, resposta incompleta, uso inválido, transcrição ausente/divergente e PCM inválido. O cliente continua recebendo a mesma mensagem genérica. Não foi alterado o protocolo, a comparação de numerais, o orçamento ou as tentativas.

Verificação desta alteração: 40/40 testes nos dois arquivos server de voz, TypeScript completo e ESLint focal passaram. Os testes exercitam status HTTP, códigos/parâmetros conhecidos e desconhecidos, fases, causas, uma única linha por falha, ausência de logs no sucesso e não exposição de sentinelas privadas colocadas no texto, erro, body e headers. Nenhuma chamada paga foi executada por este agente para essa correção.
