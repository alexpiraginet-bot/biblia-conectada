import type { Metadata } from "next";
import { ConnectionPanel } from "@/components/explore/ConnectionPanel";
import { NOT_FOUND_TITLE } from "@/components/NotFoundBody";
import { explore, explorePages, resolveChapter } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return explorePages().map(({ book, chapter }) => ({ livro: book.slug, cap: String(chapter) }));
}

export async function generateMetadata({ params }: PageProps<"/explorar/[livro]/[cap]">): Promise<Metadata> {
  const { livro, cap } = await params;
  const r = resolveChapter(livro, cap);
  if (!r) return { title: NOT_FOUND_TITLE };
  const label = `${r.book.name} ${r.chapter}`;
  return {
    title: `Explorar ${label}`,
    description: `${label} e os capítulos mais ligados a ele pelas referências cruzadas da OpenBible.info, por votos.`,
    alternates: { canonical: explorePath(r.book.slug, r.chapter) },
  };
}

// No connection chosen yet: the panel shows the strongest partner (most votes).
export default async function ExplorePage({ params }: PageProps<"/explorar/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const r = resolveChapter(livro, cap);
  if (!r) return null;
  const data = await explore(r.book, r.chapter);
  const first = data.neighbours[0];
  if (!first) return null;
  return <ConnectionPanel data={data} n={first} focusOnNavigate />;
}
