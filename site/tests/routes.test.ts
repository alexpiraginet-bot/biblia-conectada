// Every top-level page and public folder must be reserved, so no short URL (/is/9/6) can shadow it, and no reserved
// word may be a book slug.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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

  it("never take a book slug", () => {
    for (const b of books()) expect(RESERVED).not.toContain(b.slug);
  });
});
