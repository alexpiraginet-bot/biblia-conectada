import Link from "next/link";
import { Scripture } from "@/components/reader/Scripture";
import { conexaoPath } from "@/lib/conexao";
import { chapterKey, type Explore, type Neighbour, pairsText, votesText } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";
import { grid, type ChapterRef, verseText } from "@/lib/reading";
import { FocusTitle } from "./FocusTitle";
import styles from "./explore.module.css";

function Passage({ chapter, verses }: { chapter: ChapterRef; verses: number[] }) {
  return (
    <div className={styles.passage}>
      <dt>
        <Link href={chapter.path}>{chapter.label}</Link>
      </dt>
      <dd>
        <ul className={styles.chips} aria-label={`Versículos de ${chapter.label}`}>
          {verses.map((v) => (
            <li key={v}>
              <Link href={`${chapter.path}/${v}`} aria-label={`${chapter.label}:${v}`}>
                {v}
              </Link>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

// "Conexão selecionada": what the data says about the centre and one partner chapter. Only facts from the pipeline
// (pairs, votes, the paired verses) and the BLIVRE text of the strongest pair; no theme sentence (HANDOFF §3.8).
export async function ConnectionPanel({
  data,
  n,
  level = 2,
  focusOnNavigate = false,
}: {
  data: Explore;
  n: Neighbour;
  level?: 2 | 3;
  focusOnNavigate?: boolean;
}) {
  const c = data.centre;
  const p = n.ref;
  const [hereText, thereText] = await Promise.all([
    verseText(grid.verseIndex(c.book, c.chapter, n.strongest.here)),
    verseText(grid.verseIndex(p.book, p.chapter, n.strongest.there)),
  ]);
  const id = `conexao-${chapterKey(c)}-${chapterKey(p)}`;
  const H = level === 2 ? "h2" : "h3";
  const Sub = level === 2 ? "h3" : "h4";
  const side = (r: ChapterRef) => ({ book: r.book.index, slug: r.book.slug, chapter: r.chapter });
  const quotes = [
    { ref: `${c.label}:${n.strongest.here}`, path: `${c.path}/${n.strongest.here}`, text: hereText },
    { ref: `${p.label}:${n.strongest.there}`, path: `${p.path}/${n.strongest.there}`, text: thereText },
  ];

  return (
    <section className={styles.panel} aria-labelledby={id} data-connection={chapterKey(p)}>
      {focusOnNavigate && <FocusTitle id={id} />}
      <p className="kicker">Conexão selecionada</p>
      <H id={id} className={styles.panelTitle} tabIndex={-1}>
        {c.label} <span className={styles.arrow} aria-hidden="true">↔</span>
        <span className="visually-hidden">e</span> {p.label}
      </H>
      <p className={styles.fact} data-fact="">
        {pairsText(n.pairs)} · {votesText(n.votes)}
        <span className={styles.factRank}>
          {n.rank + 1}º por votos entre {new Intl.NumberFormat("pt-BR").format(data.partners)} capítulos ligados a {c.label}
        </span>
      </p>

      <Sub className={styles.panelSub}>
        Par mais votado <span>{votesText(n.strongest.votes)}</span>
      </Sub>
      <div className={styles.quotes}>
        {quotes.map((q) => (
          <blockquote key={q.ref} className={styles.quote}>
            <p>
              <Scripture text={q.text} />
            </p>
            <footer>
              <Link href={q.path}>{q.ref}</Link>
            </footer>
          </blockquote>
        ))}
      </div>

      <Sub className={styles.panelSub}>Passagens</Sub>
      <dl className={styles.passages}>
        <Passage chapter={c} verses={n.hereVerses} />
        <Passage chapter={p} verses={n.thereVerses} />
      </dl>

      <p className={styles.ctaRow}>
        <Link href={conexaoPath(side(c), side(p))} className={styles.cta}>
          Ler lado a lado
        </Link>
      </p>
      <p className={styles.moreLinks}>
        <Link href={explorePath(p.book.slug, p.chapter)}>Centrar em {p.label}</Link>
        <Link href={`/arcos#${c.book.slug}/${c.chapter}`}>Ver {c.label} no céu</Link>
      </p>
      <p className={styles.source}>
        Pares: versículos dos dois capítulos que a OpenBible.info liga entre si. Votos: soma das duas direções. Texto:
        Bíblia Livre (BLIVRE).
      </p>
    </section>
  );
}
