// The site's sections, in one place: the desktop header lists all of them, the phone's bottom bar the ones marked
// `bar` (design/README.md §5: four items, icon and label). Icons are the CSS masks in globals.css.
// Every item must lead to a page that exists (tests/routes.test.ts). "Linha do tempo" does not fit the bar and is
// reached from the header and the Explorar; "Dados" is in the header and the footer.
import booksJson from "@/data/generated/books.json";

export type NavItem = { href: string; label: string; icon: string; bar: boolean };

export const NAV: readonly NavItem[] = [
  { href: "/explorar", label: "Explorar", icon: "i-explore", bar: true },
  { href: "/ler", label: "Ler", icon: "i-book", bar: true },
  { href: "/linha-do-tempo", label: "Linha do tempo", icon: "i-time", bar: false },
  { href: "/arcos", label: "Arcos", icon: "i-arc", bar: true },
  { href: "/ponte", label: "Ponte", icon: "i-bridge", bar: true },
  { href: "/dados", label: "Dados", icon: "i-data", bar: false },
];

const BOOKS = new Set((booksJson as { slug: string }[]).map((b) => b.slug));

/** The navigation item a path belongs to: its own section, "Ler" for a book, chapter or verse page, else none (the
 *  home page, pages outside the navigation such as /sobre, /conexao or /salvos, and the 404 page). */
export function currentItem(pathname: string): string | null {
  const own = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  if (own) return own.href;
  return BOOKS.has(pathname.split("/")[1]) ? "/ler" : null;
}
