// The book table and the baseline for client code (books.json is already in the header's bundle for the search).
import booksJson from "@/data/generated/books.json";
import type { Book } from "@/lib/canon/types";
import { baseline } from "./geometry";

export const BOOKS = booksJson as Book[];
export const BASE = baseline(BOOKS);
const bySlug = new Map(BOOKS.map((b) => [b.slug, b]));

/** The verse of a verse page path ("/isaias/9/6" -> global index), or null for any other page. */
export function verseFromPath(pathname: string): number | null {
  const m = /^\/([a-z0-9-]+)\/([1-9]\d{0,2})\/([1-9]\d{0,2})\/?$/.exec(pathname);
  const book = m && bySlug.get(m[1]);
  if (!m || !book) return null;
  const c = Number(m[2]);
  const v = Number(m[3]);
  if (c > book.verses.length || v > book.verses[c - 1]) return null;
  let gv = book.firstVerse;
  for (let i = 0; i < c - 1; i++) gv += book.verses[i];
  return gv + v - 1;
}

/** "/isaias/9" for a global chapter index */
export function chapterOfVerse(gv: number): { book: Book; chapter: number; path: string; label: string } {
  const { book, chapter } = BASE.locate(gv);
  return { book, chapter, path: `/${book.slug}/${chapter}`, label: `${book.name} ${chapter}` };
}
