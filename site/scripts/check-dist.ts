// Post-build checks: the credits are in the prerendered HTML of every page (CLAUDE.md rule 2), the numbers on
// the home page and on /dados are the ones the pipeline computed (rule 3) and no protected translation text reached
// the build (rule 1).
//   runs at the end of `npm run build`
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { formatInt } from "../src/lib/canon/text";
import { formatBytes, type DadosManifest } from "../src/lib/dados";
import { checkCommunity } from "./checks/community";
import { checkExplore } from "./checks/explore";
import { notFoundPage, prerenderedPages } from "./checks/pages";
import { checkReading } from "./checks/reading";
import { checkTimeline } from "./checks/timeline";
import { findLeaks, loadProtectedQuotes, protectedRuns, textFiles } from "./data/leak-guard";
import { OUT, SITE, SRC } from "./data/sources";

const credits = JSON.parse(readFileSync(join(OUT.generated, "credits.json"), "utf8")) as { blivreCredit: string; openBibleCredit: string };
// every prerendered page, at any depth, wherever the build put it (scripts/checks/pages.ts)
const pages = prerenderedPages(SITE);
const page = (rel: string) => readFileSync(pages.get(rel) ?? join(SITE, ".next/server/app", rel), "utf8");
const html = [...pages.keys()];
const required = ["index.html", "sobre.html", "arcos.html", "ler.html", "dados.html", "isaias.html", join("isaias", "9.html"), join("isaias", "9", "6.html")];
for (const r of required) if (!html.includes(r)) throw new Error(`[check-dist] ${r} was not prerendered`);

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/<!-- -->/g, "");
/** visible text, so a credit with a link inside it still reads as one string */
const textOf = (s: string) => decode(s).replace(/<[^>]*>/g, "");
const failures: string[] = [];
for (const f of html) {
  const raw = page(f);
  const text = textOf(raw);
  if (!text.includes(credits.blivreCredit)) failures.push(`${f}: BLIVRE credit missing`);
  if (!text.includes("Referências cruzadas: OpenBible.info")) failures.push(`${f}: OpenBible.info credit missing`);
  // the attribute order on <html> is not fixed: on Vercel, Next.js puts data-dpl-id (skew protection) before lang
  if (!/<html\b[^>]*\slang="pt-BR"/.test(raw)) failures.push(`${f}: lang="pt-BR" missing`);
}
// the 404 page (src/app/not-found.tsx) carries the credits too, in Portuguese, not the framework's English default
const missing = notFoundPage(SITE);
if (!missing) failures.push("_not-found.html was not prerendered");
else {
  const raw = readFileSync(missing, "utf8");
  const text = textOf(raw);
  if (!text.includes(credits.blivreCredit)) failures.push("_not-found.html: BLIVRE credit missing");
  if (!text.includes("Esta página não existe")) failures.push("_not-found.html: the site's 404 page is not the one built");
  if (!/<html\b[^>]*\slang="pt-BR"/.test(raw)) failures.push(`_not-found.html: lang="pt-BR" missing`);
}
const sobre = textOf(page("sobre.html"));
for (const s of ["Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc.", "Theographic Bible Metadata, Viz.Bible", "OpenBible.info"]) {
  if (!sobre.includes(s)) failures.push(`sobre.html: "${s}" missing`);
}
// rule 3: the numbers on the home page are the pipeline's numbers, rendered with pt-BR grouping
type Summary = { counts: Record<string, number>; topVerses: { ref: string; links: number }[] };
const summary = JSON.parse(readFileSync(join(OUT.generated, "summary.json"), "utf8")) as Summary;
const home = textOf(page("index.html"));
const homeNumbers = [
  `${formatInt(summary.counts.verses)} versículos`,
  `${formatInt(summary.counts.crossrefRows)} referências cruzadas`,
  `${formatInt(summary.counts.arcs)} pares de versículos diferentes`,
  `${summary.topVerses[0].ref}, com ${formatInt(summary.topVerses[0].links)}`,
];
for (const s of homeNumbers) if (!home.includes(s)) failures.push(`index.html: "${s}" missing`);
if (home.includes(formatInt(summary.counts.pairs))) failures.push("index.html: shows the pair count with the 45 self-pairs");
// /arcos (the sky of links) states the same numbers in its first screen, from the same pipeline
const arcos = textOf(page("arcos.html"));
for (const s of homeNumbers) if (!arcos.includes(s)) failures.push(`arcos.html: "${s}" missing`);
if (arcos.includes(formatInt(summary.counts.pairs))) failures.push("arcos.html: shows the pair count with the 45 self-pairs");

// /dados (open data): every size, record count and total on the page is the bundle manifest's
const manifest = JSON.parse(readFileSync(join(OUT.publicDados, "v1", "manifest.json"), "utf8")) as DadosManifest;
const dadosRaw = page("dados.html");
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

// linha do tempo, temas, palavras, recepção: credits on /sobre and the numbers of those pages (scripts/checks/timeline.ts)
const timeline = checkTimeline({ html, page, textOf, failures });

// Explorar (home and /explorar/isaias/9) and its /conexao page: numbers from the explore data (scripts/checks/explore.ts)
const explore = checkExplore((rel) => (pages.has(rel) ? page(rel) : null), textOf);
failures.push(...explore.failures);

// community pages (trail, Ponte, Mesa): pairs, votes and dates are the pipeline's; no bridge before its day
const community = checkCommunity({ html, page, textOf, failures });

// reading pages (rail, panel headline and links) and /salvos: numbers from the book files (scripts/checks/reading.ts)
const reading = checkReading({ html, page, textOf, failures });

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
// .next/output is what the Vercel adapter deploys (Build Output API); it exists only in builds made there
const shipped = [join(SITE, ".next/server"), join(SITE, ".next/static"), join(SITE, ".next/output"), join(SITE, "public")]
  .filter((d) => existsSync(d))
  .flatMap((d) => textFiles(d));
for (const f of shipped) {
  for (const leak of findLeaks(readFileSync(f, "utf8"), runs)) failures.push(`${relative(SITE, f)}: protected text ${leak}`);
}

// the medallion manifest stays on the server (src/lib/medalhoes.ts is server-only): none of its provenance (model,
// prompts) may reach a browser bundle; pages get only the image paths
type MedalManifest = { groups: Record<string, { model: string; prompt: string }> };
const medalManifest = JSON.parse(readFileSync(join(SITE, "src/data/medalhoes.json"), "utf8")) as MedalManifest;
const provenance = [...new Set(Object.values(medalManifest.groups).flatMap((g) => [g.model, g.prompt.slice(0, 60)]))];
const browserFiles = textFiles(join(SITE, ".next/static"));
for (const f of browserFiles) {
  const text = readFileSync(f, "utf8");
  if (provenance.some((p) => text.includes(p))) failures.push(`${relative(SITE, f)}: medallion manifest in a browser bundle`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `[check-dist] credits and lang in ${html.length} prerendered pages and the 404 page; home and /arcos numbers match summary.json; ` +
    `/dados shows the size and count of the ${manifest.arquivos.length} files of the open data manifest; ` +
    `linha do tempo (${timeline.events} events), ${timeline.themes} themes and their words match the generated data; ` +
    `Explorar and /conexao show the explore data (${explore.checked} rows checked); ` +
    `trail (${community.trailSteps} steps) and Ponte (${community.pontePages} pages) match the community data; ` +
    `${reading}; ` +
    `${shipped.length} shipped text files hold none of the ${new Set(runs.values()).size} protected quotes; ` +
    `${browserFiles.length} browser files hold no medallion provenance`,
);
