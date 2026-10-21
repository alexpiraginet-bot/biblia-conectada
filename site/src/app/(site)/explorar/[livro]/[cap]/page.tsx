import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import { ConnectionPanel } from "@/components/explore/ConnectionPanel";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { defaultConnection } from "@/lib/explore/atlas-data";
import { explorePages, resolveChapter } from "@/lib/explore/data";
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
  return shareMetadata({
    title: `Explorar ${label}`,
    description: `O mapa de ${label}: os capítulos ligados a ele pelas referências cruzadas da OpenBible.info, por grupo de livros e por votos.`,
    path: explorePath(r.book.slug, r.chapter),
  });
}

// No connection chosen yet: the panel shows the most voted linked chapter.
export default async function ExplorePage({ params }: PageProps<"/explorar/[livro]/[cap]">) {
  const { livro, cap } = await params;
  const r = resolveChapter(livro, cap);
  if (!r) return null;
  const c = await defaultConnection(r.book, r.chapter);
  if (!c) return null;
  return <ConnectionPanel c={c} focusOnNavigate explore />;
}
