// Explorar (local graph of a chapter): for every chapter, the partner chapters with the most votes and the faint
// network among them. Written to src/data/generated/explore/<book slug>.json, one file per book.
// Source: the verse pairs of the OpenBible.info cross references (CC BY), self-pairs and pairs inside one chapter left
// out, exactly as the chapter graph counts them (chapter-graph.ts).
import type { Canon } from "./canon";
import type { ChapterEdges } from "./chapter-graph";
import type { Pairs } from "./crossrefs";
import {
  compareByVotes,
  EXPLORE_EDGES,
  EXPLORE_PARTNERS,
  type ExploreChapter,
  type ExploreEdge,
  type ExploreFile,
  type ExplorePartner,
} from "../../src/lib/explore/types";

type Detail = { best: [number, number, number]; here: Set<number>; there: Set<number> };

export function buildExplore(canon: Canon, p: Pairs, edges: ChapterEdges): ExploreFile[] {
  const nch = canon.chapterVerses.length;
  const chapOf = new Int32Array(canon.verseCount);
  canon.chapterFirst.forEach((first, ci) => chapOf.fill(ci, first, first + canon.chapterVerses[ci]));
  const verseNo = (gv: number) => gv - canon.chapterFirst[chapOf[gv]] + 1;

  // every partner of every chapter, from the aggregated chapter edges (pairs and summed votes)
  const lists: { ci: number; pairs: number; votes: number }[][] = Array.from({ length: nch }, () => []);
  const edgeAt = new Map<number, number>();
  for (let k = 0; k < edges.i.length; k++) {
    const i = edges.i[k], j = edges.j[k];
    lists[i].push({ ci: j, pairs: edges.pairs[k], votes: edges.votes[k] });
    lists[j].push({ ci: i, pairs: edges.pairs[k], votes: edges.votes[k] });
    edgeAt.set(i * 2048 + j, k);
  }
  const top = lists.map((l) => l.sort(compareByVotes).slice(0, EXPLORE_PARTNERS));

  // details (strongest verse pair, verses on each side) only for the kept partners
  const details = new Map<number, Detail>(); // key: centre * 2048 + partner
  top.forEach((l, ci) => l.forEach((q) => details.set(ci * 2048 + q.ci, { best: [0, 0, -Infinity], here: new Set(), there: new Set() })));
  const note = (key: number, here: number, there: number, votes: number) => {
    const d = details.get(key);
    if (!d) return;
    d.here.add(here);
    d.there.add(there);
    // strongest pair: votes desc, then the verse here, then the verse there (ascending)
    const [bh, bt, bv] = d.best;
    if (votes > bv || (votes === bv && (here < bh || (here === bh && there < bt)))) d.best = [here, there, votes];
  };
  for (let k = 0; k < p.a.length; k++) {
    const a = p.a[k], b = p.b[k];
    if (a === b) continue;
    const ca = chapOf[a], cb = chapOf[b];
    if (ca === cb) continue;
    note(ca * 2048 + cb, verseNo(a), verseNo(b), p.votes[k]);
    note(cb * 2048 + ca, verseNo(b), verseNo(a), p.votes[k]);
  }

  const chapters: ExploreChapter[] = top.map((l, ci) => {
    const kept: ExplorePartner[] = l.map((q) => {
      const d = details.get(ci * 2048 + q.ci)!;
      const asc = (s: Set<number>) => [...s].sort((x, y) => x - y);
      return [q.ci, q.pairs, q.votes, d.best, asc(d.here), asc(d.there)];
    });
    // faint network: chapter edges between two kept partners, same ranking rule, then by position in the list
    const net: ExploreEdge[] = [];
    for (let x = 0; x < l.length; x++) {
      for (let y = x + 1; y < l.length; y++) {
        const lo = Math.min(l[x].ci, l[y].ci), hi = Math.max(l[x].ci, l[y].ci);
        const k = edgeAt.get(lo * 2048 + hi);
        if (k !== undefined) net.push([x, y, edges.pairs[k], edges.votes[k]]);
      }
    }
    net.sort((e, f) => f[3] - e[3] || f[2] - e[2] || e[0] - f[0] || e[1] - f[1]);
    return { partners: lists[ci].length, top: kept, edges: net.slice(0, EXPLORE_EDGES) };
  });

  return canon.books.map((book) => ({
    format: "biblia-conectada/explore@1",
    osis: book.osis,
    chapters: chapters.slice(book.firstChapter, book.firstChapter + book.verses.length),
  }));
}
