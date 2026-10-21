// The light sculpture (/arcos) computes in the browser what it lights and counts, from public/data (the same files as
// the sky of links). These tests check those numbers against the pipeline's, and the 3D geometry and camera the page
// relies on: arcs that start and end on their verses, planes by kind of link, framing that fits, picking that finds.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import { buildGeometry, decodeArcs, HERO_VOTES, indexByChapter, type ArcSet, type ChapterIndex, type Geometry, type SkyMeta } from "../src/components/sky/model";
import { arcColors, arcGeometry, axisLines, chapterLinks, litVerse, newTestament, pairAngle, partnersFromLinks, partnersOf, verseAxis } from "../src/components/sculpture/arcs";
import { HOME_ORBIT, homeArea, homeBox, NT_START } from "../src/components/sculpture/home";
import { arcUnderPointer, axisUnderPointer, mixView } from "../src/components/sculpture/interaction";
import {
  arcPoint,
  boxProjection,
  exposureZoom,
  FLAT,
  fitOrbit,
  HOME,
  HOME_ASPECT,
  project,
  sculptureOutline,
  viewMatrix,
  type Orbit,
  type Vec3,
} from "../src/components/sculpture/space";
import { hashOf, parseHash, verseOf } from "../src/components/sculpture/state";
import { books, summary } from "./generated";

const pub = (f: string) => join(OUT.publicData, f);
const asBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

let meta: SkyMeta;
let geo: Geometry;
let full: ArcSet;
let idx: ChapterIndex;
let nt: Uint8Array;
beforeAll(() => {
  meta = JSON.parse(readFileSync(pub("sky.json"), "utf8")) as SkyMeta;
  geo = buildGeometry(meta);
  full = decodeArcs(asBuffer(readFileSync(pub(meta.files.full.file))), true);
  idx = indexByChapter(geo, full);
  nt = newTestament(meta, geo);
});

describe("sculpture data", () => {
  it("marks the New Testament's verses, as many as its books hold", () => {
    const ntVerses = books()
      .filter((b) => b.testament === "NT")
      .reduce((s, b) => s + b.verses.reduce((a, v) => a + v, 0), 0);
    expect(nt.reduce((s, v) => s + v, 0)).toBe(ntVerses);
    const first = books().find((b) => b.testament === "NT")!.firstVerse;
    expect(nt[first - 1]).toBe(0);
    expect(nt[first]).toBe(1);
  });

  it("lists every partner of a verse, as the reading pages count them", () => {
    const top = summary().topVerses[0];
    expect(partnersOf(full, top.gv).length).toBe(top.links);
    // the verse-links file of each chapter gives the same partners and votes as arcs.bin, for a sample of chapters
    for (const b of books().filter((_, i) => i % 6 === 0)) {
      const c = Math.ceil(b.verses.length / 2);
      const links = JSON.parse(readFileSync(pub(join("verse-links", b.slug, `${c}.json`)), "utf8")) as number[][];
      links.forEach((flat, v) => {
        const gv = verseOf(b, c, v + 1);
        expect(partnersFromLinks(flat), `${b.slug} ${c}:${v + 1}`).toEqual(partnersOf(full, gv));
      });
    }
  });

  it("counts a chapter's links as the sky of links does (distinct verse pairs touching it)", () => {
    for (let c = 0; c < geo.nch; c++) expect(chapterLinks(geo, full, idx, c).length).toBe(geo.chapterPairs[c]);
  });

  it("orders lists by votes, then canonical order", () => {
    const list = partnersOf(full, summary().topVerses[0].gv);
    for (let i = 1; i < list.length; i++) {
      const [p, q] = [list[i - 1], list[i]];
      expect(p.votes > q.votes || (p.votes === q.votes && p.gv < q.gv)).toBe(true);
    }
  });

  it.each(["livros", "testamento", "distancia"] as const)("keeps the most voted links as hero strands in %s mode", (mode) => {
    const colors = arcColors(geo, full, nt, "noite", mode);
    let heroes = 0;
    for (let k = 0; k < full.n; k++) if (colors[k * 4 + 3] === 1) heroes++;
    expect(heroes).toBe(Array.from(full.votes).filter((v) => v >= HERO_VOTES).length);
  });

  it("lights a verse's arcs in exactly the planes the sculpture gives them", () => {
    const gv = summary().topVerses[0].gv;
    const partners = partnersOf(full, gv);
    const lit = litVerse(geo, nt, gv, partners, -1);
    const all = arcGeometry(geo, full, nt);
    for (let k = 0; k < full.n; k++) {
      if (full.a[k] !== gv && full.b[k] !== gv) continue;
      const other = full.a[k] === gv ? full.b[k] : full.a[k];
      const i = partners.findIndex((p) => p.gv === other);
      expect(lit.geo[i * 4 + 2]).toBeCloseTo(all[k * 4 + 2], 6);
    }
  });

  it("marks the 65 book boundaries on the axis, the one between the Testaments taller", () => {
    const { ticks } = axisLines(meta, geo, []);
    expect(ticks.length / 8).toBe(meta.books.length - 1);
    const tall: number[] = [];
    for (let i = 0; i < ticks.length; i += 8) if (ticks[i + 5] > 0.02) tall.push(ticks[i]);
    expect(tall.length).toBe(1);
    expect(tall[0]).toBeCloseTo(NT_START, 6);
  });
});

describe("sculpture geometry", () => {
  it("runs every arc from its first verse to its second, at FLAT times its radius at the top", () => {
    for (const [xa, xb, th] of [[-0.8, 0.4, 1.2], [0.5, -0.1, -2], [0.9, 0.95, 0]]) {
      const a = arcPoint(xa, xb, th, 0), b = arcPoint(xa, xb, th, 1), top = arcPoint(xa, xb, th, 0.5);
      // a lit arc grows from t = 0, the lit verse, whichever side of it the partner is
      expect(a[0]).toBeCloseTo(xa, 9);
      expect(b[0]).toBeCloseTo(xb, 9);
      expect(Math.hypot(a[1], a[2]) + Math.hypot(b[1], b[2])).toBeCloseTo(0, 9);
      expect(Math.hypot(top[1], top[2])).toBeCloseTo((Math.abs(xb - xa) / 2) * FLAT, 9);
    }
  });

  it("raises the bridges between the Testaments and hangs the links inside each one below the axis", () => {
    const sample = (rel: 0 | 1 | 2) => {
      const out: Vec3[] = [];
      for (let k = 0; k < full.n; k += 97) {
        const a = full.a[k], b = full.b[k];
        const r = nt[a] !== nt[b] ? 2 : nt[a] ? 1 : 0;
        if (r === rel) out.push(arcPoint(verseAxis(geo, a), verseAxis(geo, b), pairAngle(geo, nt, a, b), 0.5));
      }
      return out;
    };
    for (const p of sample(2)) expect(p[1]).toBeGreaterThan(0);
    for (const p of sample(0)) expect(p[1]).toBeLessThan(0);
    for (const p of sample(1)) expect(p[1]).toBeLessThan(0);
  });

  it("gives every pair the same plane on every load", () => {
    const a = arcGeometry(geo, full, nt), b = arcGeometry(geo, full, nt);
    expect(a).toEqual(b);
  });
});

describe("sculpture camera", () => {
  it("frames the whole sculpture in its opening box, with no room to spare", () => {
    const outline = sculptureOutline(NT_START);
    const fits = (dist: number) => {
      const m = boxProjection({ ...HOME_ORBIT, dist }, HOME_ASPECT);
      return outline.every((p) => {
        const s = project(m, p, 2, 2);
        return s.front && Math.abs(s.x - 1) <= 1 && Math.abs(s.y - 1) <= 1;
      });
    };
    expect(HOME_ORBIT.yaw).toBe(HOME.yaw);
    expect(HOME_ORBIT.pitch).toBe(HOME.pitch);
    expect(fits(HOME_ORBIT.dist)).toBe(true);
    expect(fits(HOME_ORBIT.dist * 0.85)).toBe(false);
  });

  it("puts the opening box in the free area of the stage, at its aspect", () => {
    for (const [w, h] of [[1352, 836], [936, 704], [375, 683], [414, 760]]) {
      const area = homeArea(w, h), box = homeBox(w, h);
      expect(box.w / box.h).toBeCloseTo(HOME_ASPECT, 9);
      expect(box.x).toBeGreaterThanOrEqual(area.x - 1e-9);
      expect(box.y).toBeGreaterThanOrEqual(area.y - 1e-9);
      expect(box.x + box.w).toBeLessThanOrEqual(area.x + area.w + 1e-9);
      expect(box.y + box.h).toBeLessThanOrEqual(area.y + area.h + 1e-9);
    }
  });

  it("draws the box's picture into the box: the target lands at the box's middle", () => {
    const box = { x: 500, y: 90, w: 800, h: 470 };
    const m = viewMatrix({ orbit: HOME_ORBIT, box }, 1352, 836);
    const s = project(m, HOME_ORBIT.target, 1352, 836);
    expect(s.x).toBeCloseTo(box.x + box.w / 2, 3);
    expect(s.y).toBeCloseTo(box.y + box.h / 2, 3);
  });

  it("fits a selection's points inside its picture", () => {
    const pts: Vec3[] = [arcPoint(-0.2, 0.7, 1.5, 0), arcPoint(-0.2, 0.7, 1.5, 0.5), arcPoint(-0.2, 0.7, 1.5, 1), arcPoint(0.1, 0.3, -1, 0.5)];
    const o = fitOrbit(pts, HOME, 1.3, 0.06);
    const m = boxProjection(o, 1.3);
    for (const p of pts) {
      const s = project(m, p, 2, 2);
      expect(Math.abs(s.x - 1)).toBeLessThanOrEqual(0.88 + 1e-6);
      expect(Math.abs(s.y - 1)).toBeLessThanOrEqual(0.88 + 1e-6);
    }
  });

  it("centres the picture of the points in its box, not their 3D middle", () => {
    const bounds = (o: Orbit, pts: readonly Vec3[], aspect: number) => {
      const m = boxProjection(o, aspect);
      const xs = pts.map((p) => project(m, p, 2, 2).x - 1), ys = pts.map((p) => project(m, p, 2, 2).y - 1);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    };
    const outline = sculptureOutline(NT_START);
    const home = bounds(HOME_ORBIT, outline, HOME_ASPECT);
    expect(Math.abs(home.x0 + home.x1) / 2).toBeLessThan(0.005);
    expect(Math.abs(home.y0 + home.y1) / 2).toBeLessThan(0.005);
    // and as large as the margin allows: one pair of sides touches it (0.03 of the box on each side)
    expect(Math.max(home.x1 - home.x0, home.y1 - home.y0)).toBeCloseTo(2 * 0.94, 2);
    const pts: Vec3[] = [arcPoint(-0.9, 0.95, 1.4, 0.5), arcPoint(-0.9, 0.95, 1.4, 0), arcPoint(-0.9, 0.95, 1.4, 1), arcPoint(0.4, 0.9, -2.2, 0.5)];
    const sel = bounds(fitOrbit(pts, { ...HOME, yaw: -0.38 }, 1.3, 0.06), pts, 1.3);
    expect(Math.abs(sel.x0 + sel.x1) / 2).toBeLessThan(0.005);
    expect(Math.abs(sel.y0 + sel.y1) / 2).toBeLessThan(0.005);
  });

  it("keeps the light of the measured view, and flies between views without spinning the long way", () => {
    expect(exposureZoom(836, 2.41)).toBeCloseTo(1, 9);
    expect(exposureZoom(418, 2.41)).toBeCloseTo(2, 9);
    const a = { orbit: { ...HOME, yaw: 3 }, box: { x: 0, y: 0, w: 100, h: 50 } };
    const b = { orbit: { ...HOME, yaw: -3 }, box: { x: 100, y: 20, w: 200, h: 100 } };
    const mid = mixView(a, b, 0.5);
    expect(Math.abs(mid.orbit.yaw - Math.PI)).toBeLessThan(0.3);
    expect(mid.box).toEqual({ x: 50, y: 10, w: 150, h: 75 });
  });

  it("finds the axis and the lit arcs under the pointer", () => {
    const m = viewMatrix({ orbit: HOME_ORBIT, box: { x: 0, y: 0, w: 1360, h: 800 } }, 1360, 800);
    for (const x of [-0.9, -0.2, 0.55]) {
      const s = project(m, [x, 0, 0], 1360, 800);
      const hit = axisUnderPointer(m, 1360, 800, s.x, s.y);
      expect(hit.dist).toBeLessThan(0.5);
      expect(hit.x).toBeCloseTo(x, 2);
    }
    const arcs = new Float32Array([-0.6, 0.2, 1.4, 1, 0.1, 0.8, -1.2, 1]);
    const p = project(m, arcPoint(0.1, 0.8, -1.2, 0.4), 1360, 800);
    const hit = arcUnderPointer(m, 1360, 800, arcs, 2, p.x, p.y, 9);
    expect(hit.i).toBe(1);
    expect(hit.dist).toBeLessThan(1.5);
    expect(arcUnderPointer(m, 1360, 800, arcs, 2, 5, 5, 9).i).toBe(-1);
  });
});

describe("sculpture addresses", () => {
  it("writes and reads every book's first and last verse, and its chapters", () => {
    for (const b of books()) {
      const last = b.verses.length;
      for (const [c, v] of [[1, 1], [last, b.verses[last - 1]]]) {
        const sel = { kind: "verse" as const, gv: verseOf(b, c, v) };
        expect(hashOf(sel)).toBe(`#${b.slug}/${c}/${v}`);
        expect(parseHash(hashOf(sel))).toEqual(sel);
      }
      const ch = { kind: "chapter" as const, ci: b.firstChapter + last - 1 };
      expect(parseHash(hashOf(ch))).toEqual(ch);
    }
  });

  it("refuses addresses that are not a verse or a chapter of the grid", () => {
    for (const h of ["", "#", "#isaias", "#isaias/67", "#isaias/53/13", "#xyz/1", "#isaias/0", "#isaias/53/5/1", "#%E0%A4%A"]) expect(parseHash(h), h).toBeNull();
  });
});
