// Every top-level page and public folder must be reserved, so no short URL (/is/9/6) can shadow it, and no reserved
// word may be a book slug. Every navigation item must open a page.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { currentItem, NAV } from "../src/components/shell/nav";
import { RESERVED } from "../src/lib/canon/redirects";
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
  it("lists the sections in the planned order: four in the phone bar, all of them in the header", () => {
    expect(NAV.map((n) => n.href)).toEqual(["/explorar", "/ler", "/linha-do-tempo", "/arcos", "/ponte", "/dados"]);
    expect(NAV.filter((n) => n.bar).map((n) => n.label)).toEqual(["Explorar", "Ler", "Arcos", "Ponte"]);
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
    // pages outside the navigation
    ["/sobre", null],
    ["/conexao/isaias-9/lucas-2", null],
    ["/salvos", null],
    ["/trilha/antes-do-natal/3", null],
    ["/mesa", null],
    ["/tema/luz", null],
    ["/palavra/luz", null],
    // a 404 is in no section
    ["/x", null],
    ["/explorador", null],
  ])("%s -> %s", (path, item) => expect(currentItem(path)).toBe(item));
});
