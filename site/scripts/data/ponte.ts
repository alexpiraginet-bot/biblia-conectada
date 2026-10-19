// Ponte nº N (bridges): the calendar of daily verse-to-verse puzzles, computed at build time over every link the
// reading panel shows (any vote, self-pairs excluded). For each day: a start and a target verse whose fewest hops is
// 3 to 5, the number of shortest routes, the strongest route and the hop count from every verse to the target.
// Deterministic: a fixed seed and the data alone decide the calendar, so a date always gets the same bridge.
import { PONTE_DAYS, PONTE_LAUNCH, bridgeDate } from "../../src/lib/community/ponte";

/** [partner global verse, votes (sum of both directions), direction] per verse, as written to books/<slug>.json */
export type VerseLinks = ReadonlyArray<ReadonlyArray<readonly [number, number, number]>>;

export type Graph = { n: number; off: Int32Array; adj: Int32Array; votes: Int32Array };

export function linkGraph(links: VerseLinks): Graph {
  const n = links.length;
  const off = new Int32Array(n + 1);
  for (let v = 0; v < n; v++) off[v + 1] = off[v] + links[v].length;
  const adj = new Int32Array(off[n]);
  const votes = new Int32Array(off[n]);
  for (let v = 0; v < n; v++) {
    links[v].forEach(([p, w], k) => {
      adj[off[v] + k] = p;
      votes[off[v] + k] = w;
    });
  }
  return { n, off, adj, votes };
}

/** `order` holds the reached verses in visiting order (sorted by distance), `reached` how many */
export type Bfs = { dist: Int8Array; sigma: Float64Array; order: Int32Array; reached: number };

/** Hops from `s` to every verse (-1 = unreachable) and the number of shortest paths to each. */
export function bfs(g: Graph, s: number, out?: Bfs): Bfs {
  const dist = out?.dist ?? new Int8Array(g.n);
  const sigma = out?.sigma ?? new Float64Array(g.n);
  const queue = out?.order ?? new Int32Array(g.n);
  dist.fill(-1);
  sigma.fill(0);
  dist[s] = 0;
  sigma[s] = 1;
  let h = 0;
  let t = 0;
  queue[t++] = s;
  while (h < t) {
    const u = queue[h++];
    const du = dist[u];
    for (let k = g.off[u]; k < g.off[u + 1]; k++) {
      const w = g.adj[k];
      if (dist[w] < 0) {
        dist[w] = du + 1;
        queue[t++] = w;
      }
      if (dist[w] === du + 1) sigma[w] += sigma[u];
    }
  }
  return { dist, sigma, order: queue, reached: t };
}

/** For every verse, the best weakest-link vote over the shortest routes from `s` (-Infinity when unreachable). */
export function weakestLinkFrom(g: Graph, s: number, from: Bfs): Float64Array {
  const best = new Float64Array(g.n).fill(-Infinity);
  const ds = from.dist;
  best[s] = Infinity;
  // the BFS visiting order is sorted by distance, so every predecessor is done before its successors
  for (let i = 1; i < from.reached; i++) {
    const v = from.order[i];
    let b = -Infinity;
    for (let k = g.off[v]; k < g.off[v + 1]; k++) {
      const u = g.adj[k];
      if (ds[u] === ds[v] - 1) b = Math.max(b, Math.min(best[u], g.votes[k]));
    }
    best[v] = b;
  }
  return best;
}

/**
 * The strongest of the shortest routes from s to t: the largest weakest-link vote; among those, the most votes in
 * total; then the route whose verses come first in canonical order. `ds`/`dt` are hops from s and to t.
 */
export function strongestRoute(g: Graph, s: number, t: number, ds: Int8Array, dt: Int8Array): { path: number[]; votes: number[] } {
  const D = ds[t];
  if (D <= 0) throw new Error("no route");
  const onRoute = (v: number) => ds[v] >= 0 && dt[v] >= 0 && ds[v] + dt[v] === D;
  // layers of the shortest-route graph
  const layers: number[][] = Array.from({ length: D + 1 }, () => []);
  for (let v = 0; v < g.n; v++) if (onRoute(v)) layers[ds[v]].push(v);
  // 1) best weakest link reaching each verse from s
  const bott = new Map<number, number>([[s, Infinity]]);
  for (let d = 1; d <= D; d++) {
    for (const v of layers[d]) {
      let best = -Infinity;
      for (let k = g.off[v]; k < g.off[v + 1]; k++) {
        const u = g.adj[k];
        if (ds[u] === d - 1 && bott.has(u)) best = Math.max(best, Math.min(bott.get(u)!, g.votes[k]));
      }
      bott.set(v, best);
    }
  }
  const weakest = bott.get(t)!;
  // 2) over hops with at least that many votes, the most votes from each verse to t
  const toT = new Map<number, number>([[t, 0]]);
  for (let d = D - 1; d >= 0; d--) {
    for (const v of layers[d]) {
      let best = -Infinity;
      for (let k = g.off[v]; k < g.off[v + 1]; k++) {
        const w = g.adj[k];
        if (ds[w] === d + 1 && g.votes[k] >= weakest && toT.has(w) && toT.get(w)! > -Infinity) best = Math.max(best, g.votes[k] + toT.get(w)!);
      }
      toT.set(v, best);
    }
  }
  // 3) walk from s, taking the first verse (canonical order) that keeps the optimum
  const path = [s];
  const votes: number[] = [];
  let u = s;
  while (u !== t) {
    const d = ds[u];
    let next = -1;
    let nextVotes = 0;
    for (let k = g.off[u]; k < g.off[u + 1]; k++) {
      const w = g.adj[k];
      if (ds[w] !== d + 1 || g.votes[k] < weakest || !toT.has(w)) continue;
      if (g.votes[k] + toT.get(w)! === toT.get(u)! && (next < 0 || w < next)) {
        next = w;
        nextVotes = g.votes[k];
      }
    }
    if (next < 0) throw new Error("strongest route walk failed");
    path.push(next);
    votes.push(nextVotes);
    u = next;
  }
  return { path, votes };
}

/** mulberry32: small seeded generator, the same numbers on every platform (integer math only) */
export function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The rules a bridge must follow (tests/ponte.test.ts checks every bridge against them). */
export const PONTE_RULES = {
  seed: 20261019,
  /** wanted fewest hops, drawn per day with these weights */
  minHops: [
    [3, 0.35],
    [4, 0.45],
    [5, 0.2],
  ] as ReadonlyArray<readonly [number, number]>,
  /** start and target: verses with this many links (enough choices; the 107 hubs above 100 links are left out) */
  minLinks: 10,
  maxLinks: 100,
  /** short enough to read on a phone at the start */
  maxTextLength: 320,
  /** the strongest route's weakest link has at least this many votes, so the answer is a route worth reading */
  minWeakestVotes: 5,
  /** at least two shortest routes */
  minRoutes: 2,
  /** a verse is never an endpoint twice in the calendar, and a chapter not again within this many days */
  chapterGapDays: 120,
  /** odd bridges go from the Old to the New Testament, even ones back */
} as const;

export type Bridge = {
  n: number;
  date: string;
  start: number;
  target: number;
  min: number;
  routes: number;
  strongest: number[];
  strongestVotes: number[];
  /** hops from every verse to the target (-1 = none) */
  dist: Int8Array;
};

export function ponteCalendar(
  links: VerseLinks,
  opts: { isOT: (gv: number) => boolean; chapterOf: (gv: number) => number; textLength: (gv: number) => number; days?: number; launch?: string },
): Bridge[] {
  const g = linkGraph(links);
  const days = opts.days ?? PONTE_DAYS;
  const launch = opts.launch ?? PONTE_LAUNCH;
  const R = PONTE_RULES;
  const deg = (v: number) => g.off[v + 1] - g.off[v];
  const eligible: number[] = [];
  for (let v = 0; v < g.n; v++) {
    if (deg(v) >= R.minLinks && deg(v) <= R.maxLinks && opts.textLength(v) <= R.maxTextLength) eligible.push(v);
  }
  const poolOT = eligible.filter((v) => opts.isOT(v));
  const poolNT = eligible.filter((v) => !opts.isOT(v));
  const rand = seeded(R.seed);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const usedVerses = new Set<number>();
  const chapterDay = new Map<number, number>();
  const fresh = (v: number, n: number) => !usedVerses.has(v) && n - (chapterDay.get(opts.chapterOf(v)) ?? -Infinity) > R.chapterGapDays;
  const fromS: Bfs = { dist: new Int8Array(g.n), sigma: new Float64Array(g.n), order: new Int32Array(g.n), reached: 0 };
  const out: Bridge[] = [];
  for (let n = 1; n <= days; n++) {
    let r = rand();
    let want = R.minHops[R.minHops.length - 1][0];
    for (const [h, w] of R.minHops) {
      if (r < w) {
        want = h;
        break;
      }
      r -= w;
    }
    const [from, to] = n % 2 === 1 ? [poolOT, poolNT] : [poolNT, poolOT];
    let bridge: Bridge | null = null;
    for (let attempt = 0; attempt < 200 && !bridge; attempt++) {
      const s = pick(from);
      if (!fresh(s, n)) continue;
      Object.assign(fromS, bfs(g, s, fromS));
      const weakest = weakestLinkFrom(g, s, fromS);
      const targets = to.filter(
        (t) => fromS.dist[t] === want && fromS.sigma[t] >= R.minRoutes && weakest[t] >= R.minWeakestVotes && fresh(t, n) && opts.chapterOf(t) !== opts.chapterOf(s),
      );
      if (targets.length) {
        const t = pick(targets);
        const toT = bfs(g, t);
        const route = strongestRoute(g, s, t, fromS.dist, toT.dist);
        if (Math.min(...route.votes) !== weakest[t]) throw new Error(`[ponte] weakest link mismatch on day ${n}`);
        bridge = {
          n,
          date: bridgeDate(n, launch),
          start: s,
          target: t,
          min: want,
          routes: fromS.sigma[t],
          strongest: route.path,
          strongestVotes: route.votes,
          dist: toT.dist,
        };
      }
    }
    if (!bridge) throw new Error(`[ponte] no bridge found for day ${n}`);
    for (const v of [bridge.start, bridge.target]) {
      usedVerses.add(v);
      chapterDay.set(opts.chapterOf(v), n);
    }
    out.push(bridge);
  }
  return out;
}
