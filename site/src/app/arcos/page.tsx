import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { axisGroups } from "@/components/sculpture/groups";
import { SCULPTURE_POSTER } from "@/components/sculpture/poster";
import { Sculpture, type SculptureInitial } from "@/components/sculpture/Sculpture";
import { readQuery } from "@/components/sculpture/query";
import { chapterLabel, hashOf, parseHash, type Sel } from "@/components/sculpture/state";
import { formatInt } from "@/lib/canon/text";
import { BASE } from "@/lib/community/books-client";
import { longRef } from "@/lib/community/geometry";
import { books, credits, summary } from "@/lib/data";
import { GROUP_NAMES, type GroupId } from "@/lib/explore/atlas";
import { medalhaoForBook } from "@/lib/medalhoes";
import { STOPWORDS, isWordSlug, wordKey } from "@/lib/words";
import styles from "./page.module.css";

// /arcos: the light sculpture (design/README.md §15), every verse pair of the cross references as a thread of light
// over the Bible, in 3D. Outside the (site) group: the stage fills the column under the top bar. Every number comes
// from src/data/generated/summary.json (scripts/build-data.ts); scripts/check-dist.ts checks them in the built HTML.
const c = summary.counts;

export async function generateMetadata({ searchParams }: PageProps<"/arcos">): Promise<Metadata> {
  const { ref, v } = await searchParams;
  let selected: Sel = typeof ref === "string" ? parseHash(ref) : null;
  if (ref === undefined && typeof v === "string" && v.length <= 160) {
    const result = readQuery(v);
    if ("sel" in result) selected = result.sel;
  }
  if (selected?.kind === "word") {
    const key = wordKey(selected.q);
    const label = isWordSlug(key) && !STOPWORDS.has(key) ? await (await import("@/lib/word-index")).wordLabel(key) : null;
    selected = label ? { kind: "word", q: label } : null;
  }
  if (!selected) return shareMetadata({
    title: "Céu de ligações",
    description: `As ${formatInt(c.crossrefRows)} referências cruzadas da OpenBible.info, ${formatInt(c.arcs)} pares de versículos, como uma escultura de luz sobre a Bíblia inteira. Gire, aproxime e siga cada ligação até o texto.`,
    path: "/arcos",
  });
  const label = selected.kind === "verse" ? longRef(BASE, selected.gv)
    : selected.kind === "chapter" ? chapterLabel(selected.ci).label
      : selected.kind === "path" ? `${longRef(BASE, selected.from)} a ${longRef(BASE, selected.to)}`
        : `“${selected.q}”`;
  return shareMetadata({
    title: `${label} · Céu de ligações`,
    description: `Explore ${label} no céu de ligações da Bíblia. Leia as passagens e siga suas referências cruzadas.`,
    path: `/arcos?${new URLSearchParams({ ref: hashOf(selected).slice(1) })}`,
  });
}

/** Query-specific metadata is dynamic; keep the sculpture's initial shell prerendered. */
async function ShareSelectionMarker() {
  await connection();
  return null;
}

/** verses the intro offers first; the most linked verse of the Bible joins them (summary.topVerses) */
const EXAMPLES: [slug: string, chapter: number, verse: number][] = [
  ["isaias", 53, 5],
  ["joao", 3, 16],
  ["salmos", 23, 1],
];
/** what the intro offers to try: a path between two verses, and a word lit across the Bible */
const PATH_EXAMPLE: [from: [string, number, number], to: [string, number, number]] = [
  ["genesis", 3, 15],
  ["apocalipse", 12, 9],
];
const WORD_EXAMPLE = "cordeiro";

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
  const [from, to] = PATH_EXAMPLE.map(([s, ch, v]) => verseIndex(s, ch, v));
  // the eight book groups of the medallions (Theographic's bookDiv), as runs of chapters on the axis
  const groups = axisGroups(
    books,
    (osis) => medalhaoForBook(osis)?.id ?? null,
    (id) => {
      const name = GROUP_NAMES[id as GroupId];
      if (!name) throw new Error(`arcos: no name for the book group ${id}`);
      return name.short;
    },
  );
  const initial: SculptureInitial = {
    counts: { verses: c.verses, crossrefRows: c.crossrefRows, arcs: c.arcs, chapters: c.chapters },
    top: { ref: top.ref, links: top.links },
    examples,
    pathExample: { from: from.gv, to: to.gv, label: `${from.label} até ${to.label}` },
    wordExample: WORD_EXAMPLE,
    groups,
    strength: summary.strength,
    credits: [credits.openBibleCredit, credits.blivreCredit],
  };
  return (
    <>
      <Suspense fallback={null}><ShareSelectionMarker /></Suspense>
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
