// Parser for Portuguese Bible references: "Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13", "I Coríntios 13:4-7", "Jd 3".
// Books, chapter counts and verse counts come from the generated books.json; nothing numeric is hard-coded here.
import { ABBREVIATIONS, PREFERRED } from "./aliases";
import { bookKey, bookKeyAccented } from "./text";
import type { Book, Ref } from "./types";

export type ParseError = "empty" | "format" | "book" | "ambiguous" | "chapter" | "verse";
export type ParseResult = { ok: true; ref: Ref } | { ok: false; error: ParseError; candidates?: Book[] };

type Numbers = { chapter: number; verse?: number; verseEnd?: number };

const ORDINAL_WORDS: Record<string, string> = {
  primeira: "1", primeiro: "1", segunda: "2", segundo: "2", terceira: "3", terceiro: "3",
};
const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3" };

function normalizeInput(raw: string): string {
  let s = raw.normalize("NFC").trim().replace(/[‐-―−]/g, "-").replace(/\s+/g, " ");
  // "capítulo 9 versículo 6" -> "9 6"
  s = s.replace(/\b(?:cap[ií]tulos?|cap\.|vers[ií]culos?|vers\.|vv?\.)\s*/giu, " ").trim();
  // leading ordinals: "1ª", "1º", "1°", "1a ", "1o ", "primeira ", "II "
  s = s.replace(/^([123])\s*[ªº°]\s*/u, "$1 ");
  s = s.replace(/^([123])[ao]\s+/iu, "$1 ");
  s = s.replace(/^(\p{L}+)\s+/u, (m, w: string) => {
    const lw = w.toLowerCase();
    return ORDINAL_WORDS[lw] ? `${ORDINAL_WORDS[lw]} ` : ROMAN[lw] ? `${ROMAN[lw]} ` : m;
  });
  return s;
}

const PATTERN =
  /^([123])?\s*(\p{L}[\p{L}.\s]*?)\s*\.?\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?\s*$/u;

/** Fits the numbers to a book: single-chapter books read "Jd 3" as 1:3. Returns null when the reference does not exist. */
function fit(book: Book, n: Numbers): { ref: Ref } | { error: "chapter" | "verse" } {
  const { verseEnd } = n;
  let { chapter, verse } = n;
  if (book.verses.length === 1 && verse === undefined && chapter > 1) {
    verse = chapter;
    chapter = 1;
  }
  if (chapter < 1 || chapter > book.verses.length) return { error: "chapter" };
  const max = book.verses[chapter - 1];
  if (verse !== undefined && (verse < 1 || verse > max)) return { error: "verse" };
  if (verseEnd !== undefined && (verse === undefined || verseEnd < verse || verseEnd > max)) return { error: "verse" };
  const ref: Ref = { book, chapter };
  if (verse !== undefined) ref.verse = verse;
  if (verseEnd !== undefined && verseEnd !== verse) ref.verseEnd = verseEnd;
  return { ref };
}

export function createReferenceParser(books: readonly Book[]) {
  const accented = new Map<string, Book[]>();
  const loose = new Map<string, Book[]>();
  const push = (map: Map<string, Book[]>, key: string, book: Book) => {
    const list = map.get(key) ?? [];
    if (!list.includes(book)) list.push(book);
    map.set(key, list);
  };
  for (const book of books) {
    const abbreviations = ABBREVIATIONS[book.osis];
    if (!abbreviations) throw new Error(`no abbreviations for ${book.osis}`);
    for (const name of [book.name, book.osis, ...abbreviations]) {
      push(accented, bookKeyAccented(name), book);
      push(loose, bookKey(name), book);
    }
  }
  const preferred = (list: Book[]) => list.find((b) => PREFERRED.includes(b.osis));

  function resolve(key: string, n: Numbers): ParseResult {
    const looseKey = bookKey(key);
    const tiers: Book[][] = [
      accented.get(bookKeyAccented(key)) ?? [],
      loose.get(looseKey) ?? [],
      looseKey.replace(/^\d/, "").length >= 2 ? books.filter((b) => bookKey(b.name).startsWith(looseKey)) : [],
    ];
    let firstError: ParseResult | null = null;
    for (const tier of tiers) {
      if (tier.length === 0) continue;
      const fits = tier.map((book) => fit(book, n));
      const valid = fits.flatMap((f) => ("ref" in f ? [f.ref] : []));
      if (valid.length === 1) return { ok: true, ref: valid[0] };
      if (valid.length > 1) {
        const pick = preferred(valid.map((r) => r.book));
        const ref = pick && valid.find((r) => r.book === pick);
        return ref ? { ok: true, ref } : { ok: false, error: "ambiguous", candidates: valid.map((r) => r.book) };
      }
      const f = fits[0];
      if (!firstError && "error" in f) firstError = { ok: false, error: f.error, candidates: tier };
    }
    return firstError ?? { ok: false, error: "book" };
  }

  return function parseReference(input: string): ParseResult {
    const s = normalizeInput(input);
    if (!s) return { ok: false, error: "empty" };
    const m = PATTERN.exec(s);
    if (!m) return { ok: false, error: "format" };
    const [, num, bookPart, ch, v, v2] = m;
    const n: Numbers = { chapter: Number(ch) };
    if (v !== undefined) n.verse = Number(v);
    if (v2 !== undefined) n.verseEnd = Number(v2);
    return resolve(`${num ?? ""}${bookPart}`, n);
  };
}

/** "Isaías 9:6", "1 Coríntios 13", "Salmos 23:1–6" */
export function formatRef(ref: Ref): string {
  let s = `${ref.book.name} ${ref.chapter}`;
  if (ref.verse !== undefined) s += `:${ref.verse}`;
  if (ref.verseEnd !== undefined) s += `–${ref.verseEnd}`;
  return s;
}

/** "/isaias/9/6" (ranges point at their first verse) */
export function refPath(ref: Ref): string {
  return `/${ref.book.slug}/${ref.chapter}${ref.verse !== undefined ? `/${ref.verse}` : ""}`;
}
