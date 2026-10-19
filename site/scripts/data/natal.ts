// "Antes do Natal" study numbers, computed as estudos/biblia-natal/tools/analyze.py does: pairs between any Old
// Testament verse and the birth chapters (Matthew 1–2, Luke 1–2), keyed by the verse numbers as written in the source
// (that script does not clip verse numbers to the chapter length), votes summed over both directions.
import type { Canon } from "./canon";
import type { CrossRefs } from "./crossrefs";

export const BIRTH_CHAPTERS: ReadonlyArray<readonly [osis: string, chapter: number]> = [
  ["Matt", 1], ["Matt", 2], ["Luke", 1], ["Luke", 2],
];

export type NatalPair = { ot: string; nt: string; otBook: number; max: number; sum: number; otToNt: number[]; ntToOt: number[] };

export type NatalStudy = {
  birthChapterVerses: number;
  pairsAll: number;
  pairsMaxVoteGt0: number;
  otVersesAll: number;
  otVersesPos: number;
  otBooksAll: number;
  otBooksPos: number;
  otBooksMissing: string[];
  ntVersesLinkedPos: number;
  pairs: NatalPair[];
};

export function natalStudy(canon: Canon, x: CrossRefs): NatalStudy {
  const osis = canon.stats.osis;
  const firstNt = canon.books.findIndex((b) => b.testament === "NT");
  const birth = new Set(BIRTH_CHAPTERS.map(([o, c]) => `${osis.indexOf(o)}:${c}`));
  const name = (b: number, c: number, v: number) => `${canon.books[b].name} ${c}:${v}`;
  const acc = new Map<string, NatalPair>();
  for (let i = 0; i < x.rowCount; i++) {
    const a = [x.from.b[i], x.from.c[i], x.from.v[i]] as const;
    const b = [x.to.b[i], x.to.c[i], x.to.v[i]] as const;
    const [ot, nt] = a[0] < firstNt ? [a, b] : [b, a];
    if (!(ot[0] < firstNt && birth.has(`${nt[0]}:${nt[1]}`))) continue;
    const key = `${ot.join(".")}|${nt.join(".")}`;
    const v = x.votes[i];
    const e = acc.get(key) ?? { ot: name(...ot), nt: name(...nt), otBook: ot[0], max: -Infinity, sum: 0, otToNt: [], ntToOt: [] };
    e.max = Math.max(e.max, v);
    e.sum += v;
    (a === ot ? e.otToNt : e.ntToOt).push(v);
    acc.set(key, e);
  }
  const pairs = [...acc.values()].sort((p, q) => q.max - p.max);
  const pos = pairs.filter((p) => p.max > 0);
  const otBooksPos = new Set(pos.map((p) => p.otBook));
  const birthChapterVerses = BIRTH_CHAPTERS.reduce((s, [o, c]) => s + canon.books[osis.indexOf(o)].verses[c - 1], 0);
  return {
    birthChapterVerses,
    pairsAll: pairs.length,
    pairsMaxVoteGt0: pos.length,
    otVersesAll: new Set(pairs.map((p) => p.ot)).size,
    otVersesPos: new Set(pos.map((p) => p.ot)).size,
    otBooksAll: new Set(pairs.map((p) => p.otBook)).size,
    otBooksPos: otBooksPos.size,
    otBooksMissing: canon.books.slice(0, firstNt).filter((b) => !otBooksPos.has(b.index)).map((b) => b.name),
    ntVersesLinkedPos: new Set(pos.map((p) => p.nt)).size,
    pairs,
  };
}

export function natalPair(study: NatalStudy, ot: string, nt: string): NatalPair | undefined {
  return study.pairs.find((p) => p.ot === ot && p.nt === nt);
}
