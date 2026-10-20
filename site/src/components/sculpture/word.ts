// The verses of a word in the sculpture (/arcos, "#palavra/…"): the site's own word index of the BLIVRE text
// (public/data/busca/v1, search/text-index.ts), shared with the search palette so a word asked in both is fetched once.
// A query is what the search box takes: words that must all be in the verse, accents and case ignored, and "phrases in
// quotes". Loaded only when a word is asked for.
import { markVerse, parseTextQuery, type Segment, type TextIndex, type TextQuery } from "../search/text-index";
import { textIndex } from "../search/useTextSearch";

export type WordResult = { query: TextQuery; verses: Int32Array };

/** The verses of the query in an index, most linked first (then canonical order); null when it has no word. */
export async function versesFrom(index: TextIndex, q: string): Promise<WordResult | null> {
  const query = parseTextQuery(q);
  if (!query) return null;
  const [meta, ranks] = await Promise.all([index.meta(), index.search(query)]);
  const verses = new Int32Array(ranks.length);
  for (let i = 0; i < ranks.length; i++) verses[i] = meta.verse[ranks[i]];
  return { query, verses };
}

/** The verses of the query, from the page's shared index. */
export const versesOfWord = (q: string) => versesFrom(textIndex, q);

/** A verse's text cut into plain and marked runs (the query's words), at most `maxWords` words around the first mark. */
export function marked(text: string, query: TextQuery, maxWords = 28): Segment[] {
  return markVerse(text, query, maxWords);
}
