// Loose addresses: a reference typed or pasted into the address bar, or a link that picked up the punctuation after it
// in a message ("/Isaías/9/6", "/joão 3:16", "/isaias/9/6)", "/1-co-13", "/judas/3"), points at its canonical page.
// The reference parser decides: only a reference that exists resolves, and the target is always a reading path built
// by refPath, so a loose address can never send anyone off the site or to a missing page. Anything else stays a 404.
import { RESERVED } from "./redirects";
import { createReferenceParser, refPath } from "./reference";
import type { Book } from "./types";

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
  const parse = createReferenceParser(books);
  /** The canonical path for the segments of a request that matched no page, or null. */
  return function loosePath(segments: readonly string[]): string | null {
    const parts = segments.map((s) => trim(decode(s).normalize("NFC"))).filter(Boolean);
    if (parts.length === 0 || parts.length > 3) return null;
    const [head, ...numbers] = parts;
    // a page that does not exist yet keeps its 404 (RESERVED lists the planned ones)
    if ((RESERVED as readonly string[]).includes(head.toLowerCase())) return null;
    // "1-corintios" -> "1 corintios"; "isaias-9-6" (the /conexao segment form) -> "isaias 9 6"
    const name = head.replace(/-/g, " ");
    const text = numbers.length ? `${name} ${numbers[0]}${numbers[1] !== undefined ? `:${numbers[1]}` : ""}` : name;
    const r = parse(text);
    if (r.ok) return refPath(r.ref);
    if (numbers.length > 0) return null;
    // a book on its own ("/Isaías", "/Gn"): any chapter that exists names the book
    const b = parse(`${name} 1`);
    return b.ok ? `/${b.ref.book.slug}` : null;
  };
}
