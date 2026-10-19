// Post-build checks: the credits are in the prerendered HTML of every page (CLAUDE.md rule 2) and the numbers on
// the home page are the ones the pipeline computed (rule 3).
//   runs at the end of `npm run build`
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { formatInt } from "../src/lib/canon/text";
import { OUT, SITE } from "./data/sources";

const credits = JSON.parse(readFileSync(join(OUT.generated, "credits.json"), "utf8")) as { blivreCredit: string };
const appDir = join(SITE, ".next/server/app");
if (!existsSync(appDir)) throw new Error("no .next/server/app: run `next build` first");

const html = readdirSync(appDir).filter((f) => f.endsWith(".html") && !f.startsWith("_"));
const required = ["index.html", "sobre.html", "arcos.html"];
for (const r of required) if (!html.includes(r)) throw new Error(`[check-dist] ${r} was not prerendered`);

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/<!-- -->/g, "");
const failures: string[] = [];
for (const f of html) {
  const page = decode(readFileSync(join(appDir, f), "utf8"));
  if (!page.includes(credits.blivreCredit)) failures.push(`${f}: BLIVRE credit missing`);
  if (!page.includes("Referências cruzadas: OpenBible.info")) failures.push(`${f}: OpenBible.info credit missing`);
  if (!page.includes('lang="pt-BR"')) failures.push(`${f}: lang="pt-BR" missing`);
}
const sobre = decode(readFileSync(join(appDir, "sobre.html"), "utf8"));
for (const s of ["Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc.", "Theographic Bible Metadata, Viz.Bible", "OpenBible.info"]) {
  if (!sobre.includes(s)) failures.push(`sobre.html: "${s}" missing`);
}
// rule 3: the numbers on the home page are the pipeline's numbers, rendered with pt-BR grouping
type Summary = { counts: Record<string, number>; topVerses: { ref: string; links: number }[] };
const summary = JSON.parse(readFileSync(join(OUT.generated, "summary.json"), "utf8")) as Summary;
const home = decode(readFileSync(join(appDir, "index.html"), "utf8"));
const homeNumbers = [
  `${formatInt(summary.counts.verses)} versículos`,
  `${formatInt(summary.counts.crossrefRows)} referências cruzadas`,
  `${formatInt(summary.counts.arcs)} pares de versículos diferentes`,
  `${summary.topVerses[0].ref}, com ${formatInt(summary.topVerses[0].links)}`,
];
for (const s of homeNumbers) if (!home.includes(s)) failures.push(`index.html: "${s}" missing`);
if (home.includes(formatInt(summary.counts.pairs))) failures.push("index.html: shows the pair count with the 45 self-pairs");
// /arcos (the sky of links) states the same numbers in its first screen, from the same pipeline
const arcos = decode(readFileSync(join(appDir, "arcos.html"), "utf8"));
for (const s of homeNumbers) if (!arcos.includes(s)) failures.push(`arcos.html: "${s}" missing`);
if (arcos.includes(formatInt(summary.counts.pairs))) failures.push("arcos.html: shows the pair count with the 45 self-pairs");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`[check-dist] credits present in ${html.length} prerendered pages (${html.join(", ")}); home and /arcos numbers match summary.json`);
