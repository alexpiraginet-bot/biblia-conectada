// What the search box understands, without the network: a reference in any form ("Is 9:6", "isaías 9 6", "Mq 5,2",
// "1 Co 13") and a book by the start of its name ("ezeq") or by its abbreviation ("Sl"). Text results come from the
// word index (/buscar). Pure functions, tested in tests/search.test.ts.
import type { IconName } from "@/components/icons";
import { createReferenceParser, formatRef, refPath } from "@/lib/canon/reference";
import { bookKey, formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";

export type Hit = { href: string; icon: IconName; title: string; hint?: string };
export type Group = { id: string; label: string; hits: Hit[] };
export type Results = { groups: Group[]; message?: string };

const MAX_BOOKS = 6;
const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

export function createSearch(books: readonly Book[]) {
  const parse = createReferenceParser(books);
  const keys = books.map((b) => ({
    book: b,
    name: bookKey(b.name),
    short: [b.abbr, b.osis, ...b.aliases].map(bookKey),
  }));

  /** Books whose name starts with the query ("ezeq", "1 cor"; "corintios" reaches 1 and 2 Coríntios) or whose
   *  abbreviation it is ("Sl", "1 Co") */
  function booksFor(query: string): Book[] {
    const k = bookKey(query);
    if (!/\p{L}/u.test(k)) return [];
    return keys
      .filter((x) => x.name.startsWith(k) || x.name.replace(/^\d/, "").startsWith(k) || x.short.includes(k))
      .slice(0, MAX_BOOKS)
      .map((x) => x.book);
  }

  function results(query: string): Results {
    const q = query.trim();
    if (!q) return { groups: [] };
    const groups: Group[] = [];
    let message: string | undefined;
    const r = parse(q);
    if (r.ok) {
      groups.push({
        id: "ref",
        label: "Referência",
        hits: [{ href: refPath(r.ref), icon: "book", title: `Ir para ${formatRef(r.ref)}`, hint: r.ref.verse ? "versículo" : "capítulo" }],
      });
    } else if (r.error === "ambiguous" && r.candidates) {
      // "Jo 1:1" read as Jó or João: the same numbers in each book where they exist
      const numbers = q.replace(/^\s*\d?\s*\D+/u, "");
      const hits = r.candidates.flatMap((b) => {
        const alt = parse(`${b.name} ${numbers}`);
        return alt.ok ? [{ href: refPath(alt.ref), icon: "book" as const, title: `Ir para ${formatRef(alt.ref)}` }] : [];
      });
      if (hits.length) groups.push({ id: "ref", label: "Mais de um livro serve", hits });
    } else if ((r.error === "chapter" || r.error === "verse") && r.candidates?.length === 1) {
      const b = r.candidates[0];
      message =
        r.error === "chapter"
          ? `Não achei “${q}”: ${b.name} tem ${plural(b.verses.length, "capítulo", "capítulos")}.`
          : `Não achei “${q}”: esse capítulo de ${b.name} não tem esse versículo.`;
    }
    const found = booksFor(q).filter((b) => !(r.ok && r.ref.book === b));
    if (found.length) {
      groups.push({
        id: "books",
        label: "Livros",
        hits: found.map((b) => ({ href: `/${b.slug}`, icon: "book", title: b.name, hint: plural(b.verses.length, "capítulo", "capítulos") })),
      });
    }
    groups.push({
      id: "text",
      label: "No texto",
      hits: [{ href: `/buscar?q=${encodeURIComponent(q)}`, icon: "text", title: `Buscar “${q}” no texto da Bíblia` }],
    });
    return { groups, message };
  }

  return { results, booksFor };
}
