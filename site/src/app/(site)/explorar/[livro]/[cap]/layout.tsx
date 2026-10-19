import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Explorer } from "@/components/explore/Explorer";
import { scripture } from "@/components/explore/fonts";
import { NeighbourList } from "@/components/explore/NeighbourList";
import styles from "@/components/explore/explore.module.css";
import { formatInt } from "@/lib/canon/text";
import { explore, explorePages, resolveChapter } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";
import { neighbours } from "@/lib/reading";

export const ensureStatic = "navigation";

// The 200 most linked chapters and the home centre are built ahead; the others render on their first visit.
export function generateStaticParams() {
  return explorePages().map(({ book, chapter }) => ({ livro: book.slug, cap: String(chapter) }));
}

// The graph stays in the layout; the connection panel is the page below it (default: the strongest partner;
// /explorar/<livro>/<cap>/<livro2>/<cap2>: the one chosen), so choosing a node only swaps the panel.
export default async function ExploreLayout({ params, children }: LayoutProps<"/explorar/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const r = resolveChapter(livro, cap);
  if (!r) notFound();
  const data = await explore(r.book, r.chapter);
  const { prev, next } = neighbours(r.book, r.chapter);
  const label = data.centre.label;

  return (
    <main id="conteudo" className={`${styles.page} ${scripture.variable}`}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{label}</h1>
          <p className={styles.meta} data-explore-meta="">
            {formatInt(data.partners)} capítulos ligados a {label} · no grafo, os {formatInt(data.neighbours.length)} com mais
            votos (soma das duas direções, OpenBible.info)
          </p>
        </div>
        <p className={styles.headLinks}>
          <Link href={data.centre.path}>Ler {label}</Link>
          <Link href={`/arcos#${r.book.slug}/${r.chapter}`}>Ver no céu</Link>
          {prev && (
            <Link href={explorePath(prev.book.slug, prev.chapter)} className={styles.pager} rel="prev">
              <ChevronLeft size={16} />
              {prev.label}
            </Link>
          )}
          {next && (
            <Link href={explorePath(next.book.slug, next.chapter)} className={styles.pager} rel="next">
              {next.label}
              <ChevronRight size={16} />
            </Link>
          )}
        </p>
      </div>
      <Explorer data={data} panel={children} />
      <NeighbourList data={data} />
    </main>
  );
}
