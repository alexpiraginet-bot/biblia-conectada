// The site's sections, in one place: the desktop header lists all of them, the phone's bottom bar the ones marked
// `bar` (design/README.md §5: up to four items, icon and label). Icons are the CSS masks in globals.css.
// Only sections whose page exists are listed (tests/routes.test.ts): Explorar (i-explore), Linha do tempo (i-time) and
// Ponte (i-bridge) join when their pages land.
import booksJson from "@/data/generated/books.json";

export type NavItem = { href: string; label: string; icon: string; bar: boolean };

export const NAV: readonly NavItem[] = [
  { href: "/ler", label: "Ler", icon: "i-book", bar: true },
  { href: "/arcos", label: "Arcos", icon: "i-arc", bar: true },
  { href: "/dados", label: "Dados", icon: "i-data", bar: true },
];

const BOOKS = new Set((booksJson as { slug: string }[]).map((b) => b.slug));

/** The navigation item a path belongs to: its own section, "Ler" for a book, chapter or verse page, else none (the
 *  home page, pages outside the navigation such as /sobre, and the 404 page). */
export function currentItem(pathname: string): string | null {
  const own = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  if (own) return own.href;
  return BOOKS.has(pathname.split("/")[1]) ? "/ler" : null;
}
