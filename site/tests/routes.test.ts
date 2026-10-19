// Every top-level page and public folder must be reserved, so no short URL (/is/9/6) can shadow it, and no reserved
// word may be a book slug.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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

describe("reserved segments", () => {
  it("cover every top-level page and public folder", () => {
    const pub = readdirSync(join(SITE, "public")).filter((n) => isDir(join(SITE, "public", n)));
    for (const s of [...segments(app), ...pub]) expect(RESERVED, s).toContain(s);
  });

  it("include every navigation section, so no menu item leads to a missing page", () => {
    const pages = segments(app);
    for (const n of NAV) expect(pages, n.href).toContain(n.href.slice(1).split("/")[0]);
  });

  it("never take a book slug", () => {
    for (const b of books()) expect(RESERVED).not.toContain(b.slug);
  });
});

describe("current navigation item", () => {
  it.each([
    ["/", null],
    ["/ler", "/ler"],
    ["/isaias", "/ler"],
    ["/isaias/9/6", "/ler"],
    ["/arcos", "/arcos"],
    ["/dados", "/dados"],
    ["/sobre", null],
    // a 404 is in no section
    ["/x", null],
    ["/explorar", null],
  ])("%s -> %s", (path, item) => expect(currentItem(path)).toBe(item));
});
