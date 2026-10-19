// WCAG 2.2 contrast of the colour tokens of the design system (src/styles/tokens.json; design/README.md, "Cor").
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TOKENS = join(import.meta.dirname, "..", "src", "styles", "tokens.json");

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

type Entry = { name: string; value: string | Record<string, string> };

/** The colour tokens of each theme, keyed "--name", lowercase ("#rrggbb", or rgba() for the veil) */
export function themeTokens(json = readFileSync(TOKENS, "utf8")): Record<"noite" | "dia", Record<string, string>> {
  const tokens = (JSON.parse(json) as { color: { tokens: Entry[] } }).color.tokens;
  const of = (theme: "noite" | "dia") =>
    Object.fromEntries(
      tokens.map((e) => [`--${e.name}`, (typeof e.value === "string" ? e.value : (e.value[theme] ?? e.value.noite)).toLowerCase()]),
    );
  return { noite: of("noite"), dia: of("dia") };
}

/** The contrast rules of design/README.md ("Contraste medido"): [text tokens, grounds, minimum ratio] */
export const SURFACES = ["--ground", "--surface", "--raised", "--overlay"];
export const POLICY: [what: string, fg: string[], bg: string[], min: number][] = [
  ["texto e Escritura", ["--ink", "--ink-reading", "--ink-2"], [...SURFACES, "--highlight"], 7],
  ["notas", ["--ink-3"], SURFACES, 5],
  [
    "acento e categorias como texto",
    ["--accent", "--accent-strong", "--lit", "--cat-texto", "--cat-interp", "--cat-tema", "--cat-historia", "--danger"],
    SURFACES,
    4.5,
  ],
  ["rótulo sobre o botão principal", ["--on-action"], ["--action-fill"], 7],
  ["rótulo sobre o acento", ["--on-accent"], ["--accent-fill"], 7],
  ["bordas de controle e anel de foco", ["--line-strong", "--focus"], SURFACES, 3],
  ["texto do céu", ["--sky-ink"], ["--sky"], 7],
  ["texto secundário do céu", ["--sky-ink-2"], ["--sky"], 4.5],
  ["ouro do céu", ["--sky-gold"], ["--sky"], 3],
];
