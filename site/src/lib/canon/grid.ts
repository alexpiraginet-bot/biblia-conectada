// Global verse/chapter indexing over the KJV/OpenBible grid described by books.json.
import type { Book } from "./types";

export type VerseLocation = { book: Book; chapter: number; verse: number };

export function createGrid(books: readonly Book[]) {
  const last = books[books.length - 1];
  const verseCount = last.firstVerse + last.verses.reduce((a, b) => a + b, 0);
  const chapterCount = last.firstChapter + last.verses.length;

  /** global verse index (0-based) -> book/chapter/verse (1-based) */
  function locate(gv: number): VerseLocation {
    if (!Number.isInteger(gv) || gv < 0 || gv >= verseCount) throw new RangeError(`verse index ${gv}`);
    let lo = 0;
    let hi = books.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (books[mid].firstVerse <= gv) lo = mid;
      else hi = mid - 1;
    }
    const book = books[lo];
    let rest = gv - book.firstVerse;
    let chapter = 0;
    while (rest >= book.verses[chapter]) rest -= book.verses[chapter++];
    return { book, chapter: chapter + 1, verse: rest + 1 };
  }

  /** book/chapter/verse (1-based) -> global verse index */
  function verseIndex(book: Book, chapter: number, verse: number): number {
    if (chapter < 1 || chapter > book.verses.length) throw new RangeError(`${book.osis} ${chapter}`);
    if (verse < 1 || verse > book.verses[chapter - 1]) throw new RangeError(`${book.osis} ${chapter}:${verse}`);
    let gv = book.firstVerse;
    for (let c = 0; c < chapter - 1; c++) gv += book.verses[c];
    return gv + verse - 1;
  }

  /** global chapter index (0-based) -> book/chapter */
  function locateChapter(ci: number): { book: Book; chapter: number } {
    if (!Number.isInteger(ci) || ci < 0 || ci >= chapterCount) throw new RangeError(`chapter index ${ci}`);
    const book = [...books].reverse().find((b) => b.firstChapter <= ci)!;
    return { book, chapter: ci - book.firstChapter + 1 };
  }

  return { verseCount, chapterCount, locate, verseIndex, locateChapter };
}
