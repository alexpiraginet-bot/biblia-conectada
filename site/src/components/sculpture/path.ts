// The path between two verses through the cross references (/arcos, "#caminho/…"): the fewest links from one verse to
// the other, and among the shortest paths the one whose weakest link has the most votes (then the most votes in all,
// then the first verses in canonical order). Only links with at least PATH_MIN_VOTES votes are walked: a link readers
// voted down is not a way through. Loaded only when a path is asked for. Pure (tests/sculpture-plus.test.ts).
import type { ArcSet } from "../sky/model";
import type { Hop } from "./arcs";

/** the fewest votes (the sum of both directions) a link needs to be part of a path */
export const PATH_MIN_VOTES = 1;

/** Every verse's links (CSR): the partners of verse u are to[offsets[u] .. offsets[u + 1]), with their votes. */
export type Graph = { n: number; offsets: Uint32Array; to: Uint16Array; votes: Int16Array };

export function buildGraph(set: ArcSet, verses: number): Graph {
  const offsets = new Uint32Array(verses + 1);
  for (let k = 0; k < set.n; k++) {
    if (set.votes[k] < PATH_MIN_VOTES) continue;
    offsets[set.a[k] + 1]++;
    offsets[set.b[k] + 1]++;
  }
  for (let u = 0; u < verses; u++) offsets[u + 1] += offsets[u];
  const fill = offsets.slice(0, verses);
  const to = new Uint16Array(offsets[verses]);
  const votes = new Int16Array(offsets[verses]);
  for (let k = 0; k < set.n; k++) {
    const v = set.votes[k];
    if (v < PATH_MIN_VOTES) continue;
    const a = set.a[k], b = set.b[k];
    to[fill[a]] = b;
    votes[fill[a]++] = v;
    to[fill[b]] = a;
    votes[fill[b]++] = v;
  }
  return { n: verses, offsets, to, votes };
}

/** Links from `s` to every verse it reaches (-1: not reached), exploring no farther than `limit` links. */
export function distances(g: Graph, s: number, limit = Infinity): Int16Array {
  const dist = new Int16Array(g.n).fill(-1);
  const queue = new Int32Array(g.n);
  let head = 0, tail = 0;
  dist[s] = 0;
  queue[tail++] = s;
  while (head < tail) {
    const u = queue[head++];
    if (dist[u] >= limit) continue;
    for (let p = g.offsets[u]; p < g.offsets[u + 1]; p++) {
      const v = g.to[p];
      if (dist[v] < 0) {
        dist[v] = dist[u] + 1;
        queue[tail++] = v;
      }
    }
  }
  return dist;
}

/** The hops from `from` to `to` (empty when they are the same verse), or null when no path joins them. */
export function findPath(g: Graph, from: number, to: number): Hop[] | null {
  if (from === to) return [];
  const ds = distances(g, from);
  const D = ds[to];
  if (D < 0) return null;
  // the verses on some shortest path, by their distance from the start
  const dt = distances(g, to, D);
  const layers: number[][] = Array.from({ length: D + 1 }, () => []);
  for (let u = 0; u < g.n; u++) if (ds[u] >= 0 && dt[u] >= 0 && ds[u] + dt[u] === D) layers[ds[u]].push(u);
  // the best way to reach each of them: the weakest link as strong as it can be, then the most votes in all, then the
  // earlier verse before it
  const weakest = new Int32Array(g.n).fill(-0x7fffffff);
  const total = new Float64Array(g.n);
  const prev = new Int32Array(g.n).fill(-1);
  const prevVotes = new Int32Array(g.n);
  weakest[from] = 0x7fffffff;
  for (let d = 0; d < D; d++) {
    for (const u of layers[d]) {
      for (let p = g.offsets[u]; p < g.offsets[u + 1]; p++) {
        const v = g.to[p];
        if (ds[v] !== d + 1 || dt[v] !== D - d - 1) continue;
        const w = g.votes[p];
        const m = Math.min(weakest[u], w);
        const t = total[u] + w;
        if (m > weakest[v] || (m === weakest[v] && (t > total[v] || (t === total[v] && u < prev[v])))) {
          weakest[v] = m;
          total[v] = t;
          prev[v] = u;
          prevVotes[v] = w;
        }
      }
    }
  }
  const hops: Hop[] = [];
  for (let v = to; v !== from; v = prev[v]) hops.push({ from: prev[v], to: v, votes: prevVotes[v] });
  return hops.reverse();
}
