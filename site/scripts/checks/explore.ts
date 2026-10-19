// Post-build check of the Explorar (called by scripts/check-dist.ts): the numbers the home and /explorar/isaias/9
// show (partner count, each neighbour's pairs and votes, the default connection, its strongest pair and verses) and
// the /conexao page of that connection are the pipeline's numbers (CLAUDE.md rule 3).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { formatInt } from "../../src/lib/canon/text";
import type { Book } from "../../src/lib/canon/types";
import { EXPLORE_HOME, EXPLORE_HOME_PATH } from "../../src/lib/explore/home";
import { pairsText, partnersText, votesText } from "../../src/lib/explore/text";
import type { ExploreFile } from "../../src/lib/explore/types";
import { OUT } from "../data/sources";

type BookFile = { chapters: { t: string; l: [number, number, number][] }[][] };
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function checkExplore(appDir: string, textOf: (html: string) => string): { failures: string[]; checked: number } {
  const failures: string[] = [];
  let checked = 0;
  const books = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as Book[];
  const names = books.flatMap((b) => b.verses.map((_, c) => ({ book: b, chapter: c + 1, label: `${b.name} ${c + 1}` })));
  const centreBook = books.find((b) => b.slug === EXPLORE_HOME.slug);
  if (!centreBook) return { failures: [`explore: no book ${EXPLORE_HOME.slug}`], checked };
  const ex = JSON.parse(readFileSync(join(OUT.generated, "explore", `${centreBook.slug}.json`), "utf8")) as ExploreFile;
  const ch = ex.chapters[EXPLORE_HOME.chapter - 1];
  const centre = `${centreBook.name} ${EXPLORE_HOME.chapter}`;
  const key = (ci: number) => `${names[ci].book.slug}-${names[ci].chapter}`;
  const [first] = ch.top;
  const partner = names[first[0]];
  const conexao = `conexao/${centreBook.slug}-${EXPLORE_HOME.chapter}/${partner.book.slug}-${partner.chapter}.html`;
  const pages = ["index.html", `${EXPLORE_HOME_PATH.slice(1)}.html`, `${EXPLORE_HOME_PATH.slice(1)}/${partner.book.slug}/${partner.chapter}.html`, "explorar/joao/1.html"];

  for (const page of [...pages, conexao]) {
    if (!existsSync(join(appDir, page))) failures.push(`${page} was not prerendered`);
  }
  if (failures.length) return { failures, checked };

  const bookText = (b: Book) => JSON.parse(readFileSync(join(OUT.generated, "books", `${b.slug}.json`), "utf8")) as BookFile;
  const here = bookText(centreBook).chapters[EXPLORE_HOME.chapter - 1];
  const there = bookText(partner.book).chapters[partner.chapter - 1];

  for (const page of pages.slice(0, 3)) {
    const raw = readFileSync(join(appDir, page), "utf8");
    const text = textOf(raw);
    const fail = (msg: string) => failures.push(`${page}: ${msg}`);
    const inner = (attr: string) => new RegExp(`<(\\w+)[^>]*\\s${escapeRe(attr)}[^>]*>([\\s\\S]*?)</\\1>`).exec(raw)?.[2];
    const openTag = (attr: string) => new RegExp(`<\\w+[^>]*\\s${escapeRe(attr)}[^>]*>`).exec(raw)?.[0];

    if (!text.includes(partnersText(ch.partners))) fail(`"${partnersText(ch.partners)}" missing`);
    // every neighbour in the list, with its pairs and votes, in rank order
    let last = -1;
    for (const [ci, pairs, votes] of ch.top) {
      checked++;
      const row = inner(`data-partner="${key(ci)}"`);
      const at = raw.indexOf(`data-partner="${key(ci)}"`);
      if (row === undefined) {
        fail(`${names[ci].label} is not in the list`);
        continue;
      }
      const t = textOf(row);
      for (const s of [names[ci].label, pairsText(pairs), votesText(votes)]) if (!t.includes(s)) fail(`list row ${names[ci].label} lacks "${s}"`);
      if (at < last) fail(`list row ${names[ci].label} is out of order`);
      last = at;
      // and on the canvas: every node carries the same numbers (label and count line, or the hover label of a dot)
      const node = inner(`data-node="${key(ci)}"`);
      const name = `${names[ci].label}, ${votesText(votes)}`;
      if (node === undefined) fail(`${names[ci].label} is not on the canvas`);
      else if (!textOf(node).includes(name) && !textOf(node).includes(`${names[ci].label} · ${votesText(votes)}`)) fail(`node ${names[ci].label} lacks "${name}"`);
    }
    // the default connection: the strongest partner, its numbers, the two verses of its strongest pair and the paired verses
    const [, pairs, votes, [hv, tv, pv], hereVerses, thereVerses] = first;
    const sel = openTag(`data-node="${key(first[0])}"`) ?? "";
    if (!sel.includes('aria-current="true"')) fail(`${partner.label} is not marked as the selected node`);
    const fact = inner('data-fact=""');
    if (!fact || !textOf(fact).includes(`${pairsText(pairs)} · ${votesText(votes)}`)) fail(`panel lacks "${pairsText(pairs)} · ${votesText(votes)}"`);
    if (!raw.includes(`data-connection="${key(first[0])}"`)) fail(`panel is not about ${partner.label}`);
    for (const s of [`${centre}:${hv}`, `${partner.label}:${tv}`, `Par mais votado ${votesText(pv)}`]) if (!text.includes(s)) fail(`panel lacks "${s}"`);
    for (const s of [here[hv - 1].t, there[tv - 1].t]) if (!text.includes(s)) fail(`panel lacks the BLIVRE text "${s.slice(0, 40)}…"`);
    for (const v of hereVerses) if (!raw.includes(`href="/${centreBook.slug}/${EXPLORE_HOME.chapter}/${v}"`)) fail(`panel lacks the verse ${centre}:${v}`);
    for (const v of thereVerses) if (!raw.includes(`href="/${partner.book.slug}/${partner.chapter}/${v}"`)) fail(`panel lacks the verse ${partner.label}:${v}`);
  }

  const explorar = textOf(readFileSync(join(appDir, pages[1]), "utf8"));
  const meta = `${formatInt(ch.partners)} capítulos ligados a ${centre} · no grafo, os ${formatInt(ch.top.length)} com mais votos`;
  if (!explorar.includes(meta)) failures.push(`${pages[1]}: "${meta}" missing`);

  // /conexao of the default connection: every verse pair between the two chapters, recounted from the verse links
  const raw = readFileSync(join(appDir, conexao), "utf8");
  const firstGv = partner.book.firstVerse + partner.book.verses.slice(0, partner.chapter - 1).reduce((s, n) => s + n, 0);
  const lastGv = firstGv + partner.book.verses[partner.chapter - 1] - 1;
  const found = here.flatMap((v, i) => v.l.filter(([gv]) => gv >= firstGv && gv <= lastGv).map(([gv, votes]) => ({ a: i + 1, b: gv - firstGv + 1, votes })));
  const total = found.reduce((s, p) => s + p.votes, 0);
  if (found.length !== first[1] || total !== first[2]) failures.push(`${conexao}: recount gives ${found.length} pairs / ${total} votes, explore data ${first[1]} / ${first[2]}`);
  const metaRe = new RegExp(`data-conexao-meta=""[^>]*>([\\s\\S]*?)</p>`).exec(raw)?.[1] ?? "";
  if (!textOf(metaRe).includes(`${pairsText(found.length)} · ${votesText(total)}`)) failures.push(`${conexao}: meta lacks "${pairsText(found.length)} · ${votesText(total)}"`);
  for (const p of found) {
    checked++;
    const row = new RegExp(`<li[^>]*data-pair="${p.a}-${p.b}"[^>]*>([\\s\\S]*?)</li>`).exec(raw)?.[1];
    if (!row || !textOf(row).includes(votesText(p.votes))) failures.push(`${conexao}: pair ${p.a}-${p.b} lacks "${votesText(p.votes)}"`);
  }
  return { failures, checked };
}
