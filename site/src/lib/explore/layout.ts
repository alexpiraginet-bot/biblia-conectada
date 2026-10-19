// Deterministic layout of the Explorar graph (no randomness, no force simulation): the chapter in the centre, its
// strongest partners in slots around it. Inside each ring the partners go in Bible order, clockwise from the top.
//   desktop: 6 labelled medallions (ranks 1–6), 5 medallions without a label (ranks 7–11), dots for ranks 12–35
//   phones:  the same 6 labelled medallions, as a tall hexagon
// Slot positions scale with the canvas; medallions and text keep their size in px. tests/explore-layout.test.ts places
// every label of all 1,189 chapters with the real advance widths of the fonts and checks that nothing overlaps, at
// every canvas width the page uses (CANVAS_WIDTHS).

export type NodeKind = "label" | "medal" | "dot";
/** Where the label sits under its medallion: from its left edge, centred, or up to its right edge. */
export type Anchor = "start" | "middle" | "end";
export type Slot = { x: number; y: number; anchor: Anchor };

export type LayoutSpec = {
  /** canvas height: a share of the width, or a fixed height in px */
  aspect: number | null;
  height: number | null;
  /** vertical position of the centre medallion, as a share of the height */
  centreY: number;
  /** centre medallion diameter, centre label font size and count line size (px) */
  centre: { d: number; font: number; sub: number };
  /** labelled medallion diameter, label font size and count line size (px) */
  label: { d: number; font: number; sub: number };
  medal: { d: number };
  dot: { d: number };
  /** vertical space between a medallion and its label (px) */
  gap: number;
  /** line box of the label and of the count line, as a multiple of their font size */
  lineTitle: number;
  lineSub: number;
  /** slots of each ring, as shares of the canvas width and height */
  rings: { kind: NodeKind; slots: Slot[] }[];
};

/** Slots on an ellipse around the centre: radii as shares of half the canvas, angles in degrees clockwise from east. */
function ellipse(rx: number, ry: number, angles: number[], cy = 0.5): Slot[] {
  return angles.map((a) => {
    const t = (a * Math.PI) / 180;
    const cos = Math.cos(t);
    // labels of nodes well left of centre start at the medallion's left edge, right of centre end at its right edge,
    // so they grow towards the middle and never past the canvas
    const anchor: Anchor = cos < -0.3 ? "start" : cos > 0.3 ? "end" : "middle";
    return { x: round(0.5 + (rx / 2) * cos), y: round(cy + (ry / 2) * Math.sin(t)), anchor };
  });
}
const round = (v: number) => Math.round(v * 1e5) / 1e5;

export const DESKTOP: LayoutSpec = {
  aspect: 0.74,
  height: null,
  centreY: 0.5,
  centre: { d: 104, font: 28, sub: 13 },
  label: { d: 60, font: 18, sub: 13 },
  medal: { d: 34 },
  dot: { d: 10 },
  gap: 6,
  lineTitle: 1.15,
  lineSub: 1.3,
  rings: [
    { kind: "label", slots: ellipse(0.64, 0.6, [-90, -30, 30, 90, 150, 210]) },
    { kind: "medal", slots: ellipse(0.86, 0.88, [-120, -60, 0, 120, 180]) },
    { kind: "dot", slots: ellipse(0.95, 0.94, Array.from({ length: 24 }, (_, i) => -90 + 7.5 + 15 * i)) },
  ],
};

// Phones: fixed height, two columns at a quarter and three quarters of the width, so two labels side by side always
// fit (the widest label, "1 Tessalonicenses 1", is narrower than half of the 288 px canvas of a 320 px screen).
const PHONE_H = 440;
const py = (px: number) => round(px / PHONE_H);
export const PHONE: LayoutSpec = {
  aspect: null,
  height: PHONE_H,
  centreY: py(198),
  centre: { d: 56, font: 20, sub: 13 },
  label: { d: 40, font: 15, sub: 13 },
  medal: { d: 0 },
  dot: { d: 0 },
  gap: 4,
  lineTitle: 1.15,
  lineSub: 1.3,
  rings: [
    {
      kind: "label",
      slots: [
        { x: 0.5, y: py(24), anchor: "middle" },
        { x: 0.75, y: py(108), anchor: "middle" },
        { x: 0.75, y: py(296), anchor: "middle" },
        { x: 0.5, y: py(378), anchor: "middle" },
        { x: 0.25, y: py(296), anchor: "middle" },
        { x: 0.25, y: py(108), anchor: "middle" },
      ],
    },
  ],
};

/** Graph box widths (px) the page can give the canvas: the desktop layout from 760 px, the phone one below. */
export const DESKTOP_MIN = 760;
export const DESKTOP_MAX = 1000;
export const PHONE_MAX = 560;
export const CANVAS_WIDTHS = {
  desktop: [760, 800, 840, 880, 920, 960, 1000],
  phone: [288, 300, 320, 343, 360, 375, 398, 414, 430, 480, 520, 560],
};

export function canvasHeight(spec: LayoutSpec, w: number): number {
  return spec.height ?? w * (spec.aspect ?? 1);
}

export type PlacedNode = {
  /** index in the ranked partner list (0 = strongest) */
  rank: number;
  ci: number;
  kind: NodeKind;
  /** centre of the medallion, as a share of the canvas width and height */
  x: number;
  y: number;
  anchor: Anchor;
};

/**
 * Places the ranked partners (strongest first) of a chapter. Rings take partners in rank order (the first ring the
 * first 6, and so on); inside a ring they are sorted by canonical order and dealt to the slots clockwise.
 */
export function layoutChapter(spec: LayoutSpec, ranked: readonly { ci: number }[]): PlacedNode[] {
  const out: PlacedNode[] = [];
  let next = 0;
  for (const ring of spec.rings) {
    const members = ranked
      .slice(next, next + ring.slots.length)
      .map((p, i) => ({ ci: p.ci, rank: next + i }))
      .sort((p, q) => p.ci - q.ci);
    next += ring.slots.length;
    members.forEach((m, i) => out.push({ rank: m.rank, ci: m.ci, kind: ring.kind, ...ring.slots[i] }));
  }
  return out.sort((p, q) => p.rank - q.rank);
}

/** Inner space between a label's text and the edge of its plate (px), so edges passing behind stay off the text. */
export const LABEL_PAD = 4;

export type Box = { node: number; what: "disc" | "label"; x0: number; y0: number; x1: number; y1: number };
export type Measure = (face: "title" | "ui", text: string, px: number) => number;
export type LabelText = { title: string; sub: string };

/**
 * Every box the canvas draws at width `w` (px): medallions, dots and the label plates (title line + count line), the
 * centre's first. `texts[i]` holds the label and count line of `nodes[i]`; unlabelled nodes have none.
 */
export function boxes(
  spec: LayoutSpec,
  w: number,
  centre: LabelText,
  nodes: readonly PlacedNode[],
  texts: readonly (LabelText | null)[],
  measure: Measure,
): Box[] {
  const h = canvasHeight(spec, w);
  const out: Box[] = [];
  const disc = (node: number, x: number, y: number, d: number) =>
    out.push({ node, what: "disc", x0: x - d / 2, y0: y - d / 2, x1: x + d / 2, y1: y + d / 2 });
  const plate = (node: number, x: number, y: number, d: number, anchor: Anchor, t: LabelText, font: number, sub: number) => {
    const tw = Math.max(measure("title", t.title, font), measure("ui", t.sub, sub)) + 2 * LABEL_PAD;
    const x0 = anchor === "start" ? x - d / 2 : anchor === "end" ? x + d / 2 - tw : x - tw / 2;
    const y0 = y + d / 2 + spec.gap;
    out.push({ node, what: "label", x0, y0, x1: x0 + tw, y1: y0 + font * spec.lineTitle + sub * spec.lineSub });
  };
  disc(-1, w / 2, h * spec.centreY, spec.centre.d);
  plate(-1, w / 2, h * spec.centreY, spec.centre.d, "middle", centre, spec.centre.font, spec.centre.sub);
  nodes.forEach((n, i) => {
    const size = n.kind === "label" ? spec.label.d : n.kind === "medal" ? spec.medal.d : spec.dot.d;
    if (size === 0) return;
    disc(n.rank, n.x * w, n.y * h, size);
    const t = texts[i];
    if (n.kind === "label" && t) plate(n.rank, n.x * w, n.y * h, size, n.anchor, t, spec.label.font, spec.label.sub);
  });
  return out;
}

/** Smallest distance between two boxes of different nodes (negative when they overlap), and the margin to the canvas. */
export function clearance(all: readonly Box[], w: number, h: number): { gap: number; pair: [Box, Box] | null; inside: number } {
  let gap = Infinity;
  let pair: [Box, Box] | null = null;
  let inside = Infinity;
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    inside = Math.min(inside, a.x0, a.y0, w - a.x1, h - a.y1);
    for (let j = i + 1; j < all.length; j++) {
      const b = all[j];
      if (a.node === b.node) continue;
      const d = Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);
      if (d < gap) {
        gap = d;
        pair = [a, b];
      }
    }
  }
  return { gap, pair, inside };
}
