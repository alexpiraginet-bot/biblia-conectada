// Reports the JavaScript each prerendered page makes a modern browser download (gzip -9), excluding the
// `noModule` polyfills that only legacy browsers fetch. HANDOFF.md §5.6 sets the budget; see the measured baseline there.
//   npm run budget   (after npm run build)
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { SITE } from "./data/sources";

const appDir = join(SITE, ".next/server/app");
const pages = readdirSync(appDir).filter((f) => f.endsWith(".html"));
const rows = pages.map((page) => {
  const html = readFileSync(join(appDir, page), "utf8");
  const srcs = new Set(
    [...html.matchAll(/<script[^>]*src="(\/_next\/static\/[^"]+\.js)"[^>]*>/g)].filter((m) => !/noModule/i.test(m[0])).map((m) => m[1]),
  );
  let gz = 0;
  for (const s of srcs) gz += gzipSync(readFileSync(join(SITE, ".next", s.replace(/^\/_next\//, ""))), { level: 9 }).length;
  return { page, scripts: srcs.size, jsGzipKB: Math.round((gz / 1024) * 10) / 10, htmlGzipKB: Math.round((gzipSync(html).length / 1024) * 10) / 10 };
});
console.table(rows);
