// Explorar data (src/data/generated/explore/<slug>.json, scripts/data/explore.ts): every list is checked against a
// recount from the verse links of the reading files (books/<slug>.json), an independent path through the same data.
import { beforeAll, describe, expect, it } from "vitest";
import { compareByVotes, EXPLORE_EDGES, EXPLORE_PARTNERS, type ExploreFile } from "../src/lib/explore/types";
import { bookFile, books, generated } from "./generated";

type Acc = { ci: number; pairs: number; votes: number; best: [number, number, number]; here: Set<number>; there: Set<number> };

let recount: Map<number, Acc>[] = [];
let files: ExploreFile[] = [];
let label: (ci: number) => string = String;

beforeAll(() => {
  const b = books();
  const nch = b.reduce((s, x) => s + x.verses.length, 0);
  const nv = b.reduce((s, x) => s + x.verses.reduce((p, q) => p + q, 0), 0);
  const chapOf = new Int32Array(nv);
  const verseNo = new Int32Array(nv);
  const names: string[] = [];
  for (const book of b) {
    let gv = book.firstVerse;
    book.verses.forEach((n, c) => {
      names.push(`${book.name} ${c + 1}`);
      for (let v = 1; v <= n; v++, gv++) {
        chapOf[gv] = book.firstChapter + c;
        verseNo[gv] = v;
      }
    });
  }
  label = (ci) => names[ci];
  recount = Array.from({ length: nch }, () => new Map<number, Acc>());
  for (const book of b) {
    bookFile(book.slug).chapters.forEach((verses, c) => {
      const ci = book.firstChapter + c;
      verses.forEach((v, i) => {
        for (const [gv, votes] of v.l) {
          const cj = chapOf[gv];
          if (cj === ci) continue;
          let a = recount[ci].get(cj);
          if (!a) recount[ci].set(cj, (a = { ci: cj, pairs: 0, votes: 0, best: [0, 0, -Infinity], here: new Set(), there: new Set() }));
          const here = i + 1, there = verseNo[gv];
          a.pairs++;
          a.votes += votes;
          a.here.add(here);
          a.there.add(there);
          const [bh, bt, bv] = a.best;
          if (votes > bv || (votes === bv && (here < bh || (here === bh && there < bt)))) a.best = [here, there, votes];
        }
      });
    });
  }
  files = b.map((book) => generated<ExploreFile>(`explore/${book.slug}.json`));
});

const asc = (s: Set<number>) => [...s].sort((x, y) => x - y);

describe("explore files", () => {
  it("has one file per book and one entry per chapter", () => {
    const b = books();
    expect(files).toHaveLength(66);
    files.forEach((f, i) => {
      expect(f.format).toBe("biblia-conectada/explore@1");
      expect(f.osis).toBe(b[i].osis);
      expect(f.chapters).toHaveLength(b[i].verses.length);
    });
  });

  it("ranks the partners of all 1,189 chapters exactly as a recount from the verse links", () => {
    let chapters = 0;
    for (const f of files) {
      for (const ch of f.chapters) {
        const ci = chapters++;
        const all = [...recount[ci].values()];
        expect(ch.partners, label(ci)).toBe(all.length);
        // the rule written on the page: votes, then verse pairs, then canonical order (spelled out here on purpose)
        all.sort((x, y) => y.votes - x.votes || y.pairs - x.pairs || x.ci - y.ci);
        const expected = all.slice(0, EXPLORE_PARTNERS).map((a) => [a.ci, a.pairs, a.votes, a.best, asc(a.here), asc(a.there)]);
        expect(ch.top, label(ci)).toEqual(expected);
      }
    }
    expect(chapters).toBe(1189);
  });

  it("keeps min(available, 35) partners and every chapter has at least 32", () => {
    let fewest = Infinity;
    for (const f of files) {
      for (const ch of f.chapters) {
        expect(ch.top.length).toBe(Math.min(ch.partners, EXPLORE_PARTNERS));
        fewest = Math.min(fewest, ch.partners);
      }
    }
    expect(fewest).toBeGreaterThanOrEqual(32);
  });

  it("breaks ties by verse pairs, then by canonical order", () => {
    const a = { ci: 10, pairs: 3, votes: 100 };
    const b = { ci: 5, pairs: 3, votes: 100 };
    const c = { ci: 1, pairs: 2, votes: 100 };
    const d = { ci: 0, pairs: 50, votes: 99 };
    expect([d, c, a, b].sort(compareByVotes)).toEqual([b, a, c, d]);
    // and every stored list follows it strictly (no two partners compare equal)
    for (const f of files) {
      for (const ch of f.chapters) {
        for (let i = 1; i < ch.top.length; i++) {
          const [ci, pairs, votes] = ch.top[i - 1];
          const [cj, pj, vj] = ch.top[i];
          expect(compareByVotes({ ci, pairs, votes }, { ci: cj, pairs: pj, votes: vj })).toBeLessThan(0);
        }
      }
    }
  });

  it("draws the 60 strongest chapter edges among the partners, no more", () => {
    let chapters = 0;
    for (const f of files) {
      for (const ch of f.chapters) {
        const ci = chapters++;
        const all: [number, number, number, number][] = [];
        for (let x = 0; x < ch.top.length; x++) {
          for (let y = x + 1; y < ch.top.length; y++) {
            const e = recount[ch.top[x][0]].get(ch.top[y][0]);
            if (e) all.push([x, y, e.pairs, e.votes]);
          }
        }
        all.sort((e, g) => g[3] - e[3] || g[2] - e[2] || e[0] - g[0] || e[1] - g[1]);
        expect(ch.edges, label(ci)).toEqual(all.slice(0, EXPLORE_EDGES));
      }
    }
  });

  it("matches the numbers of the analyses for João 1 and Isaías 9", () => {
    const b = books();
    const at = (slug: string, chapter: number) => files[b.findIndex((x) => x.slug === slug)].chapters[chapter - 1];
    const jo1 = at("joao", 1);
    expect(jo1.partners).toBe(424);
    expect(jo1.top.slice(0, 3).map(([ci, p, v]) => [label(ci), p, v])).toEqual([
      ["João 3", 50, 1246],
      ["Gênesis 1", 5, 896],
      ["Colossenses 1", 11, 747],
    ]);
    // the strongest pair of João 1 and Gênesis 1 is João 1:1 and Gênesis 1:1; the verses on each side come from code
    expect(jo1.top[1].slice(3)).toEqual([[1, 1, 724], [1, 3, 5, 9], [1, 3, 26]]);
    const is9 = at("isaias", 9);
    expect(label(is9.top[0][0])).toBe("Lucas 2");
  });
});
