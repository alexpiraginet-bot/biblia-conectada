// What the search box answers without the network: a reference in any form ("Is 9:6", "isaías 9 6", "Mq 5,2",
// "1 Co 13"), a book by the start of its name ("ezeq") or by its abbreviation ("Sl"), and the themes of /tema. The words
// of the text are searched in the index (text-index.ts) and their group goes between the books and the themes. Pure
// functions, tested in tests/search.test.ts.
import type { IconName } from "@/components/icons";
import { createReferenceParser, formatRef, refPath } from "@/lib/canon/reference";
import { bookKey, formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { tokenize, wordKey } from "@/lib/words";
import { parseTextQuery, QUOTE, type TextQuery } from "./text-index";

export type Hit = { href: string; icon: IconName; title: string; hint?: string };
export type Group = { id: "ref" | "books" | "themes"; label: string; hits: Hit[] };
export type Scope = "tudo" | "texto" | "livros" | "temas";
/** One of the themes the /tema pages publish (written by scripts/data/search-index.ts) */
export type SearchTheme = { slug: string; label: string; key: string; topic: string; passages: number };
export type Results = {
  /** reference and books first, themes last; the text group goes between them */
  groups: Group[];
  /** the words to look up in the text, or null (no letters, or a reference) */
  text: TextQuery | null;
  /** a reference that does not exist ("João 22") */
  message?: string;
};

/** Books shown in "Tudo"; "Livros" shows them all. */
export const MAX_BOOKS = 6;
const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;
export const capital = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);

/** The query as the sentences quote it: “luz”, or the phrase as typed with typographic quotes (“grande luz”). */
export function quoted(query: string): string {
  const q = query.trim().replace(/"([^"]*)"?/g, "“$1”");
  return QUOTE.test(q) ? q : `“${q}”`;
}

/** The words and phrases of a query as typed, for a sentence: “luz” e “trevas”; a frase “grande luz”. */
export function describe(query: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  query.split(QUOTE).forEach((part, i) => {
    const words = tokenize(part);
    const phrase = i % 2 === 1 && words.length > 1;
    for (const w of phrase ? [words.join(" ")] : words) {
      const k = wordKey(w);
      if (seen.has(k)) continue;
      seen.add(k);
      parts.push(phrase ? `a frase “${w}”` : `“${w}”`);
    }
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

/** The sentence when nothing matches (design §6: what was searched and the next step). */
export const emptyText = (query: string) =>
  `Não achei ${quoted(query)} no texto da Bíblia Livre. Tente outra palavra ou uma referência como Is 9:6.`;

export function linksLabel(n: number): string {
  return n === 0 ? "nenhuma ligação" : plural(n, "ligação", "ligações");
}

export function createSearch(books: readonly Book[], themes: readonly SearchTheme[] = []) {
  const parse = createReferenceParser(books);
  const keys = books.map((b) => ({
    book: b,
    name: bookKey(b.name),
    short: [b.abbr, b.osis, ...b.aliases].map(bookKey),
  }));
  const themeKeys = themes.map((t) => ({ theme: t, keys: [t.key, ...tokenize(t.topic).map(wordKey)] }));

  /** Books whose name starts with the query ("ezeq", "1 cor"; "corintios" reaches 1 and 2 Coríntios) or whose
   *  abbreviation it is ("Sl", "1 Co") */
  function booksFor(query: string, max = MAX_BOOKS): Book[] {
    const k = bookKey(query);
    if (!/\p{L}/u.test(k)) return [];
    return keys
      .filter((x) => x.name.startsWith(k) || x.name.replace(/^\d/, "").startsWith(k) || x.short.includes(k))
      .slice(0, max)
      .map((x) => x.book);
  }

  /** Themes named by a word of the query (in Portuguese, or the source's English topic: "light" finds "luz"); the
   *  word still being typed also matches the start of a name ("lu": lua, luz). Whole-name matches first. */
  function themesFor(query: string): SearchTheme[] {
    const words = tokenize(query).map(wordKey);
    if (!words.length) return [];
    const typing = /\p{L}$/u.test(query) ? words[words.length - 1] : "";
    const exact = themeKeys.filter((t) => t.keys.some((k) => words.includes(k)));
    const start = typing.length >= 2 ? themeKeys.filter((t) => !exact.includes(t) && t.keys.some((k) => k.startsWith(typing))) : [];
    return [...exact, ...start].map((t) => t.theme);
  }

  function results(query: string, scope: Scope = "tudo"): Results {
    const q = query.trim();
    if (!q) return { groups: [], text: null };
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
    // a query read as a reference (even one that does not exist) is not looked up as words: "Is 9:6" is not "is"
    const asReference = r.ok || r.error === "ambiguous" || r.error === "chapter" || r.error === "verse";
    const found = booksFor(q, scope === "livros" ? books.length : MAX_BOOKS).filter((b) => !(r.ok && r.ref.book === b));
    if (found.length) {
      groups.push({
        id: "books",
        label: "Livros",
        hits: found.map((b) => ({ href: `/${b.slug}`, icon: "book", title: b.name, hint: plural(b.verses.length, "capítulo", "capítulos") })),
      });
    }
    // the raw query: a trailing space means the last word is finished, so it no longer matches the start of a name
    const themed = asReference ? [] : themesFor(query);
    if (themed.length) {
      groups.push({
        id: "themes",
        label: "Temas",
        hits: themed.map((t) => ({ href: `/tema/${t.slug}`, icon: "explore", title: capital(t.label), hint: plural(t.passages, "passagem", "passagens") })),
      });
    }
    // the reference answers in every scope; the text query does not depend on the scope either, so the "Texto" chip
    // shows its count everywhere
    const shown = groups.filter((g) => scope === "tudo" || g.id === "ref" || (scope === "livros" && g.id === "books") || (scope === "temas" && g.id === "themes"));
    return { groups: shown, text: asReference ? null : parseTextQuery(q), message };
  }

  return { results, booksFor, themesFor, themes, books };
}
