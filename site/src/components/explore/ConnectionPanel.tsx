import Link from "next/link";
import { Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { votesWord, type GroupId } from "@/lib/explore/atlas";
import type { Connection } from "@/lib/explore/atlas-data";
import { chapterKey } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";
import { grid, type ChapterRef, verseText } from "@/lib/reading";
import { FocusTitle } from "./FocusTitle";
import { ScriptureText } from "./ScriptureText";
import styles from "./explore.module.css";

/** "dos Evangelhos": the group with its article, for the sentence under the title */
const OF_GROUP: Record<GroupId, string> = {
  pentateuco: "do Pentateuco",
  historicos: "dos Livros históricos",
  poesia: "de Poesia e sabedoria",
  profetas: "dos Profetas",
  evangelhos: "dos Evangelhos",
  atos: "de Atos",
  cartas: "das Cartas",
  apocalipse: "do Apocalipse",
};
const nth = (n: number) => `${formatInt(n)}º`;

/** "3 pares de versículos, 296 votos somados." */
export function connectionFact(c: Pick<Connection, "pairs" | "votes">): string {
  return `${formatInt(c.pairs)} ${c.pairs === 1 ? "par" : "pares"} de versículos, ${votesWord(c.votes)} ${Math.abs(c.votes) === 1 ? "somado" : "somados"}.`;
}

/** Where the chapter stands among the centre's linked chapters and inside its group. */
export function connectionRank(c: Connection): string {
  const all = `entre os ${formatInt(c.partners)} ${c.partners === 1 ? "capítulo ligado" : "capítulos ligados"} a ${c.centre.label}`;
  const head = c.rank === 0 ? `O capítulo mais votado ${all}` : `O ${nth(c.rank + 1)} mais votado ${all}`;
  if (c.rank === 0 && c.groupRank === 0) return `${head}.`;
  return `${head}, e o ${c.groupRank === 0 ? "primeiro" : nth(c.groupRank + 1)} ${OF_GROUP[c.group]}.`;
}

function Passage({ chapter, verses }: { chapter: ChapterRef; verses: number[] }) {
  return (
    <li className={styles.passage}>
      <Link href={chapter.path} className={styles.passageName}>
        <Icon name="book" />
        {chapter.label}
      </Link>
      <span className={styles.passageMeta}>
        {formatInt(verses.length)} {verses.length === 1 ? "versículo" : "versículos"}
      </span>
      <ul className={styles.chips} aria-label={`Versículos de ${chapter.label} que fazem parte dos pares`}>
        {verses.map((v) => (
          <li key={v}>
            <Link href={`${chapter.path}/${v}`} aria-label={`${chapter.label}:${v}`} prefetch={false}>
              {v}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

// The selected connection: the two chapters, their numbers, the strongest verse pair in the BLIVRE text, the verses
// that take part and the one main action (read them side by side). Only facts from the data, no theme sentence.
export async function ConnectionPanel({
  c,
  level = 2,
  focusOnNavigate = false,
  explore = false,
}: {
  c: Connection;
  level?: 2 | 3;
  focusOnNavigate?: boolean;
  /** on the Explorar: also offer to centre the map on the other chapter */
  explore?: boolean;
}) {
  const a = c.centre, b = c.other;
  const [hereText, thereText] = await Promise.all([
    verseText(grid.verseIndex(a.book, a.chapter, c.strongest.here)),
    verseText(grid.verseIndex(b.book, b.chapter, c.strongest.there)),
  ]);
  const id = `conexao-${chapterKey(a)}-${chapterKey(b)}`;
  const H = level === 2 ? "h2" : "h3";
  const side = (r: ChapterRef) => ({ book: r.book.index, slug: r.book.slug, chapter: r.chapter });
  const quote = (r: ChapterRef, v: number, text: string) => (
    <figure className={styles.pairItem}>
      <blockquote className="bc-quote">
        <ScriptureText text={text} />
      </blockquote>
      <figcaption>
        <Link href={`${r.path}/${v}`} className={styles.pairRef}>
          {r.label}:{v}
        </Link>
      </figcaption>
    </figure>
  );

  return (
    <section id="conexao" className={`bc-panel ${styles.panel}`} aria-labelledby={id} data-connection={chapterKey(b)}>
      {focusOnNavigate && <FocusTitle id={id} />}
      <div className="bc-panel__head">
        <H id={id} className={`bc-title ${styles.panelTitle}`} tabIndex={-1}>
          <span>{a.label}</span>
          <Icon name="both" className={`bc-icon ${styles.both}`} />
          <span className="visually-hidden"> e </span>
          <span>{b.label}</span>
        </H>
        <p className={styles.fact} data-fact="">
          {connectionFact(c)}
        </p>
        <p className={styles.rank}>{connectionRank(c)}</p>
      </div>
      <div className={styles.pair}>
        {quote(a, c.strongest.here, hereText)}
        <p className={styles.pairVotes} data-pair-votes="">
          <Icon name="arc" />
          {votesWord(c.strongest.votes)} neste par
        </p>
        {quote(b, c.strongest.there, thereText)}
      </div>
      <div className={styles.actions}>
        <Link href={conexaoPath(side(a), side(b))} className="bc-button bc-button--primary">
          <Icon name="side" />
          Ler lado a lado
        </Link>
        <Link href={a.path} className={styles.more}>
          Abrir {a.label}
          <Icon name="chev-r" />
        </Link>
        {explore && (
          <Link href={explorePath(b.book.slug, b.chapter)} className={styles.more}>
            Ver o mapa de {b.label}
            <Icon name="chev-r" />
          </Link>
        )}
      </div>
      <ul className={styles.passages} aria-label="Os versículos de cada lado">
        <Passage chapter={a} verses={c.hereVerses} />
        <Passage chapter={b} verses={c.thereVerses} />
      </ul>
      <p className={styles.source}>
        Pares: versículos dos dois capítulos que a OpenBible.info liga entre si. Votos: soma das duas direções. Texto: Bíblia
        Livre (BLIVRE).
      </p>
    </section>
  );
}
