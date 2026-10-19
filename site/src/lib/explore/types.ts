// The Explorar data contract: src/data/generated/explore/<book slug>.json, written by scripts/data/explore.ts.
// Pure types and the ranking rule, so the pipeline, the pages and the tests share one definition.
import { compareLinkedChapters } from "../chapter-rank";

/** How many partner chapters each chapter keeps (centre + 6 labelled + 5 medallions + 24 dots = 35 partners). */
export const EXPLORE_PARTNERS = 35;
/** Faint edges drawn among those partners, strongest first. */
export const EXPLORE_EDGES = 60;

/**
 * One partner chapter of a chapter:
 * [global chapter index, verse pairs between the two chapters, summed votes of those pairs,
 *  strongest pair [verse here, verse there, votes], verses here that take part (ascending),
 *  verses there that take part (ascending)]
 */
export type ExplorePartner = [
  ci: number,
  pairs: number,
  votes: number,
  strongest: [here: number, there: number, votes: number],
  here: number[],
  there: number[],
];

/** A faint edge between two partners: [index in `top`, index in `top`, verse pairs, summed votes]. */
export type ExploreEdge = [p: number, q: number, pairs: number, votes: number];

export type ExploreChapter = {
  /** every chapter linked to this one (any vote, pairs inside the chapter left out) */
  partners: number;
  /** the strongest partners, ranked by `compareByVotes` */
  top: ExplorePartner[];
  edges: ExploreEdge[];
};

export type ExploreFile = { format: "biblia-conectada/explore@1"; osis: string; chapters: ExploreChapter[] };

/**
 * The ranking rule shown on screen ("por votos, OpenBible.info"): summed votes (both directions) descending, then
 * verse pairs descending, then canonical order of the partner chapter. It is the shared rule of src/lib/chapter-rank.ts,
 * which the reading panel's "Mais ligados" uses too.
 */
export const compareByVotes = compareLinkedChapters;
