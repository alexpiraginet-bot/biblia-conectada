// The reading pages compute a few things at render time from the generated book files; they must agree with what the
// pipeline computed for the same chapters (chapter-links.json, chapter-pairs.json, the chapter graph's edges).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import { arcStrength, arcTone } from "../src/lib/arc-style";
import { bookPairs, chapterBestPairs, chapterNeighbours, chapterPairs, chapterPartners, chapterVerses, grid, linkedChapters } from "../src/lib/reading";
import { books } from "./generated";

/** pairs and summed votes of every chapter edge, from public/data/chapter-edges.bin (chapter-graph.json layout) */
function edgeTable() {
  type Arr = { name: string; offset: number };
  const meta = JSON.parse(readFileSync(join(OUT.publicData, "chapter-graph.json"), "utf8")) as { edges: { count: number; arrays: Arr[] } };
  const buf = readFileSync(join(OUT.publicData, "chapter-edges.bin"));
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const off = (n: string) => meta.edges.arrays.find((a) => a.name === n)!.offset;
  const table = new Map<number, { pairs: number; votes: number }>();
  for (let k = 0; k < meta.edges.count; k++) {
    const i = dv.getUint16(off("i") + 2 * k, true);
    const j = dv.getUint16(off("j") + 2 * k, true);
    table.set(i * 2048 + j, { pairs: dv.getUint32(off("pairs") + 4 * k, true), votes: dv.getInt32(off("votes") + 4 * k, true) });
  }
  return table;
}

describe("chapter partners (arcs, mini graph and list of a chapter page)", () => {
  it("rank the same chapters as chapter-links.json, add up to chapter-pairs.json and match the graph's summed votes", async () => {
    const edges = edgeTable();
    let checked = 0;
    let seen = 0;
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
        // summed votes per partner chapter (the "Mais ligados" criterion) are the pipeline's edge votes
        for (const p of partners) {
          const e = edges.get(Math.min(here, p.ci) * 2048 + Math.max(here, p.ci));
          expect(e, `${book.osis} ${c} -> ${p.ci}`).toEqual({ pairs: p.pairs, votes: p.votes });
          seen++;
        }
        checked++;
      }
    }
    expect(checked).toBe(grid.chapterCount);
    // every edge was seen from both of its chapters
    expect(seen).toBe(2 * edges.size);
  });

  it("are ranked for the panel by summed votes, then verse pairs, then canonical order (src/lib/chapter-rank.ts)", async () => {
    for (const book of books().filter((_, i) => i % 7 === 0)) {
      for (let c = 1; c <= book.verses.length; c += 5) {
        const ranked = await chapterNeighbours(book, c);
        for (let k = 1; k < ranked.length; k++) {
          const [p, q] = [ranked[k - 1], ranked[k]];
          const ok = p.votes > q.votes || (p.votes === q.votes && (p.pairs > q.pairs || (p.pairs === q.pairs && p.ci < q.ci)));
          expect(ok, `${book.osis} ${c} #${k}`).toBe(true);
        }
      }
    }
  });
});

describe("book links (/ler, the book pages)", () => {
  it("are the pairs of arcs.bin with a verse in the book: 66 books, each pair counted once per book it touches", async () => {
    const meta = JSON.parse(readFileSync(join(OUT.publicData, "arcs.json"), "utf8")) as { count: number };
    const buf = readFileSync(join(OUT.publicData, "arcs.bin"));
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const all = books();
    const bookOf = (gv: number) => grid.locate(gv).book.index;
    const want = new Array<number>(all.length).fill(0);
    for (let k = 0; k < meta.count; k++) {
      const a = bookOf(dv.getUint16(k * 2, true));
      const b = bookOf(dv.getUint16(meta.count * 2 + k * 2, true));
      want[a]++;
      if (b !== a) want[b]++;
    }
    const got = await Promise.all(all.map((b) => bookPairs(b)));
    expect(got).toEqual(want);
    // a pair between two books is counted by both, a pair inside a book once: the books add up to more than the arcs
    expect(got.reduce((s, n) => s + n, 0)).toBeGreaterThan(meta.count);
  });
});

describe("most voted verse pair of each linked chapter (\"Mais ligados\" rows)", () => {
  it("is a real pair between the two chapters with the top votes among them", async () => {
    for (const [slug, c] of [["isaias", 9], ["genesis", 1], ["salmos", 23], ["joao", 3], ["judas", 1]] as const) {
      const book = books().find((b) => b.slug === slug)!;
      const best = await chapterBestPairs(book, c);
      const partners = await chapterPartners(book, c);
      expect([...best.keys()].sort((x, y) => x - y)).toEqual(partners.map((p) => p.ci).sort((x, y) => x - y));
      const verses = await chapterVerses(book, c);
      for (const [ci, pair] of best) {
        const here = grid.locate(pair.here);
        expect([here.book.index, here.chapter]).toEqual([book.index, c]);
        const there = grid.locate(pair.there);
        expect(there.book.firstChapter + there.chapter - 1).toBe(ci);
        expect(verses[here.verse - 1].links.find(([gv]) => gv === pair.there)?.[1]).toBe(pair.votes);
        // no pair between the two chapters has more votes
        for (const v of verses) {
          for (const [gv, votes] of v.links) {
            const l = grid.locate(gv);
            if (l.book.firstChapter + l.chapter - 1 === ci) expect(votes).toBeLessThanOrEqual(pair.votes);
          }
        }
      }
    }
    // Isaías 9 and Lucas 2 meet at Isaías 9:6 and Lucas 2:11, 228 votes (the pair of the Atlas prototype)
    const is9 = await chapterBestPairs(books().find((b) => b.slug === "isaias")!, 9);
    const lc = books().find((b) => b.slug === "lucas")!;
    const pair = is9.get(lc.firstChapter + 1)!;
    expect([grid.locate(pair.here).verse, grid.locate(pair.there).verse, pair.votes]).toEqual([6, 11, 228]);
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
