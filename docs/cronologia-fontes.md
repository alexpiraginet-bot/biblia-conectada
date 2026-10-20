# Fontes e critérios de /cronologia

Verificação de referências em 20/10/2026. Esta página é um percurso editorial de leitura dos evangelhos, com dez momentos; não é uma harmonização exaustiva nem uma cronologia histórica demonstrada.

## Texto bíblico

Todos os trechos visíveis são carregados por `verseText` da base BLIVRE já preservada pelo projeto, sem reescrita. `loadChronologicalReading` recebe o leitor de versículos no servidor e entrega apenas os trechos selecionados ao componente interativo.

Os testes confrontam cada versículo apresentado com o corpus real, verificam referências e links, e falham quando falta texto. A atribuição e licença existentes continuam em `/sobre`.

## Sequência e comparação

Nascimento → batismo → Caná → ensino → multiplicação dos pães → entrada em Jerusalém → última refeição → cruz → túmulo → reencontros.

A ordem ampla serve à leitura. Não fixa a posição histórica exata de cada cena, a extensão do ministério ou uma relação cronológica entre todos os episódios dos evangelhos. O percurso não é ordenado pela composição dos livros.

Distinções preservadas na interface:

- Caná aparece apenas em João; nascimento em Mateus e Lucas.
- João 1:32–34 é testemunho relacionado ao batismo, sem narrar o ato.
- As bem-aventuranças de Mateus e Lucas têm cenários narrativos diferentes.
- O lava-pés de João é uma passagem relacionada à ceia, sem ser apresentado como paralelo das palavras sobre pão e cálice.
- Os encontros após a ressurreição têm contextos e lugares diferentes.
- Marcos 16:7 anuncia o encontro na Galileia. O percurso não usa o final longo de Marcos como um paralelo sem qualificação.
- Quando falta um paralelo, a interface o informa; não inventa citações.

## Estudos consultados

Somente links e pequenas sínteses editoriais entram no projeto. Os artigos não foram copiados nem adicionados como um novo corpus.

| Fonte | Uso preciso |
| --- | --- |
| [BYU Religious Studies Center — The Synoptic Gospels](https://rsc.byu.edu/new-testament-history-culture-society/synoptic-gospels) | Faixa de Marcos 65–74 d.C.; proposta de Lucas 80–90 d.C.; diferenças entre as perspectivas e limites da harmonização. O texto também apresenta outras datações e teorias. |
| [Open Yale Courses — Dale B. Martin, The Gospel of Matthew](https://oyc.yale.edu/religious-studies/rlst-152/lecture-7) | Proposta de Mateus 80–90 d.C. |
| [Open Yale Courses — Dale B. Martin, The Gospel of Mark](https://oyc.yale.edu/religious-studies/rlst-152/lecture-6) | Datação aproximada em torno de 70 d.C.; final de Marcos e sua discussão textual. |
| [Open Yale Courses — Dale B. Martin, The Gospel of Luke](https://oyc.yale.edu/religious-studies/rlst-152/lecture-9) | Organização literária, geografia e deslocamento narrativo de episódios; sustenta a nota de que a ordem de leitura não prova uma sequência histórica exata. |
| [PBS FRONTLINE — The Gospel of John](https://www.pbs.org/wgbh/frontline/shows/religion/story/mmjohn.html) | Faixa proposta de conclusão de João 90–110 d.C. |
| [Biblical Archaeology Society — When Was Jesus Born?](https://www.biblicalarchaeology.org/daily/people-cultures-in-the-bible/jesus-historical-jesus/when-was-jesus-born-bc-or-ad/) | Proposta de nascimento em 4 a.C. ou antes em relação a Herodes; a página do projeto informa que a conciliação das narrativas é discutida. |
| [BYU Studies — Dating the Death of Jesus Christ](https://byustudies.byu.edu/article/dating-the-death-of-jesus-christ) | Discussão de 30 e 33 d.C. como propostas para a crucificação. O artigo defende uma alternativa; o produto não apresenta sua conclusão como consenso. |

As datas de composição e o contexto temporal dos acontecimentos ficam em um `details` opcional, com fontes junto às afirmações. As faixas são propostas acadêmicas, não limites aceitos por todos os estudiosos.

## Imagens e áudio

As imagens `/journey/nativity.webp`, `/journey/galilee-teaching.webp`, `/journey/jerusalem.webp` e `/journey/galilee-dawn.webp` são recriações artísticas por IA, com rótulo visível. Ilustram paisagens e atmosfera; não são documentos arqueológicos nem pretendem reconstruir com precisão os locais de cada episódio.

O botão **Ouvir passagem** usa `speechSynthesis` do navegador, após clique explícito, com idioma solicitado `pt-BR`. Não há autoplay. A leitura para ao trocar momento, evangelho, modo de comparação ou desmontar o componente. Depende das vozes disponibilizadas pelo aparelho/navegador; não é uma narração gravada. A implementação não chama serviço externo próprio, mas não garante que a voz escolhida pelo navegador funcione offline.

## Verificação

- Testes de sequência, identidade dos trechos BLIVRE, ausência de paralelos inventados, falha explícita sem fonte e referências de composição.
- ESLint nos arquivos novos.
- `tsc --noEmit`.
- Verificação visual e navegação da integração ficam registradas pelo agente principal.
