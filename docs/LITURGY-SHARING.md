# Compartilhamento da liturgia

- `/dia/AAAA-MM-DD` abre o dia fixado no endereço. Não redireciona para a data atual e ignora uma tentativa de trocar o dia por query string.
- `/liturgia?date=AAAA-MM-DD` continua funcionando; seu canonical e sua capa apontam para o endereço curto correspondente. A navegação anterior/seguinte usa os links curtos.
- “Compartilhar este dia” oferece WhatsApp com data/referências, copiar link e PNG horizontal ou Stories. As ações de imagem reutilizam o fluxo de versículos e a validação de tipo, assinatura e dimensões do PNG.
- O endpoint `/og` consulta os mesmos metadados sanitizados da página. As referências vêm do calendário; o trecho do Evangelho vem exclusivamente dos versículos resolvidos da Bíblia Livre, com fonte e reticências quando reduzido. Textos litúrgicos protegidos não entram na capa.
- Falhas produzem uma capa de indisponibilidade identificada pela data, sem referências ou citações inventadas. Cache dessa falha: até 60 segundos no CDN; capa diária válida: até 15 minutos.
- Compartilhar Stories abre o menu nativo quando suportado; baixar o PNG é o fallback. A interface não promete abrir uma publicação do Instagram diretamente pela web.
- `/dia` participa da mesma regra de jornada: liturgia só quando a data é a atual e há Escritura visível; outro dia é leitura comum.

Validação automatizada: `tests/liturgy-share.test.ts`, `tests/share-card.test.ts`, `tests/share-image.test.ts`, `tests/verse-share.test.ts`, `tests/routes.test.ts`.
