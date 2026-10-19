// Post-build checks of the reading pages (called by check-dist.ts): the data headline of every prerendered chapter
// and verse panel is the one src/lib/from-here.ts computes from the generated book files (CLAUDE.md rule 3), the rail
// shows the zero-padded window around the chapter, the panel links follow the /conexao and /explorar contracts, and
// /salvos ships its static shell.
import { readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { createGrid } from "../../src/lib/canon/grid";
import type { Book } from "../../src/lib/canon/types";
import { rankLinkedChapters, type LinkedChapter } from "../../src/lib/chapter-rank";
import { conexaoPath } from "../../src/lib/conexao";
import { chapterHeadline, mostLinkedRows, padChapter, railWindow, testamentName, verseHeadline } from "../../src/lib/from-here";
import { OUT } from "../data/sources";

type BookFile = { chapters: { t: string; l: [number, number, number][] }[][] };

/** `html`: prerendered pages by path relative to the app ("isaias/9.html"); `page` reads one, in either build layout
 *  (scripts/checks/pages.ts) */
export function checkReading({
  html,
  page: read,
  textOf,
  failures,
}: {
  html: readonly string[];
  page: (rel: string) => string;
  textOf: (s: string) => string;
  failures: string[];
}): string {
  for (const r of [join("genesis", "1.html"), join("salmos", "119.html"), "salvos.html"]) {
    if (!html.includes(r)) failures.push(`[reading] ${r} was not prerendered`);
  }
  const books = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as Book[];
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
  const headlineOf = (raw: string) => {
    const m = /<p[^>]*data-headline=""[^>]*>([\s\S]*?)<\/p>/.exec(raw);
    return m ? textOf(m[1]) : null;
  };
  const attr = (s: string) => s.replace(/&/g, "&amp;");

  let chapters = 0;
  let verses = 0;
  for (const page of html) {
    const parts = page.replace(/\.html$/, "").split(sep);
    const book = bySlug.get(parts[0]);
    if (!book || parts.length < 2) continue;
    const chapter = Number(parts[1]);
    // only pages that name a chapter (and verse) that exists are reading pages
    if (!(chapter >= 1 && chapter <= book.verses.length) || (parts.length > 2 && !(Number(parts[2]) >= 1 && Number(parts[2]) <= book.verses[chapter - 1]))) continue;
    const raw = read(page);
    const text = textOf(raw);
    const here = book.firstChapter + chapter - 1;
    const verseList = file(book.slug).chapters[chapter - 1];

    // the chapter frame (layout): testament kicker, rail window, every chapter in the selector
    if (!text.includes(`${testamentName(book.testament)}${book.name} ${chapter}`)) failures.push(`${page}: testament kicker and title missing`);
    for (const c of railWindow(chapter, book.verses.length)) {
      const a = [...raw.matchAll(new RegExp(`<a [^>]*>${padChapter(c, book.verses.length)}</a>`, "g"))].find(
        ([tag]) => tag.includes(`href="/${book.slug}/${c}"`) && tag.includes(`aria-label="Capítulo ${c}"`),
      );
      if (!a) failures.push(`${page}: rail entry ${padChapter(c, book.verses.length)} missing`);
      else if ((c === chapter) !== a[0].includes('aria-current="page"')) failures.push(`${page}: rail aria-current on the wrong chapter`);
    }

    if (parts.length === 2) {
      // chapter panel: linked chapters recounted from the verse links, in the order the Explorar uses too
      const acc = new Map<number, LinkedChapter>();
      for (const v of verseList) {
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
      const ranked = rankLinkedChapters([...acc.values()]).map((p) => ({ key: p.ci, votes: p.votes }));
      const expected = chapterHeadline(ranked, chapterLabel);
      if (headlineOf(raw) !== expected) failures.push(`${page}: headline "${headlineOf(raw)}", expected "${expected}"`);
      // "Mais ligados": the rows, in order
      const list = /<ol[^>]*data-mais-ligados=""[^>]*>([\s\S]*?)<\/ol>/.exec(raw)?.[1];
      const rows = [...(list ?? "").matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
      const want = mostLinkedRows(ranked).map((p) => {
        const l = grid.locateChapter(p.key);
        return `/${l.book.slug}/${l.chapter}`;
      });
      if (ranked.length && JSON.stringify(rows) !== JSON.stringify(want)) {
        failures.push(`${page}: "Mais ligados" lists ${rows.join(" ")}, expected ${want.join(" ")}`);
      }
      if (ranked[0]) {
        const top = grid.locateChapter(ranked[0].key);
        const href = conexaoPath({ book: book.index, slug: book.slug, chapter }, { book: top.book.index, slug: top.book.slug, chapter: top.chapter });
        if (!raw.includes(`href="${attr(href)}"`)) failures.push(`${page}: no "Abrir conexão" link to ${href}`);
        if (!raw.includes(`href="/explorar/${book.slug}/${chapter}"`)) failures.push(`${page}: no "Ver no Explorar" link`);
      }
      chapters++;
    } else {
      // verse panel: the verse's links, strongest first
      const verse = Number(parts[2]);
      const ranked = verseList[verse - 1].l.map(([key, votes]) => ({ key, votes }));
      const expected = verseHeadline(ranked, verseLabel);
      if (headlineOf(raw) !== expected) failures.push(`${page}: headline "${headlineOf(raw)}", expected "${expected}"`);
      if (!text.includes("A partir deste trecho")) failures.push(`${page}: kicker "A partir deste trecho" missing`);
      if (ranked[0]) {
        const top = grid.locate(ranked[0].key);
        const href = conexaoPath(
          { book: book.index, slug: book.slug, chapter, verse },
          { book: top.book.index, slug: top.book.slug, chapter: top.chapter, verse: top.verse },
        );
        if (!raw.includes(`href="${attr(href)}"`)) failures.push(`${page}: no "Abrir conexão" link to ${href}`);
      }
      verses++;
    }
  }
  if (chapters !== grid.chapterCount) failures.push(`[reading] ${chapters} chapter pages checked, expected ${grid.chapterCount}`);

  const salvos = html.includes("salvos.html") ? textOf(read("salvos.html")) : "";
  if (!salvos.includes("Ficam só neste aparelho")) failures.push("salvos.html: the on-this-device sentence is missing");

  return `reading headlines, rail and panel links in ${chapters} chapter and ${verses} verse pages`;
}
