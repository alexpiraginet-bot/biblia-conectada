// Search in the words of the BLIVRE text, from the index the data pipeline writes (public/data/busca/v1/, format.ts).
// A query is words and "phrases in quotes": every word must be in the verse, accents and case ignored; a phrase must
// be there with its words in order, one right after the other. Results come most linked first, then in canonical
// order. Pure functions and a factory over a loader, so the tests read the same files from disk (tests/search.test.ts).
// Relative imports only: the data pipeline and the post-build check load this file too.
import { tokenize, wordKey } from "../../lib/words";
import { decodeAscending, decodeOrder, INDEX_PATH, shardFile, shardOf, type IndexMeta, type PositionShard, type WordShard } from "./format";

export type TextQuery = {
  /** the same for queries that mean the same ("Luz" and "luz"; "luz trevas" and "trevas luz") */
  key: string;
  /** words that must be in the verse, in any place */
  terms: string[];
  /** word sequences that must be in the verse in this order, one after the other */
  phrases: string[][];
};

/** straight and typographic quotes (phones turn " into “ and ”) */
export const QUOTE = /["“”„«»]/;

/** The words of a query, or null when it has none (only digits or punctuation). */
export function parseTextQuery(input: string): TextQuery | null {
  const terms = new Set<string>();
  const phrases: string[][] = [];
  const seen = new Set<string>();
  input.split(QUOTE).forEach((part, i) => {
    const keys = tokenize(part).map(wordKey);
    // odd parts are inside quotes; an open quote runs to the end, so a phrase works before the closing quote is typed
    if (i % 2 === 1 && keys.length > 1) {
      const k = keys.join(" ");
      if (!seen.has(k)) phrases.push(keys);
      seen.add(k);
    } else for (const k of keys) terms.add(k);
  });
  for (const p of phrases) for (const k of p) terms.delete(k);
  if (terms.size === 0 && phrases.length === 0) return null;
  const sorted = [...terms].sort();
  return { key: JSON.stringify([sorted, phrases]), terms: sorted, phrases };
}

export type Loader = (path: string) => Promise<unknown>;
export type TextIndex = ReturnType<typeof createTextIndex>;
type Meta = { verses: number; words: number; postings: number; shards: Set<string>; verse: Int32Array; links: Int32Array };

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** First position of `r` in an ascending list, or -1. */
function find(list: Int32Array, r: number): number {
  let lo = 0;
  let hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid] < r) lo = mid + 1;
    else if (list[mid] > r) hi = mid - 1;
    else return mid;
  }
  return -1;
}

function intersect(a: Int32Array, b: Int32Array): Int32Array {
  const out = new Int32Array(Math.min(a.length, b.length));
  let i = 0;
  let j = 0;
  let n = 0;
  while (i < a.length && j < b.length) {
    if (a[i] < b[j]) i++;
    else if (a[i] > b[j]) j++;
    else {
      out[n++] = a[i];
      i++;
      j++;
    }
  }
  return out.slice(0, n);
}

/**
 * The index behind the search box. `load(path)` returns the parsed JSON of a file under INDEX_PATH ("/index.json",
 * "/palavras/l/u.json"). A request that fails is forgotten, so the next search asks again ("Tentar de novo").
 */
export function createTextIndex(load: Loader) {
  let meta: Promise<Meta> | null = null;
  const files = new Map<string, Promise<unknown>>();
  const lists = new Map<string, Int32Array | null>();
  const results = new Map<string, Promise<Int32Array>>();

  function file<T>(rel: string): Promise<T> {
    let p = files.get(rel);
    if (!p) {
      p = load(`${INDEX_PATH}${rel}`);
      files.set(rel, p);
      p.catch(() => files.delete(rel));
    }
    return p as Promise<T>;
  }

  function getMeta(): Promise<Meta> {
    if (!meta) {
      meta = file<IndexMeta>("/index.json").then((m) => ({
        verses: m.verses,
        words: m.words,
        postings: m.postings,
        shards: new Set(m.shards),
        ...decodeOrder(m),
      }));
      meta.catch(() => (meta = null));
    }
    return meta;
  }

  /** The ascending ranks of the verses with the word, or null when the BLIVRE does not have it. */
  async function list(key: string): Promise<Int32Array | null> {
    if (lists.has(key)) return lists.get(key)!;
    const m = await getMeta();
    const s = shardOf(key);
    let out: Int32Array | null = null;
    if (m.shards.has(s)) {
      const shard = await file<WordShard>(`/palavras/${shardFile(s)}`);
      out = has(shard, key) ? decodeAscending(shard[key]) : null;
    }
    lists.set(key, out);
    return out;
  }

  async function positions(key: string): Promise<(number | number[])[]> {
    const shard = await file<PositionShard>(`/posicoes/${shardFile(shardOf(key))}`);
    return shard[key];
  }

  async function run(q: TextQuery): Promise<Int32Array> {
    const keys = [...new Set([...q.terms, ...q.phrases.flat()])];
    const found = await Promise.all(keys.map(list));
    if (found.some((l) => !l)) return new Int32Array(0);
    const byKey = new Map(keys.map((k, i) => [k, found[i]!]));
    let out = [...byKey.values()].sort((a, b) => a.length - b.length).reduce(intersect);
    for (const phrase of q.phrases) {
      const pos = new Map(await Promise.all([...new Set(phrase)].map(async (k) => [k, await positions(k)] as const)));
      const at = (k: string, r: number) => {
        const p = pos.get(k)![find(byKey.get(k)!, r)];
        return typeof p === "number" ? [p] : p;
      };
      out = out.filter((r) => {
        const rest = phrase.slice(1).map((k) => at(k, r));
        return at(phrase[0], r).some((p) => rest.every((ps, j) => ps.includes(p + j + 1)));
      });
    }
    return out;
  }

  return {
    meta: getMeta,
    /** Every verse that matches, as ascending ranks: most linked first, then canonical order. */
    search(q: TextQuery): Promise<Int32Array> {
      let p = results.get(q.key);
      if (!p) {
        p = run(q);
        results.set(q.key, p);
        p.catch(() => results.delete(q.key));
        // every prefix typed is a query of its own; keep the latest ones
        if (results.size > 64) results.delete(results.keys().next().value!);
      }
      return p;
    },
    /** True when the answer for this query is already in memory. */
    ready: (q: TextQuery) => results.has(q.key),
  };
}

export type Segment = { text: string; mark?: true };

/**
 * A verse cut into plain and marked runs: each word of the query and each phrase found in it. With `maxWords`, a long
 * verse keeps a window of that many words around the first mark, with "…" where it was cut.
 */
export function markVerse(text: string, q: TextQuery, maxWords = Infinity): Segment[] {
  const words = [...text.matchAll(/\p{L}+/gu)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, key: wordKey(m[0]) }));
  const ranges: [number, number][] = [];
  const terms = new Set(q.terms);
  words.forEach((w, i) => {
    if (terms.has(w.key)) ranges.push([w.start, w.end]);
    for (const p of q.phrases) {
      if (p.every((k, j) => words[i + j]?.key === k)) ranges.push([w.start, words[i + p.length - 1].end]);
    }
  });
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }

  let from = 0;
  let to = text.length;
  if (words.length > maxWords) {
    const first = merged.length ? words.findIndex((w) => w.start >= merged[0][0]) : 0;
    let a = Math.max(0, first - Math.floor(maxWords / 3));
    const b = Math.min(words.length, a + maxWords);
    a = Math.max(0, b - maxWords);
    from = a > 0 ? words[a].start : 0;
    to = b < words.length ? words[b - 1].end : text.length;
  }
  const out: Segment[] = [];
  const plain = (s: string) => {
    if (s) out.push({ text: s });
  };
  if (from > 0) plain("… ");
  let at = from;
  for (const [s, e] of merged) {
    if (e <= from || s >= to) continue;
    plain(text.slice(at, Math.max(at, s)));
    out.push({ text: text.slice(Math.max(s, from), Math.min(e, to)), mark: true });
    at = Math.min(e, to);
  }
  plain(text.slice(at, to));
  if (to < text.length) plain("…");
  return out;
}
