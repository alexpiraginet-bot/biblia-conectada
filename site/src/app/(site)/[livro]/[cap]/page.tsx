import type { Metadata } from "next";
import Link from "next/link";
import { NOT_FOUND_TITLE } from "@/components/NotFoundBody";
import { ChapterArcs } from "@/components/reader/Arcs";
import styles from "@/components/reader/reader.module.css";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { missingPage } from "@/lib/missing";
import { bookBySlug, chapterNumber, chapterPartners, linkedChapters } from "@/lib/reading";

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

// Panel when no verse is chosen: the chapter's strongest neighbours and how to open a verse.
export default async function ChapterPage({ params }: PageProps<"/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  if (!book || !chapter) missingPage([livro, cap]);
  const linked = linkedChapters(book, chapter);
  const partners = await chapterPartners(book, chapter);
  const label = `${book.name} ${chapter}`;
  const shown = linked.slice(0, 8);
  const extra = linked.length - shown.length;

  return (
    <aside className={styles.chapterAside} aria-labelledby="ligados">
      <h2 id="ligados" className={styles.panelTitle}>
        Ligações de {label}
      </h2>
      {partners.length > 0 && <ChapterArcs ci={book.firstChapter + chapter - 1} label={label} partners={partners} />}
      <h3 className={styles.listTitle}>
        Mais ligados
        <span>ligações entre os versículos dos dois capítulos</span>
      </h3>
      {shown.length === 0 ? (
        <p className={styles.empty}>Nenhum outro capítulo está ligado a este na base OpenBible.info.</p>
      ) : (
        <ol className={styles.rows}>
          {shown.map(({ ref, pairs }) => (
            <li key={ref.ci} className={styles.row}>
              <Link href={ref.path}>{ref.label}</Link>
              <span className={styles.votes}>
                {formatInt(pairs)} {pairs === 1 ? "ligação" : "ligações"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {extra > 0 && (
        <p className={styles.panelMeta}>
          E mais {formatInt(extra)} {extra === 1 ? "capítulo" : "capítulos"} empatados no último lugar.
        </p>
      )}
      <p className={styles.hint}>Toque no número ao lado de um versículo para ver as ligações dele.</p>
    </aside>
  );
}
