import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { AtlasMap } from "@/components/explore/AtlasMap";
import { MapList } from "@/components/explore/MapList";
import styles from "@/components/explore/explore.module.css";
import { atlasOf, defaultConnection, PER_GROUP } from "@/lib/explore/atlas-data";
import { chapterKey, explorePages, resolveChapter } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";
import { partnersText } from "@/lib/explore/text";
import { neighbours } from "@/lib/reading";

export const ensureStatic = "navigation";

// The 200 most linked chapters and the home centre are built ahead; the others render on their first visit.
export function generateStaticParams() {
  return explorePages().map(({ book, chapter }) => ({ livro: book.slug, cap: String(chapter) }));
}

// The map stays in the layout; the connection panel is the page beside it (default: the most voted linked chapter;
// /explorar/<livro>/<cap>/<livro2>/<cap2>: the one chosen), so choosing a chapter only swaps the panel and the lit line.
export default async function ExploreLayout({ params, children }: LayoutProps<"/explorar/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const r = resolveChapter(livro, cap);
  if (!r) notFound();
  const atlas = await atlasOf(r.book, r.chapter);
  const top = await defaultConnection(r.book, r.chapter);
  if (!top) notFound();
  const { prev, next } = neighbours(r.book, r.chapter);
  const c = atlas.centre;

  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h1 className="bc-display">{c.label}</h1>
          <p className={`bc-lede ${styles.lede}`} data-explore-meta="">
            {partnersText(atlas.partners)} a {c.label}. Em volta de cada grupo de livros, os {PER_GROUP} mais votados.
          </p>
        </div>
        <p className={styles.headLinks}>
          <Link href={c.path} className="bc-button bc-button--secondary">
            <Icon name="book" />
            Ler {c.label}
          </Link>
          {prev && (
            <Link href={explorePath(prev.book.slug, prev.chapter)} className={styles.pager} rel="prev">
              <Icon name="chev-l" />
              {prev.label}
            </Link>
          )}
          {next && (
            <Link href={explorePath(next.book.slug, next.chapter)} className={styles.pager} rel="next">
              {next.label}
              <Icon name="chev-r" />
            </Link>
          )}
        </p>
      </div>
      <div className={styles.view}>
        <div className={styles.mapCol}>
          <AtlasMap atlas={atlas} selected={{ key: chapterKey(top.other), group: top.group }} />
        </div>
        <div className={styles.panelCol}>{children}</div>
      </div>
      <MapList atlas={atlas} />
    </main>
  );
}
