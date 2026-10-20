# Ajuda por versículo e texto no céu 3D — 20/10/2026

## Comportamento

“Entender com IA” acompanha o texto no leitor e seus painéis, nos cards de conexões, na constelação, no céu 3D, na cronologia e no mapa. Cada ação transporta livro, capítulo e versículo canônicos; o card de uma conexão usa o destino, não a origem. O assistente valida a referência no servidor, recupera a BLIVRE e preserva os atalhos de episódios. Uma referência inválida recebe aviso, sem consulta automática.

Os estilos Bem simples, Contexto bíblico e No dia a dia são independentes dos modos entender, explorar e narrar. O estilo faz parte do pedido normalizado e de sua identificação. Omissão mantém contexto; valores inválidos são rejeitados. Modelo, teto, reserva financeira, limites e credenciais permanecem iguais. O áudio usa SpeechSynthesis após um clique, com parada, propriedade exclusiva do player e mensagem quando indisponível; não há cobrança de TTS nem autoplay.

Selecionar um capítulo no céu 3D carrega seu texto completo antes das conexões. O texto tem uma região própria de rolagem, ações por versículo, estado de carregamento e tentativa manual em caso de falha. Selecionar um versículo continua mostrando o texto exato. Painéis de capítulo/versículo carregam sob demanda.

O retorno do assistente para uma âncora da home também foi corrigido: os atalhos usam o histórico do roteador. Uma consulta interrompida ao navegar preserva seu UUID, oferece nova tentativa da mesma consulta e não reenvia automaticamente. Os rótulos de IA não entram na seleção nativa do texto bíblico.

## Evidência local

- Build completo final: 580 testes em 37 arquivos, Next 16.4.2 e check-dist passaram. Tipos, ESLint e diff-check passaram.
- JS inicial gzip: home 167.271 bytes (163,4 KiB), `/arcos` 167.112 bytes (163,2 KiB), `/assistente` 158.640 bytes (154,9 KiB). Teto de 168.960 bytes preservado; nenhuma dependência nova. Essa medida não inclui módulos adiados, dados, imagens, fontes ou HTML.
- Playwright Chrome 375/1440 e WebKit/Windows 375: referência Jeremias 17:8, texto, três estilos enviados corretamente, seleção Salmos 119:176, rejeição de Salmos 119:177 sem POST, controles de voz, retry com mesmo UUID e histórico home/assistente. API e voz simuladas nesses casos para verificar integração sem consumir o provedor.
- Activity: consulta interrompida, saída, retorno e tentativa manual mantêm UUID; nenhuma consulta automática adicional. Chrome 375, API simulada.
- Agent Browser/Chrome, axe 4.12.1 no conteúdo do assistente: zero violações automáticas; três textos sobre gradiente exigiram cálculo separado. Fundo mais escuro `#e9dfca` e tons `#6a5c48`, `#24383b`, `#6d6254`: contrastes 4,90:1, 9,32:1 e 4,50:1 respectivamente.

Capturas, scripts e relatórios ficam fora do Git em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/`: `verse-assistant-qa.cjs`, `verse-assistant-qa.json`, `verse-ui-*`, `verse-styles-*`, `qa-verse-study-entry.cjs`, `verse-study-*`. As imagens de QA com resposta simulada não comprovam uma resposta da Anthropic.

WebKit no Windows não equivale a um iPhone físico. Não foi aferida a voz audível no aparelho do Alex. A presença das citações comprova sua origem, não a infalibilidade da interpretação. A verificação real dos novos estilos e o deployment serão registrados separadamente após publicação.
