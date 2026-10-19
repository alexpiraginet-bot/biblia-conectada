// The reading pages compute a few things at render time from the generated book files; they must agree with what the
// pipeline computed for the same chapters (chapter-links.json, chapter-pairs.json, the chapter graph's edges).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import { arcStrength, arcTone } from "../src/lib/arc-style";
import { chapterNeighbours, chapterPairs, chapterPartners, chapterVerses, grid, linkedChapters } from "../src/lib/reading";
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

  it("are ranked by summed votes for the panel, strongest first, canonical order inside a tie", async () => {
    for (const book of books().filter((_, i) => i % 7 === 0)) {
      for (let c = 1; c <= book.verses.length; c += 5) {
        const ranked = await chapterNeighbours(book, c);
        for (let k = 1; k < ranked.length; k++) {
          const [p, q] = [ranked[k - 1], ranked[k]];
          expect(p.votes > q.votes || (p.votes === q.votes && p.ci < q.ci), `${book.osis} ${c} #${k}`).toBe(true);
        }
      }
    }
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
