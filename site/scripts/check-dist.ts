// Post-build checks: the credits are in the prerendered HTML of every page (CLAUDE.md rule 2), the numbers on
// the home page are the ones the pipeline computed (rule 3) and no protected translation text reached the build (rule 1).
//   runs at the end of `npm run build`
import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { formatInt } from "../src/lib/canon/text";
import { findLeaks, loadProtectedQuotes, protectedRuns, textFiles } from "./data/leak-guard";
import { OUT, SITE, SRC } from "./data/sources";

const credits = JSON.parse(readFileSync(join(OUT.generated, "credits.json"), "utf8")) as { blivreCredit: string };
const appDir = join(SITE, ".next/server/app");
if (!existsSync(appDir)) throw new Error("no .next/server/app: run `next build` first");

// every prerendered page, at any depth; "_not-found" and the like are framework pages, and a "[param]" file is the
// fallback shell of a dynamic route, filled in at request time
const html = textFiles(appDir)
  .filter((f) => f.endsWith(".html"))
  .map((f) => relative(appDir, f))
  .filter((f) => !f.split(sep).some((part) => part.startsWith("_") || part.includes("[")));
const required = ["index.html", "sobre.html", "arcos.html", "ler.html", "isaias.html", join("isaias", "9.html"), join("isaias", "9", "6.html")];
for (const r of required) if (!html.includes(r)) throw new Error(`[check-dist] ${r} was not prerendered`);

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/<!-- -->/g, "");
/** visible text, so a credit with a link inside it still reads as one string */
const textOf = (s: string) => decode(s).replace(/<[^>]*>/g, "");
const failures: string[] = [];
for (const f of html) {
  const raw = readFileSync(join(appDir, f), "utf8");
  const text = textOf(raw);
  if (!text.includes(credits.blivreCredit)) failures.push(`${f}: BLIVRE credit missing`);
  if (!text.includes("Referências cruzadas: OpenBible.info")) failures.push(`${f}: OpenBible.info credit missing`);
  if (!raw.includes('<html lang="pt-BR"')) failures.push(`${f}: lang="pt-BR" missing`);
}
const sobre = textOf(readFileSync(join(appDir, "sobre.html"), "utf8"));
for (const s of ["Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc.", "Theographic Bible Metadata, Viz.Bible", "OpenBible.info"]) {
  if (!sobre.includes(s)) failures.push(`sobre.html: "${s}" missing`);
}
// rule 3: the numbers on the home page are the pipeline's numbers, rendered with pt-BR grouping
type Summary = { counts: Record<string, number>; topVerses: { ref: string; links: number }[] };
const summary = JSON.parse(readFileSync(join(OUT.generated, "summary.json"), "utf8")) as Summary;
const home = textOf(readFileSync(join(appDir, "index.html"), "utf8"));
const homeNumbers = [
  `${formatInt(summary.counts.verses)} versículos`,
  `${formatInt(summary.counts.crossrefRows)} referências cruzadas`,
  `${formatInt(summary.counts.arcs)} pares de versículos diferentes`,
  `${summary.topVerses[0].ref}, com ${formatInt(summary.topVerses[0].links)}`,
];
for (const s of homeNumbers) if (!home.includes(s)) failures.push(`index.html: "${s}" missing`);
if (home.includes(formatInt(summary.counts.pairs))) failures.push("index.html: shows the pair count with the 45 self-pairs");
// /arcos (the sky of links) states the same numbers in its first screen, from the same pipeline
const arcos = textOf(readFileSync(join(appDir, "arcos.html"), "utf8"));
for (const s of homeNumbers) if (!arcos.includes(s)) failures.push(`arcos.html: "${s}" missing`);
if (arcos.includes(formatInt(summary.counts.pairs))) failures.push("arcos.html: shows the pair count with the 45 self-pairs");

// rule 1: no run of the ACF/AA quotes in anything the server or the browser receives
type BookFile = { chapters: { t: string }[][] };
const books = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as { slug: string }[];
function* blivre() {
  for (const b of books) {
    const f = JSON.parse(readFileSync(join(OUT.generated, "books", `${b.slug}.json`), "utf8")) as BookFile;
    for (const ch of f.chapters) for (const v of ch) yield v.t;
  }
}
const runs = protectedRuns(loadProtectedQuotes(SRC.natalVersesJson), blivre());
const shipped = [join(SITE, ".next/server"), join(SITE, ".next/static"), join(SITE, "public")].flatMap((d) => textFiles(d));
for (const f of shipped) {
  for (const leak of findLeaks(readFileSync(f, "utf8"), runs)) failures.push(`${relative(SITE, f)}: protected text ${leak}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `[check-dist] credits and lang in ${html.length} prerendered pages; home and /arcos numbers match summary.json; ` +
    `${shipped.length} shipped text files hold none of the ${new Set(runs.values()).size} protected quotes`,
);
