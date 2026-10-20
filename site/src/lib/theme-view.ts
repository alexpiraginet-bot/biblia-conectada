// What a theme page shows besides the source data (src/lib/timeline.ts): how linked each passage is, and the words
// its passages share (src/lib/timeline-graph.ts), over the BLIVRE text and the OpenBible links. Server only.
import "server-only";
import type { Theme, ThemePassage } from "@/lib/timeline";
import { rankPassages, sharedWords, WORDS_SHOWN } from "@/lib/timeline-graph";
import { verseTable, wordLabel } from "@/lib/word-index";

export type ThemeView = {
  /** the passages, most linked first (then the higher OpenBible score, then the Bible's order) */
  passages: (ThemePassage & { pairs: number })[];
  words: { key: string; label: string; passages: number }[];
};

export async function themeView(t: Theme): Promise<ThemeView> {
  const { text, links } = await verseTable();
  const words = await Promise.all(
    sharedWords(t.passages, text, WORDS_SHOWN, t.key).map(async (w) => ({ ...w, label: (await wordLabel(w.key)) ?? w.key })),
  );
  return { passages: rankPassages(t.passages, links), words };
}
