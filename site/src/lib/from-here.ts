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

/** The chapters listed in the rail: the current one and two on each side, five in all when the book has them. */
export function railWindow(chapter: number, chapters: number, radius = 2): number[] {
  const size = Math.min(chapters, 2 * radius + 1);
  const first = Math.min(Math.max(1, chapter - radius), chapters - size + 1);
  return Array.from({ length: size }, (_, i) => first + i);
}

export function testamentName(t: "AT" | "NT"): string {
  return t === "AT" ? "Antigo Testamento" : "Novo Testamento";
}
