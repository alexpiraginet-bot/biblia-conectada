// The trail "Antes do Natal": file shape written by scripts/data/community.ts, read by the pages at build time.

export const TRAIL_SLUG = "antes-do-natal";

export type TrailFile = {
  slug: string;
  title: string;
  /** how the votes of a pair are counted */
  definition: string;
  firstDate: string;
  lastDate: string;
  /** Old Testament books with at least one pair with the birth chapters */
  otBooksWithPairs: number;
  steps: TrailStepData[];
};

export type TrailStepData = {
  step: number;
  /** suggested date; every step is open from the first day */
  date: string;
  /** Old Testament book index */
  book: number;
  /** votes of the pair, sum of both directions */
  votes: number;
  /** pairs of this book with the birth chapters */
  pairs: number;
  ot: { gv: number; text: string };
  nt: { gv: number; text: string };
};
