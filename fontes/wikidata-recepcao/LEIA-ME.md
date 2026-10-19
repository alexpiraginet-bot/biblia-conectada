# Recepção cultural: instantâneo do Wikidata e do Wikimedia Commons

Obras de arte sobre duas passagens, para o piloto da faixa "Recepção cultural" da linha do tempo.

- **Consulta feita em 2026-10-19** no Wikidata Query Service (`https://query.wikidata.org/sparql`), uma consulta por minuto.
- `bom-samaritano.rq` → `bom-samaritano.json`: obras cujo P180 (retrata), P921 (assunto principal) ou P144 (baseada em) é a parábola do bom samaritano (`Q261103`) ou uma parte dela (P1441, P361). 200 linhas, 155 obras.
- `criacao-luz.rq` → `criacao-luz.json`: o mesmo para a narrativa da criação em Gênesis (`Q137651`) e "Haja luz" / Fiat lux (`Q2704440`). 21 linhas, 17 obras.
- Os `.json` das consultas são a resposta sem nenhuma alteração.

**Licença:** dados estruturados do Wikidata, CC0. A página https://www.wikidata.org/wiki/Wikidata:Licensing diz (lida em 19/10/2026): "All structured data (i.e. the main, Property, Lexeme, and EntitySchema namespaces) is released into the public domain under Creative Commons Zero."

**Imagens (`commons-arquivos.json`):** para as pinturas datadas antes de 1900, a página de cada arquivo do Wikimedia Commons indicado pelo Wikidata foi lida em 19/10/2026, uma por uma, da mais antiga para a mais nova em cada era, até baixar quatro miniaturas em domínio público por era (ou acabar a lista). O arquivo guarda, de cada página: o nome do arquivo, o SHA-256 do HTML lido, o autor e a data como a página os escreve, e as licenças marcadas na página (`licensetpl_short`/`licensetpl_long`, os mesmos campos que a API do Commons chama de `LicenseShortName`). `publicDomain` só é verdadeiro quando todas as licenças da página são da família domínio público (Public domain, PD…, Public Domain Mark, CC0).

- 52 páginas lidas, 45 em domínio público.
- A API do Commons (`api.php`) respondeu 429 a todas as tentativas desse dia, e o `upload.wikimedia.org` a quase todas: só 7 miniaturas de 330 px vieram. Cada uma foi olhada; 4 entraram no site, em `site/public/recepcao/` (WebP, lado maior de até 400 px, SHA-256 no `commons-arquivos.json`) e 3 ficaram fora: duas mostram rosto de criança ou de figura jovem (regra 8 do `CLAUDE.md`) e uma mostra Jesus e a samaritana no poço (João 4), não a parábola, embora o Wikidata a ligue ao bom samaritano. Os motivos estão em `site/scripts/data/reception.ts` (`IMAGE_REVIEW`, `WRONG_SUBJECT`).
- Crédito de cada imagem no site: "‹título›, ‹autor›, ‹data› · imagem: Wikimedia Commons, ‹arquivo›, domínio público", com autor e data da página do arquivo.

**Como refazer:** rode as duas consultas `.rq` no endpoint acima com `Accept: application/sparql-results+json` e compare; as páginas do Commons estão em `https://commons.wikimedia.org/wiki/File:‹arquivo›`. O resultado muda quando o Wikidata e o Commons mudam; por isso o site lê só esta cópia, conferida por SHA-256 em `fontes/SHA256SUMS`, e nunca consulta o Wikidata ou o Commons no build.
