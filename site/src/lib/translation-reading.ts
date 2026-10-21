import "server-only";
import blivreBooks from "@/data/generated/books.json";
import openNbvBooks from "@/data/generated/translations/open-nbv-books.json";
import type { Book } from "@/lib/canon/types";
import type { TranslationId } from "@/lib/translations";

/** Metadata only. Open NBV firstVerse offsets are edition-local, not graph indices. */
export function translationBooks(id: string): Book[] | null {
  if (id === "blivre") return blivreBooks as Book[];
  if (id === "open-nbv") return openNbvBooks as Book[];
  return null;
}

type TextBook = { osis: string; chapters: string[][] };
type BlivreBook = { osis: string; chapters: { t: string }[][] };
const files = new Map<string, Promise<TextBook>>();
function bookFile(id: TranslationId, slug: string): Promise<TextBook> {
  const key = `${id}/${slug}`;
  let file = files.get(key);
  if (!file) {
    file = id === "open-nbv"
      ? import(`@/data/generated/translations/open-nbv/${slug}.json`).then((m: { default: TextBook }) => m.default)
      : import(`@/data/generated/books/${slug}.json`).then((m: { default: BlivreBook }) => ({
        osis: m.default.osis,
        chapters: m.default.chapters.map((chapter) => chapter.map((verse) => verse.t)),
      }));
    files.set(key, file);
  }
  return file;
}

function chapterBook(id: string, slug: string, chapter: number): Book | null {
  const book = translationBooks(id)?.find((candidate) => candidate.slug === slug);
  return book && Number.isInteger(chapter) && chapter >= 1 && chapter <= book.verses.length ? book : null;
}

/** Invalid coordinates return null; missing data for a valid coordinate is a build/integrity error. */
export async function translatedChapter(id: string, slug: string, chapter: number): Promise<string[] | null> {
  const book = chapterBook(id, slug, chapter);
  if (!book) return null;
  const file = await bookFile(id as TranslationId, slug);
  const rows = file.chapters[chapter - 1];
  if (file.osis !== book.osis || !rows || rows.length !== book.verses[chapter - 1]) throw new Error("Translation chapter does not match its metadata");
  return rows;
}

export async function translatedVerse(id: string, slug: string, chapter: number, verse: number): Promise<string | null> {
  const book = chapterBook(id, slug, chapter);
  if (!book || !Number.isInteger(verse) || verse < 1 || verse > book.verses[chapter - 1]) return null;
  const rows = await translatedChapter(id, slug, chapter);
  return rows![verse - 1];
}
