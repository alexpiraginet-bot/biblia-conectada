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

/** verses per chapter of each book, by slug */
const BOOKS = new Map((booksJson as { slug: string; verses: number[] }[]).map((b) => [b.slug, b.verses]));
/** "9" -> 9 when it is a number from 1 to `max` written as the site writes it (no leading zero), else 0 */
const within = (raw: string, max: number) => (/^[1-9]\d{0,2}$/.test(raw) && Number(raw) <= max ? Number(raw) : 0);

/** The navigation item a path belongs to: its own section, "Ler" for a book, chapter or verse that exists, else none
 *  (the home page, pages outside the navigation such as /sobre, /conexao or /salvos, and the 404 page, also the one
 *  of an address like /genesis/51 under a real book). */
export function currentItem(pathname: string): string | null {
  const own = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  if (own) return own.href;
  const [, slug, cap, vers, ...rest] = pathname.split("/");
  const verses = BOOKS.get(slug);
  if (!verses || rest.length > 0) return null;
  if (cap === undefined) return "/ler";
  const chapter = within(cap, verses.length);
  if (!chapter) return null;
  return vers === undefined || within(vers, verses[chapter - 1]) ? "/ler" : null;
}
