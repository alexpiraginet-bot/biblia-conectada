// Builds every data file the site reads, from fontes/ and estudos/*/data/ only. Throws (and fails the build) when
// a source disagrees with the numbers already published by the videos (stats.json, natal-stats.json, xref.npz).
//   npm run data
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { loadBlivre, loadCanon } from "./data/canon";
import { chapterGraph, LAYOUT } from "./data/chapter-graph";
import { buildCommunity } from "./data/community";
import { buildPairs, linksPerVerse, parseCrossRefs } from "./data/crossrefs";
import { natalPair, natalStudy } from "./data/natal";
import { buildOpenData, type NatalOut } from "./data/open-data";
import { CROSSREFS_SHA256, OUT, REPO, SITE, SRC, readJson, sha256 } from "./data/sources";
import { createGrid } from "../src/lib/canon/grid";

const t0 = Date.now();
const log = (msg: string) => console.log(`[data] ${msg} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`[data] check failed: ${msg}`);
}
function eq(actual: unknown, expected: unknown, what: string) {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${what}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

// ---- grid + text
const canon = loadCanon();
const blivre = loadBlivre(canon);
const grid = createGrid(canon.books);
eq(grid.verseCount, canon.verseCount, "verse count (grid vs npz)");
eq(canon.stats.stats.verses, canon.verseCount, "verse count (stats.json)");
eq(canon.stats.stats.chapters, canon.chapterVerses.length, "chapter count (stats.json)");
eq(canon.stats.stats.books, canon.books.length, "book count (stats.json)");
log(`grid: ${canon.books.length} books, ${canon.chapterVerses.length} chapters, ${canon.verseCount} verses; BLIVRE fits`);

// ---- cross references
eq(sha256(SRC.crossrefsTxt), CROSSREFS_SHA256, "cross-reference file SHA-256");
const xr = parseCrossRefs(SRC.crossrefsTxt, canon);
const pairs = buildPairs(xr);
const st = canon.stats.stats as Record<string, number>;
eq(xr.rowCount, st.rows_total, "rows (stats.json rows_total)");
eq(pairs.a.length, st.unique_verse_pairs, "unique pairs (stats.json)");
const selfPairs = pairs.a.reduce((n, a, i) => n + (a === pairs.b[i] ? 1 : 0), 0);
eq(selfPairs, st.self_pairs, "self pairs (stats.json)");
for (const k of ["a", "b", "votes", "vmax"] as const) {
  const ref = canon.npz[k].data;
  eq(ref.length, pairs[k].length, `xref.npz ${k} length`);
  for (let i = 0; i < ref.length; i++) if (ref[i] !== pairs[k][i]) throw new Error(`[data] xref.npz ${k}[${i}] = ${ref[i]}, recomputed ${pairs[k][i]}`);
}
const touched = new Uint8Array(canon.verseCount);
for (let i = 0; i < pairs.a.length; i++) touched[pairs.a[i]] = touched[pairs.b[i]] = 1;
const versesWithAnyRef = touched.reduce((n, t) => n + t, 0);
eq(versesWithAnyRef, st.verses_with_any_ref, "verses with any reference (stats.json)");
const links = linksPerVerse(pairs, canon.verseCount);
const versesWithLinks = links.reduce((n, l) => n + (l.length > 0 ? 1 : 0), 0);
log(`cross references: ${xr.rowCount} rows, ${pairs.a.length} pairs (${selfPairs} self), identical to xref.npz`);

// ---- study: Antes do Natal
const natal = natalStudy(canon, xr);
type NatalRef = { pairs_all: number; pairs_maxvote_gt0: number; ot_verses_all: number; ot_verses_pos: number; ot_books_all: number;
  ot_books_pos: number; nt_verses_linked_pos: number; birth_chapter_verses: number; ot_books_missing: string[];
  top40: { ot: string; nt: string; max: number; sum: number; ot_to_nt: number[]; nt_to_ot: number[] }[] };
const nref = readJson<NatalRef>(SRC.natalStatsJson);
eq(natal.pairsAll, nref.pairs_all, "natal pairs_all");
eq(natal.pairsMaxVoteGt0, nref.pairs_maxvote_gt0, "natal pairs_maxvote_gt0");
eq(natal.otVersesAll, nref.ot_verses_all, "natal ot_verses_all");
eq(natal.otVersesPos, nref.ot_verses_pos, "natal ot_verses_pos");
eq(natal.otBooksAll, nref.ot_books_all, "natal ot_books_all");
eq(natal.otBooksPos, nref.ot_books_pos, "natal ot_books_pos");
eq(natal.ntVersesLinkedPos, nref.nt_verses_linked_pos, "natal nt_verses_linked_pos");
eq(natal.birthChapterVerses, nref.birth_chapter_verses, "natal birth_chapter_verses");
eq(natal.otBooksMissing, nref.ot_books_missing, "natal ot_books_missing");
eq(
  natal.pairs.slice(0, 40).map((p) => [p.ot, p.nt, p.max, p.sum, p.otToNt, p.ntToOt]),
  nref.top40.map((p) => [p.ot, p.nt, p.max, p.sum, p.ot_to_nt, p.nt_to_ot]),
  "natal top40",
);
log(`natal: ${natal.pairsAll} pairs, ${natal.otVersesAll} OT verses in ${natal.otBooksAll} books, identical to natal-stats.json`);

// ---- chapter graph
const graph = chapterGraph(canon, pairs);
log(`chapter graph: ${graph.nodes.length} nodes, ${graph.edges.i.length} edges, ForceAtlas2 ${LAYOUT.iterations} it.`);

// ---- write outputs into staging folders; they replace the real ones only after every check below has passed,
// so a failed run never leaves a half-written data set behind (both folders are generated only).
const STAGE = ".staging";
const OUTPUT_DIRS = [OUT.generated, OUT.publicData, OUT.publicDados];
for (const dir of OUTPUT_DIRS) {
  rmSync(dir + STAGE, { recursive: true, force: true });
  mkdirSync(dir + STAGE, { recursive: true });
}
const written: Record<string, string> = {};
function write(path: string, data: string | Uint8Array) {
  const root = OUTPUT_DIRS.find((d) => path.startsWith(d + "/"));
  check(root, `output path outside the generated folders: ${path}`);
  const staged = root + STAGE + path.slice(root.length);
  mkdirSync(join(staged, ".."), { recursive: true });
  writeFileSync(staged, data);
  written[relative(SITE, path)] = createHash("sha256").update(data).digest("hex");
}
const json = (v: unknown) => JSON.stringify(v);

write(join(OUT.generated, "books.json"), json(canon.books));

// one file per book: text (BLIVRE, unchanged) + links per verse [partner global index, votes, direction 1 out|2 in|3 both]
for (const book of canon.books) {
  const chapters = book.verses.map((n, c) => {
    const first = canon.chapterFirst[book.firstChapter + c];
    return Array.from({ length: n }, (_, v) => ({ t: blivre.text[first + v], l: links[first + v] }));
  });
  write(join(OUT.generated, "books", `${book.slug}.json`), json({ osis: book.osis, chapters }));
}

// top verses by unique partners (self excluded), canonical order inside a tie. The list never cuts through a tie:
// it holds every verse with at least as many links as the 12th.
const ranked = links.map((l, gv) => [gv, l.length] as const).sort((x, y) => y[1] - x[1] || x[0] - y[0]);
const topCut = ranked[11][1];
const topVerses = ranked.filter(([, n]) => n >= topCut).map(([gv, n]) => {
  const loc = grid.locate(gv);
  return { gv, ref: `${loc.book.name} ${loc.chapter}:${loc.verse}`, path: `/${loc.book.slug}/${loc.chapter}/${loc.verse}`, links: n };
});

// arcs.bin: struct of arrays, little endian: uint16 a[N] | uint16 b[N] | int16 votes[N]; self-pairs removed;
// sorted by votes desc, then a, then b, so a client can draw the first K bytes of each array as a level of detail.
const arcIdx: number[] = [];
for (let i = 0; i < pairs.a.length; i++) if (pairs.a[i] !== pairs.b[i]) arcIdx.push(i);
arcIdx.sort((x, y) => pairs.votes[y] - pairs.votes[x] || pairs.a[x] - pairs.a[y] || pairs.b[x] - pairs.b[y]);
const N = arcIdx.length;
const arcs = new ArrayBuffer(N * 6);
const av = new DataView(arcs);
arcIdx.forEach((i, k) => {
  check(pairs.b[i] <= 0xffff && pairs.votes[i] >= -0x8000 && pairs.votes[i] <= 0x7fff, "arc fits uint16/int16");
  av.setUint16(k * 2, pairs.a[i], true);
  av.setUint16(N * 2 + k * 2, pairs.b[i], true);
  av.setInt16(N * 4 + k * 2, pairs.votes[i], true);
});
const arcsBytes = new Uint8Array(arcs);
write(join(OUT.publicData, "arcs.bin"), arcsBytes);
write(join(OUT.publicData, "arcs.json"), json({
  format: "biblia-conectada/arcs@1",
  count: N,
  bytes: arcsBytes.byteLength,
  endianness: "little",
  arrays: [
    { name: "a", type: "uint16", offset: 0, note: "global verse index, lower of the pair" },
    { name: "b", type: "uint16", offset: N * 2, note: "global verse index, higher of the pair" },
    { name: "votes", type: "int16", offset: N * 4, note: "sum of the votes of both directions" },
  ],
  sortedBy: "votes desc, a asc, b asc",
  excluded: { selfPairs },
  source: "OpenBible.info cross references (CC BY)",
  license: "CC BY-SA 4.0 (derived data of this project); source: OpenBible.info, CC BY",
}));

// sky (home): the HEAD most voted arcs in the same layout as arcs.bin, for the first paint on phones (design §8),
// plus everything the canvas needs to place them: chapters equally spaced on the baseline, as in video 1 (arcs.py).
const SKY_HEAD = 20000;
const head = new ArrayBuffer(SKY_HEAD * 6);
const hv = new DataView(head);
for (let k = 0; k < SKY_HEAD; k++) {
  hv.setUint16(k * 2, av.getUint16(k * 2, true), true);
  hv.setUint16(SKY_HEAD * 2 + k * 2, av.getUint16(N * 2 + k * 2, true), true);
  hv.setInt16(SKY_HEAD * 4 + k * 2, av.getInt16(N * 4 + k * 2, true), true);
}
write(join(OUT.publicData, "sky-head.bin"), new Uint8Array(head));
const chapterPairs = graph.nodes.map((nd) => nd.degree + nd.internal);
write(join(OUT.publicData, "sky.json"), json({
  format: "biblia-conectada/sky@1",
  layout: "x = (chapter + (verse - 0.5) / versesInChapter) / chapters; arc = semicircle over the baseline (video 1, arcs.py)",
  counts: { arcs: N, verses: canon.verseCount, chapters: canon.chapterVerses.length, crossrefRows: xr.rowCount },
  files: {
    head: { file: "sky-head.bin", count: SKY_HEAD, minVotes: av.getInt16(N * 4 + (SKY_HEAD - 1) * 2, true) },
    full: { file: "arcs.bin", count: N },
  },
  // per chapter: book index, chapter number, first global verse, verses, distinct verse pairs touching it (self excluded)
  chapters: canon.chapterVerses.map((n, ci) => [canon.chapterBook[ci], ci - canon.books[canon.chapterBook[ci]].firstChapter + 1, canon.chapterFirst[ci], n, chapterPairs[ci]]),
  books: canon.books.map((b) => [b.name, b.slug, b.abbr, b.firstChapter, b.verses.length, b.testament]),
  topVerses: ranked.slice(0, 1).map(([gv, n]) => {
    const loc = grid.locate(gv);
    return { gv, ref: `${loc.book.name} ${loc.chapter}:${loc.verse}`, path: `/${loc.book.slug}/${loc.chapter}/${loc.verse}`, links: n };
  }),
  license: "CC BY-SA 4.0 (derived data of this project); source: OpenBible.info, CC BY",
}));

// reading pages: for each chapter, the chapters most linked to it (distinct verse pairs between them), ties kept
const PARTNER_CHAPTERS = 8;
const byChapter: Array<Array<[number, number]>> = Array.from({ length: canon.chapterVerses.length }, () => []);
for (let k = 0; k < graph.edges.i.length; k++) {
  byChapter[graph.edges.i[k]].push([graph.edges.j[k], graph.edges.pairs[k]]);
  byChapter[graph.edges.j[k]].push([graph.edges.i[k], graph.edges.pairs[k]]);
}
write(join(OUT.generated, "chapter-links.json"), json(byChapter.map((list) => {
  list.sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  const cut = list[Math.min(PARTNER_CHAPTERS, list.length) - 1]?.[1] ?? 0;
  return list.filter(([, n], idx) => idx < PARTNER_CHAPTERS || n === cut);
})));
// distinct verse pairs touching each chapter (self excluded), for the book pages
write(join(OUT.generated, "chapter-pairs.json"), json(chapterPairs));
// verse pages prerendered at build time: the most linked verses (the rest render on first request and are cached)
const VERSE_PAGES = 200;
write(join(OUT.generated, "verse-pages.json"), json(ranked.slice(0, VERSE_PAGES).map(([gv]) => {
  const loc = grid.locate(gv);
  return [loc.book.slug, loc.chapter, loc.verse];
})));

// verse texts per chapter (BLIVRE, unchanged), fetched by the hover preview of a linked verse
for (const book of canon.books) {
  book.verses.forEach((n, c) => {
    const first = canon.chapterFirst[book.firstChapter + c];
    write(join(OUT.publicData, "text", book.slug, `${c + 1}.json`), json(blivre.text.slice(first, first + n)));
  });
}

// chapter graph: nodes JSON + edges binary (uint16 i | uint16 j | uint32 pairs | int32 votes, struct of arrays)
const E = graph.edges.i.length;
const edgesBuf = new Uint8Array(E * 12);
edgesBuf.set(new Uint8Array(graph.edges.i.buffer), 0);
edgesBuf.set(new Uint8Array(graph.edges.j.buffer), E * 2);
edgesBuf.set(new Uint8Array(graph.edges.pairs.buffer), E * 4);
edgesBuf.set(new Uint8Array(graph.edges.votes.buffer), E * 8);
check(new Uint8Array(new Uint16Array([1]).buffer)[0] === 1, "little-endian host for typed-array dump");
write(join(OUT.publicData, "chapter-edges.bin"), edgesBuf);
write(join(OUT.publicData, "chapter-graph.json"), json({
  format: "biblia-conectada/chapter-graph@1",
  layout: { algorithm: "ForceAtlas2 (graphology-layout-forceatlas2, inferred settings + Barnes-Hut)", ...LAYOUT },
  nodes: graph.nodes.map((nd, ci) => {
    const { book, chapter } = grid.locateChapter(ci);
    return { ...nd, book: book.index, chapter };
  }),
  edges: {
    file: "chapter-edges.bin",
    count: E,
    endianness: "little",
    arrays: [
      { name: "i", type: "uint16", offset: 0 },
      { name: "j", type: "uint16", offset: E * 2 },
      { name: "pairs", type: "uint32", offset: E * 4 },
      { name: "votes", type: "int32", offset: E * 8 },
    ],
    sortedBy: "pairs desc, i asc, j asc",
  },
  license: "CC BY-SA 4.0 (derived data of this project); source: OpenBible.info, CC BY",
}));

// study numbers (the same object feeds the open data bundle below)
const keyPairs = [["Isaías 7:14", "Mateus 1:23"], ["Miqueias 5:2", "Mateus 2:6"]] as const;
const natalOut: NatalOut = {
  birthChapters: "Mateus 1–2, Lucas 1–2",
  birthChapterVerses: natal.birthChapterVerses,
  pairsAll: natal.pairsAll,
  pairsMaxVoteGt0: natal.pairsMaxVoteGt0,
  otVersesAll: natal.otVersesAll,
  otBooksAll: natal.otBooksAll,
  otBooksMissing: natal.otBooksMissing,
  keyPairs: keyPairs.map(([ot, nt]) => {
    const p = natalPair(natal, ot, nt);
    check(p, `natal key pair ${ot} ~ ${nt}`);
    return { ot, nt, votes: p.sum };
  }),
  // the 40 strongest pairs of the video (estudos natal-stats.json top40) plus every pair tied with the 40th
  top: natal.pairs.filter((p) => p.max >= natal.pairs[39].max),
};
write(join(OUT.generated, "studies", "natal.json"), json(natalOut));

// credits: ATTRIBUTION.md verbatim (rendered on /sobre) + the BLIVRE and OpenBible.info credit lines (footer, /dados)
const attribution = readFileSync(SRC.attribution, "utf8");
const blivreCredit = /^> (Todas as Escrituras.*)$/m.exec(attribution)?.[1];
check(blivreCredit, "BLIVRE credit line in ATTRIBUTION.md");
const aboutText = blivre.about.replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
check(aboutText.includes(blivreCredit), "ATTRIBUTION.md BLIVRE credit matches the zip's about page");
const openBibleCredit = /"(Referências cruzadas: OpenBible\.info)"/.exec(attribution)?.[1];
check(openBibleCredit, "OpenBible.info credit line in ATTRIBUTION.md");
write(join(OUT.generated, "credits.json"), json({ attributionMarkdown: attribution, blivreCredit, openBibleCredit }));
// licence note served next to the public data files (LICENSE-DATA.md has the full terms)
write(join(OUT.publicData, "LICENSE.txt"), [
  "Bíblia Conectada: dados públicos",
  "",
  "text/: texto da Bíblia Livre (BLIVRE), sem alterações, sob a licença dela (CC BY 4.0 Brasil).",
  blivreCredit,
  "",
  "Os demais arquivos (ligações, votos, posições, grafos) são dados derivados deste projeto, sob CC BY-SA 4.0:",
  "https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br",
  "Referências cruzadas: OpenBible.info (CC BY), https://www.openbible.info/labs/cross-references/",
  "",
  "Termos completos e créditos: LICENSE-DATA.md e ATTRIBUTION.md em https://github.com/alexpiraginet-bot/biblia-conectada",
  "",
].join("\n"));

const summary = {
  counts: {
    books: canon.books.length,
    booksOT: canon.books.filter((b) => b.testament === "AT").length,
    booksNT: canon.books.filter((b) => b.testament === "NT").length,
    chapters: canon.chapterVerses.length,
    verses: canon.verseCount,
    crossrefRows: xr.rowCount,
    pairs: pairs.a.length,
    selfPairs,
    arcs: N,
    versesWithAnyRef,
    versesWithLinks,
    chapterEdges: E,
  },
  topVerses,
  definitions: {
    links:
      "parceiros únicos de um versículo, com qualquer voto, sem contar o próprio versículo; um trecho (ex.: Mt 5:3–12) conta pelo primeiro versículo, como nos vídeos",
    pairs: `pares únicos De/Para da base; ${selfPairs} deles ligam um versículo a um trecho que começa nele mesmo e não viram arco`,
    arcs: `pares de versículos diferentes (pares menos os ${selfPairs} de um versículo com ele mesmo)`,
    pairVotes: "soma dos votos das duas direções",
  },
};
write(join(OUT.generated, "summary.json"), json(summary));

// open data bundle for people who build on the data (/dados/v1/, documented in DADOS.md), plus a copy of its
// manifest for the /dados page, which reads it at build time
const dados = buildOpenData({
  canon,
  text: blivre.text,
  pairs,
  links,
  graph,
  natal: natalOut,
  credits: { blivre: blivreCredit, openBible: openBibleCredit },
  sources: { crossrefsSha256: CROSSREFS_SHA256, crossrefsHeader: xr.header, blivreZipSha256: sha256(SRC.blivreZip) },
  counts: { crossrefRows: xr.rowCount, pairs: pairs.a.length, selfPairs, arcs: N, versesWithLinks },
});
for (const f of dados.files) write(join(OUT.publicDados, "v1", f.path), f.data);
write(join(OUT.generated, "dados-manifest.json"), JSON.stringify(dados.manifest, null, 2) + "\n");
log(`open data: ${dados.files.length} files in public/dados/v1 (${(dados.files.reduce((s, f) => s + f.data.byteLength, 0) / 1e6).toFixed(1)} MB)`);

// community pages: trail "Antes do Natal", Ponte nº N calendar, links per chapter (scripts/data/community.ts)
buildCommunity({ canon, text: blivre.text, links }, write, log);

const inputs = Object.fromEntries(
  [SRC.blivreZip, SRC.crossrefsTxt, SRC.xrefNpz, SRC.statsJson, SRC.natalStatsJson, SRC.attribution].map((p) => [relative(REPO, p), sha256(p)]),
);
writeFileSync(join(OUT.generated + STAGE, "manifest.json"), JSON.stringify({ inputs, outputs: written }, null, 1));
for (const dir of OUTPUT_DIRS) {
  rmSync(dir, { recursive: true, force: true });
  renameSync(dir + STAGE, dir);
}
log(`wrote ${Object.keys(written).length} files`);
console.log(JSON.stringify(summary.counts));
