import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectionPanel } from "@/components/explore/ConnectionPanel";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { atlasOf, connectionOf } from "@/lib/explore/atlas-data";
import { resolveChapter } from "@/lib/explore/data";
import { connectionPath, EXPLORE_ALWAYS } from "@/lib/explore/home";
import { chapterRef } from "@/lib/reading";

export const ensureStatic = "navigation";

// Built ahead: every chapter drawn on the map of the home centre and of João 1, and the most voted chapter of each of
// their groups (where a medallion leads). Any other linked chapter renders on its first visit and is kept.
export async function generateStaticParams() {
  const out: { livro: string; cap: string; livro2: string; cap2: string }[] = [];
  for (const a of EXPLORE_ALWAYS) {
    const r = resolveChapter(a.slug, String(a.chapter));
    if (!r) continue;
    const atlas = await atlasOf(r.book, r.chapter);
    const cis = new Set([...atlas.wide.nodes.map((n) => n.ci), ...atlas.groups.flatMap((g) => g.partners.slice(0, 1).map((p) => p.ci))]);
    for (const ci of [...cis].sort((x, y) => x - y)) {
      const p = chapterRef(ci);
      out.push({ livro: a.slug, cap: String(a.chapter), livro2: p.book.slug, cap2: String(p.chapter) });
    }
  }
  return out;
}

type Params = Promise<{ livro: string; cap: string; livro2: string; cap2: string }>;

async function resolve(params: Params) {
  const { livro, cap, livro2, cap2 } = await params;
  const a = resolveChapter(livro, cap);
  const b = resolveChapter(livro2, cap2);
  if (!a || !b) return null;
  return connectionOf(a.book, a.chapter, b.book.firstChapter + b.chapter - 1);
}

export async function generateMetadata({ params }: PageProps<"/explorar/[livro]/[cap]/[livro2]/[cap2]">): Promise<Metadata> {
  const c = await resolve(params);
  if (!c) return { title: NOT_FOUND_TITLE };
  return shareMetadata({
    title: `${c.centre.label} e ${c.other.label}`,
    description: `A ligação entre ${c.centre.label} e ${c.other.label} nas referências cruzadas da OpenBible.info, com os versículos de cada lado.`,
    path: connectionPath({ slug: c.centre.book.slug, chapter: c.centre.chapter }, { slug: c.other.book.slug, chapter: c.other.chapter }),
  });
}

// A chosen connection: any chapter linked to the centre. A chapter with no verse pair to it is not a connection: 404.
export default async function ConnectionPage({ params }: PageProps<"/explorar/[livro]/[cap]/[livro2]/[cap2]">) {
  const c = await resolve(params);
  if (!c) notFound();
  return <ConnectionPanel c={c} focusOnNavigate explore />;
}
