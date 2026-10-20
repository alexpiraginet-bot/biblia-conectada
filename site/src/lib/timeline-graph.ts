// OpenBible links between the events of the Linha do tempo, and the words and links of a theme's passages. Pure
// functions over the events, the verse texts and the verse links (src/lib/word-index.ts reads those for the pages),
// so the build check (scripts/checks/timeline.ts) and the tests count them again the same way.
import { contentKeys } from "./words";

type VerseLink = readonly [number, number, number];
type HasVerses = { verses: readonly number[] };

/** Arcs drawn over the timeline (the most voted links between events, ties at the cut kept). */
export const ARCS_SHOWN = 50;
/** Linked events listed on an event page. */
export const RELATED_SHOWN = 6;
/** Words shown on a theme page. */
export const WORDS_SHOWN = 8;

export type EventLink = {
  /** index of the other event in the list */
  event: number;
  /** OpenBible pairs with one verse in this event only and the other in that event only */
  pairs: number;
  /** votes of those pairs, added up (each pair's votes already add both directions) */
  votes: number;
  /** the most voted of those pairs: [votes, verse of this event, verse of the other] */
  best: [number, number, number];
};

/**
 * For every event, the events its verses are linked to. A pair counts when one verse is in this event and not in the
 * other, and the other verse is in the other event and not in this one, so nested events (Holy Week and the Triumphal
 * Entry) do not count the verses they share.
 */
export function eventLinks(list: readonly HasVerses[], links: readonly (readonly VerseLink[])[]): Map<number, EventLink>[] {
  const sets = list.map((e) => new Set(e.verses));
  const containing = new Map<number, number[]>();
  list.forEach((e, i) => {
    for (const gv of e.verses) {
      const l = containing.get(gv);
      if (l) l.push(i);
      else containing.set(gv, [i]);
    }
  });
  return list.map((e, i) => {
    const out = new Map<number, EventLink>();
    for (const u of e.verses) {
      for (const [v, votes] of links[u]) {
        for (const j of containing.get(v) ?? []) {
          if (j === i || sets[i].has(v) || sets[j].has(u)) continue;
          const l = out.get(j);
          if (!l) {
            out.set(j, { event: j, pairs: 1, votes, best: [votes, u, v] });
            continue;
          }
          l.pairs++;
          l.votes += votes;
          if (votes > l.best[0] || (votes === l.best[0] && (u < l.best[1] || (u === l.best[1] && v < l.best[2])))) l.best = [votes, u, v];
        }
      }
    }
    return out;
  });
}

const nested = (a: Set<number>, b: Set<number>) => [...a].every((v) => b.has(v)) || [...b].every((v) => a.has(v));

/**
 * The events most linked to one event: by their most voted pair, then the smaller event first (the more precise place
 * of that pair), then the votes added up. An event nested in (or holding) one already listed is left out, so Holy Week
 * does not repeat the Debates in the Temple that it contains.
 */
export function relatedOf(byEvent: Map<number, EventLink>, list: readonly HasVerses[], n: number): EventLink[] {
  const sets = new Map<number, Set<number>>();
  const setOf = (i: number) => sets.get(i) ?? sets.set(i, new Set(list[i].verses)).get(i)!;
  const ranked = [...byEvent.values()].sort(
    (a, b) => b.best[0] - a.best[0] || list[a.event].verses.length - list[b.event].verses.length || b.votes - a.votes || a.event - b.event,
  );
  const out: EventLink[] = [];
  for (const c of ranked) {
    if (out.length === n) break;
    if (out.some((o) => nested(setOf(o.event), setOf(c.event)))) continue;
    out.push(c);
  }
  return out;
}

export type CrossArc = {
  /** the two verses, a < b */
  a: number;
  b: number;
  votes: number;
  /** the event each verse is placed at: the smallest event that holds it */
  ea: number;
  eb: number;
};

/**
 * The most voted OpenBible links between verses of different events, for the arcs of the timeline. Each verse sits at
 * the smallest event that holds it (fewest verses, then the earlier one); a pair inside one event is left out. The top
 * `n`, with ties at the cut kept.
 */
export function crossArcs(list: readonly HasVerses[], links: readonly (readonly VerseLink[])[], n: number): CrossArc[] {
  const sets = list.map((e) => new Set(e.verses));
  const home = new Map<number, number>();
  list.forEach((e, i) => {
    for (const gv of e.verses) {
      const h = home.get(gv);
      if (h === undefined || list[h].verses.length > e.verses.length) home.set(gv, i);
    }
  });
  const all: CrossArc[] = [];
  for (const [u, i] of home) {
    for (const [v, votes] of links[u]) {
      if (v <= u) continue;
      const j = home.get(v);
      if (j === undefined || j === i || sets[i].has(v) || sets[j].has(u)) continue;
      all.push({ a: u, b: v, votes, ea: i, eb: j });
    }
  }
  all.sort((x, y) => y.votes - x.votes || x.a - y.a || x.b - y.b);
  if (all.length <= n) return all;
  const cut = all[n - 1].votes;
  return all.filter((x, k) => k < n || x.votes === cut);
}

type Range = { from: number; to: number };

/** OpenBible pairs with at least one verse in the passage (the events' rule, "ligações que tocam o trecho"). */
export function passagePairs(p: Range, links: readonly (readonly VerseLink[])[]): number {
  const keys = new Set<string>();
  for (let gv = p.from; gv <= p.to; gv++) for (const [o] of links[gv]) keys.add(gv < o ? `${gv}:${o}` : `${o}:${gv}`);
  return keys.size;
}

/** A theme's passages, most linked first, then the higher OpenBible score, then the Bible's order. */
export function rankPassages<P extends Range & { score: number }>(passages: readonly P[], links: readonly (readonly VerseLink[])[]): (P & { pairs: number })[] {
  return passages.map((p) => ({ ...p, pairs: passagePairs(p, links) })).sort((a, b) => b.pairs - a.pairs || b.score - a.score || a.from - b.from);
}

/** Content words (src/lib/words.ts) by the number of passages that have them; at least `min` passages. */
export function sharedWords(passages: readonly Range[], text: readonly string[], n: number, min = 2): { key: string; passages: number }[] {
  const count = new Map<string, number>();
  const first = new Map<string, number>();
  passages.forEach((p, i) => {
    const keys = new Set<string>();
    for (let gv = p.from; gv <= p.to; gv++) for (const k of contentKeys(text[gv])) keys.add(k);
    for (const k of keys) {
      count.set(k, (count.get(k) ?? 0) + 1);
      if (!first.has(k)) first.set(k, i);
    }
  });
  return [...count]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1] || first.get(a[0])! - first.get(b[0])! || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, c]) => ({ key, passages: c }));
}
