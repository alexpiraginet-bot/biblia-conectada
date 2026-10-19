// WCAG 2.2 contrast of the colour tokens in src/app/globals.css (design/README.md §3).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = join(import.meta.dirname, "..", "src", "app", "globals.css");

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** hex tokens of a CSS block; `var(--x)` resolves against the same block, then against `base` */
function block(css: string, selector: string, base: Record<string, string> = {}): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block in globals.css`);
  const body = css.slice(start, css.indexOf("}", start));
  const raw = Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const out: Record<string, string> = { ...base };
  const resolve = (v: string, depth = 0): string => {
    const ref = /^var\((--[\w-]+)\)$/.exec(v);
    if (!ref || depth > 5) return v.toLowerCase();
    return resolve(raw[ref[1]] ?? base[ref[1]] ?? v, depth + 1);
  };
  for (const [k, v] of Object.entries(raw)) out[k] = resolve(v);
  return out;
}

export function themeTokens(css = readFileSync(CSS, "utf8")): Record<"noite" | "dia", Record<string, string>> {
  const noite = block(css, ":root");
  return { noite, dia: block(css, '[data-theme="dia"]', noite) };
}
