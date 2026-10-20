import Link from "next/link";
import { GROUP_NAMES, votesWord } from "@/lib/explore/atlas";
import { medals, PER_GROUP, type Atlas } from "@/lib/explore/atlas-data";
import { chapterKey, pairsText } from "@/lib/explore/data";
import { connectionPath } from "@/lib/explore/home";
import { partnersText } from "@/lib/explore/text";
import { chapterRef } from "@/lib/reading";
import styles from "./explore.module.css";

// The text of the map (design §8: every visualization has its list): each group with its counts and its most voted
// chapters, the same numbers the map draws, in the same order. Rows are links to the connection.
export function MapList({ atlas, level = 2 }: { atlas: Atlas; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  const c = atlas.centre;
  const centre = { slug: c.book.slug, chapter: c.chapter };
  const m = medals();
  const id = `lista-${chapterKey(c)}`;
  return (
    <section className={styles.mapList} aria-labelledby={id}>
      <H id={id} className="bc-section-title">
        Os capítulos do mapa
        <small>
          {partnersText(atlas.partners)} a {c.label}, por grupo de livros; em cada grupo, os {PER_GROUP} mais votados
        </small>
      </H>
      <ul className={styles.groups}>
        {atlas.groups.map((g) => (
          <li key={g.id} className={styles.group} data-group={g.id}>
            <p className={styles.groupHead}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a 96 px illustration, already sized; next/image adds JS */}
              <img className="bc-medallion__img" src={m[g.id].src96} width={96} height={96} alt="" loading="lazy" />
              <span className={styles.groupName}>{GROUP_NAMES[g.id].name}</span>
              <span className={styles.groupMeta} data-group-meta="">
                {g.chapters ? `${partnersText(g.chapters)} · ${votesWord(g.votes)}` : "nenhum capítulo ligado"}
              </span>
            </p>
            {g.chapters > 0 && (
              <ol className={styles.rows}>
                {g.partners.slice(0, PER_GROUP).map((p) => {
                  const r = chapterRef(p.ci);
                  return (
                    <li key={p.ci} data-partner={chapterKey(r)}>
                      <Link href={connectionPath(centre, { slug: r.book.slug, chapter: r.chapter })} prefetch={false}>
                        <span className={styles.rowName}>{r.label}</span>
                        <span className={styles.rowMeta}>
                          {pairsText(p.pairs)} · {votesWord(p.votes)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
