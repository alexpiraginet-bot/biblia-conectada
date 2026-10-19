// Trilha "Antes do Natal": one step per Old Testament book, each the strongest verse pair between that book and the
// birth chapters (Mateus 1–2, Lucas 1–2). Votes are the reading panel's: the sum of both directions, over the
// verse grid (a range counts by its first verse, a verse past the end of its chapter by the last one).
// The 26 books whose best pair has the most votes, in canonical order, with Isaías last (Is 7:14 and Mt 1:23, the
// pair of the second video). Suggested dates: one step a day up to 24 December.
import { addDays } from "../../src/lib/community/ponte";
import type { VerseLinks } from "./ponte";

export const TRAIL = {
  slug: "antes-do-natal",
  title: "Antes do Natal",
  steps: 26,
  /** suggested date of the first step (all steps are open from the first day) */
  firstDate: "2026-11-29",
  /** the step kept for the end */
  lastBook: "Isa",
  birthChapters: [
    ["Matt", 1],
    ["Matt", 2],
    ["Luke", 1],
    ["Luke", 2],
  ] as ReadonlyArray<readonly [string, number]>,
} as const;

type BookLike = { index: number; osis: string; testament: "AT" | "NT"; firstVerse: number; verses: number[] };

export type TrailPair = { book: number; ot: number; nt: number; votes: number; pairs: number };
export type TrailStep = TrailPair & { step: number; date: string };

/** For each Old Testament book, its strongest pair with the birth chapters, and how many pairs it has. */
export function bestPairsPerBook(links: VerseLinks, books: readonly BookLike[], bookOf: (gv: number) => number): TrailPair[] {
  const birth = new Set<number>();
  for (const [osis, c] of TRAIL.birthChapters) {
    const b = books.find((x) => x.osis === osis);
    if (!b) throw new Error(`[trilha] no book ${osis}`);
    let first = b.firstVerse;
    for (let i = 0; i < c - 1; i++) first += b.verses[i];
    for (let v = 0; v < b.verses[c - 1]; v++) birth.add(first + v);
  }
  const best = new Map<number, TrailPair>();
  for (const nt of [...birth].sort((a, b) => a - b)) {
    for (const [ot, votes] of links[nt]) {
      const book = bookOf(ot);
      if (books[book].testament !== "AT") continue;
      const cur = best.get(book);
      if (!cur) {
        best.set(book, { book, ot, nt, votes, pairs: 1 });
        continue;
      }
      cur.pairs++;
      // most votes; then the earlier Old Testament verse; then the earlier birth verse
      if (votes > cur.votes || (votes === cur.votes && (ot < cur.ot || (ot === cur.ot && nt < cur.nt)))) Object.assign(cur, { ot, nt, votes });
    }
  }
  return [...best.values()].sort((p, q) => p.book - q.book);
}

/** The steps: the TRAIL.steps strongest books (ties at the cut fail the build), canonical order, lastBook at the end. */
export function trailSteps(perBook: TrailPair[], books: readonly BookLike[]): TrailStep[] {
  const ranked = [...perBook].sort((p, q) => q.votes - p.votes || p.book - q.book);
  const chosen = ranked.slice(0, TRAIL.steps);
  const next = ranked[TRAIL.steps];
  if (next && next.votes === chosen[chosen.length - 1].votes) throw new Error("[trilha] tie at the cut of the trail");
  const last = books.find((b) => b.osis === TRAIL.lastBook)!.index;
  if (!chosen.some((p) => p.book === last)) throw new Error(`[trilha] ${TRAIL.lastBook} is not among the strongest books`);
  const ordered = chosen.filter((p) => p.book !== last).sort((p, q) => p.book - q.book);
  ordered.push(chosen.find((p) => p.book === last)!);
  return ordered.map((p, i) => ({ ...p, step: i + 1, date: addDays(TRAIL.firstDate, i) }));
}
