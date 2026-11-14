# Leitura sem distrações

Pedido de Alex em 14/11/2026: leitura inspirada em uma tela de papel colorido, com mais espaço para a Palavra e conexões fora dessa experiência.

## Comportamento

- **Modo leitura** está nos capítulos BLIVRE/Open NBV e nas leituras disponíveis da liturgia. Abre o texto existente em um diálogo nativo que ocupa a área útil do navegador.
- Não copia, resume, traduz ou busca outra versão do texto. O conteúdo servidor é renderizado uma única vez, na página normal ou no diálogo.
- Menu do site, busca, IA, compartilhamento, checks individuais e conexões ficam fora do diálogo. Selecionar texto não abre a barra de estudo. A navegação anterior/seguinte continua ao final do capítulo.
- Referência e edição permanecem visíveis; atribuição da tradução fica no fim. As diferenças entre texto de estudo e lecionário continuam declaradas na liturgia.
- **Aa** oferece Papel, Sépia e Noite, tamanho entre 18 e 28 px equivalentes em rem e entrelinha proporcional. As preferências ficam no navegador; falha de armazenamento não impede a leitura.
- Sair/Escape devolve foco e aproxima a página normal do último versículo visível. Navegar para o capítulo seguinte preserva o modo e a aparência; o histórico do navegador continua disponível.
- Não usa Fullscreen API nem promete retirar as barras do Safari. Não é um componente Kindle nem um mecanismo de e-ink.

## Progresso

O automático continua opcional e segue os critérios de `READING-PROGRESS.md`. No modo leitura só o texto visível dentro do diálogo pode contar. Um diálogo de outro recurso interrompe a contagem. Marcações não geram pontos ou recompensas.

## Tema do site

O bloqueio temporário de Noite foi retirado. Novos visitantes abrem em **Dia**. Escolhas explícitas Dia/Noite/Sistema já salvas são preservadas; o bloqueio anterior não gravava uma escolha Noite. HTML sem JavaScript também começa claro. A aparência do papel é independente do tema do restante do app.

## Validação

Evidências, resultados e limites desta entrega: `docs/evidence/2026-11-14-daylight-reading-focus.md`. A publicação precisa ser confirmada por revisão, deploy e conferência do domínio; o arquivo de implementação não é prova de publicação.
