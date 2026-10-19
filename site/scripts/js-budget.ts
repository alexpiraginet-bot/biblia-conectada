// Reports the JavaScript each prerendered page makes a modern browser download (gzip -9), excluding the
// `noModule` polyfills that only legacy browsers fetch, grouped by kind of page. HANDOFF.md §5.6 has the measured
// baseline and the proposed budget (total ≤ 165 KiB); pages over it are flagged, the build does not fail on it yet.
//   npm run budget   (after npm run build)
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, relative, sep } from "node:path";
import { textFiles } from "./data/leak-guard";
import { SITE } from "./data/sources";

const BUDGET_KB = 165;
const appDir = join(SITE, ".next/server/app");
const pages = textFiles(appDir)
  .filter((f) => f.endsWith(".html"))
  .map((f) => relative(appDir, f))
  .filter((f) => !f.split(sep).some((part) => part.startsWith("_") || part.includes("[")));

// sections with an index page and detail pages of their own (not books, chapters or verses)
const SECTIONS = ["linha-do-tempo", "tema", "palavra"];
const kind = (page: string) => {
  const top = page.split(sep)[0].replace(/\.html$/, "");
  if (SECTIONS.includes(top)) return page.includes(sep) ? `${top}/[…]` : top;
  if (top === "explorar" || top === "conexao") return top;
  const depth = page.split(sep).length;
  if (depth === 3) return "versículo";
  if (depth === 2) return "capítulo";
  return ["index.html", "sobre.html", "ler.html", "arcos.html", "dados.html"].includes(page) ? page.replace(".html", "") : "livro";
};

const gzCache = new Map<string, number>();
const groups = new Map<string, { pages: number; jsMax: number; jsMaxPage: string; htmlMax: number; htmlMaxPage: string }>();
for (const page of pages) {
  const html = readFileSync(join(appDir, page), "utf8");
  const srcs = new Set(
    [...html.matchAll(/<script[^>]*src="(\/_next\/static\/[^"]+\.js)"[^>]*>/g)].filter((m) => !/noModule/i.test(m[0])).map((m) => m[1]),
  );
  let js = 0;
  for (const s of srcs) {
    if (!gzCache.has(s)) gzCache.set(s, gzipSync(readFileSync(join(SITE, ".next", s.replace(/^\/_next\//, ""))), { level: 9 }).length);
    js += gzCache.get(s)!;
  }
  const htmlGz = gzipSync(html, { level: 9 }).length;
  const k = kind(page);
  const g = groups.get(k) ?? { pages: 0, jsMax: 0, jsMaxPage: "", htmlMax: 0, htmlMaxPage: "" };
  g.pages++;
  if (js > g.jsMax) Object.assign(g, { jsMax: js, jsMaxPage: page });
  if (htmlGz > g.htmlMax) Object.assign(g, { htmlMax: htmlGz, htmlMaxPage: page });
  groups.set(k, g);
}
const kb = (n: number) => Math.round((n / 1024) * 10) / 10;
console.table(
  [...groups].map(([k, g]) => ({
    kind: k,
    pages: g.pages,
    jsGzipKB: kb(g.jsMax),
    overBudget: kb(g.jsMax) > BUDGET_KB ? "SIM" : "",
    htmlGzipMaxKB: kb(g.htmlMax),
    largestHtml: g.htmlMaxPage,
  })),
);
