// Which Explorar pages exist and how their chapters are named in URLs and in the checks of the built pages.
// The map itself is computed by ./atlas-data.ts (server only).
import chapterPairsJson from "@/data/generated/chapter-pairs.json";
import type { Book } from "@/lib/canon/types";
import { bookBySlug, grid, type ChapterRef } from "@/lib/reading";
import { EXPLORE_ALWAYS } from "./home";

export { pairsText, votesText } from "./text";

/** Stable key of a chapter in the map and in the check of the built pages: "lucas-2". */
export function chapterKey(ref: Pick<ChapterRef, "book" | "chapter">): string {
  return `${ref.book.slug}-${ref.chapter}`;
}

/**
 * Explorar pages built ahead: the 200 chapters touched by the most verse pairs (canonical order inside a tie), plus
 * the home centre and João 1. The rest render on their first visit and are kept, like the verse pages.
 */
export const EXPLORE_PREBUILT = 200;
export function explorePages(): { book: Book; chapter: number }[] {
  const pairs = chapterPairsJson as number[];
  const ranked = pairs.map((n, ci) => [ci, n] as const).sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  const cis = new Set(ranked.slice(0, EXPLORE_PREBUILT).map(([ci]) => ci));
  for (const a of EXPLORE_ALWAYS) {
    const b = bookBySlug(a.slug);
    if (b) cis.add(b.firstChapter + a.chapter - 1);
  }
  return [...cis].sort((x, y) => x - y).map((ci) => grid.locateChapter(ci));
}

/** The book and chapter of a URL pair of segments, or null when either does not exist. */
export function resolveChapter(livro: string, cap: string): { book: Book; chapter: number } | null {
  const book = bookBySlug(livro);
  if (!book || !/^[1-9]\d{0,2}$/.test(cap)) return null;
  const chapter = Number(cap);
  return chapter <= book.verses.length ? { book, chapter } : null;
}
