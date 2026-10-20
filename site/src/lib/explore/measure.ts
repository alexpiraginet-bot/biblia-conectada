// Width of a map label in the site's own fonts: advance widths plus pair kerning, read from the WOFF2 files by
// scripts/label-metrics.py (label-metrics.json, which records each font's SHA-256; tests/explore-layout.test.ts fails
// when a font changes until the script runs again). Server and tests only: the table is 72 KB.
import metricsJson from "./label-metrics.json";
import type { Measure } from "./atlas";

type Face = { file: string; sha256: string; unitsPerEm: number; advances: Record<string, number>; kerning: Record<string, number> };
export const metrics = metricsJson as unknown as { faces: Record<"title" | "ui", Face> };

/**
 * `strict` throws on a character the table does not cover (the tests); otherwise such a character counts as wide as
 * the widest one, so a label the table did not foresee still gets room on the map.
 */
export function makeMeasure(strict: boolean): Measure {
  const widest = Object.fromEntries(
    Object.entries(metrics.faces).map(([k, f]) => [k, Math.max(...Object.values(f.advances))]),
  ) as Record<"title" | "ui", number>;
  return (face, text, px) => {
    const f = metrics.faces[face];
    let units = 0;
    for (let i = 0; i < text.length; i++) {
      let adv = f.advances[text[i]];
      if (adv === undefined) {
        if (strict) throw new Error(`${face}: no advance for "${text[i]}" in label-metrics.json`);
        adv = widest[face];
      }
      units += adv + (i > 0 ? (f.kerning[text[i - 1] + text[i]] ?? 0) : 0);
    }
    return (units * px) / f.unitsPerEm;
  };
}

export const measure = makeMeasure(false);
