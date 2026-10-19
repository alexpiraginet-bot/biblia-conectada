// Ponte nº N: one bridge between two verses per day, the same for everyone, chosen at build time
// (scripts/data/ponte.ts). Pure functions and file types, shared by the pipeline, the pages and the browser.

/** The day of Ponte nº 1. Every later bridge is one day after the previous one, in São Paulo time. */
export const PONTE_LAUNCH = "2026-10-19";
export const PONTE_TIME_ZONE = "America/Sao_Paulo";
/** bridges in the calendar: one year */
export const PONTE_DAYS = 365;

/** Calendar of every bridge, public/data/ponte/calendar.json. */
export type PonteCalendar = {
  format: "biblia-conectada/ponte-calendar@1";
  launch: string;
  timeZone: string;
  /** the last bridge whose page /ponte/<n> was prerendered (the build day's bridge) */
  builtThrough: number;
  /** [start verse, target verse, minimum hops], bridge n at index n - 1 (global verse indices) */
  bridges: [number, number, number][];
  definition: string;
};

/** One bridge, public/data/ponte/<n>.json, loaded when it is played. */
export type PonteFile = {
  format: "biblia-conectada/ponte@1";
  n: number;
  date: string;
  start: number;
  target: number;
  /** fewest hops from start to target over all links (any vote) */
  min: number;
  /** number of different routes with exactly `min` hops */
  routes: number;
  /** among the shortest routes, the one whose weakest link has the most votes (then most votes in total) */
  strongest: number[];
  /** votes of each hop of the strongest route (sum of both directions) */
  strongestVotes: number[];
  /** BLIVRE text of the start, the target and the verses of the strongest route */
  texts: Record<string, string>;
  /** hops from every verse to the target, 4 bits per verse (low nibble first), base64; 15 = no path */
  dist: string;
};

/** The bridges whose pages were prerendered (src/data/generated/community/ponte-built.json). */
export type PonteBuilt = {
  /** São Paulo date of the build */
  builtOn: string;
  builtThrough: number;
  bridges: { n: number; date: string; start: number; target: number; min: number; texts: [string, string] }[];
};

export const NO_PATH = 15;

/** Packs hop counts (one per verse, -1 = unreachable) into the `dist` field. */
export function encodeDistances(dist: ArrayLike<number>): string {
  const bytes = new Uint8Array(Math.ceil(dist.length / 2));
  for (let i = 0; i < dist.length; i++) {
    const d = dist[i] < 0 ? NO_PATH : dist[i];
    if (d > NO_PATH) throw new RangeError(`distance ${d} does not fit 4 bits`);
    bytes[i >> 1] |= i & 1 ? d << 4 : d;
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeDistances(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Hops from verse `gv` to the target, or null when there is no path. */
export function distanceAt(packed: Uint8Array, gv: number): number | null {
  const b = packed[gv >> 1];
  if (b === undefined) return null;
  const d = gv & 1 ? b >> 4 : b & 15;
  return d === NO_PATH ? null : d;
}

const isoDay = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`not an ISO date: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 864e5;
};
const fromDay = (day: number) => new Date(day * 864e5).toISOString().slice(0, 10);

/** Calendar date ("2026-10-19") of an instant in São Paulo. */
export function saoPauloDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PONTE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The bridge number of a São Paulo date: 1 on the launch day; below 1 before it, above PONTE_DAYS after the year. */
export function bridgeNumber(isoDate: string, launch = PONTE_LAUNCH): number {
  return isoDay(isoDate) - isoDay(launch) + 1;
}

export function bridgeDate(n: number, launch = PONTE_LAUNCH): string {
  return fromDay(isoDay(launch) + n - 1);
}

export function addDays(isoDate: string, days: number): string {
  return fromDay(isoDay(isoDate) + days);
}

/** "2026-12-24" -> "24/12/2026" */
export function formatDateBR(isoDate: string): string {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}`;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "2026-12-01" -> "1º de dezembro" */
export function formatDayMonth(isoDate: string): string {
  const d = Number(isoDate.slice(8, 10));
  return `${d === 1 ? "1º" : d} de ${MONTHS[Number(isoDate.slice(5, 7)) - 1]}`;
}

/** Where a bridge is played: its own static page while it exists, else /ponte with the number in the hash. */
export function bridgeHome(n: number, builtThrough: number): string {
  return n <= builtThrough ? `/ponte/${n}` : `/ponte#${n}`;
}
