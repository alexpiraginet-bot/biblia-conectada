// The numbers of the reading panel "A partir deste trecho / deste capítulo" (headline, mini graph partners) and of
// the chapter rail, computed from the generated book files by src/lib/from-here.ts (CLAUDE.md rule 3).
import { describe, expect, it } from "vitest";
import {
  byVotes,
  chapterHeadline,
  graphNote,
  graphPartners,
  padChapter,
  railWindow,
  satellitePositions,
  testamentName,
  topGroup,
  verseHeadline,
} from "../src/lib/from-here";
import { formatInt } from "../src/lib/canon/text";
import { bookBySlug, chapterNeighbours, chapterRef, verseRef } from "../src/lib/reading";
import { bookFile, books } from "./generated";

const verseLabel = (gv: number) => verseRef(gv).label;
const chapterLabel = (ci: number) => chapterRef(ci).label;

describe("verse panel", () => {
  it("Gênesis 1:3: 29 links, the most voted is 2 Coríntios 4:6 (125 votes), then João 1:5 (70)", () => {
    const gn = bookFile("genesis");
    const ranked = gn.chapters[0][2].l.map(([key, votes]) => ({ key, votes }));
    expect(verseHeadline(ranked, verseLabel)).toBe("29 ligações · a mais votada: 2 Coríntios 4:6, 125 votos");
    const g = graphPartners(ranked);
    expect(g.shown.map((p) => verseLabel(p.key)).slice(0, 2)).toEqual(["2 Coríntios 4:6", "João 1:5"]);
    expect(g.shown[1].votes).toBe(70);
    expect(g.shown).toHaveLength(6);
    expect(graphNote(ranked.length, g.shown.length, g.tiedOut, "ligações")).toBe("As 6 mais votadas de 29 ligações.");
  });

  it("for every verse: the graph draws the most voted links and the headline names the strongest", () => {
    let verses = 0;
    let ties = 0;
    for (const b of books()) {
      for (const ch of bookFile(b.slug).chapters) {
        for (const v of ch) {
          const ranked = v.l.map(([key, votes]) => ({ key, votes }));
          // the pipeline already sorts links strongest first, canonical order inside a tie
          expect(byVotes(ranked)).toEqual(ranked);
          const g = graphPartners(ranked);
          expect(g.shown).toEqual(ranked.slice(0, 6));
          expect(g.left).toBe(Math.max(0, ranked.length - 6));
          if (ranked.length > 6) {
            expect(g.tiedOut).toBe(ranked.slice(6).filter((p) => p.votes === ranked[5].votes).length);
          } else expect(g.tiedOut).toBe(0);
          const h = verseHeadline(ranked, verseLabel);
          if (ranked.length === 0) {
            expect(h).toBeNull();
            continue;
          }
          const top = topGroup(ranked);
          expect(top.every((p) => p.votes === Math.max(...ranked.map((q) => q.votes)))).toBe(true);
          if (ranked.length > 1) expect(h!.startsWith(`${formatInt(ranked.length)} ligações · `)).toBe(true);
          if (top.length === 1) expect(h).toContain(`${verseLabel(top[0].key)}, ${formatInt(top[0].votes)} voto`);
          else ties++;
          verses++;
        }
      }
    }
    expect(verses).toBeGreaterThan(30000);
    expect(ties).toBeGreaterThan(0);
  });

  it("words the special cases", () => {
    const one = [{ key: 0, votes: 1 }];
    expect(verseHeadline(one, () => "X 1:1")).toBe("1 ligação: X 1:1, 1 voto");
    const tie = [
      { key: 1, votes: 40 },
      { key: 2, votes: 40 },
      { key: 3, votes: 7 },
    ];
    expect(verseHeadline(tie, () => "?")).toBe("3 ligações · 2 empatadas como mais votadas, com 40 votos cada");
    expect(verseHeadline([], () => "?")).toBeNull();
    const seven = Array.from({ length: 8 }, (_, i) => ({ key: i, votes: i < 5 ? 10 - i : 3 }));
    const g = graphPartners(seven);
    expect(g.tiedOut).toBe(2);
    expect(graphNote(8, g.shown.length, g.tiedOut, "ligações")).toBe("As 6 mais votadas de 8 ligações. Mais 2 empatam com o último desenhado.");
    expect(graphNote(6, 6, 0, "ligações")).toBeNull();
  });
});

describe("chapter panel", () => {
  it("Gênesis 1: João 1 has the most summed votes (896)", async () => {
    const ranked = (await chapterNeighbours(bookBySlug("genesis")!, 1)).map((p) => ({ key: p.ci, votes: p.votes }));
    expect(chapterLabel(ranked[0].key)).toBe("João 1");
    expect(ranked[0].votes).toBe(896);
    expect(chapterHeadline(ranked, chapterLabel)).toBe(`${formatInt(ranked.length)} capítulos ligados · o mais votado: João 1, 896 votos somados`);
  });

  it("names the chapter with the most summed votes, for every chapter of a sample of books", async () => {
    for (const b of books().filter((_, i) => i % 5 === 0)) {
      for (let c = 1; c <= b.verses.length; c++) {
        const ranked = (await chapterNeighbours(b, c)).map((p) => ({ key: p.ci, votes: p.votes }));
        const h = chapterHeadline(ranked, chapterLabel);
        if (!ranked.length) {
          expect(h).toBeNull();
          continue;
        }
        expect(Math.max(...ranked.map((p) => p.votes))).toBe(ranked[0].votes);
        if (topGroup(ranked).length === 1 && ranked.length > 1) expect(h).toContain(`o mais votado: ${chapterLabel(ranked[0].key)}, ${formatInt(ranked[0].votes)} voto`);
        expect(graphPartners(ranked).shown).toEqual(ranked.slice(0, 6));
      }
    }
  });
});

describe("mini graph layout", () => {
  it("keeps every satellite inside the box and away from the centre", () => {
    for (let k = 1; k <= 6; k++) {
      const pos = satellitePositions(k);
      expect(pos).toHaveLength(k);
      for (const { x, y } of pos) {
        expect(x).toBeGreaterThanOrEqual(10);
        expect(x).toBeLessThanOrEqual(90);
        expect(y).toBeGreaterThanOrEqual(10);
        expect(y).toBeLessThanOrEqual(90);
        expect(Math.hypot(x - 50, y - 50)).toBeGreaterThan(30);
      }
    }
  });
});

describe("chapter rail", () => {
  it("zero-pads to the digits of the book, at least two", () => {
    const gn = bookBySlug("genesis")!;
    const sl = bookBySlug("salmos")!;
    expect(padChapter(1, gn.verses.length)).toBe("01");
    expect(padChapter(50, gn.verses.length)).toBe("50");
    expect(padChapter(1, sl.verses.length)).toBe("001");
    expect(padChapter(119, sl.verses.length)).toBe("119");
  });

  it("lists the chapter and two on each side, five when the book has them", () => {
    expect(railWindow(1, 50)).toEqual([1, 2, 3, 4, 5]);
    expect(railWindow(2, 50)).toEqual([1, 2, 3, 4, 5]);
    expect(railWindow(9, 66)).toEqual([7, 8, 9, 10, 11]);
    expect(railWindow(50, 50)).toEqual([46, 47, 48, 49, 50]);
    expect(railWindow(1, 1)).toEqual([1]);
    expect(railWindow(3, 4)).toEqual([1, 2, 3, 4]);
    for (const b of books()) {
      const n = b.verses.length;
      for (let c = 1; c <= n; c++) {
        const w = railWindow(c, n);
        expect(w).toContain(c);
        expect(w.length).toBe(Math.min(n, 5));
        expect(w[0]).toBeGreaterThanOrEqual(1);
        expect(w[w.length - 1]).toBeLessThanOrEqual(n);
      }
    }
  });

  it("names the testament", () => {
    expect(testamentName(bookBySlug("genesis")!.testament)).toBe("Antigo Testamento");
    expect(testamentName(bookBySlug("joao")!.testament)).toBe("Novo Testamento");
  });
});
