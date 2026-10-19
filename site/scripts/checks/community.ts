// Post-build checks of the community pages (CLAUDE.md rule 3): every number and pair they show in the prerendered
// HTML is the pipeline's (src/data/generated/community/), and no bridge after the build day has a page.
import { existsSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { createGrid } from "../../src/lib/canon/grid";
import { formatInt } from "../../src/lib/canon/text";
import type { Book } from "../../src/lib/canon/types";
import { conexaoPath } from "../../src/lib/conexao";
import { PONTE_DAYS, formatDateBR, type PonteBuilt, type PonteCalendar } from "../../src/lib/community/ponte";
import { TRAIL_SLUG, type TrailFile } from "../../src/lib/community/trail";
import { OUT } from "../data/sources";

export function checkCommunity(ctx: { appDir: string; html: string[]; textOf: (raw: string) => string; failures: string[] }) {
  const { appDir, html, textOf, failures } = ctx;
  const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;
  const books = read<Book[]>(join(OUT.generated, "books.json"));
  const grid = createGrid(books);
  const ref = (gv: number) => {
    const l = grid.locate(gv);
    return `${l.book.name} ${l.chapter}:${l.verse}`;
  };
  const page = (rel: string) => {
    if (!html.includes(rel)) {
      failures.push(`${rel} was not prerendered`);
      return null;
    }
    const raw = readFileSync(join(appDir, rel), "utf8");
    return { raw, text: textOf(raw) };
  };
  const need = (rel: string, text: string, s: string) => {
    if (!text.includes(s)) failures.push(`${rel}: "${s}" missing`);
  };
  const device = "só neste aparelho";

  // ---- trail
  const trail = read<TrailFile>(join(OUT.generated, "community", `trilha-${TRAIL_SLUG}.json`));
  const index = page(join("trilha", `${trail.slug}.html`));
  if (index) {
    const last = trail.steps[trail.steps.length - 1];
    need("trail index", index.text, `${formatInt(trail.steps.length)} passos, um por dia de ${formatDateBR(trail.firstDate)} a ${formatDateBR(trail.lastDate)}`);
    need("trail index", index.text, `dos ${formatInt(trail.otBooksWithPairs)} que têm alguma ligação`);
    need("trail index", index.text, `${ref(last.ot.gv)} e ${ref(last.nt.gv)}, ${formatInt(last.votes)} votos`);
    need("trail index", index.text, device);
    for (const s of trail.steps) need("trail index", index.text, `${ref(s.ot.gv)} e ${ref(s.nt.gv)}${formatInt(s.votes)} votos`);
  }
  const stepPages = html.filter((f) => f.startsWith(join("trilha", trail.slug) + sep));
  if (stepPages.length !== trail.steps.length) failures.push(`trail: ${stepPages.length} step pages, expected ${trail.steps.length}`);
  for (const s of trail.steps) {
    const rel = join("trilha", trail.slug, `${s.step}.html`);
    const p = page(rel);
    if (!p) continue;
    const a = grid.locate(s.ot.gv);
    const b = grid.locate(s.nt.gv);
    need(rel, p.text, `${ref(s.ot.gv)} e ${ref(s.nt.gv)}`);
    need(rel, p.text, `${formatInt(s.votes)} votos de leitores na OpenBible.info`);
    need(rel, p.text, s.ot.text);
    need(rel, p.text, s.nt.text);
    need(rel, p.text, device);
    const both = conexaoPath({ book: a.book.index, slug: a.book.slug, chapter: a.chapter }, { book: b.book.index, slug: b.book.slug, chapter: b.chapter });
    if (!p.raw.includes(`href="${both}"`)) failures.push(`${rel}: no link to ${both}`);
  }

  // ---- Ponte nº N: pages up to the build day, none after it
  const built = read<PonteBuilt>(join(OUT.generated, "community", "ponte-built.json"));
  const calendar = read<PonteCalendar>(join(OUT.publicData, "ponte", "calendar.json"));
  const today = page("ponte.html");
  if (today) need("ponte.html", today.text, device);
  for (const b of built.bridges) {
    const rel = join("ponte", `${b.n}.html`);
    const p = page(rel);
    if (!p) continue;
    need(rel, p.text, `Ponte nº ${b.n}`);
    need(rel, p.text, `${ref(b.start)} → ${ref(b.target)}`);
    need(rel, p.text, `Mínimo: ${formatInt(b.min)} ${b.min === 1 ? "salto" : "saltos"}`);
    need(rel, p.text, b.texts[0]);
    need(rel, p.text, b.texts[1]);
    if (today) need("ponte.html", today.text, `nº ${b.n}`);
  }
  const ponteHtml = html.filter((f) => f.startsWith("ponte" + sep));
  if (ponteHtml.length !== Math.max(built.builtThrough, 0)) failures.push(`ponte: ${ponteHtml.length} pages, expected ${built.builtThrough}`);
  const shown = ["ponte.html", ...ponteHtml].filter((f) => existsSync(join(appDir, f))).map((f) => [f, textOf(readFileSync(join(appDir, f), "utf8"))]);
  for (let n = built.builtThrough + 1; n <= PONTE_DAYS; n++) {
    if (existsSync(join(appDir, "ponte", `${n}.html`))) failures.push(`ponte/${n}.html exists before its day`);
    const [s, t] = calendar.bridges[n - 1];
    const future = `${ref(s)} → ${ref(t)}`;
    for (const [f, text] of shown) if (text.includes(future)) failures.push(`${f}: shows bridge nº ${n} before its day`);
  }

  // ---- Mesa da semana
  const mesa = page("mesa.html");
  if (mesa) {
    need("mesa.html", mesa.text, "Mesa da semana");
    need("mesa.html", mesa.text, device);
  }
  return { trailSteps: stepPages.length, pontePages: ponteHtml.length };
}
