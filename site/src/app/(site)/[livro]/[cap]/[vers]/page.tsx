import type { Metadata } from "next";
import { shareMetadata } from "@/lib/share-metadata";
import { SITE_URL } from "@/lib/site-identity";
import { LinksPanel, type NearVerse } from "@/components/reader/LinksPanel";
import { PanelShell } from "@/components/reader/PanelShell";
import { graphPartners } from "@/lib/from-here";
import { medalhaoForBook } from "@/lib/medalhoes";
import { missingPage, NOT_FOUND_TITLE } from "@/lib/missing";
import { bookBySlug, chapterNumber, chapterPairs, chapterVerses, verseNumber, versePages, verseRef } from "@/lib/reading";

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
    ...shareMetadata({
      title: label,
      description: `${label} na Bíblia Livre (BLIVRE) e os versículos ligados a ele.`,
      path: `/${r.book.slug}/${r.chapter}/${r.verse}`,
    }),
    // Preserve the reading SEO: the chapter is canonical, while a shared card opens this exact verse.
    alternates: { canonical: new URL(`/${r.book.slug}/${r.chapter}`, SITE_URL).href },
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
  // the mini map's medallions: the book group of each partner drawn
  const medals = new Map(
    graphPartners(v.links.map(([key, votes]) => ({ key, votes }))).shown.map(({ key }) => {
      const m = medalhaoForBook(verseRef(key).book.osis);
      return [key, m ? { src: m.src96, group: `${m.category} (${m.label.toLocaleLowerCase("pt-BR")})` } : null] as const;
    }),
  );
  // a verse with no link offers its closest neighbours that have some, one on each side
  const near: NearVerse[] = [];
  if (v.links.length === 0) {
    const before = verses.slice(0, r.verse - 1).findLast((x) => x.links.length > 0);
    const after = verses.slice(r.verse).find((x) => x.links.length > 0);
    for (const x of [before, after]) if (x) near.push({ verse: x.n, links: x.links.length });
  }
  return (
    <PanelShell chapterPath={`/${r.book.slug}/${r.chapter}`} titleId={titleId} verseId={`v${r.verse}`}>
      <LinksPanel
        book={r.book}
        chapter={r.chapter}
        verse={r.verse}
        text={v.text}
        links={v.links}
        titleId={titleId}
        medals={medals}
        chapterLinks={chapterPairs(r.book, r.chapter)}
        near={near}
      />
    </PanelShell>
  );
}
