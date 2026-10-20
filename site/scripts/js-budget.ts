// Reports the initial JavaScript declared in each prerendered page's HTML (gzip -9), excluding the
// `noModule` polyfills that only legacy browsers fetch, grouped by the route that renders the page ("/salvos",
// "/explorar/[livro]/[cap]"; the reading routes keep their names: livro, capítulo, versículo). HANDOFF.md §5.6 has the
// measured baseline and the initial budget (≤ 165 KiB); any page over it makes this command fail.
// Dynamically imported chunks are not included: report their extra cost and combined total separately.
// Pages are read wherever the build put them (plain or Vercel adapter layout, scripts/checks/pages.ts).
//   npm run budget   (after npm run build)
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { appRoutes, prerenderedPages, routeOf } from "./checks/pages";
import { SITE } from "./data/sources";

const BUDGET_BYTES = 165 * 1024;
const pages = prerenderedPages(SITE);
const routes = appRoutes(SITE);
const NAMES: Record<string, string> = { "/": "index", "/[livro]": "livro", "/[livro]/[cap]": "capítulo", "/[livro]/[cap]/[vers]": "versículo" };
const kind = (page: string) => {
  const route = routeOf(routes, page);
  if (!route) throw new Error(`[budget] no route in src/app renders ${page}`);
  return NAMES[route] ?? route.slice(1);
};

const gzCache = new Map<string, number>();
const groups = new Map<string, { pages: number; jsMax: number; jsMaxPage: string; htmlMax: number; htmlMaxPage: string }>();
for (const [page, file] of pages) {
  const html = readFileSync(file, "utf8");
  const srcs = new Set(
    [...html.matchAll(/<script[^>]*src="(\/_next\/static\/[^"?]+\.js)(?:\?[^"]*)?"[^>]*>/g)].filter((m) => !/noModule/i.test(m[0])).map((m) => m[1]),
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
  [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, g]) => ({
      kind: k,
      pages: g.pages,
      jsGzipBytes: g.jsMax,
      jsGzipKB: kb(g.jsMax),
      overBudget: g.jsMax > BUDGET_BYTES ? "SIM" : "",
      htmlGzipMaxKB: kb(g.htmlMax),
      largestHtml: g.htmlMaxPage,
    })),
);
if ([...groups.values()].some((g) => g.jsMax > BUDGET_BYTES)) process.exitCode = 1;
