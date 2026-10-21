import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { books, verseText } from "../src/lib/data";
import { PONTE_PRACTICE, pontePractice } from "../src/lib/community/ponte-tutorial";

describe("Ponte practice route", () => {
  it("teaches real cross-reference hops, with excerpts from the reader's text", async () => {
    const example = await pontePractice();
    for (const [index, passage] of PONTE_PRACTICE.entries()) {
      const text = await verseText(passage.slug, passage.chapter, passage.verse);
      expect(text.startsWith(example[index].excerpt.replace(/…$/, ""))).toBe(true);
      const next = PONTE_PRACTICE[index + 1];
      if (!next) continue;
      const book = books.find((entry) => entry.slug === next.slug)!;
      const gv = book.firstVerse + book.verses.slice(0, next.chapter - 1).reduce((a, b) => a + b, 0) + next.verse - 1;
      const links = JSON.parse(readFileSync(join(process.cwd(), "public/data/verse-links", passage.slug, `${passage.chapter}.json`), "utf8")) as number[][];
      expect(links[passage.verse - 1].filter((_, offset) => offset % 2 === 0)).toContain(gv);
    }
  });
});
