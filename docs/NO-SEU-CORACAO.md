# No seu coração — backend da conversa bíblica

Implementação local em 21/10/2026. Não implica deploy, ativação de voz, teste pago ou aprovação editorial das respostas.

## Contrato

`GET /api/coracao` devolve `{available,message,voice?:{available,name?}}`, sem cache. A disponibilidade exige a configuração já explícita do assistente, identidade Vercel e o ledger persistente válido. Não há nova chave nem orçamento independente.

`POST /api/coracao` recebe `requestId` UUIDv4, `question` de 3 a 800 caracteres, `mode` opcional (`encontrar` ou `jesus`, padrão `encontrar`), `translation` opcional (`open-nbv` ou `blivre`, padrão `open-nbv`) e até duas trocas `history:[{question,answer}]`, cada resposta limitada a 2.000 caracteres. Corpo limitado a 16 KiB, contando bytes reais do stream. Não exige passagem pré-selecionada. Histórico é contexto não confiável, não fonte; o cliente pode incluir as referências consultadas no campo answer para uma continuação, que serão novamente resolvidas no corpus.

O sucesso contém `ok`, `mode`, `kind` (`answer`, `clarify`, `redirect`), título, blocos de texto com IDs de citações, citações originais, perguntas sugeridas, aviso e crédito/licença da edição. Em `jesus`, pode haver `suggestedReply`, uma resposta humana para adaptar, separada do texto bíblico. Áudio é opcional e só recebe capability após validar a resposta, usando a ativação de provedor já existente; a abertura da página não gera áudio nem consulta paga.

Não há streaming parcial de prosa: a resposta inteira é validada antes da entrega. Os erros e o tratamento de retry seguem o assistente existente. Repetir o mesmo UUID recebe 409; nova cobrança só deve decorrer de uma nova consulta explícita. Cancelamento ou falha incerta conservam a reserva.

## Modelo e orçamento

Modelo fixo **`claude-sonnet-5-5`**, confirmado na [documentação oficial da Anthropic](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) em 21/10/2026: US$2 por milhão de tokens de entrada e US$10 por milhão de saída. A [nota de migração](https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5) confirma adaptive thinking; esta implementação usa esforço low e limita a saída total a 1.600 tokens, incluindo pensamento. Nenhuma chamada à conta foi feita para testar disponibilidade individual.

A reserva usa bytes serializados como limite conservador de tokens, multiplicador 2 e margem de protocolo, mais a saída máxima. Reserva e settlement reaproveitam o mesmo EVAL, hash `bc:{assistant}:ledger`, teto mensal de **US$20**, mês UTC e limites por visitante do companheiro de estudo. Não se somam US$20 novos. O fingerprint inclui operação, modelo, modo, edição, pergunta e histórico; somente o hash fica no ledger. Uso com dimensões de cobrança inesperadas não libera saldo por estimativa. Não há ferramentas pagas, cache de prompt, modo rápido ou retries automáticos.

## Recuperação e fontes

O servidor monta sob demanda um índice lexical ponderado do corpus licenciado da edição solicitada. O cache tem apenas texto bíblico imutável e índices: nunca perguntas, histórico ou respostas das pessoas. Nada disso é importado no cliente. Os módulos de dados são os mesmos já usados pelo leitor, com coordenadas locais de cada edição.

A busca aceita referências explícitas e frases; uma expansão editorial cobre temas como conhecimento/revelação, ansiedade, ofensa, perigo, luto e perdão. Esses pontos de partida não são ligações do grafo nem prova de equivalência entre traduções. São carregados como candidatos na edição escolhida e acompanhados de contexto real. A busca fornece até quatro recortes, normalmente o verso encontrado e até dois antes/depois. Na pergunta “quem disse?”, pode incluir a abertura do capítulo para procurar o interlocutor, sem confundir isso com autoria histórica.

Em **À luz de Jesus**, a recuperação é restrita a Mateus, Marcos, Lucas e João. A resposta propõe uma reflexão, nunca fala como Jesus, revela uma vontade divina ou afirma certeza do que ele faria. Compaixão não implica tolerar abuso ou permanecer em perigo. Foco e limites constam no prompt, no aviso público e na validação de saída; nenhum desses mecanismos comprova automaticamente a correção teológica de toda frase.

IDs, texto literal, referências, URLs e créditos vêm exclusivamente dos dados reais do servidor. O modelo fornece apenas prosa e IDs permitidos. Referências numeradas desconhecidas na prosa, links externos, propriedades extras e citações de outra edição são rejeitados. Uma referência válida não prova que a interpretação é fiel, por isso o aviso e o acesso ao texto/contexto continuam necessários.

**Limite conhecido:** a recuperação é lexical com expansão de temas, não busca semântica irrestrita. Pode não reconhecer uma lembrança ou expressão indireta. Sem candidato suficientemente relacionado, retorna esclarecimento sem chamar o modelo; o próprio modelo também deve pedir esclarecimento quando os recortes forem irrelevantes. Não se preenche a lacuna com uma passagem inventada.

## Verificação local

`node node_modules/vitest/vitest.mjs run tests/coracao.test.ts tests/assistant.test.ts`: 45 testes passaram na primeira rodada. Cobertura inclui o exemplo dos limites do conhecimento em ambas as edições, texto exato e contexto, 3 João 1:15 na grade Open NBV, sequência “alguma outra?” → “quem disse?”, evangelhos em ofensa/abuso, ausência de resultado sem gasto, referências falsas, modo Jesus sem personificação, tarifa/reserva, cobrança desconhecida, aborto, replay, mesmo-origin e tamanho dos streams. Todos os serviços externos são simulados.

ESLint dos arquivos novos e do ledger passou. Build integrado, orçamento de JS, tracing do corpus na função Vercel e QA de UI ficam com a integração do root. Nenhuma captura, transcrição, vídeo, chave ou arquivo do rascunho de voz foi alterado nesta implementação.
