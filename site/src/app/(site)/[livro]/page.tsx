import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { ChapterArcs } from "@/components/reader/Arcs";
import readerStyles from "@/components/reader/reader.module.css";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { bookBySlug, bookPartners, chapterPairs } from "@/lib/reading";
import styles from "./livro.module.css";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.map((b) => ({ livro: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[livro]">): Promise<Metadata> {
  const book = bookBySlug((await params).livro);
  return book ? { title: book.name, alternates: { canonical: `/${book.slug}` } } : {};
}

export default async function LivroPage({ params }: PageProps<"/[livro]">) {
  const book = bookBySlug((await params).livro);
  if (!book) notFound();
  const verses = book.verses.reduce((a, b) => a + b, 0);
  const ranked = book.verses
    .map((_, i) => ({ chapter: i + 1, pairs: chapterPairs(book, i + 1) }))
    .sort((x, y) => y.pairs - x.pairs || x.chapter - y.chapter);
  const cut = ranked[Math.min(5, ranked.length) - 1].pairs;
  const top = ranked.filter((r, i) => i < 5 || r.pairs === cut);
  const prev = books[book.index - 1];
  const next = books[book.index + 1];
  const single = book.verses.length === 1;
  const partners = await bookPartners(book);

  return (
    <main id="conteudo" className={styles.main}>
      <nav aria-label="Trilha" className={styles.crumbs}>
        <Link href="/ler">Livros</Link>
        <ChevronRight size={14} />
        <span aria-current="page">{book.name}</span>
      </nav>
      <h1 className={styles.title}>{book.name}</h1>
      <p className={styles.meta}>
        {formatInt(book.verses.length)} {single ? "capítulo" : "capítulos"} · {formatInt(verses)} versículos ·{" "}
        {book.testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}
      </p>

      <div className={styles.cols}>
        <section aria-labelledby="capitulos">
          <h2 id="capitulos" className={styles.h2}>
            Capítulos
          </h2>
          <ol className={styles.grid}>
            {book.verses.map((n, i) => (
              <li key={i}>
                <Link href={`/${book.slug}/${i + 1}`} className={styles.chapter} aria-label={`${book.name} ${i + 1}, ${n} versículos`}>
                  {i + 1}
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ligacoes" className={styles.links}>
          <h2 id="ligacoes" className={readerStyles.panelTitle}>
            Ligações de {book.name}
          </h2>
          {partners.length > 0 && (
            <ChapterArcs ci={book.firstChapter + (book.verses.length - 1) / 2} label={book.name} partners={partners} book />
          )}
          {!single && (
            <>
              <h3 className={readerStyles.listTitle}>
                Capítulos mais ligados
                <span>ligações que tocam o capítulo, com qualquer voto</span>
              </h3>
              <ol className={readerStyles.rows}>
                {top.map((r) => (
                  <li key={r.chapter} className={readerStyles.row}>
                    <Link href={`/${book.slug}/${r.chapter}`}>
                      {book.name} {r.chapter}
                    </Link>
                    <span className={readerStyles.votes}>{formatInt(r.pairs)} ligações</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      <nav aria-label="Outros livros" className={styles.pager}>
        {prev ? (
          <Link href={`/${prev.slug}`} rel="prev">
            <ChevronLeft />
            {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/${next.slug}`} rel="next">
            {next.name}
            <ChevronRight />
          </Link>
        )}
      </nav>
    </main>
  );
}
