// The arcs of the cover's hero: the whole Bible on one horizon, chapter by chapter, and over it one arc from each
// chapter to the chapter most linked to it. Nothing is drawn by hand: the pairs come from chapter-links.json (written
// by scripts/build-data.ts from the OpenBible.info cross-references), and the number the page says is the length of
// the same list. Pure: no data imports. Rules: design/README.md §25.
import { glass } from "../../components/sculpture/arcs";
import { arcTone } from "../../components/sky/model";

/** For each chapter (canonical index), its linked chapters as [chapter index, distinct verse pairs], most pairs first. */
export type ChapterLinks = ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
export type HeroArc = { a: number; b: number; pairs: number };

/**
 * One arc per chapter, to the chapter with the most verse pairs linked to it (the first of its list: a tie goes to
 * the earlier chapter). Two chapters that choose each other share one arc, so there are fewer arcs than chapters.
 * Sorted from the widest span to the narrowest.
 */
export function heroArcs(links: ChapterLinks): HeroArc[] {
  const seen = new Map<number, HeroArc>();
  links.forEach((list, ci) => {
    const top = list[0];
    if (!top) return;
    const [other, pairs] = top;
    if (!Number.isInteger(other) || other < 0 || other >= links.length || other === ci) return;
    const a = Math.min(ci, other);
    const b = Math.max(ci, other);
    const key = a * links.length + b;
    if (!seen.has(key)) seen.set(key, { a, b, pairs });
  });
  return [...seen.values()].sort((x, y) => y.b - y.a - (x.b - x.a) || x.a - y.a);
}

/** The drawing's box: one unit of width per chapter; an arc over the whole baseline is as tall as the box. */
export const HERO_ARC_HEIGHT = 560;
/** Steps of colour along the span (the palette is continuous; the drawing groups arcs by step). */
export const HERO_TONE_STEPS = 18;
/** The four layers the sky rises in, by the arc's span as a share of the baseline: near, middle, far, whole. */
export const HERO_LAYER_SPANS = [0.03, 0.14, 0.42] as const;

export type HeroArcGroup = { layer: 0 | 1 | 2 | 3; tone: string; arcs: number; d: string };

const tenth = (n: number) => String(Math.round(n * 10) / 10);

/** Half an ellipse between the centres of two chapters, as tall as its share of the baseline. */
export function heroArcPath(a: number, b: number, chapters: number): string {
  const width = b - a;
  const ry = Math.max((HERO_ARC_HEIGHT * width) / (chapters - 1), 2);
  return `M${a + 0.5} ${HERO_ARC_HEIGHT}a${tenth(width / 2)} ${tenth(ry)} 0 0 1 ${width} 0`;
}

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(255 * Math.min(Math.max(c, 0), 1)).toString(16).padStart(2, "0")).join("")}`;

/**
 * The arcs as a few SVG paths: grouped by layer and by step of colour, each group one path with every arc of the
 * group in it. The colours are the ones the 3D sky opens with ("Dourado e violeta", components/sculpture/arcs.ts
 * glass over sky/model.ts arcTone): near links in blue and violet, middle spans in rose, the widest in champagne gold.
 * Groups come from the widest spans to the narrowest, so the near arcs are painted over the far ones.
 */
export function heroArcGroups(arcs: readonly HeroArc[], chapters: number): HeroArcGroup[] {
  const groups = new Map<number, HeroArcGroup>();
  for (const { a, b } of arcs) {
    const span = (b - a) / (chapters - 1);
    const t = arcTone(span);
    const step = Math.min(HERO_TONE_STEPS - 1, Math.floor(t * HERO_TONE_STEPS));
    const layer = (HERO_LAYER_SPANS.findIndex((limit) => span < limit) + 4) % 4 as 0 | 1 | 2 | 3;
    const key = layer * HERO_TONE_STEPS + step;
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { layer, tone: hex(glass((step + 0.5) / HERO_TONE_STEPS)), arcs: 0, d: "" }));
    group.arcs++;
    group.d += heroArcPath(a, b, chapters);
  }
  return [...groups.entries()].sort(([x], [y]) => y - x).map(([, group]) => group);
}
