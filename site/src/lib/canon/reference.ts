// Parser for Portuguese Bible references: "Is 9:6", "isaías 9 6", "Mq 5,2", "1 Co 13", "I Coríntios 13:4-7", "Jd 3".
// Books, chapter counts and verse counts come from the generated books.json; nothing numeric is hard-coded here.
import { ABBREVIATIONS, PREFERRED } from "./aliases";
import { bookKey, bookKeyAccented } from "./text";
import type { Book, Ref } from "./types";

export type ParseError = "empty" | "format" | "book" | "ambiguous" | "chapter" | "verse";
export type ParseResult = { ok: true; ref: Ref } | { ok: false; error: ParseError; candidates?: Book[] };

type Numbers = { chapter: number; chapterEnd?: number; verse?: number; verseEnd?: number };

const ORDINAL_WORDS: Record<string, string> = {
  primeira: "1", primeiro: "1", segunda: "2", segundo: "2", terceira: "3", terceiro: "3",
};
const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3" };

function normalizeInput(raw: string): string {
  let s = raw.normalize("NFC").replace(/[‐-―−]/g, "-").replace(/\s+/g, " ").trim();
  // surrounding brackets and quotes, trailing sentence punctuation: "(Is 9:6)", "“Is 9:6”", "Is 9:6."
  s = s.replace(/^[\s([{"'“‘«]+/u, "").replace(/[\s)\]}"'”’».;:!?]+$/u, "");
  // "capítulo 9 versículo 6" -> "9 6"
  s = s.replace(/(^|[\s,])(?:cap[ií]tulos?|cap\.?|vers[ií]culos?|vers\.?)(?=[\s\d]|$)/giu, "$1 ");
  // "9 v 6", "9 vs. 6", "9v6" -> "9 6"
  s = s.replace(/(\d)\s*(?:vv?|vs)\.?\s*(?=\d)/giu, "$1 ");
  // leading ordinals: "1ª", "1.ª", "1º", "1°", "1a ", "1o ", "1. ", "primeira ", "II ", "II. "
  s = s.replace(/^([123])\s*\.?\s*[ªº°]\s*/u, "$1 ");
  s = s.replace(/^([123])[ao]\s+/iu, "$1 ");
  s = s.replace(/^([123])\.\s*(?=\p{L})/u, "$1 ");
  s = s.replace(/^(\p{L}+)\.?\s+/u, (m, w: string) => {
    const lw = w.toLowerCase();
    return ORDINAL_WORDS[lw] ? `${ORDINAL_WORDS[lw]} ` : ROMAN[lw] ? `${ROMAN[lw]} ` : m;
  });
  // "1 Carta de João", "Primeira Epístola aos Coríntios", "Evangelho de São João", "Livro de Jó"
  s = s.replace(
    /^([123] )?(?:o |a )?(?:livro|evangelho|carta|ep[ií]stola)\s+(?:de|do|da|dos|das|aos?|às?|segundo)\s+(?:s[aã]o\s+)?/iu,
    "$1",
  );
  // "Isaías, 9, 6" -> "Isaías 9, 6"
  s = s.replace(/(\p{L}\.?)\s*,\s*(?=\d)/u, "$1 ");
  // verse parts and lists keep the first verse or range: "9:6a" -> "9:6", "9:6,7" and "9:6-7; 11:1" -> "9:6" / "9:6-7"
  s = s.replace(/(\d)[abc](?=\s*(?:[-,;]|$))/giu, "$1");
  s = s.replace(/(\d{1,3}\s*[:.,]\s*\d{1,3}(?:\s*-\s*\d{1,3})?)\s*[,;].*$/u, "$1");
  return s.replace(/\s+/g, " ").trim();
}

// [ordinal] book chapter [ (sep verse [-verseEnd]) | (-chapterEnd) ]
const PATTERN =
  /^([123])?\s*(\p{L}[\p{L}.\s]*?)\s*\.?\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?|\s*-\s*(\d{1,3}))?\s*$/u;

type Fit = { ref: Ref } | { error: "chapter" | "verse" };

/** Fits the numbers to a book. Single-chapter books read "Jd 3" as 1:3 and "Jd 24-25" as 1:24–25. */
function fit(book: Book, n: Numbers): Fit {
  let { chapter, chapterEnd, verse, verseEnd } = n;
  if (book.verses.length === 1 && verse === undefined && (chapter > 1 || chapterEnd !== undefined)) {
    verse = chapter;
    verseEnd = chapterEnd;
    chapter = 1;
    chapterEnd = undefined;
  }
  if (chapter < 1 || chapter > book.verses.length) return { error: "chapter" };
  if (chapterEnd !== undefined && (chapterEnd < chapter || chapterEnd > book.verses.length)) return { error: "chapter" };
  const max = book.verses[chapter - 1];
  if (verse !== undefined && (verse < 1 || verse > max)) return { error: "verse" };
  if (verseEnd !== undefined && (verse === undefined || verseEnd < verse || verseEnd > max)) return { error: "verse" };
  const ref: Ref = { book, chapter };
  if (chapterEnd !== undefined && chapterEnd !== chapter) ref.chapterEnd = chapterEnd;
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
  const names = books.map((b) => ({ book: b, key: bookKey(b.name), bare: bookKey(b.name).replace(/^\d/, "") }));
  const preferred = (list: Book[]) => list.find((b) => PREFERRED.includes(b.osis));

  /** Picks among books that share a key: the one where the reference exists, else the most specific error. */
  function settle(list: Book[], n: Numbers): ParseResult {
    const fits = list.map((book) => fit(book, n));
    const valid = fits.flatMap((f) => ("ref" in f ? [f.ref] : []));
    if (valid.length === 1) return { ok: true, ref: valid[0] };
    if (valid.length > 1) {
      const pick = preferred(valid.map((r) => r.book));
      const ref = pick && valid.find((r) => r.book === pick);
      return ref ? { ok: true, ref } : { ok: false, error: "ambiguous", candidates: valid.map((r) => r.book) };
    }
    // a missing verse says more than a missing chapter: the book and chapter exist
    const error = fits.some((f) => "error" in f && f.error === "verse") ? "verse" : "chapter";
    return { ok: false, error, candidates: list };
  }

  function resolve(key: string, n: Numbers): ParseResult {
    const accentedKey = bookKeyAccented(key);
    const looseKey = bookKey(key);
    // 1. exact, accents kept ("Jó" is Job, "Jo" is John). An accent typed on purpose is final.
    const exact = accented.get(accentedKey);
    if (exact) {
      const r = settle(exact, n);
      if (r.ok || accentedKey !== looseKey) return r;
    }
    // 2. exact without accents ("jo" may be Jó or João). A name that matches never falls through to other books.
    const near = loose.get(looseKey);
    if (near) return settle(near, n);
    // 3. a name the input starts ("ezeq", "salmo", "fil"), three letters at least; "corintios" also reaches 1 and 2 Coríntios
    const letters = looseKey.replace(/^\d/, "");
    if (letters.length < 3) return { ok: false, error: "book" };
    let prefix = names.filter((x) => x.key.startsWith(looseKey)).map((x) => x.book);
    if (prefix.length === 0 && !/^\d/.test(looseKey)) prefix = names.filter((x) => x.bare.startsWith(looseKey)).map((x) => x.book);
    return prefix.length ? settle(prefix, n) : { ok: false, error: "book" };
  }

  return function parseReference(input: string): ParseResult {
    const s = normalizeInput(input);
    if (!s) return { ok: false, error: "empty" };
    const m = PATTERN.exec(s);
    if (!m) return { ok: false, error: "format" };
    const [, num, bookPart, ch, v, v2, ch2] = m;
    const n: Numbers = { chapter: Number(ch) };
    if (v !== undefined) n.verse = Number(v);
    if (v2 !== undefined) n.verseEnd = Number(v2);
    if (ch2 !== undefined) n.chapterEnd = Number(ch2);
    return resolve(`${num ?? ""}${bookPart}`, n);
  };
}

/** "Isaías 9:6", "1 Coríntios 13", "Salmos 23:1–6", "Gênesis 1–3" */
export function formatRef(ref: Ref): string {
  let s = `${ref.book.name} ${ref.chapter}`;
  if (ref.chapterEnd !== undefined) s += `–${ref.chapterEnd}`;
  if (ref.verse !== undefined) s += `:${ref.verse}`;
  if (ref.verseEnd !== undefined) s += `–${ref.verseEnd}`;
  return s;
}

/** "/isaias/9/6" (ranges point at their first verse or chapter) */
export function refPath(ref: Ref): string {
  return `/${ref.book.slug}/${ref.chapter}${ref.verse !== undefined ? `/${ref.verse}` : ""}`;
}
