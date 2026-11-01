# Progresso de leitura bíblica

O histórico de leitura fica em `/jornada#leitura`, antes da área de pontos. Ele permite marcar versículos e capítulos, acompanhar quanto da edição foi marcado e continuar a última passagem registrada. É um registro pessoal do navegador, sem conta e sem confirmação no servidor.

Este histórico é independente dos [pontos da Jornada](JORNADA.md). Marcar, desmarcar, importar ou editar dados locais não concede pontos, não comprova leitura e não cria direito a presentes. As atividades e recompensas da Jornada mantêm suas próprias regras no servidor.

## Regras de contagem

- BLIVRE e Open Nova Bíblia Viva têm estados separados. Ler ou marcar uma edição não avança a outra; não se presume equivalência entre os números dos versículos.
- Livros, capítulos e totais de versículos vêm dos metadados gerados de cada edição por `translationBooks()`. O painel recebe apenas `slug`, `name` e `verses`, sem carregar os textos completos.
- Cada posição de versículo conta uma vez dentro da edição, livro e capítulo. Repetir uma marcação ou importar o mesmo backup não duplica o total.
- O percentual é `versículos marcados / versículos da edição × 100`. A exibição mantém uma casa decimal sem arredondar uma leitura incompleta para 100%; pequenos avanços aparecem como `<0,1%`.
- Um capítulo fica completo somente quando todos os seus versículos estão marcados. Um livro fica completo quando todos os seus capítulos estão completos.
- O painel permite marcar/desmarcar capítulos inteiros; os controles junto às passagens também permitem marcar/desmarcar um versículo. Uma marcação manual é uma declaração do leitor, não uma medição de atenção.
- **Desfazer** restaura a marcação anterior do capítulo afetado e verifica sua revisão para não sobrescrever mudanças posteriores de outra aba. Essa ação fica disponível na sessão atual da interface; não é um histórico ilimitado de versões nem uma reversão de importações.
- Desmarcar ou desfazer pausa a marcação automática, evitando que o trecho seja imediatamente marcado de novo.
- **Continuar leitura** usa a última referência registrada daquela tradução. Esse dado não representa tempo de estudo ou ponto máximo atingido no cânon.

## Marcação automática opcional

Ela começa desativada e depende de escolha explícita em **Marcar os versículos enquanto leio** ou no controle equivalente do leitor. O estado é local ao navegador. O backup importado não habilita a opção.

Os parâmetros de `site/src/components/reading-progress/automatic-policy.ts` são a fonte das regras e do texto explicativo da interface:

| Critério | Valor atual |
| --- | --- |
| Área mínima do trecho visível | `READING_VISIBLE_RATIO`: 85% |
| Tempo mínimo por versículo | `MIN_READING_MS`: 8 segundos |
| Estimativa para textos maiores | `READING_WORDS_PER_MINUTE`: 180 palavras/minuto |
| Pausa por ausência de interação | `READING_IDLE_MS`: 90 segundos |

O controlador considera um versículo ainda não marcado por vez, com referência válida e edição identificada. Usa o texto bíblico sinalizado por `data-reading-ref`; não interpreta qualquer texto da tela como uma passagem.

Só acumula tempo com a página visível, foco no documento, atividade recente e texto disponível na área de leitura. Rolagem, mudança de trecho, saída da aba, perda de foco, diálogo modal ou menu sobre a leitura interrompem o relógio. A verificação também considera recortes de contêineres internos e um elemento sobre o centro do trecho. Rolar rapidamente não conclui um capítulo; cada versículo precisa satisfazer as condições.

Esse tempo é uma estimativa de exposição ao texto. Não comprova compreensão, atenção, fé ou identidade. Versículos muito extensos que não atingirem a visibilidade necessária podem ser marcados manualmente. Componentes sem referência identificada permanecem fora do rastreamento.

## Persistência e privacidade

O estado versionado fica em `localStorage`, na chave `bc:reading-progress:v1`. Contém a escolha do automático, referências, números dos versículos marcados, revisões dos capítulos e a última posição/data por edição. Não contém o texto bíblico, nome, e-mail, oração ou mensagens do assistente.

Este módulo não envia marcações ou referências a uma API, Analytics ou Ads. Não tem login, banco remoto, perfil público ou recuperação por e-mail. Como outros dados do site, o armazenamento local é acessível ao JavaScript da mesma origem; não é um cofre criptografado.

As abas da mesma origem recebem atualizações por eventos de armazenamento. Escritas usam Web Locks; quando essa API não está disponível, `browser-lock.ts` usa uma transação `readwrite` de IndexedDB para serializar as operações entre abas. Sem um mecanismo de coordenação disponível, novas gravações falham explicitamente; a leitura existente e a exportação continuam disponíveis quando o navegador permite acessá-las.

Os estados da interface são `loading`, `ready`, `unavailable` e `corrupt`. Armazenamento bloqueado, quota excedida ou dados ilegíveis não viram uma nova conta zerada nem uma confirmação de salvamento. A interface só confirma a mudança após `ok: true` da operação e bloqueia marcações enquanto o histórico estiver inacessível.

Limpar os dados do site, mudar de origem/domínio, navegador, perfil ou aparelho pode separar ou apagar o acesso a esse estado. Sessões privadas podem descartá-lo ao fechar. Não há sincronização em nuvem; use o backup para transportar a leitura.

## Backup e recuperação

O painel exporta JSON no formato `biblia-conectada/reading-progress@1`. O arquivo contém o percurso pessoal de leitura; deve ser guardado de forma privada. Preparar o download não confirma que o navegador ou o usuário efetivamente salvou o arquivo.

A importação segue estas etapas:

1. Conferir o tamanho antes de ler o arquivo e validar formato, campos, edições, referências e números contra o catálogo real.
2. Mostrar o nome do arquivo e quantas marcações ele contém em cada tradução.
3. Aguardar a ação explícita **Importar e mesclar**.
4. Revalidar e unir os conjuntos de versículos à versão atual, sem duplicações ou remoção das marcações existentes.

Mesclar não significa substituir: uma desmarcação no arquivo não apaga uma marcação atual. Um backup antigo pode acrescentar novamente um versículo desmarcado depois de sua exportação. A opção atual do automático é preservada na mesclagem; o valor recebido no backup não a ativa.

Se o estado local estiver ilegível, a mesclagem normal fica bloqueada. A recuperação exige marcar **Restaurar este backup; guardar cópia dos dados locais ilegíveis** e confirmar a restauração. Antes de substituir o estado, o módulo preserva o original em `bc:reading-progress:recovery:v1`. Cópias anteriores e envelopes desconhecidos são mantidos; originais idênticos não são duplicados. A restauração usa um backup validado e deixa o automático pausado.

**Baixar dados preservados** exporta um arquivo de recuperação com os originais arquivados e, se houver, os dados ilegíveis atuais. Esse arquivo de recuperação não é um backup de leitura validado e não deve ser apresentado como importável diretamente. Se o navegador não conseguir preservar os originais ou o limite for atingido, a restauração é interrompida.

Limites definidos pelo código:

- `MAX_READING_BYTES` em `model.ts`: 1.000.000 bytes UTF-8 para o estado/backup.
- `MAX_READING_CHAPTERS` em `model.ts`: até 2.500 registros de capítulo por edição; importação também valida o catálogo real.
- `MAX_READING_RECOVERY_BYTES` em `store-core.ts`: 3.000.000 bytes para o arquivo local de recuperação.

Esses limites não garantem espaço disponível. A quota e a persistência efetiva dependem do navegador.

## Organização do código

| Arquivo/pasta em `site/src/` | Responsabilidade |
| --- | --- |
| `lib/reading-progress/model.ts` | Estado, validação, contagens, marcações, desfazer e mesclagem |
| `lib/reading-progress/store-core.ts` | Persistência validada, estados de erro, backup e preservação de originais |
| `lib/reading-progress/browser-lock.ts` | Coordenação de gravações entre abas |
| `lib/reading-progress/store.ts` | Adaptador do navegador e `useReadingProgress()` |
| `components/reading-progress/ReadingProgressDashboard.tsx` | Painel local em `/jornada#leitura`, seleção de edição, pesquisa de livros e backup |
| `components/reading-progress/ReadingControls.tsx` | Controles junto aos versículos/capítulos |
| `components/reading-progress/ReadingProgressHost.tsx` | Carregamento sob demanda do controlador e avisos com desfazer |
| `components/reading-progress/reading-controller.ts` | Referências reais do DOM, marcação manual e relógio automático |
| `components/reading-progress/automatic-policy.ts` | Critérios e funções puras de tempo/visibilidade |

O catálogo e o observador do controlador são carregados sob demanda pelo host. O painel recebe metadados do servidor e só monta a lista de capítulos de um livro quando ela é expandida. Links de capítulos não fazem pré-carregamento automático de todas as páginas. Não há dependência nova de serviço externo ou modelo de IA.

Os testes da feature estão em `site/tests/reading-progress.test.ts` e `site/tests/reading-automatic.test.ts`. Este documento descreve regras e implementação; resultados de build, matriz de QA visual e publicação devem ser registrados no relatório da rodada correspondente.
