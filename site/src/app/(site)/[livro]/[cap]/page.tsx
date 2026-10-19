import type { Metadata } from "next";
import Link from "next/link";
import { ChapterArcs } from "@/components/reader/Arcs";
import { Featured, MiniGraph, PanelHead } from "@/components/reader/FromHere";
import styles from "@/components/reader/reader.module.css";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { chapterHeadline, graphNote, graphPartners, topGroup, votesLabel } from "@/lib/from-here";
import { books } from "@/lib/data";
import { bookBySlug, chapterNeighbours, chapterNumber, chapterRef } from "@/lib/reading";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return books.flatMap((b) => b.verses.map((_, i) => ({ livro: b.slug, cap: String(i + 1) })));
}

export async function generateMetadata({ params }: PageProps<"/[livro]/[cap]">): Promise<Metadata> {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  if (!book || !chapter) return {};
  return {
    title: `${book.name} ${chapter}`,
    description: `${book.name} ${chapter} na Bíblia Livre (BLIVRE), com as ligações de cada versículo.`,
    alternates: { canonical: `/${book.slug}/${chapter}` },
  };
}

const LISTED = 8; // rows of "Mais ligados"; chapters tied with the 8th are kept

// Panel when no verse is chosen ("A partir deste capítulo"): the chapters most linked to this one by summed votes,
// as a headline, a mini graph and a list, and how to open a verse.
export default async function ChapterPage({ params }: PageProps<"/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  if (!book || !chapter) return null;
  const partners = await chapterNeighbours(book, chapter);
  const label = `${book.name} ${chapter}`;
  const ranked = partners.map((p) => ({ key: p.ci, votes: p.votes, pairs: p.pairs }));
  const cut = ranked[Math.min(LISTED, ranked.length) - 1]?.votes;
  const shown = ranked.filter((r, i) => i < LISTED || r.votes === cut);
  const extra = ranked.length - shown.length;
  const graph = graphPartners(ranked);
  const top = ranked[0] ? chapterRef(ranked[0].key) : null;
  const short = (ci: number) => {
    const r = chapterRef(ci);
    return `${r.book.abbr} ${r.chapter}`;
  };

  return (
    <aside className={styles.chapterAside} aria-labelledby="ligados">
      <PanelHead kicker="A partir deste capítulo" title={`Ligações de ${label}`} titleId="ligados" />
      {!top ? (
        <p className={styles.empty}>Nenhum outro capítulo está ligado a este na base OpenBible.info.</p>
      ) : (
        <>
          <p className={styles.headline} data-headline="">
            {chapterHeadline(ranked, (ci) => chapterRef(ci).label)}
          </p>
          <MiniGraph
            centre={`${book.abbr} ${chapter}`}
            nodes={graph.shown.map((p) => ({ key: p.key, label: short(p.key), votes: p.votes }))}
            topKey={top.ci}
            legend="Ligações entre os capítulos: mais grossa, mais votos somados"
            topLegend={ranked.length === 1 ? "O único capítulo ligado" : topGroup(ranked).length > 1 ? "Um dos mais votados, em destaque" : "O mais votado, em destaque"}
            note={graphNote(ranked.length, graph.shown.length, graph.tiedOut, "capítulos ligados")}
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
          <ChapterArcs ci={book.firstChapter + chapter - 1} label={label} partners={partners} />
          <h3 className={styles.listTitle}>
            Mais ligados
            <span>pela soma dos votos das ligações entre os versículos dos dois capítulos</span>
          </h3>
          <ol className={styles.rows}>
            {shown.map(({ key, votes, pairs }) => {
              const ref = chapterRef(key);
              return (
                <li key={key} className={styles.row}>
                  <Link href={ref.path}>{ref.label}</Link>
                  <span className={styles.votes}>
                    {votesLabel(votes)} · {formatInt(pairs)} {pairs === 1 ? "ligação" : "ligações"}
                  </span>
                </li>
              );
            })}
          </ol>
          {extra > 0 && (
            <p className={styles.panelMeta}>
              E mais {formatInt(extra)} {extra === 1 ? "capítulo ligado" : "capítulos ligados"}, com menos votos.
            </p>
          )}
        </>
      )}
      <p className={styles.hint}>Toque no número ao lado de um versículo para ver as ligações dele, ou selecione um trecho do texto.</p>
    </aside>
  );
}
