// Post-build checks: the credits are in the prerendered HTML of every page (CLAUDE.md rule 2), the numbers on
// the home page and on /dados are the ones the pipeline computed (rule 3) and no protected translation text reached
// the build (rule 1).
//   runs at the end of `npm run build`
import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { formatInt } from "../src/lib/canon/text";
import { formatBytes, type DadosManifest } from "../src/lib/dados";
import { checkCommunity } from "./checks/community";
import { findLeaks, loadProtectedQuotes, protectedRuns, textFiles } from "./data/leak-guard";
import { OUT, SITE, SRC } from "./data/sources";

const credits = JSON.parse(readFileSync(join(OUT.generated, "credits.json"), "utf8")) as { blivreCredit: string; openBibleCredit: string };
const appDir = join(SITE, ".next/server/app");
if (!existsSync(appDir)) throw new Error("no .next/server/app: run `next build` first");

// every prerendered page, at any depth; "_not-found" and the like are framework pages, and a "[param]" file is the
// fallback shell of a dynamic route, filled in at request time
const html = textFiles(appDir)
  .filter((f) => f.endsWith(".html"))
  .map((f) => relative(appDir, f))
  .filter((f) => !f.split(sep).some((part) => part.startsWith("_") || part.includes("[")));
const required = ["index.html", "sobre.html", "arcos.html", "ler.html", "dados.html", "isaias.html", join("isaias", "9.html"), join("isaias", "9", "6.html")];
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

// /dados (open data): every size, record count and total on the page is the bundle manifest's
const manifest = JSON.parse(readFileSync(join(OUT.publicDados, "v1", "manifest.json"), "utf8")) as DadosManifest;
const dadosRaw = readFileSync(join(appDir, "dados.html"), "utf8");
const dados = textOf(dadosRaw);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** inner HTML of the element carrying the attribute `attr` (a leaf of the download list) */
const element = (attr: string) => new RegExp(`<(\\w+)[^>]*\\s${escapeRe(attr)}[^>]*>([\\s\\S]*?)</\\1>`).exec(dadosRaw)?.[2];
const sized = (bytes: number) => `<data value="${bytes}">${formatBytes(bytes)}</data>`;
for (const f of manifest.arquivos) {
  const inner = element(`data-file="${f.caminho}"`);
  if (inner === undefined) {
    failures.push(`dados.html: ${f.caminho} is not listed`);
    continue;
  }
  if (!inner.includes(`href="${manifest.base}${f.caminho}"`)) failures.push(`dados.html: no link to ${f.caminho}`);
  if (!inner.includes(sized(f.bytes))) failures.push(`dados.html: ${f.caminho} does not show ${f.bytes} bytes as ${formatBytes(f.bytes)}`);
  if (f.registros !== undefined && !textOf(inner).includes(`${formatInt(f.registros)} ${f.unidade}`)) {
    failures.push(`dados.html: ${f.caminho} does not show ${formatInt(f.registros)} ${f.unidade}`);
  }
}
const texts = manifest.arquivos.filter((f) => f.caminho.startsWith("texto/"));
const textGroup = element(`data-group="texto"`) ?? "";
const textBytes = texts.reduce((s, f) => s + f.bytes, 0);
const textVerses = texts.reduce((s, f) => s + (f.registros ?? 0), 0);
if (!textGroup.includes(sized(textBytes)) || !textOf(textGroup).includes(`${formatInt(textVerses)} versículos`)) {
  failures.push(`dados.html: texto/ does not show ${formatBytes(textBytes)} and ${formatInt(textVerses)} versículos`);
}
const c = manifest.contagens;
const dadosNumbers = [
  `${formatInt(c.paresLigados)} pares de versículos ligados`,
  `grafo dos ${formatInt(c.capitulos)} capítulos`,
  `Versão ${manifest.versao}.`,
  `${formatInt(c.livros)} livros, ${formatInt(c.capitulos)} capítulos e ${formatInt(c.versiculos)} versículos`,
  `as ${formatInt(c.linhasOpenBible)} linhas da OpenBible.info formam ${formatInt(c.paresUnicos)} pares únicos; ${formatInt(c.autoPares)} ligam`,
  `Sobram ${formatInt(c.paresLigados)} pares de versículos diferentes`,
  `vão de ${formatInt(c.votosMin)} a ${formatInt(c.votosMax)}`,
  `um arquivo por livro (${formatInt(texts.length)} arquivos)`,
  `Ver os ${formatInt(texts.length)} arquivos`,
  `grade de ${formatInt(c.livros)} por ${formatInt(c.livros)}`,
  `versão ${manifest.versao}`,
];
for (const s of dadosNumbers) if (!dados.includes(s)) failures.push(`dados.html: "${s}" missing`);
if (!dados.includes(credits.openBibleCredit)) failures.push("dados.html: OpenBible.info credit line missing");

// community pages (trail, Ponte, Mesa): pairs, votes and dates are the pipeline's; no bridge before its day
const community = checkCommunity({ appDir, html, textOf, failures });

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
    `/dados shows the size and count of the ${manifest.arquivos.length} files of the open data manifest; ` +
    `trail (${community.trailSteps} steps) and Ponte (${community.pontePages} pages) match the community data; ` +
    `${shipped.length} shipped text files hold none of the ${new Set(runs.values()).size} protected quotes`,
);
