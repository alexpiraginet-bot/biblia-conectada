// Server-side access to the Linha do tempo, the themes and the reception pilot written by scripts/build-data.ts
// (scripts/data/timeline.ts, themes.ts, reception.ts). Never imported by client code.
import eventsJson from "@/data/generated/linha-do-tempo/events.json";
import receptionJson from "@/data/generated/recepcao.json";
import temasJson from "@/data/generated/temas.json";
import type { Axis } from "@/lib/eras";

export type EventPlace = { name: string; placeID: number; gv: number };
export type TimelineEvent = {
  id: number;
  slug: string;
  ref: string;
  titleEn: string;
  sortKey: number;
  year: number;
  date: string | null;
  approximate: boolean;
  duration: string | null;
  verses: number[];
  runs: [number, number][];
  chapters: number[];
  places: EventPlace[];
  links: { pairs: number; partners: number };
  top: [number, number, number][];
  themes: { slug: string; label: string; passages: number }[];
  predecessor: number | null;
  partOf: number | null;
};

type EventsFile = { coveredVerses: number; events: TimelineEvent[] };
const eventsFile = eventsJson as unknown as EventsFile;
export const events: readonly TimelineEvent[] = eventsFile.events;
export const coveredVerses = eventsFile.coveredVerses;

const bySlug = new Map(events.map((e) => [e.slug, e]));
const byId = new Map(events.map((e) => [e.id, e]));
export const eventBySlug = (slug: string) => bySlug.get(slug);
export const eventById = (id: number) => byId.get(id);
export function eventNeighbours(e: TimelineEvent): { prev?: TimelineEvent; next?: TimelineEvent } {
  const i = events.indexOf(e);
  return { prev: events[i - 1], next: events[i + 1] };
}

/** The axis of the timeline: from the earliest event year to the year of the reception snapshot (or a later work). */
export function timelineAxis(): Axis {
  const workYears = reception.pilots.flatMap((p) => p.works.map((w) => w.year ?? -Infinity));
  const snapshotYear = Number(reception.snapshot.slice(0, 4));
  return { start: Math.min(...events.map((e) => e.year)), end: Math.max(snapshotYear, ...workYears) };
}

const UNITS: Record<string, [string, string]> = { D: ["dia", "dias"], W: ["semana", "semanas"], M: ["mês", "meses"], Y: ["ano", "anos"] };
/** "7D" -> "7 dias", "1Y" -> "1 ano"; null when the format is not Theographic's. */
export function durationLabel(d: string | null): string | null {
  const m = d ? /^(\d+)([DWMY])$/.exec(d) : null;
  if (!m) return null;
  const n = Number(m[1]);
  return `${n} ${UNITS[m[2]][n === 1 ? 0 : 1]}`;
}

// ---- themes (OpenBible.info Topics, labels from the BLIVRE)
export type ThemePassage = { osis: string; from: number; to: number; score: number };
export type Theme = {
  slug: string;
  key: string;
  label: string;
  topic: string;
  coverage: { with: number; total: number };
  passages: ThemePassage[];
  links: [number, number, number][];
};
type ThemesFile = {
  credit: string;
  rule: { minPassages: number; majority: number; minScoreForVerse: number };
  topicsInSource: number;
  source: { generated: string };
  themes: Theme[];
};
const themesFile = temasJson as unknown as ThemesFile;
export const themes: readonly Theme[] = themesFile.themes;
export const themeRule = themesFile.rule;
export const themesMeta = { credit: themesFile.credit, topicsInSource: themesFile.topicsInSource, generated: themesFile.source.generated };
const themeBySlugMap = new Map(themes.map((t) => [t.slug, t]));
export const themeBySlug = (slug: string) => themeBySlugMap.get(slug);

// ---- reception pilot (Wikidata, CC0)
export type Work = {
  qid: string;
  title: string | null;
  titleLang: "pt" | "en" | null;
  creator: string | null;
  year: number | null;
  commonsFile: string | null;
  /** checked public-domain thumbnail, with author and date as the Commons file page gives them */
  image: { src: string; width: number; height: number; file: string; page: string; author: string | null; date: string | null } | null;
};
export type Pilot = { file: string; event: number; subjects: string[]; label: string; works: Work[]; excluded: { qid: string; reason: string }[] };
type ReceptionFile = { snapshot: string; pilots: Pilot[] };
export const reception = receptionJson as unknown as ReceptionFile;
export const pilotForEvent = (id: number) => reception.pilots.find((p) => p.event === id);

/** The reception band of a passage with no free, checked source yet (the words agreed for the site). */
export const RECEPTION_EMPTY =
  "Recepção cultural (pintura, literatura, debates): ainda sem fonte livre conferida. Nada aparece aqui até ela entrar.";
/** The same, for the lanes still empty where the painting pilot already has works. */
export const OTHER_RECEPTION_EMPTY = "Literatura e debate ético: ainda sem fonte livre conferida. Nada aparece aqui até ela entrar.";

/** "19/10/2026" from "2026-10-19". */
export function dateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
