// The reading pages compute a few things at render time from the generated book files; they must agree with what the
// pipeline computed for the same chapters (chapter-links.json, chapter-pairs.json).
import { describe, expect, it } from "vitest";
import { arcStrength, arcTone } from "../src/lib/arc-style";
import { chapterPairs, chapterPartners, chapterVerses, grid, linkedChapters } from "../src/lib/reading";
import { books } from "./generated";

describe("chapter partners (arcs of a chapter page)", () => {
  it("rank the same chapters as chapter-links.json, and add up to chapter-pairs.json", async () => {
    let checked = 0;
    for (const book of books()) {
      for (let c = 1; c <= book.verses.length; c++) {
        const partners = await chapterPartners(book, c);
        const top = linkedChapters(book, c);
        const head = partners.slice(0, top.length).map((p) => [p.ci, p.pairs]);
        expect(head, `${book.osis} ${c}`).toEqual(top.map((t) => [t.ref.ci, t.pairs]));
        if (top.length < partners.length) expect(partners[top.length].pairs, `${book.osis} ${c} cut`).toBeLessThan(top[top.length - 1].pairs);
        // pairs inside the chapter appear once from each end
        const here = book.firstChapter + c - 1;
        let inside = 0;
        for (const v of await chapterVerses(book, c)) {
          for (const [gv] of v.links) {
            const loc = grid.locate(gv);
            if (loc.book.firstChapter + loc.chapter - 1 === here) inside++;
          }
        }
        expect(inside % 2).toBe(0);
        expect(partners.reduce((s, p) => s + p.pairs, 0) + inside / 2, `${book.osis} ${c} total`).toBe(chapterPairs(book, c));
        checked++;
      }
    }
    expect(checked).toBe(grid.chapterCount);
  });
});

describe("arc style (video 1)", () => {
  it("follows film.py at the palette stops", () => {
    expect(arcTone(0)).toBe("#2980ff"); // [.16, .50, 1]
    expect(arcTone(1)).toBe("#ffd15c"); // [1, .82, .36]
    expect(arcTone(Math.pow(0.62, 1 / 0.55))).toBe("#ff2966"); // t = .62 -> [1, .16, .40]
  });

  it("weighs votes as arcs.py does", () => {
    expect(arcStrength(-5)).toBe(0);
    expect(arcStrength(0)).toBe(0);
    expect(arcStrength(150)).toBe(1);
    expect(arcStrength(1000)).toBe(1);
    expect(arcStrength(12)).toBeCloseTo(Math.log1p(12) / Math.log1p(150), 12);
  });
});
