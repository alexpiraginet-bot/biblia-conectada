// Medallion illustrations (HANDOFF §3.8, design/README.md §11): one small set by category, generated and reviewed one
// by one, labelled "Ilustração". src/data/medalhoes.json is written by the medallions step; until it has a group for a
// book, callers draw the plain ring with the book abbreviation.
import data from "@/data/medalhoes.json";

export type Medalhao = {
  id: string;
  /** what the picture shows, in PT-BR, for the visible caption and the alt text */
  label: string;
  alt: string;
  /** public paths, e.g. /medalhoes/pentateuco-96.webp */
  src96: string;
  src192: string;
};

type File = { version: 1; groups: Record<string, Medalhao>; bookGroup: Record<string, string> };
const file = data as unknown as File;

/** The medallion for a book (by OSIS id), or null when there is none yet. */
export function medalhaoForBook(osis: string): Medalhao | null {
  const g = file.bookGroup[osis];
  return (g && file.groups[g]) || null;
}

export function medalhaoGroups(): Medalhao[] {
  return Object.values(file.groups);
}
