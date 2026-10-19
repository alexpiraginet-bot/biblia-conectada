// Short URLs: /is/9/6 -> /isaias/9/6, /1co/13 -> /1-corintios/13, /john/3/16 -> /joao/3/16. Built from the same
// abbreviations the reference parser accepts. A short form that two books share once accents are dropped ("jo" is Jó
// and João) or that is already a page is left out, so a redirect never guesses.
import { ABBREVIATIONS } from "./aliases";
import { slugify } from "./text";
import type { Book } from "./types";

export const RESERVED = ["ler", "sobre", "arcos", "dados", "sky", "data", "_next", "api", "icon.svg"];

export function abbreviationRedirects(books: readonly Pick<Book, "osis" | "name" | "slug">[]) {
  const owners = new Map<string, Set<string>>();
  for (const b of books) {
    for (const label of [b.osis, ...(ABBREVIATIONS[b.osis] ?? [])]) {
      const s = slugify(label);
      if (!owners.has(s)) owners.set(s, new Set());
      owners.get(s)!.add(b.slug);
    }
  }
  const pages = new Set([...books.map((b) => b.slug), ...RESERVED]);
  return [...owners]
    .filter(([s, slugs]) => slugs.size === 1 && !pages.has(s) && s !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([s, slugs]) => ({ source: `/${s}/:rest*`, destination: `/${[...slugs][0]}/:rest*`, permanent: false }));
}
