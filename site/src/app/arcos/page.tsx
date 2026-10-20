import type { Metadata } from "next";
import { SCULPTURE_POSTER } from "@/components/sculpture/poster";
import { Sculpture, type SculptureInitial } from "@/components/sculpture/Sculpture";
import { formatInt } from "@/lib/canon/text";
import { books, summary } from "@/lib/data";
import styles from "./page.module.css";

// /arcos: the light sculpture (design/README.md §15), every verse pair of the cross references as a thread of light
// over the Bible, in 3D. Outside the (site) group: the stage fills the column under the top bar. Every number comes
// from src/data/generated/summary.json (scripts/build-data.ts); scripts/check-dist.ts checks them in the built HTML.
const c = summary.counts;

export const metadata: Metadata = {
  title: "Céu de ligações",
  description: `As ${formatInt(c.crossrefRows)} referências cruzadas da OpenBible.info, ${formatInt(c.arcs)} pares de versículos, como uma escultura de luz sobre a Bíblia inteira. Gire, aproxime e siga cada ligação até o texto.`,
};

/** verses the intro offers first; the most linked verse of the Bible joins them (summary.topVerses) */
const EXAMPLES: [slug: string, chapter: number, verse: number][] = [
  ["isaias", 53, 5],
  ["joao", 3, 16],
  ["salmos", 23, 1],
];

function verseIndex(slug: string, chapter: number, verse: number): { gv: number; label: string } {
  const book = books.find((b) => b.slug === slug);
  if (!book || chapter > book.verses.length || verse > book.verses[chapter - 1]) throw new Error(`arcos: no verse ${slug} ${chapter}:${verse}`);
  let gv = book.firstVerse;
  for (let i = 0; i < chapter - 1; i++) gv += book.verses[i];
  return { gv: gv + verse - 1, label: `${book.name} ${chapter}:${verse}` };
}

export default function Arcos() {
  const top = summary.topVerses[0];
  const examples = EXAMPLES.map(([s, ch, v]) => verseIndex(s, ch, v));
  if (!examples.some((x) => x.gv === top.gv)) examples.push({ gv: top.gv, label: top.ref });
  const initial: SculptureInitial = {
    counts: { verses: c.verses, crossrefRows: c.crossrefRows, arcs: c.arcs, chapters: c.chapters },
    top: { ref: top.ref, links: top.links },
    examples,
  };
  return (
    <>
      {/* the phone's poster is the first paint's largest picture: ask for it with the document instead of after the CSS
          (the theme the device prefers; a theme chosen by hand gets its image from the CSS as usual). React moves these
          links into the head. Wide screens draw the poster fast enough from the CSS. */}
      {(["noite", "dia"] as const).map((theme) => (
        <link
          key={theme}
          rel="preload"
          as="image"
          href={SCULPTURE_POSTER.phone[theme].avif}
          type="image/avif"
          fetchPriority="high"
          media={`(max-width: 47.99rem) and (prefers-color-scheme: ${theme === "dia" ? "light" : "dark"})`}
        />
      ))}
      <main id="conteudo" className={styles.main}>
        <Sculpture initial={initial} />
      </main>
    </>
  );
}
