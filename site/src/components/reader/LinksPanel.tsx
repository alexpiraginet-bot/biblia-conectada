import Link from "next/link";
import { Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { conexaoPath } from "@/lib/conexao";
import { barShare, graphNote, graphPartners, linksLabel, topGroup, verseHeadline, votesLabel } from "@/lib/from-here";
import { grid, type Link as VerseLink, verseRef, verseText } from "@/lib/reading";
import { VerseArcs } from "./Arcs";
import { Featured, MiniMap, PanelHead } from "./FromHere";
import { LinksFeed } from "./LinksFeed";
import { Scripture } from "./Scripture";
import styles from "./reader.module.css";

// direction of a link seen from this verse (design system ConnectionRow)
const DIR = {
  1: { icon: "i i-out", label: "sai deste versículo" },
  2: { icon: "i i-in", label: "chega a este versículo" },
  3: { icon: "i i-both", label: "nos dois sentidos" },
} as const;

const short = (gv: number) => {
  const r = verseRef(gv);
  return `${r.book.abbr} ${r.chapter}:${r.verse}`;
};

/** One link (ds.css .bc-conn): the other verse, its direction, the votes with a bar, and its whole text. The rows are
 *  read in place, so they are not prefetched one by one as the list scrolls past. */
function Row({ link, max, text }: { link: VerseLink; max: number; text: string }) {
  const [gv, v, d] = link;
  const ref = verseRef(gv);
  const dir = DIR[d as 1 | 2 | 3];
  return (
    <li className="bc-conn">
      <Link className="bc-conn__ref" href={ref.path} prefetch={false}>
        {ref.label}
        <span className={`${dir.icon} ${styles.dir}`} />
        <span className="visually-hidden">, {dir.label}</span>
      </Link>
      <span className="bc-conn__votes">
        <span className="bc-conn__bar" style={{ "--w": barShare(v, max) } as React.CSSProperties} aria-hidden="true" />
        {votesLabel(v)}
      </span>
      <p className="bc-conn__text">
        <Scripture text={text} />
      </p>
    </li>
  );
}

/** A neighbouring verse offered when this one has no links: its number and links. */
export type NearVerse = { verse: number; links: number };

/**
 * The panel of a verse (/livro/cap/vers): the verse as a quote, the data headline, the mini map and the strongest
 * connection, then every link from the most voted to the least, each with its whole text, and under them the endless
 * list of the links of those links (LinksFeed, design §6.2). A verse with no link says so and offers its chapter and
 * its neighbours.
 */
export async function LinksPanel({
  book,
  chapter,
  verse,
  text,
  links,
  titleId,
  medals,
  chapterLinks,
  near,
}: {
  book: Book;
  chapter: number;
  verse: number;
  text: string;
  links: VerseLink[];
  titleId: string;
  /** book-group medallions of the partners drawn on the mini map, by global verse index */
  medals: Map<number, { src: string; group: string } | null>;
  /** links of the whole chapter, for the empty state */
  chapterLinks: number;
  near: NearVerse[];
}) {
  const label = `${book.name} ${chapter}:${verse}`;
  const texts = await Promise.all(links.map(([gv]) => verseText(gv)));
  // links come from the pipeline strongest first, canonical order inside a tie
  const ranked = links.map(([key, v]) => ({ key, votes: v }));
  const headline = verseHeadline(ranked, (gv) => verseRef(gv).label);
  const graph = graphPartners(ranked);
  const top = ranked[0] ? verseRef(ranked[0].key) : null;
  const max = links[0]?.[1] ?? 0;
  const groups = [...new Set(graph.shown.map((p) => medals.get(p.key)?.group).filter((g): g is string => !!g))];

  return (
    <>
      <div className="bc-panel__head">
        <PanelHead title={`Ligações de ${label}`} titleId={titleId} />
        <blockquote className="bc-quote">
          <Scripture text={text} />
          <cite>{label} · Bíblia Livre</cite>
        </blockquote>
      </div>

      {links.length === 0 || !top ? (
        <div className={styles.empty}>
          <p>A base OpenBible.info não liga {label} a nenhum outro versículo. Veja as ligações do capítulo e dos versículos vizinhos:</p>
          <ul className="bc-list">
            <li>
              <Link href={`/${book.slug}/${chapter}`}>
                <span className="bc-list__name">
                  {book.name} {chapter}
                </span>
                <span className="bc-list__meta">{linksLabel(chapterLinks)}</span>
              </Link>
            </li>
            {near.map((n) => (
              <li key={n.verse}>
                <Link href={`/${book.slug}/${chapter}/${n.verse}`} scroll={false}>
                  <span className="bc-list__name">
                    {book.name} {chapter}:{n.verse}
                  </span>
                  <span className="bc-list__meta">{linksLabel(n.links)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className={styles.headline} data-headline="">
            {headline}
          </p>
          <MiniMap
            centre={`${book.abbr} ${chapter}:${verse}`}
            nodes={graph.shown.map((p) => ({ key: p.key, label: short(p.key), votes: p.votes, medal: medals.get(p.key) ?? null }))}
            topKey={top.gv}
            legend="Ligação da OpenBible.info: mais grossa, mais votos"
            topLegend={links.length === 1 ? "A única ligação" : topGroup(ranked).length > 1 ? "Uma das mais votadas, em destaque" : "A mais votada, em destaque"}
            note={graphNote(links.length, graph.shown.length, graph.tiedOut, "ligações")}
            groups={groups}
          />
          <Featured
            a={label}
            b={top.label}
            conexao={conexaoPath(
              { book: book.index, slug: book.slug, chapter, verse },
              { book: top.book.index, slug: top.book.slug, chapter: top.chapter, verse: top.verse },
            )}
            explorar={`/explorar/${book.slug}/${chapter}`}
          />
          <section className={styles.listSection} aria-labelledby={`${titleId}-lista`}>
            <h3 id={`${titleId}-lista`} className="bc-section-title">
              {links.length === 1 ? "1 ligação" : `${formatInt(links.length)} ligações`}
              <small>das mais votadas às menos votadas</small>
            </h3>
            <ol className="bc-conns">
              {links.map((l, i) => (
                <Row key={l[0]} link={l} max={max} text={texts[i]} />
              ))}
            </ol>
          </section>
          <VerseArcs gv={grid.verseIndex(book, chapter, verse)} label={label} links={links} />
        </>
      )}
      <p className={styles.source}>
        Ligações: OpenBible.info.
        {links.length > 0 && (
          <>
            {" "}
            Os votos somam as duas direções; um trecho conta pelo primeiro versículo. Sentido:{" "}
            <Icon name="out" className={`bc-icon ${styles.sourceIcon}`} /> sai deste versículo,{" "}
            <Icon name="in" className={`bc-icon ${styles.sourceIcon}`} /> chega a este versículo,{" "}
            <Icon name="both" className={`bc-icon ${styles.sourceIcon}`} /> nos dois sentidos.
          </>
        )}
      </p>
      {/* keyed by the verse: another verse's page starts its own list, whatever the router keeps mounted */}
      {links.length > 0 && <LinksFeed key={`${book.slug}/${chapter}/${verse}`} origin={grid.verseIndex(book, chapter, verse)} links={links} />}
    </>
  );
}
