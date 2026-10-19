// Chapter graph for /grafo: 1,189 chapters as nodes, verse pairs aggregated between chapters as weighted edges,
// positions from ForceAtlas2 with a fixed seed so every build produces the same layout.
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { Canon } from "./canon";
import type { Pairs } from "./crossrefs";

export const LAYOUT = { seed: 20261019, iterations: 300 } as const;

export type ChapterEdges = {
  /** lower / higher global chapter index, sorted by pair count desc, then i, then j */
  i: Uint16Array;
  j: Uint16Array;
  /** verse pairs between the two chapters (any vote, self-pairs excluded) */
  pairs: Uint32Array;
  /** sum of the votes of those pairs */
  votes: Int32Array;
};

export type ChapterGraph = {
  nodes: { x: number; y: number; degree: number; internal: number }[];
  edges: ChapterEdges;
};

/** mulberry32: small deterministic PRNG for the initial positions */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function aggregateChapterEdges(canon: Canon, p: Pairs) {
  const chapOf = new Int32Array(canon.verseCount);
  canon.chapterFirst.forEach((first, ci) => chapOf.fill(ci, first, first + canon.chapterVerses[ci]));
  const acc = new Map<number, [number, number]>();
  const internal = new Array<number>(canon.chapterVerses.length).fill(0);
  for (let k = 0; k < p.a.length; k++) {
    if (p.a[k] === p.b[k]) continue;
    const ci = chapOf[p.a[k]], cj = chapOf[p.b[k]];
    if (ci === cj) {
      internal[ci]++;
      continue;
    }
    const key = Math.min(ci, cj) * 2048 + Math.max(ci, cj);
    const e = acc.get(key);
    if (e) {
      e[0]++;
      e[1] += p.votes[k];
    } else acc.set(key, [1, p.votes[k]]);
  }
  const keys = [...acc.keys()].sort((x, y) => acc.get(y)![0] - acc.get(x)![0] || x - y);
  const edges: ChapterEdges = {
    i: new Uint16Array(keys.length),
    j: new Uint16Array(keys.length),
    pairs: new Uint32Array(keys.length),
    votes: new Int32Array(keys.length),
  };
  keys.forEach((key, n) => {
    edges.i[n] = Math.floor(key / 2048);
    edges.j[n] = key % 2048;
    [edges.pairs[n], edges.votes[n]] = acc.get(key)!;
  });
  return { edges, internal };
}

export function chapterGraph(canon: Canon, p: Pairs): ChapterGraph {
  const { edges, internal } = aggregateChapterEdges(canon, p);
  const n = canon.chapterVerses.length;
  const g = new Graph({ type: "undirected" });
  const rand = rng(LAYOUT.seed);
  for (let ci = 0; ci < n; ci++) g.addNode(String(ci), { x: rand() * 1000 - 500, y: rand() * 1000 - 500 });
  for (let k = 0; k < edges.i.length; k++) g.addEdge(String(edges.i[k]), String(edges.j[k]), { weight: edges.pairs[k] });
  const settings = { ...forceAtlas2.inferSettings(g), barnesHutOptimize: true };
  const pos = forceAtlas2(g, { iterations: LAYOUT.iterations, settings, getEdgeWeight: "weight" });
  const degree = new Array<number>(n).fill(0);
  for (let k = 0; k < edges.i.length; k++) {
    degree[edges.i[k]] += edges.pairs[k];
    degree[edges.j[k]] += edges.pairs[k];
  }
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    nodes: Array.from({ length: n }, (_, ci) => ({ x: round(pos[String(ci)].x), y: round(pos[String(ci)].y), degree: degree[ci], internal: internal[ci] })),
    edges,
  };
}
