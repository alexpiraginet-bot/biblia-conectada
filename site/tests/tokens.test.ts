// Colour tokens (design/README.md §3): every text token must read on every ground it can sit on, in both themes.
// The table in design §3 is printed by `npx tsx scripts/contrast-table.ts`, which uses the same parser and formula.
import { describe, expect, it } from "vitest";
import { contrast, themeTokens } from "../scripts/contrast";

const themes = themeTokens();
const grounds = ["--ground", "--surface", "--raised"] as const;

// WCAG 2.2: 4.5:1 for body text (1.4.3), 3:1 for control boundaries (1.4.11)
const TEXT = ["--ink", "--ink-2", "--ink-3", "--accent-text", "--accent-interp", "--accent-theme", "--link-history"];

describe("theme tokens", () => {
  it("parse both themes from globals.css", () => {
    expect(Object.keys(themes)).toEqual(["noite", "dia"]);
    for (const t of Object.values(themes)) for (const k of [...TEXT, ...grounds, "--control-border"]) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/);
  });

  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: text tokens reach 4.5:1 on ground, surface and raised`, () => {
      for (const fg of TEXT) for (const bg of grounds) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name}: text on the highlight band and labels on filled buttons reach 4.5:1`, () => {
      expect(contrast(t["--ink"], t["--highlight"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--on-gold"], t["--accent-text"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--on-fill"], t["--accent-theme"])).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name}: control borders reach 3:1 on ground and surface`, () => {
      for (const bg of ["--ground", "--surface"]) expect(contrast(t["--control-border"], t[bg]), bg).toBeGreaterThanOrEqual(3);
    });
  }

  it("the sky gold reads on the sky ground (canvas views paint it in both themes)", () => {
    const n = themes.noite;
    expect(contrast(n["--sky-gold"], n["--sky"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(n["--sky-text-2"], n["--sky"])).toBeGreaterThanOrEqual(4.5);
  });
});
