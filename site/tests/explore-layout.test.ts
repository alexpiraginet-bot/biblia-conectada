// Explorar map (src/lib/explore/atlas.ts): the atlas of every one of the 1,189 chapters is laid out with the real
// advance widths of the site's fonts (src/lib/explore/label-metrics.json, written by scripts/label-metrics.py) and
// checked with geometry written here: no two shapes closer than the spec's clear space and everything inside the canvas,
// on phones and on the wide map. The numbers the map shows are recounted from the verse links of the reading files.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  GROUP_NAMES,
  GROUPS,
  groupPartners,
  hubText,
  layoutAtlas,
  NARROW,
  NO_CHAPTER,
  votesWord,
  WIDE,
  type AtlasLayout,
  type AtlasSpec,
  type Box,
  type GroupId,
} from "../src/lib/explore/atlas";
import { makeMeasure, metrics } from "../src/lib/explore/measure";
import { atlasOf, connectionOf, defaultConnection } from "../src/lib/explore/atlas-data";
import { partnersText } from "../src/lib/explore/text";
import { bookBySlug } from "../src/lib/reading";
import { SITE } from "../scripts/data/sources";
import { bookFile, books } from "./generated";

const measure = makeMeasure(true);
type P = { ci: number; pairs: number; votes: number };

const names: string[] = [];
const numbers: string[] = [];
let groupOf: (ci: number) => GroupId = () => "atos";
/** every linked chapter of every chapter, ranked by the rule the pages state (spelled out again here) */
const ranked: P[][] = [];

beforeAll(() => {
  const b = books();
  const medals = JSON.parse(readFileSync(join(SITE, "src/data/medalhoes.json"), "utf8")) as { bookGroup: Record<string, GroupId> };
  const chapOf: number[] = [];
  const groupOfCi: GroupId[] = [];
  for (const book of b) {
    book.verses.forEach((n, c) => {
      names.push(`${book.name} ${c + 1}`);
      numbers.push(String(c + 1));
      groupOfCi.push(medals.bookGroup[book.osis]);
      for (let v = 0; v < n; v++) chapOf.push(book.firstChapter + c);
    });
  }
  groupOf = (ci) => groupOfCi[ci];
  for (const book of b) {
    bookFile(book.slug).chapters.forEach((verses, c) => {
      const ci = book.firstChapter + c;
      const acc = new Map<number, P>();
      for (const v of verses) {
        for (const [gv, votes] of v.l) {
          const cj = chapOf[gv];
          if (cj === ci) continue;
          const a = acc.get(cj) ?? { ci: cj, pairs: 0, votes: 0 };
          a.pairs++;
          a.votes += votes;
          acc.set(cj, a);
        }
      }
      ranked[ci] = [...acc.values()].sort((x, y) => y.votes - x.votes || y.pairs - x.pairs || x.ci - y.ci);
    });
  }
});

const texts = (ci: number) => ({ caption: partnersText(ranked[ci].length), chapter: (c: number) => names[c], number: (c: number) => numbers[c] });
const groupsOf = (ci: number) => groupPartners(ranked[ci], groupOf);

/** Clear space between shapes, measured independently of the layout code: discs as circles, label plates as boxes. */
function problems(l: AtlasLayout, label: string): string[] {
  const s: AtlasSpec = l.spec;
  // coordinates are rounded to 0.1 unit, which may take up to 0.15 off a gap
  const min = s.gapMin - 0.15;
  type Disc = { what: string; x: number; y: number; r: number };
  type Plate = { what: string; own: string; b: Box };
  const discs: Disc[] = [
    { what: "seal", x: s.cx, y: s.cy, r: l.rOut },
    ...l.hubs.map((h) => ({ what: `medallion ${h.id}`, x: h.x, y: h.y, r: h.s / 2 })),
    ...l.nodes.map((n) => ({ what: `chapter ${names[n.ci]}`, x: n.x, y: n.y, r: n.s / 2 })),
  ];
  const plates: Plate[] = [
    ...(l.caption ? [{ what: "caption", own: "seal", b: l.caption }] : []),
    ...l.hubs.map((h) => ({ what: `label ${h.id}`, own: `medallion ${h.id}`, b: h.box })),
    ...l.nodes.map((n) => ({ what: `label ${names[n.ci]}`, own: `chapter ${names[n.ci]}`, b: n.box })),
  ];
  const out: string[] = [];
  const near = (a: string, b: string, d: number) => d < min && out.push(`${label}: ${a} and ${b} ${d.toFixed(2)} apart`);
  for (let i = 0; i < discs.length; i++) {
    const a = discs[i];
    if (a.x - a.r < 0 || a.y - a.r < 0 || a.x + a.r > s.W || a.y + a.r > s.H) out.push(`${label}: ${a.what} outside the canvas`);
    for (let j = i + 1; j < discs.length; j++) near(a.what, discs[j].what, Math.hypot(a.x - discs[j].x, a.y - discs[j].y) - a.r - discs[j].r);
  }
  for (let i = 0; i < plates.length; i++) {
    const a = plates[i].b;
    if (a[0] < 0 || a[1] < 0 || a[2] > s.W || a[3] > s.H) out.push(`${label}: ${plates[i].what} outside the canvas`);
    for (let j = i + 1; j < plates.length; j++) {
      const b = plates[j].b;
      near(plates[i].what, plates[j].what, Math.max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3]));
    }
    for (const d of discs) {
      if (d.what === plates[i].own) continue;
      const dx = Math.max(a[0] - d.x, 0, d.x - a[2]);
      const dy = Math.max(a[1] - d.y, 0, d.y - a[3]);
      near(plates[i].what, d.what, dx === 0 && dy === 0 ? -d.r : Math.hypot(dx, dy) - d.r);
    }
  }
  return out;
}

describe("label metrics", () => {
  it("were read from the fonts the site ships (regenerate with scripts/label-metrics.py when a font changes)", () => {
    for (const face of Object.values(metrics.faces)) {
      const sha = createHash("sha256").update(readFileSync(join(SITE, face.file))).digest("hex");
      expect(sha, face.file).toBe(face.sha256);
    }
  });

  it("cover every character the map can write", () => {
    for (let ci = 0; ci < ranked.length; ci++) {
      expect(() => measure("title", names[ci], 16)).not.toThrow();
      expect(() => measure("ui", partnersText(ranked[ci].length), 14)).not.toThrow();
      for (const p of ranked[ci].slice(0, 3)) expect(() => measure("ui", votesWord(p.votes), 14)).not.toThrow();
      for (const g of groupsOf(ci)) expect(() => measure("ui", votesWord(g.votes), 14)).not.toThrow();
    }
    for (const g of Object.values(GROUP_NAMES)) for (const n of [g.name, g.short]) expect(() => measure("title", n, 18)).not.toThrow();
    expect(() => measure("ui", NO_CHAPTER, 14)).not.toThrow();
    // a sum of votes can be negative (Intl writes the hyphen-minus)
    expect(() => measure("ui", votesWord(-12), 14)).not.toThrow();
  });

  it("measure real advances, not an average width", () => {
    const perChar = (s: string) => measure("title", s, 100) / s.length;
    expect(Math.abs(perChar("Jó 1") - perChar("Mateus 1"))).toBeGreaterThan(1);
  });
});

describe("atlas groups", () => {
  it("put every linked chapter in exactly one of the eight groups, ranked, with the group sums", () => {
    for (let ci = 0; ci < ranked.length; ci++) {
      const gs = groupsOf(ci);
      expect(gs.map((g) => g.id)).toEqual([...GROUPS]);
      expect(gs.reduce((s, g) => s + g.chapters, 0)).toBe(ranked[ci].length);
      for (const g of gs) {
        const mine = ranked[ci].filter((p) => groupOf(p.ci) === g.id);
        expect(g.partners).toEqual(mine);
        expect(g.votes).toBe(mine.reduce((s, p) => s + p.votes, 0));
        expect(g.pairs).toBe(mine.reduce((s, p) => s + p.pairs, 0));
      }
    }
  });

  it("match the numbers of Isaías 9 on the capa", () => {
    const b = books();
    const isa = b.find((x) => x.slug === "isaias")!;
    const gs = groupsOf(isa.firstChapter + 8);
    const ev = gs.find((g) => g.id === "evangelhos")!;
    expect(names[ev.partners[0].ci]).toBe("Lucas 2");
    expect([ev.partners[0].pairs, ev.partners[0].votes]).toEqual([3, 296]);
    expect(gs.reduce((s, g) => s + g.chapters, 0)).toBe(427);
  });
});

describe("atlas layout", () => {
  let wide: AtlasLayout[] = [];
  beforeAll(() => {
    wide = ranked.map((_, ci) => layoutAtlas(WIDE, groupsOf(ci), texts(ci), measure));
  });

  it("leaves no shape touching another on the wide map, for all 1,189 chapters", () => {
    const out = wide.flatMap((l, ci) => problems(l, names[ci]));
    expect(out.slice(0, 10)).toEqual([]);
  });

  it("does the same on phones (the eight medallions around the seal)", () => {
    const out = ranked.flatMap((_, ci) => problems(layoutAtlas(NARROW, groupsOf(ci), texts(ci), measure), names[ci]));
    expect(out.slice(0, 10)).toEqual([]);
  });

  it("draws, around each medallion, the group's most voted chapters in order, and always the strongest of all", () => {
    let drawn = 0;
    wide.forEach((l, ci) => {
      const gs = groupsOf(ci);
      for (const g of gs) {
        const mine = l.nodes.filter((n) => n.id === g.id).sort((a, b) => a.j - b.j);
        expect(mine.map((n) => n.ci)).toEqual(g.partners.slice(0, mine.length).map((p) => p.ci));
        expect(mine.length).toBeLessThanOrEqual(WIDE.nodes!.perGroup);
        drawn += mine.length;
      }
      // the connection a map opens on is on the map
      expect(l.nodes.some((n) => n.ci === ranked[ci][0].ci), names[ci]).toBe(true);
    });
    // most of the listed chapters fit (the list beside the map names all of them)
    const listed = ranked.reduce((s, _, ci) => s + groupsOf(ci).reduce((t, g) => t + Math.min(g.chapters, WIDE.nodes!.perGroup), 0), 0);
    expect(drawn / listed).toBeGreaterThan(0.75);
  });

  it("labels every medallion with its group, and with its sum of votes on the wide map", () => {
    const ci = ranked.length - 1;
    const gs = groupsOf(ci);
    for (const g of gs) {
      expect(hubText(WIDE, g)).toEqual({ name: GROUP_NAMES[g.id].name, meta: g.chapters ? votesWord(g.votes) : NO_CHAPTER });
      expect(hubText(NARROW, g)).toEqual({ name: GROUP_NAMES[g.id].short, meta: null });
    }
  });

  it("is deterministic and has no randomness", () => {
    for (const ci of [0, 100, 700, 1188]) expect(layoutAtlas(WIDE, groupsOf(ci), texts(ci), measure)).toEqual(wide[ci]);
    const src = readFileSync(join(SITE, "src/lib/explore/atlas.ts"), "utf8");
    expect(src).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });

  it("is drawn by a stylesheet that switches at the wide map's width and scales every unit with the canvas", () => {
    const css = readFileSync(join(SITE, "src/components/explore/explore.module.css"), "utf8");
    expect(css).toContain(`@container atlas (min-width: ${WIDE.W}px)`);
    expect(css).toContain(`max(${WIDE.W}px,`);
    expect(css).toContain("--u: calc(100cqw / var(--W));");
    // the phone canvas is never drawn narrower than its layout (a 320 px screen, edge to edge)
    expect(NARROW.W).toBeLessThanOrEqual(320);
  });
});

// the server module (atlas-data.ts) builds the same groups from src/lib/reading
describe("atlas data, as the pages build it", () => {
  it("gives the pages the groups and the layout of the recount, for a sample of chapters", async () => {
    const b = books();
    for (const ci of [0, 50, 333, 600, 698, 900, 1000, 1188]) {
      const book = [...b].reverse().find((x) => x.firstChapter <= ci)!;
      const a = await atlasOf(bookBySlug(book.slug)!, ci - book.firstChapter + 1);
      expect(a.partners).toBe(ranked[ci].length);
      expect(a.groups).toEqual(groupsOf(ci));
      expect(a.wide).toEqual(layoutAtlas(WIDE, groupsOf(ci), texts(ci), measure));
    }
  });

  it("describes each connection with the numbers of the Explorar data, an independent path through the pipeline", async () => {
    type ExploreFile = { chapters: { top: [number, number, number, [number, number, number], number[], number[]][] }[] };
    for (const [slug, chapter] of [["isaias", 9], ["joao", 1], ["genesis", 1], ["salmos", 119], ["apocalipse", 22]] as const) {
      const book = bookBySlug(slug)!;
      const file = JSON.parse(readFileSync(join(SITE, "src/data/generated/explore", `${slug}.json`), "utf8")) as ExploreFile;
      const top = file.chapters[chapter - 1].top;
      expect((await defaultConnection(book, chapter))?.other.ci).toBe(top[0][0]);
      for (const [rank, [ci, pairs, votes, [here, there, v], hereVerses, thereVerses]] of top.slice(0, 12).entries()) {
        const c = await connectionOf(book, chapter, ci);
        expect(c, `${slug} ${chapter} -> ${names[ci]}`).not.toBeNull();
        expect({ rank: c!.rank, pairs: c!.pairs, votes: c!.votes, strongest: c!.strongest, hereVerses: c!.hereVerses, thereVerses: c!.thereVerses }).toEqual({
          rank,
          pairs,
          votes,
          strongest: { here, there, votes: v },
          hereVerses,
          thereVerses,
        });
      }
    }
    // a chapter with no verse pair to the centre is no connection
    const isa = bookBySlug("isaias")!;
    const unlinked = ranked.findIndex((_, ci) => !ranked[isa.firstChapter + 8].some((p) => p.ci === ci) && ci !== isa.firstChapter + 8);
    expect(await connectionOf(isa, 9, unlinked)).toBeNull();
  });
});

// the groups the map draws come from the medallion manifest: every book has one
describe("medallion groups", () => {
  it("cover the 66 books with the eight groups", () => {
    const groups = new Set(books().map((b) => groupOf(b.firstChapter)));
    expect([...groups].sort()).toEqual([...GROUPS].sort());
    const counts = Object.fromEntries(GROUPS.map((g) => [g, books().filter((b) => groupOf(b.firstChapter) === g).length]));
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(66);
  });
});
