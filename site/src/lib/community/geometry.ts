// The baseline of video 1 for the community pages (trail, bridge, table, cards): Gênesis 1:1 to Apocalipse 22:21,
// chapters equally spaced, each link a half ellipse over the line. Same geometry as components/reader/Arcs.tsx
// (one vertical scale for every arc), written without server data so client code and the card canvas can use it.
import type { Book } from "@/lib/canon/types";

export const ARC_W = 1000;
export const ARC_BASE = 236;
export const ARC_TOP = 12;
/** rx -> ry: an arc over the whole baseline reaches ARC_TOP */
export const ARC_FLATTEN = (ARC_BASE - ARC_TOP) / (ARC_W / 2);

export type Baseline = {
  chapterCount: number;
  verseCount: number;
  /** position of a verse on the baseline: 0 at Gênesis 1:1, 1 at Apocalipse 22:21 */
  verseX: (gv: number) => number;
  /** position of the middle of a chapter */
  chapterX: (ci: number) => number;
  /** where each book starts, and where the New Testament starts */
  bookStarts: number[];
  ntStart: number;
  locate: (gv: number) => { book: Book; chapter: number; verse: number };
};

export function baseline(books: readonly Book[]): Baseline {
  const last = books[books.length - 1];
  const chapterCount = last.firstChapter + last.verses.length;
  const verseCount = last.firstVerse + last.verses.reduce((a, b) => a + b, 0);
  function locate(gv: number) {
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
    let c = 0;
    while (rest >= book.verses[c]) rest -= book.verses[c++];
    return { book, chapter: c + 1, verse: rest + 1 };
  }
  return {
    chapterCount,
    verseCount,
    locate,
    verseX(gv) {
      const { book, chapter, verse } = locate(gv);
      return (book.firstChapter + chapter - 1 + (verse - 0.5) / book.verses[chapter - 1]) / chapterCount;
    },
    chapterX: (ci) => (ci + 0.5) / chapterCount,
    bookStarts: books.map((b) => b.firstChapter / chapterCount),
    ntStart: (books.find((b) => b.testament === "NT")?.firstChapter ?? 0) / chapterCount,
  };
}

/** SVG path of the half ellipse between two points of the baseline (0–1), in ARC_W units. */
export function arcPath(x0: number, x1: number): string {
  const [p, q] = x0 < x1 ? [x0 * ARC_W, x1 * ARC_W] : [x1 * ARC_W, x0 * ARC_W];
  const rx = Math.max((q - p) / 2, 0.5);
  return `M${r1(p)} ${ARC_BASE}A${r1(rx)} ${r1(rx * ARC_FLATTEN)} 0 0 1 ${r1(p + 2 * rx)} ${ARC_BASE}`;
}

/** Book ticks under the baseline (one path), plus the longer tick where the New Testament starts. */
export function baselineTicks(b: Baseline): { books: string; nt: string } {
  return {
    books: b.bookStarts.map((x) => `M${r1(x * ARC_W)} ${ARC_BASE + 4}v8`).join(""),
    nt: `M${r1(b.ntStart * ARC_W)} ${ARC_BASE + 4}v18`,
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** "Is 9:6" */
export function shortRef(b: Baseline, gv: number): string {
  const { book, chapter, verse } = b.locate(gv);
  return `${book.abbr} ${chapter}:${verse}`;
}

/** "Isaías 9:6" */
export function longRef(b: Baseline, gv: number): string {
  const { book, chapter, verse } = b.locate(gv);
  return `${book.name} ${chapter}:${verse}`;
}

/** "/isaias/9/6" */
export function versePath(b: Baseline, gv: number): string {
  const { book, chapter, verse } = b.locate(gv);
  return `/${book.slug}/${chapter}/${verse}`;
}
