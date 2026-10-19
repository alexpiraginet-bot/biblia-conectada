import localFont from "next/font/local";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { ChapterText } from "@/components/reader/ChapterText";
import { VerseFocus } from "@/components/reader/VerseFocus";
import styles from "@/components/reader/reader.module.css";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { bookBySlug, chapterNumber, chapterPairs, chapterVerses, neighbours } from "@/lib/reading";

// Literata: the Bible text face (design §4). Declared here so only reading routes load it.
const literata = localFont({
  src: "../../../../fonts/Literata-wght-latin.woff2",
  variable: "--font-scripture",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.flatMap((b) => b.verses.map((_, i) => ({ livro: b.slug, cap: String(i + 1) })));
}

export default async function ChapterLayout({ params, children }: LayoutProps<"/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  // an address that names no chapter: the page below sends it on with all its segments, the verse's included
  // (src/lib/missing.ts), which this layout cannot see
  if (!book || !chapter) return children;
  const verses = await chapterVerses(book, chapter);
  const { prev, next } = neighbours(book, chapter);
  const pairs = chapterPairs(book, chapter);

  const pager = (where: string) => (
    <nav aria-label={`Capítulos (${where})`} className={styles.pager}>
      {prev ? (
        <Link href={prev.path} rel="prev">
          <ChevronLeft />
          {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.path} rel="next">
          {next.label}
          <ChevronRight />
        </Link>
      )}
    </nav>
  );

  return (
    <div className={`${styles.reader} ${literata.variable}`}>
      <nav aria-label={`Capítulos de ${book.name}`} className={styles.rail}>
        <p className={styles.railTitle}>
          <Link href={`/${book.slug}`}>{book.name}</Link>
        </p>
        <ol className={styles.railGrid}>
          {book.verses.map((_, i) => (
            <li key={i}>
              <Link href={`/${book.slug}/${i + 1}`} aria-current={i + 1 === chapter ? "page" : undefined}>
                {i + 1}
              </Link>
            </li>
          ))}
        </ol>
        <p className={styles.railAll}>
          <Link href="/ler">Todos os livros</Link>
        </p>
      </nav>

      <main id="conteudo" className={styles.main}>
        <article id="leitura" className={styles.text} aria-labelledby="titulo-capitulo">
          <nav aria-label="Trilha" className={styles.crumbs}>
            <Link href="/ler">Livros</Link>
            <ChevronRight size={14} />
            <Link href={`/${book.slug}`}>{book.name}</Link>
            <ChevronRight size={14} />
            <span aria-current="page">{chapter}</span>
          </nav>
          <h1 id="titulo-capitulo" className={styles.title}>
            {book.name} {chapter}
          </h1>
          <p className={styles.meta}>
            {formatInt(verses.length)} versículos · {formatInt(pairs)} ligações · Bíblia Livre (BLIVRE)
          </p>
          {pager("topo")}
          <ChapterText book={book} chapter={chapter} verses={verses} />
          {pager("fim")}
        </article>
        {children}
      </main>
      <VerseFocus />
    </div>
  );
}
