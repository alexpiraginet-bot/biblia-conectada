// The context of a chosen verse: the verses before and after it, as a window over the book that grows on request.
// The window never leaves the book (the verse before Matthew 1:1 is not its context) and crosses chapters inside it,
// because a chapter's first verses continue the chapter before. Pure: no fetching and no DOM. Rules: docs/CONTEXTO.md.

/** Verses shown on each side of the chosen one when the context opens. */
export const CONTEXT_FIRST = 3;
/** Verses each "show more" adds on its side. */
export const CONTEXT_MORE = 6;

/** What the window needs of a book: where it starts in the whole Bible and the verses of each chapter. */
export type ContextBook = { firstVerse: number; verses: readonly number[] };
/** Global verse indices, both inside the book, `from` ≤ chosen ≤ `to`. */
export type ContextWindow = { from: number; to: number };
export type ContextVerse = { gv: number; chapter: number; verse: number; text: string };
export type ContextBlock = { chapter: number; verses: ContextVerse[] };

const count = (book: ContextBook) => book.verses.reduce((sum, n) => sum + n, 0);
/** First and last global verse index of a book. */
export const bookBounds = (book: ContextBook) => ({ first: book.firstVerse, last: book.firstVerse + count(book) - 1 });

function inside(book: ContextBook, gv: number): boolean {
  const { first, last } = bookBounds(book);
  return Number.isInteger(gv) && gv >= first && gv <= last;
}

/** Chapter and verse (both from 1) of a global verse index of this book. */
export function locateInBook(book: ContextBook, gv: number): { chapter: number; verse: number } {
  if (!inside(book, gv)) throw new RangeError(`verse ${gv} is not in the book`);
  let rest = gv - book.firstVerse;
  let c = 0;
  while (rest >= book.verses[c]) rest -= book.verses[c++];
  return { chapter: c + 1, verse: rest + 1 };
}

/** The window the context opens with: CONTEXT_FIRST verses on each side, as far as the book goes. */
export function firstContext(book: ContextBook, gv: number): ContextWindow {
  if (!inside(book, gv)) throw new RangeError(`verse ${gv} is not in the book`);
  const { first, last } = bookBounds(book);
  return { from: Math.max(first, gv - CONTEXT_FIRST), to: Math.min(last, gv + CONTEXT_FIRST) };
}

/** Whether the book has verses before (or after) the window. */
export function hasMore(book: ContextBook, window: ContextWindow, side: "before" | "after"): boolean {
  const { first, last } = bookBounds(book);
  return side === "before" ? window.from > first : window.to < last;
}

/** The window with CONTEXT_MORE more verses on one side, as far as the book goes; the same window when there is none. */
export function growContext(book: ContextBook, window: ContextWindow, side: "before" | "after"): ContextWindow {
  const { first, last } = bookBounds(book);
  return side === "before" ? { from: Math.max(first, window.from - CONTEXT_MORE), to: window.to } : { from: window.from, to: Math.min(last, window.to + CONTEXT_MORE) };
}

/** The chapters (from 1) a window touches, in order. */
export function contextChapters(book: ContextBook, window: ContextWindow): number[] {
  const a = locateInBook(book, window.from).chapter;
  const b = locateInBook(book, window.to).chapter;
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

/**
 * The verses of a window, chapter by chapter, with their texts. `texts` maps a chapter to its verses' texts in order;
 * a chapter that is missing, short or holds something that is not text throws: a context with a hole is not shown.
 */
export function contextBlocks(book: ContextBook, window: ContextWindow, texts: ReadonlyMap<number, readonly string[]>): ContextBlock[] {
  const blocks: ContextBlock[] = [];
  for (let gv = window.from; gv <= window.to; gv++) {
    const { chapter, verse } = locateInBook(book, gv);
    const text = texts.get(chapter)?.[verse - 1];
    if (typeof text !== "string" || !text.trim()) throw new Error(`missing text of chapter ${chapter}, verse ${verse}`);
    const last = blocks[blocks.length - 1];
    if (last?.chapter === chapter) last.verses.push({ gv, chapter, verse, text });
    else blocks.push({ chapter, verses: [{ gv, chapter, verse, text }] });
  }
  return blocks;
}

/** The verse right before and right after a chosen one, inside the book: what the verse's panel shows at a glance. */
export function neighbours(book: ContextBook, gv: number): { before: { chapter: number; verse: number } | null; after: { chapter: number; verse: number } | null } {
  if (!inside(book, gv)) throw new RangeError(`verse ${gv} is not in the book`);
  const { first, last } = bookBounds(book);
  return { before: gv > first ? locateInBook(book, gv - 1) : null, after: gv < last ? locateInBook(book, gv + 1) : null };
}
