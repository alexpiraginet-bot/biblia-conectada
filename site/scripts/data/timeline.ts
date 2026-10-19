// Linha do tempo: the 450 events of Theographic (fontes/theographic/, CC BY-SA 4.0), with verse lists on the grid,
// the Portuguese reference as the title, dates of the F. N. Jones chronology (as Theographic gives them), places named
// from the BLIVRE text, linked chapters, OpenBible link counts and the published themes of the verses.
// Output is derived from Theographic, so it is CC BY-SA 4.0 (LICENSE-DATA.md).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createGrid } from "../../src/lib/canon/grid";
import { formatPassage, passageChapters, passageSlug, verseRuns } from "../../src/lib/passage";
import type { Canon } from "./canon";
import { createPlaceNamer, textHasName, type PlaceName } from "./place-names";
import { REPO, sha256 } from "./sources";
import { themesOfVerses, type Theme } from "./themes";

const TG = join(REPO, "fontes/theographic/json");
export const THEOGRAPHIC = {
  events: join(TG, "events.json"),
  verses: join(TG, "verses.json"),
  places: join(TG, "places.json"),
};

type Rec<F> = { id: string; fields: F };
type EventFields = {
  title: string;
  eventID: number;
  startDate: string;
  duration?: string;
  verses?: string[];
  predecessor?: string[];
  partOf?: string[];
  locations?: string[];
  rangeFlag?: boolean;
  sortKey: number;
};
type VerseFields = { osisRef: string; places?: string[] };
type PlaceFields = { placeID: number; displayTitle?: string; kjvName?: string; esvName?: string; verses?: string[] };

export type EventPlace = { name: string; placeID: number; gv: number };
export type TimelineEvent = {
  id: number;
  slug: string;
  /** Portuguese reference of the event's verses: the page title */
  ref: string;
  /** Theographic's title, in English: shown only labelled as the original title */
  titleEn: string;
  sortKey: number;
  /** ISO astronomical year (-4003 = 4004 a.C.) */
  year: number;
  /** the full startDate when Theographic gives a day ("0030-04-04") */
  date: string | null;
  approximate: boolean;
  duration: string | null;
  verses: number[];
  runs: [number, number][];
  chapters: number[];
  places: EventPlace[];
  /** OpenBible pairs with at least one verse in the event (self-pairs out), and distinct partner verses outside it */
  links: { pairs: number; partners: number };
  /** strongest partner verses outside the event: [partner, votes, verse of the event] */
  top: [number, number, number][];
  themes: { slug: string; label: string; passages: number }[];
  predecessor: number | null;
  partOf: number | null;
};

const TOP_PARTNERS = 12;

/** ISO astronomical year of a Theographic startDate ("-4003", "29", "0030-04-04"). */
export function startYear(startDate: string): number {
  const m = /^(-?\d+)(?:-(\d{2})-(\d{2}))?$/.exec(startDate.trim());
  if (!m) throw new Error(`[timeline] bad startDate ${startDate}`);
  return Number(m[1]);
}

export function buildTimeline(input: {
  canon: Canon;
  text: readonly string[];
  links: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>>;
  themes: readonly Theme[];
  write: (rel: string, data: string) => void;
}) {
  const { canon, text, links, themes, write } = input;
  const grid = createGrid(canon.books);
  const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;
  const events = read<Rec<EventFields>[]>(THEOGRAPHIC.events);
  const verses = read<Rec<VerseFields>[]>(THEOGRAPHIC.verses);
  const places = read<Rec<PlaceFields>[]>(THEOGRAPHIC.places);

  // Theographic verse records -> global verse index (the grids are the same: KJV, 31,102 verses)
  const byOsis = new Map(canon.books.map((b) => [b.osis, b]));
  const gvOf = new Map<string, number>();
  const versePlaces = new Map<number, string[]>();
  for (const v of verses) {
    const [b, c, n] = v.fields.osisRef.split(".");
    const book = byOsis.get(b);
    if (!book) throw new Error(`[timeline] unknown book in ${v.fields.osisRef}`);
    const gv = grid.verseIndex(book, Number(c), Number(n));
    gvOf.set(v.id, gv);
    if (v.fields.places?.length) versePlaces.set(gv, v.fields.places);
  }
  if (gvOf.size !== canon.verseCount) throw new Error(`[timeline] ${gvOf.size} Theographic verses, grid has ${canon.verseCount}`);

  // Portuguese place names from the BLIVRE text of each place's verses
  const namer = createPlaceNamer(text);
  const placeName = new Map<string, PlaceName>();
  const unnamed: { placeID: number; en: string; verses: number }[] = [];
  for (const p of places) {
    const pv = (p.fields.verses ?? []).map((id) => gvOf.get(id)).filter((g): g is number => g !== undefined);
    const names = [p.fields.displayTitle, p.fields.kjvName, p.fields.esvName]
      .filter((s): s is string => !!s)
      .map((s) => s.replace(/\s*\(.*\)\s*$/, ""));
    const n = namer.name({ id: p.id, placeID: p.fields.placeID, names: names.length ? names : [""], verses: pv });
    if (n) placeName.set(p.id, n);
    else if (pv.length) unnamed.push({ placeID: p.fields.placeID, en: names[0] ?? "", verses: pv.length });
  }

  const idOf = new Map(events.map((e) => [e.id, e.fields.eventID]));
  const out: TimelineEvent[] = [];
  for (const e of events) {
    const f = e.fields;
    const gvs = [...new Set((f.verses ?? []).map((id) => {
      const gv = gvOf.get(id);
      if (gv === undefined) throw new Error(`[timeline] event ${f.eventID}: unknown verse ${id}`);
      return gv;
    }))].sort((a, b) => a - b);
    if (gvs.length === 0) throw new Error(`[timeline] event ${f.eventID} has no verses`);
    const inEvent = new Set(gvs);

    // places: the event's own locations and the places of its verses, kept only when the BLIVRE text of the
    // event's verses has the Portuguese name (the full phrase if it is there, else the word it was found by)
    const candidates = new Set<string>([...(f.locations ?? []), ...gvs.flatMap((gv) => versePlaces.get(gv) ?? [])]);
    const found = new Map<string, EventPlace>();
    for (const pid of candidates) {
      const n = placeName.get(pid);
      if (!n) continue;
      // look in the verses Theographic links to this place; the event's own locations may be named in any of its verses
      const where = (f.locations ?? []).includes(pid) ? gvs : gvs.filter((g) => versePlaces.get(g)?.includes(pid));
      for (const name of n.pt === n.core ? [n.core] : [n.pt, n.core]) {
        const gv = where.find((g) => textHasName(text[g], name));
        if (gv === undefined) continue;
        const prev = found.get(name);
        if (!prev || gv < prev.gv) found.set(name, { name, placeID: n.placeID, gv });
        break;
      }
    }
    // a word found inside a longer name of the same event is not listed twice ("Sinai" and "monte Sinai")
    const placeList = [...found.values()]
      .filter((p) => ![...found.keys()].some((k) => k !== p.name && k.endsWith(` ${p.name}`)))
      .sort((a, b) => a.gv - b.gv || a.name.localeCompare(b.name, "pt-BR"));

    // OpenBible links touching the event
    const pairKeys = new Set<string>();
    const partners = new Map<number, [number, number]>();
    for (const gv of gvs) {
      for (const [other, votes] of links[gv]) {
        pairKeys.add(gv < other ? `${gv}:${other}` : `${other}:${gv}`);
        if (inEvent.has(other)) continue;
        const best = partners.get(other);
        if (!best || votes > best[0]) partners.set(other, [votes, gv]);
      }
    }
    const top = [...partners]
      .map(([p, [votes, gv]]) => [p, votes, gv] as [number, number, number])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, TOP_PARTNERS);

    const year = startYear(f.startDate);
    out.push({
      id: f.eventID,
      slug: `${f.eventID}-${passageSlug(gvs, grid)}`,
      ref: formatPassage(gvs, grid),
      titleEn: f.title,
      sortKey: f.sortKey,
      year,
      date: /^-?\d+$/.test(f.startDate.trim()) ? null : f.startDate.trim(),
      approximate: f.rangeFlag === true,
      duration: f.duration ?? null,
      verses: gvs,
      runs: verseRuns(gvs),
      chapters: passageChapters(gvs, grid),
      places: placeList,
      links: { pairs: pairKeys.size, partners: partners.size },
      top,
      themes: themesOfVerses(themes, inEvent),
      predecessor: f.predecessor?.length ? (idOf.get(f.predecessor[0]) ?? null) : null,
      partOf: f.partOf?.length ? (idOf.get(f.partOf[0]) ?? null) : null,
    });
  }
  out.sort((a, b) => a.sortKey - b.sortKey || a.id - b.id);
  if (new Set(out.map((e) => e.slug)).size !== out.length) throw new Error("[timeline] two events share a slug");

  const covered = new Set(out.flatMap((e) => e.verses)).size;
  const source = {
    theographic: Object.fromEntries(Object.entries(THEOGRAPHIC).map(([k, p]) => [k, sha256(p)])),
    chronology: "Floyd Nolen Jones, The Chronology of the Old Testament (via Theographic); ISO astronomical years",
    license: "CC BY-SA 4.0 (derived from Theographic Bible Metadata, CC BY-SA 4.0); places named from the BLIVRE text",
  };
  write("linha-do-tempo/events.json", JSON.stringify({ format: "biblia-conectada/linha-do-tempo@1", source, coveredVerses: covered, events: out }));
  // every Theographic place with the Portuguese name found for it (review list: tests/timeline.test.ts)
  const named = [...placeName.values()].sort((a, b) => b.verses - a.verses || a.placeID - b.placeID);
  write("linha-do-tempo/place-names.json", JSON.stringify({ format: "biblia-conectada/nomes-de-lugares@1", source, named, unnamed }));
  return { events: out, coveredVerses: covered, placesNamed: named.length, placesUnnamed: unnamed.length };
}
