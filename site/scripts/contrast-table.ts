// Prints the contrast of every rule of design/README.md ("Contraste medido"): the lowest ratio of each rule, Noite · Dia.
// npx tsx scripts/contrast-table.ts
import { contrast, POLICY, themeTokens } from "./contrast";

const t = themeTokens();
const fmt = (x: number) => x.toFixed(2).replace(".", ",");
const lowest = (theme: Record<string, string>, fg: string[], bg: string[]) =>
  Math.min(...fg.flatMap((f) => bg.map((b) => contrast(theme[f], theme[b]))));

console.log("| Uso | Regra | Noite | Dia |");
console.log("| --- | --- | --- | --- |");
for (const [what, fg, bg, min] of POLICY) {
  console.log(`| ${what} | ${fmt(min)}:1 | ≥ ${fmt(lowest(t.noite, fg, bg))} | ≥ ${fmt(lowest(t.dia, fg, bg))} |`);
}
