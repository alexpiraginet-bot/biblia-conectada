import { beforeAll, describe, expect, it } from "vitest";
import { illustratedAtlasData, livingGraphData, type LivingGraphData } from "../src/lib/explore/living-graph";
import { bookFile, books } from "./generated";

let graph: LivingGraphData;
beforeAll(async () => { graph = await livingGraphData(); });

describe("the interactive constellation", () => {
  it("keeps the illustrated lens on the same real graph and separates its primary touch targets", async () => {
    const source = await livingGraphData("joao", 1);
    const illustrated = await illustratedAtlasData();
    expect(illustrated.edges).toEqual(source.edges);
    expect(illustrated.nodes.map(({ id, text, versePath }) => ({ id, text, versePath }))).toEqual(source.nodes.map(({ id, text, versePath }) => ({ id, text, versePath })));
    const primary = illustrated.nodes.filter((n) => n.prominent);
    expect(primary).toHaveLength(8);
    for (const node of primary) {
      expect(node.illustration).toMatch(/^\/medalhoes\/[a-z]+-192\.webp$/);
      for (const other of primary) if (other.id !== node.id) expect(Math.hypot(other.x - node.x, other.y - node.y)).toBeGreaterThan(160);
    }
  });
  it("draws only real, correctly weighted chapter connections", () => {
    const all = books();
    const chapterOf: number[] = [];
    all.forEach((book) => {
      let gv = book.firstVerse;
      book.verses.forEach((count, c) => {
        for (let i = 0; i < count; i++) chapterOf[gv++] = book.firstChapter + c;
      });
    });
    const edgeIds = new Set<string>();
    for (const edge of graph.edges) {
      expect(edge.source).toBeLessThan(edge.target);
      const key = `${edge.source}:${edge.target}`;
      expect(edgeIds.has(key)).toBe(false);
      edgeIds.add(key);
      const book = all.find((b) => edge.source >= b.firstChapter && edge.source < b.firstChapter + b.verses.length)!;
      const chapter = bookFile(book.slug).chapters[edge.source - book.firstChapter];
      let pairs = 0, votes = 0;
      for (const verse of chapter) {
        for (const [gv, n] of verse.l) {
          if (chapterOf[gv] === edge.target) { pairs++; votes += n; }
        }
      }
      expect(pairs, key).toBeGreaterThan(0);
      expect({ pairs, votes }, key).toEqual({ pairs: edge.pairs, votes: edge.votes });
    }
  });

  it("keeps every displayed passage verbatim and every point connected to the starting chapter", () => {
    const all = books();
    for (const node of graph.nodes) {
      const [, slug, chapter, verse] = node.versePath.split("/");
      const text = bookFile(slug).chapters[Number(chapter) - 1][Number(verse) - 1].t;
      expect(node.text, node.verseLabel).toBe(text);
      const book = all.find((b) => b.slug === slug)!;
      expect(node.id).toBe(book.firstChapter + Number(chapter) - 1);
      if (node.id === graph.centre) continue;
      expect(graph.edges.some((e) => (e.source === graph.centre && e.target === node.id) || (e.target === graph.centre && e.source === node.id)), node.label).toBe(true);
    }
  });

  it("ships a bounded, deterministically positioned graph with usable separation", () => {
    expect(graph.nodes.length).toBeGreaterThan(30);
    expect(graph.nodes.length).toBeLessThanOrEqual(71);
    expect(graph.edges.length).toBeLessThan(graph.nodes.length * 5);
    expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(graph.nodes.length);
    for (const node of graph.nodes) {
      expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(50);
      expect(node.x).toBeLessThanOrEqual(800);
      expect(node.y).toBeGreaterThanOrEqual(65);
      expect(node.y).toBeLessThanOrEqual(555);
    }
  });
});
