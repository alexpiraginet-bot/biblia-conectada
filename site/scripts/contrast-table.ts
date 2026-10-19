// Prints the token table of design/README.md §3 (contrast on ground / surface / raised, Noite · Dia).
// npx tsx scripts/contrast-table.ts
import { contrast, themeTokens } from "./contrast";

const t = themeTokens();
const grounds = ["--ground", "--surface", "--raised"];
const rows = ["--ink", "--ink-2", "--ink-3", "--accent-text", "--accent-interp", "--accent-theme", "--link-history", "--control-border", "--hairline"];
const fmt = (x: number) => x.toFixed(2).replace(".", ",");

console.log("| Token | Noite | Dia | Contraste em ground / surface / raised (Noite · Dia) |");
console.log("|---|---|---|---|");
for (const k of grounds) console.log(`| \`${k}\` | \`${t.noite[k].toUpperCase()}\` | \`${t.dia[k].toUpperCase()}\` | |`);
for (const k of rows) {
  const n = grounds.map((g) => fmt(contrast(t.noite[k], t.noite[g]))).join(" / ");
  const d = grounds.map((g) => fmt(contrast(t.dia[k], t.dia[g]))).join(" / ");
  console.log(`| \`${k}\` | \`${t.noite[k].toUpperCase()}\` | \`${t.dia[k].toUpperCase()}\` | ${n} · ${d} |`);
}
const extra: [string, string, string][] = [
  ["--ink", "--highlight", "texto sobre a faixa de destaque"],
  ["--on-gold", "--accent-text", "rótulo de botão preenchido com o acento"],
  ["--on-fill", "--accent-theme", "rótulo sobre o verde de Tema"],
];
for (const [fg, bg, what] of extra) console.log(`| \`${fg}\` sobre \`${bg}\` | | | ${what}: ${fmt(contrast(t.noite[fg], t.noite[bg]))} · ${fmt(contrast(t.dia[fg], t.dia[bg]))} |`);
console.log(`| \`--sky-gold\` sobre \`--sky\` | | | ouro do céu (todos os temas): ${fmt(contrast(t.noite["--sky-gold"], t.noite["--sky"]))} |`);
