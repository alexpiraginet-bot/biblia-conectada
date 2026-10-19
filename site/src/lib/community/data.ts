// Server-side access to the community data written by scripts/data/community.ts (build time only).
import ponteBuiltJson from "@/data/generated/community/ponte-built.json";
import trailJson from "@/data/generated/community/trilha-antes-do-natal.json";
import type { Book } from "@/lib/canon/types";
import { books } from "@/lib/data";
import { baseline, longRef, shortRef, versePath } from "./geometry";
import type { PonteBuilt } from "./ponte";
import type { TrailFile, TrailStepData } from "./trail";

export const trail = trailJson as TrailFile;
export const ponteBuilt = ponteBuiltJson as PonteBuilt;
export const base = baseline(books);

export type VerseInfo = { gv: number; book: Book; chapter: number; verse: number; ref: string; short: string; path: string; chapterPath: string; x: number };

export function verseInfo(gv: number): VerseInfo {
  const { book, chapter, verse } = base.locate(gv);
  return {
    gv,
    book,
    chapter,
    verse,
    ref: longRef(base, gv),
    short: shortRef(base, gv),
    path: versePath(base, gv),
    chapterPath: `/${book.slug}/${chapter}`,
    x: base.verseX(gv),
  };
}

export function trailStep(n: number): TrailStepData | undefined {
  return trail.steps.find((s) => s.step === n);
}

/** "Gênesis 18:14 e Lucas 1:37" */
export function stepTitle(s: TrailStepData): string {
  return `${verseInfo(s.ot.gv).ref} e ${verseInfo(s.nt.gv).ref}`;
}
