// Loose addresses: a reference typed or pasted into the address bar, or a link that picked up the punctuation after it
// in a message ("/Isaías/9/6", "/joão 3:16", "/isaias/9/6)", "/1-co-13", "/judas/3"), points at its canonical page.
// The reference parser decides: only a passage that exists resolves, and the target is always a reading path built by
// refPath, so a loose address can never send anyone off the site or to a missing page. Anything else stays a 404.
// A first segment that is exactly a book's slug always means that book ("jo" is Jó, although "Jo" abbreviates João), so
// a canonical link never changes book; a missing chapter or verse there is a 404, never another book's page. Any other
// spelling ("Jo", "João", "ISAIAS") is read as the search box reads it. Partial names need four letters ("salmo",
// "ezeq"), so everyday words such as "mar" or "tia" are not read as books.
import { parseSide } from "../conexao";
import { RESERVED } from "./redirects";
import { createReferenceParser, refPath } from "./reference";
import type { Book } from "./types";

/** Longer than any reference ("cantares-de-salomao-8-14" is 24 characters). Longer segments are not looked at, so the
 *  parser's regular expressions never run over a long, hostile address. */
const MAX_SEGMENT = 64;

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
/** brackets, quotes and sentence punctuation around a segment: "6)", "9.", "«isaias" */
const trim = (s: string) => s.replace(/^[\s([{"'“‘«]+/u, "").replace(/[\s)\]}"'”’».,;:!?]+$/u, "");

export function createLoosePathResolver(books: readonly Book[]) {
  const parse = createReferenceParser(books, { minPrefix: 4 });
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  /** The canonical path for the segments of a request that matched no page, or null. */
  return function loosePath(segments: readonly string[]): string | null {
    // percent-encoding at most triples a character
    if (segments.length === 0 || segments.length > 3 || segments.some((s) => s.length > 3 * MAX_SEGMENT)) return null;
    const parts = segments.map((s) => trim(decode(s).normalize("NFC"))).filter(Boolean);
    if (parts.length === 0 || parts.length > 3 || parts.some((p) => p.length > MAX_SEGMENT)) return null;
    const [head, ...rest] = parts;
    // a page that does not exist yet keeps its 404 (RESERVED lists the planned ones)
    if ((RESERVED as readonly string[]).includes(head.toLowerCase())) return null;
    // a book's own slug, alone or in the /conexao segment form ("jo-3-16", "isaias-9"); slugs are lowercase
    let book = bySlug.get(head);
    let numbers = rest;
    if (!book && rest.length === 0) {
      const side = parseSide(head);
      book = side ? bySlug.get(side.slug) : undefined;
      if (side && book) numbers = side.verse ? [String(side.chapter), String(side.verse)] : [String(side.chapter)];
    }
    // the book's full name pins the parser to it; otherwise "1-corintios" -> "1 corintios", "is-9-6" -> "is 9 6"
    const name = book ? book.name : head.replace(/-/g, " ");
    const same = (b: Book) => !book || b === book;
    const text = numbers.length ? `${name} ${numbers[0]}${numbers[1] !== undefined ? `:${numbers[1]}` : ""}` : name;
    const r = parse(text);
    if (r.ok) return same(r.ref.book) ? refPath(r.ref) : null;
    if (numbers.length > 0) return null;
    // a book on its own ("/Isaías", "/Gn"): any chapter that exists names the book
    const b = parse(`${name} 1`);
    return b.ok && same(b.ref.book) ? `/${b.ref.book.slug}` : null;
  };
}
