// Medallion illustrations (HANDOFF §3.8, design/README.md §11): one small set by category, generated and reviewed one
// by one, labelled "Ilustração". src/data/medalhoes.json is written by `npx tsx scripts/medallions.ts manifest`; when a
// book, place type or kind has no group, callers draw the plain ring with the book abbreviation.
// Weight: the JSON also carries the provenance (prompt, model, date, sha256), about 6.7 KB gzip. "server-only" makes
// the build fail if a client component imports this module; client code gets the image paths as props instead.
// check-dist also checks that no provenance reached the browser bundles.
import "server-only";
import data from "@/data/medalhoes.json";

export type MedalhaoKind = "livro" | "lugar" | "pessoa" | "povo" | "evento";

export type Medalhao = {
  id: string;
  /** what the picture shows, in PT-BR, for the visible caption and the alt text */
  label: string;
  alt: string;
  /** public paths, e.g. /medalhoes/pentateuco-96.webp */
  src96: string;
  src192: string;
  /** node kind the group belongs to */
  kind: MedalhaoKind;
  /** category name in PT-BR, e.g. "Evangelhos", "Cidade" */
  category: string;
};

/** Provenance of a generated picture (shown on /sobre, checked by tests/medalhoes.test.ts). */
export type MedalhaoProvenance = {
  prompt: string;
  model: string;
  createdAt: string;
  sha256: { "96": string; "192": string };
  bytes: { "96": number; "192": number };
};

type File = {
  version: 1;
  groups: Record<string, Medalhao & MedalhaoProvenance>;
  /** OSIS id -> group id, from Theographic bookDiv */
  bookGroup: Record<string, string>;
  /** OpenBible ancient place type -> group id */
  placeTypeGroup: Record<string, string>;
  /** "pessoa" | "povo" | "evento" -> group id */
  kindGroup: Record<string, string>;
};
const file = data as unknown as File;

/** The medallion for a book (by OSIS id), or null when there is none yet. */
export function medalhaoForBook(osis: string): Medalhao | null {
  const g = file.bookGroup[osis];
  return (g && file.groups[g]) || null;
}

/** The medallion for a place, from its OpenBible types (the first type that has a group), or null. */
export function medalhaoForPlaceTypes(types: readonly string[]): Medalhao | null {
  for (const t of types) {
    const g = file.placeTypeGroup[t];
    if (g && file.groups[g]) return file.groups[g];
  }
  return null;
}

/** The single medallion of people, people groups or events, or null. */
export function medalhaoForKind(kind: "pessoa" | "povo" | "evento"): Medalhao | null {
  const g = file.kindGroup[kind];
  return (g && file.groups[g]) || null;
}

export function medalhaoGroups(): (Medalhao & MedalhaoProvenance)[] {
  return Object.values(file.groups);
}
