import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contrast } from "../scripts/contrast";
import { parseFocusPreferences } from "../src/components/reader/focus-preferences";

describe("reading appearance preferences", () => {
  it("recovers corrupt or absent settings without blocking the text", () => {
    for (const raw of [null, "{", "null", "[]", '"paper"']) {
      expect(parseFocusPreferences(raw)).toEqual({ paper: "paper", size: 21 });
    }
  });
  it("bounds typography and rejects unrecognized colors from device storage", () => {
    for (const size of [0, 17, 29, 100, 21.5, "24"]) {
      expect(parseFocusPreferences(JSON.stringify({ paper: "sepia", size }))).toEqual({ paper: "sepia", size: 21 });
    }
    expect(parseFocusPreferences('{"paper":"transparent","size":24}')).toEqual({ paper: "paper", size: 24 });
  });
  it("preserves each supported color and the legible size range", () => {
    for (const paper of ["paper", "sepia", "night"]) for (const size of [18, 21, 28]) {
      expect(parseFocusPreferences(JSON.stringify({ paper, size }))).toEqual({ paper, size });
    }
  });
});

describe("reading paper contrast", () => {
  const css = readFileSync(new URL("../src/components/reader/reading-focus.module.css", import.meta.url), "utf8");
  const colors = (selector: string) => Object.fromEntries([...css.slice(css.indexOf(selector)).split("}")[0].matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/g)].map((match) => [match[1], match[2]]));
  for (const paper of ["paper", "sepia", "night"]) it(`${paper}: reading, notes and controls stay legible`, () => {
    const t = { ...colors(".dialog {"), ...(paper === "paper" ? {} : colors(`.dialog[data-paper="${paper}"]`)) };
    for (const bg of ["--ground", "--raised"]) {
      for (const fg of ["--ink", "--ink-reading", "--ink-2"]) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(7);
      expect(contrast(t["--ink-3"], t[bg])).toBeGreaterThanOrEqual(5);
      expect(contrast(t["--accent"], t[bg])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--line-strong"], t[bg])).toBeGreaterThanOrEqual(3);
    }
  });
});
