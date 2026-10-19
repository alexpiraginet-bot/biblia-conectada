// check-dist for the Linha do tempo, Temas, Palavras and the reception pilot: the new credits are on /sobre, and the
// numbers the prerendered pages show are the generated data's (CLAUDE.md rules 2 and 3).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatInt } from "../../src/lib/canon/text";
import { containsWord } from "../../src/lib/words";
import { OUT } from "../data/sources";

type Ev = { id: number; slug: string; ref: string; year: number; titleEn: string; links: { pairs: number; partners: number }; places: { name: string }[] };
type Theme = { slug: string; key: string; label: string; passages: unknown[]; links: unknown[] };

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

  // rule 2: the credits of the new sources, exactly as ATTRIBUTION.md has them, on /sobre
  const sobre = textOf(page("sobre.html") ?? "");
  for (const s of [
    temas.credit,
    "Dados de obras: Wikidata (CC0)",
    "Eventos e datas: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones",
  ]) if (!sobre.includes(s)) failures.push(`sobre.html: "${s}" missing`);

  // /linha-do-tempo: the counts, and one link per event in sortKey order
  const indexRaw = page("linha-do-tempo.html") ?? "";
  const index = textOf(indexRaw);
  for (const s of [
    `${formatInt(tl.events.length)} eventos do Theographic`,
    `Juntos cobrem ${formatInt(tl.coveredVerses)} dos ${formatInt(summary.counts.verses)} versículos`,
    `Eventos ${formatInt(tl.events.length)} eventos`,
  ]) if (!index.includes(s)) failures.push(`linha-do-tempo.html: "${s}" missing`);
  const list = /<ol[^>]*aria-labelledby="eventos"[^>]*>([\s\S]*?)<\/ol>/.exec(indexRaw)?.[1] ?? "";
  const listed = [...list.matchAll(/href="\/linha-do-tempo\/([^"]+)"/g)].map((m) => m[1]);
  if (JSON.stringify(listed) !== JSON.stringify(tl.events.map((e) => e.slug))) failures.push("linha-do-tempo.html: the events are not all listed in sortKey order");
  if ((list.match(/<li[\s>]/g) ?? []).length !== tl.events.length) failures.push("linha-do-tempo.html: the list does not have one item per event");

  // every event page: the Portuguese reference as h1, the link count, and the Good Samaritan's places and works
  for (const e of tl.events) {
    const raw = page(join("linha-do-tempo", `${e.slug}.html`));
    if (!raw) continue;
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(raw)?.[1];
    if (!h1 || textOf(h1) !== e.ref) failures.push(`linha-do-tempo/${e.slug}.html: h1 is not "${e.ref}"`);
    const text = textOf(raw);
    if (!text.includes(`${formatInt(e.links.pairs)} ligações tocam o trecho; ${formatInt(e.links.partners)} versículos de fora`)) {
      failures.push(`linha-do-tempo/${e.slug}.html: link counts missing`);
    }
    if (!text.includes(e.titleEn)) failures.push(`linha-do-tempo/${e.slug}.html: original title missing`);
    for (const p of e.places) if (!text.includes(p.name)) failures.push(`linha-do-tempo/${e.slug}.html: place ${p.name} missing`);
    const pilot = rec.pilots.find((p) => p.event === e.id);
    if (pilot && !text.includes(`${formatInt(pilot.works.length)} pinturas no Wikidata`)) failures.push(`linha-do-tempo/${e.slug}.html: pilot count missing`);
    // each checked image with its credit: "‹título›, ‹autor›, ‹data› · imagem: Wikimedia Commons, ‹arquivo›, domínio público"
    for (const w of pilot?.works ?? []) {
      if (!w.image) continue;
      if (!raw.includes(`src="${w.image.src}"`)) failures.push(`linha-do-tempo/${e.slug}.html: image ${w.image.src} missing`);
      if (!text.includes(`imagem: Wikimedia Commons, ${w.image.file}, domínio público`)) failures.push(`linha-do-tempo/${e.slug}.html: credit of ${w.image.file} missing`);
    }
  }

  // /tema and each theme page
  const tema = textOf(page("tema.html") ?? "");
  const passages = temas.themes.reduce((n, t) => n + t.passages.length, 0);
  for (const s of [`${formatInt(temas.themes.length)} temas, com ${formatInt(passages)} passagens`, `os ${formatInt(temas.topicsInSource)} tópicos`]) {
    if (!tema.includes(s)) failures.push(`tema.html: "${s}" missing`);
  }
  for (const t of temas.themes) {
    const raw = page(join("tema", `${t.slug}.html`));
    if (!raw) continue;
    const text = textOf(raw);
    if (!text.includes(`${formatInt(t.passages.length)} passagens do tópico`)) failures.push(`tema/${t.slug}.html: passage count missing`);
    if (!text.includes(`Ligações entre as passagens ${formatInt(t.links.length)} ligações`)) failures.push(`tema/${t.slug}.html: link count missing`);
  }

  // /palavra/<theme word>: the verse count, recounted from the book files
  const books = read<{ slug: string }[]>("books.json");
  const verses: string[] = [];
  for (const b of books) for (const ch of read<{ chapters: { t: string }[][] }>(join("books", `${b.slug}.json`)).chapters) for (const v of ch) verses.push(v.t);
  for (const t of temas.themes) {
    const raw = page(join("palavra", `${t.key}.html`));
    if (!raw) continue;
    const n = verses.filter((v) => containsWord(v, t.key)).length;
    if (!textOf(raw).includes(`aparece em ${formatInt(n)} ${n === 1 ? "versículo" : "versículos"} da Bíblia Livre`)) {
      failures.push(`palavra/${t.key}.html: does not show ${n} verses`);
    }
  }
  return { events: tl.events.length, themes: temas.themes.length };
}
