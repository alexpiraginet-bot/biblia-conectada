# Progresso de leitura — 01/11/2026

Implementação na branch `codex/bible-reading-progress`, base `0535017`. Método e limites em [READING-PROGRESS.md](../READING-PROGRESS.md).

## Verificação funcional

No Chrome, pela interface, em origem local de teste:

- Marcar 3 João 1:1; recarregar; marcação preservada.
- Marcar o capítulo inteiro; 14/14; desfazer restaura a marcação individual anterior.
- Ativar automático; texto de 3 João 1:2 visível por tempo suficiente recebe check. Desmarcar pausa o automático.
- Jornada: 3 João completo registra 14 versículos, 1 capítulo e 1 livro. Open NBV continua em zero, com seu próprio catálogo (3 João tem 15 posições nessa edição).
- Backup JSON de 464 bytes baixado e lido do disco; importação pela interface validou 14 marcações BLIVRE/zero Open NBV; mesclagem manteve 14, sem duplicar.
- Duas abas: desmarcar o versículo na segunda atualizou o painel da primeira para 13; desfazer atualizou para 14.
- Leitor compilado recarregado com histórico existente, sem erros de hidratação no console. Controles só recebem atualização após o efeito de montagem da sua boundary.
- Painel conferido em viewports 375×812 e 1440×1000. Noite e Dia conferidos; Dia apenas por alteração temporária de DOM em QA e restaurado por reload. O padrão público continua Noite.

Capturas e logs locais: `C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/reading-progress-20261101/`.

## Testes e revisão

- 1.267 testes passaram, 2 ignorados preexistentes, 79 arquivos. Cobertura nova: edição, contagens, idempotência, backup completo, referências inválidas, quota, armazenamento ilegível, desfazer obsoleto, recuperação sucessiva A→B→C, locks e relógio automático.
- TypeScript e ESLint passaram.
- Revisão independente de persistência, desempenho e interface; consulta local a Ollama usada como crítica, sem ser tratada como prova.
- Primeiro orçamento: Arcos 168.888 bytes gzip9, abaixo de 168.960; Jornada 162.104. Metadados/persistência do leitor carregados sob demanda.
- O verificador de traduções precisou aceitar o atributo adicional `data-reading-ref` no span do texto; continua comparando todos os versículos e agora também verifica a referência da marcação. O texto bíblico não foi alterado.

## Portões de entrega

Build final, orçamento final e publicação ainda devem ser confirmados pelo registro de entrega. A existência desta página não afirma produção READY.

Limites: teste em Chrome no Windows, não em iPhone físico. Visibilidade/tempo estimam exposição; não comprovam leitura humana. Sem sincronização em nuvem, pontos extras, mudança em recompensas ou modificação em `estudos/`. Marcações de QA pertencem somente à origem local.
