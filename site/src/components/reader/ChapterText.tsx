import Link from "next/link";
import { VerseActions } from "@/components/assistant/VerseActions";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import type { VerseData } from "@/lib/reading";
import { Scripture } from "./Scripture";
import styles from "./reader.module.css";

// The reading column (design system Scripture, ds.css .bc-scripture / .bc-verse): one block per verse, the number in
// the accent hanging at its start, the BLIVRE text, and the pill with the verse's links closing it. The pill is the
// link to the verse's page, so the text works without JavaScript. The BLIVRE text of each verse sits alone in its
// [data-scripture] span: the selection bar reads the selected text from there, and the number, the hidden
// "Versículo N:" label and the pill stay out of a copy (user-select).
export function ChapterText({ book, chapter, verses }: { book: Book; chapter: number; verses: VerseData[] }) {
  return (
    <ol className={`bc-scripture ${styles.verses}`}>
      {verses.map((v) => {
        const n = v.links.length;
        const label = n === 0 ? "nenhuma ligação" : `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;
        return (
          <li key={v.n} id={`v${v.n}`} className={`bc-verse ${styles.verse}`} data-verse={v.n}>
            <span className={`bc-verse__n ${styles.vnum}`} aria-hidden="true">
              {v.n}
            </span>
            <span className="visually-hidden">Versículo {v.n}: </span>
            <span className={styles.vbody}>
              <span data-scripture="">
                <Scripture text={v.text} />
              </span>{" "}
              <Link
                href={`/${book.slug}/${chapter}/${v.n}`}
                scroll={false}
                className={`bc-verse__links ${styles.pill}`}
                aria-label={`${book.name} ${chapter}:${v.n}, ${label}`}
                data-links=""
                data-zero={n === 0 || undefined}
              >
                <span className="i i-arc" />
                {formatInt(n)}
              </Link>
              {" "}<VerseActions path={`/${book.slug}/${chapter}/${v.n}`} label={`${book.name} ${chapter}:${v.n}`} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
