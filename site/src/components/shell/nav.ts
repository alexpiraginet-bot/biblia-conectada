// The site's sections, in one place (design/README.md, "Estrutura das páginas"). From 1024px the rail on the left
// lists the items marked `rail`; on phones the tab bar lists the five marked `tab`. "Buscar" is a tab only: on wider
// screens the search box sits in the top bar. Every item leads to a page that exists (tests/routes.test.ts).
import booksJson from "@/data/generated/books.json";
import type { IconName } from "@/components/icons";

/** `nested`: the section has pages below its own address ("/ponte/1"), so those pages count as the section too;
 *  `pages`: the only pages below it, when there are just a few (any other address below stays a 404 in no section) */
export type NavItem = { href: string; label: string; icon: IconName; rail: boolean; tab: boolean; nested?: boolean; pages?: readonly string[] };

export const NAV: readonly NavItem[] = [
  { href: "/explorar", label: "Explorar", icon: "explore", rail: true, tab: true, nested: true },
  { href: "/ler", label: "Ler", icon: "book", rail: true, tab: true },
  { href: "/buscar", label: "Buscar", icon: "search", rail: false, tab: true },
  { href: "/linha-do-tempo", label: "Linha do tempo", icon: "time", rail: true, tab: false, nested: true },
  { href: "/arcos", label: "Arcos", icon: "arc", rail: true, tab: true, pages: ["/arcos/plano"] },
  { href: "/ponte", label: "Ponte", icon: "bridge", rail: true, tab: true, nested: true },
  { href: "/salvos", label: "Salvos", icon: "bookmark", rail: true, tab: false },
  { href: "/dados", label: "Dados", icon: "data", rail: true, tab: false },
];

/** verses per chapter of each book, by slug */
const GRID = new Map((booksJson as { slug: string; verses: number[] }[]).map((b) => [b.slug, b.verses]));
const NUMBER = /^[1-9]\d{0,2}$/;

/** "/isaias", "/isaias/9", "/isaias/9/6": a book, chapter or verse that exists (the rules of chapterNumber and
 *  verseNumber in src/lib/reading.ts) */
function isReadingPath(pathname: string): boolean {
  const [slug, cap, vers, ...more] = pathname.split("/").filter(Boolean);
  const verses = slug ? GRID.get(slug) : undefined;
  if (!verses || more.length > 0) return false;
  if (cap === undefined) return true;
  if (!NUMBER.test(cap) || Number(cap) > verses.length) return false;
  return vers === undefined || (NUMBER.test(vers) && Number(vers) <= verses[Number(cap) - 1]);
}

/** The navigation item a path belongs to: its own section, "Ler" for a book, chapter or verse page, else none (the
 *  home page, pages outside the navigation such as /sobre or /conexao, and the 404 of an address like
 *  "/genesis/51" or "/ler/x"). */
export function currentItem(pathname: string): string | null {
  // "/ler/x" is a 404, not the book list: only a section with pages below it claims a longer path
  const own = NAV.find((n) => pathname === n.href || n.pages?.includes(pathname) || (n.nested && pathname.startsWith(`${n.href}/`)));
  if (own) return own.href;
  return isReadingPath(pathname) ? "/ler" : null;
}
