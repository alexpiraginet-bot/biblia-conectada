// Loose addresses (src/lib/canon/loose.ts): what people paste or type in the address bar reaches the right page, and
// nothing that is not a reference is redirected.
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
  ])("%s stays a 404", (from) => expect(path(from)).toBeNull());

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
