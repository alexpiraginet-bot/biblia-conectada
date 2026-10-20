// From the pipeline's files (public/data/sky.json + arcs.bin, the same ones the sky of links reads) to what the
// sculpture's renderer draws: every pair placed in 3D, coloured by testament or by distance, and the lit arcs of a
// selection. Pure functions, no DOM; tests/sculpture.test.ts checks them against the pipeline's numbers.
import { arcTone, arcWeight, HERO_VOTES, type ArcSet, type ChapterIndex, type Geometry, type SkyMeta } from "../sky/model";
import type { AxisGroup } from "./groups";
import type { ArcBuffers, AxisLines, ColorMode, Lit, Theme } from "./renderer";
import { arcAngle, axisX, pairJitter, relation, type Rel } from "./space";

/** 1 for every verse of the New Testament, from the book table */
export function newTestament(meta: SkyMeta, geo: Geometry): Uint8Array {
  const nt = new Uint8Array(geo.nverses);
  for (let c = 0; c < geo.nch; c++) {
    if (meta.books[geo.chapterBook[c]][5] === "NT") nt.fill(1, geo.chapterFirst[c], geo.chapterFirst[c] + geo.chapterVerses[c]);
  }
  return nt;
}

/** Place on the axis of a verse, in [-1, 1] */
export const verseAxis = (geo: Geometry, gv: number) => axisX(geo.xOfGv[gv]);

/** Place on the axis of a chapter's middle, in [-1, 1] */
export const chapterAxis = (geo: Geometry, ci: number) => axisX((ci + 0.5) / geo.nch);

export function pairAngle(geo: Geometry, nt: Uint8Array, a: number, b: number): number {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return arcAngle(relation(nt[lo] === 1, nt[hi] === 1), verseAxis(geo, lo), verseAxis(geo, hi), pairJitter(lo, hi));
}

// ---------------------------------------------------------------- colours

// The light each kind of arc gives on the night ground. In Dia the renderer turns light into ink (each channel
// absorbs what it lacks), so Dia's "light" is the complement of the ink wanted: bronze, deep blue and graphite.
const TESTAMENT: Record<Theme, Record<Rel, [number, number, number]>> = {
  noite: { 0: [0.98, 0.66, 0.28], 1: [0.56, 0.71, 1.0], 2: [1.0, 0.84, 0.56] },
  dia: { 0: [0.55, 0.76, 1.0], 1: [0.92, 0.8, 0.5], 2: [0.6, 0.62, 0.66] },
};

// film.py's stained glass (sky/shaders.ts PALETTE): blue for near links, through violet and red, to gold for far ones
const GLASS: [number, number, number][] = [
  [0.16, 0.5, 1.0],
  [0.14, 0.26, 1.0],
  [0.55, 0.2, 1.0],
  [1.0, 0.16, 0.4],
  [1.0, 0.5, 0.12],
  [1.0, 0.82, 0.36],
];
const GLASS_T = [0, 0.22, 0.42, 0.62, 0.8, 1];
export function glass(t: number): [number, number, number] {
  const x = Math.min(Math.max(t, 0), 1);
  let i = 0;
  while (i < GLASS_T.length - 2 && x > GLASS_T[i + 1]) i++;
  const f = (x - GLASS_T[i]) / (GLASS_T[i + 1] - GLASS_T[i]);
  const a = GLASS[i], b = GLASS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Colour and hero flag of every arc, in file order: (r, g, b, hero). */
export function arcColors(geo: Geometry, set: ArcSet, nt: Uint8Array, theme: Theme, mode: ColorMode): Float32Array {
  const out = new Float32Array(set.n * 4);
  const tone = TESTAMENT[theme];
  for (let k = 0; k < set.n; k++) {
    const a = set.a[k], b = set.b[k];
    let c: [number, number, number];
    if (mode === "testamento") c = tone[relation(nt[a] === 1, nt[b] === 1)];
    else {
      const g = glass(arcTone(Math.abs(geo.xOfGv[b] - geo.xOfGv[a])));
      c = theme === "dia" ? [1 - g[0] * 0.85, 1 - g[1] * 0.85, 1 - g[2] * 0.85] : g;
    }
    out[k * 4] = c[0];
    out[k * 4 + 1] = c[1];
    out[k * 4 + 2] = c[2];
    out[k * 4 + 3] = set.votes[k] >= HERO_VOTES ? 1 : 0;
  }
  return out;
}

/** Geometry of every arc, in file order: (xa, xb, theta, weight). */
export function arcGeometry(geo: Geometry, set: ArcSet, nt: Uint8Array): Float32Array {
  const out = new Float32Array(set.n * 4);
  for (let k = 0; k < set.n; k++) {
    const a = set.a[k], b = set.b[k];
    out[k * 4] = verseAxis(geo, a);
    out[k * 4 + 1] = verseAxis(geo, b);
    out[k * 4 + 2] = pairAngle(geo, nt, a, b);
    out[k * 4 + 3] = arcWeight(set.votes[k]);
  }
  return out;
}

export function arcBuffers(geo: Geometry, set: ArcSet, nt: Uint8Array, theme: Theme, mode: ColorMode): ArcBuffers {
  return { geo: arcGeometry(geo, set, nt), color: arcColors(geo, set, nt, theme, mode), votes: set.votes, n: set.n };
}

// ---------------------------------------------------------------- what is lit

/** A linked verse of the selection: its global index and the votes of the link (sum of both directions). */
export type Partner = { gv: number; votes: number };

/** The lit arcs of one verse: from it to every partner, in the planes the sculpture gives those pairs. */
export function litVerse(geo: Geometry, nt: Uint8Array, gv: number, partners: readonly Partner[], focus: number): Lit {
  const n = partners.length;
  const g = new Float32Array(n * 4);
  const flags = new Float32Array(n * 4);
  const x = verseAxis(geo, gv);
  partners.forEach((p, i) => {
    g[i * 4] = x;
    g[i * 4 + 1] = verseAxis(geo, p.gv);
    g[i * 4 + 2] = pairAngle(geo, nt, gv, p.gv);
    g[i * 4 + 3] = 1;
    flags[i * 4 + 3] = i === focus ? 1 : 0;
  });
  return { geo: g, flags, n, at: x };
}

/** Focus flags for the same lit arcs, with arc `focus` (or none, -1) in focus. */
export function focusFlags(n: number, focus: number): Float32Array {
  const flags = new Float32Array(n * 4);
  if (focus >= 0 && focus < n) flags[focus * 4 + 3] = 1;
  return flags;
}

/** Every partner of a verse in a loaded arc set, most votes first (then canonical order). */
export function partnersOf(set: ArcSet, gv: number): Partner[] {
  const out: Partner[] = [];
  for (let k = 0; k < set.n; k++) {
    if (set.a[k] === gv) out.push({ gv: set.b[k], votes: set.votes[k] });
    else if (set.b[k] === gv) out.push({ gv: set.a[k], votes: set.votes[k] });
  }
  return out.sort((p, q) => q.votes - p.votes || p.gv - q.gv);
}

/** The partners from a chapter's verse-links file (public/data/verse-links/<slug>/<cap>.json): [gv, votes, …]. */
export function partnersFromLinks(flat: readonly number[]): Partner[] {
  const out: Partner[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ gv: flat[i], votes: flat[i + 1] });
  return out.sort((p, q) => q.votes - p.votes || p.gv - q.gv);
}

/** A link from a verse of a chapter to a verse elsewhere (or in the same chapter), with its votes. */
export type ChapterLink = { here: number; there: number; votes: number };

/** Every loaded arc touching chapter `ci`, from its verse in the chapter, most votes first (then canonical order). */
export function chapterLinks(geo: Geometry, set: ArcSet, idx: ChapterIndex, ci: number): ChapterLink[] {
  const out: ChapterLink[] = [];
  for (let p = idx.offsets[ci]; p < idx.offsets[ci + 1]; p++) {
    const k = idx.arcs[p];
    const a = set.a[k], b = set.b[k];
    const aIn = geo.chapOfGv[a] === ci;
    out.push({ here: aIn ? a : b, there: aIn ? b : a, votes: set.votes[k] });
  }
  return out.sort((p, q) => q.votes - p.votes || p.here - q.here || p.there - q.there);
}

/** A readable chapter constellation: the strongest real pair for each destination chapter, in vote order.
 * The complete list remains available in the reading panel; no synthetic edge is introduced. */
export function chapterHighlights(geo: Geometry, links: readonly ChapterLink[], limit = 32): ChapterLink[] {
  const seen = new Set<number>();
  const out: ChapterLink[] = [];
  if (limit <= 0) return out;
  for (const link of [...links].sort((a, b) => b.votes - a.votes || a.there - b.there || a.here - b.here)) {
    const chapter = geo.chapOfGv[link.there];
    if (seen.has(chapter)) continue;
    seen.add(chapter);
    out.push(link);
    if (out.length >= limit) break;
  }
  return out;
}

/** Lit arcs for a list of chapter links (the chapter's own light, or a preview of it). */
export function litLinks(geo: Geometry, nt: Uint8Array, links: readonly ChapterLink[], at: number): Lit {
  const g = new Float32Array(links.length * 4);
  links.forEach((l, i) => {
    g[i * 4] = verseAxis(geo, l.here);
    g[i * 4 + 1] = verseAxis(geo, l.there);
    g[i * 4 + 2] = pairAngle(geo, nt, l.here, l.there);
    g[i * 4 + 3] = 1;
  });
  return { geo: g, flags: new Float32Array(links.length * 4), n: links.length, at };
}

/** where the bands of the book groups run under the axis (units of the axis half length), and the gap between bands */
export const GROUP_BAND = { top: -0.026, bottom: -0.034, gap: 0.0035 } as const;

/**
 * The axis, the book boundaries (LINES) and, under the axis, one band per book group (TRIANGLES, the groups taking
 * turns at two strengths so neighbours read apart even where the gap between them is a pixel): (x, y, z, alpha).
 */
export function axisLines(meta: SkyMeta, geo: Geometry, groups: readonly AxisGroup[]): AxisLines {
  const axis = new Float32Array([-1, 0, 0, 1, 1, 0, 0, 1]);
  const ticks: number[] = [];
  meta.books.forEach((b, i) => {
    if (i === 0) return;
    const x = axisX(b[3] / geo.nch);
    // the boundary between the Testaments stands taller
    const h = b[5] === "NT" && meta.books[i - 1][5] === "AT" ? 0.04 : 0.012;
    ticks.push(x, -h, 0, 1, x, h, 0, 1);
  });
  const bands: number[] = [];
  groups.forEach((g, k) => {
    const x0 = axisX(g.first / geo.nch) + GROUP_BAND.gap / 2;
    const x1 = axisX(g.end / geo.nch) - GROUP_BAND.gap / 2;
    const a = k % 2 === 0 ? 1 : 0.62;
    const { top: y0, bottom: y1 } = GROUP_BAND;
    bands.push(x0, y0, 0, a, x1, y0, 0, a, x1, y1, 0, a, x0, y0, 0, a, x1, y1, 0, a, x0, y1, 0, a);
  });
  return { axis, ticks: new Float32Array(ticks), bands: new Float32Array(bands) };
}

// ---------------------------------------------------------------- a path between two verses

/** One hop of a path: the verse it leaves, the verse it reaches, and the votes of that link. */
export type Hop = { from: number; to: number; votes: number };

/** The lit arcs of a path: every hop in its pair's plane, from one step to the next, each growing after the one
 *  before (its share of the growth), so the light walks from the first verse to the last. */
export function litPath(geo: Geometry, nt: Uint8Array, hops: readonly Hop[], focus = -1): Lit {
  const n = hops.length;
  const g = new Float32Array(n * 4);
  const flags = new Float32Array(n * 4);
  hops.forEach((h, i) => {
    g[i * 4] = verseAxis(geo, h.from);
    g[i * 4 + 1] = verseAxis(geo, h.to);
    g[i * 4 + 2] = pairAngle(geo, nt, h.from, h.to);
    g[i * 4 + 3] = 1;
    flags[i * 4] = i / n;
    flags[i * 4 + 1] = 1 / n;
    flags[i * 4 + 3] = i === focus ? 1 : 0;
  });
  return { geo: g, flags, n, at: n ? verseAxis(geo, hops[0].from) : null };
}

/** Focus flags for a path's arcs (their shares of the growth kept), with hop `focus` (or none, -1) in focus. */
export function pathFlags(n: number, focus: number): Float32Array {
  const flags = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    flags[i * 4] = i / n;
    flags[i * 4 + 1] = 1 / n;
    flags[i * 4 + 3] = i === focus ? 1 : 0;
  }
  return flags;
}

// ---------------------------------------------------------------- the verses of a word

/** The loaded arcs between two verses that both have the word (`has[gv] === 1`), most voted first, and how many. */
export function wordLinks(set: ArcSet, has: Uint8Array): { a: number; b: number; votes: number }[] {
  const out: { a: number; b: number; votes: number }[] = [];
  for (let k = 0; k < set.n; k++) if (has[set.a[k]] === 1 && has[set.b[k]] === 1) out.push({ a: set.a[k], b: set.b[k], votes: set.votes[k] });
  return out;
}

/** Lit arcs for a word: the first `cap` of its links (the most voted), all at once, no lit verse. */
export function litWord(geo: Geometry, nt: Uint8Array, links: readonly { a: number; b: number }[], cap: number): Lit {
  const n = Math.min(links.length, cap);
  const g = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const l = links[i];
    g[i * 4] = verseAxis(geo, l.a);
    g[i * 4 + 1] = verseAxis(geo, l.b);
    g[i * 4 + 2] = pairAngle(geo, nt, l.a, l.b);
    g[i * 4 + 3] = 1;
  }
  return { geo: g, flags: new Float32Array(n * 4), n, at: null };
}

/** A short mark across the axis at every verse of the word (LINES), to glow with the lit layer. */
export function wordMarks(geo: Geometry, verses: ArrayLike<number>, h = 0.022): Float32Array {
  const out = new Float32Array(verses.length * 8);
  for (let i = 0; i < verses.length; i++) {
    const x = verseAxis(geo, verses[i]);
    out.set([x, -h, 0, 1, x, h, 0, 1], i * 8);
  }
  return out;
}
