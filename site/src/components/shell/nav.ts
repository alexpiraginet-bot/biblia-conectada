// The site's sections, in one place: the desktop header lists all of them, the phone's bottom bar the ones marked
// `bar` (design/README.md §5: four items, icon and label). Icons are the CSS masks in globals.css.
// Every item must lead to a page that exists (tests/routes.test.ts). "Linha do tempo" does not fit the bar and is
// reached from the header and the Explorar; "Dados" is in the header and the footer.
import booksJson from "@/data/generated/books.json";

/** `nested`: the section has pages below its own address ("/ponte/1"), so those pages count as the section too */
export type NavItem = { href: string; label: string; icon: string; bar: boolean; nested?: boolean };

export const NAV: readonly NavItem[] = [
  { href: "/explorar", label: "Explorar", icon: "i-explore", bar: true, nested: true },
  { href: "/ler", label: "Ler", icon: "i-book", bar: true },
  { href: "/linha-do-tempo", label: "Linha do tempo", icon: "i-time", bar: false, nested: true },
  { href: "/arcos", label: "Arcos", icon: "i-arc", bar: true },
  { href: "/ponte", label: "Ponte", icon: "i-bridge", bar: true, nested: true },
  { href: "/dados", label: "Dados", icon: "i-data", bar: false },
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
 *  home page, pages outside the navigation such as /sobre, /conexao or /salvos, and the 404 of an address like
 *  "/genesis/51" or "/ler/x"). */
export function currentItem(pathname: string): string | null {
  // "/ler/x" is a 404, not the book list: only a section with pages below it claims a longer path
  const own = NAV.find((n) => pathname === n.href || (n.nested && pathname.startsWith(`${n.href}/`)));
  if (own) return own.href;
  return isReadingPath(pathname) ? "/ler" : null;
}
