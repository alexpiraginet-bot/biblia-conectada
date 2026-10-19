// Open data bundle, served at /dados/v1/ (site/public/dados/v1/) for people who want to build on the project's data.
// DADOS.md, at the repository root, documents every file. build-data.ts calls buildOpenData() with the same in-memory
// values the site is built from, after every check against the published numbers has passed; nothing here re-reads a
// source, so the bundle cannot disagree with the site.
//
// Order of construction (each step only hashes what came before it):
//   data files (CSV/JSON) -> datapackage.json (Frictionless Data Package v2, with bytes and SHA-256 per resource)
//   -> LEIA-ME.md, LICENSE.txt -> SHA256SUMS of those (goes inside the zip) -> zip of all of them
//   -> manifest.json (sizes and record counts read by the /dados page) -> SHA256SUMS (the inner lines + zip + manifest).
import { createHash } from "node:crypto";
import { zipSync, type Zippable } from "fflate";
import { formatInt } from "../../src/lib/canon/text";
import { DADOS_BASE, type DadosFile, type DadosManifest } from "../../src/lib/dados";
import type { Canon } from "./canon";
import { LAYOUT, type ChapterGraph } from "./chapter-graph";
import type { Pairs } from "./crossrefs";

export const DADOS_VERSION = "1.0.0";
export const ZIP_NAME = "biblia-conectada-dados-v1.zip";
const ZIP_DIR = "biblia-conectada-dados-v1";
export const REPO_URL = "https://github.com/alexpiraginet-bot/biblia-conectada";
const DADOS_DOC = `${REPO_URL}/blob/main/DADOS.md`;
const OPENBIBLE_URL = "https://www.openbible.info/labs/cross-references/";
const BLIVRE_ZIP_URL = "https://ebible.org/Scriptures/porbr2018_vpl.zip";
// fixed timestamp for the zip entries, built from local-time fields as the zip format stores them, so the archive is
// byte-identical in every time zone and every run
const ZIP_MTIME = new Date(2026, 9, 19, 0, 0, 0);

const LICENSE_DERIVED = {
  name: "CC-BY-SA-4.0",
  path: "https://creativecommons.org/licenses/by-sa/4.0/",
  title: "Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional: dados derivados deste projeto",
};
const LICENSE_OPENBIBLE = {
  path: "https://creativecommons.org/licenses/by/",
  title: "Creative Commons Atribuição (CC BY; o arquivo da OpenBible.info diz CC-BY, sem versão): referências cruzadas de origem",
};
const LICENSE_BLIVRE = {
  name: "CC-BY-4.0",
  path: "http://creativecommons.org/licenses/by/4.0/br/",
  title: "Creative Commons Atribuição 4.0 Brasil: texto da Bíblia Livre (BLIVRE), sem alterações",
};

type Cell = string | number | null;
type FieldType = "integer" | "number" | "string" | "array";
/** A column of a table. The example shown in datapackage.json is taken from a real record when the bundle is built. */
export type Field = { name: string; type: FieldType; description: string; constraints?: Record<string, unknown> };
type ForeignKey = { fields: string[]; reference: { resource: string; fields: string[] } };

/** What a CSV of the bundle declares in datapackage.json; the header row is written from the same field list. */
export type TableSpec = {
  name: string;
  path: string;
  title: string;
  description: string;
  order: string;
  fields: Field[];
  primaryKey: string[];
  foreignKeys?: ForeignKey[];
};

export type NatalOut = {
  birthChapters: string;
  birthChapterVerses: number;
  pairsAll: number;
  pairsMaxVoteGt0: number;
  otVersesAll: number;
  otBooksAll: number;
  otBooksMissing: string[];
  keyPairs: { ot: string; nt: string; votes: number }[];
  top: { ot: string; nt: string; max: number; sum: number; otToNt: number[]; ntToOt: number[] }[];
};

export type OpenDataInput = {
  canon: Canon;
  /** BLIVRE text per global verse, unchanged */
  text: string[];
  pairs: Pairs;
  /** per verse: [partner, votes, direction] with self-pairs excluded (crossrefs.ts linksPerVerse) */
  links: Array<Array<[number, number, number]>>;
  graph: ChapterGraph;
  natal: NatalOut;
  /** exact credit lines of ATTRIBUTION.md */
  credits: { blivre: string; openBible: string };
  sources: { crossrefsSha256: string; crossrefsHeader: string; blivreZipSha256: string };
  counts: { crossrefRows: number; pairs: number; selfPairs: number; arcs: number; versesWithLinks: number };
};

export type OpenDataFile = { path: string; data: Uint8Array };

// ---- CSV (RFC 4180 quoting, UTF-8 without BOM, LF line ends, header row)

const CSV_SPECIAL = /[",\r\n]/;
export function csvField(v: Cell): string {
  if (v === null) return "";
  const s = String(v);
  return CSV_SPECIAL.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvLine = (cells: Cell[]) => cells.map(csvField).join(",");
export const CSV_DIALECT = { header: true, delimiter: ",", lineTerminator: "\n", quoteChar: '"', doubleQuote: true };

// ---- table specs (field names, types and descriptions: the single source for the CSV headers and the schemas)

const TESTAMENT = { enum: ["AT", "NT"] };
const DIRECTION = ["a_para_b", "b_para_a", "ambas"] as const;

export function tableSpecs(verseCount: number, chapterCount: number): TableSpec[] {
  const verseIndex = { required: true, minimum: 0, maximum: verseCount - 1 };
  const chapterIndex = { required: true, minimum: 0, maximum: chapterCount - 1 };
  const osisVerse = { required: true, pattern: "^[1-3]?[A-Za-z]+\\.[1-9][0-9]*\\.[1-9][0-9]*$" };
  return [
    {
      name: "versiculos",
      path: "versiculos.csv",
      title: "Versículos",
      description:
        "Um registro por versículo da grade KJV/OpenBible, com a referência em português e em OSIS e quantas ligações cada um tem. O índice global liga este arquivo a ligacoes.csv e aos outros.",
      order: "ordem dos livros, capítulos e versículos (índice crescente)",
      fields: [
        { name: "indice", type: "integer", description: `Índice global do versículo: 0 = Gênesis 1:1, ${verseCount - 1} = Apocalipse 22:21. É a chave que liga os arquivos.`, constraints: { ...verseIndex, unique: true } },
        { name: "referencia", type: "string", description: "Referência em português: livro, capítulo e versículo.", constraints: { required: true, unique: true } },
        { name: "osis", type: "string", description: "Referência no formato OSIS usado pela OpenBible.info.", constraints: { ...osisVerse, unique: true } },
        { name: "livro", type: "string", description: "Nome do livro em português.", constraints: { required: true } },
        { name: "livro_osis", type: "string", description: "Código OSIS do livro.", constraints: { required: true } },
        { name: "testamento", type: "string", description: "AT (Antigo Testamento) ou NT (Novo Testamento).", constraints: { required: true, ...TESTAMENT } },
        { name: "capitulo", type: "integer", description: "Número do capítulo.", constraints: { required: true, minimum: 1 } },
        { name: "versiculo", type: "integer", description: "Número do versículo no capítulo.", constraints: { required: true, minimum: 1 } },
        { name: "indice_capitulo", type: "integer", description: "Índice global do capítulo (0 = Gênesis 1); liga com capitulos.csv.", constraints: chapterIndex },
        { name: "ligacoes", type: "integer", description: "Outros versículos ligados a este: parceiros únicos, com qualquer voto, sem contar o próprio versículo. É o número que o site mostra ao lado de cada versículo.", constraints: { required: true, minimum: 0 } },
      ],
      primaryKey: ["indice"],
      foreignKeys: [{ fields: ["indice_capitulo"], reference: { resource: "capitulos", fields: ["indice"] } }],
    },
    {
      name: "ligacoes",
      path: "ligacoes.csv",
      title: "Ligações entre versículos",
      description:
        "Cada par distinto de versículos ligados pelas referências cruzadas da OpenBible.info, uma vez só, com os votos somados das duas direções. Os pares de um versículo com ele mesmo ficam de fora.",
      order: "indice_a, depois indice_b (ordem dos livros)",
      fields: [
        { name: "referencia_a", type: "string", description: "Versículo do par que vem antes na ordem dos livros (menor índice).", constraints: { required: true } },
        { name: "referencia_b", type: "string", description: "Versículo do par que vem depois (maior índice).", constraints: { required: true } },
        { name: "votos", type: "integer", description: "Soma dos votos das duas direções na OpenBible.info. Pode ser zero ou negativa.", constraints: { required: true } },
        { name: "votos_max", type: "integer", description: "Maior voto entre as direções listadas; com uma direção só, é o voto dela.", constraints: { required: true } },
        { name: "direcao", type: "string", description: "Em que direção a OpenBible.info lista a referência: a_para_b, b_para_a ou ambas.", constraints: { required: true, enum: [...DIRECTION] } },
        { name: "votos_a_para_b", type: "integer", description: "Voto da referência listada de a para b; vazio quando essa direção não existe." },
        { name: "votos_b_para_a", type: "integer", description: "Voto da referência listada de b para a; vazio quando essa direção não existe." },
        { name: "osis_a", type: "string", description: "Versículo a em OSIS.", constraints: osisVerse },
        { name: "osis_b", type: "string", description: "Versículo b em OSIS.", constraints: osisVerse },
        { name: "indice_a", type: "integer", description: "Índice global do versículo a (versiculos.csv). Sempre menor que indice_b.", constraints: verseIndex },
        { name: "indice_b", type: "integer", description: "Índice global do versículo b (versiculos.csv).", constraints: verseIndex },
      ],
      primaryKey: ["indice_a", "indice_b"],
      foreignKeys: [
        { fields: ["indice_a"], reference: { resource: "versiculos", fields: ["indice"] } },
        { fields: ["indice_b"], reference: { resource: "versiculos", fields: ["indice"] } },
      ],
    },
    {
      name: "capitulos",
      path: "capitulos.csv",
      title: "Capítulos (nós do grafo)",
      description: `Um registro por capítulo, com quantos pares de versículos ligados tocam cada um e a posição no grafo de capítulos (ForceAtlas2, semente ${LAYOUT.seed}, ${LAYOUT.iterations} iterações).`,
      order: "ordem dos livros e capítulos (índice crescente)",
      fields: [
        { name: "indice", type: "integer", description: `Índice global do capítulo: 0 = Gênesis 1, ${chapterCount - 1} = Apocalipse 22.`, constraints: { ...chapterIndex, unique: true } },
        { name: "referencia", type: "string", description: "Livro e capítulo em português.", constraints: { required: true, unique: true } },
        { name: "livro", type: "string", description: "Nome do livro em português.", constraints: { required: true } },
        { name: "livro_osis", type: "string", description: "Código OSIS do livro.", constraints: { required: true } },
        { name: "testamento", type: "string", description: "AT ou NT.", constraints: { required: true, ...TESTAMENT } },
        { name: "capitulo", type: "integer", description: "Número do capítulo no livro.", constraints: { required: true, minimum: 1 } },
        { name: "versiculos", type: "integer", description: "Quantos versículos o capítulo tem.", constraints: { required: true, minimum: 1 } },
        { name: "indice_primeiro_versiculo", type: "integer", description: "Índice global (versiculos.csv) do versículo 1 do capítulo.", constraints: verseIndex },
        { name: "pares", type: "integer", description: "Pares de versículos ligados com pelo menos um dos dois versículos neste capítulo (pares_entre_capitulos + pares_internos).", constraints: { required: true, minimum: 0 } },
        { name: "pares_entre_capitulos", type: "integer", description: "Pares com o outro versículo em outro capítulo; é a soma da coluna pares das arestas deste capítulo.", constraints: { required: true, minimum: 0 } },
        { name: "pares_internos", type: "integer", description: "Pares com os dois versículos dentro deste capítulo.", constraints: { required: true, minimum: 0 } },
        { name: "x", type: "number", description: "Posição horizontal no layout do grafo. Unidade arbitrária: só as distâncias relativas importam.", constraints: { required: true } },
        { name: "y", type: "number", description: "Posição vertical no layout do grafo, na mesma unidade de x.", constraints: { required: true } },
      ],
      primaryKey: ["indice"],
    },
    {
      name: "capitulos-arestas",
      path: "capitulos-arestas.csv",
      title: "Arestas entre capítulos",
      description:
        "Cada par de capítulos diferentes com pelo menos um par de versículos ligados entre eles: quantos pares e a soma dos votos desses pares.",
      order: "pares (do maior para o menor), depois indice_i, depois indice_j",
      fields: [
        { name: "referencia_i", type: "string", description: "Capítulo de menor índice.", constraints: { required: true } },
        { name: "referencia_j", type: "string", description: "Capítulo de maior índice.", constraints: { required: true } },
        { name: "pares", type: "integer", description: "Pares de versículos ligados entre os dois capítulos (qualquer voto, sem auto-pares).", constraints: { required: true, minimum: 1 } },
        { name: "votos", type: "integer", description: "Soma da coluna votos de ligacoes.csv nesses pares.", constraints: { required: true } },
        { name: "indice_i", type: "integer", description: "Índice global do capítulo i (capitulos.csv). Sempre menor que indice_j.", constraints: chapterIndex },
        { name: "indice_j", type: "integer", description: "Índice global do capítulo j (capitulos.csv).", constraints: chapterIndex },
      ],
      primaryKey: ["indice_i", "indice_j"],
      foreignKeys: [
        { fields: ["indice_i"], reference: { resource: "capitulos", fields: ["indice"] } },
        { fields: ["indice_j"], reference: { resource: "capitulos", fields: ["indice"] } },
      ],
    },
  ];
}

/** Fields of each record of livros.json (described in datapackage.json as a table of JSON records). */
export const bookFields = (bookCount: number): Field[] => [
  { name: "ordem", type: "integer", description: `Posição do livro, de 1 (Gênesis) a ${bookCount} (Apocalipse).`, constraints: { required: true, unique: true, minimum: 1 } },
  { name: "osis", type: "string", description: "Código OSIS do livro, como na OpenBible.info.", constraints: { required: true, unique: true } },
  { name: "nome", type: "string", description: "Nome em português.", constraints: { required: true, unique: true } },
  { name: "slug", type: "string", description: "Nome sem acento e com hífen, usado nos endereços do site (/<slug>/<capítulo>/<versículo>) e no nome do arquivo de texto.", constraints: { required: true, unique: true } },
  { name: "abreviacao", type: "string", description: "Abreviação principal em português.", constraints: { required: true } },
  { name: "outras_abreviacoes", type: "array", description: "Outras abreviações e nomes aceitos pela busca do site." },
  { name: "testamento", type: "string", description: "AT ou NT.", constraints: { required: true, ...TESTAMENT } },
  { name: "capitulos", type: "integer", description: "Quantos capítulos o livro tem.", constraints: { required: true, minimum: 1 } },
  { name: "versiculos", type: "integer", description: "Quantos versículos o livro tem.", constraints: { required: true, minimum: 1 } },
  { name: "versiculos_por_capitulo", type: "array", description: "Versículos de cada capítulo; o primeiro número é o capítulo 1.", constraints: { required: true } },
  { name: "indice_primeiro_capitulo", type: "integer", description: "Índice global (capitulos.csv) do capítulo 1.", constraints: { required: true, minimum: 0 } },
  { name: "indice_primeiro_versiculo", type: "integer", description: "Índice global (versiculos.csv) de capítulo 1, versículo 1.", constraints: { required: true, minimum: 0 } },
  { name: "arquivo_texto", type: "string", description: "Arquivo deste pacote com o texto BLIVRE do livro.", constraints: { required: true } },
];

// ---- helpers

const enc = new TextEncoder();
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const jsonRecords = (head: Record<string, unknown>, key: string, records: unknown[]) => {
  const top = JSON.stringify(head);
  const items = records.map((r) => JSON.stringify(r)).join(",\n");
  return `${top.slice(0, -1)},${JSON.stringify(key)}:[\n${items}\n]}\n`;
};
function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`[open-data] check failed: ${msg}`);
}

/** Table Schema of a table; `example` is one real record, aligned with `fields`. */
function schemaOf(fields: Field[], example: unknown[], primaryKey: string[], foreignKeys?: ForeignKey[]) {
  check(example.length === fields.length, "example record has one value per field");
  return {
    fields: fields.map((f, k) => ({
      name: f.name,
      type: f.type,
      description: f.description,
      // Table Schema v2 takes the example as text, as it is written in the file
      example: Array.isArray(example[k]) ? JSON.stringify(example[k]) : example[k] === null ? "" : String(example[k]),
      ...(f.constraints ? { constraints: f.constraints } : {}),
    })),
    missingValues: [""],
    primaryKey,
    ...(foreignKeys ? { foreignKeys } : {}),
  };
}

// ---- the bundle

export function buildOpenData(input: OpenDataInput): { files: OpenDataFile[]; manifest: DadosManifest } {
  const { canon, text, pairs, links, graph, natal, credits, sources, counts } = input;
  const { books } = canon;
  const verseCount = canon.verseCount;
  const chapterCount = canon.chapterVerses.length;
  const specs = tableSpecs(verseCount, chapterCount);
  const spec = (name: string) => specs.find((s) => s.name === name)!;

  // readable and OSIS references of every verse and chapter
  const refPt: string[] = new Array(verseCount);
  const refOsis: string[] = new Array(verseCount);
  const verseBook = new Int32Array(verseCount);
  const verseChapter = new Int32Array(verseCount);
  const verseNumber = new Int32Array(verseCount);
  const chapterRef: string[] = new Array(chapterCount);
  for (const book of books) {
    book.verses.forEach((n, c) => {
      const ci = book.firstChapter + c;
      chapterRef[ci] = `${book.name} ${c + 1}`;
      const first = canon.chapterFirst[ci];
      for (let v = 1; v <= n; v++) {
        const gv = first + v - 1;
        refPt[gv] = `${book.name} ${c + 1}:${v}`;
        refOsis[gv] = `${book.osis}.${c + 1}.${v}`;
        verseBook[gv] = book.index;
        verseChapter[gv] = c + 1;
        verseNumber[gv] = v;
      }
    });
  }
  check(refPt.every((r) => r !== undefined) && refPt.length === verseCount, "every verse has a reference");

  const data: { path: string; bytes: Uint8Array; registros?: number; unidade?: string; titulo: string; formato: DadosFile["formato"]; licenca: string }[] = [];
  const add = (f: Omit<(typeof data)[number], "bytes"> & { content: string }) => {
    const { content, ...rest } = f;
    data.push({ ...rest, bytes: enc.encode(content) });
  };
  const csv = (s: TableSpec, rows: Cell[][]) => {
    for (const r of rows) check(r.length === s.fields.length, `${s.path}: row width`);
    return [csvLine(s.fields.map((f) => f.name)), ...rows.map(csvLine)].join("\n") + "\n";
  };
  const DERIVED = "CC BY-SA 4.0";
  const TEXT = "CC BY 4.0 Brasil";

  // livros.json
  const bookRecords = books.map((b) => ({
    ordem: b.index + 1,
    osis: b.osis,
    nome: b.name,
    slug: b.slug,
    abreviacao: b.abbr,
    outras_abreviacoes: b.aliases,
    testamento: b.testament,
    capitulos: b.verses.length,
    versiculos: b.verses.reduce((s, n) => s + n, 0),
    versiculos_por_capitulo: b.verses,
    indice_primeiro_capitulo: b.firstChapter,
    indice_primeiro_versiculo: b.firstVerse,
    arquivo_texto: `texto/${b.slug}.json`,
  }));
  const BOOK_FIELDS = bookFields(books.length);
  check(JSON.stringify(Object.keys(bookRecords[0])) === JSON.stringify(BOOK_FIELDS.map((f) => f.name)), "livros.json keys follow bookFields()");
  add({
    path: "livros.json",
    titulo: "Os livros: nomes, abreviações e versículos por capítulo",
    formato: "json",
    licenca: DERIVED,
    registros: books.length,
    unidade: "livros",
    // a top-level list of records, one per line: the form every JSON table reader takes without extra settings
    content: `[\n${bookRecords.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`,
  });

  // versiculos.csv
  const vrows: Cell[][] = [];
  for (let gv = 0; gv < verseCount; gv++) {
    const b = books[verseBook[gv]];
    vrows.push([gv, refPt[gv], refOsis[gv], b.name, b.osis, b.testament, verseChapter[gv], verseNumber[gv], b.firstChapter + verseChapter[gv] - 1, links[gv].length]);
  }
  add({ path: "versiculos.csv", titulo: "Os versículos, com a contagem de ligações de cada um", formato: "csv", licenca: DERIVED, registros: vrows.length, unidade: "linhas", content: csv(spec("versiculos"), vrows) });

  // ligacoes.csv: every distinct pair of different verses, in (a, b) order
  const lrows: Cell[][] = [];
  let votosMin = Infinity, votosMax = -Infinity;
  for (let i = 0; i < pairs.a.length; i++) {
    const a = pairs.a[i], b = pairs.b[i];
    if (a === b) continue;
    check(a < b, "pairs are ordered a < b");
    // each direction holds at most one row of the source, so votos_a_para_b / votos_b_para_a are single votes
    check(pairs.rowsAB[i] <= 1 && pairs.rowsBA[i] <= 1, `one source row per direction (${refOsis[a]} ~ ${refOsis[b]})`);
    check(pairs.votesAB[i] + pairs.votesBA[i] === pairs.votes[i], "directed votes add up to the pair votes");
    const dir = DIRECTION[pairs.dir[i] - 1];
    check(dir, `direction of ${refOsis[a]} ~ ${refOsis[b]}`);
    votosMin = Math.min(votosMin, pairs.votes[i]);
    votosMax = Math.max(votosMax, pairs.votes[i]);
    lrows.push([
      refPt[a], refPt[b], pairs.votes[i], pairs.vmax[i], dir,
      pairs.rowsAB[i] ? pairs.votesAB[i] : null, pairs.rowsBA[i] ? pairs.votesBA[i] : null,
      refOsis[a], refOsis[b], a, b,
    ]);
  }
  check(lrows.length === counts.pairs - counts.selfPairs && lrows.length === counts.arcs, "ligacoes rows = pairs - self pairs");
  add({ path: "ligacoes.csv", titulo: "Todas as ligações entre versículos, com votos e direção", formato: "csv", licenca: DERIVED, registros: lrows.length, unidade: "linhas", content: csv(spec("ligacoes"), lrows) });

  // capitulos.csv
  const crows: Cell[][] = graph.nodes.map((nd, ci) => {
    const b = books[canon.chapterBook[ci]];
    return [ci, chapterRef[ci], b.name, b.osis, b.testament, ci - b.firstChapter + 1, canon.chapterVerses[ci], canon.chapterFirst[ci], nd.degree + nd.internal, nd.degree, nd.internal, nd.x, nd.y];
  });
  add({ path: "capitulos.csv", titulo: "Os capítulos, com pares de ligações e posição no grafo", formato: "csv", licenca: DERIVED, registros: crows.length, unidade: "linhas", content: csv(spec("capitulos"), crows) });

  // capitulos-arestas.csv
  const { edges } = graph;
  const erows: Cell[][] = [];
  for (let k = 0; k < edges.i.length; k++) {
    erows.push([chapterRef[edges.i[k]], chapterRef[edges.j[k]], edges.pairs[k], edges.votes[k], edges.i[k], edges.j[k]]);
  }
  add({ path: "capitulos-arestas.csv", titulo: "As ligações entre capítulos (arestas do grafo)", formato: "csv", licenca: DERIVED, registros: erows.length, unidade: "linhas", content: csv(spec("capitulos-arestas"), erows) });

  // examples for datapackage.json, all real records: the most linked verse, its chapter and book, the pair with the
  // most votes and the chapter pair with the most verse pairs (first in canonical order on a tie)
  const topVerse = links.reduce((best, l, gv) => (l.length > links[best].length ? gv : best), 0);
  const topPair = lrows.reduce((best, r, k) => ((r[2] as number) > (lrows[best][2] as number) ? k : best), 0);
  const examples: Record<string, Cell[]> = {
    versiculos: vrows[topVerse],
    ligacoes: lrows[topPair],
    capitulos: crows[books[verseBook[topVerse]].firstChapter + verseChapter[topVerse] - 1],
    "capitulos-arestas": erows[0],
  };
  const bookExample = Object.values(bookRecords[verseBook[topVerse]]);

  // estudos/natal.json: the numbers of the video "Antes do Natal, já estava escrito"
  const natalOut = {
    formato: "biblia-conectada/estudo-natal@1",
    estudo: "Antes do Natal, já estava escrito",
    licenca: DERIVED,
    fonte: `${credits.openBible} (CC BY)`,
    convencoes: [
      "Pares entre qualquer versículo do Antigo Testamento e os capítulos do nascimento, como no script do vídeo (estudos/biblia-natal/tools/analyze.py).",
      "Os versículos ficam como escritos na OpenBible.info: o número não é ajustado ao tamanho do capítulo, ao contrário de ligacoes.csv.",
      "Um trecho conta pelo primeiro versículo. votos = soma das duas direções; votos_max = maior voto de uma direção.",
      "pares_mais_fortes: os 40 pares de maior votos_max do vídeo, mais todos os empatados com o 40º.",
    ],
    capitulos_do_nascimento: natal.birthChapters,
    versiculos_nos_capitulos_do_nascimento: natal.birthChapterVerses,
    pares: natal.pairsAll,
    pares_com_voto_positivo: natal.pairsMaxVoteGt0,
    versiculos_at: natal.otVersesAll,
    livros_at: natal.otBooksAll,
    livros_at_sem_par_com_voto_positivo: natal.otBooksMissing,
    pares_chave: natal.keyPairs.map((p) => ({ at: p.ot, nt: p.nt, votos: p.votes })),
    pares_mais_fortes: natal.top.map((p) => ({ at: p.ot, nt: p.nt, votos_max: p.max, votos: p.sum, votos_at_para_nt: p.otToNt, votos_nt_para_at: p.ntToOt })),
  };
  add({ path: "estudos/natal.json", titulo: "Números do estudo “Antes do Natal, já estava escrito”", formato: "json", licenca: DERIVED, content: JSON.stringify(natalOut, null, 2) + "\n" });

  // texto/<livro>.json: BLIVRE without any change, one file per book, with the credit line inside
  for (const b of books) {
    const chapters = b.verses.map((n, c) => {
      const first = canon.chapterFirst[b.firstChapter + c];
      return text.slice(first, first + n);
    });
    const head = {
      formato: "biblia-conectada/texto@1",
      livro: b.name,
      osis: b.osis,
      slug: b.slug,
      traducao: "Bíblia Livre (BLIVRE)",
      licenca: TEXT,
      credito: credits.blivre,
      alteracoes: "nenhuma: o texto é o do arquivo porbr2018_vpl.zip (eBible.org), versículo por versículo",
      grade: "KJV/OpenBible: capitulos[c - 1][v - 1] é o versículo c:v",
    };
    add({
      path: `texto/${b.slug}.json`,
      titulo: `Texto BLIVRE de ${b.name}`,
      formato: "json",
      licenca: TEXT,
      registros: b.verses.reduce((s, n) => s + n, 0),
      unidade: "versículos",
      content: jsonRecords(head, "capitulos", chapters),
    });
  }

  // datapackage.json (Frictionless Data Package v2)
  const res = (path: string) => data.find((d) => d.path === path)!;
  const fileProps = (path: string) => ({ bytes: res(path).bytes.byteLength, hash: `sha256:${sha256(res(path).bytes)}` });
  const openBibleVersion = /CC-BY\s+(\d{4}-\d{2}-\d{2})/.exec(sources.crossrefsHeader)?.[1];
  check(openBibleVersion, "date in the header of the OpenBible.info file");
  const SRC_OPENBIBLE = {
    title: "OpenBible.info: referências cruzadas, derivadas principalmente do Treasury of Scripture Knowledge (CC BY)",
    path: OPENBIBLE_URL,
    version: `${openBibleVersion}; sha256:${sources.crossrefsSha256}`,
  };
  const SRC_BLIVRE = {
    title: "Bíblia Livre (BLIVRE), Diego Santos, Mario Sérgio e Marco Teles, fevereiro de 2018 (CC BY 4.0 Brasil), arquivo do eBible.org",
    path: BLIVRE_ZIP_URL,
    version: `sha256:${sources.blivreZipSha256}`,
  };
  const SRC_GRID = {
    title: "Grade de versículos KJV/OpenBible e nomes dos livros em português do estudo “A Bíblia, conectada” (estudos/biblia-referencias/data/ deste repositório)",
    path: `${REPO_URL}/tree/main/estudos/biblia-referencias/data`,
  };
  const csvResource = (s: TableSpec, extraSources: object[] = []) => ({
    name: s.name,
    type: "table",
    path: s.path,
    title: s.title,
    description: `${s.description} Ordem das linhas: ${s.order}.`,
    format: "csv",
    mediatype: "text/csv",
    encoding: "utf-8",
    ...fileProps(s.path),
    dialect: CSV_DIALECT,
    schema: schemaOf(s.fields, examples[s.name], s.primaryKey, s.foreignKeys),
    licenses: [LICENSE_DERIVED, LICENSE_OPENBIBLE],
    sources: [SRC_OPENBIBLE, ...extraSources],
  });
  const datapackage = {
    $schema: "https://datapackage.org/profiles/2.0/datapackage.json",
    name: "biblia-conectada",
    title: "Bíblia Conectada: dados abertos",
    description:
      "Ligações entre os versículos da Bíblia (referências cruzadas da OpenBible.info, com votos), o texto da Bíblia Livre (BLIVRE) e o grafo dos capítulos, em português, gerados por código a partir de fontes livres. Documentação: DADOS.md no repositório.",
    version: DADOS_VERSION,
    homepage: REPO_URL,
    keywords: ["Bíblia", "referências cruzadas", "grafo", "versículos", "português", "dados abertos", "OpenBible.info", "Bíblia Livre"],
    licenses: [LICENSE_DERIVED, LICENSE_BLIVRE],
    contributors: [
      // Assumption recorded in HANDOFF.md §3.7: the holder named in LICENSE. Correct here and in CITATION.cff if needed.
      { title: "Alex Piragine Teixeira", givenName: "Alex", familyName: "Piragine Teixeira", path: REPO_URL, roles: ["creator"] },
    ],
    sources: [SRC_OPENBIBLE, SRC_BLIVRE, SRC_GRID],
    resources: [
      {
        name: "livros",
        type: "table",
        path: "livros.json",
        title: "Livros",
        description: `Os ${books.length} livros na ordem da grade, com nome e abreviações em português, testamento e versículos por capítulo: uma lista de registros, um por livro.`,
        format: "json",
        mediatype: "application/json",
        encoding: "utf-8",
        ...fileProps("livros.json"),
        schema: schemaOf(BOOK_FIELDS, bookExample, ["ordem"]),
        licenses: [LICENSE_DERIVED],
        sources: [SRC_GRID],
      },
      csvResource(spec("versiculos"), [SRC_GRID]),
      csvResource(spec("ligacoes"), [SRC_GRID]),
      csvResource(spec("capitulos"), [SRC_GRID]),
      csvResource(spec("capitulos-arestas"), [SRC_GRID]),
      {
        name: "estudo-natal",
        path: "estudos/natal.json",
        title: "Estudo “Antes do Natal, já estava escrito”",
        description: `Números do vídeo: pares entre o Antigo Testamento e os capítulos do nascimento (${natal.birthChapters}), pares-chave e os pares mais fortes. As convenções estão dentro do arquivo.`,
        format: "json",
        mediatype: "application/json",
        encoding: "utf-8",
        ...fileProps("estudos/natal.json"),
        licenses: [LICENSE_DERIVED, LICENSE_OPENBIBLE],
        sources: [SRC_OPENBIBLE],
      },
      ...books.map((b) => ({
        name: `texto-${b.slug}`,
        path: `texto/${b.slug}.json`,
        title: `Texto BLIVRE: ${b.name}`,
        description: `Texto da Bíblia Livre de ${b.name}, sem alterações, com a linha de crédito no campo "credito". Versículos em "capitulos": capitulos[c - 1][v - 1] é ${b.abbr} c:v.`,
        format: "json",
        mediatype: "application/json",
        encoding: "utf-8",
        ...fileProps(`texto/${b.slug}.json`),
        licenses: [LICENSE_BLIVRE],
        sources: [SRC_BLIVRE],
      })),
    ],
  };
  check(datapackage.resources.length === 6 + books.length, "one resource per data file");
  add({ path: "datapackage.json", titulo: "Descrição do pacote: esquemas, licenças e fontes (Frictionless Data Package v2)", formato: "json", licenca: DERIVED, content: JSON.stringify(datapackage, null, 2) + "\n" });

  const c = {
    livros: books.length,
    capitulos: chapterCount,
    versiculos: verseCount,
    linhasOpenBible: counts.crossrefRows,
    paresUnicos: counts.pairs,
    autoPares: counts.selfPairs,
    paresLigados: lrows.length,
    versiculosComLigacao: counts.versesWithLinks,
    arestasCapitulos: erows.length,
    votosMin,
    votosMax,
  };

  add({ path: "LEIA-ME.md", titulo: "Leia-me: o que é cada arquivo, convenções e créditos", formato: "md", licenca: DERIVED, content: readme(data, c, credits) });
  add({ path: "LICENSE.txt", titulo: "Licenças dos arquivos", formato: "txt", licenca: DERIVED, content: licenseText(credits) });

  const sumLines = data.map((d) => `${sha256(d.bytes)}  ${d.path}`);
  const innerSums = enc.encode(sumLines.join("\n") + "\n");
  const entries: Zippable = {};
  for (const d of data) entries[`${ZIP_DIR}/${d.path}`] = [d.bytes, { mtime: ZIP_MTIME }];
  entries[`${ZIP_DIR}/SHA256SUMS`] = [innerSums, { mtime: ZIP_MTIME }];
  const zip = zipSync(entries, { level: 9 });

  const arquivos: DadosFile[] = [
    ...data.map((d) => ({
      caminho: d.path,
      titulo: d.titulo,
      bytes: d.bytes.byteLength,
      sha256: sha256(d.bytes),
      formato: d.formato,
      licenca: d.licenca,
      ...(d.registros !== undefined ? { registros: d.registros, unidade: d.unidade } : {}),
    })),
    {
      caminho: ZIP_NAME,
      titulo: "Tudo de uma vez: todos os arquivos acima e o SHA256SUMS deles",
      bytes: zip.byteLength,
      sha256: sha256(zip),
      formato: "zip",
      licenca: `${DERIVED} (texto/: ${TEXT})`,
      registros: data.length + 1,
      unidade: "arquivos",
    },
  ];
  const manifest: DadosManifest = { formato: "biblia-conectada/dados-manifest@1", versao: DADOS_VERSION, base: DADOS_BASE, contagens: c, arquivos };
  const manifestBytes = enc.encode(JSON.stringify(manifest, null, 2) + "\n");
  const outerSums = enc.encode([...sumLines, `${sha256(zip)}  ${ZIP_NAME}`, `${sha256(manifestBytes)}  manifest.json`].join("\n") + "\n");

  return {
    files: [
      ...data.map((d) => ({ path: d.path, data: d.bytes })),
      { path: ZIP_NAME, data: zip },
      { path: "manifest.json", data: manifestBytes },
      { path: "SHA256SUMS", data: outerSums },
    ],
    manifest,
  };
}

// ---- LEIA-ME.md and LICENSE.txt (Portuguese; every number comes from the values above)

type Counts = DadosManifest["contagens"];

function readme(data: { path: string; registros?: number; unidade?: string; titulo: string }[], c: Counts, credits: OpenDataInput["credits"]) {
  const n = formatInt;
  const row = (path: string) => data.find((d) => d.path === path)!;
  const texts = data.filter((d) => d.path.startsWith("texto/"));
  const textVerses = texts.reduce((s, d) => s + (d.registros ?? 0), 0);
  const table = [
    "| Arquivo | O que tem | Registros |",
    "|---|---|---|",
    ...["livros.json", "versiculos.csv", "ligacoes.csv", "capitulos.csv", "capitulos-arestas.csv", "estudos/natal.json"].map((p) => {
      const d = row(p);
      return `| \`${p}\` | ${d.titulo} | ${d.registros !== undefined ? `${n(d.registros)} ${d.unidade}` : "números do estudo"} |`;
    }),
    `| \`texto/<livro>.json\` | Texto da Bíblia Livre, um arquivo por livro (${n(texts.length)} arquivos; o nome vem do campo slug de livros.json) | ${n(textVerses)} versículos |`,
    "| `datapackage.json` | Esquema de cada tabela (campos, tipos, chaves), licenças e fontes, no padrão Frictionless Data Package v2 | |",
    "| `LEIA-ME.md`, `LICENSE.txt` | Este texto e as licenças | |",
    "| `SHA256SUMS` | SHA-256 de todos os arquivos | |",
    `| \`${ZIP_NAME}\` | Só no site: todos os arquivos acima num zip | |`,
    "| `manifest.json` | Só no site: tamanho em bytes, SHA-256 e número de registros de cada arquivo (é o que a página /dados lê) | |",
  ];
  return [
    `# Bíblia Conectada: dados abertos (versão ${DADOS_VERSION})`,
    "",
    "Arquivos para quem quer criar a partir dos dados do site Bíblia Conectada: as ligações entre os versículos (referências cruzadas da OpenBible.info, com votos), o texto da Bíblia Livre (BLIVRE) e o grafo dos capítulos. Tudo sai de código, a partir de fontes livres, e é refeito a cada build do site.",
    "",
    `Documentação completa, com cada campo, exemplos em Python e JavaScript e como gerar tudo de novo: ${DADOS_DOC}`,
    "",
    "## Arquivos",
    "",
    ...table,
    "",
    "CSV: UTF-8 sem BOM, separado por vírgula, com cabeçalho, linhas terminadas em LF; campo com vírgula, aspas ou quebra de linha vai entre aspas, com as aspas internas dobradas (RFC 4180). Campo vazio = sem valor.",
    "",
    "## Convenções que mudam os números",
    "",
    `- **Grade de versículos:** a da KJV/OpenBible, com ${n(c.livros)} livros, ${n(c.capitulos)} capítulos e ${n(c.versiculos)} versículos. O índice global vai de 0 (Gênesis 1:1) a ${n(c.versiculos - 1)} (Apocalipse 22:21) e liga os arquivos.`,
    `- **Trechos contam pelo primeiro versículo:** uma referência a Mateus 5:3–12 vira uma ligação com Mateus 5:3, como nos vídeos.`,
    `- **Auto-pares ficam de fora:** as ${n(c.linhasOpenBible)} linhas da OpenBible.info formam ${n(c.paresUnicos)} pares únicos; ${n(c.autoPares)} deles ligam um versículo a um trecho que começa nele mesmo. Sobram ${n(c.paresLigados)} pares de versículos diferentes, as linhas de ligacoes.csv.`,
    `- **Votos:** soma das duas direções; podem ser zero ou negativos (de ${n(c.votosMin)} a ${n(c.votosMax)} em ligacoes.csv).`,
    `- **Ligações de um versículo:** os outros versículos ligados a ele, contados uma vez cada, com qualquer voto (coluna ligacoes de versiculos.csv). ${n(c.versiculosComLigacao)} versículos têm pelo menos uma.`,
    "",
    "## Licença e créditos",
    "",
    "- `texto/`: texto da Bíblia Livre, sem alterações, sob a licença dela. Ao usar, copie este crédito:",
    "",
    `  > ${credits.blivre}`,
    "",
    "- Todos os outros arquivos: dados derivados deste projeto, sob a licença Creative Commons Atribuição-CompartilhaIgual 4.0 (CC BY-SA 4.0). Quem reutilizar dá o crédito e compartilha o que derivar pela mesma licença.",
    `- As ligações e os votos vêm da OpenBible.info (CC BY). Crédito: "${credits.openBible}", ${OPENBIBLE_URL}`,
    "",
    "Sugestão de crédito para este pacote:",
    "",
    `> Dados: Bíblia Conectada (${REPO_URL}), CC BY-SA 4.0. ${credits.openBible} (CC BY).`,
    "",
    "## Conferir os arquivos",
    "",
    "```",
    "sha256sum -c SHA256SUMS",
    "```",
    "",
  ].join("\n");
}

function licenseText(credits: OpenDataInput["credits"]) {
  return [
    `Bíblia Conectada: dados abertos, versão ${DADOS_VERSION}`,
    REPO_URL,
    "",
    "texto/: texto da Bíblia Livre (BLIVRE), sem alterações, sob a licença dela (Creative Commons Atribuição 4.0 Brasil).",
    credits.blivre,
    "",
    "Todos os outros arquivos (livros, versículos, ligações, votos, capítulos, posições, grafos e números do estudo) são dados",
    "derivados deste projeto, sob a licença Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional (CC BY-SA 4.0):",
    "https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br",
    "Quem reutilizar mantém os créditos das fontes e compartilha o que derivar pela mesma licença.",
    "",
    `Fonte das ligações e dos votos: ${credits.openBible} (CC BY), ${OPENBIBLE_URL}`,
    "",
    `Termos completos e créditos: LICENSE-DATA.md e ATTRIBUTION.md em ${REPO_URL}`,
    "",
  ].join("\n");
}
