// Post-build check of the Explorar (called by scripts/check-dist.ts): the numbers the capa, /explorar/isaias/9 and its
// connection page show (linked chapters, each group's counts and its most voted chapters, the selected connection, its
// strongest pair and verses) and the /conexao page of that connection are recounted here from the verse links of the
// reading files and the medallion manifest, by another path than the pages' (CLAUDE.md rule 3).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../../src/lib/canon/types";
import { EXPLORE_HOME, EXPLORE_HOME_PATH } from "../../src/lib/explore/home";
import { pairsText, partnersText, votesText } from "../../src/lib/explore/text";
import { OUT, SITE } from "../data/sources";

type BookFile = { chapters: { t: string; l: [number, number, number][] }[][] };
type Medals = { groups: Record<string, { src96: string; category: string; label: string }>; bookGroup: Record<string, string> };
type Partner = { ci: number; pairs: number; votes: number };
/** the groups of the map, in canon order, and how many chapters the list names under each */
const GROUPS = ["pentateuco", "historicos", "poesia", "profetas", "evangelhos", "atos", "cartas", "apocalipse"];
const PER_GROUP = 3;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const somados = (v: number) => `${votesText(v)} ${Math.abs(v) === 1 ? "somado" : "somados"}`;

/** `read` returns the prerendered HTML of a page by its path relative to the app ("explorar/isaias/9.html"), or null. */
export function checkExplore(read: (rel: string) => string | null, textOf: (html: string) => string): { failures: string[]; checked: number } {
  const failures: string[] = [];
  let checked = 0;
  const books = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as Book[];
  const medals = JSON.parse(readFileSync(join(SITE, "src/data/medalhoes.json"), "utf8")) as Medals;
  const names = books.flatMap((b) => b.verses.map((_, c) => ({ book: b, chapter: c + 1, label: `${b.name} ${c + 1}`, key: `${b.slug}-${c + 1}` })));
  const centreBook = books.find((b) => b.slug === EXPLORE_HOME.slug);
  if (!centreBook) return { failures: [`explore: no book ${EXPLORE_HOME.slug}`], checked };
  const centreCi = centreBook.firstChapter + EXPLORE_HOME.chapter - 1;
  const centre = names[centreCi].label;

  // every linked chapter of the centre, from its verse links, ranked by votes, then pairs, then canonical order
  const chapOf: number[] = [];
  for (const b of books) b.verses.forEach((n, c) => chapOf.push(...Array<number>(n).fill(b.firstChapter + c)));
  const bookText = (b: Book) => JSON.parse(readFileSync(join(OUT.generated, "books", `${b.slug}.json`), "utf8")) as BookFile;
  const here = bookText(centreBook).chapters[EXPLORE_HOME.chapter - 1];
  const acc = new Map<number, Partner>();
  here.forEach((v) => {
    for (const [gv, votes] of v.l) {
      const ci = chapOf[gv];
      if (ci === centreCi) continue;
      const p = acc.get(ci) ?? { ci, pairs: 0, votes: 0 };
      p.pairs++;
      p.votes += votes;
      acc.set(ci, p);
    }
  });
  const all = [...acc.values()].sort((x, y) => y.votes - x.votes || y.pairs - x.pairs || x.ci - y.ci);
  const groupOf = (ci: number) => medals.bookGroup[names[ci].book.osis];
  const groups = GROUPS.map((id) => {
    const list = all.filter((p) => groupOf(p.ci) === id);
    return { id, list, chapters: list.length, votes: list.reduce((s, p) => s + p.votes, 0), medal: medals.groups[id] };
  });
  const first = all[0];
  const partner = names[first.ci];
  const conexao = `conexao/${centreBook.slug}-${EXPLORE_HOME.chapter}/${partner.book.slug}-${partner.chapter}.html`;
  const pages = ["index.html", `${EXPLORE_HOME_PATH.slice(1)}.html`, `${EXPLORE_HOME_PATH.slice(1)}/${partner.book.slug}/${partner.chapter}.html`, "explorar/joao/1.html"];
  for (const page of [...pages, conexao]) if (read(page) === null) failures.push(`${page} was not prerendered`);
  if (failures.length) return { failures, checked };

  // the strongest verse pair of the selected connection and the verses on each side
  const firstGv = partner.book.firstVerse + partner.book.verses.slice(0, partner.chapter - 1).reduce((s, n) => s + n, 0);
  const lastGv = firstGv + partner.book.verses[partner.chapter - 1] - 1;
  const found = here.flatMap((v, i) => v.l.filter(([gv]) => gv >= firstGv && gv <= lastGv).map(([gv, votes]) => ({ a: i + 1, b: gv - firstGv + 1, votes })));
  const best = [...found].sort((p, q) => q.votes - p.votes || p.a - q.a || p.b - q.b)[0];
  const hereVerses = [...new Set(found.map((p) => p.a))];
  const thereVerses = [...new Set(found.map((p) => p.b))];
  const there = bookText(partner.book).chapters[partner.chapter - 1];
  if (found.length !== first.pairs) failures.push(`explore: ${centre} and ${partner.label} recount ${found.length} pairs, the ranking ${first.pairs}`);

  for (const page of pages.slice(0, 3)) {
    const raw = read(page) ?? "";
    const text = textOf(raw);
    const fail = (msg: string) => failures.push(`${page}: ${msg}`);
    /** inner HTML of the first element carrying the attribute; with `after`, the first one after that offset */
    const inner = (attr: string, after = 0) => {
      const m = new RegExp(`<(\\w+)[^>]*\\s${escapeRe(attr)}[^>]*>`).exec(raw.slice(after));
      if (!m) return undefined;
      const start = after + m.index + m[0].length;
      // the element's own closing tag, counting nested elements of the same name
      const tag = m[1];
      const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
      re.lastIndex = start;
      let depth = 1;
      for (let t = re.exec(raw); t; t = re.exec(raw)) {
        depth += t[1] ? -1 : 1;
        if (depth === 0) return raw.slice(start, t.index);
      }
      return undefined;
    };
    const openTag = (attr: string) => new RegExp(`<\\w+[^>]*\\s${escapeRe(attr)}[^>]*>`).exec(raw)?.[0];

    if (!text.includes(partnersText(all.length))) fail(`"${partnersText(all.length)}" missing`);

    // the list of the map: every group with its counts and its most voted chapters, in rank order
    for (const g of groups) {
      checked++;
      const block = inner(`data-group="${g.id}"`);
      if (block === undefined) {
        fail(`group ${g.id} is not in the list`);
        continue;
      }
      const meta = textOf(inner("data-group-meta", raw.indexOf(`data-group="${g.id}"`)) ?? "");
      const want = g.chapters ? `${partnersText(g.chapters)} · ${votesText(g.votes)}` : "nenhum capítulo ligado";
      if (meta !== want) fail(`group ${g.id} says "${meta}", the recount "${want}"`);
      if (!block.includes(`src="${g.medal.src96}"`)) fail(`group ${g.id} lacks its medallion ${g.medal.src96}`);
      let last = -1;
      for (const p of g.list.slice(0, PER_GROUP)) {
        checked++;
        const at = block.indexOf(`data-partner="${names[p.ci].key}"`);
        const row = textOf(new RegExp(`data-partner="${escapeRe(names[p.ci].key)}"[^>]*>([\\s\\S]*?)</li>`).exec(block)?.[1] ?? "");
        if (at < 0) fail(`${names[p.ci].label} is not listed under ${g.id}`);
        else if (at < last) fail(`${names[p.ci].label} is out of order under ${g.id}`);
        last = at;
        for (const s of [names[p.ci].label, pairsText(p.pairs), votesText(p.votes)]) if (!row.includes(s)) fail(`list row ${names[p.ci].label} lacks "${s}"`);
      }
    }

    // the map: each medallion (the wide map's, the first in the page) with its counts, and the chapters drawn around it
    for (const g of groups) {
      checked++;
      const tag = openTag(`data-hub="${g.id}"`) ?? "";
      const label = /aria-label="([^"]*)"/.exec(tag)?.[1]?.replace(/&quot;/g, '"') ?? "";
      if (g.chapters) {
        for (const s of [g.medal.category, partnersText(g.chapters), votesText(g.votes), names[g.list[0].ci].label]) {
          if (!label.includes(s)) fail(`medallion ${g.id} lacks "${s}" (${label})`);
        }
      }
      if (!(inner(`data-hub="${g.id}"`) ?? "").includes(`src="${g.medal.src96}"`)) fail(`medallion ${g.id} lacks ${g.medal.src96}`);
    }
    const drawn = [...raw.matchAll(/\sdata-node="([^"]+)"/g)].map((m) => m[1]);
    if (drawn.length === 0) fail("no chapter is drawn on the map");
    for (const key of new Set(drawn)) {
      checked++;
      const ci = names.findIndex((n) => n.key === key);
      const g = groups.find((x) => x.list.slice(0, PER_GROUP).some((p) => p.ci === ci));
      const p = g?.list.find((x) => x.ci === ci);
      if (!g || !p) {
        fail(`${key} is drawn but is not among the ${PER_GROUP} most voted of its group`);
        continue;
      }
      const t = textOf(inner(`data-node="${key}"`) ?? "");
      if (!t.includes(`${names[ci].label}, ${votesText(p.votes)}`)) fail(`node ${names[ci].label} lacks "${names[ci].label}, ${votesText(p.votes)}"`);
    }
    // the selected connection: the most voted linked chapter, drawn and lit
    const sel = openTag(`data-node="${partner.key}"`) ?? "";
    if (!sel.includes('aria-current="true"')) fail(`${partner.label} is not marked as the selected chapter`);
    const legend = textOf(inner('data-illustrations=""') ?? "");
    if (!legend.startsWith("Ilustração")) fail(`the medallions are not marked "Ilustração"`);
    for (const g of groups) if (!legend.includes(g.medal.category)) fail(`the legend does not name the illustration of ${g.medal.category}`);

    // the panel of the selected connection
    if (!raw.includes(`data-connection="${partner.key}"`)) fail(`panel is not about ${partner.label}`);
    const fact = textOf(inner('data-fact=""') ?? "");
    const wantFact = `${pairsText(found.length)} de versículos, ${somados(first.votes)}.`;
    if (fact !== wantFact) fail(`panel says "${fact}", the recount "${wantFact}"`);
    if (!textOf(inner('data-pair-votes=""') ?? "").includes(`${votesText(best.votes)} neste par`)) fail(`panel lacks "${votesText(best.votes)} neste par"`);
    for (const s of [`${centre}:${best.a}`, `${partner.label}:${best.b}`, here[best.a - 1].t, there[best.b - 1].t]) {
      if (!text.includes(s)) fail(`panel lacks "${s.slice(0, 40)}"`);
    }
    for (const v of hereVerses) if (!raw.includes(`href="/${centreBook.slug}/${EXPLORE_HOME.chapter}/${v}"`)) fail(`panel lacks the verse ${centre}:${v}`);
    for (const v of thereVerses) if (!raw.includes(`href="/${partner.book.slug}/${partner.chapter}/${v}"`)) fail(`panel lacks the verse ${partner.label}:${v}`);
  }

  const meta = textOf(new RegExp(`data-explore-meta=""[^>]*>([\\s\\S]*?)</p>`).exec(read(pages[1]) ?? "")?.[1] ?? "");
  if (!meta.startsWith(`${partnersText(all.length)} a ${centre}.`)) failures.push(`${pages[1]}: the head says "${meta}"`);

  // /conexao of the selected connection: every verse pair between the two chapters, recounted from the verse links
  const raw = read(conexao) ?? "";
  const total = found.reduce((s, p) => s + p.votes, 0);
  if (total !== first.votes) failures.push(`${conexao}: recount gives ${total} votes, the ranking ${first.votes}`);
  const metaC = textOf(new RegExp(`data-conexao-meta=""[^>]*>([\\s\\S]*?)</p>`).exec(raw)?.[1] ?? "");
  if (!metaC.includes(`${pairsText(found.length)} de versículos · ${somados(total)}`)) failures.push(`${conexao}: meta lacks "${pairsText(found.length)} de versículos · ${somados(total)}"`);
  for (const p of found) {
    checked++;
    const row = new RegExp(`<li[^>]*data-pair="${p.a}-${p.b}"[^>]*>([\\s\\S]*?)</li>`).exec(raw)?.[1];
    if (!row || !textOf(row).includes(votesText(p.votes))) failures.push(`${conexao}: pair ${p.a}-${p.b} lacks "${votesText(p.votes)}"`);
    for (const id of [`a-${p.a}`, `b-${p.b}`]) {
      if (!new RegExp(`<li[^>]*id="${id}"[^>]*data-linked="true"`).test(raw)) failures.push(`${conexao}: verse ${id} is not marked as linked`);
    }
  }
  return { failures, checked };
}
