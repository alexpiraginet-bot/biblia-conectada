# Interlinear: palavra por palavra

## Função

Estudo nativo em `/interlinear`, acessível pelo menu e pela página de leitura. Cada passagem disponível tem endereço próprio (`/interlinear/<livro>/<capítulo>/<versículo>`). Na leitura da Bíblia Livre, **Palavra por palavra** aparece somente quando há um mapeamento explícito daquela referência. A Open NBV oferece acesso à coleção, sem presumir alinhamento de seus versículos.

Cada unidade mostra o original acima da glosa contextual em português. A transliteração é opcional. Tocar numa unidade abre o lema, o sentido no trecho e a nota editorial; os códigos Strong e de morfologia ficam como informação de consulta, não como significado definitivo. No celular, o detalhe abre junto da palavra selecionada; no desktop, fica ao lado do texto.

Uma unidade hebraica pode reunir palavra, prefixos e sufixos, exigindo várias palavras em português. A ordem original é preservada. O hebraico lê da direita para a esquerda; glosas e transliteração mantêm sua própria direção. **Interlinear não é equivalência exata entre línguas, tradução certificada ou nova edição completa da Bíblia.**

## Coleção inicial

O índice publicado e suas contagens derivam de `INTERLINEAR_REFERENCES`, do corpus gerado e dos tokens validados; não de números digitados na interface. O primeiro recorte inclui:

- Gênesis 1:1–5;
- Salmos 22:1 e 22:6; Salmos 23:1–6;
- João 1:1–5, 1:14 e 3:16;
- Mateus 27:46 e Marcos 15:34.

Uma referência fora dessa coleção não recebe glosa por aproximação nem por IA em tempo de execução. A rota retorna 404. Expandir a coleção exige alinhamento por ID original, glosas completas, notas pertinentes, testes e nova revisão.

## Fontes e transformações

STEPBible Data, commit `ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d`, já preservado em `fontes/stepbible/`. O pipeline verifica o commit, o SHA-256 de cada arquivo e sua presença em `fontes/SHA256SUMS`.

- **Hebraico:** TAHOT Gen–Deu e Job–Sng; seleção L/Q, sem juntar uma leitura ketiv alternativa. As barras de segmentação são retiradas apenas da apresentação; o campo original da fonte permanece nos dados.
- **Grego:** linhas marcadas SBL no TAGNT Mat–Jhn. O TAGNT normaliza grafia e pontuação; a interface identifica **seleção SBL no TAGNT**, sem afirmar uma reprodução independente do SBLGNT. Leituras de outras edições não são concatenadas. Variantes deslocadas ainda não implementadas fazem a expansão falhar.
- IDs, morfologia, lemas, transliteração e glosa inglesa de origem permanecem auditáveis. A glosa portuguesa está ligada ao ID daquela ocorrência, não apenas ao número de Strong.
- A leitura corrida de comparação é a **Bíblia Livre, sem alteração**. Glosas e notas portuguesas foram preparadas com assistência de IA e conferência editorial nesta implementação, **sem revisão acadêmica independente**. Não pertencem ao texto STEPBible nem representam endosso de seus autores.
- Os dados originais mantêm CC BY 4.0; glosas e conjunto derivado seguem CC BY-SA 4.0, conforme `LICENSE-DATA.md`. Crédito: “Data created by www.STEPBible.org based on work at Tyndale House Cambridge”.

## Exemplos que exigem cuidado

- **Salmos 22:6:** a fonte registra a numeração hebraica 22:7. תוֹלַעַת é glosado como “verme”; a palavra no verso não identifica por si uma espécie, uma cor ou um ciclo biológico. Essas inferências não entram como tradução.
- **Salmos 23:6:** a análise da fonte identifica שוב, “voltar”. A glosa “e voltarei” acompanha nota sobre a conhecida leitura “habitarei”; não se troca silenciosamente a análise para coincidir com uma tradução.
- **João 1:** notas distinguem as possibilidades contextuais de *logos*, *sarx* e *katalambanō*, sem tratar um código lexical ou uma ordem de palavras como prova teológica isolada.
- **Salmos 22:1 e os evangelhos:** o salmo e as citações nos relatos da cruz são apresentados com suas referências próprias; as palavras de Davi não são atribuídas automaticamente a Jesus em cada verso.

## Implementação e verificação

`site/scripts/data/interlinear.ts` produz um corpus pequeno dentro do staging já usado pelo projeto. Ausência de glosa, tokens extras, IDs repetidos, mudança da fonte ou seleção ambígua interrompem o build. O corpus completo fica no servidor; cada página entrega só a passagem exibida. Fontes de hebraico e grego ficam restritas às rotas de estudo. Nenhuma chamada paga ou tradução automática acontece ao abrir uma palavra.

Evidências da entrega: `docs/evidence/2026-10-26-interlinear.md`. Testes técnicos não substituem revisão por especialistas em línguas bíblicas. A interface deve manter visíveis a cobertura inicial, o nome das bases e a natureza editorial das glosas.
