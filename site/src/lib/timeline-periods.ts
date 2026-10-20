// The periods of the Linha do tempo: a convention of this site to help reading, stated on the page, not a fact of any
// source. Each period opens at one Theographic event (its eventID) and runs to the event before the next period opens,
// in the events' sortKey order (Theographic: the year, then the order of the books). The years shown for a period are
// those of its own events, so no date is typed here. People named in a label are named as the BLIVRE text names them
// (CLAUDE.md rule 4; tests/timeline-view.test.ts).

export type PeriodDef = { id: string; label: string; from: number };

export const PERIODS: readonly PeriodDef[] = [
  { id: "origens", label: "Origens", from: 1 }, // Creation of all things
  { id: "patriarcas", label: "Patriarcas", from: 66 }, // Lifetime of Abraham
  { id: "exodo", label: "Moisés e o êxodo", from: 120 }, // Birth of Moses
  { id: "juizes", label: "Conquista e juízes", from: 130 }, // Crossing the Jordan into Canaan
  { id: "reino-unido", label: "Reino unido", from: 155 }, // Reign of Saul
  { id: "reino-dividido", label: "Reino dividido", from: 163 }, // Southern Kingdom (Judah)
  { id: "exilio", label: "Exílio e retorno", from: 243 }, // Prophecies of Ezekiel
  { id: "nascimento", label: "Nascimento e infância de Jesus", from: 249 }, // Espousal of Mary
  { id: "ministerio", label: "Ministério de Jesus", from: 266 }, // John the Baptist Begins Ministry
  { id: "atos", label: "A igreja em Atos", from: 304 }, // The Holy Spirit is promised
];

type Dated = { id: number; year: number };

export type Period<E extends Dated> = PeriodDef & {
  /** the period's events, in the order given */
  events: E[];
  /** index of its first event in the full list */
  start: number;
  first: number;
  last: number;
};

/**
 * Splits the events (already in sortKey order) into the periods. Throws when an anchor is missing or out of order, so
 * a change in the source shows up at build time instead of as an empty or swapped period.
 */
export function splitPeriods<E extends Dated>(events: readonly E[], defs: readonly PeriodDef[] = PERIODS): Period<E>[] {
  const starts = defs.map((d) => events.findIndex((e) => e.id === d.from));
  starts.forEach((s, i) => {
    if (s < 0) throw new Error(`[timeline] period ${defs[i].id}: event ${defs[i].from} is missing`);
    if (i === 0 ? s !== 0 : s <= starts[i - 1]) throw new Error(`[timeline] period ${defs[i].id} is out of order`);
  });
  return defs.map((d, i) => {
    const list = events.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : events.length);
    const years = list.map((e) => e.year);
    return { ...d, events: list, start: starts[i], first: Math.min(...years), last: Math.max(...years) };
  });
}
