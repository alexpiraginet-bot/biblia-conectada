// The word index of the search (site/public/data/busca/v1/), shared by the data pipeline that writes it
// (scripts/data/search-index.ts) and the browser code that reads it (text-index.ts), so both sides use one encoding.
// Relative imports only: the pipeline loads this file without the app's "@/" alias.
//
// A verse's place in the index is its rank: its position when the 31.102 verses are sorted by their links (unique
// partners, the number the reading pages show), most first, then in canonical order. Every word lists its verses as
// ascending ranks, so a list is already in result order, two lists intersect with one merge, and the first ranks of
// any result are its most linked verses.

export const INDEX_FORMAT = "biblia-conectada/busca@1";
/** where the browser reads the files (site/public/data/busca/v1) */
export const INDEX_PATH = "/data/busca/v1";

/** index.json */
export type IndexMeta = {
  format: string;
  verses: number;
  words: number;
  postings: number;
  /** [links, verses]: how many verses have each link count, from the most linked down, in rank order */
  runs: [number, number][];
  /** the verse (global index, 0 = Gênesis 1:1) at each rank, as differences inside each run (a run is in canonical order) */
  order: number[];
  /** shard names: the first two letters of the words a shard holds; a one-letter word has a shard of its own */
  shards: string[];
};

/** palavras/<shardFile>: word -> its verses as ascending ranks, the first rank and then the differences */
export type WordShard = Record<string, number[]>;
/** posicoes/<shardFile>: word -> for each of its verses, in the same order, where the word stands in the verse (0 is
 *  the first word); a number when once, a list when more */
export type PositionShard = Record<string, (number | number[])[]>;

/** The shard of a word key ("luz" -> "lu", "e" -> "e"). Keys are lowercase ASCII letters (src/lib/words.ts wordKey). */
export const shardOf = (key: string) => key.slice(0, 2);

/** Where a shard's file is under palavras/ and posicoes/: "lu" -> "l/u.json", "e" -> "e/_.json". The two letters are
 *  never side by side in a path, so no file is named like a protected translation ("aa": tests/sources.test.ts). */
export const shardFile = (shard: string) => `${shard[0]}/${shard[1] ?? "_"}.json`;

export function encodeAscending(xs: ArrayLike<number>): number[] {
  const out = new Array<number>(xs.length);
  let prev = 0;
  for (let i = 0; i < xs.length; i++) {
    out[i] = xs[i] - prev;
    prev = xs[i];
  }
  return out;
}

export function decodeAscending(diffs: readonly number[]): Int32Array {
  const out = new Int32Array(diffs.length);
  let acc = 0;
  for (let i = 0; i < diffs.length; i++) out[i] = acc += diffs[i];
  return out;
}

/** `verses`: the verse at each rank; `runs`: as in IndexMeta. Each run is written as its own ascending list. */
export function encodeOrder(verses: ArrayLike<number>, runs: readonly [number, number][]): number[] {
  const out: number[] = [];
  let r = 0;
  for (const [, n] of runs) {
    let prev = 0;
    for (let i = 0; i < n; i++, r++) {
      out.push(verses[r] - prev);
      prev = verses[r];
    }
  }
  return out;
}

/** By rank: the verse and its link count. */
export function decodeOrder(meta: Pick<IndexMeta, "runs" | "order">): { verse: Int32Array; links: Int32Array } {
  const verse = new Int32Array(meta.order.length);
  const links = new Int32Array(meta.order.length);
  let r = 0;
  for (const [n, count] of meta.runs) {
    let acc = 0;
    for (let i = 0; i < count; i++, r++) {
      verse[r] = acc += meta.order[r];
      links[r] = n;
    }
  }
  return { verse, links };
}
