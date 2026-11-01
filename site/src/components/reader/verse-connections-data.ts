import { BASE, verseFromPath } from "@/lib/community/books-client";
import { loadChapterText, loadVerseLinks } from "@/lib/community/fetchers";
import { longRef } from "@/lib/community/geometry";

export type ConnectedVerse = { path: string; label: string; text: string; votes: number };
export type VerseConnectionsData = { path: string; label: string; text: string; chapterPath: string; links: ConnectedVerse[] };

async function readVerse(gv: number) {
  const { book, chapter, verse } = BASE.locate(gv);
  const rows = await loadChapterText(book.slug, chapter);
  const text = Array.isArray(rows) ? rows[verse - 1] : undefined;
  if (typeof text !== "string" || !text.trim()) throw new Error("missing verse text");
  return { path: `/${book.slug}/${chapter}/${verse}`, label: longRef(BASE, gv), text };
}

/** Same canonical OpenBible partners and BLIVRE texts as the reader; never align another edition by verse number. */
export async function loadVerseConnections(path: string): Promise<VerseConnectionsData> {
  const origin = verseFromPath(`/${path}`);
  if (origin === null) throw new Error("invalid reference");
  const { book, chapter, verse } = BASE.locate(origin);
  const [source, rows] = await Promise.all([readVerse(origin), loadVerseLinks(book.slug, chapter)]);
  const flat: unknown = Array.isArray(rows) ? rows[verse - 1] : undefined;
  if (!Array.isArray(flat) || flat.length % 2 !== 0 || flat.length > (BASE.verseCount - 1) * 2) throw new Error("invalid connections");
  const seen = new Set<number>([origin]);
  const pairs: { gv: number; votes: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    const gv: unknown = flat[i], votes: unknown = flat[i + 1];
    if (typeof gv !== "number" || !Number.isInteger(gv) || gv < 0 || gv >= BASE.verseCount || seen.has(gv)
      || typeof votes !== "number" || !Number.isInteger(votes)) throw new Error("invalid connections");
    seen.add(gv);
    pairs.push({ gv, votes });
  }
  pairs.sort((a, b) => b.votes - a.votes || a.gv - b.gv);
  const links = await Promise.all(pairs.map(async ({ gv, votes }) => ({ ...await readVerse(gv), votes })));
  return { ...source, chapterPath: `/${book.slug}/${chapter}`, links };
}
