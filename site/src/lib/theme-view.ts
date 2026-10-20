// What a theme page shows besides the source data (src/lib/timeline.ts): how linked each passage is, and the words
// its passages share. Counted from the BLIVRE text and the OpenBible links of the per-book files; recomputed in
// tests/timeline-view.test.ts. Server only.
import "server-only";
import type { Theme, ThemePassage } from "@/lib/timeline";
import { contentKeys } from "@/lib/words";
import { verseTable, wordLabel } from "@/lib/word-index";

type VerseLink = readonly [number, number, number];

/** OpenBible pairs with at least one verse in the passage (the events' rule, "ligações que tocam o trecho"). */
export function passagePairs(p: Pick<ThemePassage, "from" | "to">, links: readonly (readonly VerseLink[])[]): number {
  const keys = new Set<string>();
  for (let gv = p.from; gv <= p.to; gv++) for (const [o] of links[gv]) keys.add(gv < o ? `${gv}:${o}` : `${o}:${gv}`);
  return keys.size;
}

/** Content words (src/lib/words.ts) by the number of the theme's passages that have them; at least `min` passages. */
export function sharedWords(
  passages: readonly Pick<ThemePassage, "from" | "to">[],
  text: readonly string[],
  n: number,
  min = 2,
): { key: string; passages: number }[] {
  const count = new Map<string, number>();
  const first = new Map<string, number>();
  passages.forEach((p, i) => {
    const keys = new Set<string>();
    for (let gv = p.from; gv <= p.to; gv++) for (const k of contentKeys(text[gv])) keys.add(k);
    for (const k of keys) {
      count.set(k, (count.get(k) ?? 0) + 1);
      if (!first.has(k)) first.set(k, i);
    }
  });
  return [...count]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1] || first.get(a[0])! - first.get(b[0])! || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, c]) => ({ key, passages: c }));
}

/** Words shown on a theme page. */
export const WORDS_SHOWN = 8;

export type ThemeView = {
  /** the passages, most linked first (then the higher OpenBible score, then the Bible's order) */
  passages: (ThemePassage & { pairs: number })[];
  words: { key: string; label: string; passages: number }[];
};

export async function themeView(t: Theme): Promise<ThemeView> {
  const { text, links } = await verseTable();
  const passages = t.passages
    .map((p) => ({ ...p, pairs: passagePairs(p, links) }))
    .sort((a, b) => b.pairs - a.pairs || b.score - a.score || a.from - b.from);
  const words = await Promise.all(
    sharedWords(t.passages, text, WORDS_SHOWN).map(async (w) => ({ ...w, label: (await wordLabel(w.key)) ?? w.key })),
  );
  return { passages, words };
}
