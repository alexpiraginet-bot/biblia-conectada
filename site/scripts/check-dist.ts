// Post-build check (CLAUDE.md rule 2): the credits are in the prerendered HTML of every page.
//   runs at the end of `npm run build`
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OUT, SITE } from "./data/sources";

const credits = JSON.parse(readFileSync(join(OUT.generated, "credits.json"), "utf8")) as { blivreCredit: string };
const appDir = join(SITE, ".next/server/app");
if (!existsSync(appDir)) throw new Error("no .next/server/app: run `next build` first");

const html = readdirSync(appDir).filter((f) => f.endsWith(".html") && !f.startsWith("_"));
const required = ["index.html", "sobre.html"];
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
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`[check-dist] credits present in ${html.length} prerendered pages: ${html.join(", ")}`);
