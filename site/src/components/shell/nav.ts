// The site's sections, in one place: the desktop header lists all of them, the phone's bottom bar the ones marked
// `bar` (design/README.md §5: up to four items, icon and label). Icons are the CSS masks in globals.css.
// Only sections whose page exists are listed (tests/routes.test.ts): Explorar (i-explore), Linha do tempo (i-time) and
// Ponte (i-bridge) join when their pages land.
import booksJson from "@/data/generated/books.json";

/** `nested`: the section has pages below its own address (none yet), so those pages count as the section too */
export type NavItem = { href: string; label: string; icon: string; bar: boolean; nested?: boolean };

export const NAV: readonly NavItem[] = [
  { href: "/ler", label: "Ler", icon: "i-book", bar: true },
  { href: "/arcos", label: "Arcos", icon: "i-arc", bar: true },
  { href: "/dados", label: "Dados", icon: "i-data", bar: true },
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
 *  home page, pages outside the navigation such as /sobre, and every 404, "/genesis/51" included). */
export function currentItem(pathname: string): string | null {
  // "/ler/x" is a 404, not the book list: only a section with pages below it claims a longer path
  const own = NAV.find((n) => pathname === n.href || (n.nested && pathname.startsWith(`${n.href}/`)));
  if (own) return own.href;
  return isReadingPath(pathname) ? "/ler" : null;
}
