import type { LivingGraphData } from "./living-graph";

export type OpeningNode = {
  id: number;
  label: string;
  href: string;
  x: number;
  y: number;
  thread?: string;
};

/** Editorial positions, not graph statistics. Never draw an edge absent from the source graph. */
export function openingNodes(graph: LivingGraphData): OpeningNode[] {
  const centre = graph.nodes.find((node) => node.id === graph.centre);
  if (!centre) throw new Error("The opening needs a source chapter");
  const nodes: OpeningNode[] = [{ id: centre.id, label: centre.label, href: centre.explorePath, x: 350, y: 225 }];
  const places = [
    { path: "/genesis/1", x: 145, y: 84, thread: "M350 225 C285 225 285 84 145 84" },
    { path: "/colossenses/1", x: 650, y: 132, thread: "M350 225 C485 225 490 132 650 132" },
    { path: "/salmos/33", x: 630, y: 350, thread: "M350 225 C455 225 490 350 630 350" },
  ];
  for (const place of places) {
    const node = graph.nodes.find((candidate) => candidate.path === place.path);
    if (!node || !graph.edges.some((edge) => edge.pairs > 0 &&
      ((edge.source === centre.id && edge.target === node.id) || (edge.target === centre.id && edge.source === node.id)))) continue;
    nodes.push({ id: node.id, label: node.label, href: `${centre.explorePath}${node.path}`, x: place.x, y: place.y, thread: place.thread });
  }
  return nodes;
}
