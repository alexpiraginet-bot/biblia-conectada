// Every top-level page and public folder must be reserved, so no short URL (/is/9/6) can shadow it, and no reserved
// word may be a book slug. Every navigation item must open a page.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { currentItem, NAV } from "../src/components/shell/nav";
import { RESERVED } from "../src/lib/canon/redirects";
import { appRoutes, routeOf } from "../scripts/checks/pages";
import { SITE } from "../scripts/data/sources";
import { books } from "./generated";

const app = join(SITE, "src/app");
const isDir = (p: string) => statSync(p).isDirectory();
/** top-level route segments: folders of src/app and of its route groups, without dynamic or private ones */
function segments(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (!isDir(p)) return [];
    if (/^\(.+\)$/.test(name)) return segments(p);
    if (name.startsWith("[") || name.startsWith("_")) return [];
    return [name];
  });
}

/** The page file that renders a path ("/explorar/isaias/9"), if any: route groups are transparent, static folders come
 *  before dynamic ones. Only the shape of the path is matched, not whether a dynamic segment names something. With
 *  `dynamic` false the first segment must be a folder of its own (a section), so "/ponte" cannot pass as a book. */
function pageFor(path: string, dir = app, dynamic = true): string | null {
  const [head, ...rest] = path.split("/").filter(Boolean);
  if (head === undefined) {
    const file = ["page.tsx", "page.ts"].map((f) => join(dir, f)).find(existsSync);
    if (file) return file;
    return null;
  }
  const folders = readdirSync(dir).filter((n) => isDir(join(dir, n)) && !n.startsWith("_"));
  const next: [string, string, boolean][] = [
    ...folders.filter((n) => /^\(.+\)$/.test(n)).map((n): [string, string, boolean] => [n, path, dynamic]),
    ...folders.filter((n) => n === head).map((n): [string, string, boolean] => [n, rest.join("/"), true]),
    ...(dynamic ? folders.filter((n) => /^\[[^.]+\]$/.test(n)) : []).map((n): [string, string, boolean] => [n, rest.join("/"), true]),
  ];
  for (const [n, p, d] of next) {
    const found = pageFor(p, join(dir, n), d);
    if (found) return found;
  }
  return null;
}

describe("reserved segments", () => {
  it("cover every top-level page and public folder", () => {
    const pub = readdirSync(join(SITE, "public")).filter((n) => isDir(join(SITE, "public", n)));
    for (const s of [...segments(app), ...pub]) expect(RESERVED, s).toContain(s);
  });

  it("never take a book slug", () => {
    for (const b of books()) expect(RESERVED).not.toContain(b.slug);
  });
});

describe("navigation", () => {
  it("lists the sections in the planned order: seven in the rail, five tabs on phones", () => {
    expect(NAV.map((n) => n.href)).toEqual(["/explorar", "/ler", "/buscar", "/linha-do-tempo", "/arcos", "/ponte", "/salvos", "/dados"]);
    expect(NAV.filter((n) => n.rail).map((n) => n.label)).toEqual(["Explorar", "Ler", "Linha do tempo", "Arcos", "Ponte", "Salvos", "Dados"]);
    expect(NAV.filter((n) => n.tab).map((n) => n.label)).toEqual(["Explorar", "Ler", "Buscar", "Arcos", "Ponte"]);
  });

  it("leads every item to a page, following the redirects of next.config.ts (/explorar opens Isaías 9)", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    for (const n of NAV) {
      const target = redirects.find((r) => r.source === n.href)?.destination ?? n.href;
      expect(pageFor(target, app, false), `${n.href} -> ${target}`).not.toBeNull();
    }
    // /explorar itself has no page: the redirect is what opens it
    expect(pageFor("/explorar", app, false)).toBeNull();
    expect(redirects.find((r) => r.source === "/explorar")?.destination).toBe("/explorar/isaias/9");
    // the matcher itself: a section that does not exist is not taken for a book
    expect(pageFor("/grafo", app, false)).toBeNull();
    expect(pageFor("/grafo")).not.toBeNull();
  });
});

describe("route of a prerendered page (npm run budget groups pages by it)", () => {
  const routes = appRoutes(SITE);
  it.each([
    ["index.html", "/"],
    ["ler.html", "/ler"],
    ["salvos.html", "/salvos"],
    ["sobre.html", "/sobre"],
    ["mesa.html", "/mesa"],
    ["linha-do-tempo.html", "/linha-do-tempo"],
    ["isaias.html", "/[livro]"],
    [join("isaias", "9.html"), "/[livro]/[cap]"],
    [join("isaias", "9", "6.html"), "/[livro]/[cap]/[vers]"],
    [join("explorar", "isaias", "9.html"), "/explorar/[livro]/[cap]"],
    [join("explorar", "isaias", "9", "lucas", "2.html"), "/explorar/[livro]/[cap]/[livro2]/[cap2]"],
    [join("conexao", "isaias-9", "lucas-2.html"), "/conexao/[a]/[b]"],
    [join("ponte", "1.html"), "/ponte/[n]"],
    [join("trilha", "antes-do-natal.html"), "/trilha/antes-do-natal"],
    [join("trilha", "antes-do-natal", "3.html"), "/trilha/antes-do-natal/[n]"],
    [join("tema", "luz.html"), "/tema/[slug]"],
    [join("a", "b", "c", "d.html"), null],
  ])("%s -> %s", (page, route) => expect(routeOf(routes, page)).toBe(route));

  it("finds a route for every page folder of the app", () => {
    expect(routes).toContain("/");
    expect(routes).toContain("/salvos");
    for (const s of segments(app)) expect(routes.some((r) => r === `/${s}` || r.startsWith(`/${s}/`)), s).toBe(true);
  });
});

describe("current navigation item", () => {
  it.each([
    ["/", null],
    ["/explorar", "/explorar"],
    ["/explorar/isaias/9", "/explorar"],
    ["/explorar/isaias/9/lucas/2", "/explorar"],
    ["/ler", "/ler"],
    ["/isaias", "/ler"],
    ["/isaias/9", "/ler"],
    ["/isaias/9/6", "/ler"],
    ["/linha-do-tempo", "/linha-do-tempo"],
    ["/linha-do-tempo/423-lucas-10-25-37", "/linha-do-tempo"],
    ["/arcos", "/arcos"],
    ["/ponte", "/ponte"],
    ["/ponte/1", "/ponte"],
    ["/dados", "/dados"],
    ["/buscar", "/buscar"],
    ["/salvos", "/salvos"],
    // pages outside the navigation
    ["/sobre", null],
    ["/conexao/isaias-9/lucas-2", null],
    ["/trilha/antes-do-natal/3", null],
    ["/mesa", null],
    ["/tema/luz", null],
    ["/palavra/luz", null],
    // a 404 is in no section, also under a real book
    ["/x", null],
    ["/explorador", null],
    ["/genesis/50", "/ler"],
    ["/genesis/51", null],
    ["/genesis/1/31", "/ler"],
    ["/genesis/1/32", null],
    ["/genesis/01", null],
    ["/genesis/1/1/1", null],
    ["/judas/1/25", "/ler"],
    ["/judas/2", null],
    ["/genesis/1/99", null],
    ["/genesis/0", null],
    ["/isaias/capitulo", null],
    ["/isaias/9/6/7", null],
    ["/ler/x", null],
    ["/arcos/x", null],
    ["/dados/x", null],
    ["/buscar/x", null],
    ["/genesis/50/26", "/ler"],
  ])("%s -> %s", (path, item) => expect(currentItem(path)).toBe(item));
});
