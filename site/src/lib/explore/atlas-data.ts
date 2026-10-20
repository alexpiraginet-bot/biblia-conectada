// The atlas and the connections of a chapter, computed on the server from the verse links of the reading files
// (src/data/generated/books/<slug>.json): every linked chapter of the centre, grouped by the eight book groups of the
// medallions, laid out by ./atlas.ts. scripts/checks/explore.ts recounts the numbers the pages show from the same
// files by another path, and tests/explore-layout.test.ts checks the layout of all 1,189 chapters.
import "server-only";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { books } from "@/lib/data";
import { medalhaoForBook } from "@/lib/medalhoes";
import { chapterNeighbours, chapterRef, chapterVerses, grid, type ChapterRef } from "@/lib/reading";
import { GROUPS, groupPartners, layoutAtlas, NARROW, segmentCrossesDisc, WIDE, type AtlasGroup, type AtlasLayout, type GroupId } from "./atlas";
import { measure } from "./measure";
import { partnersText } from "./text";

/** Chapters listed under each medallion (the map draws as many of them as fit around it). */
export const PER_GROUP = WIDE.nodes!.perGroup;
/** Dotted links drawn among the chapters on the map, at most, strongest first. */
export const WEB_MAX = 16;

const groupCache = new Map<number, GroupId>();
/** The medallion group of a book (src/data/medalhoes.json: every book has one). */
export function groupOfBook(book: Book): GroupId {
  let g = groupCache.get(book.index);
  if (!g) {
    const m = medalhaoForBook(book.osis);
    if (!m || !(GROUPS as readonly string[]).includes(m.id)) throw new Error(`explore: no medallion group for ${book.osis}`);
    g = m.id as GroupId;
    groupCache.set(book.index, g);
  }
  return g;
}
export const groupOfChapter = (ci: number) => groupOfBook(grid.locateChapter(ci).book);

export type Medal = { src96: string; src192: string; alt: string; label: string; category: string };
/** The eight medallions, by group: image paths and their alt text (the manifest stays on the server). */
export function medals(): Record<GroupId, Medal> {
  const out = {} as Record<GroupId, Medal>;
  for (const id of GROUPS) {
    const book = books.find((b) => medalhaoForBook(b.osis)?.id === id);
    const m = book && medalhaoForBook(book.osis);
    if (!m) throw new Error(`explore: no medallion ${id}`);
    out[id] = { src96: m.src96, src192: m.src192, alt: m.alt, label: m.label, category: m.category };
  }
  return out;
}

export type Atlas = {
  centre: ChapterRef;
  /** every chapter linked to the centre */
  partners: number;
  groups: AtlasGroup[];
  wide: AtlasLayout;
  narrow: AtlasLayout;
  /** links among the chapters on the wide map: [chapter, chapter, verse pairs, summed votes], strongest first */
  web: [number, number, number, number][];
};

const atlases = new Map<number, Promise<Atlas>>();
/** The atlas of a chapter (cached: the layout and its page render it once per build). */
export function atlasOf(book: Book, chapter: number): Promise<Atlas> {
  const ci = book.firstChapter + chapter - 1;
  let a = atlases.get(ci);
  if (!a) {
    a = buildAtlas(book, chapter);
    atlases.set(ci, a);
  }
  return a;
}

async function buildAtlas(book: Book, chapter: number): Promise<Atlas> {
  const centre = chapterRef(book.firstChapter + chapter - 1);
  const ranked = (await chapterNeighbours(book, chapter)).map(({ ci, pairs, votes }) => ({ ci, pairs, votes }));
  const groups = groupPartners(ranked, groupOfChapter);
  const texts = { caption: partnersText(ranked.length), chapter: (ci: number) => chapterRef(ci).label, number: (ci: number) => String(chapterRef(ci).chapter) };
  const wide = layoutAtlas(WIDE, groups, texts, measure);
  const narrow = layoutAtlas(NARROW, groups, texts, measure);
  return { centre, partners: ranked.length, groups, wide, narrow, web: await webOf(wide) };
}

/**
 * Verse pairs and summed votes between every two chapters on the wide map that are linked, strongest first; only the
 * links whose straight line runs clear of the seal and of every other disc are drawn.
 */
async function webOf(l: AtlasLayout): Promise<[number, number, number, number][]> {
  const cis = l.nodes.map((n) => n.ci);
  const set = new Set(cis);
  const at = new Map(l.nodes.map((n) => [n.ci, n]));
  const discs = [
    { x: l.spec.cx, y: l.spec.cy, r: l.rOut + 4 },
    ...l.hubs.map((h) => ({ x: h.x, y: h.y, r: h.s / 2 + 2 })),
  ];
  const clear = (a: number, b: number) => {
    const p = at.get(a)!, q = at.get(b)!;
    const others = l.nodes.filter((n) => n.ci !== a && n.ci !== b).map((n) => ({ x: n.x, y: n.y, r: n.s / 2 + 2 }));
    return [...discs, ...others].every((d) => !segmentCrossesDisc(p.x, p.y, q.x, q.y, d));
  };
  const out: [number, number, number, number][] = [];
  for (const a of cis) {
    const { book, chapter } = grid.locateChapter(a);
    const acc = new Map<number, [number, number]>();
    for (const v of await chapterVerses(book, chapter)) {
      for (const [gv, votes] of v.links) {
        const loc = grid.locate(gv);
        const b = loc.book.firstChapter + loc.chapter - 1;
        if (b <= a || !set.has(b)) continue;
        const e = acc.get(b) ?? [0, 0];
        e[0]++;
        e[1] += votes;
        acc.set(b, e);
      }
    }
    for (const [b, [pairs, votes]] of acc) if (clear(a, b)) out.push([a, b, pairs, votes]);
  }
  return out.sort((x, y) => y[3] - x[3] || y[2] - x[2] || x[0] - y[0] || x[1] - y[1]).slice(0, WEB_MAX);
}

export type Connection = {
  centre: ChapterRef;
  other: ChapterRef;
  pairs: number;
  votes: number;
  /** 0 = the centre's most voted linked chapter */
  rank: number;
  partners: number;
  group: GroupId;
  /** 0 = the most voted linked chapter of its group */
  groupRank: number;
  /** strongest verse pair: verse here, verse there, its votes (more votes, then the lower verse here, then there) */
  strongest: { here: number; there: number; votes: number };
  /** verses of each chapter that take part in the pairs, ascending */
  hereVerses: number[];
  thereVerses: number[];
};

/** The link between the centre and another chapter, or null when no verse pair links them. */
export async function connectionOf(book: Book, chapter: number, otherCi: number): Promise<Connection | null> {
  const atlas = await atlasOf(book, chapter);
  const other = chapterRef(otherCi);
  const group = groupOfBook(other.book);
  const g = atlas.groups.find((x) => x.id === group)!;
  const groupRank = g.partners.findIndex((p) => p.ci === otherCi);
  if (groupRank < 0) return null;
  const p = g.partners[groupRank];
  const all = atlas.groups.flatMap((x) => x.partners);
  const rank = all.filter((q) => q.votes > p.votes || (q.votes === p.votes && (q.pairs > p.pairs || (q.pairs === p.pairs && q.ci < p.ci)))).length;
  const first = grid.verseIndex(other.book, other.chapter, 1);
  const last = first + other.book.verses[other.chapter - 1] - 1;
  let best: [number, number, number] | null = null;
  const here = new Set<number>(), there = new Set<number>();
  for (const v of await chapterVerses(book, chapter)) {
    for (const [gv, votes] of v.links) {
      if (gv < first || gv > last) continue;
      const t = gv - first + 1;
      here.add(v.n);
      there.add(t);
      if (!best || votes > best[2] || (votes === best[2] && (v.n < best[0] || (v.n === best[0] && t < best[1])))) best = [v.n, t, votes];
    }
  }
  if (!best) return null;
  const asc = (s: Set<number>) => [...s].sort((x, y) => x - y);
  return {
    centre: atlas.centre,
    other,
    pairs: p.pairs,
    votes: p.votes,
    rank,
    partners: atlas.partners,
    group,
    groupRank,
    strongest: { here: best[0], there: best[1], votes: best[2] },
    hereVerses: asc(here),
    thereVerses: asc(there),
  };
}

/** The connection a map opens on: the centre's most voted linked chapter. */
export async function defaultConnection(book: Book, chapter: number): Promise<Connection | null> {
  const atlas = await atlasOf(book, chapter);
  const top = atlas.groups.flatMap((g) => g.partners).reduce<{ ci: number; pairs: number; votes: number } | null>(
    (b, p) => (!b || p.votes > b.votes || (p.votes === b.votes && (p.pairs > b.pairs || (p.pairs === b.pairs && p.ci < b.ci))) ? p : b),
    null,
  );
  return top ? connectionOf(book, chapter, top.ci) : null;
}

/** 1 -> "1ª" (the panel: "a 1ª ligação mais votada") */
export const ordinal = (n: number) => `${formatInt(n)}ª`;
