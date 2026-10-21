import { books, verseText } from "@/lib/data";

// A short practice route, independent of today's answer. Its links are checked against the source data.
export const PONTE_PRACTICE = [
  { slug: "joao", chapter: 3, verse: 16 },
  { slug: "romanos", chapter: 5, verse: 8 },
  { slug: "1-joao", chapter: 4, verse: 9 },
] as const;

export type PontePracticeVerse = { ref: string; excerpt: string };

/** Resolve labels and excerpts from the same BLIVRE files as the reader, at build time only. */
export async function pontePractice(): Promise<PontePracticeVerse[]> {
  return Promise.all(PONTE_PRACTICE.map(async ({ slug, chapter, verse }) => {
    const book = books.find((entry) => entry.slug === slug)!;
    const text = await verseText(slug, chapter, verse);
    const excerpt = text.length > 115 ? `${text.slice(0, 115).replace(/\s+\S*$/, "")}…` : text;
    return { ref: `${book.name} ${chapter}:${verse}`, excerpt };
  }));
}
