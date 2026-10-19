// Where `next build` leaves the prerendered HTML of each page. A plain build writes .next/server/app/<path>.html. On
// Vercel the deployment adapter (NEXT_ADAPTER_PATH, "Applying modifyConfig from Vercel" in the log) writes the same
// files to .next/server/route-cache/APP_PAGE/<hash>/$/<path>.html instead, and nothing to .next/server/app. The checks
// read pages by their path relative to the app, whichever layout the build used.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { textFiles } from "../data/leak-guard";

/** "isaias/9.html" → absolute file, for every prerendered page; framework pages ("_not-found") and the fallback
 *  shells of dynamic routes ("[livro].html") are left out */
export function prerenderedPages(site: string): Map<string, string> {
  const pages = new Map<string, string>();
  for (const root of htmlRoots(site)) {
    for (const file of textFiles(root)) {
      if (!file.endsWith(".html")) continue;
      const rel = relative(root, file);
      if (rel.split(sep).some((part) => part.startsWith("_") || part.includes("["))) continue;
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
