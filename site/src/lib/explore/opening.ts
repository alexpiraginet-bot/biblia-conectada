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
  const nodes: OpeningNode[] = [{ id: centre.id, label: centre.label, href: centre.explorePath, x: 400, y: 470 }];
  const places = [
    { path: "/genesis/1", x: 150, y: 120, thread: "M400 470 C360 310 145 315 150 120" },
    { path: "/colossenses/1", x: 660, y: 300, thread: "M400 470 C480 355 560 370 660 300" },
    { path: "/salmos/33", x: 550, y: 130, thread: "M400 470 C385 310 405 225 550 130" },
  ];
  for (const place of places) {
    const node = graph.nodes.find((candidate) => candidate.path === place.path);
    if (!node || !graph.edges.some((edge) => edge.pairs > 0 &&
      ((edge.source === centre.id && edge.target === node.id) || (edge.target === centre.id && edge.source === node.id)))) continue;
    const segment = (path: string) => path.replace(/^\//, "").replaceAll("/", "-");
    nodes.push({ id: node.id, label: node.label, href: `/encontro/${segment(centre.path)}/${segment(node.path)}`, x: place.x, y: place.y, thread: place.thread });
  }
  return nodes;
}
