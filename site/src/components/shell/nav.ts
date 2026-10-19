// The site's sections, in one place: the desktop header lists all of them, the phone's bottom bar the ones marked
// `bar` (design/README.md §5: four items, icon and label). Icons are the CSS masks in globals.css.
export type NavItem = { href: string; label: string; icon: string; bar: boolean };

export const NAV: readonly NavItem[] = [
  { href: "/explorar", label: "Explorar", icon: "i-explore", bar: true },
  { href: "/ler", label: "Ler", icon: "i-book", bar: true },
  { href: "/linha-do-tempo", label: "Linha do tempo", icon: "i-time", bar: false },
  { href: "/arcos", label: "Arcos", icon: "i-arc", bar: true },
  { href: "/ponte", label: "Ponte", icon: "i-bridge", bar: true },
];

/** Top-level pages that are not in the navigation (no item is current there). */
const OUTSIDE = ["/sobre", "/dados", "/trilha", "/mesa", "/conexao", "/tema", "/palavra", "/salvos", "/buscar", "/privacidade"];

/** The navigation item a path belongs to: its own section, or "Ler" for any book, chapter or verse page. */
export function currentItem(pathname: string): string | null {
  if (pathname === "/") return null;
  const own = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  if (own) return own.href;
  if (OUTSIDE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return "/ler";
}
