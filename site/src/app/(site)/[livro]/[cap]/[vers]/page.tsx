import type { Metadata } from "next";
import { NOT_FOUND_TITLE } from "@/components/NotFoundBody";
import { LinksPanel } from "@/components/reader/LinksPanel";
import { PanelShell } from "@/components/reader/PanelShell";
import { missingPage } from "@/lib/missing";
import { bookBySlug, chapterNumber, chapterVerses, versePages, verseNumber } from "@/lib/reading";

// The most linked verses are prerendered; the others render on their first request and are kept.
export function generateStaticParams() {
  return versePages.map(([livro, cap, vers]) => ({ livro, cap: String(cap), vers: String(vers) }));
}

async function resolve(params: Promise<{ livro: string; cap: string; vers: string }>) {
  const { livro, cap, vers } = await params;
  const book = bookBySlug(livro);
  const chapter = book ? chapterNumber(book, cap) : null;
  const verse = book && chapter ? verseNumber(book, chapter, vers) : null;
  return book && chapter && verse ? { book, chapter, verse } : null;
}

export async function generateMetadata({ params }: PageProps<"/[livro]/[cap]/[vers]">): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return { title: NOT_FOUND_TITLE };
  const label = `${r.book.name} ${r.chapter}:${r.verse}`;
  return {
    title: label,
    description: `${label} na Bíblia Livre (BLIVRE) e os versículos ligados a ele.`,
    alternates: { canonical: `/${r.book.slug}/${r.chapter}` },
    openGraph: { url: `/${r.book.slug}/${r.chapter}/${r.verse}` },
  };
}

export default async function VersePage({ params }: PageProps<"/[livro]/[cap]/[vers]">) {
  const r = await resolve(params);
  if (!r) {
    const { livro, cap, vers } = await params;
    missingPage([livro, cap, vers]);
  }
  const verses = await chapterVerses(r.book, r.chapter);
  const v = verses[r.verse - 1];
  const titleId = "titulo-ligacoes";
  return (
    <PanelShell chapterPath={`/${r.book.slug}/${r.chapter}`} titleId={titleId} verseId={`v${r.verse}`}>
      <LinksPanel book={r.book} chapter={r.chapter} verse={r.verse} text={v.text} links={v.links} titleId={titleId} />
    </PanelShell>
  );
}
