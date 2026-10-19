import { describe, expect, it } from "vitest";
import { ABBREVIATIONS } from "../src/lib/canon/aliases";
import { createReferenceParser, formatRef, refPath } from "../src/lib/canon/reference";
import { bookKeyAccented } from "../src/lib/canon/text";
import { books } from "./generated";

const parse = createReferenceParser(books());
const show = (input: string) => {
  const r = parse(input);
  return r.ok ? formatRef(r.ref) : `!${r.error}`;
};

describe("reference parser: HANDOFF §6 cases", () => {
  it.each([
    ["Is 9:6", "Isaías 9:6"],
    ["isaías 9 6", "Isaías 9:6"],
    ["Mq 5,2", "Miqueias 5:2"],
    ["1 Co 13", "1 Coríntios 13"],
  ])("%s -> %s", (input, out) => expect(show(input)).toBe(out));
});

describe("reference parser: forms people type", () => {
  it.each([
    ["Is9:6", "Isaías 9:6"],
    ["is 9.6", "Isaías 9:6"],
    ["Is. 9:6", "Isaías 9:6"],
    ["ISAIAS 9:6", "Isaías 9:6"],
    ["  isaias   9 : 6  ", "Isaías 9:6"],
    ["Isaías capítulo 9 versículo 6", "Isaías 9:6"],
    ["1co13", "1 Coríntios 13"],
    ["1Co 13:4-7", "1 Coríntios 13:4–7"],
    ["1 Co 13:4–7", "1 Coríntios 13:4–7"],
    ["I Coríntios 13:4", "1 Coríntios 13:4"],
    ["1ª Coríntios 13", "1 Coríntios 13"],
    ["1a corintios 13", "1 Coríntios 13"],
    ["Primeira Coríntios 13", "1 Coríntios 13"],
    ["II Samuel 7:12", "2 Samuel 7:12"],
    ["3 João 4", "3 João 1:4"],
    ["Jd 3", "Judas 1:3"],
    ["Jd 1", "Judas 1"],
    ["Ob 21", "Obadias 1:21"],
    ["Fm 1:6", "Filemom 1:6"],
    ["Sl 23", "Salmos 23"],
    ["Sl 119:105", "Salmos 119:105"],
    ["salmo 23:1-6", "Salmos 23:1–6"],
    ["Gn 1:1", "Gênesis 1:1"],
    ["genesis 1", "Gênesis 1"],
    ["Êx 20", "Êxodo 20"],
    ["ex 20", "Êxodo 20"],
    ["Ct 2:1", "Cânticos 2:1"],
    ["Cântico dos Cânticos 2:1", "Cânticos 2:1"],
    ["cantares 2", "Cânticos 2"],
    ["Ap 22:21", "Apocalipse 22:21"],
    ["Mt 1:23", "Mateus 1:23"],
    ["Lc 2:11", "Lucas 2:11"],
    ["Isa.9.6", "Isaías 9:6"],
    ["John 3:16", "João 3:16"],
    ["ezeq 34:23", "Ezequiel 34:23"],
  ])("%s -> %s", (input, out) => expect(show(input)).toBe(out));
});

describe("reference parser: Jó vs João", () => {
  it.each([
    ["Jo 3:16", "João 3:16"],
    ["jo 3 16", "João 3:16"],
    ["Jó 3", "Jó 3"],
    ["jó 38:4", "Jó 38:4"],
    ["jo 38", "Jó 38"], // João has 21 chapters, so only Jó fits
    ["Job 1:1", "Jó 1:1"],
    ["joao 21:25", "João 21:25"],
    ["1 Jo 4:8", "1 João 4:8"],
  ])("%s -> %s", (input, out) => expect(show(input)).toBe(out));
});

describe("reference parser: rejects", () => {
  it.each([
    ["", "!empty"],
    ["   ", "!empty"],
    ["9:6", "!format"],
    ["Is", "!format"],
    ["Is 9:6-10:2", "!format"],
    ["Xyz 1", "!book"],
    ["Is 67", "!chapter"],
    ["Is 9:22", "!verse"],
    ["Is 9:6-3", "!verse"],
    ["3 Jo 15", "!verse"], // 3 João has 14 verses in the KJV grid (NBV has 15)
    ["Sl 0", "!chapter"],
    ["fil 2", "!ambiguous"], // Filipenses 2 or Filemom 1:2
  ])("%s -> %s", (input, out) => expect(show(input)).toBe(out));

  it("lists the candidates of an ambiguous prefix", () => {
    const r = parse("fil 2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.candidates?.map((b) => b.name)).toEqual(["Filipenses", "Filemom"]);
  });
});

describe("paths", () => {
  it("builds the URL of a verse and of a chapter", () => {
    const r1 = parse("Is 9:6");
    const r2 = parse("1 Co 13");
    expect(r1.ok && refPath(r1.ref)).toBe("/isaias/9/6");
    expect(r2.ok && refPath(r2.ref)).toBe("/1-corintios/13");
  });
});

describe("books table", () => {
  const b = books();
  it("has unique ASCII slugs", () => {
    const slugs = b.map((x) => x.slug);
    expect(new Set(slugs).size).toBe(66);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("has an abbreviation list for every book, with no accent-sensitive duplicates", () => {
    expect(Object.keys(ABBREVIATIONS).sort()).toEqual(b.map((x) => x.osis).sort());
    const seen = new Map<string, string>();
    for (const [osis, list] of Object.entries(ABBREVIATIONS)) {
      for (const a of list) {
        const k = bookKeyAccented(a);
        expect(seen.get(k) ?? osis, `${a} used by ${seen.get(k)} and ${osis}`).toBe(osis);
        seen.set(k, osis);
      }
    }
  });

  it("parses every name, OSIS id and abbreviation back to its own book", () => {
    for (const book of b) {
      for (const label of [book.name, book.osis, book.abbr, ...book.aliases]) {
        const r = parse(`${label} 1`);
        expect(r.ok && r.ref.book.osis, label).toBe(book.osis);
      }
    }
  });
});
