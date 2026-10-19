import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import type { Book } from "@/lib/canon/types";
import { padChapter, railWindow } from "@/lib/from-here";
import type { ChapterRef } from "@/lib/reading";
import styles from "./reader.module.css";

/**
 * Rail of the reading page from 80rem: the current chapter and two on each side, zero-padded like the reference
 * ("01", "001" in Salmos), and the way to every chapter of the book. Server-rendered, no JavaScript.
 */
export function ChapterRail({ book, chapter }: { book: Book; chapter: number }) {
  const total = book.verses.length;
  return (
    <nav aria-label={`Capítulos de ${book.name}`} className={styles.rail}>
      <p className={styles.railTitle}>{book.name}</p>
      <ol className={styles.railList}>
        {railWindow(chapter, total).map((c) => (
          <li key={c}>
            <Link href={`/${book.slug}/${c}`} aria-label={`Capítulo ${c}`} aria-current={c === chapter ? "page" : undefined}>
              {padChapter(c, total)}
            </Link>
          </li>
        ))}
      </ol>
      <p className={styles.railAll}>
        <Link href={`/${book.slug}`}>Todos os capítulos</Link>
      </p>
    </nav>
  );
}

/**
 * Previous and next chapter (top and end of the text). At the top it also carries the "Capítulo N" selector, which
 * replaces the rail below 80rem: a disclosure with every chapter of the book (works without JavaScript).
 */
export function ChapterPager({
  book,
  chapter,
  prev,
  next,
  where,
}: {
  book: Book;
  chapter: number;
  prev?: ChapterRef;
  next?: ChapterRef;
  where: "topo" | "fim";
}) {
  const total = book.verses.length;
  return (
    <nav aria-label={`Capítulos (${where})`} className={styles.pager} data-where={where}>
      {prev ? (
        <Link href={prev.path} rel="prev" className={styles.pagerLink} aria-label={`Capítulo anterior, ${prev.label}`}>
          <ChevronLeft />
          <span className={styles.pagerLabel}>{prev.label}</span>
        </Link>
      ) : (
        <span className={styles.pagerGap} />
      )}
      {where === "topo" && (
        <details className={styles.picker}>
          <summary aria-label={`Capítulo ${chapter} de ${total}. Escolher capítulo de ${book.name}`}>
            <span>Capítulo {chapter}</span>
            <ChevronRight size={16} className={styles.pickerIcon} />
          </summary>
          <div className={styles.pickerPanel}>
            <ol className={styles.pickerGrid}>
              {book.verses.map((_, i) => (
                <li key={i}>
                  <Link href={`/${book.slug}/${i + 1}`} aria-current={i + 1 === chapter ? "page" : undefined}>
                    {i + 1}
                  </Link>
                </li>
              ))}
            </ol>
            <p className={styles.pickerAll}>
              <Link href={`/${book.slug}`}>Página de {book.name}</Link>
            </p>
          </div>
        </details>
      )}
      {next ? (
        <Link href={next.path} rel="next" className={styles.pagerLink} aria-label={`Próximo capítulo, ${next.label}`}>
          <span className={styles.pagerLabel}>{next.label}</span>
          <ChevronRight />
        </Link>
      ) : (
        <span className={styles.pagerGap} />
      )}
    </nav>
  );
}
