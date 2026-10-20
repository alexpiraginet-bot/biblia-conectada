// check-dist for the Linha do tempo, Temas, Palavras and the reception pilot: the new credits are on /sobre, and the
// numbers and lists the prerendered pages show are the generated data's, counted again here from the book files with
// the same pure functions the pages use (CLAUDE.md rules 2 and 3).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createGrid } from "../../src/lib/canon/grid";
import { formatInt } from "../../src/lib/canon/text";
import type { Book } from "../../src/lib/canon/types";
import { conexaoPath } from "../../src/lib/conexao";
import { yearLabel } from "../../src/lib/eras";
import { ARCS_SHOWN, crossArcs, eventLinks, rankPassages, relatedOf, RELATED_SHOWN, sharedWords, WORDS_SHOWN } from "../../src/lib/timeline-graph";
import { PERIODS, splitPeriods } from "../../src/lib/timeline-periods";
import { containsWord } from "../../src/lib/words";
import { OUT } from "../data/sources";

type Ev = {
  id: number;
  slug: string;
  ref: string;
  year: number;
  titleEn: string;
  verses: number[];
  links: { pairs: number; partners: number };
  top: unknown[];
  places: { name: string }[];
};
type Theme = { slug: string; key: string; label: string; passages: { osis: string; from: number; to: number; score: number }[]; links: unknown[] };
type VerseLink = [number, number, number];

const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;
/** the inside of the first <section> labelled by `id` (the pages' sections do not nest) */
const section = (raw: string, id: string) => new RegExp(`<section[^>]*aria-labelledby="${id}"[^>]*>([\\s\\S]*?)</section>`).exec(raw)?.[1] ?? "";
const hrefs = (html: string, prefix: string) => [...html.matchAll(new RegExp(`href="(${prefix}[^"]*)"`, "g"))].map((m) => m[1]);

/** `html`: prerendered pages by path relative to the app ("tema/luz.html"); `page` reads one, in either build layout
 *  (scripts/checks/pages.ts) */
export function checkTimeline(ctx: { html: readonly string[]; page: (rel: string) => string; textOf: (html: string) => string; failures: string[] }) {
  const { textOf, failures } = ctx;
  const built = new Set(ctx.html);
  const read = <T>(rel: string) => JSON.parse(readFileSync(join(OUT.generated, rel), "utf8")) as T;
  const page = (rel: string) => {
    if (!built.has(rel)) {
      failures.push(`${rel} was not prerendered`);
      return null;
    }
    return ctx.page(rel);
  };
  const tl = read<{ coveredVerses: number; events: Ev[] }>("linha-do-tempo/events.json");
  const temas = read<{ credit: string; topicsInSource: number; themes: Theme[] }>("temas.json");
  const rec = read<{ pilots: { event: number; works: { image: { src: string; file: string } | null }[] }[] }>("recepcao.json");
  const summary = read<{ counts: { verses: number } }>("summary.json");
  const books = read<Book[]>("books.json");
  const grid = createGrid(books);
  const text: string[] = [];
  const links: VerseLink[][] = [];
  for (const b of books) {
    for (const ch of read<{ chapters: { t: string; l: VerseLink[] }[][] }>(join("books", `${b.slug}.json`)).chapters) {
      for (const v of ch) {
        text.push(v.t);
        links.push(v.l);
      }
    }
  }
  const side = (gv: number) => {
    const { book, chapter, verse } = grid.locate(gv);
    return { book: book.index, slug: book.slug, chapter, verse };
  };
  const versePath = (gv: number) => {
    const { book, chapter, verse } = grid.locate(gv);
    return `/${book.slug}/${chapter}/${verse}`;
  };

  // rule 2: the credits of the new sources, exactly as ATTRIBUTION.md has them, on /sobre
  const sobre = textOf(page("sobre.html") ?? "");
  for (const s of [
    temas.credit,
    "Dados de obras: Wikidata (CC0)",
    "Eventos e datas: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones",
  ]) if (!sobre.includes(s)) failures.push(`sobre.html: "${s}" missing`);

  // /linha-do-tempo: the counts; every event once, in sortKey order, in its period; the arcs of the sky in text
  const periods = splitPeriods(tl.events);
  const indexRaw = page("linha-do-tempo.html") ?? "";
  const index = textOf(indexRaw);
  const arcs = crossArcs(tl.events, links, ARCS_SHOWN);
  for (const s of [
    `${formatInt(tl.events.length)} eventos do Theographic`,
    `Juntos cobrem ${formatInt(tl.coveredVerses)} dos ${formatInt(summary.counts.verses)} versículos`,
    `Todos os ${formatInt(tl.events.length)} eventos, em ${formatInt(PERIODS.length)} períodos.`,
    `as ${formatInt(arcs.length)} ligações mais votadas entre versículos de eventos diferentes`,
  ]) if (!index.includes(s)) failures.push(`linha-do-tempo.html: "${s}" missing`);
  const rows = [...indexRaw.matchAll(/<li[^>]*data-event="(\d+)"[^>]*>([\s\S]*?)<\/li>/g)];
  if (JSON.stringify(rows.map((m) => Number(m[1]))) !== JSON.stringify(tl.events.map((e) => e.id))) {
    failures.push("linha-do-tempo.html: the events are not all listed once, in sortKey order");
  }
  for (const [k, m] of rows.entries()) {
    const e = tl.events[k];
    if (e && !m[2].includes(`href="/linha-do-tempo/${e.slug}"`)) failures.push(`linha-do-tempo.html: the row of event ${e.id} does not open its page`);
  }
  const sections = [...indexRaw.matchAll(/<section[^>]*data-period="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  if (JSON.stringify(sections.map((m) => m[1])) !== JSON.stringify(PERIODS.map((p) => p.id))) failures.push("linha-do-tempo.html: the periods are not the ten of the site, in order");
  for (const p of periods) {
    const html = sections.find((m) => m[1] === p.id)?.[2] ?? "";
    const ids = [...html.matchAll(/data-event="(\d+)"/g)].map((m) => Number(m[1]));
    if (JSON.stringify(ids) !== JSON.stringify(p.events.map((e) => e.id))) failures.push(`linha-do-tempo.html: period ${p.id} does not hold its events`);
    const span = p.first === p.last ? `em ${yearLabel(p.first)}` : `de ${yearLabel(p.first)} a ${yearLabel(p.last)}`;
    if (!textOf(html).includes(`${plural(p.events.length, "evento", "eventos")}, ${span}`)) failures.push(`linha-do-tempo.html: period ${p.id} count or span missing`);
    if (!indexRaw.includes(`value="${p.id}"`)) failures.push(`linha-do-tempo.html: no filter for period ${p.id}`);
  }
  const details = /<details[^>]*>([\s\S]*?)<\/details>/.exec(indexRaw)?.[1] ?? "";
  if (JSON.stringify(hrefs(details, "/conexao/")) !== JSON.stringify(arcs.map((a) => conexaoPath(side(a.a), side(a.b))))) {
    failures.push("linha-do-tempo.html: the list of the sky's arcs is not the most voted links between events");
  }

  // every event page: the Portuguese reference as h1, the link counts and rows, the linked events, the places, and the
  // Good Samaritan's works
  const byEvent = eventLinks(tl.events, links);
  for (const [i, e] of tl.events.entries()) {
    const raw = page(join("linha-do-tempo", `${e.slug}.html`));
    if (!raw) continue;
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(raw)?.[1];
    if (!h1 || textOf(h1) !== e.ref) failures.push(`linha-do-tempo/${e.slug}.html: h1 is not "${e.ref}"`);
    const pageText = textOf(raw);
    if (!pageText.includes(`${formatInt(e.links.pairs)} ligações tocam o trecho; ${formatInt(e.links.partners)} versículos de fora`)) {
      failures.push(`linha-do-tempo/${e.slug}.html: link counts missing`);
    }
    if ((raw.match(/class="bc-conn"/g) ?? []).length !== e.top.length) failures.push(`linha-do-tempo/${e.slug}.html: not one row per strongest link`);
    if (!pageText.includes(e.titleEn)) failures.push(`linha-do-tempo/${e.slug}.html: original title missing`);
    for (const p of e.places) if (!pageText.includes(p.name)) failures.push(`linha-do-tempo/${e.slug}.html: place ${p.name} missing`);
    const related = relatedOf(byEvent[i], tl.events, RELATED_SHOWN).map((l) => `/linha-do-tempo/${tl.events[l.event].slug}`);
    if (JSON.stringify(hrefs(section(raw, "eventos-ligados"), "/linha-do-tempo/")) !== JSON.stringify(related)) {
      failures.push(`linha-do-tempo/${e.slug}.html: the linked events are not the most linked ones`);
    }
    const pilot = rec.pilots.find((p) => p.event === e.id);
    if (pilot && !pageText.includes(`${formatInt(pilot.works.length)} pinturas no Wikidata`)) failures.push(`linha-do-tempo/${e.slug}.html: pilot count missing`);
    // each checked image with its credit: "‹título›, ‹autor›, ‹data› · imagem: Wikimedia Commons, ‹arquivo›, domínio público"
    for (const w of pilot?.works ?? []) {
      if (!w.image) continue;
      if (!raw.includes(`src="${w.image.src}"`)) failures.push(`linha-do-tempo/${e.slug}.html: image ${w.image.src} missing`);
      if (!pageText.includes(`imagem: Wikimedia Commons, ${w.image.file}, domínio público`)) failures.push(`linha-do-tempo/${e.slug}.html: credit of ${w.image.file} missing`);
    }
  }

  // /tema and each theme page: the counts, the passages most linked first, the words its passages share
  const tema = textOf(page("tema.html") ?? "");
  const passages = temas.themes.reduce((n, t) => n + t.passages.length, 0);
  for (const s of [`${formatInt(temas.themes.length)} temas, com ${formatInt(passages)} passagens`, `os ${formatInt(temas.topicsInSource)} tópicos`]) {
    if (!tema.includes(s)) failures.push(`tema.html: "${s}" missing`);
  }
  for (const t of temas.themes) {
    const raw = page(join("tema", `${t.slug}.html`));
    if (!raw) continue;
    const pageText = textOf(raw);
    if (!pageText.includes(`${formatInt(t.passages.length)} passagens do tópico`)) failures.push(`tema/${t.slug}.html: passage count missing`);
    if (!pageText.includes(`Ligações entre as passagens ${plural(t.links.length, "ligação", "ligações")}`)) failures.push(`tema/${t.slug}.html: link count missing`);
    const ranked = rankPassages(t.passages, links);
    const rowsHtml = section(raw, "passagens");
    const listed = [...rowsHtml.matchAll(/<a[^>]*class="bc-conn__ref"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*class="bc-conn__ref"/g)].map((m) => m[1] ?? m[2]);
    if (JSON.stringify(listed) !== JSON.stringify(ranked.map((p) => versePath(p.from)))) failures.push(`tema/${t.slug}.html: the passages are not all listed, most linked first`);
    for (const p of ranked) if (!textOf(rowsHtml).includes(plural(p.pairs, "ligação", "ligações"))) failures.push(`tema/${t.slug}.html: links of ${p.osis} missing`);
    const words = sharedWords(t.passages, text, WORDS_SHOWN, t.key).map((w) => `/palavra/${w.key}`);
    if (JSON.stringify(hrefs(section(raw, "palavras"), "/palavra/")) !== JSON.stringify(words)) failures.push(`tema/${t.slug}.html: the shared words are not the theme's`);
  }

  // /palavra/<theme word>: the verse count, recounted from the book files
  for (const t of temas.themes) {
    const raw = page(join("palavra", `${t.key}.html`));
    if (!raw) continue;
    const n = text.filter((v) => containsWord(v, t.key)).length;
    if (!textOf(raw).includes(`aparece em ${plural(n, "versículo", "versículos")} da Bíblia Livre`)) {
      failures.push(`palavra/${t.key}.html: does not show ${n} verses`);
    }
  }
  return { events: tl.events.length, themes: temas.themes.length };
}
