// The site's sections, in one place (design/README.md, "Estrutura das páginas"). From 1024px the rail on the left
// lists the items marked `rail`; phones show four `tab` destinations plus a complete navigation disclosure.
// Every item leads to a page that exists (tests/routes.test.ts).
import booksJson from "@/data/generated/books.json";
import type { IconName } from "@/components/icons";

/** `nested`: the section has pages below its own address ("/ponte/1"), so those pages count as the section too;
 *  `pages`: the only pages below it, when there are just a few (any other address below stays a 404 in no section) */
export type NavItem = { href: string; label: string; icon: IconName; rail: boolean; tab: boolean; description?: string; featured?: boolean; nested?: boolean; pages?: readonly string[] };

export const NAV: readonly NavItem[] = [
  { href: "/explorar", label: "Explorar", icon: "explore", rail: true, tab: true, nested: true },
  { href: "/ler", label: "Ler", icon: "book", rail: true, tab: true },
  { href: "/coracao", label: "Coração", icon: "heart", rail: true, tab: true },
  { href: "/buscar", label: "Buscar", icon: "search", rail: false, tab: false, description: "Passagens, palavras e temas" },
  { href: "/linha-do-tempo", label: "Linha do tempo", icon: "time", rail: true, tab: false, description: "Eventos e suas referências", nested: true },
  { href: "/caminhos", label: "Mapa de Jesus", icon: "map", rail: true, tab: false, description: "Siga os lugares e caminhos", featured: true },
  { href: "/cronologia", label: "Cronologia", icon: "clock", rail: true, tab: false, description: "Leia a história em sequência", featured: true },
  { href: "/arcos", label: "Arcos", icon: "arc", rail: true, tab: true, pages: ["/arcos/plano"] },
  { href: "/ponte", label: "Ponte", icon: "bridge", rail: true, tab: false, description: "Descubra a ligação do dia", nested: true },
  { href: "/salvos", label: "Salvos", icon: "bookmark", rail: true, tab: false, description: "Reencontre suas passagens" },
  { href: "/dados", label: "Dados", icon: "data", rail: true, tab: false, description: "Fontes e números da Bíblia" },
];

// A section cannot disappear from mobile navigation by forgetting a second opt-in flag.
// Maps and guided chronology lead the menu; the desktop rail retains its established order.
export const MOBILE_MENU = NAV.filter((n) => !n.tab).sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

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
