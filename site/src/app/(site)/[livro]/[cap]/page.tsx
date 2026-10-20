import type { Metadata } from "next";
import Link from "next/link";
import { ChapterArcs } from "@/components/reader/Arcs";
import { Featured, MiniMap, PanelHead } from "@/components/reader/FromHere";
import { Scripture } from "@/components/reader/Scripture";
import styles from "@/components/reader/reader.module.css";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { barShare, chapterHeadline, graphNote, graphPartners, mostLinkedRows, topGroup, votesLabel } from "@/lib/from-here";
import { books } from "@/lib/data";
import { medalhaoForBook } from "@/lib/medalhoes";
import { missingPage, NOT_FOUND_TITLE } from "@/lib/missing";
import { bookBySlug, chapterBestPairs, chapterNeighbours, chapterNumber, chapterRef, verseRef, verseText } from "@/lib/reading";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.flatMap((b) => b.verses.map((_, i) => ({ livro: b.slug, cap: String(i + 1) })));
}

export async function generateMetadata({ params }: PageProps<"/[livro]/[cap]">): Promise<Metadata> {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  if (!book || !chapter) return { title: NOT_FOUND_TITLE };
  return {
    title: `${book.name} ${chapter}`,
    description: `${book.name} ${chapter} na Bíblia Livre (BLIVRE), com as ligações de cada versículo.`,
    alternates: { canonical: `/${book.slug}/${chapter}` },
  };
}

/** The book-group medallion of a chapter, and its name for the caption: "Evangelhos (pães e peixes)". */
function medalOf(ci: number) {
  const m = medalhaoForBook(chapterRef(ci).book.osis);
  return m ? { src: m.src96, group: `${m.category} (${m.label.toLocaleLowerCase("pt-BR")})` } : null;
}

// The chapter's panel when no verse is chosen: the chapters most linked to this one, in the order the Explorar uses
// too (src/lib/chapter-rank.ts), as a headline, the mini map, the strongest connection and the "Mais ligados" rows,
// each with the text of its most voted verse pair; then the arcs over the whole Bible.
export default async function ChapterPage({ params }: PageProps<"/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  // an address that names no chapter: a loose reference goes to its page, anything else is the 404 (src/lib/missing.ts)
  if (!book || !chapter) missingPage([livro, cap]);
  const partners = await chapterNeighbours(book, chapter);
  const best = await chapterBestPairs(book, chapter);
  const label = `${book.name} ${chapter}`;
  const ranked = partners.map((p) => ({ key: p.ci, votes: p.votes, pairs: p.pairs }));
  const shown = mostLinkedRows(ranked);
  const extra = ranked.length - shown.length;
  const graph = graphPartners(ranked);
  const top = ranked[0] ? chapterRef(ranked[0].key) : null;
  const max = ranked[0]?.votes ?? 0;
  const rows = await Promise.all(
    shown.map(async (r) => {
      const there = best.get(r.key)!.there;
      return { ...r, ref: chapterRef(r.key), verse: verseRef(there), text: await verseText(there) };
    }),
  );
  const medals = new Map(graph.shown.map((p) => [p.key, medalOf(p.key)]));
  const groups = [...new Set([...medals.values()].map((m) => m?.group).filter((g): g is string => !!g))];
  const short = (ci: number) => {
    const r = chapterRef(ci);
    return `${r.book.abbr} ${r.chapter}`;
  };

  return (
    <aside className={`bc-panel ${styles.chapterPanel}`} aria-labelledby="ligados">
      <PanelHead title={`Ligações de ${label}`} titleId="ligados" />
      {!top ? (
        <p className={styles.panelMeta}>Nenhum outro capítulo está ligado a este na base OpenBible.info.</p>
      ) : (
        <>
          <p className={styles.headline} data-headline="">
            {chapterHeadline(ranked, (ci) => chapterRef(ci).label)}
          </p>
          <MiniMap
            centre={`${book.abbr} ${chapter}`}
            nodes={graph.shown.map((p) => ({ key: p.key, label: short(p.key), votes: p.votes, medal: medals.get(p.key) ?? null }))}
            topKey={top.ci}
            legend="Ligações entre os capítulos: mais grossa, mais votos somados"
            topLegend={ranked.length === 1 ? "O único capítulo ligado" : topGroup(ranked).length > 1 ? "Um dos mais votados, em destaque" : "O mais votado, em destaque"}
            note={graphNote(ranked.length, graph.shown.length, graph.tiedOut, "capítulos ligados")}
            groups={groups}
          />
          <Featured
            a={label}
            b={top.label}
            conexao={conexaoPath(
              { book: book.index, slug: book.slug, chapter },
              { book: top.book.index, slug: top.book.slug, chapter: top.chapter },
            )}
            explorar={`/explorar/${book.slug}/${chapter}`}
          />
          <section className={styles.listSection} aria-labelledby="mais-ligados">
            <h3 id="mais-ligados" className="bc-section-title">
              Mais ligados
              <small>pela soma dos votos dos pares de versículos</small>
            </h3>
            <ol className="bc-conns" data-mais-ligados="">
              {rows.map((r) => (
                <li key={r.key} className="bc-conn">
                  <Link className="bc-conn__ref" href={r.ref.path} data-row="">
                    {r.ref.label}
                  </Link>
                  <span className="bc-conn__votes">
                    <span className="bc-conn__bar" style={{ "--w": barShare(r.votes, max) } as React.CSSProperties} aria-hidden="true" />
                    {votesLabel(r.votes)}
                  </span>
                  <p className="bc-conn__text">
                    <Link className={styles.connVerse} href={r.verse.path} aria-label={r.verse.label}>
                      {r.verse.chapter}:{r.verse.verse}
                    </Link>{" "}
                    <Scripture text={r.text} />
                  </p>
                </li>
              ))}
            </ol>
            {extra > 0 && (
              <p className={`${styles.panelMeta} ${styles.more}`}>
                E mais {formatInt(extra)} {extra === 1 ? "capítulo ligado" : "capítulos ligados"}, com menos votos.
              </p>
            )}
          </section>
          <ChapterArcs ci={book.firstChapter + chapter - 1} label={label} partners={partners} />
        </>
      )}
      <p className={styles.hint}>
        Abra a contagem no fim de um versículo para ver as ligações dele, ou selecione um trecho para copiar, compartilhar ou
        salvar.
      </p>
      <p className={styles.source}>
        Ligações: OpenBible.info. Os votos de dois capítulos somam os pares de versículos entre eles; um trecho conta pelo
        primeiro versículo.
      </p>
    </aside>
  );
}
