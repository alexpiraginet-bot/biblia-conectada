// Loads the files written by `npm run data` (run automatically before `npm test` and `npm run build`).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../src/lib/canon/types";
import { OUT } from "../scripts/data/sources";

export function generated<T>(rel: string): T {
  const path = join(OUT.generated, rel);
  if (!existsSync(path)) throw new Error(`${path} is missing: run \`npm run data\` first`);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export type BookFile = { osis: string; chapters: { t: string; l: [number, number, number][] }[][] };
export type Summary = {
  counts: Record<string, number>;
  topVerses: { gv: number; ref: string; path: string; links: number }[];
};

export const books = () => generated<Book[]>("books.json");
export const summary = () => generated<Summary>("summary.json");
export const bookFile = (slug: string) => generated<BookFile>(`books/${slug}.json`);
