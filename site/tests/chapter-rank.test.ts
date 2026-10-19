// One ranking of a chapter's linked chapters (src/lib/chapter-rank.ts): the reading panel's "Mais ligados" and the
// Explorar must show the same chapters in the same order, for every chapter, so the two pages never disagree.
import { describe, expect, it } from "vitest";
import { compareLinkedChapters, rankLinkedChapters } from "../src/lib/chapter-rank";
import { compareByVotes, EXPLORE_PARTNERS, type ExploreFile } from "../src/lib/explore/types";
import { mostLinkedRows } from "../src/lib/from-here";
import { chapterNeighbours } from "../src/lib/reading";
import { books, generated } from "./generated";

describe("ranking of linked chapters", () => {
  it("orders by summed votes, then verse pairs, then canonical order", () => {
    const a = { ci: 10, pairs: 3, votes: 100 };
    const b = { ci: 5, pairs: 3, votes: 100 };
    const c = { ci: 1, pairs: 2, votes: 100 };
    const d = { ci: 0, pairs: 50, votes: 99 };
    expect(rankLinkedChapters([d, c, a, b])).toEqual([b, a, c, d]);
    // a copy: the input keeps its order
    const xs = [d, c];
    rankLinkedChapters(xs);
    expect(xs).toEqual([d, c]);
  });

  it("is the comparator of the Explorar pipeline", () => {
    expect(compareByVotes).toBe(compareLinkedChapters);
  });

  it("gives the reading panel and the Explorar the same chapters in the same order, for all 1,189 chapters", async () => {
    let chapters = 0;
    let rows = 0;
    for (const book of books()) {
      const file = generated<ExploreFile>(`explore/${book.slug}.json`);
      for (let c = 1; c <= book.verses.length; c++) {
        const panel = await chapterNeighbours(book, c);
        const ex = file.chapters[c - 1];
        const label = `${book.name} ${c}`;
        // same set of linked chapters
        expect(panel.length, label).toBe(ex.partners);
        // the Explorar keeps the first 35 of the very list the panel ranks
        expect(panel.slice(0, EXPLORE_PARTNERS).map((p) => [p.ci, p.pairs, p.votes]), label).toEqual(ex.top.map(([ci, pairs, votes]) => [ci, pairs, votes]));
        // so the "Mais ligados" rows (8, plus ties in votes with the 8th) are the Explorar's first rows
        const listed = mostLinkedRows(panel.map((p) => ({ key: p.ci, votes: p.votes })));
        const inExplore = listed.filter((_, i) => i < EXPLORE_PARTNERS);
        expect(inExplore.map((p) => p.key), label).toEqual(ex.top.slice(0, inExplore.length).map(([ci]) => ci));
        rows += listed.length;
        chapters++;
      }
    }
    expect(chapters).toBe(1189);
    expect(rows).toBeGreaterThanOrEqual(8 * 1189);
  });
});
