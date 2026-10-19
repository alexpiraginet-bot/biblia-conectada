// Loose addresses (src/lib/canon/loose.ts): what people paste or type in the address bar reaches the right page, a
// canonical link never changes book, and nothing that is not a reference to an existing passage is redirected.
import { describe, expect, it } from "vitest";
import { createLoosePathResolver } from "../src/lib/canon/loose";
import { RESERVED } from "../src/lib/canon/redirects";
import { books } from "./generated";

const loose = createLoosePathResolver(books());
const path = (p: string) => loose(p.split("/").filter(Boolean));

describe("loose addresses", () => {
  it.each([
    // accents and capitals, raw and percent-encoded as browsers send them
    ["/Isaías/9/6", "/isaias/9/6"],
    ["/isa%C3%ADas/9/6", "/isaias/9/6"],
    ["/ISAIAS/9", "/isaias/9"],
    ["/Isaías", "/isaias"],
    ["/jo%C3%A3o/3/16", "/joao/3/16"],
    // punctuation a message app glued to the link
    ["/isaias/9/6)", "/isaias/9/6"],
    ["/isaias/9/6.", "/isaias/9/6"],
    ["/isaias/9)", "/isaias/9"],
    ["/isaias/9/6%22", "/isaias/9/6"],
    ["/isaias%29", "/isaias"],
    // a whole reference in one segment
    ["/Is%209:6", "/isaias/9/6"],
    ["/jo%C3%A3o%203:16", "/joao/3/16"],
    ["/1-co-13", "/1-corintios/13"],
    ["/isaias-9-6", "/isaias/9/6"],
    ["/1co13", "/1-corintios/13"],
    // the verse in the chapter segment, abbreviations, single-chapter books
    ["/isaias/9:6", "/isaias/9/6"],
    ["/Mq/5/2", "/miqueias/5/2"],
    ["/judas/3", "/judas/1/3"],
    // "jo" is the slug of Jó, although "Jo" abbreviates João: the exact slug keeps its book; other spellings read as
    // the search box reads them
    ["/jo/3/16)", "/jo/3/16"],
    ["/jo/1/1.", "/jo/1/1"],
    ["/jo)", "/jo"],
    ["/jo-1-1", "/jo/1/1"],
    ["/Jo/1/1", "/joao/1/1"],
    ["/J%C3%B3/1/1", "/jo/1/1"],
    ["/jo-3", "/jo/3"],
    ["/jo%C3%A3o/3/16", "/joao/3/16"],
    ["/Jo%C3%A3o%203:16", "/joao/3/16"],
    // partial names of four letters or more
    ["/salmo/23", "/salmos/23"],
    ["/ezeq/1", "/ezequiel/1"],
  ])("%s -> %s", (from, to) => expect(path(from)).toBe(to));

  it.each([
    "/genesis/51", // no such chapter
    "/genesis/1/99", // no such verse
    "/x",
    "/favicon.ico",
    "/robots.txt",
    "/apple-touch-icon.png",
    "/.well-known/security.txt",
    "/isaias/9/6/7",
    "/a/b/c/d",
    "/%E0%A4%A", // malformed percent-encoding
    "/isaias/capitulo",
    // a missing Jó verse or chapter is not João's (Jó 1 has 22 verses; João has 21 chapters, Jó 42)
    "/jo/1/23",
    "/jo/1/23)",
    "/jo/43",
    // everyday words are not partial book names ("mal" is still Malaquias: it is the OSIS id, like /mal/1 in next.config)
    "/mar",
    "/tia",
    "/amo",
    "/pro",
    // too long to be a reference: not parsed at all
    `/${")".repeat(5000)}x`,
    `/isaias/9/6${".".repeat(5000)}x`,
  ])("%s stays a 404", (from) => expect(path(from)).toBeNull());

  it("keeps the book of every canonical chapter and verse address, with punctuation or in the /conexao form", () => {
    for (const b of books()) {
      b.verses.forEach((n, i) => {
        const c = i + 1;
        expect(path(`/${b.slug}/${c})`), `${b.slug} ${c}`).toBe(`/${b.slug}/${c}`);
        for (const v of [1, n]) {
          const want = `/${b.slug}/${c}/${v}`;
          for (const p of [`/${b.slug}/${c}/${v})`, `/${b.slug}/${c}/${v}.`, `/${b.slug}-${c}-${v}`]) expect(path(p), p).toBe(want);
        }
      });
    }
  });

  it("never redirects a reserved segment, so a planned page keeps its 404 until it exists", () => {
    for (const r of RESERVED) expect(path(`/${r}`), r).toBeNull();
  });

  it("only ever returns a reading path of a book in the grid", () => {
    const slugs = new Set(books().map((b) => b.slug));
    for (const b of books()) {
      for (const p of [`/${b.name}`, `/${b.name}/1`, `/${b.name.toUpperCase()}/1/1`, `/${b.abbr}/1/1)`]) {
        const to = path(encodeURI(p));
        expect(to, p).not.toBeNull();
        expect(slugs.has(to!.split("/")[1]), `${p} -> ${to}`).toBe(true);
      }
    }
  });
});
