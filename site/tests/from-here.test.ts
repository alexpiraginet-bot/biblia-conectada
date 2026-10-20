// The numbers of the reading panel "A partir deste trecho / deste capítulo" (headline, mini graph partners) and of
// the chapter rail, computed from the generated book files by src/lib/from-here.ts (CLAUDE.md rule 3).
import { describe, expect, it } from "vitest";
import {
  barShare,
  byVotes,
  chapterHeadline,
  chapterMeta,
  graphNote,
  graphPartners,
  keepBookNumber,
  linksLabel,
  satellitePositions,
  SEAL,
  sealBookFit,
  sealLevels,
  testamentName,
  topGroup,
  verseHeadline,
} from "../src/lib/from-here";
import { formatInt } from "../src/lib/canon/text";
import { makeMeasure } from "../src/lib/explore/measure";
import { bookBySlug, chapterNeighbours, chapterPairs, chapterPartners, chapterRef, grid, verseRef } from "../src/lib/reading";
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

describe("chapter frame", () => {
  it("words the meta line under the title, Isaías 9 as in the Atlas prototype", async () => {
    const is = bookBySlug("isaias")!;
    const partners = await chapterPartners(is, 9);
    expect(chapterMeta(is.verses[8], chapterPairs(is, 9), partners.length)).toBe("21 versículos · 830 ligações · 427 capítulos ligados · Bíblia Livre");
    expect(chapterMeta(1, 1, 1)).toBe("1 versículo · 1 ligação · 1 capítulo ligado · Bíblia Livre");
    expect(linksLabel(3088)).toBe("3.088 ligações");
  });

  it("keeps a book's number with its name in titles, and nothing else", () => {
    expect(keepBookNumber("1 Tessalonicenses 5")).toBe("1 Tessalonicenses 5");
    expect(keepBookNumber("Ligações de 2 Crônicas 6:34")).toBe("Ligações de 2 Crônicas 6:34");
    expect(keepBookNumber("Isaías 9")).toBe("Isaías 9");
    expect(keepBookNumber("Salmos 119 · 3 votos")).toBe("Salmos 119 · 3 votos");
    for (const b of books()) {
      const t = keepBookNumber(`${b.name} 1`);
      expect(t.replace(/ /g, " ")).toBe(`${b.name} 1`);
      expect(t.includes(" ")).toBe(/^[1-3] /.test(b.name));
    }
  });

  it("sizes the bars of the chapter list as a share of the largest, never below zero", () => {
    expect(barShare(830, 1202)).toBe(0.691);
    expect(barShare(1202, 1202)).toBe(1);
    expect(barShare(-5, 100)).toBe(0);
    expect(barShare(5, 0)).toBe(0);
  });

  it("names the testament", () => {
    expect(testamentName(bookBySlug("genesis")!.testament)).toBe("Antigo Testamento");
    expect(testamentName(bookBySlug("joao")!.testament)).toBe("Novo Testamento");
  });
});

describe("chapter seal", () => {
  /** the dashes of a level as [start, end] spans along its circle, from its stroke-dasharray */
  const spans = (dash: string) => {
    const xs = dash.split(" ").map(Number);
    const out: [number, number][] = [];
    let at = 0;
    xs.forEach((x, i) => {
      if (i % 2 === 0 && x > 0) out.push([at, at + x]);
      at += x;
    });
    return { out, total: at };
  };

  it("draws one tick for every linked chapter, at its place around the dial, on one circle per length", async () => {
    for (const [slug, c] of [["isaias", 9], ["salmos", 119], ["genesis", 1], ["obadias", 1], ["judas", 1]] as const) {
      const book = bookBySlug(slug)!;
      const partners = await chapterPartners(book, c);
      const levels = sealLevels(partners, grid.chapterCount);
      // every linked chapter is on exactly one circle
      expect(levels.flatMap((l) => l.chapters).sort((a, b) => a - b)).toEqual(partners.map((p) => p.ci).sort((a, b) => a - b));
      for (const l of levels) {
        const around = 2 * Math.PI * l.r;
        const { out, total } = spans(l.dash);
        // the pattern closes the circle (to the rounding of its tenths), so it never repeats onto the dial
        expect(Math.abs(total - around)).toBeLessThan(0.06);
        // and covers each of its chapters at its canonical angle
        for (const ci of l.chapters) {
          const s = ((ci + 0.5) / grid.chapterCount) * around;
          expect(out.some(([a, b]) => a <= s + 0.06 && s - 0.06 <= b), `${slug} ${c}: chapter ${ci}`).toBe(true);
        }
        expect(l.r + l.width / 2).toBeLessThanOrEqual(SEAL.from + SEAL.maxLen + 0.05);
        expect(l.r - l.width / 2).toBeCloseTo(SEAL.from, 1);
      }
      // more summed votes, never a shorter tick
      const level = new Map(levels.flatMap((l) => l.chapters.map((ci) => [ci, l.width] as const)));
      const byVotes = [...partners].sort((p, q) => p.votes - q.votes);
      for (let k = 1; k < byVotes.length; k++) expect(level.get(byVotes[k].ci)!).toBeGreaterThanOrEqual(level.get(byVotes[k - 1].ci)!);
    }
  });

  it("fits the book's name inside the ring as written, smaller and squeezed only for the long names", () => {
    // strict: a character of a book name missing from the font metrics fails here
    const strict = makeMeasure(true);
    const width = (text: string, px: number) => strict("ui", text, px);
    expect(sealBookFit("Isaías", width)).toEqual({ size: 12, squeeze: null });
    const long = sealBookFit("1 Tessalonicenses", width);
    expect(long.size).toBe(9);
    expect(long.squeeze).toBe(80);
    for (const b of books()) {
      const fit = sealBookFit(b.name, width);
      expect(fit.size).toBeGreaterThanOrEqual(9);
      expect(fit.size).toBeLessThanOrEqual(12);
      if (fit.squeeze) expect(fit.size).toBe(9);
    }
  });
});
