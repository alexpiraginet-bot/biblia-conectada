// "A partir deste trecho / deste capítulo": the numbers of the reading panel (data headline, mini graph partners) and
// of the chapter rail, as pure functions over the generated data, so the pages, the tests and check-dist compute
// them the same way (CLAUDE.md rule 3). No data imports here; callers pass the links or partners in.
import { formatInt } from "./canon/text";

/** One end of a link seen from the passage: a verse (global index) or a chapter (global index), with its votes. */
export type Partner = { key: number; votes: number };

/** Strongest first; canonical order (lower key) inside a tie. The pipeline already sorts verse links this way. */
export function byVotes<T extends Partner>(xs: readonly T[]): T[] {
  return [...xs].sort((p, q) => q.votes - p.votes || p.key - q.key);
}

export const GRAPH_MAX = 6;

/**
 * The partners drawn in the mini graph: the `max` most voted (ranked list in, canonical order inside a tie), plus how
 * many were left out and how many of those tie with the last one drawn.
 */
export function graphPartners<T extends Partner>(ranked: readonly T[], max = GRAPH_MAX) {
  const shown = ranked.slice(0, max);
  const last = shown[shown.length - 1];
  const tiedOut = last ? ranked.slice(max).filter((p) => p.votes === last.votes).length : 0;
  return { shown, left: ranked.length - shown.length, tiedOut };
}

export const MOST_LINKED_ROWS = 8;

/**
 * Rows of the chapter panel's "Mais ligados": the first `max` linked chapters of the ranked list
 * (src/lib/chapter-rank.ts), plus any chapter tied in votes with the last of them.
 */
export function mostLinkedRows<T extends Partner>(ranked: readonly T[], max = MOST_LINKED_ROWS): T[] {
  const cut = ranked[Math.min(max, ranked.length) - 1]?.votes;
  return ranked.filter((r, i) => i < max || r.votes === cut);
}

/** The partners sharing the top vote count (one, unless there is a tie). */
export function topGroup<T extends Partner>(ranked: readonly T[]): T[] {
  return ranked.length ? ranked.filter((p) => p.votes === ranked[0].votes) : [];
}

export function votesLabel(v: number): string {
  return `${formatInt(v)} ${Math.abs(v) === 1 ? "voto" : "votos"}`;
}

/**
 * Data headline of a verse panel: "29 ligações · a mais votada: 2 Coríntios 4:6, 125 votos".
 * `ranked` are the verse's links, strongest first; `label` names a partner.
 */
export function verseHeadline(ranked: readonly Partner[], label: (key: number) => string): string | null {
  const n = ranked.length;
  if (n === 0) return null;
  const top = topGroup(ranked);
  const v = votesLabel(top[0].votes);
  if (n === 1) return `1 ligação: ${label(top[0].key)}, ${v}`;
  const head = `${formatInt(n)} ligações`;
  if (top.length === 1) return `${head} · a mais votada: ${label(top[0].key)}, ${v}`;
  return `${head} · ${formatInt(top.length)} empatadas como mais votadas, com ${v} cada`;
}

/**
 * Data headline of a chapter panel: "243 capítulos ligados · o mais votado: João 1, 896 votos somados".
 * `ranked` are the linked chapters by summed votes (both directions, every verse pair between the two chapters).
 */
export function chapterHeadline(ranked: readonly Partner[], label: (key: number) => string): string | null {
  const n = ranked.length;
  if (n === 0) return null;
  const top = topGroup(ranked);
  const v = `${votesLabel(top[0].votes)} somados`;
  if (n === 1) return `1 capítulo ligado: ${label(top[0].key)}, ${v}`;
  const head = `${formatInt(n)} capítulos ligados`;
  if (top.length === 1) return `${head} · o mais votado: ${label(top[0].key)}, ${v}`;
  return `${head} · ${formatInt(top.length)} empatados como mais votados, com ${v} cada`;
}

/** Note under the mini graph when it does not draw every partner: "As 6 mais votadas de 29 ligações." */
export function graphNote(total: number, shown: number, tiedOut: number, noun: "ligações" | "capítulos ligados"): string | null {
  if (total <= shown) return null;
  const which = noun === "ligações" ? `As ${formatInt(shown)} mais votadas` : `Os ${formatInt(shown)} mais votados`;
  const tie = tiedOut > 0 ? ` Mais ${formatInt(tiedOut)} empatam com o último desenhado.` : "";
  return `${which} de ${formatInt(total)} ${noun}.${tie}`;
}

/** Positions of `k` satellites around the centre, in percent of the graph box, clockwise in the order given. */
export function satellitePositions(k: number): { x: number; y: number }[] {
  const start = k === 1 ? 0 : k === 2 ? Math.PI : -Math.PI / 2;
  const rx = 36;
  const ry = 35;
  return Array.from({ length: k }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / k;
    return { x: Math.round((50 + rx * Math.cos(a)) * 10) / 10, y: Math.round((50 + ry * Math.sin(a)) * 10) / 10 };
  });
}

/** Chapter numbers in the rail, zero-padded to the digits of the book's last chapter, at least two: "01", "001". */
export function padChapter(n: number, chapters: number): string {
  return String(n).padStart(Math.max(2, String(chapters).length), "0");
}

/** A title with a no-break space after a book's number ("1 Tessalonicenses 5", "Ligações de 2 Crônicas 6:34"), so
 *  a line never ends on the "1" of a book. */
export function keepBookNumber(s: string): string {
  // a book's number is followed by its capitalised name; "3 votos" is not a book
  return s.replace(/(^|\s)([1-3]) (?=\p{Lu})/gu, "$1$2 ");
}

/** Length of a count's bar (rail, chapter grid, link rows) as a share of the largest, 0–1, three decimals. */
export function barShare(n: number, max: number): number {
  return max > 0 ? Math.round((Math.max(0, n) / max) * 1000) / 1000 : 0;
}

/** "1 ligação", "830 ligações" */
export function linksLabel(n: number): string {
  return `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;
}

/** The meta line under a chapter title: "21 versículos · 830 ligações · 427 capítulos ligados · Bíblia Livre". */
export function chapterMeta(verses: number, pairs: number, linkedChapters: number): string {
  const v = `${formatInt(verses)} ${verses === 1 ? "versículo" : "versículos"}`;
  const c = `${formatInt(linkedChapters)} ${linkedChapters === 1 ? "capítulo ligado" : "capítulos ligados"}`;
  return `${v} · ${linksLabel(pairs)} · ${c} · Bíblia Livre`;
}

export function testamentName(t: "AT" | "NT"): string {
  return t === "AT" ? "Antigo Testamento" : "Novo Testamento";
}

/**
 * The chapter seal's dial (design system ChapterSeal): around a disc of radius 52 centred at (68, 68), one tick per
 * linked chapter at its canonical position (Gênesis 1 at the top, clockwise), longer with more summed votes (log
 * scale, 3 to 12 units out from radius 58). Ticks are grouped in LEVELS lengths and each level is drawn as one dashed
 * circle, a few hundred bytes instead of a <line> per chapter; ticks closer than their thickness merge.
 */
export const SEAL = { c: 68, disc: 52, ring: 46, from: 58, minLen: 3, maxLen: 12, levels: 5, thickness: 1.25 } as const;

export type SealLevel = {
  /** radius of the dashed circle and its stroke width (the tick length): ticks run from SEAL.from to r + width / 2 */
  r: number;
  width: number;
  /** stroke-dasharray along the circle, starting at its 3 o'clock point (the circle is turned to start at the top) */
  dash: string;
  /** linked chapters drawn on this circle */
  chapters: number[];
};

export function sealLevels(partners: readonly { ci: number; votes: number }[], chapterCount: number): SealLevel[] {
  const max = Math.max(1, ...partners.map((p) => p.votes));
  const byLevel: number[][] = Array.from({ length: SEAL.levels }, () => []);
  for (const p of partners) {
    const f = Math.log1p(Math.max(0, p.votes)) / Math.log1p(max);
    byLevel[Math.min(SEAL.levels - 1, Math.floor(f * SEAL.levels))].push(p.ci);
  }
  const tenth = (x: number) => Math.round(x * 10);
  const out: SealLevel[] = [];
  byLevel.forEach((cis, k) => {
    if (!cis.length) return;
    const width = Math.round((SEAL.minLen + ((SEAL.maxLen - SEAL.minLen) * (k + 1)) / SEAL.levels) * 10) / 10;
    const r = Math.round((SEAL.from + width / 2) * 10) / 10;
    const around = 2 * Math.PI * r;
    const spans: [number, number][] = [];
    for (const ci of [...cis].sort((a, b) => a - b)) {
      const s = ((ci + 0.5) / chapterCount) * around;
      const a = Math.max(0, s - SEAL.thickness / 2);
      const b = Math.min(around, s + SEAL.thickness / 2);
      const last = spans[spans.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else spans.push([a, b]);
    }
    // in tenths of a unit from rounded cumulative positions, so the rounding never drifts around the circle:
    // an empty dash, then gap, dash, gap, dash… and a last gap that closes the circle
    const parts = [0];
    let at = 0;
    for (const [a, b] of spans) {
      parts.push(tenth(a) - at, tenth(b) - tenth(a));
      at = tenth(b);
    }
    parts.push(tenth(around) - at);
    out.push({ r, width, dash: parts.map((t) => String(t / 10)).join(" "), chapters: cis });
  });
  return out;
}

/** Font size of the book name inside the seal (10 units, smaller for long names) and whether it must be squeezed
 *  into the ring with textLength. Space Grotesk capitals with the seal's 0.16em tracking: about 0.82 em each. */
export function sealBookFit(name: string): { size: number; squeeze: number | null } {
  const ems = [...name].reduce((s, ch) => s + (ch === " " ? 0.46 : 0.82), 0);
  const room = 80;
  const size = Math.max(7.5, Math.min(10, Math.floor((room / ems) * 10) / 10));
  return { size, squeeze: ems * size > room ? room : null };
}
