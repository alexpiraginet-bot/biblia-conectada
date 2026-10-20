import Link from "next/link";
import { VerseStudyLink } from "@/components/assistant/VerseStudyLink";
import type { ReactNode } from "react";
import { formatInt } from "@/lib/canon/text";
import { verseRef } from "@/lib/reading";
import { verseTable } from "@/lib/word-index";
import { splitOnWord } from "@/lib/words";
import styles from "./passage.module.css";

const ligacoes = (n: number) => `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;

// The occurrences of a word in <mark>, in the search's highlight (design §6).
function Marked({ text, word }: { text: string; word?: string }) {
  if (!word) return <>{text}</>;
  return (
    <>
      {splitOnWord(text, word).map((p, i) =>
        i % 2 ? (
          <mark key={i} className={styles.mark}>
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

// BLIVRE text outside the reader: unchanged, with the translators' [supplied words] in the secondary ink, as the
// reading pages show them; `word` marks a word's occurrences.
export function BlivreText({ text, word }: { text: string; word?: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <span key={i} className={styles.supplied}>
            <Marked text={p} word={word} />
          </span>
        ) : (
          <Marked key={i} text={p} word={word} />
        ),
      )}
    </>
  );
}

/**
 * Verses grouped by chapter, read as in the reader (design "Scripture": Literata at reading size in the reading
 * column, the verse number before the text, the link count closing the verse and opening its page).
 */
export async function PassageText({ verses, label }: { verses: readonly number[]; label: string }) {
  const { text, links } = await verseTable();
  const groups: { key: string; title: string; path: string; rows: { gv: number; n: number; text: string; links: number; path: string; label: string }[] }[] = [];
  for (const gv of verses) {
    const r = verseRef(gv);
    const key = `${r.book.slug}-${r.chapter}`;
    const row = { gv, n: r.verse, text: text[gv], links: links[gv].length, path: r.path, label: r.label };
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, title: `${r.book.name} ${r.chapter}`, path: `/${r.book.slug}/${r.chapter}`, rows: [row] });
  }
  return (
    <div className={styles.passage} role="group" aria-label={label}>
      {groups.map((g) => (
        <section key={g.key} className={styles.chapter} aria-label={g.title}>
          <p className={styles.chapterTitle}>
            <Link href={g.path}>{g.title}</Link>
          </p>
          <ol className="bc-scripture">
            {g.rows.map((r) => (
              <li key={r.gv} className="bc-verse" value={r.n}>
                <span className="bc-verse__n" aria-hidden="true">
                  {r.n}
                </span>
                <span className="visually-hidden">Versículo {r.n}: </span>
                <BlivreText text={r.text} />
                <Link href={r.path} className={`bc-verse__links ${styles.pill}`} aria-label={`${r.label}, ${r.links === 0 ? "nenhuma ligação" : ligacoes(r.links)}`}>
                  <span className={`i i-arc ${styles.pillIcon}`} />
                  {formatInt(r.links)}
                </Link>
                {" "}<VerseStudyLink path={r.path} label={r.label} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * One verse per row with its full reference, from all over the Bible (design "ConnectionRow": the reference, a count
 * on the right, the text in Literata 17px, rows on hairlines). `word` marks its occurrences.
 */
export async function VerseRows({ items, word, label }: { items: { gv: number; meta?: ReactNode }[]; word?: string; label: string }) {
  const { text } = await verseTable();
  return (
    <ol className={`bc-conns ${styles.rows}`} aria-label={label}>
      {items.map((it) => {
        const r = verseRef(it.gv);
        return (
          <li key={it.gv} className="bc-conn">
            <Link href={r.path} className="bc-conn__ref">
              {r.label}
            </Link>
            {it.meta && <span className={`bc-conn__votes ${styles.count}`}>{it.meta}</span>}
            <p className={`bc-conn__text ${styles.text}`}>
              <BlivreText text={text[it.gv]} word={word} />
            </p>
            <VerseStudyLink path={r.path} label={r.label} />
          </li>
        );
      })}
    </ol>
  );
}
