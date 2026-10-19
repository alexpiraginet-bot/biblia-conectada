// Server-side access to the generated reading data (build time and on-demand rendering). Never imported by client code.
import chapterLinksJson from "@/data/generated/chapter-links.json";
import chapterPairsJson from "@/data/generated/chapter-pairs.json";
import versePagesJson from "@/data/generated/verse-pages.json";
import { arcStrength } from "@/lib/arc-style";
import { createGrid } from "@/lib/canon/grid";
import type { Book } from "@/lib/canon/types";
import { books } from "@/lib/data";

export const grid = createGrid(books);

/** [partner global verse, votes (sum of both directions), direction from this verse: 1 out, 2 in, 3 both] */
export type Link = [number, number, number];
export type VerseData = { n: number; text: string; links: Link[] };
type BookFile = { osis: string; chapters: { t: string; l: Link[] }[][] };

const bySlug = new Map(books.map((b) => [b.slug, b]));
export function bookBySlug(slug: string): Book | undefined {
  return bySlug.get(slug);
}

const files = new Map<string, Promise<BookFile>>();
function bookFile(slug: string): Promise<BookFile> {
  let f = files.get(slug);
  if (!f) {
    f = import(`@/data/generated/books/${slug}.json`).then((m: { default: BookFile }) => m.default);
    files.set(slug, f);
  }
  return f;
}

/** Parses "9" into a chapter number that exists in the book, or null. */
export function chapterNumber(book: Book, raw: string): number | null {
  if (!/^[1-9]\d{0,2}$/.test(raw)) return null;
  const c = Number(raw);
  return c <= book.verses.length ? c : null;
}

export function verseNumber(book: Book, chapter: number, raw: string): number | null {
  if (!/^[1-9]\d{0,2}$/.test(raw)) return null;
  const v = Number(raw);
  return v <= book.verses[chapter - 1] ? v : null;
}

export async function chapterVerses(book: Book, chapter: number): Promise<VerseData[]> {
  const f = await bookFile(book.slug);
  return f.chapters[chapter - 1].map((v, i) => ({ n: i + 1, text: v.t, links: v.l }));
}

export async function verseText(gv: number): Promise<string> {
  const loc = grid.locate(gv);
  const f = await bookFile(loc.book.slug);
  return f.chapters[loc.chapter - 1][loc.verse - 1].t;
}

/** Position of a verse on the arc baseline of video 1: 0 at Gênesis 1:1, 1 at Apocalipse 22:21, chapters equally spaced. */
export function verseX(gv: number): number {
  const { book, chapter, verse } = grid.locate(gv);
  return (book.firstChapter + chapter - 1 + (verse - 0.5) / book.verses[chapter - 1]) / grid.chapterCount;
}

export type VerseRef = { gv: number; book: Book; chapter: number; verse: number; label: string; path: string };
export function verseRef(gv: number): VerseRef {
  const { book, chapter, verse } = grid.locate(gv);
  return { gv, book, chapter, verse, label: `${book.name} ${chapter}:${verse}`, path: `/${book.slug}/${chapter}/${verse}` };
}

export type ChapterRef = { ci: number; book: Book; chapter: number; label: string; path: string };
export function chapterRef(ci: number): ChapterRef {
  const { book, chapter } = grid.locateChapter(ci);
  return { ci, book, chapter, label: `${book.name} ${chapter}`, path: `/${book.slug}/${chapter}` };
}

/** Chapters most linked to this one: [chapter ref, distinct verse pairs], ties at the cut kept by the pipeline. */
export function linkedChapters(book: Book, chapter: number): { ref: ChapterRef; pairs: number }[] {
  const list = (chapterLinksJson as [number, number][][])[book.firstChapter + chapter - 1];
  return list.map(([ci, pairs]) => ({ ref: chapterRef(ci), pairs }));
}

export const versePages = versePagesJson as [string, number, number][];

/** Distinct verse pairs touching a chapter (self-pairs excluded). */
export function chapterPairs(book: Book, chapter: number): number {
  return (chapterPairsJson as number[])[book.firstChapter + chapter - 1];
}

export type ChapterPartner = { ci: number; pairs: number; light: number };
/**
 * Every chapter linked to this one, from the verse links: distinct verse pairs with one end here and the other there
 * (pairs inside the chapter left out), and the summed arc strength of those pairs (arc-style.ts).
 */
export async function chapterPartners(book: Book, chapter: number): Promise<ChapterPartner[]> {
  const here = book.firstChapter + chapter - 1;
  const acc = new Map<number, ChapterPartner>();
  for (const v of await chapterVerses(book, chapter)) {
    for (const [gv, votes] of v.links) {
      const loc = grid.locate(gv);
      const ci = loc.book.firstChapter + loc.chapter - 1;
      if (ci === here) continue;
      const p = acc.get(ci) ?? { ci, pairs: 0, light: 0 };
      p.pairs++;
      p.light += arcStrength(votes);
      acc.set(ci, p);
    }
  }
  return [...acc.values()].sort((p, q) => q.pairs - p.pairs || p.ci - q.ci);
}

/** Every chapter of another book linked to this book, added up over the book's chapters (see chapterPartners). */
export async function bookPartners(book: Book): Promise<ChapterPartner[]> {
  const end = book.firstChapter + book.verses.length;
  const acc = new Map<number, ChapterPartner>();
  for (let c = 1; c <= book.verses.length; c++) {
    for (const p of await chapterPartners(book, c)) {
      if (p.ci >= book.firstChapter && p.ci < end) continue;
      const q = acc.get(p.ci) ?? { ci: p.ci, pairs: 0, light: 0 };
      q.pairs += p.pairs;
      q.light += p.light;
      acc.set(p.ci, q);
    }
  }
  return [...acc.values()].sort((p, q) => q.pairs - p.pairs || p.ci - q.ci);
}

/** Previous and next chapter across book boundaries. */
export function neighbours(book: Book, chapter: number): { prev?: ChapterRef; next?: ChapterRef } {
  const ci = book.firstChapter + chapter - 1;
  return {
    prev: ci > 0 ? chapterRef(ci - 1) : undefined,
    next: ci < grid.chapterCount - 1 ? chapterRef(ci + 1) : undefined,
  };
}
