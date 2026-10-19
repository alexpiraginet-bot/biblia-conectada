// The design system's tokens (src/styles/tokens.json; design/README.md, "Cor"): every rule of the contrast table holds
// in both themes, every theme spells out its own values, and the CSS the site loads is what the generator writes.
// The table is printed by `npx tsx scripts/contrast-table.ts`, with the same rules and formula.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, POLICY, themeTokens } from "../scripts/contrast";
import { TOKENS_CSS, tokensCss } from "../scripts/tokens-css";
import { THEME_COLOR } from "../src/components/header/theme";

const themes = themeTokens();

describe("design tokens", () => {
  it("give both themes, with a literal value for every colour (no token points at another)", () => {
    // Alex's iPhone, 19/10: text that inherited an alias (--text: var(--ink)) kept the other theme's colour after a
    // theme switch. Each theme gives every value itself.
    expect(Object.keys(themes)).toEqual(["noite", "dia"]);
    for (const t of Object.values(themes)) {
      for (const [k, v] of Object.entries(t)) expect(v, k).toMatch(/^#[0-9a-f]{6}$|^rgba\([\d.,\s]+\)$/);
    }
  });

  for (const [name, t] of Object.entries(themes)) {
    for (const [what, fg, bg, min] of POLICY) {
      it(`${name}: ${what} reach ${min}:1`, () => {
        for (const f of fg) for (const b of bg) expect(contrast(t[f], t[b]), `${f} on ${b}`).toBeGreaterThanOrEqual(min);
      });
    }
  }

  it("are what the site loads: src/styles/tokens.css is the generator's output (npx tsx scripts/tokens-css.ts)", () => {
    expect(readFileSync(TOKENS_CSS, "utf8")).toBe(tokensCss());
  });

  it("colour the browser chrome with each theme's ground", () => {
    expect(THEME_COLOR.noite.toLowerCase()).toBe(themes.noite["--ground"]);
    expect(THEME_COLOR.dia.toLowerCase()).toBe(themes.dia["--ground"]);
  });

  it("spell out every theme block of tokens.css, so a theme never inherits the other's colours", () => {
    const css = readFileSync(TOKENS_CSS, "utf8");
    const colours = Object.keys(themes.noite);
    const blocks = [...css.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).filter((b) => b.includes("--ground:"));
    expect(blocks).toHaveLength(4);
    for (const b of blocks) {
      for (const k of colours) expect(b, k).toMatch(new RegExp(`${k}: (#[0-9a-fA-F]{6}|rgba\\([^)]*\\));`));
    }
  });
});
