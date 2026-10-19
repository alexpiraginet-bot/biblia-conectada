import Link from "next/link";
import type { ReactNode } from "react";
import { verseRef, verseText } from "@/lib/reading";
import styles from "./passage.module.css";

// BLIVRE text outside the reader: unchanged, with the translators' [supplied words] in the secondary ink, as the
// reading pages show them.
export function BlivreText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <span key={i} className={styles.supplied}>
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** Verses grouped by chapter, with verse numbers, the way a passage is read ("Lucas 10" then 25, 26 …). */
export async function PassageText({ verses, label }: { verses: readonly number[]; label: string }) {
  const rows = await Promise.all(verses.map(async (gv) => ({ ref: verseRef(gv), text: await verseText(gv) })));
  const groups: { key: string; title: string; path: string; rows: typeof rows }[] = [];
  for (const r of rows) {
    const key = `${r.ref.book.slug}-${r.ref.chapter}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(r);
    else groups.push({ key, title: `${r.ref.book.name} ${r.ref.chapter}`, path: `/${r.ref.book.slug}/${r.ref.chapter}`, rows: [r] });
  }
  return (
    <div className={styles.passage} aria-label={label} role="group">
      {groups.map((g) => (
        <section key={g.key} className={styles.chapter} aria-label={g.title}>
          <p className={styles.chapterTitle}>
            <Link href={g.path}>{g.title}</Link>
          </p>
          <ol className={styles.verses}>
            {g.rows.map((r) => (
              <li key={r.ref.gv} className={styles.verse} value={r.ref.verse}>
                <span className={styles.num}>{r.ref.verse}</span>
                <span className={styles.scripture}>
                  <BlivreText text={r.text} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** One verse per row with its full reference: lists of verses from all over the Bible. */
export async function VerseRows({ items }: { items: { gv: number; meta?: ReactNode }[] }) {
  const rows = await Promise.all(items.map(async (it) => ({ ...it, ref: verseRef(it.gv), text: await verseText(it.gv) })));
  return (
    <ol className={styles.rows}>
      {rows.map((r) => (
        <li key={r.gv} className={styles.row}>
          <p className={styles.rowHead}>
            <Link href={r.ref.path}>{r.ref.label}</Link>
            {r.meta && <span className={styles.rowMeta}>{r.meta}</span>}
          </p>
          <p className={styles.scripture}>
            <BlivreText text={r.text} />
          </p>
        </li>
      ))}
    </ol>
  );
}
