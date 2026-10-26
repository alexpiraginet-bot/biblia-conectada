import "server-only";
import generated from "@/data/generated/interlinear.json";
import type { InterlinearCorpus, InterlinearPassage, InterlinearPassageSummary } from "./types";

const corpus = generated as InterlinearCorpus;
const passages = new Map(corpus.passages.map((passage) => [passage.id, passage]));

/** Explicit coverage only. Missing source or editorial data fails the build, never falls back to AI. */
export function getInterlinearPassage(bookSlug: string, chapter: number, verse: number): InterlinearPassage | null {
  if (!Number.isInteger(chapter) || !Number.isInteger(verse) || chapter < 1 || verse < 1) return null;
  return passages.get(`${bookSlug}/${chapter}/${verse}`) ?? null;
}

/** This small list deliberately excludes tokens, original text and lexical fields. */
export function listInterlinearPassages(): InterlinearPassageSummary[] {
  return corpus.summaries;
}

export const interlinearProvenance = corpus.provenance;
