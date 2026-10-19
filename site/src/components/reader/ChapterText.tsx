import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import type { VerseData } from "@/lib/reading";
import { Scripture } from "./Scripture";
import styles from "./reader.module.css";

// One verse per block, number at the start, the link count in the margin (design §5 "margem de ligações").
// The BLIVRE text of each verse sits alone in its [data-scripture] span: the selection bar reads the selected text
// from there, and the number, the hidden "Versículo N:" label and the count are left out of a copy (user-select).
export function ChapterText({ book, chapter, verses }: { book: Book; chapter: number; verses: VerseData[] }) {
  return (
    <ol className={styles.verses}>
      {verses.map((v) => {
        const n = v.links.length;
        const label = n === 0 ? "nenhuma ligação" : `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;
        return (
          <li key={v.n} id={`v${v.n}`} className={styles.verse} data-verse={v.n}>
            <span className={styles.vnum} aria-hidden="true">
              {v.n}
            </span>
            <span className={styles.vtext}>
              <span className={`visually-hidden ${styles.vlabel}`}>Versículo {v.n}: </span>
              <span data-scripture="">
                <Scripture text={v.text} />
              </span>
            </span>
            <Link
              href={`/${book.slug}/${chapter}/${v.n}`}
              scroll={false}
              className={styles.vcount}
              aria-label={`${book.name} ${chapter}:${v.n}, ${label}`}
              data-zero={n === 0 || undefined}
            >
              <span className={`i i-arc ${styles.vcountIcon}`} />
              <span className={styles.vcountNum}>{formatInt(n)}</span>
              <span className={styles.vcountWord}>{n === 1 ? " ligação" : " ligações"}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
