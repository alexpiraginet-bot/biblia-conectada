// Explorar graph layout (src/lib/explore/layout.ts): every label of all 1,189 chapters is placed at its real width,
// measured with the advance widths and kerning of the site's own WOFF2 files (tests/label-metrics.json, written by
// scripts/label-metrics.py), at every canvas width the page uses, and no two boxes may touch.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  boxes,
  canvasHeight,
  CANVAS_WIDTHS,
  clearance,
  DESKTOP,
  DESKTOP_MAX,
  DESKTOP_MIN,
  layoutChapter,
  PHONE,
  PHONE_MAX,
  type LabelText,
  type LayoutSpec,
  type Measure,
} from "../src/lib/explore/layout";
import { partnersText, votesText } from "../src/lib/explore/text";
import type { ExploreFile } from "../src/lib/explore/types";
import { SITE } from "../scripts/data/sources";
import { books, generated } from "./generated";

type Face = { file: string; sha256: string; unitsPerEm: number; advances: Record<string, number>; kerning: Record<string, number> };
const metrics = JSON.parse(readFileSync(join(SITE, "tests/label-metrics.json"), "utf8")) as { faces: Record<"title" | "ui", Face> };

/** width in px of a string set in one of the two faces: advances plus pair kerning, as the browser shapes Latin text */
const measure: Measure = (face, text, px) => {
  const f = metrics.faces[face];
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    const adv = f.advances[text[i]];
    if (adv === undefined) throw new Error(`${face}: no advance for "${text[i]}" in label-metrics.json`);
    units += adv + (i > 0 ? (f.kerning[text[i - 1] + text[i]] ?? 0) : 0);
  }
  return (units * px) / f.unitsPerEm;
};

/** at least this many px between any two boxes (medallion, dot or label plate) of different nodes */
const MIN_GAP = 2;
/** every width from a to b (px), both included, with the given step, plus the widths the page is designed at */
const widths = (a: number, b: number, step: number, extra: number[]) =>
  [...new Set([...Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step), b, ...extra])].sort((x, y) => x - y);

type Chapter = { centre: LabelText; top: { ci: number; text: LabelText }[] };
let chapters: Chapter[] = [];

beforeAll(() => {
  const b = books();
  const names: string[] = b.flatMap((book) => book.verses.map((_, c) => `${book.name} ${c + 1}`));
  chapters = b.flatMap((book) =>
    generated<ExploreFile>(`explore/${book.slug}.json`).chapters.map((ch, c) => ({
      centre: { title: `${book.name} ${c + 1}`, sub: partnersText(ch.partners) },
      top: ch.top.map(([ci, , votes]) => ({ ci, text: { title: names[ci], sub: votesText(votes) } })),
    })),
  );
});

function check(spec: LayoutSpec, widths: number[]) {
  const failures: string[] = [];
  let worst = Infinity;
  let margin = Infinity;
  for (const w of widths) {
    const h = canvasHeight(spec, w);
    for (const c of chapters) {
      const nodes = layoutChapter(spec, c.top);
      const r = clearance(boxes(spec, w, c.centre, nodes, nodes.map((n) => (n.kind === "label" ? c.top[n.rank].text : null)), measure), w, h);
      worst = Math.min(worst, r.gap);
      margin = Math.min(margin, r.inside);
      if (r.gap < MIN_GAP || r.inside < 0) {
        failures.push(`${c.centre.title} at ${w}px: gap ${r.gap.toFixed(1)} (${r.pair?.map((x) => `${x.node}:${x.what}`).join(" / ")}), inside ${r.inside.toFixed(1)}`);
      }
    }
  }
  return { failures, worst, margin };
}

describe("label metrics", () => {
  it("were read from the fonts the site ships (regenerate with scripts/label-metrics.py when a font changes)", () => {
    for (const face of Object.values(metrics.faces)) {
      const sha = createHash("sha256").update(readFileSync(join(SITE, face.file))).digest("hex");
      expect(sha, face.file).toBe(face.sha256);
    }
  });

  it("cover every character of every label", () => {
    for (const c of chapters.slice(0, 1)) expect(() => measure("title", c.centre.title, 18)).not.toThrow();
    for (const b of books()) expect(() => measure("title", `${b.name} 150`, 18)).not.toThrow();
  });

  it("measure real advances, not an average width", () => {
    // "Jó 1" and "Mateus 1" have different average character widths in a proportional face
    const perChar = (s: string) => measure("title", s, 100) / s.length;
    expect(Math.abs(perChar("Jó 1") - perChar("Mateus 1"))).toBeGreaterThan(1);
  });
});

describe("explore layout", () => {
  it("leaves no label or medallion touching another on desktop, for all 1,189 chapters, every 2 px from 760 to 1000", () => {
    const r = check(DESKTOP, widths(DESKTOP_MIN, DESKTOP_MAX, 2, CANVAS_WIDTHS.desktop));
    expect(r.failures.slice(0, 10)).toEqual([]);
    expect(r.worst).toBeGreaterThanOrEqual(MIN_GAP);
    expect(r.margin).toBeGreaterThanOrEqual(0);
  });

  it("does the same on phones (the 6 labelled medallions), every 2 px from a 320 px screen up", () => {
    const r = check(PHONE, widths(Math.min(...CANVAS_WIDTHS.phone), PHONE_MAX, 2, CANVAS_WIDTHS.phone));
    expect(r.failures.slice(0, 10)).toEqual([]);
    expect(Math.min(...CANVAS_WIDTHS.phone)).toBeLessThanOrEqual(288);
  });

  it("shows the same 6 labelled chapters on phones and desktop", () => {
    for (const c of chapters.slice(0, 50)) {
      const d = layoutChapter(DESKTOP, c.top).filter((n) => n.kind === "label").map((n) => n.ci);
      const p = layoutChapter(PHONE, c.top).map((n) => n.ci);
      expect(new Set(p)).toEqual(new Set(d));
      expect(d).toHaveLength(6);
    }
  });

  it("is deterministic and keeps every node inside the canvas", () => {
    for (const c of chapters) {
      const a = layoutChapter(DESKTOP, c.top);
      expect(layoutChapter(DESKTOP, c.top)).toEqual(a);
      for (const n of a) expect(n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1).toBe(true);
    }
    const src = readFileSync(join(SITE, "src/lib/explore/layout.ts"), "utf8");
    expect(src).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });

  it("uses the widths the stylesheet switches on", () => {
    const css = readFileSync(join(SITE, "src/components/explore/explore.module.css"), "utf8");
    expect(css).toContain(`@container graph (min-width: ${DESKTOP_MIN}px)`);
    expect(css).toContain(`@container graph (max-width: ${DESKTOP_MIN - 0.02}px)`);
    expect(css).toContain(`width: min(100%, clamp(${DESKTOP_MIN}px, calc((100dvh - 17rem) / var(--arn)), ${DESKTOP_MAX}px))`);
    expect(css).toContain(`width: min(100%, ${PHONE_MAX}px)`);
    expect(Math.max(...CANVAS_WIDTHS.desktop)).toBe(DESKTOP_MAX);
    expect(Math.min(...CANVAS_WIDTHS.desktop)).toBe(DESKTOP_MIN);
    expect(Math.max(...CANVAS_WIDTHS.phone)).toBe(PHONE_MAX);
  });
});
