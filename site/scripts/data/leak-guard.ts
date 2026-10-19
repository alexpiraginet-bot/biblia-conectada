// Rule 1 of CLAUDE.md: text of protected translations never reaches the site. The only protected text in the
// repository is the handful of ACF/AA verses the Natal video quotes (estudos/biblia-natal/data/verses.json).
// The guard cuts each quote into runs of NGRAM words, drops the runs BLIVRE also has anywhere (both descend from
// Almeida, so they share phrases), and looks for the remaining runs in other text. A partial quote is caught too.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

export const NGRAM = 6;

const TEXT_EXT = new Set([".html", ".rsc", ".js", ".mjs", ".json", ".txt", ".md", ".meta", ".body", ".ts", ".tsx", ".css", ".svg"]);

/**
 * Lowercase words with accents, after undoing the escapes HTML, JSON and JS bundles use, split into segments.
 * A segment ends at a double quote or at an HTML tag, so a run never joins two JSON strings or two elements
 * (the end of one verse and the start of the next). React's empty text separators ("<!-- -->") are not boundaries.
 */
export function segments(s: string): string[][] {
  const plain = s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/<!-- -->/g, "")
    .normalize("NFC")
    .toLowerCase();
  return plain.split(/<[^>]*>|"/).map((part) => part.match(/\p{L}+/gu) ?? []).filter((ws) => ws.length >= NGRAM);
}

function grams(s: string): string[] {
  const out: string[] = [];
  for (const ws of segments(s)) for (let i = 0; i + NGRAM <= ws.length; i++) out.push(ws.slice(i, i + NGRAM).join(" "));
  return out;
}

export type Quote = { label: string; text: string };

/** Runs of NGRAM words of the protected quotes that BLIVRE does not have, mapped to the quote they come from. */
export function protectedRuns(quotes: Quote[], blivre: Iterable<string>): Map<string, string> {
  const free = new Set<string>();
  for (const t of blivre) for (const g of grams(t)) free.add(g);
  const runs = new Map<string, string>();
  for (const q of quotes) for (const g of grams(q.text.replace(/"/g, " "))) if (!free.has(g)) runs.set(g, q.label);
  return runs;
}

/** The protected quotes found in `text`, with the first run that matched each. */
export function findLeaks(text: string, runs: Map<string, string>): string[] {
  const hits = new Map<string, string>();
  for (const g of grams(text)) {
    const label = runs.get(g);
    if (label && !hits.has(label)) hits.set(label, g);
  }
  return [...hits].map(([label, g]) => `${label}: "${g}"`);
}

/** Text files under `dir`, recursively, by extension. */
export function textFiles(dir: string, skip: (path: string) => boolean = () => false): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (skip(p)) return [];
    if (statSync(p).isDirectory()) return textFiles(p, skip);
    return TEXT_EXT.has(extname(p)) || !extname(p) ? [p] : [];
  });
}

/** The ACF/AA quotes of verses.json (metadata keys such as `_books_sample` left out). */
export function loadProtectedQuotes(versesJson: string): Quote[] {
  const data = JSON.parse(readFileSync(versesJson, "utf8")) as Record<string, Record<string, unknown>>;
  const out: Quote[] = [];
  for (const [translation, verses] of Object.entries(data)) {
    for (const [ref, quote] of Object.entries(verses)) {
      if (ref.startsWith("_")) continue;
      if (typeof quote !== "string") throw new Error(`${translation} ${ref} is not a string`);
      out.push({ label: `${translation} ${ref}`, text: quote });
    }
  }
  return out;
}
