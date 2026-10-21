# Open NBV: importação integral e limites de alinhamento

Registro técnico de 21/10/2026. A edição é publicada separadamente da Bíblia Livre; não é uma tradução produzida pelo projeto. Esta importação não substitui o texto BLIVRE nem altera a grade dos grafos.

## Fonte e licença

- Obra: **Biblica® Open Nova Bíblia Viva™**, edição 2007.
- Arquivo preservado: `fontes/ebible/poronbv/poronbv_vpl.zip`.
- SHA-256: `1c43e141446ddd43d8377907c15d1c0c5bfe3dddd29302cd5d676c44f23085c4` (também registrado em `fontes/SHA256SUMS`).
- Texto importado: `poronbv_vpl.txt`, extraído em memória com decodificação UTF-8 estrita. O aviso `poronbv_about.htm` permanece no ZIP original.
- Licença declarada na [página da edição no eBible](https://ebible.org/poronbv/copyright.htm): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br). A edição também está no [catálogo Open.Bible da Biblica](https://preview.open.bible/bibles/biblica-open-nova-biblia-viva-2007).

Avisos mantidos no registro da edição, manifesto e licença ao lado dos arquivos públicos:

> Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc.

> The original Work by its copyright holders is available for free at www.biblica.com and open.bible.

O aviso da marca da fonte acompanha esses créditos. O nome da obra e os textos de todos os versículos são preservados. A transformação separa referências VPL e texto em arrays JSON; não reescreve, resume, funde ou elimina versículos. A organização derivada conserva CC BY-SA 4.0. A apresentação não implica apoio da Biblica ao projeto. Ver também `ATTRIBUTION.md` e `LICENSE-DATA.md`.

## Integridade e arquivos gerados

O corpus contém **66 livros, 1.189 capítulos e 31.105 posições numeradas**, todas com texto não vazio. A BLIVRE atual tem 31.102 posições. O importador falha se o ZIP mudar de hash, se houver UTF-8 inválido, livro desconhecido, ordem incorreta, referência duplicada, lacuna na sequência, capítulo ausente ou texto vazio. Alterações futuras da fonte exigem nova revisão, não uma atualização silenciosa do hash.

- `site/src/data/generated/translations/open-nbv-books.json`: metadados `Book[]`, com as contagens reais da edição.
- `site/src/data/generated/translations/open-nbv/{slug}.json`: `{ osis, chapters: string[][] }`.
- `site/public/data/translations/open-nbv/{slug}/{chapter}.json`: um array de textos do capítulo, na ordem da fonte.
- `open-nbv-manifest.json` nos dados gerados e `translations/open-nbv/manifest.json` público: fonte, hash, contagens, avisos e alinhamento não revisado.
- `translations/open-nbv/LICENSE.txt` público: atribuição e licença próprias; o `public/data/LICENSE.txt` diferencia explicitamente esse corpus da BLIVRE.

Os metadados reutilizam identidade, nomes, slugs e ordem dos livros do cânon do projeto. **`firstVerse` é recalculado para a edição e não é um `gv` do grafo BLIVRE/OpenBible.** Os livros seguintes a Juízes já têm deslocamento diferente. Não passar esses valores para `grid.locate`, `verseText(gv)`, binários de arcos ou ligações por versículo. `firstChapter` coincide somente porque a identidade e as contagens de capítulos foram verificadas.

O formato VPL é texto por versículo; não contém toda a diagramação, notas ou aparato editorial de outras apresentações da obra. A leitura preserva o corpus completo desse arquivo, sem inventar esses elementos.

## Diferenças verificadas

A comparação das referências numéricas encontrou três posições adicionais e nenhuma posição canônica ausente. Isso não prova equivalência textual nas outras 31.102 posições.

| Posição Open NBV | Observação nas duas fontes locais | Decisão de importação |
|---|---|---|
| Juízes 5:32 | O repouso de quarenta anos aparece separado na Open NBV e no final de Juízes 5:31 da BLIVRE. | Preservar 5:32; não fundir nem aprovar equivalência automática. |
| 1 Samuel 20:43 | A separação de Davi e Jônatas ocupa uma posição adicional; os dois capítulos 21 começam com Davi em Nobe. | Preservar 20:43; não descartar nem atribuir uma ligação de outro versículo. |
| 3 João 1:15 | A paz e as saudações aparecem separadas na Open NBV e reunidas no final de 1:14 da BLIVRE. | Preservar 1:15; eventual relação de um para muitos requer revisão. |
| 1 João 5:7–8 | Mesma numeração, mas a cláusula sobre as testemunhas no céu presente na BLIVRE 5:7 não aparece nessa posição na Open NBV. | Demonstração concreta de que contagens iguais não certificam correspondência de conteúdo. |

Outras verificações pontuais (Mateus 17:21, João 5:4, Atos 8:37, Romanos 16:24 e Lucas 23:34) encontraram posições não vazias em ambas as fontes. São amostras, não um parecer textual global. Este registro descreve os arquivos; não resolve questões de crítica textual nem qualifica uma leitura como superior.

## Política de lançamento

Leitura integral em `/ler/open-nbv/{slug}/{chapter}[/{verse}]`, validada pelas contagens próprias. Navegação e relações **por capítulo** podem aproveitar o grafo existente, com origem OpenBible explícita. São relações de capítulos na base; não constituem validação de cada relação para cada redação da tradução.

**Ligações por versículo entre as edições permanecem não revisadas.** Não criar um mapa de identidade apenas pela numeração ou por igualdade de contagens. Uma futura correspondência precisa admitir relações de um para muitos, diferenças de conteúdo e revisão humana com proveniência por unidade. IA, compartilhamento e leitura devem buscar o texto da edição selecionada; nunca substituir silenciosamente pela BLIVRE.

## Contrato dos módulos

`src/lib/translations.ts` é seguro para o navegador e não importa o corpus: `TranslationId`, `TRANSLATIONS`, `getTranslation`, `translationPath` e `parseTranslationPath`. O parser recebe pathname limpo e valida apenas sintaxe; livro, capítulo e versículo precisam de validação semântica da edição. `credit` contém o aviso curto literal; `sourceNotice` e `trademarkNotice` preservam os demais avisos da Open NBV.

`src/lib/translation-reading.ts` é somente servidor: `translationBooks(id): Book[] | null` síncrono; `translatedChapter(id, slug, chapter): Promise<string[] | null>`; `translatedVerse(id, slug, chapter, verse): Promise<string | null>`. Coordenadas inválidas retornam `null`. Falta de um arquivo válido é erro de integridade, sem fallback de tradução. Os livros são carregados sob demanda no servidor; o cliente pode buscar somente o JSON público do capítulo.

## Verificação

`site/tests/translation-data.test.ts` compara todos os 31.105 textos e referências ao VPL original, todos os 1.189 capítulos públicos e os 66 livros gerados. Também verifica rejeição de fontes malformadas, avisos de licença, preservação dos extras, índices próprios, leitura da edição correta, URLs e a diferença de 1 João 5:7. A execução não faz chamadas de IA nem altera a fonte. O pipeline global registra o ZIP entre seus inputs e os arquivos gerados entre seus outputs com SHA-256.

O custo de integração é armazenamento estático, geração e navegação da edição; não há API de tradução ou cobrança por versículo. A fonte tem cerca de 4,73 MB descompactada; os JSONs públicos de capítulos somam aproximadamente 4,51 MB sem compressão. Isso não é o peso inicial do navegador: a leitura solicita apenas o trecho necessário. O orçamento de JavaScript e a implantação são verificados separadamente pelo build integrado.
