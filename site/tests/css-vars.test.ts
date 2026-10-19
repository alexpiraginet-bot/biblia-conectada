// Every custom property the site reads is declared somewhere: in the generated tokens, in a stylesheet, in a
// style={{ "--x": … }} object, a next/font `variable` or a setProperty call. An undeclared name (a typo, or a token
// renamed in a remodel) would silently fall back to the property's initial value, so it fails here.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE } from "../scripts/data/sources";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "generated" ? [] : files(p);
    return /\.(css|tsx?)$/.test(n) ? [p] : [];
  });
}

const sources = files(join(SITE, "src")).map((p) => ({ p, text: readFileSync(p, "utf8") }));

describe("CSS custom properties", () => {
  it("are all declared where they are read", () => {
    const declared = new Set<string>();
    const suffixes = new Set<string>();
    for (const { text } of sources) {
      for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
      for (const m of text.matchAll(/["'](--[\w-]+)["']/g)) declared.add(m[1]);
      // keys built in a template, `--${prefix}-dc` (src/components/explore/ExploreGraph.tsx)
      for (const m of text.matchAll(/`--\$\{\w+\}(-[\w-]+)`/g)) suffixes.add(m[1]);
    }
    const missing: string[] = [];
    for (const { p, text } of sources) {
      // var(--x, fallback) reads a property that may legitimately be unset
      for (const m of text.matchAll(/var\((--[\w-]+)\s*\)/g)) {
        const name = m[1];
        const templated = [...suffixes].some((s) => new RegExp(`^--[A-Za-z]+${s}$`).test(name));
        if (!declared.has(name) && !templated) missing.push(`${p.slice(SITE.length + 1)}: ${name}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
