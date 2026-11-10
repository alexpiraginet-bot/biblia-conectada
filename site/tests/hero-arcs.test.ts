// The cover's hero (components/home/HeroSky.tsx): the arcs are data, and what the page says about them is counted.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import chapterLinks from "../src/data/generated/chapter-links.json";
import { HERO_ARC_HEIGHT, HERO_LAYER_SPANS, HERO_TONE_STEPS, heroArcGroups, heroArcPath, heroArcs, type ChapterLinks } from "../src/lib/home/hero-arcs";
import { books } from "./generated";

const links = chapterLinks as unknown as ChapterLinks;
const chapters = books().reduce((sum, b) => sum + b.verses.length, 0);

describe("the hero's arcs", () => {
  it("are one per chapter, to the chapter most linked to it, a mutual choice drawn once", () => {
    const toy: ChapterLinks = [[[2, 9], [1, 4]], [[0, 4]], [[0, 9]], []];
    // 0 chooses 2, 1 chooses 0, 2 chooses 0 (the same pair as 0's), 3 has no link
    expect(heroArcs(toy)).toEqual([{ a: 0, b: 2, pairs: 9 }, { a: 0, b: 1, pairs: 4 }]);
    // an entry that points at itself or outside the table draws nothing
    expect(heroArcs([[[0, 3]], [[7, 3]]])).toEqual([]);
  });

  it("cover the whole Bible: every chapter is an end of an arc, and the first choice of each is drawn", () => {
    expect(links).toHaveLength(chapters);
    const arcs = heroArcs(links);
    const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
    const drawn = new Set(arcs.map((x) => key(x.a, x.b)));
    expect(drawn.size).toBe(arcs.length);
    links.forEach((list, ci) => {
      expect(list.length, `chapter ${ci}`).toBeGreaterThan(0);
      expect(drawn.has(key(ci, list[0][0])), `chapter ${ci}`).toBe(true);
    });
    expect(arcs.length).toBeLessThanOrEqual(chapters);
    expect(arcs.length).toBeGreaterThan(chapters / 2);
    // widest first, so the near arcs are painted over the far ones
    for (let i = 1; i < arcs.length; i++) expect(arcs[i - 1].b - arcs[i - 1].a).toBeGreaterThanOrEqual(arcs[i].b - arcs[i].a);
  });

  it("are drawn inside the box, each as tall as its share of the baseline", () => {
    expect(heroArcPath(0, chapters - 1, chapters)).toBe(`M0.5 ${HERO_ARC_HEIGHT}a${(chapters - 1) / 2} ${HERO_ARC_HEIGHT} 0 0 1 ${chapters - 1} 0`);
    const arcs = heroArcs(links);
    const groups = heroArcGroups(arcs, chapters);
    expect(groups.reduce((sum, g) => sum + g.arcs, 0)).toBe(arcs.length);
    expect(groups.length).toBeLessThanOrEqual(4 * HERO_TONE_STEPS);
    for (const g of groups) {
      expect(g.tone).toMatch(/^#[0-9a-f]{6}$/);
      const subpaths = g.d.match(/M[\d.]+ \d+a[\d.]+ [\d.]+ 0 0 1 \d+ 0/g) ?? [];
      expect(subpaths.join(""), "nothing but arcs in the path").toBe(g.d);
      expect(subpaths).toHaveLength(g.arcs);
      for (const sub of subpaths) {
        const [, x, y, rx, ry, w] = /M([\d.]+) (\d+)a([\d.]+) ([\d.]+) 0 0 1 (\d+) 0/.exec(sub)!.map(Number);
        expect(y).toBe(HERO_ARC_HEIGHT);
        expect(x + w).toBeLessThanOrEqual(chapters);
        expect(rx).toBeCloseTo(w / 2, 1);
        expect(ry).toBeLessThanOrEqual(HERO_ARC_HEIGHT);
        const span = w / (chapters - 1);
        const layer = HERO_LAYER_SPANS.findIndex((limit) => span < limit);
        expect(g.layer).toBe(layer < 0 ? 3 : layer);
      }
    }
    // the same data always gives the same drawing
    expect(heroArcGroups(heroArcs(links), chapters)).toEqual(groups);
  });
});

describe("the hero on the page", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const hero = read("components/home/HeroSky.tsx");

  it("says only counted numbers", () => {
    expect(hero).toContain("formatInt(arcs.length)");
    expect(hero).toContain("formatInt(summary.counts.arcs)");
    const text = hero.replace(/\/\/.*$/gm, "").replace(/\{[^{}]*\}/g, "");
    expect(text.match(/>[^<>{}]*\d{2,}[^<>{}]*</g) ?? []).toEqual([]);
  });

  it("holds the page's only title, moves without script and stands still when asked", () => {
    expect(hero.match(/<h1\b/g)).toHaveLength(1);
    expect(hero).not.toContain('"use client"');
    expect(read("components/home/DawnOpening.tsx")).not.toMatch(/<h1\b/);
    expect(read("app/page.tsx")).not.toMatch(/<h1\b/);
    const css = read("components/home/HeroSky.module.css");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.layer \{\s*animation: none;/);
    // one pass, no loop: nothing to pause
    expect(css).not.toContain("infinite");
  });
});
