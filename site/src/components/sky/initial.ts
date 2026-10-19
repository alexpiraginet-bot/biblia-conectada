// Server side of the sky: what the /arcos page needs in its HTML before any JavaScript runs. Read at build time from
// the files written by scripts/build-data.ts (CLAUDE.md rule 3: every number comes from the pipeline).
import skyJson from "../../../public/data/sky.json";
import { books, summary } from "@/lib/data";
import { bookRows, partnerChapters, type BookRow, type SkyMeta, type TopList } from "./model";

const sky = skyJson as unknown as SkyMeta;

export type SkyInitial = {
  books: BookRow[];
  nch: number;
  /** the most linked verse, lit when the page opens (summary.topVerses[0]) */
  verse: { gv: number; ref: string; path: string; links: number; ci: number };
  /** its partners (global verse indices), every one of them, so the gold arcs never depend on the arc file loaded */
  partners: number[];
  /** chapters holding those partners */
  verseList: TopList;
  arcs: number;
  head: { count: number; minVotes: number };
};

export async function skyInitial(): Promise<SkyInitial> {
  const top = summary.topVerses[0];
  const [, slug, chapter, verse] = top.path.split("/");
  const book = books.find((b) => b.slug === slug);
  if (!book) throw new Error(`sky: no book ${slug}`);
  const file = (await import(`@/data/generated/books/${slug}.json`)) as {
    default: { chapters: { l: [number, number, number][] }[][] };
  };
  const partners = file.default.chapters[Number(chapter) - 1][Number(verse) - 1].l.map(([gv]) => gv);
  if (partners.length !== top.links) throw new Error(`sky: ${top.ref} has ${partners.length} partners, summary says ${top.links}`);
  if (sky.topVerses[0].gv !== top.gv) throw new Error("sky.json and summary.json disagree on the most linked verse");

  // global verse -> global chapter, from the book table
  const chapOf = new Uint16Array(summary.counts.verses);
  for (const b of books) {
    let first = b.firstVerse;
    b.verses.forEach((n, c) => {
      chapOf.fill(b.firstChapter + c, first, first + n);
      first += n;
    });
  }

  return {
    books: bookRows(sky),
    nch: summary.counts.chapters,
    verse: { gv: top.gv, ref: top.ref, path: top.path, links: top.links, ci: chapOf[top.gv] },
    partners,
    verseList: partnerChapters((gv) => chapOf[gv], partners),
    arcs: sky.files.full.count,
    head: { count: sky.files.head.count, minVotes: sky.files.head.minVotes },
  };
}
