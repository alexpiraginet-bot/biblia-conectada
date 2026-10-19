import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectionPanel } from "@/components/explore/ConnectionPanel";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { explore, resolveChapter } from "@/lib/explore/data";
import { connectionPath, EXPLORE_ALWAYS } from "@/lib/explore/home";

export const ensureStatic = "navigation";

// Built ahead: the 11 medallions (6 labelled + 5) of the home centre and of João 1. Any other connection of a chapter
// to one of its 35 partners renders on its first visit and is kept.
const PREBUILT_CONNECTIONS = 11;
export async function generateStaticParams() {
  const out: { livro: string; cap: string; livro2: string; cap2: string }[] = [];
  for (const a of EXPLORE_ALWAYS) {
    const r = resolveChapter(a.slug, String(a.chapter));
    if (!r) continue;
    const data = await explore(r.book, r.chapter);
    for (const n of data.neighbours.slice(0, PREBUILT_CONNECTIONS)) {
      out.push({ livro: a.slug, cap: String(a.chapter), livro2: n.ref.book.slug, cap2: String(n.ref.chapter) });
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
  const data = await explore(a.book, a.chapter);
  const n = data.neighbours.find((x) => x.ref.book.index === b.book.index && x.ref.chapter === b.chapter);
  return n ? { data, n } : null;
}

export async function generateMetadata({ params }: PageProps<"/explorar/[livro]/[cap]/[livro2]/[cap2]">): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return { title: NOT_FOUND_TITLE };
  const c = r.data.centre;
  const p = r.n.ref;
  return {
    title: `${c.label} e ${p.label}`,
    description: `A ligação entre ${c.label} e ${p.label} nas referências cruzadas da OpenBible.info, com os versículos de cada lado.`,
    alternates: { canonical: connectionPath({ slug: c.book.slug, chapter: c.chapter }, { slug: p.book.slug, chapter: p.chapter }) },
  };
}

// A chosen connection: one of the 35 partners on the centre's graph. Any other chapter is not on the graph: 404.
export default async function ConnectionPage({ params }: PageProps<"/explorar/[livro]/[cap]/[livro2]/[cap2]">) {
  const r = await resolve(params);
  if (!r) notFound();
  return <ConnectionPanel data={r.data} n={r.n} focusOnNavigate />;
}
