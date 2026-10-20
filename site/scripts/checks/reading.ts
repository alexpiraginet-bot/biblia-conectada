// Post-build checks of the reading pages (called by check-dist.ts): every number on /ler, on the book pages and on
// every prerendered chapter and verse page is the one computed from the generated book files (CLAUDE.md rule 3):
// the books' and chapters' links, the chapter list and pager counts, the meta line, the seal, each verse's links pill,
// the panel headline and its "Mais ligados" rows; every link of a verse panel carries its whole BLIVRE text; the panel
// links follow the /conexao and /explorar contracts, the crumbs name the book group, and /salvos ships its static shell.
import { readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { createGrid } from "../../src/lib/canon/grid";
import { formatInt } from "../../src/lib/canon/text";
import type { Book } from "../../src/lib/canon/types";
import { rankLinkedChapters, type LinkedChapter } from "../../src/lib/chapter-rank";
import { conexaoPath } from "../../src/lib/conexao";
import { chapterHeadline, chapterMeta, linksLabel, mostLinkedRows, testamentName, verseHeadline, votesLabel } from "../../src/lib/from-here";
import { OUT, SITE } from "../data/sources";

type BookFile = { chapters: { t: string; l: [number, number, number][] }[][] };
type Medals = { groups: Record<string, { id: string; category: string }>; bookGroup: Record<string, string> };

/** `html`: prerendered pages by path relative to the app ("isaias/9.html"); `page` reads one, in either build layout
 *  (scripts/checks/pages.ts) */
export function checkReading({
  html,
  page: read,
  textOf: visible,
  failures,
}: {
  html: readonly string[];
  page: (rel: string) => string;
  textOf: (s: string) => string;
  failures: string[];
}): string {
  // titles keep a book's number with its name by a no-break space ("1 Tessalonicenses 5", from-here.ts keepBookNumber)
  const textOf = (s: string) => visible(s).replace(/ /g, " ");
  for (const r of [join("genesis", "1.html"), join("salmos", "119.html"), "salvos.html", "ler.html", "salmos.html"]) {
    if (!html.includes(r)) failures.push(`[reading] ${r} was not prerendered`);
  }
  const books = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as Book[];
  const chapterPairs = JSON.parse(readFileSync(join(OUT.generated, "chapter-pairs.json"), "utf8")) as number[];
  const medals = JSON.parse(readFileSync(join(SITE, "src/data/medalhoes.json"), "utf8")) as Medals;
  const grid = createGrid(books);
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const files = new Map<string, BookFile>();
  const file = (slug: string) => {
    let f = files.get(slug);
    if (!f) files.set(slug, (f = JSON.parse(readFileSync(join(OUT.generated, "books", `${slug}.json`), "utf8")) as BookFile));
    return f;
  };
  const verseLabel = (gv: number) => {
    const l = grid.locate(gv);
    return `${l.book.name} ${l.chapter}:${l.verse}`;
  };
  const chapterLabel = (ci: number) => {
    const l = grid.locateChapter(ci);
    return `${l.book.name} ${l.chapter}`;
  };
  /** inner HTML of the first element whose opening tag carries `attr` */
  const element = (raw: string, attr: string) => {
    const m = new RegExp(`<(\\w+)[^>]*\\s${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`).exec(raw);
    if (!m) return null;
    // the element's end: count nested tags of the same name
    const open = new RegExp(`<${m[1]}[\\s>]|</${m[1]}>`, "g");
    open.lastIndex = m.index + m[0].length;
    let depth = 1;
    for (let t = open.exec(raw); t; t = open.exec(raw)) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) return raw.slice(m.index + m[0].length, t.index);
    }
    return null;
  };
  const headlineOf = (raw: string) => {
    const m = /<p[^>]*data-headline=""[^>]*>([\s\S]*?)<\/p>/.exec(raw);
    return m ? textOf(m[1]) : null;
  };
  const attr = (s: string) => s.replace(/&/g, "&amp;");
  /** "<a ...>" tags whose href is `href` (attribute order is React's: href may come after class) */
  const anchors = (raw: string, href: string) => [...raw.matchAll(/<a [^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes(`href="${href}"`));

  /** linked chapters of a chapter, recounted from the verse links (pairs inside the chapter left out) */
  const linkedOf = (book: Book, chapter: number) => {
    const here = book.firstChapter + chapter - 1;
    const acc = new Map<number, LinkedChapter>();
    for (const v of file(book.slug).chapters[chapter - 1]) {
      for (const [gv, votes] of v.l) {
        const l = grid.locate(gv);
        const ci = l.book.firstChapter + l.chapter - 1;
        if (ci === here) continue;
        const a = acc.get(ci) ?? { ci, pairs: 0, votes: 0 };
        a.pairs++;
        a.votes += votes;
        acc.set(ci, a);
      }
    }
    return rankLinkedChapters([...acc.values()]);
  };
  /** links of a book: distinct verse pairs with a verse in it, a pair inside the book counted once */
  const bookLinks = (book: Book) => {
    const first = book.firstVerse;
    const end = first + book.verses.reduce((a, b) => a + b, 0);
    let n = 0;
    let gv = first;
    for (const ch of file(book.slug).chapters) {
      for (const v of ch) {
        for (const [p] of v.l) if (p < first || p >= end || p > gv) n++;
        gv++;
      }
    }
    return n;
  };
  const groupOf = (book: Book) => medals.groups[medals.bookGroup[book.osis]];

  // /ler: every book with its chapters and links, under its group
  if (html.includes("ler.html")) {
    const raw = read("ler.html");
    for (const b of books) {
      const tag = anchors(raw, `/${b.slug}`)[0];
      const inner = tag ? raw.slice(raw.indexOf(tag) + tag.length, raw.indexOf("</a>", raw.indexOf(tag))) : null;
      const want = `${b.name}${formatInt(b.verses.length)} ${b.verses.length === 1 ? "capítulo" : "capítulos"} · ${linksLabel(bookLinks(b))}`;
      if (inner === null || textOf(inner) !== want) failures.push(`ler.html: ${b.name} reads "${inner && textOf(inner)}", expected "${want}"`);
      const group = groupOf(b);
      const section = element(raw, `id="${group.id}"`);
      if (!section?.includes(`href="/${b.slug}"`)) failures.push(`ler.html: ${b.name} is not in the ${group.category} group`);
    }
  }

  let chapters = 0;
  let verses = 0;
  let books_ = 0;
  for (const page of html) {
    const parts = page.replace(/\.html$/, "").split(sep);
    const book = bySlug.get(parts[0]);
    if (!book) continue;
    const raw = read(page);
    const text = textOf(raw);
    const group = groupOf(book);
    const crumbs = element(raw, 'aria-label="Trilha"') ?? "";
    if (!crumbs.includes(`href="/ler#${group.id}"`) || !textOf(crumbs).includes(group.category)) failures.push(`${page}: the crumbs do not name the group ${group.category}`);

    if (parts.length === 1) {
      // book page: meta line, every chapter with its links, the most linked chapters
      const meta = element(raw, 'data-book-meta=""');
      const verseCount = book.verses.reduce((a, b) => a + b, 0);
      const want = `${formatInt(book.verses.length)} ${book.verses.length === 1 ? "capítulo" : "capítulos"} · ${formatInt(verseCount)} versículos · ${linksLabel(bookLinks(book))} · ${testamentName(book.testament)}`;
      if (meta === null || textOf(meta) !== want) failures.push(`${page}: meta "${meta && textOf(meta)}", expected "${want}"`);
      const gridHtml = element(raw, 'data-chapters-grid=""') ?? "";
      book.verses.forEach((_, i) => {
        const n = chapterPairs[book.firstChapter + i];
        if (!anchors(gridHtml, `/${book.slug}/${i + 1}`).some((t) => t.includes(`aria-label="${book.name} ${i + 1}, ${linksLabel(n)}"`))) {
          failures.push(`${page}: chapter ${i + 1} is not listed with ${linksLabel(n)}`);
        }
      });
      if (book.verses.length > 1) {
        const ranked = book.verses.map((_, i) => ({ c: i + 1, n: chapterPairs[book.firstChapter + i] })).sort((x, y) => y.n - x.n || x.c - y.c);
        const cut = ranked[Math.min(5, ranked.length) - 1].n;
        const want = ranked.filter((r, i) => i < 5 || r.n === cut).map((r) => `${book.name} ${r.c}${linksLabel(r.n)}`);
        const list = element(raw, 'data-mais-ligados-livro=""') ?? "";
        const rows = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]));
        if (JSON.stringify(rows) !== JSON.stringify(want)) failures.push(`${page}: most linked chapters ${JSON.stringify(rows)}, expected ${JSON.stringify(want)}`);
      }
      books_++;
      continue;
    }

    const chapter = Number(parts[1]);
    // only pages that name a chapter (and verse) that exists are reading pages
    if (!(chapter >= 1 && chapter <= book.verses.length) || (parts.length > 2 && !(Number(parts[2]) >= 1 && Number(parts[2]) <= book.verses[chapter - 1]))) continue;
    const here = book.firstChapter + chapter - 1;
    const verseList = file(book.slug).chapters[chapter - 1];
    const linked = linkedOf(book, chapter);

    // the chapter frame (layout): the title, the meta line, the seal, every chapter in the list, the pager, the pills
    const title = element(raw, 'id="titulo-capitulo"');
    if (title === null || textOf(title) !== `${book.name} ${chapter}`) failures.push(`${page}: title "${title && textOf(title)}"`);
    const meta = element(raw, 'data-chapter-meta=""');
    const wantMeta = chapterMeta(verseList.length, chapterPairs[here], linked.length);
    if (meta === null || textOf(meta) !== wantMeta) failures.push(`${page}: meta "${meta && textOf(meta)}", expected "${wantMeta}"`);
    const linkedWords = `${formatInt(linked.length)} ${linked.length === 1 ? "capítulo ligado" : "capítulos ligados"}`;
    if (!raw.includes(`aria-label="${book.name} ${chapter}, com ${linkedWords}"`)) failures.push(`${page}: the seal does not say ${linkedWords}`);
    // the chapter page's peek of its links panel (phones): the same count; verse pages and unlinked chapters have none
    const peek = element(raw, 'data-peek-count=""');
    if (parts.length === 2 && linked.length > 0 ? peek === null || textOf(peek) !== linkedWords : peek !== null) {
      failures.push(`${page}: links peek "${peek && textOf(peek)}", expected ${parts.length === 2 && linked.length > 0 ? `"${linkedWords}"` : "none"}`);
    }
    const list = element(raw, 'data-chapters=""') ?? "";
    book.verses.forEach((_, i) => {
      const c = i + 1;
      const tag = anchors(list, `/${book.slug}/${c}`).find((t) => t.includes(`aria-label="${book.name} ${c}, ${linksLabel(chapterPairs[book.firstChapter + i])}"`));
      if (!tag || !list.includes(`${tag}${c}</a>`)) failures.push(`${page}: chapter list entry ${c} missing or without its links`);
      else if ((c === chapter) !== tag.includes('aria-current="page"')) failures.push(`${page}: chapter list aria-current on the wrong chapter`);
    });
    for (const [ci, rel] of [
      [here - 1, "prev"],
      [here + 1, "next"],
    ] as const) {
      if (ci < 0 || ci >= grid.chapterCount) continue;
      const l = grid.locateChapter(ci);
      const pager = element(raw, `aria-label="Capítulo anterior e seguinte"`) ?? "";
      const a = anchors(pager, `/${l.book.slug}/${l.chapter}`).find((t) => t.includes(`rel="${rel}"`));
      const inner = a ? pager.slice(pager.indexOf(a) + a.length, pager.indexOf("</a>", pager.indexOf(a))) : "";
      if (!a || !textOf(inner).includes(`${chapterLabel(ci)}${linksLabel(chapterPairs[ci])}`)) failures.push(`${page}: pager ${rel} is not ${chapterLabel(ci)} with ${linksLabel(chapterPairs[ci])}`);
    }
    verseList.forEach((v, i) => {
      const n = v.l.length;
      const words = n === 0 ? "nenhuma ligação" : linksLabel(n);
      const tag = anchors(raw, `/${book.slug}/${chapter}/${i + 1}`).find((t) => t.includes("data-links"));
      if (!tag || !tag.includes(`aria-label="${book.name} ${chapter}:${i + 1}, ${words}"`) || !raw.includes(`${tag}<span class="i i-arc"></span>${formatInt(n)}</a>`)) {
        failures.push(`${page}: the links pill of verse ${i + 1} does not show ${n}`);
      }
    });

    const ranked = linked.map((p) => ({ key: p.ci, votes: p.votes }));
    if (parts.length === 2) {
      // chapter panel: linked chapters recounted from the verse links, in the order the Explorar uses too
      const expected = chapterHeadline(ranked, chapterLabel);
      if (headlineOf(raw) !== expected) failures.push(`${page}: headline "${headlineOf(raw)}", expected "${expected}"`);
      // "Mais ligados": the rows and their votes, in order
      const rowsHtml = element(raw, 'data-mais-ligados=""') ?? "";
      const rows = [...rowsHtml.matchAll(/<a [^>]*data-row=""[^>]*>/g)].map((m) => /href="([^"]+)"/.exec(m[0])?.[1]);
      const votes = [...rowsHtml.matchAll(/<span class="bc-conn__votes">([\s\S]*?)<\/span>(?=<p)/g)].map((m) => textOf(m[1]));
      const want = mostLinkedRows(ranked);
      const wantRows = want.map((p) => {
        const l = grid.locateChapter(p.key);
        return `/${l.book.slug}/${l.chapter}`;
      });
      if (ranked.length && JSON.stringify(rows) !== JSON.stringify(wantRows)) {
        failures.push(`${page}: "Mais ligados" lists ${rows.join(" ")}, expected ${wantRows.join(" ")}`);
      }
      if (ranked.length && JSON.stringify(votes) !== JSON.stringify(want.map((p) => votesLabel(p.votes)))) {
        failures.push(`${page}: "Mais ligados" votes ${votes.join(", ")}, expected ${want.map((p) => votesLabel(p.votes)).join(", ")}`);
      }
      if (ranked[0]) {
        const top = grid.locateChapter(ranked[0].key);
        const href = conexaoPath({ book: book.index, slug: book.slug, chapter }, { book: top.book.index, slug: top.book.slug, chapter: top.chapter });
        if (!raw.includes(`href="${attr(href)}"`)) failures.push(`${page}: no "Ler lado a lado" link to ${href}`);
        if (!raw.includes(`href="/explorar/${book.slug}/${chapter}"`)) failures.push(`${page}: no "Ver no Explorar" link`);
      }
      chapters++;
    } else {
      // verse panel: the verse's links, strongest first, every one listed
      const verse = Number(parts[2]);
      const links = verseList[verse - 1].l;
      const vranked = links.map(([key, votes]) => ({ key, votes }));
      const expected = verseHeadline(vranked, verseLabel);
      if (headlineOf(raw) !== expected) failures.push(`${page}: headline "${headlineOf(raw)}", expected "${expected}"`);
      if (!text.includes(`Ligações de ${book.name} ${chapter}:${verse}`)) failures.push(`${page}: panel title missing`);
      const rows = [...raw.matchAll(/<li class="bc-conn">\s*(<a [^>]*>)/g)].map((m) => /href="([^"]+)"/.exec(m[1])?.[1]);
      const wantRows = links.map(([gv]) => {
        const l = grid.locate(gv);
        return `/${l.book.slug}/${l.chapter}/${l.verse}`;
      });
      if (JSON.stringify(rows) !== JSON.stringify(wantRows)) failures.push(`${page}: lists ${rows.length} links, expected the ${links.length} of the data in order`);
      // each with its whole text, read in place (design §6.1)
      const nbsp = (t: string) => t.replace(/\u00a0/g, " ");
      const texts = [...raw.matchAll(/<li class="bc-conn">[\s\S]*?<p class="bc-conn__text">([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
      const wrong = links.filter(([gv], i) => {
        const l = grid.locate(gv);
        return texts[i] !== nbsp(file(l.book.slug).chapters[l.chapter - 1][l.verse - 1].t);
      }).length;
      if (wrong || texts.length !== links.length) failures.push(`${page}: ${wrong} of the ${links.length} links lack their whole BLIVRE text (${texts.length} texts)`);
      if (links.length && !text.includes(`${linksLabel(links.length)}das mais votadas às menos votadas`)) failures.push(`${page}: the count of links is missing`);
      if (vranked[0]) {
        const top = grid.locate(vranked[0].key);
        const href = conexaoPath(
          { book: book.index, slug: book.slug, chapter, verse },
          { book: top.book.index, slug: top.book.slug, chapter: top.chapter, verse: top.verse },
        );
        if (!raw.includes(`href="${attr(href)}"`)) failures.push(`${page}: no "Ler lado a lado" link to ${href}`);
      }
      verses++;
    }
  }
  if (chapters !== grid.chapterCount) failures.push(`[reading] ${chapters} chapter pages checked, expected ${grid.chapterCount}`);
  if (books_ !== books.length) failures.push(`[reading] ${books_} book pages checked, expected ${books.length}`);

  const salvos = html.includes("salvos.html") ? textOf(read("salvos.html")) : "";
  if (!salvos.includes("Ficam só neste aparelho")) failures.push("salvos.html: the on-this-device sentence is missing");

  return `reading numbers on /ler, ${books_} book pages, ${chapters} chapter and ${verses} verse pages (titles, meta lines, chapter lists, pagers, pills, headlines, rows with their texts and panel links)`;
}
