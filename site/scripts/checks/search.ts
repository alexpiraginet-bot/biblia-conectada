// Post-build checks of the search (called by check-dist.ts): the word index the browser reads (public/data/busca/v1)
// is the BLIVRE text's, word by word and place by place, in the order of the reading pages' link counts (CLAUDE.md
// rule 3: the counts the search shows are the index's); /buscar ships its static shell; and the palette's code is in
// no page until someone searches (src/components/search/SearchHost.tsx loads it on first use).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { decodeAscending, decodeOrder, INDEX_FORMAT, shardOf, type IndexMeta, type PositionShard, type WordShard } from "../../src/components/search/format";
import { tokenize, wordKey } from "../../src/lib/words";
import { OUT, SITE } from "../data/sources";
import { textFiles } from "../data/leak-guard";

type BookFile = { chapters: { t: string; l: unknown[] }[][] };

/** a string only the search panel has: the chunk that holds it is the palette's */
const PANEL_MARK = "Buscas recentes neste aparelho";

export function checkSearch({
  html,
  page,
  textOf,
  failures,
}: {
  html: readonly string[];
  page: (rel: string) => string;
  textOf: (s: string) => string;
  failures: string[];
}): string {
  const dir = join(OUT.publicData, "busca", "v1");
  const json = <T>(rel: string) => JSON.parse(readFileSync(join(dir, rel), "utf8")) as T;
  const meta = json<IndexMeta>("index.json");
  if (meta.format !== INDEX_FORMAT) failures.push(`[search] index.json format is ${meta.format}`);

  // the text and the link count of every verse, from the generated book files
  const books = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as { slug: string }[];
  const keys: string[][] = [];
  const links: number[] = [];
  for (const b of books) {
    const f = JSON.parse(readFileSync(join(OUT.generated, "books", `${b.slug}.json`), "utf8")) as BookFile;
    for (const ch of f.chapters) for (const v of ch) {
      keys.push(tokenize(v.t).map(wordKey));
      links.push(v.l.length);
    }
  }
  const summary = JSON.parse(readFileSync(join(OUT.generated, "summary.json"), "utf8")) as { counts: { verses: number }; topVerses: { gv: number; links: number }[] };
  if (meta.verses !== summary.counts.verses || keys.length !== meta.verses) failures.push(`[search] index.json has ${meta.verses} verses, the text ${keys.length}`);

  // ranks: the most linked verse first (the one the home page names), then by link count and canonical order
  const { verse, links: byRank } = decodeOrder(meta);
  const rankOf = new Int32Array(keys.length).fill(-1);
  verse.forEach((gv, r) => (rankOf[gv] = r));
  if (rankOf.includes(-1)) failures.push("[search] a verse has no rank");
  for (let r = 0; r < verse.length; r++) {
    const gv = verse[r];
    const prev = verse[r - 1];
    if (byRank[r] !== links[gv] || (r > 0 && (links[prev] < links[gv] || (links[prev] === links[gv] && prev > gv)))) {
      failures.push(`[search] rank ${r} (verse ${gv}) is out of the link order`);
      break;
    }
  }
  if (verse[0] !== summary.topVerses[0].gv || byRank[0] !== summary.topVerses[0].links) failures.push("[search] the first rank is not the most linked verse");

  // every word: its verses in rank order and its places in each, as the text has them
  const want = new Map<string, Map<number, number[]>>();
  keys.forEach((ks, gv) =>
    ks.forEach((k, i) => {
      const m = want.get(k) ?? want.set(k, new Map()).get(k)!;
      (m.get(gv) ?? m.set(gv, []).get(gv)!).push(i);
    }),
  );
  const listed = new Set(meta.shards);
  for (const sub of ["palavras", "posicoes"]) {
    const files = readdirSync(join(dir, sub)).map((f) => f.replace(/\.json$/, ""));
    if (files.length !== listed.size || files.some((f) => !listed.has(f))) failures.push(`[search] ${sub}/ does not hold exactly the ${listed.size} shards of index.json`);
  }
  let words = 0;
  let postings = 0;
  let largest = { shard: "", gzip: 0 };
  const wrong: string[] = [];
  for (const s of meta.shards) {
    const raw = readFileSync(join(dir, "palavras", `${s}.json`));
    const gz = gzipSync(raw, { level: 9 }).length;
    if (gz > largest.gzip) largest = { shard: s, gzip: gz };
    const w = JSON.parse(raw.toString("utf8")) as WordShard;
    const p = json<PositionShard>(join("posicoes", `${s}.json`));
    for (const [k, diffs] of Object.entries(w)) {
      words++;
      const m = want.get(k);
      const ranks = decodeAscending(diffs);
      postings += ranks.length;
      const expected = m ? [...m.keys()].sort((a, b) => rankOf[a] - rankOf[b]) : [];
      const ok =
        shardOf(k) === s &&
        ranks.length === expected.length &&
        expected.every((gv, i) => verse[ranks[i]] === gv) &&
        p[k]?.length === expected.length &&
        expected.every((gv, i) => JSON.stringify(typeof p[k][i] === "number" ? [p[k][i]] : p[k][i]) === JSON.stringify(m!.get(gv)));
      if (!ok) wrong.push(k);
    }
  }
  if (wrong.length) failures.push(`[search] ${wrong.length} words disagree with the text: ${wrong.slice(0, 5).join(", ")}`);
  const wantPostings = [...want.values()].reduce((n, m) => n + m.size, 0);
  if (words !== want.size || meta.words !== want.size) failures.push(`[search] ${words} words in the shards, ${meta.words} in index.json, ${want.size} in the text`);
  if (postings !== wantPostings || meta.postings !== wantPostings) failures.push(`[search] ${postings} verse entries in the shards, ${meta.postings} in index.json, ${wantPostings} in the text`);

  // /buscar: its static shell (the results come in the browser, from ?q=)
  if (!html.includes("buscar.html")) failures.push("[search] buscar.html was not prerendered");
  else {
    const raw = page("buscar.html");
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(raw)?.[1];
    if (!h1 || textOf(h1) !== "Buscar") failures.push("[search] buscar.html: h1 is not “Buscar”");
    if (!/<input[^>]*role="combobox"/.test(raw)) failures.push("[search] buscar.html: no search field in the static shell");
    if (!textOf(raw).includes("A busca precisa de JavaScript")) failures.push("[search] buscar.html: no note for a browser without JavaScript");
  }

  // the palette loads on first use: no page but /buscar asks for its chunk
  const chunks = textFiles(join(SITE, ".next/static"))
    .filter((f) => f.endsWith(".js") && readFileSync(f, "utf8").includes(PANEL_MARK))
    .map((f) => f.slice(join(SITE, ".next").length).replace(/\\/g, "/"));
  if (!chunks.length) failures.push("[search] no browser chunk holds the search panel");
  let eager = 0;
  for (const rel of html) {
    if (rel === "buscar.html") continue;
    const raw = page(rel);
    if (chunks.some((c) => raw.includes(`/_next${c}`))) {
      eager++;
      if (eager <= 3) failures.push(`[search] ${rel} loads the palette's code before anyone searches`);
    }
  }
  return (
    `search index: ${words} words and ${postings} verse entries in ${meta.shards.length} shards match the BLIVRE text, ranked by the reading pages' ` +
    `link counts (largest shard ${largest.shard} ${(largest.gzip / 1024).toFixed(1)} KB gzip); /buscar prerendered; the palette's code in no other of ` +
    `${html.length - 1} pages`
  );
}
