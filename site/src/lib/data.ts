// Typed access to the files written by scripts/build-data.ts. Imported at build time by server components only.
import booksJson from "@/data/generated/books.json";
import creditsJson from "@/data/generated/credits.json";
import summaryJson from "@/data/generated/summary.json";
import type { Book } from "@/lib/canon/types";

export const books = booksJson as Book[];

export type Summary = {
  counts: {
    books: number;
    chapters: number;
    verses: number;
    crossrefRows: number;
    pairs: number;
    arcs: number;
    versesWithLinks: number;
  };
  topVerses: { gv: number; ref: string; path: string; links: number }[];
  /** arcs with at least `min` votes, for the sculpture's "força das ligações" (sky/model.ts STRENGTH_MIN) */
  strength: { min: number; arcs: number }[];
};
export const summary = summaryJson as Summary;

/** ATTRIBUTION.md and its exact credit lines for the BLIVRE text and the OpenBible.info cross references */
export const credits = creditsJson as { attributionMarkdown: string; blivreCredit: string; openBibleCredit: string };

/** Text of one verse, read from the per-book file (build time). */
export async function verseText(slug: string, chapter: number, verse: number): Promise<string> {
  const file = (await import(`@/data/generated/books/${slug}.json`)) as { default: { chapters: { t: string }[][] } };
  return file.default.chapters[chapter - 1][verse - 1].t;
}
