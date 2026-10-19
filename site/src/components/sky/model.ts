// The sky of links (/arcos): data model shared by the client wrapper, the WebGL canvas, the server page, the poster
// script and the tests. Pure functions only, no DOM. Layout from video 1 (estudos/biblia-referencias/arcs.py):
// x in [0, 1] runs from Gênesis 1:1 to Apocalipse 22:21, chapters equally spaced, each verse offset inside its chapter;
// every verse pair is a semicircle over the baseline.

/** public/data/sky.json, written by scripts/build-data.ts */
export type SkyMeta = {
  counts: { arcs: number; verses: number; chapters: number; crossrefRows: number };
  files: { head: { file: string; count: number; minVotes: number }; full: { file: string; count: number } };
  /** per chapter: book index, chapter number, first global verse, verses, distinct verse pairs touching it */
  chapters: [number, number, number, number, number][];
  /** per book: name, slug, abbreviation, first global chapter, chapters, testament */
  books: [string, string, string, number, number, "AT" | "NT"][];
  topVerses: { gv: number; ref: string; path: string; links: number }[];
};

/** The 66 books as the wrapper needs them before sky.json arrives: name, slug, chapters, first global chapter. */
export type BookRow = [name: string, slug: string, chapters: number, firstChapter: number, testament: "AT" | "NT"];

export type Selection = { kind: "verse"; gv: number } | { kind: "chapter"; ci: number };

export type Geometry = {
  nch: number;
  nverses: number;
  books: BookRow[];
  chapterBook: Uint8Array;
  chapterNo: Uint16Array;
  chapterFirst: Uint32Array;
  chapterVerses: Uint16Array;
  chapterPairs: Uint32Array;
  chapOfGv: Uint16Array;
  /** x of each verse on the baseline, in [0, 1] */
  xOfGv: Float32Array;
};

export function bookRows(meta: Pick<SkyMeta, "books">): BookRow[] {
  return meta.books.map(([name, slug, , first, n, t]) => [name, slug, n, first, t]);
}

export function buildGeometry(meta: SkyMeta): Geometry {
  const nch = meta.chapters.length;
  const nverses = meta.counts.verses;
  const g: Geometry = {
    nch,
    nverses,
    books: bookRows(meta),
    chapterBook: new Uint8Array(nch),
    chapterNo: new Uint16Array(nch),
    chapterFirst: new Uint32Array(nch),
    chapterVerses: new Uint16Array(nch),
    chapterPairs: new Uint32Array(nch),
    chapOfGv: new Uint16Array(nverses),
    xOfGv: new Float32Array(nverses),
  };
  meta.chapters.forEach(([book, no, first, verses, pairs], c) => {
    g.chapterBook[c] = book;
    g.chapterNo[c] = no;
    g.chapterFirst[c] = first;
    g.chapterVerses[c] = verses;
    g.chapterPairs[c] = pairs;
    for (let v = 0; v < verses; v++) {
      g.chapOfGv[first + v] = c;
      g.xOfGv[first + v] = (c + (v + 0.5) / verses) / nch;
    }
  });
  return g;
}

/** arcs.bin / sky-head.bin: uint16 a[N] | uint16 b[N] | int16 votes[N], little-endian, a < b, sorted by votes desc */
export type ArcSet = { n: number; a: Uint16Array; b: Uint16Array; votes: Int16Array; full: boolean };

export function decodeArcs(buf: ArrayBuffer, full: boolean): ArcSet {
  if (buf.byteLength % 6 !== 0) throw new Error("arc file is not a multiple of 6 bytes");
  const n = buf.byteLength / 6;
  const le = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  if (!le) {
    // big-endian hosts (none in practice): decode through a DataView
    const dv = new DataView(buf);
    const a = new Uint16Array(n), b = new Uint16Array(n), votes = new Int16Array(n);
    for (let k = 0; k < n; k++) {
      a[k] = dv.getUint16(k * 2, true);
      b[k] = dv.getUint16(n * 2 + k * 2, true);
      votes[k] = dv.getInt16(n * 4 + k * 2, true);
    }
    return { n, a, b, votes, full };
  }
  return { n, a: new Uint16Array(buf, 0, n), b: new Uint16Array(buf, n * 2, n), votes: new Int16Array(buf, n * 4, n), full };
}

/** Arcs touching each chapter (CSR). An arc inside one chapter is listed once. */
export type ChapterIndex = { offsets: Uint32Array; arcs: Uint32Array };

export function indexByChapter(geo: Geometry, set: ArcSet): ChapterIndex {
  const counts = new Uint32Array(geo.nch + 1);
  for (let k = 0; k < set.n; k++) {
    const ca = geo.chapOfGv[set.a[k]], cb = geo.chapOfGv[set.b[k]];
    counts[ca + 1]++;
    if (cb !== ca) counts[cb + 1]++;
  }
  for (let c = 0; c < geo.nch; c++) counts[c + 1] += counts[c];
  const offsets = counts.slice();
  const fill = counts.slice(0, geo.nch);
  const arcs = new Uint32Array(offsets[geo.nch]);
  for (let k = 0; k < set.n; k++) {
    const ca = geo.chapOfGv[set.a[k]], cb = geo.chapOfGv[set.b[k]];
    arcs[fill[ca]++] = k;
    if (cb !== ca) arcs[fill[cb]++] = k;
  }
  return { offsets, arcs };
}

/** Stained-glass tone of an arc by span, as in film.py: t = clip(span, 0, 1) ^ 0.55 */
export function arcTone(span: number): number {
  return Math.pow(Math.min(Math.max(span, 0), 1), 0.55);
}

/** Per-arc light weight by votes, as in arcs.py: 0.55 + 0.45 * clip(log1p(max(votes, 0)) / log1p(150), 0, 1) */
export function arcWeight(votes: number): number {
  return 0.55 + 0.45 * Math.min(Math.max(Math.log1p(Math.max(votes, 0)) / Math.log1p(150), 0), 1);
}

/** Votes from which film.py draws an arc as a crisper "hero" strand */
export const HERO_VOTES = 25;

export type Ranked = { ci: number; count: number };
export type TopList = {
  items: Ranked[];
  /** chapters past the cut that tie with the last item shown */
  tiedBeyond: number;
};

/** Top chapters by count (count desc, canonical order inside a tie), cut at k with the tie past the cut reported. */
export function rankChapters(counts: Map<number, number>, k = 8): TopList {
  const all = [...counts.entries()].map(([ci, count]) => ({ ci, count })).sort((x, y) => y.count - x.count || x.ci - y.ci);
  const items = all.slice(0, k);
  const last = items.at(-1)?.count;
  const tiedBeyond = last === undefined ? 0 : all.slice(k).filter((r) => r.count === last).length;
  return { items, tiedBeyond };
}

/** Chapters linked to chapter `ci` by the loaded arcs: verse pairs between them, the chapter itself excluded. */
export function linkedChapters(geo: Geometry, set: ArcSet, idx: ChapterIndex, ci: number, k = 8): TopList {
  const counts = new Map<number, number>();
  for (let p = idx.offsets[ci]; p < idx.offsets[ci + 1]; p++) {
    const arc = idx.arcs[p];
    const ca = geo.chapOfGv[set.a[arc]], cb = geo.chapOfGv[set.b[arc]];
    const other = ca === ci ? cb : ca;
    if (other !== ci) counts.set(other, (counts.get(other) ?? 0) + 1);
  }
  return rankChapters(counts, k);
}

/** Chapters holding the partners of one verse (each partner counted once). */
export function partnerChapters(chapterOf: (gv: number) => number, partners: readonly number[], k = 8): TopList {
  const counts = new Map<number, number>();
  for (const gv of partners) {
    const c = chapterOf(gv);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return rankChapters(counts, k);
}

/** Gold layer of a selection. arcs: (xSel, xPartner, weight, 0) per arc, x in [0, 1]. */
export type Highlight = {
  arcs: Float32Array;
  n: number;
  /** light point on the baseline, x in [0, 1] */
  x: number;
  /** the opening verse: bigger point with rays */
  verse: boolean;
  /** chapter whose tick turns gold, or -1 */
  tick: number;
};

/** The arcs to light for a selection: every partner of the verse, or every loaded arc touching the chapter. */
export function highlightFor(
  geo: Geometry,
  sel: Selection,
  partners: readonly number[],
  set: ArcSet | null,
  idx: ChapterIndex | null,
): Highlight {
  if (sel.kind === "verse") {
    const x = geo.xOfGv[sel.gv];
    const arcs = new Float32Array(partners.length * 4);
    partners.forEach((gv, k) => {
      arcs[k * 4] = x;
      arcs[k * 4 + 1] = geo.xOfGv[gv];
      arcs[k * 4 + 2] = 1;
    });
    return { arcs, n: partners.length, x, verse: true, tick: -1 };
  }
  const ci = sel.ci;
  const x = (ci + 0.5) / geo.nch;
  if (!set || !idx) return { arcs: new Float32Array(0), n: 0, x, verse: false, tick: ci };
  const from = idx.offsets[ci], to = idx.offsets[ci + 1];
  const arcs = new Float32Array((to - from) * 4);
  for (let p = from; p < to; p++) {
    const k = idx.arcs[p];
    const a = set.a[k], b = set.b[k];
    const aIn = geo.chapOfGv[a] === ci;
    const d = (p - from) * 4;
    arcs[d] = geo.xOfGv[aIn ? a : b];
    arcs[d + 1] = geo.xOfGv[aIn ? b : a];
    // lit arcs are all the same gold, as in film.py; the number in text carries the count
    arcs[d + 2] = 1;
  }
  return { arcs, n: to - from, x, verse: false, tick: ci };
}

/** Global chapter index -> [book index, chapter number] using the book table only. */
export function locateChapter(books: readonly BookRow[], ci: number): [number, number] {
  let lo = 0, hi = books.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (books[mid][3] <= ci) lo = mid;
    else hi = mid - 1;
  }
  return [lo, ci - books[lo][3] + 1];
}

export function chapterName(books: readonly BookRow[], ci: number): string {
  const [b, n] = locateChapter(books, ci);
  return `${books[b][0]} ${n}`;
}

export function chapterPath(books: readonly BookRow[], ci: number): string {
  const [b, n] = locateChapter(books, ci);
  return `/${books[b][1]}/${n}`;
}

/** URL fragment of a selection: "#isaias/9" for a chapter; the initial verse has no fragment. */
export function selectionHash(books: readonly BookRow[], sel: Selection): string {
  if (sel.kind === "verse") return "";
  const [b, n] = locateChapter(books, sel.ci);
  return `#${books[b][1]}/${n}`;
}

/** "#isaias/9" -> global chapter index, or null when the fragment is not a chapter of the grid. */
export function parseSelectionHash(books: readonly BookRow[], hash: string): number | null {
  const m = /^#?([a-z0-9-]+)\/(\d{1,3})$/.exec(decodeURIComponent(hash.trim()).toLowerCase());
  if (!m) return null;
  const book = books.find((b) => b[1] === m[1]);
  const n = Number(m[2]);
  if (!book || n < 1 || n > book[2]) return null;
  return book[3] + n - 1;
}

/** Keyboard/stepper moves along the baseline. From a verse selection the moves start at the verse's chapter. */
export function stepChapter(books: readonly BookRow[], nch: number, from: number, delta: number, byBook: boolean): number {
  if (!byBook) return Math.min(Math.max(from + delta, 0), nch - 1);
  const [b] = locateChapter(books, from);
  const nb = Math.min(Math.max(b + delta, 0), books.length - 1);
  return books[nb][3];
}

/** Chapter under a point of the band: x in [0, 1] of the baseline. */
export function chapterAt(nch: number, x: number): number {
  return Math.min(nch - 1, Math.max(0, Math.floor(x * nch)));
}

/** Band geometry, in units of the band width (the poster and the canvas share it). */
export const BAND = {
  /** height / width */
  aspect: 0.625,
  /** baseline, from the top */
  base: 0.51,
} as const;

/** Chapter tick under the baseline, in units of the band width: film.py draw_bars at the final scene's zoom. */
export function tickHeight(verses: number): number {
  return ((6 + 104 * Math.pow(verses / 176, 0.75)) * 1.133) / 1283;
}
export const TICK_GAP = 6 / 1283;
