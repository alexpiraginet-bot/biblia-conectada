import Link from "next/link";
import { DirBoth, DirIn, DirOut } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { grid, type Link as VerseLink, verseRef, verseText } from "@/lib/reading";
import { HoverPreview } from "./HoverPreview";
import { Scripture } from "./Scripture";
import { VerseArcs } from "./Arcs";
import styles from "./reader.module.css";

const WITH_TEXT = 5; // strongest links shown with their text
const VISIBLE = 40; // compact rows before "Mostrar mais"

const DIR = {
  1: { icon: "i i-out", label: "daqui para lá" },
  2: { icon: "i i-in", label: "de lá para cá" },
  3: { icon: "i i-both", label: "nos dois sentidos" },
} as const;

function votes(v: number) {
  return `${formatInt(v)} ${Math.abs(v) === 1 ? "voto" : "votos"}`;
}

function Row({ link }: { link: VerseLink }) {
  const [gv, v, d] = link;
  const ref = verseRef(gv);
  const dir = DIR[d as 1 | 2 | 3];
  return (
    <li className={styles.row}>
      <Link href={ref.path}>{ref.label}</Link>
      <span className={`${styles.dir} ${dir.icon}`} />
      <span className="visually-hidden">{dir.label}</span>
      <span className={styles.votes}>{votes(v)}</span>
    </li>
  );
}

export async function LinksPanel({
  book,
  chapter,
  verse,
  text,
  links,
  titleId,
}: {
  book: Book;
  chapter: number;
  verse: number;
  text: string;
  links: VerseLink[];
  titleId: string;
}) {
  const label = `${book.name} ${chapter}:${verse}`;
  const strongest = links.slice(0, WITH_TEXT);
  const texts = await Promise.all(strongest.map(([gv]) => verseText(gv)));
  const rest = links.slice(WITH_TEXT);
  const visible = rest.slice(0, VISIBLE);
  const hidden = rest.slice(VISIBLE);

  return (
    <div className={styles.links}>
      <h2 id={titleId} className={styles.panelTitle} tabIndex={-1}>
        Ligações de {label}
      </h2>
      <blockquote className={styles.focusVerse}>
        <Scripture text={text} />
      </blockquote>

      {links.length === 0 ? (
        <p className={styles.empty}>
          A base OpenBible.info não liga {label} a nenhum outro versículo. Os versículos vizinhos podem ter ligações.
        </p>
      ) : (
        <>
          <VerseArcs gv={grid.verseIndex(book, chapter, verse)} label={label} links={links} />
          <h3 className={styles.listTitle}>
            {formatInt(links.length)} {links.length === 1 ? "ligação" : "ligações"}
            <span>das mais votadas às menos votadas</span>
          </h3>
          <ol className={styles.strong}>
            {strongest.map(([gv, v, d], i) => {
              const ref = verseRef(gv);
              const dir = DIR[d as 1 | 2 | 3];
              return (
                <li key={gv}>
                  <div className={styles.strongHead}>
                    <Link href={ref.path}>{ref.label}</Link>
                    <span className={`${styles.dir} ${dir.icon}`} />
                    <span className="visually-hidden">{dir.label}</span>
                    <span className={styles.votes}>{votes(v)}</span>
                  </div>
                  <p className={styles.excerpt}>
                    <Scripture text={texts[i]} />
                  </p>
                </li>
              );
            })}
          </ol>
          {rest.length > 0 && (
            <HoverPreview>
              <ol className={styles.rows}>
                {visible.map((l) => (
                  <Row key={l[0]} link={l} />
                ))}
              </ol>
              {hidden.length > 0 && (
                <details className={styles.more}>
                  <summary>Mostrar mais {formatInt(hidden.length)}</summary>
                  <ol className={styles.rows}>
                    {hidden.map((l) => (
                      <Row key={l[0]} link={l} />
                    ))}
                  </ol>
                </details>
              )}
            </HoverPreview>
          )}
        </>
      )}
      <p className={styles.source}>
        Ligações: OpenBible.info. Votos somam as duas direções; um trecho conta pelo primeiro versículo. Direções: <DirOut size={14} /> daqui para lá,{" "}
        <DirIn size={14} /> de lá para cá, <DirBoth size={14} /> nos dois sentidos.
      </p>
    </div>
  );
}
