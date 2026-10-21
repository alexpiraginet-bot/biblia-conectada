import { createReferenceParser, formatRef, refPath } from "@/lib/canon/reference";
import type { Book } from "@/lib/canon/types";
import openNbvBooks from "@/data/generated/translations/open-nbv-books.json";
import type { AssistantTranslation } from "@/lib/assistant/types";

/** Only one exact verse. URL slugs never fall through to fuzzy book-name matching. */
export function resolveStudyReference(raw: unknown, books: readonly Book[], translation: AssistantTranslation = "blivre") {
  if (typeof raw !== "string" || raw.length > 120) return null;
  let input = raw.trim();
  if (!input) return null;
  const pathInput = input.includes("/");
  if (input.startsWith("ler/open-nbv/")) { translation = "open-nbv"; input = input.slice(13); }
  const editionBooks = translation === "open-nbv" ? openNbvBooks as Book[] : books;
  const edition = translation === "open-nbv" ? { translation } : {};
  const prefix = translation === "open-nbv" ? "/ler/open-nbv" : "";
  if (pathInput) {
    const match = /^([a-z0-9-]{2,30})\/([1-9]\d{0,2})\/([1-9]\d{0,2})$/.exec(input);
    if (!match) return null;
    const book = editionBooks.find((item) => item.slug === match[1]);
    const chapter = Number(match[2]), verse = Number(match[3]);
    if (!book || chapter > book.verses.length || verse > book.verses[chapter - 1]) return null;
    return { book, chapter, verse, reference: `${book.name} ${chapter}:${verse}`, href: `${prefix}/${book.slug}/${chapter}/${verse}`, ...edition };
  }
  // The free field accepts a book name/abbreviation followed by chapter:verse.
  // Reject lists, ranges and verse suffixes instead of silently choosing their first verse.
  if (!/^[\p{L}\p{M}\d.\sªº]+\s+[1-9]\d{0,2}\s*:\s*[1-9]\d{0,2}$/u.test(input)) return null;
  const parsed = createReferenceParser(editionBooks)(input);
  if (!parsed.ok || parsed.ref.verse === undefined || parsed.ref.chapterEnd !== undefined || parsed.ref.verseEnd !== undefined) return null;
  const { book, chapter, verse } = parsed.ref;
  return { book, chapter, verse, reference: formatRef(parsed.ref), href: `${prefix}${refPath(parsed.ref)}`, ...edition };
}
