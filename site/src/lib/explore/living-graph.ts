// A small, explorable window into the actual chapter graph. All edges and verse excerpts come from the same
// generated BLIVRE/OpenBible files used by the reading pages. Only this bounded window reaches the browser.
import "server-only";
import { chapterBestPairs, chapterNeighbours, chapterRef, chapterVerses, bookBySlug, grid, verseRef, verseText } from "@/lib/reading";
import { groupOfBook } from "./atlas-data";
import { GROUPS, GROUP_NAMES, type GroupId } from "./atlas";
import { medalhaoForBook } from "@/lib/medalhoes";

export type LivingNode = {
  id: number;
  label: string;
  group: GroupId;
  groupLabel: string;
  x: number;
  y: number;
  size: number;
  prominent: boolean;
  path: string;
  explorePath: string;
  verseLabel: string;
  versePath: string;
  text: string;
  links: number;
  illustration?: string;
  illustrationLabel?: string;
};
export type LivingEdge = { source: number; target: number; pairs: number; votes: number };
export type LivingGraphData = {
  centre: number;
  centreLabel: string;
  totalPartners: number;
  nodes: LivingNode[];
  edges: LivingEdge[];
};

// These are layout dimensions, never Bible statistics. A fixed seed keeps SSR and every build identical.
const WIDTH = 850, HEIGHT = 650;
const frac = (n: number) => n - Math.floor(n);
const seed = (n: number) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
const round = (n: number) => Math.round(n * 100) / 100;

/** A restrained force layout, computed once on the server, with loose clusters for the canonical book groups. */
function positionNodes(nodes: LivingNode[], edges: LivingEdge[], centre: number): void {
  const anchors = [
    [182, 155], [150, 325], [285, 480], [420, 185],
    [630, 240], [700, 400], [570, 480], [730, 130],
  ];
  const state = nodes.map((node) => {
    const g = GROUPS.indexOf(node.group), a = anchors[g];
    const angle = seed(node.id + 1) * Math.PI * 2, radius = 30 + seed(node.id + 5) * 95;
    return { node, x: a[0] + Math.cos(angle) * radius, y: a[1] + Math.sin(angle) * radius, vx: 0, vy: 0, ax: a[0], ay: a[1] };
  });
  const byId = new Map(state.map((s) => [s.node.id, s]));
  for (let tick = 0; tick < 240; tick++) {
    const cooling = 1 - tick / 300;
    for (const p of state) {
      p.vx += (p.ax - p.x) * 0.008;
      p.vy += (p.ay - p.y) * 0.008;
    }
    for (let i = 0; i < state.length; i++) {
      const a = state[i];
      for (let j = i + 1; j < state.length; j++) {
        const b = state[j], dx = a.x - b.x, dy = a.y - b.y, d2 = Math.max(16, dx * dx + dy * dy);
        const distance = Math.sqrt(d2), force = Math.min(7, 900 / d2 + Math.max(0, 57 - distance) * 0.08);
        a.vx += dx / distance * force; a.vy += dy / distance * force;
        b.vx -= dx / distance * force; b.vy -= dy / distance * force;
      }
    }
    for (const edge of edges) {
      const a = byId.get(edge.source)!, b = byId.get(edge.target)!;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.max(1, Math.hypot(dx, dy));
      const same = a.node.group === b.node.group;
      const force = (distance - (same ? 90 : 245)) * (same ? 0.004 : 0.00035);
      a.vx += dx / distance * force; a.vy += dy / distance * force;
      b.vx -= dx / distance * force; b.vy -= dy / distance * force;
    }
    for (const p of state) {
      if (p.node.id === centre) { p.x = WIDTH * 0.48; p.y = HEIGHT * 0.48; p.vx = p.vy = 0; continue; }
      p.vx *= 0.6; p.vy *= 0.6;
      p.x = Math.max(50, Math.min(WIDTH - 50, p.x + p.vx * cooling));
      p.y = Math.max(65, Math.min(HEIGHT - 95, p.y + p.vy * cooling));
    }
  }
  for (const p of state) { p.node.x = round(p.x); p.node.y = round(p.y); }
}

const cache = new Map<string, Promise<LivingGraphData>>();
export function livingGraphData(slug = "isaias", chapter = 9): Promise<LivingGraphData> {
  const key = `${slug}/${chapter}`;
  let data = cache.get(key);
  if (!data) { data = buildGraph(slug, chapter); cache.set(key, data); }
  return data;
}

/** An editorial lens on the same verified graph: real chapters, spaced for illustrated, touchable medallions. */
export async function illustratedAtlasData(): Promise<LivingGraphData> {
  const graph = await livingGraphData("joao", 1);
  const desired = ["/genesis/1", "/salmos/33", "/colossenses/1", "/hebreus/1", "/isaias/40", "/joao/8", "/apocalipse/1"];
  const focus = [graph.centre];
  for (const path of desired) {
    const node = graph.nodes.find((n) => n.path === path);
    if (node) focus.push(node.id);
  }
  for (const node of graph.nodes) {
    if (focus.length === 8) break;
    if (!focus.includes(node.id)) focus.push(node.id);
  }
  const spots = [[415, 300], [630, 125], [130, 280], [690, 350], [545, 505], [270, 500], [220, 105], [430, 80]];
  const nodes = graph.nodes.map((node) => {
    const slot = focus.indexOf(node.id);
    const medal = medalhaoForBook(chapterRef(node.id).book.osis);
    return { ...node, prominent: slot >= 0, illustration: slot >= 0 ? medal?.src192 : undefined, illustrationLabel: medal?.label,
      x: slot >= 0 ? spots[slot][0] : node.x, y: slot >= 0 ? spots[slot][1] : node.y };
  });
  // Keep the small stars clear of the large medallions and their labels.
  const secondary = nodes.filter((n) => !n.prominent);
  secondary.forEach((node, index) => {
    const angle = index * 2.399963;
    let x = 425 + Math.cos(angle) * (245 + index % 3 * 52);
    let y = 310 + Math.sin(angle) * (185 + index % 3 * 39);
    for (let iteration = 0; iteration < 14; iteration++) {
      const obstacle = nodes.find((n) => n.prominent && Math.hypot(n.x - x, (n.y + 14) - y) < 85);
      if (!obstacle) break;
      x = clampLayout(x + (x > obstacle.x ? 1 : -1) * 27, 35, 815);
      y = clampLayout(y + (y > obstacle.y ? 1 : -1) * 19, 40, 575);
    }
    node.x = round(x); node.y = round(y);
  });
  return { ...graph, nodes };
}
const clampLayout = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

async function buildGraph(slug: string, chapter: number): Promise<LivingGraphData> {
  const book = bookBySlug(slug);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.verses.length) throw new Error("Invalid living graph chapter");
  const centre = book.firstChapter + chapter - 1;
  const ranked = await chapterNeighbours(book, chapter);
  const best = await chapterBestPairs(book, chapter);
  // Strongest overall plus a window into each group, avoiding an all-Gospels silhouette for Isaías 9.
  const ids = new Set([centre, ...ranked.slice(0, 30).map((p) => p.ci)]);
  for (const group of GROUPS) {
    ranked.filter((p) => groupOfBook(chapterRef(p.ci).book) === group).slice(0, 5).forEach((p) => ids.add(p.ci));
  }
  const nodes = await Promise.all([...ids].map(async (id, index): Promise<LivingNode> => {
    const ref = chapterRef(id), group = groupOfBook(ref.book);
    const verses = await chapterVerses(ref.book, ref.chapter);
    const prominentVerse = verses.toSorted((a, b) => b.links.length - a.links.length || a.n - b.n)[0];
    const gv = best.get(id)?.there ?? grid.verseIndex(ref.book, ref.chapter, prominentVerse.n);
    const verse = verseRef(gv);
    return {
      id, label: ref.label, group, groupLabel: GROUP_NAMES[group].name,
      x: 0, y: 0, size: id === centre ? 17 : 4 + 5 * Math.sqrt(Math.max(0, ranked.find((p) => p.ci === id)?.votes ?? 0) / Math.max(1, ranked[0]?.votes ?? 1)),
      prominent: index < 8, path: ref.path, explorePath: `/explorar/${ref.book.slug}/${ref.chapter}`,
      verseLabel: verse.label, versePath: verse.path, text: await verseText(gv),
      links: (await chapterNeighbours(ref.book, ref.chapter)).length,
    };
  }));
  const all: LivingEdge[] = [];
  for (const node of nodes) {
    const ref = chapterRef(node.id);
    for (const p of await chapterNeighbours(ref.book, ref.chapter)) {
      if (p.ci > node.id && ids.has(p.ci)) all.push({ source: node.id, target: p.ci, pairs: p.pairs, votes: p.votes });
    }
  }
  // Show the actual strongest four links of every visible node, plus every link to the starting passage.
  const chosen = new Map<string, LivingEdge>();
  const ordered = all.toSorted((a, b) => b.votes - a.votes || b.pairs - a.pairs || a.source - b.source || a.target - b.target);
  for (const node of nodes) {
    ordered.filter((e) => e.source === node.id || e.target === node.id).slice(0, 4).forEach((e) => chosen.set(`${e.source}:${e.target}`, e));
  }
  ordered.filter((e) => e.source === centre || e.target === centre).forEach((e) => chosen.set(`${e.source}:${e.target}`, e));
  const edges = [...chosen.values()];
  positionNodes(nodes, edges, centre);
  return { centre, centreLabel: chapterRef(centre).label, totalPartners: ranked.length, nodes, edges };
}
