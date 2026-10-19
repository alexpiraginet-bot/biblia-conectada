import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "@/components/icons";
import { ChapterPager, ChapterRail } from "@/components/reader/ChapterNav";
import { ChapterText } from "@/components/reader/ChapterText";
import { literata } from "@/components/reader/literata";
import { SelectionScope } from "@/components/reader/SelectionBar";
import { VerseFocus } from "@/components/reader/VerseFocus";
import styles from "@/components/reader/reader.module.css";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { testamentName } from "@/lib/from-here";
import { bookBySlug, chapterNumber, chapterPairs, chapterVerses, neighbours } from "@/lib/reading";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.flatMap((b) => b.verses.map((_, i) => ({ livro: b.slug, cap: String(i + 1) })));
}

// Reading page after Alex's light reference: rail of nearby chapters (from 80rem), the chapter in the title face
// under its testament, the verses with accent numbers and the link-count margin, and the panel beside (or as a sheet).
export default async function ChapterLayout({ params, children }: LayoutProps<"/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  if (!book || !chapter) notFound();
  const verses = await chapterVerses(book, chapter);
  const { prev, next } = neighbours(book, chapter);
  const pairs = chapterPairs(book, chapter);

  return (
    <div className={`${styles.reader} ${literata.variable}`}>
      <ChapterRail book={book} chapter={chapter} />

      <main id="conteudo" className={styles.main}>
        <article id="leitura" className={styles.text} aria-labelledby="titulo-capitulo">
          <nav aria-label="Trilha" className={styles.crumbs}>
            <Link href="/ler">Livros</Link>
            <ChevronRight size={14} />
            <Link href={`/${book.slug}`}>{book.name}</Link>
            <ChevronRight size={14} />
            <span aria-current="page">{chapter}</span>
          </nav>
          <p className="kicker">{testamentName(book.testament)}</p>
          <h1 id="titulo-capitulo" className={styles.title}>
            {book.name} {chapter}
          </h1>
          <p className={styles.meta}>
            {formatInt(verses.length)} versículos · {formatInt(pairs)} ligações · Bíblia Livre (BLIVRE)
          </p>
          <ChapterPager book={book} chapter={chapter} prev={prev} next={next} where="topo" />
          <SelectionScope slug={book.slug} bookName={book.name} chapter={chapter}>
            <ChapterText book={book} chapter={chapter} verses={verses} />
          </SelectionScope>
          <ChapterPager book={book} chapter={chapter} prev={prev} next={next} where="fim" />
        </article>
        {children}
      </main>
      <VerseFocus />
    </div>
  );
}
