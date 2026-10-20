// What the sculpture page selects and how it is written in the address: "#isaias/53/5" a verse, "#isaias/53" a
// chapter, "#caminho/genesis/3/15/apocalipse/12/9" the path between two verses, "#palavra/cordeiro" the verses of a
// word. Pure helpers (tests/sculpture.test.ts), plus the cached fetch of a chapter's BLIVRE text.
import { formatInt } from "@/lib/canon/text";
import { BASE, BOOKS } from "@/lib/community/books-client";
import { loadChapterText } from "@/lib/community/fetchers";
import type { ArcSet, ChapterIndex, Geometry, SkyMeta } from "../sky/model";

export type Sel =
  | { kind: "verse"; gv: number }
  | { kind: "chapter"; ci: number }
  | { kind: "path"; from: number; to: number }
  | { kind: "word"; q: string }
  | null;

/** the longest word query the address keeps */
export const WORD_MAX = 60;
/** Number of connected verses revealed at a time in the selection panels. */
export const PAGE = 20;
export type Filter = "todas" | "antigo" | "novo";
/** sky.json read into the axis geometry, with the testament of every verse */
export type Data = { meta: SkyMeta; geo: Geometry; nt: Uint8Array };
/** the arcs loaded so far (the 20,000 most voted first, then every pair) with their chapter index */
export type Loaded = { set: ArcSet; idx: ChapterIndex };

export function verseOf(book: { firstVerse: number; verses: number[] }, chapter: number, verse: number): number {
  let gv = book.firstVerse;
  for (let c = 0; c < chapter - 1; c++) gv += book.verses[c];
  return gv + verse - 1;
}

/** "isaias", "53", "5" -> the verse's global index, or null when the book, the chapter or the verse does not exist */
function verseAt(slug: string, chapter: string, verse: string): number | null {
  const book = BOOKS.find((b) => b.slug === slug);
  const c = Number(chapter), v = Number(verse);
  if (!book || c > book.verses.length || v > book.verses[c - 1]) return null;
  return verseOf(book, c, v);
}

/** "#isaias/53/5", "#isaias/53", "#caminho/…/…" or "#palavra/…" -> a selection; anything else -> null */
export function parseHash(hash: string): Sel {
  let raw = hash.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  raw = raw.replace(/^#/, "");
  const word = /^palavra\/([\s\S]+)$/.exec(raw);
  if (word) {
    const q = word[1].trim().replace(/\s+/g, " ");
    return q && q.length <= WORD_MAX ? { kind: "word", q } : null;
  }
  const n = "([1-9]\\d{0,2})";
  const path = new RegExp(`^caminho/([a-z0-9-]+)/${n}/${n}/([a-z0-9-]+)/${n}/${n}$`).exec(raw.toLowerCase());
  if (path) {
    const from = verseAt(path[1], path[2], path[3]);
    const to = verseAt(path[4], path[5], path[6]);
    if (from === null || to === null) return null;
    return from === to ? { kind: "verse", gv: from } : { kind: "path", from, to };
  }
  const m = /^([a-z0-9-]+)\/([1-9]\d{0,2})(?:\/([1-9]\d{0,2}))?$/.exec(raw.toLowerCase());
  if (!m) return null;
  const book = BOOKS.find((b) => b.slug === m[1]);
  const c = Number(m[2]);
  if (!book || c > book.verses.length) return null;
  if (!m[3]) return { kind: "chapter", ci: book.firstChapter + c - 1 };
  const gv = verseAt(m[1], m[2], m[3]);
  return gv === null ? null : { kind: "verse", gv };
}

export function chapterLabel(ci: number) {
  const book = BOOKS.findLast((b) => b.firstChapter <= ci)!;
  const chapter = ci - book.firstChapter + 1;
  return { book, chapter, label: `${book.name} ${chapter}`, path: `/${book.slug}/${chapter}` };
}

const versePart = (gv: number) => {
  const { book, chapter, verse } = BASE.locate(gv);
  return `${book.slug}/${chapter}/${verse}`;
};

export function hashOf(sel: Sel): string {
  if (!sel) return "";
  if (sel.kind === "verse") return `#${versePart(sel.gv)}`;
  if (sel.kind === "path") return `#caminho/${versePart(sel.from)}/${versePart(sel.to)}`;
  if (sel.kind === "word") return `#palavra/${encodeURIComponent(sel.q)}`;
  const c = chapterLabel(sel.ci);
  return `#${c.book.slug}/${c.chapter}`;
}

export const ligacoes = (n: number) => `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;
export const votos = (n: number) => `${formatInt(n)} ${n === 1 ? "voto" : "votos"}`;
export const versiculos = (n: number) => `${formatInt(n)} ${n === 1 ? "versículo" : "versículos"}`;

// ---------------------------------------------------------------- the address as an external store

const listeners = new Set<() => void>();
export function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  listeners.add(cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    listeners.delete(cb);
  };
}
export const readHash = () => window.location.hash;
/** Writes the selection into the address without a history entry (the trail on the page is the way back). */
export function writeHash(sel: Sel) {
  const h = hashOf(sel);
  window.history.replaceState(null, "", h || window.location.pathname + window.location.search);
  listeners.forEach((f) => f());
}

// ---------------------------------------------------------------- text

const texts = new Map<string, Promise<string[]>>();
function chapterText(gv: number): Promise<string[]> {
  const { book, chapter } = BASE.locate(gv);
  const key = `${book.slug}/${chapter}`;
  let p = texts.get(key);
  if (!p) {
    p = loadChapterText(book.slug, chapter);
    p.catch(() => texts.delete(key));
    texts.set(key, p);
  }
  return p;
}

/** The BLIVRE text of one verse (its chapter's file, fetched once per page). */
export async function verseText(gv: number): Promise<string> {
  const { verse } = BASE.locate(gv);
  return (await chapterText(gv))[verse - 1] ?? "";
}
