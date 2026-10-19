# Dados abertos da Bíblia Conectada

Tudo o que o site mostra sai de um conjunto de dados que qualquer pessoa pode baixar, estudar e usar nos próprios projetos: as **ligações entre os versículos** (referências cruzadas da OpenBible.info, com votos), o **texto da Bíblia Livre (BLIVRE)** e o **grafo dos capítulos**, em português. Os arquivos são gerados por código a partir de fontes livres (`fontes/` e `estudos/*/data/`) e refeitos a cada build do site, com testes que conferem cada número.

- **No site:** a página `/dados` lista os arquivos com tamanho e número de registros, e os arquivos ficam em `/dados/v1/`. O site ainda não tem endereço público (o projeto da Vercel está bloqueado, ver `HANDOFF.md` §9); a URL entra aqui depois do deploy.
- **No seu computador:** os mesmos arquivos saem em `site/public/dados/v1/` com um comando (seção [Gerar tudo de novo](#gerar-tudo-de-novo)). Eles não ficam no git.
- **Licença:** dados derivados em CC BY-SA 4.0; o texto bíblico segue a licença dele, CC BY 4.0 Brasil. Créditos em [Como dar crédito](#como-dar-crédito).

## Em resumo

| Arquivo | O que tem | Registros |
|---|---|---|
| [`ligacoes.csv`](#ligacoescsv) | Cada par distinto de versículos ligados, com votos e direção | 301.539 linhas |
| [`versiculos.csv`](#versiculoscsv) | Cada versículo, com a referência em português e em OSIS e o número de ligações | 31.102 linhas |
| [`livros.json`](#livrosjson) | Os livros: nome, abreviações, testamento, versículos por capítulo | 66 livros |
| [`capitulos.csv`](#capituloscsv) | Cada capítulo, com pares de ligações e posição no grafo | 1.189 linhas |
| [`capitulos-arestas.csv`](#capitulos-arestascsv) | Cada par de capítulos com ligações entre eles | 142.082 linhas |
| [`texto/<livro>.json`](#textolivrojson) | O texto da Bíblia Livre, sem alterações, um arquivo por livro (66 arquivos) | 31.102 versículos |
| [`estudos/natal.json`](#estudosnataljson) | Os números do estudo “Antes do Natal, já estava escrito” | |
| `datapackage.json` | Esquema de cada tabela (campos, tipos, chaves), licenças e fontes, no padrão [Frictionless Data Package v2](https://datapackage.org/) | |
| `LEIA-ME.md`, `LICENSE.txt` | Resumo em português e licenças, para quem baixa os arquivos soltos | |
| `SHA256SUMS` | SHA-256 de todos os arquivos (`sha256sum -c SHA256SUMS`) | |
| `manifest.json` | Tamanho em bytes, SHA-256 e número de registros de cada arquivo (é o que a página `/dados` lê) | |
| `biblia-conectada-dados-v1.zip` | Tudo acima, menos o `manifest.json`, numa pasta só | |

Os números de registros desta tabela são conferidos por teste contra o `manifest.json` (`site/tests/open-data.test.ts`). Os tamanhos exatos estão no `manifest.json` e na página `/dados`: na versão 1.0.0, os arquivos soltos somam cerca de 33 MB e o zip, cerca de 8 MB.

## Formato

- **CSV:** UTF-8 sem BOM, separado por vírgula, com uma linha de cabeçalho, linhas terminadas em LF (`\n`). Campo com vírgula, aspas ou quebra de linha vai entre aspas, com as aspas internas dobradas (RFC 4180). Campo vazio quer dizer "sem valor". Os nomes das colunas são os nomes dos campos no `datapackage.json`, na mesma ordem (conferido por teste).
- **JSON:** UTF-8. `livros.json` é uma lista de registros; os arquivos de `texto/` e `estudos/natal.json` são objetos.
- **Índices globais** ligam os arquivos: `indice` do versículo (0 = Gênesis 1:1, 31.101 = Apocalipse 22:21) e `indice` do capítulo (0 = Gênesis 1, 1.188 = Apocalipse 22). Começam em 0.
- **Referências** aparecem de dois jeitos: em português (`Isaías 9:6`, `Isaías 9`), com os nomes dos livros de `livros.json`, e em OSIS (`Isa.9.6`), o formato da OpenBible.info.
- **No Excel**, abra pelo menu Dados → De Texto/CSV e escolha a origem "65001: Unicode (UTF-8)" e o delimitador vírgula; abrir com dois cliques pode trocar os acentos e as colunas. LibreOffice e Google Planilhas perguntam a codificação na importação.

## Convenções que mudam os números

São as mesmas dos vídeos e do resto do site. Quem comparar com outra base deve olhar estas cinco primeiro.

1. **Grade de versículos KJV/OpenBible.** 66 livros, 1.189 capítulos e 31.102 versículos, a numeração da King James usada pela OpenBible.info. A BLIVRE encaixa nela sem nenhuma diferença. Outras traduções numeram alguns versículos de outro jeito (ver `fontes/README.md`).
2. **Um trecho conta pelo primeiro versículo.** Uma referência de Mateus 5:3 para "Salmos 1:1–3" vira uma ligação com Salmos 1:1, como no script dos vídeos (`estudos/biblia-referencias/tools/analyze.py`). Um versículo citado depois do fim do capítulo é trazido para o último versículo dele. Se cada trecho fosse expandido versículo a versículo, as contagens mudariam (`HANDOFF.md` §4.2).
3. **Auto-pares ficam de fora.** As 344.799 linhas da OpenBible.info formam 301.584 pares únicos de versículos. 45 deles ligam um versículo a um trecho que começa nele mesmo (por exemplo, Mateus 5:3 → Mateus 5:3–12). Esses 45 não entram em `ligacoes.csv`: sobram 301.539 pares de versículos diferentes.
4. **Votos são a soma das duas direções** e podem ser zero ou negativos. Na OpenBible.info, cada referência tem um saldo de votos de leitores, e uma ligação pode aparecer de A para B, de B para A ou nas duas. Em `ligacoes.csv`, `votos` soma as duas; a direção e o voto de cada lado têm colunas próprias. Os votos vão de -86 a 1.477. Cada direção tem no máximo uma linha na fonte (conferido pelo pipeline).
5. **As ligações de um versículo** são os outros versículos ligados a ele, contados uma vez cada, com qualquer voto, sem contar o próprio versículo. É o número que o site mostra ao lado de cada versículo (Isaías 9:6 tem 212). 30.303 versículos têm pelo menos uma ligação.

## Os arquivos

Os tipos seguem o Table Schema: `integer` é número inteiro, `number` é número com casas decimais, `string` é texto, `array` é lista JSON.

### `ligacoes.csv`

Cada par distinto de versículos ligados pelas referências cruzadas da OpenBible.info, uma vez só. Ordem das linhas: `indice_a`, depois `indice_b` (ordem dos livros). Chave primária: `indice_a` + `indice_b`. 301.539 linhas.

| Campo | Tipo | O que é |
|---|---|---|
| `referencia_a` | string | Versículo do par que vem antes na ordem dos livros (menor índice) |
| `referencia_b` | string | Versículo que vem depois (maior índice) |
| `votos` | integer | Soma dos votos das duas direções. Pode ser zero ou negativa |
| `votos_max` | integer | Maior voto entre as direções listadas; com uma direção só, é o voto dela |
| `direcao` | string | Em que direção a OpenBible.info lista a referência: `a_para_b`, `b_para_a` ou `ambas` |
| `votos_a_para_b` | integer | Voto da referência listada de a para b; vazio quando essa direção não existe |
| `votos_b_para_a` | integer | Voto da referência listada de b para a; vazio quando essa direção não existe |
| `osis_a`, `osis_b` | string | Os dois versículos em OSIS |
| `indice_a`, `indice_b` | integer | Índices globais dos dois versículos (`versiculos.csv`); sempre `indice_a < indice_b` |

```csv
referencia_a,referencia_b,votos,votos_max,direcao,votos_a_para_b,votos_b_para_a,osis_a,osis_b,indice_a,indice_b
Gênesis 1:1,João 1:1,724,381,ambas,381,343,Gen.1.1,John.1.1,0,26045
Gênesis 1:1,Êxodo 31:18,-39,-39,a_para_b,-39,,Gen.1.1,Exod.31.18,0,2438
Isaías 7:14,Mateus 1:23,333,185,ambas,148,185,Isa.7.14,Matt.1.23,17796,23167
Isaías 9:6,Lucas 2:11,228,179,ambas,179,49,Isa.9.6,Luke.2.11,17835,24984
```

### `versiculos.csv`

Um registro por versículo, na ordem dos livros. Chave primária: `indice`. 31.102 linhas.

| Campo | Tipo | O que é |
|---|---|---|
| `indice` | integer | Índice global do versículo (0 a 31.101) |
| `referencia` | string | Referência em português |
| `osis` | string | Referência em OSIS |
| `livro`, `livro_osis` | string | Nome do livro em português e código OSIS |
| `testamento` | string | `AT` ou `NT` |
| `capitulo`, `versiculo` | integer | Números do capítulo e do versículo |
| `indice_capitulo` | integer | Índice global do capítulo (`capitulos.csv`) |
| `ligacoes` | integer | Outros versículos ligados a este (convenção 5). A soma da coluna é 2 × 301.539 |

```csv
indice,referencia,osis,livro,livro_osis,testamento,capitulo,versiculo,indice_capitulo,ligacoes
17835,Isaías 9:6,Isa.9.6,Isaías,Isa,AT,9,6,687,212
```

### `livros.json`

Lista com os 66 livros, na ordem da grade. Um registro por livro:

| Campo | Tipo | O que é |
|---|---|---|
| `ordem` | integer | 1 (Gênesis) a 66 (Apocalipse) |
| `osis` | string | Código OSIS |
| `nome` | string | Nome em português (o mesmo das referências) |
| `slug` | string | Nome sem acento e com hífen: endereço no site (`/isaias/9/6`) e nome do arquivo de texto |
| `abreviacao`, `outras_abreviacoes` | string, array | Abreviação principal e outras formas aceitas pela busca do site |
| `testamento` | string | `AT` ou `NT` |
| `capitulos`, `versiculos` | integer | Quantos capítulos e versículos o livro tem |
| `versiculos_por_capitulo` | array | Versículos de cada capítulo; o primeiro número é o capítulo 1 |
| `indice_primeiro_capitulo`, `indice_primeiro_versiculo` | integer | Índices globais do capítulo 1 e de 1:1 |
| `arquivo_texto` | string | Arquivo com o texto BLIVRE do livro |

```json
{"ordem":23,"osis":"Isa","nome":"Isaías","slug":"isaias","abreviacao":"Is","outras_abreviacoes":[],"testamento":"AT","capitulos":66,"versiculos":1292,"versiculos_por_capitulo":[31,22,26,6,30,…],"indice_primeiro_capitulo":679,"indice_primeiro_versiculo":17655,"arquivo_texto":"texto/isaias.json"}
```

### `capitulos.csv`

Um registro por capítulo: os nós do grafo de capítulos. Chave primária: `indice`. 1.189 linhas.

| Campo | Tipo | O que é |
|---|---|---|
| `indice` | integer | Índice global do capítulo (0 a 1.188) |
| `referencia` | string | Livro e capítulo em português |
| `livro`, `livro_osis`, `testamento` | string | Como em `versiculos.csv` |
| `capitulo` | integer | Número do capítulo no livro |
| `versiculos` | integer | Quantos versículos o capítulo tem |
| `indice_primeiro_versiculo` | integer | Índice global do versículo 1 do capítulo |
| `pares` | integer | Pares de versículos ligados com pelo menos um dos dois neste capítulo. É o número das páginas de livro do site |
| `pares_entre_capitulos` | integer | Pares com o outro versículo em outro capítulo |
| `pares_internos` | integer | Pares com os dois versículos neste capítulo |
| `x`, `y` | number | Posição no layout do grafo: ForceAtlas2 (graphology), semente fixa 20261019, 300 iterações, o mesmo em todo build. Unidade arbitrária: só as distâncias relativas importam |

```csv
indice,referencia,livro,livro_osis,testamento,capitulo,versiculos,indice_primeiro_versiculo,pares,pares_entre_capitulos,pares_internos,x,y
687,Isaías 9,Isaías,Isa,AT,9,21,17830,830,826,4,272.65,-1405.98
```

### `capitulos-arestas.csv`

Cada par de capítulos diferentes com pelo menos um par de versículos ligados entre eles. Ordem: `pares` do maior para o menor, depois `indice_i`, depois `indice_j`. Chave primária: `indice_i` + `indice_j`. 142.082 linhas. A soma de `pares` com a soma de `pares_internos` de `capitulos.csv` dá os 301.539 pares (conferido por teste).

| Campo | Tipo | O que é |
|---|---|---|
| `referencia_i`, `referencia_j` | string | Os dois capítulos (i tem o menor índice) |
| `pares` | integer | Pares de versículos ligados entre os dois capítulos |
| `votos` | integer | Soma da coluna `votos` de `ligacoes.csv` nesses pares |
| `indice_i`, `indice_j` | integer | Índices globais (`capitulos.csv`); sempre `indice_i < indice_j` |

```csv
referencia_i,referencia_j,pares,votos,indice_i,indice_j
Jeremias 50,Jeremias 51,154,530,794,795
```

### `texto/<livro>.json`

O texto da Bíblia Livre de um livro, exatamente como no arquivo `porbr2018_vpl.zip` do eBible.org, versículo por versículo. O nome do arquivo é o `slug` de `livros.json` (`texto/isaias.json`). Campos: `livro`, `osis`, `slug`, `traducao`, `licenca`, `credito` (a linha de crédito exata da BLIVRE), `alteracoes` ("nenhuma"), `grade` e `capitulos`, onde `capitulos[c - 1][v - 1]` é o versículo c:v.

```python
texto = json.load(open("texto/joao.json", encoding="utf-8"))
texto["capitulos"][2][15]   # João 3:16
# 'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito; para que todo aquele que nele crê não pereça, mas tenha a vida eterna.'
```

### `estudos/natal.json`

Os números do vídeo "Antes do Natal, já estava escrito": pares entre qualquer versículo do Antigo Testamento e Mateus 1–2 e Lucas 1–2. São 2.094 pares, 2.053 com voto positivo, vindos de 1.561 versículos de 38 livros (falta Jonas). Os pares-chave: Isaías 7:14 ↔ Mateus 1:23 (333 votos) e Miqueias 5:2 ↔ Mateus 2:6 (226). `pares_mais_fortes` traz os 40 pares do vídeo e os empatados com o 40º. **Atenção:** este estudo segue o script do vídeo (`estudos/biblia-natal/tools/analyze.py`), que não ajusta o número do versículo ao tamanho do capítulo; as convenções estão dentro do arquivo.

### `datapackage.json`

A descrição de tudo no padrão Frictionless Data Package **v2** (`"$schema": "https://datapackage.org/profiles/2.0/datapackage.json"`): para cada arquivo, tamanho, SHA-256, licenças e fontes; para cada tabela (os quatro CSV e `livros.json`), os campos com tipo, descrição, exemplo real e restrições, a chave primária e as chaves estrangeiras (`ligacoes.indice_a` → `versiculos.indice` etc.). Conferido em 19/10/2026 contra os perfis JSON Schema oficiais da v2 (0 erros) e com `frictionless validate` (frictionless-py 5.18.1): os quatro CSV e os 67 JSON passam, com tipos, chaves primárias e chaves estrangeiras. Em `livros.json` a ferramenta não mede os bytes de uma tabela JSON ("actual is None"); com `--skip-errors byte-count` ele passa, e o tamanho real é conferido pelos testes do site.

```bash
pip install "frictionless[json]"
frictionless validate site/public/dados/v1/datapackage.json --skip-errors byte-count
```

## Gerar tudo de novo

Precisa de Node 22 e do repositório (as fontes ficam em `fontes/` e `estudos/*/data/`):

```bash
cd site
npm ci            # instala o que está travado no package-lock.json
npm run data      # gera src/data/generated/, public/data/ e public/dados/v1/ (cerca de 10 s)
npm test          # gera de novo e roda os testes, incluindo os do pacote de dados
```

O pipeline (`site/scripts/build-data.ts`, com o pacote em `site/scripts/data/open-data.ts`) falha se uma fonte não bater com os números já publicados pelos vídeos (`stats.json`, `natal-stats.json`, `xref.npz`). Os arquivos saem iguais byte a byte a cada execução, inclusive o zip, então o `SHA256SUMS` só muda quando os dados mudam. Para conferir o que gerou ou baixou:

```bash
cd site/public/dados/v1 && sha256sum -c SHA256SUMS
```

## Como carregar

### curl

Com o site rodando na sua máquina (`cd site && npm run dev`), os arquivos ficam em `http://localhost:3000/dados/v1/`. Depois do deploy, troque pelo endereço público, que entra aqui.

```bash
curl -O http://localhost:3000/dados/v1/ligacoes.csv
curl -s http://localhost:3000/dados/v1/livros.json | head -c 200
```

### Python (só a biblioteca padrão)

```python
import csv, json
from collections import Counter

pasta = "site/public/dados/v1"
livros = json.load(open(f"{pasta}/livros.json", encoding="utf-8"))

ligacoes = Counter()
with open(f"{pasta}/ligacoes.csv", encoding="utf-8", newline="") as f:
    for linha in csv.DictReader(f):           # cada linha já é um par distinto
        ligacoes[linha["referencia_a"]] += 1
        ligacoes[linha["referencia_b"]] += 1
print(ligacoes.most_common(3))   # [('Isaías 9:6', 212), ('1 Pedro 2:9', 194), ('Mateus 28:20', 169)]
```

### JavaScript (`fetch`)

No navegador, numa página do próprio site, o caminho relativo basta. Os arquivos de `/dados/v1/` respondem com `Access-Control-Allow-Origin: *`, então páginas de outros sites também podem buscá-los pelo endereço completo.

```js
const livros = await (await fetch("/dados/v1/livros.json")).json();
const csv = await (await fetch("/dados/v1/versiculos.csv")).text();
const [cabecalho, ...linhas] = csv.trimEnd().split("\n").map((l) => l.split(","));   // versiculos.csv não tem aspas
const col = cabecalho.indexOf("ligacoes");
console.log(livros.length, linhas.filter((l) => Number(l[col]) > 100).length, "versículos com mais de 100 ligações");
```

Para um CSV com campos entre aspas, use um leitor RFC 4180 de verdade, como o de `exemplos/explorar-dados.mjs`. No Node 18 ou mais novo, `fetch` também funciona com o endereço completo (`http://localhost:3000/dados/v1/livros.json`); para arquivos já baixados, use `fs.readFileSync`.

## Exemplos prontos (`exemplos/`)

Dois scripts que fazem a mesma coisa, sem nenhuma dependência: `exemplos/explorar_dados.py` (Python 3.8 ou mais novo, só a biblioteca padrão) e `exemplos/explorar-dados.mjs` (Node 18 ou mais novo). Eles recebem a pasta do pacote (a gerada em `site/public/dados/v1` ou a que sai do zip) e, opcionalmente, dois livros (nome, slug, OSIS ou abreviação):

1. conferem os arquivos pelo `SHA256SUMS`;
2. contam as ligações de cada versículo a partir de `ligacoes.csv`, conferem com a coluna `ligacoes` de `versiculos.csv` e listam os 10 mais ligados, com os empates do 10º lugar;
3. mostram o texto BLIVRE do primeiro, lido de `texto/`;
4. resumem as ligações entre dois livros (padrão: Isaías e Mateus) e mostram as 5 mais votadas;
5. terminam com os créditos.

```bash
python3 exemplos/explorar_dados.py site/public/dados/v1
node exemplos/explorar-dados.mjs site/public/dados/v1
python3 exemplos/explorar_dados.py site/public/dados/v1 Salmos Hebreus
```

Saída real dos dois (idêntica; rodados em 19/10/2026 sobre os dados gerados por `npm run data`, cerca de 1,5 s cada):

```text
Bíblia Conectada: dados abertos 1.0.0 (site/public/dados/v1)
SHA256SUMS: 77 de 77 arquivos conferidos

Os 10 versículos mais ligados (parceiros únicos, qualquer voto; empates no 10º lugar entram):
   1. Isaías 9:6          212
   2. 1 Pedro 2:9         194
   3. Mateus 28:20        169
   4. Tito 2:14           157
   5. Isaías 41:10        156
   5. Apocalipse 5:9      156
   5. Apocalipse 11:15    156
   8. Hebreus 12:2        153
   9. Atos 26:18          150
  10. Miqueias 7:18       148

Isaías 9:6 (BLIVRE): "Porque um menino nos nasceu, um filho nos foi dado; e o governo está sobre seus ombros; e seu nome se chama Maravilhoso, Conselheiro, Deus Forte, Pai da Eternidade, Príncipe da Paz."

Ligações entre Isaías e Mateus: 1.043 pares, 13.319 votos somados
As 5 mais votadas:
  Isaías 40:8 ↔ Mateus 24:35: 500 votos (ambas)
  Isaías 55:11 ↔ Mateus 24:35: 417 votos (ambas)
  Isaías 7:14 ↔ Mateus 1:23: 333 votos (ambas)
  Isaías 51:6 ↔ Mateus 24:35: 228 votos (ambas)
  Isaías 66:2 ↔ Mateus 5:3: 206 votos (ambas)

Créditos:
  Referências cruzadas: OpenBible.info (CC BY)
  Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, http://sites.google.com/site/biblialivre/ - fevereiro de 2018. Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). Reprodução permitida desde que devidamente mencionados fonte e autores.
```

## Faça com o nosso

Ideias que estes arquivos já permitem (a página `/dados` traz a mesma lista):

- **Mapa de calor livro × livro:** some as linhas de `ligacoes.csv` por par de livros (o começo de `osis_a` e `osis_b`) e pinte uma grade de 66 por 66.
- **Grafo no Gephi ou no Cytoscape:** `capitulos.csv` como nós e `capitulos-arestas.csv` como arestas; as posições `x` e `y` já vêm calculadas.
- **Trilhas de leitura:** de um versículo, siga sempre a ligação mais votada ainda não lida, com o texto de `texto/` e o crédito da BLIVRE.
- **Profecia e cumprimento:** cruze `ligacoes.csv` com `testamento` de `versiculos.csv`, fique com os pares AT ↔ NT e ordene pelos votos, como no estudo do Natal.
- **Pôster de arcos:** um meio-arco por ligação sobre a linha de Gênesis a Apocalipse, como no vídeo "A Bíblia, conectada". A posição de um versículo na linha, de 0 a 1, é `(indice_capitulo + (versiculo - 0.5) / versiculos) / total_de_capitulos`, com `versiculos` tirado de `capitulos.csv` (a mesma conta das páginas de leitura, `site/src/lib/reading.ts`).
- **Consultas com SQL:** carregue os CSV no SQLite (`.import --csv ligacoes.csv ligacoes`) ou no DuckDB (`SELECT * FROM 'ligacoes.csv'`).
- **Planilha de estudo:** `versiculos.csv` no LibreOffice ou no Google Planilhas, filtrado por livro.

## Como dar crédito

Copie as linhas exatas do `ATTRIBUTION.md`:

- **Texto bíblico** (`texto/`), CC BY 4.0 Brasil, sem alterações:

  > Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, http://sites.google.com/site/biblialivre/ - fevereiro de 2018. Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). Reprodução permitida desde que devidamente mencionados fonte e autores.

  Onde não houver espaço, basta "BLIVRE". Se alterar o texto, indique a alteração.
- **Ligações e votos**, CC BY: "Referências cruzadas: OpenBible.info", com o link https://www.openbible.info/labs/cross-references/
- **Este projeto**, CC BY-SA 4.0 nos dados derivados (`LICENSE-DATA.md`): quem reutilizar dá o crédito e compartilha o que derivar pela mesma licença. Sugestão:

  > Dados: Bíblia Conectada (https://github.com/alexpiraginet-bot/biblia-conectada), CC BY-SA 4.0. Referências cruzadas: OpenBible.info (CC BY).

O pacote não tem nenhum texto de tradução protegida (ACF, AA, NVI, ARA…): a trava contra vazamento do pipeline (`site/scripts/data/leak-guard.ts`) procura nos arquivos gerados, inclusive nos CSV, qualquer sequência de 6 palavras das citações curtas dos vídeos que a BLIVRE não tenha.

## Como citar

O repositório tem um `CITATION.cff` (o GitHub mostra "Cite this repository"). Em texto:

> Piragine Teixeira, Alex. Bíblia Conectada: dados abertos, versão 1.0.0. https://github.com/alexpiraginet-bot/biblia-conectada. Licença CC BY-SA 4.0.

O nome do autor segue o `LICENSE` e é uma suposição registrada no `HANDOFF.md` §3.7; se o titular for outro, corrija no `CITATION.cff`, no `LICENSE` e em `site/scripts/data/open-data.ts`.

## Versões (proposta, a confirmar com o Alex)

A pasta `v1` só mudaria de forma compatível: valores novos quando as fontes mudam, nada de coluna renomeada ou removida. Uma mudança que quebre quem já usa os arquivos sairia em `/dados/v2/`, com a v1 mantida por um tempo. A versão do pacote está em `datapackage.json` (`version`) e no `manifest.json`.

---

## English summary

**Bíblia Conectada open data** is a documented, openly licensed dataset of the links between Bible verses, in Portuguese, generated by code from free sources and rebuilt on every site build. The site serves it at `/dados/v1/` (the public URL will be added after the first deploy); locally, `cd site && npm ci && npm run data` writes it to `site/public/dados/v1/`.

- **Files:** `ligacoes.csv` (301,539 distinct verse pairs from the OpenBible.info cross references: readable and OSIS references, global verse indices, summed votes, max directed vote, direction and the vote of each direction), `versiculos.csv` (31,102 verses with their link counts), `livros.json` (66 books), `capitulos.csv` and `capitulos-arestas.csv` (the chapter graph: 1,189 nodes with ForceAtlas2 positions, 142,082 edges), `texto/<book>.json` (the Bíblia Livre text, unchanged, with its credit line inside), `estudos/natal.json` (the numbers of the Christmas study), a Frictionless **Data Package v2** descriptor (`datapackage.json`, with a Table Schema for every table, primary and foreign keys, licences and sources), `SHA256SUMS`, `manifest.json` and a zip of everything.
- **Conventions:** KJV/OpenBible verse grid; a range counts by its first verse; the 45 self-pairs are excluded (301,584 unique pairs − 45 = 301,539); votes are the sum of both directions and can be zero or negative (−86 to 1,477); a verse's "links" are its distinct partners with any vote (Isaiah 9:6 has 212).
- **Format:** UTF-8 CSV without BOM, comma-separated, header row, LF line endings, RFC 4180 quoting; field names match the `datapackage.json` schemas exactly (tested).
- **Licences:** derived data CC BY-SA 4.0; the Bíblia Livre text CC BY 4.0 Brasil (exact credit line in `ATTRIBUTION.md`); cross references from OpenBible.info, CC BY ("Referências cruzadas: OpenBible.info"). No protected translation is included.
- **Examples:** `exemplos/explorar_dados.py` (Python standard library) and `exemplos/explorar-dados.mjs` (Node, no dependencies) verify the checksums, list the 10 most linked verses and summarise the links between two books; their real output is above.
- **Citation:** see `CITATION.cff` (author name as in `LICENSE`, an assumption recorded in `HANDOFF.md` §3.7).
