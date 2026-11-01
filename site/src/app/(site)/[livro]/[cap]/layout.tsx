import { Crumbs } from "@/components/Crumbs";
import { CenterCurrent } from "@/components/reader/CenterCurrent";
import { ChapterList, ChapterPager, type PagerChapter } from "@/components/reader/ChapterNav";
import { ChapterSeal } from "@/components/reader/ChapterSeal";
import { ChapterText } from "@/components/reader/ChapterText";
import { SelectionScope } from "@/components/reader/SelectionBar";
import { VerseFocus } from "@/components/reader/VerseFocus";
import { EditionChoice } from "@/components/reader/EditionChoice";
import { ChapterReadingControls } from "@/components/reading-progress/ReadingControls";
import styles from "@/components/reader/reader.module.css";
import { books } from "@/lib/data";
import { chapterMeta, keepBookNumber } from "@/lib/from-here";
import { medalhaoForBook } from "@/lib/medalhoes";
import { bookBySlug, type ChapterRef, chapterNumber, chapterPairs, chapterPartners, chapterVerses, grid, neighbours } from "@/lib/reading";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.flatMap((b) => b.verses.map((_, i) => ({ livro: b.slug, cap: String(i + 1) })));
}

const withPairs = (r?: ChapterRef): PagerChapter | undefined => r && { ...r, pairs: chapterPairs(r.book, r.chapter) };

// The reading page (design/README.md §5, the Atlas prototype): every chapter of the book (a rail from 64rem, a bar on
// phones), the text column (crumbs, the chapter seal and title, the meta line, the pager, the verses with their
// links pills) and the panel of the page below (the chapter's links, or a verse's as a sheet on phones). The text
// lives in this layout, so choosing a verse (/livro/cap/vers) only swaps the panel.
export default async function ChapterLayout({ params, children }: LayoutProps<"/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  // an address that names no chapter: the page below sends it on with all its segments, the verse's included
  // (src/lib/missing.ts), which this layout cannot see
  if (!book || !chapter) return children;
  const verses = await chapterVerses(book, chapter);
  const partners = await chapterPartners(book, chapter);
  const { prev, next } = neighbours(book, chapter);
  const counts = book.verses.map((_, i) => chapterPairs(book, i + 1));
  const group = medalhaoForBook(book.osis);

  return (
    <div className={styles.reader}>
      <ChapterList book={book} chapter={chapter} counts={counts} />
      <CenterCurrent />

      <main id="conteudo" className={styles.main}>
        <article id="leitura" className={styles.text} aria-labelledby="titulo-capitulo">
          <Crumbs
            label="Trilha"
            className={styles.crumbs}
            items={[
              { label: "Livros", href: "/ler" },
              ...(group ? [{ label: group.category, href: `/ler#${group.id}` }] : []),
              { label: book.name, href: `/${book.slug}` },
            ]}
          />
          <div className={styles.titleRow}>
            <ChapterSeal book={book.name} chapter={chapter} partners={partners} chapterCount={grid.chapterCount} size="var(--seal)" />
            <h1 id="titulo-capitulo" className="bc-display">
              {keepBookNumber(`${book.name} ${chapter}`)}
            </h1>
          </div>
          <p className={`bc-meta ${styles.meta}`} data-chapter-meta="">
            {chapterMeta(verses.length, counts[chapter - 1], partners.length)}
          </p>
          <EditionChoice current="blivre" slug={book.slug} chapter={chapter} />
          <ChapterReadingControls path={`/${book.slug}/${chapter}`} label={`${book.name} ${chapter}`} />
          <ChapterPager prev={withPairs(prev)} next={withPairs(next)} where="topo" />
          <SelectionScope slug={book.slug} bookName={book.name} chapter={chapter}>
            <ChapterText book={book} chapter={chapter} verses={verses} />
          </SelectionScope>
          <ChapterPager prev={withPairs(prev)} next={withPairs(next)} where="fim" />
        </article>
        {children}
      </main>
      <VerseFocus />
    </div>
  );
}
