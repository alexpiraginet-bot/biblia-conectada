// Community pages (trail "Antes do Natal", Mesa da semana, the bridge strip): their numbers come from the pipeline
// (scripts/data/community.ts). Recomputed here a second way, from the reading data the panel shows.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import type { TrailFile } from "../src/lib/community/trail";
import { ARC_BASE, ARC_FLATTEN, ARC_TOP, ARC_W, arcPath, baseline, longRef, shortRef, versePath } from "../src/lib/community/geometry";
import {
  addDays,
  bridgeDate,
  bridgeHome,
  bridgeNumber,
  decodeDistances,
  distanceAt,
  encodeDistances,
  formatDateBR,
  formatDayMonth,
  PONTE_LAUNCH,
  saoPauloDate,
} from "../src/lib/community/ponte";
import { bringLink, mesaLinks, takeBack } from "../src/lib/community/mesa";
import { chapterPartners, grid, verseX } from "../src/lib/reading";
import { bookFile, books, generated } from "./generated";

type Link = [number, number, number];
function allLinks(): { links: Link[][]; text: string[] } {
  const links: Link[][] = [];
  const text: string[] = [];
  for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) {
    links.push(v.l);
    text.push(v.t);
  }
  return { links, text };
}

describe("trilha Antes do Natal", () => {
  const trail = generated<TrailFile>("community/trilha-antes-do-natal.json");
  const bs = books();
  const { links, text } = allLinks();
  const bookOfVerse = (gv: number) => grid.locate(gv).book;

  // second way: walk the Old Testament side of every link (the pipeline walks the birth-chapter side)
  const birth = (gv: number) => {
    const { book, chapter } = grid.locate(gv);
    return (book.slug === "mateus" || book.slug === "lucas") && chapter <= 2;
  };
  const best = new Map<number, { ot: number; nt: number; votes: number; pairs: number }>();
  let pairs = 0;
  for (let gv = 0; gv < links.length; gv++) {
    if (bookOfVerse(gv).testament !== "AT") continue;
    for (const [p, votes] of links[gv]) {
      if (!birth(p)) continue;
      pairs++;
      const b = bookOfVerse(gv).index;
      const cur = best.get(b);
      if (!cur) best.set(b, { ot: gv, nt: p, votes, pairs: 1 });
      else {
        cur.pairs++;
        if (votes > cur.votes || (votes === cur.votes && (gv < cur.ot || (gv === cur.ot && p < cur.nt)))) Object.assign(cur, { ot: gv, nt: p, votes });
      }
    }
  }
  const ranked = [...best.entries()].sort((x, y) => y[1].votes - x[1].votes || x[0] - y[0]);

  it("has 26 steps, one per book, from the 26 books with the strongest pair", () => {
    expect(trail.steps).toHaveLength(26);
    expect(new Set(trail.steps.map((s) => s.book)).size).toBe(26);
    const chosen = new Set(ranked.slice(0, 26).map(([b]) => b));
    for (const s of trail.steps) expect(chosen.has(s.book), bs[s.book].name).toBe(true);
    // no tie at the cut
    expect(ranked[26][1].votes).toBeLessThan(ranked[25][1].votes);
    expect(trail.otBooksWithPairs).toBe(best.size);
  });

  it("takes each book's strongest pair, votes summed over both directions", () => {
    for (const s of trail.steps) {
      const b = best.get(s.book)!;
      expect([s.ot.gv, s.nt.gv, s.votes, s.pairs], bs[s.book].name).toEqual([b.ot, b.nt, b.votes, b.pairs]);
      expect(bookOfVerse(s.ot.gv).testament).toBe("AT");
      expect(birth(s.nt.gv)).toBe(true);
      // the reading panel of either verse lists the other with the same votes
      expect(links[s.ot.gv].find(([p]) => p === s.nt.gv)?.[1]).toBe(s.votes);
      expect(links[s.nt.gv].find(([p]) => p === s.ot.gv)?.[1]).toBe(s.votes);
      expect(s.ot.text).toBe(text[s.ot.gv]);
      expect(s.nt.text).toBe(text[s.nt.gv]);
    }
  });

  it("runs in canonical order with Isaías last: Is 7:14 and Mt 1:23, 333 votes", () => {
    const order = trail.steps.map((s) => s.book);
    expect(order.slice(0, 25)).toEqual([...order.slice(0, 25)].sort((a, b) => a - b));
    const last = trail.steps[25];
    expect(bs[last.book].slug).toBe("isaias");
    const ot = grid.locate(last.ot.gv);
    const nt = grid.locate(last.nt.gv);
    expect(`${ot.book.name} ${ot.chapter}:${ot.verse} | ${nt.book.name} ${nt.chapter}:${nt.verse}`).toBe("Isaías 7:14 | Mateus 1:23");
    expect(last.votes).toBe(333);
    // the same number as the study of the second video, by its own pipeline (natal.json)
    const natal = generated<{ keyPairs: { ot: string; nt: string; votes: number }[]; pairsAll: number; otBooksAll: number }>("studies/natal.json");
    expect(natal.keyPairs.find((p) => p.ot === "Isaías 7:14")?.votes).toBe(last.votes);
    expect(pairs).toBe(natal.pairsAll);
    expect(trail.otBooksWithPairs).toBe(natal.otBooksAll);
  });

  it("suggests one date a day, 29/11 to 24/12/2026", () => {
    trail.steps.forEach((s, i) => {
      expect(s.step).toBe(i + 1);
      expect(s.date).toBe(addDays("2026-11-29", i));
    });
    expect(trail.firstDate).toBe("2026-11-29");
    expect(trail.lastDate).toBe("2026-12-24");
    expect(trail.definition).toMatch(/soma dos votos das duas direções/);
  });
});

describe("links of each chapter (public/data/verse-links)", () => {
  it("are the reading panel's links, partner and votes, for all 1,189 chapters", () => {
    let chapters = 0;
    for (const b of books()) {
      const f = bookFile(b.slug);
      f.chapters.forEach((ch, c) => {
        const file = JSON.parse(readFileSync(join(OUT.publicData, "verse-links", b.slug, `${c + 1}.json`), "utf8")) as number[][];
        expect(file.length, `${b.slug} ${c + 1}`).toBe(ch.length);
        ch.forEach((v, i) => expect(file[i]).toEqual(v.l.flatMap(([p, w]) => [p, w])));
        chapters++;
      });
    }
    expect(chapters).toBe(grid.chapterCount);
  });
});

describe("Mesa da semana", () => {
  it("lists every link to another chapter, as many as the chapter pages count, most votes first", async () => {
    for (const b of books()) {
      for (let c = 1; c <= b.verses.length; c++) {
        const file = JSON.parse(readFileSync(join(OUT.publicData, "verse-links", b.slug, `${c}.json`), "utf8")) as number[][];
        const first = grid.verseIndex(b, c, 1);
        const links = mesaLinks(file, first);
        const partners = await chapterPartners(b, c);
        expect(links.length, `${b.slug} ${c}`).toBe(partners.reduce((s, p) => s + p.pairs, 0));
        for (let i = 1; i < links.length; i++) expect(links[i].votes).toBeLessThanOrEqual(links[i - 1].votes);
        for (const l of links) {
          expect(grid.locate(l.here).chapter === c && grid.locate(l.here).book.index === b.index).toBe(true);
          const t = grid.locate(l.there);
          expect(t.book.index === b.index && t.chapter === c).toBe(false);
        }
      }
    }
  });

  it("takes back only this turn's person: the people before keep the link on the table", () => {
    const before = { brought: { a: 2, b: 1 }, turn: [] as string[] };
    const brought = bringLink(before, "a", 3);
    expect(brought).toEqual({ brought: { a: 3, b: 1 }, turn: ["a"] });
    expect(takeBack(brought, "a")).toEqual({ brought: { a: 2, b: 1 }, turn: [] });
    // a link only this person brought leaves the table
    const own = bringLink({ brought: {}, turn: [] }, "c", 3);
    expect(takeBack(own, "c")).toEqual({ brought: {}, turn: [] });
    // a link brought on an earlier turn is not this person's to take back
    expect(takeBack(before, "b")).toBe(before);
  });

  it("brings each link once per turn, at most three per person", () => {
    let t = { brought: {} as Record<string, number>, turn: [] as string[] };
    for (const k of ["a", "a", "b", "c", "d"]) t = bringLink(t, k, 3);
    expect(t).toEqual({ brought: { a: 1, b: 1, c: 1 }, turn: ["a", "b", "c"] });
  });
});

describe("community geometry (client copy of the reading arcs)", () => {
  const base = baseline(books());
  it("places verses where the reading pages do", () => {
    for (const gv of [0, 438, 17835, 23178, 24930, 31101]) expect(base.verseX(gv)).toBeCloseTo(verseX(gv), 12);
    expect(base.verseCount).toBe(grid.verseCount);
    expect(base.chapterCount).toBe(grid.chapterCount);
  });
  it("keeps one vertical scale: an arc over the whole line reaches the top", () => {
    expect(ARC_FLATTEN).toBeCloseTo((ARC_BASE - ARC_TOP) / (ARC_W / 2), 12);
    expect(arcPath(0, 1)).toBe(`M0 ${ARC_BASE}A500 ${ARC_BASE - ARC_TOP} 0 0 1 1000 ${ARC_BASE}`);
    expect(arcPath(1, 0)).toBe(arcPath(0, 1));
  });
  it("names verses like the site", () => {
    expect(shortRef(base, 17835)).toBe("Is 9:6");
    expect(longRef(base, 17835)).toBe("Isaías 9:6");
    expect(versePath(base, 17835)).toBe("/isaias/9/6");
  });
});

describe("Ponte dates and distance maps", () => {
  it("counts days in São Paulo time", () => {
    expect(saoPauloDate(new Date("2026-10-20T02:59:59Z"))).toBe("2026-10-19");
    expect(saoPauloDate(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-20");
    expect(bridgeNumber(PONTE_LAUNCH)).toBe(1);
    expect(bridgeNumber(addDays(PONTE_LAUNCH, 364))).toBe(365);
    expect(bridgeDate(1)).toBe(PONTE_LAUNCH);
    expect(bridgeDate(bridgeNumber("2027-02-28"))).toBe("2027-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(formatDateBR("2026-12-24")).toBe("24/12/2026");
    expect(formatDayMonth("2026-12-01")).toBe("1º de dezembro");
    expect(formatDayMonth("2026-11-29")).toBe("29 de novembro");
    expect(bridgeHome(3, 5)).toBe("/ponte/3");
    expect(bridgeHome(6, 5)).toBe("/ponte#6");
  });
  it("packs hop counts in 4 bits and reads them back", () => {
    const d = [0, 1, 2, 3, 4, 5, -1, 14, 7];
    const packed = decodeDistances(encodeDistances(d));
    expect(d.map((_, i) => distanceAt(packed, i))).toEqual([0, 1, 2, 3, 4, 5, null, 14, 7]);
    expect(() => encodeDistances([16])).toThrow();
  });
});
