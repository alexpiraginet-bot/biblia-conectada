// Server-side access to the Explorar data (src/data/generated/explore/<slug>.json). Never imported by client code.
import chapterPairsJson from "@/data/generated/chapter-pairs.json";
import type { Book } from "@/lib/canon/types";
import { bookBySlug, chapterRef, grid, type ChapterRef } from "@/lib/reading";
import { EXPLORE_ALWAYS } from "./home";
import type { ExploreChapter, ExploreEdge, ExploreFile } from "./types";

export { pairsText, votesText } from "./text";

const files = new Map<string, Promise<ExploreFile>>();
function exploreFile(slug: string): Promise<ExploreFile> {
  let f = files.get(slug);
  if (!f) {
    f = import(`@/data/generated/explore/${slug}.json`).then((m: { default: ExploreFile }) => m.default);
    files.set(slug, f);
  }
  return f;
}

export type Neighbour = {
  /** 0 = most votes */
  rank: number;
  ref: ChapterRef;
  pairs: number;
  votes: number;
  /** strongest verse pair: verse numbers here and there, and its votes */
  strongest: { here: number; there: number; votes: number };
  /** verses of each chapter that take part in the pairs, ascending */
  hereVerses: number[];
  thereVerses: number[];
};

export type Explore = {
  centre: ChapterRef;
  /** every chapter linked to the centre */
  partners: number;
  neighbours: Neighbour[];
  edges: ExploreEdge[];
};

export async function explore(book: Book, chapter: number): Promise<Explore> {
  const f = await exploreFile(book.slug);
  const c: ExploreChapter = f.chapters[chapter - 1];
  return {
    centre: chapterRef(book.firstChapter + chapter - 1),
    partners: c.partners,
    neighbours: c.top.map(([ci, pairs, votes, [here, there, v], hereVerses, thereVerses], rank) => ({
      rank,
      ref: chapterRef(ci),
      pairs,
      votes,
      strongest: { here, there, votes: v },
      hereVerses,
      thereVerses,
    })),
    edges: c.edges,
  };
}

/** Stable key of a chapter in the graph and in the check of the built pages: "lucas-2". */
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
