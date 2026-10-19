// OpenBible.info cross references (CC BY), parsed exactly as estudos/biblia-referencias/tools/analyze.py does:
// - the first verse of a range is used ("Ps.89.11-Ps.89.12" -> Ps 89:11);
// - rows whose book or chapter is outside the 66-book grid are skipped;
// - a verse number past the end of its chapter is clipped to the last verse;
// - a "pair" is the unordered verse pair; its votes are the sum of both directions, vmax the larger direction.
import { readFileSync } from "node:fs";
import type { Canon } from "./canon";

const REF = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/;
const INT = /^\s*[+-]?\d+\s*$/;
const KEY = 40000; // > number of verses; same packing as analyze.py

export type CrossRefs = {
  header: string;
  rowCount: number;
  skipped: Record<string, number>;
  /** per row, raw parsed refs before clipping (book index, chapter, verse) */
  from: { b: Int32Array; c: Int32Array; v: Int32Array };
  to: { b: Int32Array; c: Int32Array; v: Int32Array };
  /** per row, global verse index after clipping */
  fgv: Int32Array;
  tgv: Int32Array;
  votes: Int32Array;
};

export type Pairs = {
  /** lower global verse index of each unordered pair (a <= b), sorted by (a, b) */
  a: Int32Array;
  b: Int32Array;
  /** sum of the votes of both directions */
  votes: Int32Array;
  /** larger of the directed votes */
  vmax: Int32Array;
  /** 1 = listed lo->hi, 2 = listed hi->lo, 3 = both */
  dir: Uint8Array;
};

export function parseCrossRefs(path: string, canon: Canon): CrossRefs {
  const bookIndex = new Map(canon.stats.osis.map((o, i) => [o, i]));
  const lines = readFileSync(path, "utf8").split("\n");
  const header = lines[0];
  const n = lines.length;
  const fb = new Int32Array(n), fc = new Int32Array(n), fv = new Int32Array(n);
  const tb = new Int32Array(n), tc = new Int32Array(n), tv = new Int32Array(n);
  const fgv = new Int32Array(n), tgv = new Int32Array(n), votes = new Int32Array(n);
  const skipped: Record<string, number> = {};
  const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1);
  const parse = (ref: string) => {
    const m = REF.exec(ref.split("-")[0]);
    if (!m) return "ValueError" as const;
    const b = bookIndex.get(m[1]);
    if (b === undefined) return "KeyError" as const;
    const c = Number(m[2]), v = Number(m[3]);
    // the typed arrays below are int32: refuse what would wrap instead of merging it into another verse
    if (c > 0x7fffffff || v > 0x7fffffff) throw new Error(`chapter or verse out of range: ${ref}`);
    return [b, c, v] as const;
  };
  let r = 0;
  for (let i = 1; i < n; i++) {
    const line = lines[i];
    if (line === "" && i === n - 1) break; // trailing newline at end of file
    const p = line.split("\t");
    if (p.length < 3) {
      skip("short");
      continue;
    }
    const a = parse(p[0]);
    if (typeof a === "string") { skip(a); continue; }
    const b = parse(p[1]);
    if (typeof b === "string") { skip(b); continue; }
    if (!INT.test(p[2])) { skip("ValueError"); continue; }
    const books = canon.books;
    if (a[1] < 1 || a[1] > books[a[0]].verses.length || b[1] < 1 || b[1] > books[b[0]].verses.length) {
      skip("chapter_out_of_canon");
      continue;
    }
    if (a[2] < 1 || b[2] < 1) throw new Error(`verse 0 in cross references, line ${i + 1}`);
    fb[r] = a[0]; fc[r] = a[1]; fv[r] = a[2];
    tb[r] = b[0]; tc[r] = b[1]; tv[r] = b[2];
    const fbk = books[a[0]], tbk = books[b[0]];
    fgv[r] = canon.chapterFirst[fbk.firstChapter + a[1] - 1] + Math.min(a[2], fbk.verses[a[1] - 1]) - 1;
    tgv[r] = canon.chapterFirst[tbk.firstChapter + b[1] - 1] + Math.min(b[2], tbk.verses[b[1] - 1]) - 1;
    const vote = Number(p[2].trim());
    if (vote > 0x7fffffff || vote < -0x80000000) throw new Error(`votes out of int32 range, line ${i + 1}`);
    votes[r] = vote;
    r++;
  }
  return {
    header,
    rowCount: r,
    skipped,
    from: { b: fb.slice(0, r), c: fc.slice(0, r), v: fv.slice(0, r) },
    to: { b: tb.slice(0, r), c: tc.slice(0, r), v: tv.slice(0, r) },
    fgv: fgv.slice(0, r),
    tgv: tgv.slice(0, r),
    votes: votes.slice(0, r),
  };
}

export function buildPairs(x: CrossRefs): Pairs {
  const acc = new Map<number, { votes: number; vmax: number; dir: number }>();
  for (let i = 0; i < x.rowCount; i++) {
    const f = x.fgv[i], t = x.tgv[i];
    const lo = Math.min(f, t), hi = Math.max(f, t);
    const key = lo * KEY + hi;
    const e = acc.get(key);
    const d = f === t ? 3 : f < t ? 1 : 2;
    if (e) {
      e.votes += x.votes[i];
      e.vmax = Math.max(e.vmax, x.votes[i]);
      e.dir |= d;
    } else acc.set(key, { votes: x.votes[i], vmax: x.votes[i], dir: d });
  }
  const keys = [...acc.keys()].sort((p, q) => p - q);
  const out: Pairs = {
    a: new Int32Array(keys.length),
    b: new Int32Array(keys.length),
    votes: new Int32Array(keys.length),
    vmax: new Int32Array(keys.length),
    dir: new Uint8Array(keys.length),
  };
  keys.forEach((k, i) => {
    const e = acc.get(k)!;
    out.a[i] = Math.floor(k / KEY);
    out.b[i] = k % KEY;
    out.votes[i] = e.votes;
    out.vmax[i] = e.vmax;
    out.dir[i] = e.dir;
  });
  return out;
}

/** Unique partners per verse, self-pairs excluded. Returns, for each verse, [partner, votes, dir from this verse]. */
export function linksPerVerse(p: Pairs, verseCount: number): Array<Array<[number, number, number]>> {
  const links: Array<Array<[number, number, number]>> = Array.from({ length: verseCount }, () => []);
  for (let i = 0; i < p.a.length; i++) {
    const a = p.a[i], b = p.b[i];
    if (a === b) continue;
    const d = p.dir[i];
    // dir seen from a: 1 = a->b (out), 2 = b->a (in). Seen from b it flips.
    links[a].push([b, p.votes[i], d]);
    links[b].push([a, p.votes[i], d === 3 ? 3 : 3 - d]);
  }
  for (const l of links) l.sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  return links;
}
