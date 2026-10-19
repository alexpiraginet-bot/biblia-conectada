import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { chapterKey, type Explore, pairsText, votesText } from "@/lib/explore/data";
import { connectionPath } from "@/lib/explore/home";
import styles from "./explore.module.css";

// The accessible source of the graph (design §8): every chapter on the canvas, in rank order, with its numbers.
export function NeighbourList({ data, level = 2 }: { data: Explore; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  const c = data.centre;
  const id = `lista-${chapterKey(c)}`;
  return (
    <section className={styles.list} aria-labelledby={id}>
      <H id={id} className={styles.listTitle}>
        Os {formatInt(data.neighbours.length)} capítulos com mais votos
        <span>de {formatInt(data.partners)} ligados a {c.label} · por votos, OpenBible.info</span>
      </H>
      <ol className={styles.rows}>
        {data.neighbours.map((n) => (
          <li key={n.ref.ci} data-partner={chapterKey(n.ref)}>
            <Link href={connectionPath({ slug: c.book.slug, chapter: c.chapter }, { slug: n.ref.book.slug, chapter: n.ref.chapter })}>
              {n.ref.label}
            </Link>
            <span className={styles.rowPairs}>{pairsText(n.pairs)}</span>
            <span className={styles.rowVotes}>{votesText(n.votes)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
