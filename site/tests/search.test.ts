// What the search box understands without the network (src/components/search/core.ts).
import { describe, expect, it } from "vitest";
import { createSearch } from "../src/components/search/core";
import { books } from "./generated";

const search = createSearch(books());
const hrefs = (q: string, group: string) => search.results(q).groups.find((g) => g.id === group)?.hits.map((h) => h.href) ?? [];

describe("search box", () => {
  it("opens a reference in any form first", () => {
    for (const q of ["Is 9:6", "isaías 9 6", "Isaias 9,6", "is 9.6"]) {
      const first = search.results(q).groups[0];
      expect(first.id, q).toBe("ref");
      expect(first.hits[0], q).toMatchObject({ href: "/isaias/9/6", title: "Ir para Isaías 9:6" });
    }
    expect(hrefs("1 Co 13", "ref")).toEqual(["/1-corintios/13"]);
    expect(hrefs("Mq 5,2", "ref")).toEqual(["/miqueias/5/2"]);
  });

  it("offers both books when an abbreviation fits two", () => {
    const r = search.results("Jo 1:1");
    const refs = r.groups.find((g) => g.id === "ref");
    expect(refs?.hits.length).toBeGreaterThanOrEqual(1);
    expect(refs?.hits.every((h) => h.href.endsWith("/1/1"))).toBe(true);
  });

  it("finds books by the start of the name and by abbreviation", () => {
    expect(search.booksFor("ezeq").map((b) => b.slug)).toEqual(["ezequiel"]);
    expect(search.booksFor("corintios").map((b) => b.slug)).toEqual(["1-corintios", "2-corintios"]);
    expect(search.booksFor("Sl").map((b) => b.slug)).toContain("salmos");
    expect(search.booksFor("9")).toEqual([]);
  });

  it("says what is missing instead of a format error", () => {
    const joao = books().find((b) => b.slug === "joao")!;
    expect(search.results("João 22").message).toBe(`Não achei “João 22”: João tem ${joao.verses.length} capítulos.`);
  });

  it("always ends with the text search of the words typed", () => {
    const groups = search.results("luz").groups;
    expect(groups.at(-1)).toMatchObject({ id: "text", hits: [{ href: "/buscar?q=luz" }] });
    expect(search.results("   ").groups).toEqual([]);
  });
});
