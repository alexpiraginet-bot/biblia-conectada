// The five eras of the timeline axis (the reference image of the Linha do tempo). A convention of this site, stated on
// the page, not a fact of any source: equal-width columns, each linear in years inside. Years use ISO astronomical
// numbering, as Theographic does (-4003 is 4004 a.C., 0 is 1 a.C., 29 is 29 d.C.).

export type Era = {
  id: string;
  label: string;
  /** first year of the era (inclusive); the first era starts at the axis start */
  from: number | null;
  /** first year after the era; the last era ends at the axis end */
  to: number | null;
};

export const ERAS: readonly Era[] = [
  { id: "antiguidade", label: "Antiguidade", from: null, to: 476 },
  { id: "idade-media", label: "Idade Média", from: 476, to: 1400 },
  { id: "renascimento", label: "Renascimento", from: 1400, to: 1600 },
  { id: "era-moderna", label: "Era moderna", from: 1600, to: 1900 },
  { id: "hoje", label: "Hoje", from: 1900, to: null },
];

export type Axis = { start: number; end: number };

/** Index of the era a year falls in (years before the first boundary are Antiguidade, after the last are Hoje). */
export function eraIndex(year: number): number {
  const i = ERAS.findIndex((e) => e.to !== null && year < e.to);
  return i === -1 ? ERAS.length - 1 : i;
}

/** Bounds of an era on a given axis. */
export function eraBounds(i: number, axis: Axis): [number, number] {
  const e = ERAS[i];
  return [e.from ?? axis.start, e.to ?? axis.end];
}

/**
 * Position of a year on the axis, 0 at the left edge and 1 at the right: each era takes an equal fifth, and inside an
 * era the position is linear in years. Years outside [start, end] are clamped to the edges.
 */
export function eraX(year: number, axis: Axis): number {
  if (!(axis.end > axis.start)) throw new RangeError(`axis ${axis.start}–${axis.end}`);
  const y = Math.min(Math.max(year, axis.start), axis.end);
  const i = eraIndex(y);
  const [from, to] = eraBounds(i, axis);
  const inside = to > from ? (y - from) / (to - from) : 0;
  return (i + Math.min(Math.max(inside, 0), 1)) / ERAS.length;
}

/** "4004 a.C." / "29 d.C." from an ISO astronomical year. */
export function yearLabel(year: number): string {
  return year <= 0 ? `${1 - year} a.C.` : `${year} d.C.`;
}

/** A span of years, short: "4004–1998 a.C.", "26–30 d.C.", "6 a.C.–9 d.C.", or one year. */
export function yearSpanShort(from: number, to: number): string {
  if (from === to) return yearLabel(from);
  if (to <= 0) return `${1 - from}–${1 - to} a.C.`;
  if (from > 0) return `${from}–${to} d.C.`;
  return `${yearLabel(from)}–${yearLabel(to)}`;
}

/** Text that states each era's span on a given axis ("Antiguidade: até 475 d.C."). */
export function eraSpanLabel(i: number, axis: Axis): string {
  const e = ERAS[i];
  if (e.from === null) return `até ${yearLabel((e.to as number) - 1)}`;
  if (e.to === null) return `de ${yearLabel(e.from)} até ${yearLabel(axis.end)}`;
  return `de ${yearLabel(e.from)} a ${yearLabel(e.to - 1)}`;
}
