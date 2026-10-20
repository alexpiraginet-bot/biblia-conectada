// The one order of a chapter's linked chapters. The Explorar (graph, list and default connection, written by
// scripts/data/explore.ts) and the reading panel ("Mais ligados", its mini graph and "Ler lado a lado") both rank with it,
// so the two pages can never disagree (tests/chapter-rank.test.ts compares them on all 1,189 chapters):
//   1. summed votes of the verse pairs between the two chapters (each pair's votes already add up both directions),
//      most first;
//   2. then more verse pairs;
//   3. then the canonical order of the other chapter.
// Pure, with no data imports: the pipeline, the pages, check-dist and the tests all use this module.

export type LinkedChapter = { ci: number; pairs: number; votes: number };

export function compareLinkedChapters(x: LinkedChapter, y: LinkedChapter): number {
  return y.votes - x.votes || y.pairs - x.pairs || x.ci - y.ci;
}

/** A copy, strongest first (compareLinkedChapters). */
export function rankLinkedChapters<T extends LinkedChapter>(xs: readonly T[]): T[] {
  return [...xs].sort(compareLinkedChapters);
}
