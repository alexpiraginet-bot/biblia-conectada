import Link from "next/link";
import { Icon } from "@/components/icons";
import type { Book } from "@/lib/canon/types";
import { barShare, linksLabel } from "@/lib/from-here";
import type { ChapterRef } from "@/lib/reading";
import styles from "./reader.module.css";

/**
 * Every chapter of the book (design system ChapterNav, ds.css .bc-chapterbar), each with a short bar for its links:
 * a vertical rail beside the text from 64rem, a bar that scrolls sideways under the top bar on phones. One list for
 * both, so the links are sent once; CenterCurrent scrolls the current chapter into view inside it.
 */
export function ChapterList({ book, chapter, counts }: { book: Book; chapter: number; counts: readonly number[] }) {
  const max = Math.max(...counts);
  return (
    <nav aria-label={`Capítulos de ${book.name}`} className={styles.chapters}>
      <p className={styles.chaptersHead}>
        {book.name}
        <span>ligações por capítulo</span>
      </p>
      <ol className={`bc-chapterbar ${styles.chapterList}`} data-chapters="">
        {counts.map((n, i) => (
          <li key={i}>
            <Link
              href={`/${book.slug}/${i + 1}`}
              aria-label={`${book.name} ${i + 1}, ${linksLabel(n)}`}
              aria-current={i + 1 === chapter ? "page" : undefined}
              style={{ "--w": barShare(n, max) } as React.CSSProperties}
            >
              {i + 1}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export type PagerChapter = ChapterRef & { pairs: number };

/** Previous and next chapter, across books, with their links (ds.css .bc-pager), at the top and the end of the text. */
export function ChapterPager({ prev, next, where }: { prev?: PagerChapter; next?: PagerChapter; where: "topo" | "fim" }) {
  return (
    <nav
      className={`bc-pager ${styles.pager}`}
      aria-label={where === "topo" ? "Capítulo anterior e seguinte" : "Capítulo anterior e seguinte, no fim do texto"}
      data-where={where}
    >
      {prev ? (
        <Link href={prev.path} rel="prev">
          <small className={styles.pagerWay}>
            <Icon name="chev-l" className={`bc-icon ${styles.pagerIcon}`} />
            Anterior
          </small>
          <strong>{prev.label}</strong>
          <small>{linksLabel(prev.pairs)}</small>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.path} rel="next">
          <small className={styles.pagerWay}>
            Seguinte
            <Icon name="chev-r" className={`bc-icon ${styles.pagerIcon}`} />
          </small>
          <strong>{next.label}</strong>
          <small>{linksLabel(next.pairs)}</small>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
