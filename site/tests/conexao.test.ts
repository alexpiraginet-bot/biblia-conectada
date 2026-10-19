// The /conexao URL contract shared by the Explorar, reading, timeline and community pages (src/lib/conexao.ts).
import { describe, expect, it } from "vitest";
import { compareSides, conexaoPath, parseSide, sideSegment, type Side } from "../src/lib/conexao";
import { books } from "./generated";

const side = (slug: string, chapter: number, verse?: number): Side => {
  const b = books().find((x) => x.slug === slug);
  if (!b) throw new Error(slug);
  return verse ? { book: b.index, slug, chapter, verse } : { book: b.index, slug, chapter };
};

describe("conexao paths", () => {
  it("no book slug ends in digits, so a segment splits without ambiguity", () => {
    for (const b of books()) expect(b.slug, b.slug).not.toMatch(/\d$/);
  });

  it("round-trips every book's first and last verse and chapter", () => {
    for (const b of books()) {
      const last = b.verses.length;
      for (const s of [side(b.slug, 1), side(b.slug, 1, 1), side(b.slug, last), side(b.slug, last, b.verses[last - 1])]) {
        const { book: _book, ...plain } = s;
        void _book;
        expect(parseSide(sideSegment(s))).toEqual(plain);
      }
    }
  });

  it("writes the pair in canonical order", () => {
    const jo = side("joao", 1, 1);
    const gn = side("genesis", 1, 1);
    expect(conexaoPath(jo, gn)).toBe("/conexao/genesis-1-1/joao-1-1");
    expect(conexaoPath(gn, jo)).toBe("/conexao/genesis-1-1/joao-1-1");
    expect(conexaoPath(side("lucas", 2), side("isaias", 9))).toBe("/conexao/isaias-9/lucas-2");
    expect(conexaoPath(side("1-corintios", 13, 4), side("1-joao", 4, 8))).toBe("/conexao/1-corintios-13-4/1-joao-4-8");
    expect(compareSides(side("salmos", 119), side("salmos", 119, 1))).toBeLessThan(0);
  });

  it("rejects malformed segments", () => {
    for (const s of ["joao", "joao-0", "joao-1-0", "Joao-1", "joao-1-1-1", "-1", "joao-1a", "joao--1", "joao-1234"]) {
      expect(parseSide(s), s).toBeNull();
    }
  });
});
