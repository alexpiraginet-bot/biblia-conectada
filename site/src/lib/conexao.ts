// The /conexao/[a]/[b] URL: two passages side by side. Each side is "<book slug>-<chapter>" (a chapter) or
// "<book slug>-<chapter>-<verse>" (a verse): /conexao/genesis-1-1/joao-1-1, /conexao/isaias-9/lucas-2.
// The pair is written in canonical order (earlier book, chapter, verse first); the reversed URL redirects to it.
// No book slug ends in digits (tests/conexao.test.ts), so the trailing numbers always split off cleanly.
// Pure functions with no data imports, so client code (cards, games) can build the same links.

export type Side = {
  /** book index 0–65 (canonical order) */
  book: number;
  slug: string;
  chapter: number;
  /** absent for a whole chapter */
  verse?: number;
};

export function sideSegment(s: Pick<Side, "slug" | "chapter" | "verse">): string {
  return s.verse ? `${s.slug}-${s.chapter}-${s.verse}` : `${s.slug}-${s.chapter}`;
}

/** Splits a segment into slug, chapter and optional verse. Syntax only: the caller checks the book and the numbers. */
export function parseSide(segment: string): Pick<Side, "slug" | "chapter" | "verse"> | null {
  const m = /^([a-z0-9][a-z0-9-]*?[a-z])-([1-9]\d{0,2})(?:-([1-9]\d{0,2}))?$/.exec(segment);
  if (!m) return null;
  return m[3] ? { slug: m[1], chapter: Number(m[2]), verse: Number(m[3]) } : { slug: m[1], chapter: Number(m[2]) };
}

/** Canonical order; a whole chapter sorts before its own verses. */
export function compareSides(a: Side, b: Side): number {
  return a.book - b.book || a.chapter - b.chapter || (a.verse ?? 0) - (b.verse ?? 0);
}

/** The canonical /conexao path for a pair, whatever order the sides come in. */
export function conexaoPath(a: Side, b: Side): string {
  const [x, y] = compareSides(a, b) <= 0 ? [a, b] : [b, a];
  return `/conexao/${sideSegment(x)}/${sideSegment(y)}`;
}
