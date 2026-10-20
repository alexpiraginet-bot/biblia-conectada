// Server-side index of the BLIVRE words, built once per process from the per-book files (build time, and the first
// request of a /palavra page that was not prerendered). Matching is accent- and case-insensitive on whole words
// (src/lib/words.ts). Never imported by client code.
import { books } from "@/lib/data";
import { STOPWORDS, tokenize, wordKey } from "@/lib/words";

type Link = [number, number, number];
type BookFile = { chapters: { t: string; l: Link[] }[][] };
type Index = { text: string[]; links: Link[][]; verses: Map<string, number[]>; forms: Map<string, Map<string, number>> };

let built: Promise<Index> | null = null;

async function build(): Promise<Index> {
  const text: string[] = [];
  const links: Link[][] = [];
  for (const b of books) {
    const f = ((await import(`@/data/generated/books/${b.slug}.json`)) as { default: BookFile }).default;
    for (const ch of f.chapters) for (const v of ch) {
      text.push(v.t);
      links.push(v.l);
    }
  }
  const verses = new Map<string, number[]>();
  const forms = new Map<string, Map<string, number>>();
  text.forEach((t, gv) => {
    for (const w of tokenize(t)) {
      const k = wordKey(w);
      const list = verses.get(k) ?? verses.set(k, []).get(k)!;
      if (list[list.length - 1] !== gv) list.push(gv);
      const f = forms.get(k) ?? forms.set(k, new Map()).get(k)!;
      f.set(w, (f.get(w) ?? 0) + 1);
    }
  });
  return { text, links, verses, forms };
}

const index = () => (built ??= build());

export type WordPage = {
  key: string;
  /** the word as the BLIVRE writes it most often (lowercase unless it is always capitalised) */
  label: string;
  verses: number[];
  /** OpenBible links whose two verses both have the word: [a, b, votes], strongest first */
  linksAmong: [number, number, number][];
  /** links each verse has to other verses with the word */
  degree: Map<number, number>;
};

/** Everything a /palavra page shows, or null for a stopword or a word the BLIVRE does not have. */
export async function wordPage(key: string): Promise<WordPage | null> {
  if (STOPWORDS.has(key) || key.length < 2) return null;
  const ix = await index();
  const verses = ix.verses.get(key);
  if (!verses?.length) return null;
  const set = new Set(verses);
  const linksAmong: [number, number, number][] = [];
  const degree = new Map<number, number>();
  for (const gv of verses) {
    for (const [other, votes] of ix.links[gv]) {
      if (!set.has(other)) continue;
      degree.set(gv, (degree.get(gv) ?? 0) + 1);
      if (other > gv) linksAmong.push([gv, other, votes]);
    }
  }
  linksAmong.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
  return { key, label: labelOf(ix, key), verses, linksAmong, degree };
}

function labelOf(ix: Index, key: string): string {
  const forms = [...(ix.forms.get(key) ?? new Map<string, number>())];
  const lower = new Map<string, number>();
  for (const [w, n] of forms) lower.set(w.toLowerCase(), (lower.get(w.toLowerCase()) ?? 0) + n);
  const alwaysCapital = forms.every(([w]) => w !== w.toLowerCase());
  const pick = (m: [string, number][]) => m.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  return alwaysCapital ? pick(forms) : pick([...lower]);
}

/** The word as the BLIVRE writes it most often (the label of its /palavra page), or null when the text lacks it. */
export async function wordLabel(key: string): Promise<string | null> {
  const ix = await index();
  return ix.forms.has(key) ? labelOf(ix, key) : null;
}

export async function blivreText(gv: number): Promise<string> {
  return (await index()).text[gv];
}

/** The BLIVRE text and the OpenBible links of every verse, by global index: the same per-book files, read once per
 *  process (the timeline and theme pages count links over many verses at once). */
export async function verseTable(): Promise<{ text: readonly string[]; links: readonly (readonly Link[])[] }> {
  const ix = await index();
  return { text: ix.text, links: ix.links };
}
