import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ChapterArcs } from "@/components/reader/Arcs";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { books } from "@/lib/data";
import { barShare, keepBookNumber, linksLabel, testamentName } from "@/lib/from-here";
import { medalhaoForBook } from "@/lib/medalhoes";
import { missingPage, NOT_FOUND_TITLE } from "@/lib/missing";
import { bookBySlug, bookPairs, bookPartners, bookVerseCount, chapterPairs } from "@/lib/reading";
import styles from "./livro.module.css";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.map((b) => ({ livro: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[livro]">): Promise<Metadata> {
  const book = bookBySlug((await params).livro);
  return book ? { title: book.name, alternates: { canonical: `/${book.slug}` } } : { title: NOT_FOUND_TITLE };
}

const TOP = 5; // most linked chapters listed, plus any tied with the last

/** The previous or next book in the pager, with its links. */
async function pagerBook(book: Book | undefined) {
  return book && { book, pairs: await bookPairs(book) };
}

// A book: its title and numbers, every chapter as a number with its links (44px targets), and beside them the book's
// most linked chapters and its arcs over the whole Bible; the previous and next book at the end.
export default async function LivroPage({ params }: PageProps<"/[livro]">) {
  const { livro } = await params;
  const book = bookBySlug(livro);
  if (!book) missingPage([livro]);
  const counts = book.verses.map((_, i) => chapterPairs(book, i + 1));
  const max = Math.max(...counts);
  const ranked = counts.map((pairs, i) => ({ chapter: i + 1, pairs })).sort((x, y) => y.pairs - x.pairs || x.chapter - y.chapter);
  const cut = ranked[Math.min(TOP, ranked.length) - 1].pairs;
  const top = ranked.filter((r, i) => i < TOP || r.pairs === cut);
  const single = book.verses.length === 1;
  const [pairs, partners, prev, next] = await Promise.all([
    bookPairs(book),
    bookPartners(book),
    pagerBook(books[book.index - 1]),
    pagerBook(books[book.index + 1]),
  ]);
  const medal = medalhaoForBook(book.osis);

  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <nav aria-label="Trilha">
        <ol className="bc-crumbs">
          <li>
            <Link href="/ler">Livros</Link>
          </li>
          <li aria-hidden="true">›</li>
          {medal && (
            <>
              <li>
                <Link href={`/ler#${medal.id}`}>{medal.category}</Link>
              </li>
              <li aria-hidden="true">›</li>
            </>
          )}
          <li aria-current="page">{book.name}</li>
        </ol>
      </nav>
      <div className={styles.titleRow}>
        {medal && (
          // eslint-disable-next-line @next/next/no-img-element -- a 192 px illustration, already sized; next/image adds JS
          <img className={`bc-medallion__img ${styles.medal}`} src={medal.src192} width={192} height={192} alt={medal.alt} />
        )}
        <h1 className="bc-display">{keepBookNumber(book.name)}</h1>
      </div>
      <p className={`bc-meta ${styles.meta}`} data-book-meta="">
        {formatInt(book.verses.length)} {single ? "capítulo" : "capítulos"} · {formatInt(bookVerseCount(book))} versículos ·{" "}
        {linksLabel(pairs)} · {testamentName(book.testament)}
      </p>

      <div className={styles.cols}>
        <section aria-labelledby="capitulos">
          <h2 id="capitulos" className="bc-section-title">
            {single ? "Capítulo" : "Capítulos"}
            <small>e as ligações de cada um</small>
          </h2>
          <ol className={styles.grid} data-chapters-grid="">
            {counts.map((n, i) => (
              <li key={i}>
                <Link
                  href={`/${book.slug}/${i + 1}`}
                  className={styles.chapter}
                  aria-label={`${book.name} ${i + 1}, ${linksLabel(n)}`}
                  style={{ "--w": barShare(n, max) } as React.CSSProperties}
                >
                  <span className={styles.chapterN}>{i + 1}</span>
                  <span className={styles.chapterLinks}>{formatInt(n)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <aside aria-labelledby="ligacoes" className={`bc-panel ${styles.panel}`}>
          <h2 id="ligacoes" className="bc-title">
            {keepBookNumber(`Ligações de ${book.name}`)}
          </h2>
          {!single && (
            <section aria-labelledby="mais-ligados">
              <h3 id="mais-ligados" className="bc-section-title">
                Capítulos mais ligados
                <small>pelas ligações que tocam o capítulo</small>
              </h3>
              <ol className={`bc-list ${styles.topList}`} data-mais-ligados-livro="">
                {top.map((r) => (
                  <li key={r.chapter}>
                    <Link href={`/${book.slug}/${r.chapter}`}>
                      <span className="bc-list__name">
                        {book.name} {r.chapter}
                      </span>
                      <span className="bc-list__meta">{linksLabel(r.pairs)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {partners.length > 0 && (
            <ChapterArcs ci={book.firstChapter + (book.verses.length - 1) / 2} label={book.name} partners={partners} book />
          )}
          <p className={styles.source}>
            Ligações: pares de versículos da OpenBible.info com ao menos um versículo no livro ou no capítulo; um trecho conta
            pelo primeiro versículo.
          </p>
        </aside>
      </div>

      <nav className={`bc-pager ${styles.pager}`} aria-label="Livro anterior e seguinte">
        {prev ? (
          <Link href={`/${prev.book.slug}`} rel="prev">
            <small className={styles.pagerWay}>
              <Icon name="chev-l" className={`bc-icon ${styles.pagerIcon}`} />
              Livro anterior
            </small>
            <strong>{keepBookNumber(prev.book.name)}</strong>
            <small>{linksLabel(prev.pairs)}</small>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/${next.book.slug}`} rel="next">
            <small className={styles.pagerWay}>
              Livro seguinte
              <Icon name="chev-r" className={`bc-icon ${styles.pagerIcon}`} />
            </small>
            <strong>{keepBookNumber(next.book.name)}</strong>
            <small>{linksLabel(next.pairs)}</small>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
