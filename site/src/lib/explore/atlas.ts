// The atlas of a chapter (design/README.md §5): the chapter seal in the centre, one tick on its dial per linked chapter,
// the eight book-group medallions in orbit (canon order, clockwise from the upper left, an open arc at the bottom), and
// around each medallion the most voted chapters of its group, with gold strokes that thicken with the votes.
// Pure and deterministic: the pages lay it out on the server, and tests/explore-layout.test.ts lays out all 1,189
// chapters with the real advance widths of the fonts and checks that no two shapes touch.
//
// Units: one unit is one CSS pixel when the canvas is drawn at its narrowest width (spec.W). The page scales the whole
// canvas, text included, with its width (container query units), so a layout that is clear at spec.W is clear at any
// width the page draws it at.

export const GROUPS = ["pentateuco", "historicos", "poesia", "profetas", "evangelhos", "atos", "cartas", "apocalipse"] as const;
export type GroupId = (typeof GROUPS)[number];

/** A linked chapter: global chapter index, distinct verse pairs with the centre, summed votes of those pairs. */
export type AtlasPartner = { ci: number; pairs: number; votes: number };

export type HubSide = "below" | "above" | "right" | "left";
export type NodeSide = "r" | "l" | "b" | "t";
export type Box = [x0: number, y0: number, x1: number, y1: number];
export type Disc = { x: number; y: number; r: number };
export type Measure = (face: "title" | "ui", text: string, px: number) => number;

export type AtlasSpec = {
  key: "wide" | "narrow";
  W: number;
  H: number;
  /** centre of the seal */
  cx: number;
  cy: number;
  /** ellipse the medallions sit on */
  rx: number;
  ry: number;
  /** open arc at the bottom of the ellipse, in degrees (the seal's caption sits there) */
  gap: number;
  /** seal disc diameter; the dial starts `dialGap` outside it and its longest tick is `dialLen` */
  seal: number;
  dialGap: number;
  dialLen: number;
  /** medallion diameter: from hubMin (fewest votes) to hubMax (most votes among the eight groups) */
  hubMin: number;
  hubMax: number;
  /** medallion label: name size (display face) and count size (interface face); null: no count line */
  hubName: number;
  hubMeta: number | null;
  /** where a medallion label may go, in order of preference */
  hubLabel: HubSide[];
  /** short group names (phones) */
  short: boolean;
  /** chapters drawn around each medallion (null on phones): disc sizes, label sizes, smallest plate height */
  nodes: { perGroup: number; min: number; max: number; name: number; sub: number; height: number } | null;
  /** caption under the seal ("427 capítulos ligados"): size of its line, null for none */
  caption: number | null;
  /** inner horizontal space of a label plate, between the text and its edge */
  pad: number;
  /** smallest clear space between two shapes */
  gapMin: number;
};

export const WIDE: AtlasSpec = {
  key: "wide",
  W: 760,
  H: 548,
  cx: 380,
  cy: 258,
  rx: 232,
  ry: 168,
  gap: 50,
  seal: 96,
  dialGap: 5,
  dialLen: 16,
  hubMin: 46,
  hubMax: 66,
  hubName: 18,
  hubMeta: 14,
  hubLabel: ["below", "right", "left", "above"],
  short: false,
  nodes: { perGroup: 3, min: 24, max: 30, name: 16, sub: 14, height: 40 },
  caption: 14,
  pad: 4,
  gapMin: 2,
};

// Phones: the canvas runs to the edges of the screen, 320 px and up
export const NARROW: AtlasSpec = {
  key: "narrow",
  W: 320,
  H: 336,
  cx: 160,
  cy: 164,
  rx: 118,
  ry: 116,
  gap: 56,
  seal: 62,
  dialGap: 4,
  dialLen: 9,
  hubMin: 44,
  hubMax: 50,
  hubName: 14,
  hubMeta: null,
  hubLabel: ["below", "above"],
  short: true,
  nodes: null,
  caption: null,
  pad: 3,
  gapMin: 2,
};

export const GROUP_NAMES: Record<GroupId, { name: string; short: string }> = {
  pentateuco: { name: "Pentateuco", short: "Pentateuco" },
  historicos: { name: "Livros históricos", short: "Históricos" },
  poesia: { name: "Poesia e sabedoria", short: "Poesia" },
  profetas: { name: "Profetas", short: "Profetas" },
  evangelhos: { name: "Evangelhos", short: "Evangelhos" },
  atos: { name: "Atos", short: "Atos" },
  cartas: { name: "Cartas", short: "Cartas" },
  apocalipse: { name: "Apocalipse", short: "Apocalipse" },
};

const nf = new Intl.NumberFormat("pt-BR");
/** 296 -> "296 votos"; summed votes can be 1, 0 or negative */
export const votesWord = (v: number) => `${nf.format(v)} ${Math.abs(v) === 1 ? "voto" : "votos"}`;
/** count line of a medallion with no linked chapter */
export const NO_CHAPTER = "nenhum capítulo";

/** line boxes of the two label lines, as multiples of their font size, and the vertical inner space of a plate; the
 *  stylesheet draws the plates with the same numbers */
export const LINE_TITLE = 1.15;
export const LINE_SUB = 1.3;
export const PAD_Y = 2;

// ---- groups ---------------------------------------------------------------------------------------------------

export type AtlasGroup = {
  id: GroupId;
  /** index in GROUPS (canon order) */
  k: number;
  /** every linked chapter of the group, strongest first */
  partners: AtlasPartner[];
  chapters: number;
  pairs: number;
  votes: number;
};

/** Splits the ranked partners of a chapter into the eight groups (each list keeps the ranking). */
export function groupPartners(ranked: readonly AtlasPartner[], groupOf: (ci: number) => GroupId): AtlasGroup[] {
  return GROUPS.map((id, k) => {
    const partners = ranked.filter((p) => groupOf(p.ci) === id);
    return {
      id,
      k,
      partners,
      chapters: partners.length,
      pairs: partners.reduce((s, p) => s + p.pairs, 0),
      votes: partners.reduce((s, p) => s + p.votes, 0),
    };
  });
}

// ---- geometry -------------------------------------------------------------------------------------------------

const r1 = (n: number) => Math.round(n * 10) / 10;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** clear space between two boxes (negative when they overlap) */
export const boxGap = (a: Box, b: Box) => Math.max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3]);
/** clear space between a box and a disc */
export function boxDiscGap(b: Box, d: Disc): number {
  const dx = Math.max(b[0] - d.x, 0, d.x - b[2]);
  const dy = Math.max(b[1] - d.y, 0, d.y - b[3]);
  const inside = dx === 0 && dy === 0;
  return inside ? -d.r : Math.hypot(dx, dy) - d.r;
}
export const discGap = (a: Disc, b: Disc) => Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
const boxInside = (b: Box, W: number, H: number, m: number) => b[0] >= m && b[1] >= m && b[2] <= W - m && b[3] <= H - m;
const discInside = (d: Disc, W: number, H: number, m: number) => d.x - d.r >= m && d.y - d.r >= m && d.x + d.r <= W - m && d.y + d.r <= H - m;

/** points along a segment or a quadratic curve (and their bounding box), for counting how often a stroke runs under
 *  a shape */
type Poly = { pts: [number, number][]; bb: Box };
function poly(pts: [number, number][]): Poly {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { pts, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
function sampleLine(ax: number, ay: number, bx: number, by: number, n = 12): Poly {
  return poly(
    Array.from({ length: n - 1 }, (_, i) => {
      const t = (i + 1) / n;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }),
  );
}
function sampleQuad(ax: number, ay: number, qx: number, qy: number, bx: number, by: number, n = 16): Poly {
  return poly(
    Array.from({ length: n - 1 }, (_, i) => {
      const t = (i + 1) / n, u = 1 - t;
      return [u * u * ax + 2 * u * t * qx + t * t * bx, u * u * ay + 2 * u * t * qy + t * t * by];
    }),
  );
}
function hitsBox(p: Poly, b: Box): number {
  if (p.bb[2] <= b[0] || p.bb[0] >= b[2] || p.bb[3] <= b[1] || p.bb[1] >= b[3]) return 0;
  let n = 0;
  for (const [x, y] of p.pts) if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) n++;
  return n;
}

/** Whether the segment a→b runs through the inside of the box (Liang–Barsky clipping). */
export function segmentCrossesBox(ax: number, ay: number, bx: number, by: number, b: Box): boolean {
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const edges: [number, number][] = [
    [-dx, ax - b[0]],
    [dx, b[2] - ax],
    [-dy, ay - b[1]],
    [dy, b[3] - ay],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q <= 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 >= t1) return false;
    }
  }
  return true;
}

/** Whether the segment a→b runs through the inside of the disc. */
export function segmentCrossesDisc(ax: number, ay: number, bx: number, by: number, d: Disc): boolean {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((d.x - ax) * dx + (d.y - ay) * dy) / len2));
  const px = ax + t * dx - d.x, py = ay + t * dy - d.y;
  return px * px + py * py < d.r * d.r;
}

// ---- layout ---------------------------------------------------------------------------------------------------

export type PlacedHub = {
  id: GroupId;
  k: number;
  x: number;
  y: number;
  /** diameter */
  s: number;
  side: HubSide;
  /** label plate */
  box: Box;
  /** stroke from the dial to the medallion, its width and opacity */
  trunk: string;
  trunkW: number;
  trunkO: number;
};

export type PlacedNode = {
  ci: number;
  id: GroupId;
  /** 0 = the group's most voted chapter */
  j: number;
  x: number;
  y: number;
  s: number;
  side: NodeSide;
  box: Box;
  /** where the twig leaves the medallion, and its width */
  tx: number;
  ty: number;
  twigW: number;
};

export type AtlasLayout = {
  spec: AtlasSpec;
  hubs: PlacedHub[];
  nodes: PlacedNode[];
  /** caption plate under the seal */
  caption: Box | null;
  /** dial ticks in four strength bands (path data), and the tick of each group's strongest chapter */
  ticks: string[];
  leads: { id: GroupId; d: string }[];
  /** radius where the dial ends */
  rOut: number;
};

export type LabelTexts = {
  /** "427 capítulos ligados" */
  caption: string;
  /** label of a global chapter index ("Lucas 2") */
  chapter: (ci: number) => string;
  /** the chapter number written in its disc ("2") */
  number: (ci: number) => string;
};

/** size of the chapter number in its disc (the label size of the design system), and its clear space */
export const DISC_FONT = 13;
const DISC_ROOM = 10;

/** Size of a two-line label plate: the title line in the display face, the count line in the interface face. */
export function plateSize(measure: Measure, title: [string, number], sub: [string, number] | null, pad: number, minH = 0): [number, number] {
  const w = Math.max(measure("title", title[0], title[1]), sub ? measure("ui", sub[0], sub[1]) : 0) + 2 * pad;
  const h = title[1] * LINE_TITLE + (sub ? sub[1] * LINE_SUB : 0) + 2 * PAD_Y;
  return [w, Math.max(h, minH)];
}

/** Text of a medallion's label: its name and, on the wide map, its count line. */
export function hubText(spec: AtlasSpec, g: Pick<AtlasGroup, "id" | "chapters" | "votes">): { name: string; meta: string | null } {
  return {
    name: spec.short ? GROUP_NAMES[g.id].short : GROUP_NAMES[g.id].name,
    meta: spec.hubMeta ? (g.chapters ? votesWord(g.votes) : NO_CHAPTER) : null,
  };
}

/** Where a chapter may sit: rings around its medallion (clear space to it) and turns away from straight out, in
 *  degrees, straightest first. */
const NODE_RINGS = [12, 20, 30, 42, 56, 72];
const NODE_ANGLES = [0, ...Array.from({ length: 16 }, (_, i) => [-(i + 1) * 6, (i + 1) * 6]).flat()];

/** Diameter of a chapter disc: from `min` (j > 0 a little smaller) to `max` with the votes. */
const nodeSize = (n: NonNullable<AtlasSpec["nodes"]>, j: number, t: number) => r1((j ? n.min * 0.9 : n.min) + (n.max - n.min) * t);

/**
 * Lays out the atlas of a chapter. `groups` come from groupPartners (canon order). Medallions sit at fixed angles;
 * their size and trunk follow the group's summed votes. Their labels, then the chapter nodes (every group's strongest
 * first, groups with more votes first, then the second ones…) are placed by a greedy search over candidate spots,
 * scored by how far they wander and how many strokes run under them. A spot that would touch anything already placed
 * is never taken; a chapter with no free spot is left off the map, and so are the weaker chapters of its group (the
 * list beside the map names all of them).
 */
export function layoutAtlas(spec: AtlasSpec, groups: readonly AtlasGroup[], texts: LabelTexts, measure: Measure): AtlasLayout {
  const { W, H, cx, cy, rx, ry, gapMin } = spec;
  const step = (360 - spec.gap) / 7;
  const maxV = Math.max(1, ...groups.map((g) => Math.max(0, g.votes)));
  const rIn = spec.seal / 2 + spec.dialGap;
  const rOut = rIn + spec.dialLen;

  type Work = PlacedHub & { dir: number; hw: number; sx: number; sy: number; qx: number; qy: number };
  // medallions: Pentateuco on the upper left, then clockwise; the open arc at the bottom, between Evangelhos and Atos
  const hubs: Work[] = groups.map((g) => {
    const ang = rad(90 + spec.gap / 2 + ((g.k + 3) % 8) * step);
    const t = Math.sqrt(Math.max(0, g.votes) / maxV);
    const s = r1(spec.hubMin + (spec.hubMax - spec.hubMin) * t);
    const x = r1(cx + rx * Math.cos(ang)), y = r1(cy + ry * Math.sin(ang));
    const dir = Math.atan2(y - cy, x - cx);
    // trunk: from the edge of the dial to the medallion, bent a little (the arc motif)
    const sx = cx + (rOut + 3) * Math.cos(dir), sy = cy + (rOut + 3) * Math.sin(dir);
    const dx = x - sx, dy = y - sy, len = Math.hypot(dx, dy), bend = 0.08;
    const qx = sx + dx / 2 - (dy / len) * bend * len, qy = sy + dy / 2 + (dx / len) * bend * len;
    return {
      id: g.id,
      k: g.k,
      x,
      y,
      s,
      side: "below",
      box: [0, 0, 0, 0],
      trunk: `M${r1(sx)} ${r1(sy)}Q${r1(qx)} ${r1(qy)} ${x} ${y}`,
      trunkW: g.chapters ? r1(0.8 + 4 * t) : 0,
      trunkO: r1(0.35 + 0.55 * t),
      dir,
      hw: 0,
      sx,
      sy,
      qx,
      qy,
    };
  });
  // dial sectors: centred on the direction of each medallion, as wide as the room to its neighbours allows
  const angDiff = (a: number, b: number) => {
    const d = Math.abs(a - b) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  };
  hubs.forEach((h, i) => {
    const p = hubs[(i + 7) % 8], n = hubs[(i + 1) % 8];
    h.hw = Math.min(angDiff(h.dir, p.dir), angDiff(h.dir, n.dir)) / 2 - rad(3);
  });

  // what is already on the canvas: discs (seal with its dial, medallions, chapter discs) and plates (labels)
  const discs: Disc[] = [{ x: cx, y: cy, r: rOut }, ...hubs.map((h) => ({ x: h.x, y: h.y, r: h.s / 2 }))];
  const plates: Box[] = [];
  const strokes: Poly[] = hubs.filter((h) => h.trunkW > 0).map((h) => sampleQuad(h.sx, h.sy, h.qx, h.qy, h.x, h.y));
  const free = (b: Box) => {
    for (const o of plates) if (boxGap(b, o) < gapMin) return false;
    for (const d of discs) if (boxDiscGap(b, d) < gapMin) return false;
    return true;
  };
  const discFree = (nd: Disc) => {
    for (const o of discs) if (discGap(nd, o) < gapMin) return false;
    for (const o of plates) if (boxDiscGap(o, nd) < gapMin) return false;
    return true;
  };

  // the caption under the seal
  let caption: Box | null = null;
  if (spec.caption) {
    const w = measure("ui", texts.caption, spec.caption) + 4 * spec.pad;
    const h = spec.caption * LINE_SUB + 2 * PAD_Y + 4;
    const y0 = cy + rOut + 6;
    caption = [cx - w / 2, y0, cx + w / 2, y0 + h];
    plates.push(caption);
  }

  // medallion labels: the first free side in the spec's order, fewest strokes underneath
  for (const h of hubs) {
    const t = hubText(spec, groups[h.k]);
    const [w, hh] = plateSize(measure, [t.name, spec.hubName], t.meta ? [t.meta, spec.hubMeta!] : null, spec.pad);
    const R = h.s / 2 + gapMin + 1;
    const cands: Record<HubSide, Box> = {
      below: [h.x - w / 2, h.y + R, h.x + w / 2, h.y + R + hh],
      above: [h.x - w / 2, h.y - R - hh, h.x + w / 2, h.y - R],
      right: [h.x + R, h.y - hh / 2, h.x + R + w, h.y + hh / 2],
      left: [h.x - R - w, h.y - hh / 2, h.x - R, h.y + hh / 2],
    };
    let best: { cost: number; side: HubSide; b: Box } | null = null;
    spec.hubLabel.forEach((side, rank) => {
      const b = cands[side];
      if (!boxInside(b, W, H, 1) || !free(b)) return;
      const cost = rank * 12 + strokes.reduce((n, p) => n + hitsBox(p, b), 0) * 30;
      if (!best || cost < best.cost) best = { cost, side, b };
    });
    // no free side: below, and the layout test reports it
    const chosen: { side: HubSide; b: Box } = best ?? { side: "below", b: cands.below };
    h.side = chosen.side;
    h.box = chosen.b.map(r1) as Box;
    plates.push(h.box);
  }

  // chapters around their medallion
  const nodes: PlacedNode[] = [];
  const ns = spec.nodes;
  if (ns) {
    const maxN = Math.max(1, ...groups.flatMap((g) => g.partners.slice(0, ns.perGroup).map((p) => Math.max(0, p.votes))));
    const byVotes = [...hubs].sort((a, b) => groups[b.k].votes - groups[a.k].votes || a.k - b.k);
    const order = Array.from({ length: ns.perGroup }, (_, j) => byVotes.map((h) => [h, j] as const)).flat();
    for (const [h, j] of order) {
      const p = groups[h.k].partners[j];
      if (!p) continue;
      // a group's next chapter is drawn only when the one before it is
      if (j > 0 && !nodes.some((n) => n.id === h.id && n.j === j - 1)) continue;
      const t = Math.sqrt(Math.max(0, p.votes) / maxN);
      // wide enough for its number at the label size (semibold runs about 8% wider than the measured regular)
      const s = Math.max(nodeSize(ns, j, t), r1(measure("ui", texts.number(p.ci), DISC_FONT) * 1.08 + DISC_ROOM));
      const nr = s / 2;
      const [lw, lh] = plateSize(measure, [texts.chapter(p.ci), ns.name], [votesWord(p.votes), ns.sub], spec.pad, ns.height);
      const hd = Math.hypot(h.x - cx, h.y - cy);
      const own = 1 + h.k;
      let best: { cost: number; x: number; y: number; side: NodeSide; lb: Box; tx: number; ty: number } | null = null;
      // nearest rings and straightest angles first: once a spot is found, no farther or more turned one can cost less
      for (const dd of NODE_RINGS) {
        if (best && best.cost <= dd * 0.35) break;
        const d = h.s / 2 + nr + dd;
        for (const deg of NODE_ANGLES) {
          const base = Math.abs(deg) * 0.3 + dd * 0.35;
          if (best && best.cost <= base) break;
          const phi = h.dir + rad(deg);
          const x = h.x + d * Math.cos(phi), y = h.y + d * Math.sin(phi);
          const nd: Disc = { x, y, r: nr };
          if (!discInside(nd, W, H, 2) || !discFree(nd)) continue;
          // its own territory: nearer to its medallion than to any other one, and farther out than it
          const dOwn = Math.hypot(x - h.x, y - h.y);
          let soft = 0;
          for (const q of hubs) if (q !== h && Math.hypot(x - q.x, y - q.y) < dOwn + 8) soft += 260;
          if (Math.hypot(x - cx, y - cy) < hd + 10) soft += 400;
          const tx = h.x + (h.s / 2 + 1) * Math.cos(phi), ty = h.y + (h.s / 2 + 1) * Math.sin(phi);
          // the twig never runs under a label or another medallion (it ends at the edge of its own disc)
          const ex = x - nr * Math.cos(phi), ey = y - nr * Math.sin(phi);
          let blocked = false;
          for (const o of plates) if (segmentCrossesBox(tx, ty, ex, ey, o)) blocked = true;
          for (let i = 0; i < discs.length && !blocked; i++) if (i !== own && segmentCrossesDisc(tx, ty, ex, ey, discs[i])) blocked = true;
          if (blocked) continue;
          for (const side of ["r", "l", "b", "t"] as const) {
            const g = gapMin + 2;
            const lb: Box =
              side === "r"
                ? [x + nr + g, y - lh / 2, x + nr + g + lw, y + lh / 2]
                : side === "l"
                  ? [x - nr - g - lw, y - lh / 2, x - nr - g, y + lh / 2]
                  : side === "b"
                    ? [x - lw / 2, y + nr + g, x + lw / 2, y + nr + g + lh]
                    : [x - lw / 2, y - nr - g - lh, x + lw / 2, y - nr - g];
            if (!boxInside(lb, W, H, 1) || segmentCrossesBox(tx, ty, ex, ey, lb) || !free(lb)) continue;
            let cost = base + soft;
            cost += side === "r" ? (x < h.x - 4 ? 10 : 0) : side === "l" ? (x > h.x + 4 ? 10 : 0) : 8;
            cost += strokes.reduce((n, poly) => n + hitsBox(poly, lb), 0) * 40;
            if (!best || cost < best.cost) best = { cost, x, y, side, lb, tx, ty };
          }
        }
      }
      if (!best) continue;
      const placed: PlacedNode = {
        ci: p.ci,
        id: h.id,
        j,
        x: r1(best.x),
        y: r1(best.y),
        s,
        side: best.side,
        box: best.lb.map(r1) as Box,
        tx: r1(best.tx),
        ty: r1(best.ty),
        twigW: r1((j ? 0.6 : 0.9) + 1.4 * t),
      };
      discs.push({ x: placed.x, y: placed.y, r: nr });
      plates.push(placed.box);
      strokes.push(sampleLine(placed.tx, placed.ty, placed.x, placed.y, 10));
      nodes.push(placed);
    }
  }

  // the dial: one tick per linked chapter, in the sector of its group (canon order inside it), longer with more votes
  const bands: string[][] = [[], [], [], []];
  const leads: { id: GroupId; d: string }[] = [];
  const maxTick = Math.max(1, ...groups.flatMap((g) => g.partners.map((p) => Math.max(0, p.votes))));
  for (const h of hubs) {
    const g = groups[h.k];
    const dial = [...g.partners].sort((a, b) => a.ci - b.ci);
    dial.forEach((p, i) => {
      const a = h.dir - h.hw + ((i + 0.5) / dial.length) * 2 * h.hw;
      const t = Math.sqrt(Math.max(0, p.votes) / maxTick);
      const L = 1.5 + (spec.dialLen - 1.5) * t;
      const d = `M${r1(cx + rIn * Math.cos(a))} ${r1(cy + rIn * Math.sin(a))}L${r1(cx + (rIn + L) * Math.cos(a))} ${r1(cy + (rIn + L) * Math.sin(a))}`;
      if (p === g.partners[0]) leads.push({ id: g.id, d });
      else bands[Math.min(3, Math.floor(t * 4))].push(d);
    });
  }

  const out: PlacedHub[] = hubs.map(({ id, k, x, y, s, side, box, trunk, trunkW, trunkO }) => ({ id, k, x, y, s, side, box, trunk, trunkW, trunkO }));
  return { spec, hubs: out, nodes, caption: caption && (caption.map(r1) as Box), ticks: bands.map((b) => b.join("")), leads, rOut: r1(rOut) };
}

/** Path of the lit connection: the trunk of the group, then the twig to the chapter when it is on the map. */
export function litPath(l: AtlasLayout, id: GroupId, ci: number | null): string {
  const h = l.hubs.find((x) => x.id === id);
  if (!h) return "";
  const n = ci === null ? undefined : l.nodes.find((x) => x.ci === ci);
  return n ? `${h.trunk}L${n.tx} ${n.ty}L${n.x} ${n.y}` : h.trunk;
}
