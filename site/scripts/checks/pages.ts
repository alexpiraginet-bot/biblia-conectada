// Where `next build` leaves the prerendered HTML of each page. A plain build writes .next/server/app/<path>.html. On
// Vercel the deployment adapter (NEXT_ADAPTER_PATH, "Applying modifyConfig from Vercel" in the log) writes the same
// files to .next/server/route-cache/APP_PAGE/<hash>/$/<path>.html instead, and nothing to .next/server/app. The checks
// read pages by their path relative to the app, whichever layout the build used.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { textFiles } from "../data/leak-guard";

/** "isaias/9.html" → absolute file, for every prerendered page; framework pages ("_not-found") and the fallback
 *  shells of dynamic routes ("[livro].html") are left out. Only routes the build prerendered count: `next start`
 *  caches the pages it renders later (a verse on its first visit, even a 404) in .next/server/route-cache too. */
export function prerenderedPages(site: string): Map<string, string> {
  const pages = new Map<string, string>();
  const built = builtRoutes(site);
  for (const root of htmlRoots(site)) {
    for (const file of textFiles(root)) {
      if (!file.endsWith(".html")) continue;
      const rel = relative(root, file);
      if (rel.split(sep).some((part) => part.startsWith("_") || part.includes("["))) continue;
      if (built && !built.has(rel === "index.html" ? "/" : `/${rel.replace(/\.html$/, "").split(sep).join("/")}`)) continue;
      if (!pages.has(rel)) pages.set(rel, file);
    }
  }
  if (pages.size === 0) throw new Error("no prerendered HTML in .next/server/app or .next/server/route-cache: run `next build` first");
  return pages;
}

/** The prerendered 404 page (src/app/not-found.tsx), or null when the build left none. */
export function notFoundPage(site: string): string | null {
  for (const root of htmlRoots(site)) {
    const file = join(root, "_not-found.html");
    if (existsSync(file)) return file;
  }
  return null;
}

/** The routes `next build` prerendered (.next/prerender-manifest.json, written in both layouts), or null without one. */
function builtRoutes(site: string): Set<string> | null {
  const file = join(site, ".next/prerender-manifest.json");
  if (!existsSync(file)) return null;
  const routes = (JSON.parse(readFileSync(file, "utf8")) as { routes?: Record<string, unknown> }).routes;
  return routes ? new Set(Object.keys(routes)) : null;
}

function htmlRoots(site: string): string[] {
  const roots: string[] = [];
  const app = join(site, ".next/server/app");
  if (existsSync(app)) roots.push(app);
  const cache = join(site, ".next/server/route-cache/APP_PAGE");
  if (existsSync(cache)) {
    for (const group of readdirSync(cache)) {
      const dollar = join(cache, group, "$");
      if (existsSync(dollar) && statSync(dollar).isDirectory()) roots.push(dollar);
    }
  }
  return roots;
}

/** The routes of the app ("/", "/sobre", "/[livro]/[cap]") from the page files under src/app; route groups and private
 *  folders are not part of a route. */
export function appRoutes(site: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name.startsWith("_")) continue;
        walk(p, /^\(.+\)$/.test(name) ? segments : [...segments, name]);
      } else if (/^page\.(tsx|ts|jsx|js)$/.test(name)) routes.push(`/${segments.join("/")}`);
    }
  };
  walk(join(site, "src/app"), []);
  return routes.sort();
}

/**
 * The route that rendered a prerendered page ("isaias/9.html" -> "/[livro]/[cap]", "index.html" -> "/"), or null:
 * same number of segments, every static segment equal, and, as in Next.js, a static segment wins over a dynamic one at
 * the first place where two candidates differ ("/salvos" before "/[livro]").
 */
export function routeOf(routes: readonly string[], page: string): string | null {
  const parts = page.replace(/\.html$/, "").split(sep);
  const path = parts.length === 1 && parts[0] === "index" ? [] : parts;
  const dynamic = (s: string) => s.startsWith("[");
  const fits = routes
    .map((r) => r.split("/").filter(Boolean))
    .filter((r) => r.length === path.length && r.every((s, i) => dynamic(s) || s === path[i]));
  fits.sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (dynamic(a[i]) !== dynamic(b[i])) return dynamic(a[i]) ? 1 : -1;
    return 0;
  });
  return fits.length ? `/${fits[0].join("/")}` : null;
}
