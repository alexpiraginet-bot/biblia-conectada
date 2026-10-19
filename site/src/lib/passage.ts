// Passages as lists of global verse indices: runs of consecutive verses and their Portuguese reference
// ("Lucas 10:25–37", "Gênesis 1:1–2:3", "Atos 2:1–4, 6–8; 3:1"). Pure functions shared by the data pipeline and the site.
import type { createGrid } from "./canon/grid";
import { slugify } from "./canon/text";

type Grid = ReturnType<typeof createGrid>;

/** Sorted, de-duplicated verses split into runs of consecutive global indices: [first, last] pairs. */
export function verseRuns(verses: readonly number[]): [number, number][] {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const gv of sorted) {
    const last = runs[runs.length - 1];
    if (last && gv === last[1] + 1) last[1] = gv;
    else runs.push([gv, gv]);
  }
  return runs;
}

/**
 * Portuguese reference of a set of verses. A run that crosses a chapter or a book is written in full
 * ("Gênesis 1:1–2:3"); runs in the same chapter are joined by commas, other chapters of the same book by semicolons.
 * Uses the en dash for ranges, as the reading pages do.
 */
export function formatRuns(runs: readonly [number, number][], grid: Grid): string {
  let out = "";
  let prevBook = -1;
  let prevChapter = -1;
  for (const [a, b] of runs) {
    const s = grid.locate(a);
    const e = grid.locate(b);
    let head: string;
    if (s.book.index !== prevBook) head = `${out ? "; " : ""}${s.book.name} ${s.chapter}:${s.verse}`;
    else if (s.chapter !== prevChapter) head = `; ${s.chapter}:${s.verse}`;
    else head = `, ${s.verse}`;
    let tail = "";
    if (b !== a) {
      if (e.book.index !== s.book.index) tail = `–${e.book.name} ${e.chapter}:${e.verse}`;
      else if (e.chapter !== s.chapter) tail = `–${e.chapter}:${e.verse}`;
      else tail = `–${e.verse}`;
    }
    out += head + tail;
    prevBook = e.book.index;
    prevChapter = e.chapter;
  }
  return out;
}

export function formatPassage(verses: readonly number[], grid: Grid): string {
  return formatRuns(verseRuns(verses), grid);
}

/** URL slug of a passage: its first run ("lucas-10-25-37"). */
export function passageSlug(verses: readonly number[], grid: Grid): string {
  const [first] = verseRuns(verses);
  return slugify(formatRuns([first], grid));
}

/** Global chapter indices touched by a set of verses, in canonical order. */
export function passageChapters(verses: readonly number[], grid: Grid): number[] {
  const out = new Set<number>();
  for (const gv of verses) {
    const { book, chapter } = grid.locate(gv);
    out.add(book.firstChapter + chapter - 1);
  }
  return [...out].sort((a, b) => a - b);
}
