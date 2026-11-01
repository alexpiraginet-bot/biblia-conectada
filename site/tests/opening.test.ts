import { describe, expect, it } from "vitest";
import { illustratedAtlasData } from "../src/lib/explore/living-graph";
import { openingNodes } from "../src/lib/explore/opening";

describe("the daylight opening's source connections", () => {
  it("offers the approved chapters only when backed by real connections, with direct pair URLs", async () => {
    const graph = await illustratedAtlasData();
    const nodes = openingNodes(graph);
    expect(nodes.map((node) => node.label)).toEqual(["João 1", "Gênesis 1", "Colossenses 1", "Salmos 33"]);
    expect(nodes[0].href).toBe("/explorar/joao/1");
    for (const node of nodes.slice(1)) {
      const source = graph.nodes.find((candidate) => candidate.id === node.id)!;
      expect(node.href).toBe(`/encontro/joao-1/${source.path.slice(1).replaceAll("/", "-")}`);
      expect(graph.edges.some((edge) => edge.pairs > 0 &&
        ((edge.source === graph.centre && edge.target === node.id) || (edge.target === graph.centre && edge.source === node.id)))).toBe(true);
    }
  });
  it("does not substitute decorative connections when a source edge is unavailable", async () => {
    const graph = await illustratedAtlasData();
    expect(openingNodes({ ...graph, edges: [] })).toHaveLength(1);
    expect(() => openingNodes({ ...graph, nodes: [] })).toThrow("source chapter");
  });
});
