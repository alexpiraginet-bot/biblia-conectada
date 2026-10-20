// The timeline's links (src/lib/timeline-graph.ts) over the site's data, computed once per process. Server only: the
// pages that use it are prerendered.
import "server-only";
import { events } from "@/lib/timeline";
import { ARCS_SHOWN, crossArcs, eventLinks, relatedOf, RELATED_SHOWN, type CrossArc, type EventLink } from "@/lib/timeline-graph";
import { verseTable } from "@/lib/word-index";

let cache: Promise<{ byEvent: Map<number, EventLink>[]; arcs: CrossArc[] }> | null = null;
function compute() {
  cache ??= verseTable().then(({ links }) => ({ byEvent: eventLinks(events, links), arcs: crossArcs(events, links, ARCS_SHOWN) }));
  return cache;
}

export async function timelineArcs(): Promise<CrossArc[]> {
  return (await compute()).arcs;
}

export async function relatedEvents(index: number): Promise<EventLink[]> {
  return relatedOf((await compute()).byEvent[index], events, RELATED_SHOWN);
}
