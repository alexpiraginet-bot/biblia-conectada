// The site's sections, in one place: the desktop header lists all of them, the phone's bottom bar the ones marked
// `bar` (design/README.md §5: up to four items, icon and label). Icons are the CSS masks in globals.css.
// Only sections whose page exists are listed (tests/routes.test.ts): Explorar (i-explore), Linha do tempo (i-time) and
// Ponte (i-bridge) join when their pages land.
export type NavItem = { href: string; label: string; icon: string; bar: boolean };

export const NAV: readonly NavItem[] = [
  { href: "/ler", label: "Ler", icon: "i-book", bar: true },
  { href: "/arcos", label: "Arcos", icon: "i-arc", bar: true },
  { href: "/dados", label: "Dados", icon: "i-data", bar: true },
];

/** Top-level pages that are not in the navigation (no item is current there). */
const OUTSIDE = ["/sobre", "/explorar", "/linha-do-tempo", "/ponte", "/trilha", "/mesa", "/conexao", "/tema", "/palavra", "/salvos", "/buscar", "/privacidade"];

/** The navigation item a path belongs to: its own section, or "Ler" for any book, chapter or verse page. */
export function currentItem(pathname: string): string | null {
  if (pathname === "/") return null;
  const own = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  if (own) return own.href;
  if (OUTSIDE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return "/ler";
}
