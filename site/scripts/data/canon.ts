// The verse grid (66 books / chapters / verses per chapter) and the BLIVRE text aligned to it.
// Grid source: xref.npz (built by estudos/biblia-referencias/tools/analyze.py from pythonbible's KJV versification),
// names and OSIS ids from stats.json. The BLIVRE text must fit that grid exactly; any difference throws.
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { ABBREVIATIONS } from "../../src/lib/canon/aliases";
import { slugify } from "../../src/lib/canon/text";
import type { Book } from "../../src/lib/canon/types";
import { readNpz, type NpyArray } from "./npz";
import { SRC, readJson } from "./sources";

export type Stats = {
  stats: Record<string, unknown>;
  books_pt: string[];
  osis: string[];
  chapters_per_book: number[];
};

export type Canon = {
  books: Book[];
  /** verses per global chapter */
  chapterVerses: number[];
  /** book index per global chapter */
  chapterBook: number[];
  /** first global verse per global chapter */
  chapterFirst: number[];
  verseCount: number;
  npz: Record<string, NpyArray>;
  stats: Stats;
};

function fail(msg: string): never {
  throw new Error(`[canon] ${msg}`);
}

export function loadCanon(): Canon {
  const stats = readJson<Stats>(SRC.statsJson);
  const npz = readNpz(SRC.xrefNpz);
  const chapterVerses = npz.chap_verses.data;
  const chapterBook = npz.chap_book.data;
  const chapterFirst = npz.chap_first.data;
  const nBooks = stats.osis.length;
  if (stats.books_pt.length !== nBooks || stats.chapters_per_book.length !== nBooks) fail("stats.json lists differ in length");

  // chapters per book, from the npz, must match stats.json
  const perBook = new Array<number>(nBooks).fill(0);
  for (const b of chapterBook) perBook[b]++;
  perBook.forEach((n, i) => n !== stats.chapters_per_book[i] && fail(`chapters of ${stats.osis[i]}: npz ${n} vs stats ${stats.chapters_per_book[i]}`));

  // chap_first must be the running sum of chap_verses
  let gv = 0;
  chapterVerses.forEach((n, ci) => {
    if (chapterFirst[ci] !== gv) fail(`chap_first[${ci}]`);
    gv += n;
  });
  const verseCount = gv;

  const matt = stats.osis.indexOf("Matt");
  if (matt < 0) fail("no Matt in osis list");
  const books: Book[] = [];
  let ci = 0;
  for (let i = 0; i < nBooks; i++) {
    const n = stats.chapters_per_book[i];
    const abbreviations = ABBREVIATIONS[stats.osis[i]] ?? fail(`no abbreviations for ${stats.osis[i]}`);
    books.push({
      index: i,
      osis: stats.osis[i],
      vpl: "", // filled by loadBlivre
      name: stats.books_pt[i],
      slug: slugify(stats.books_pt[i]),
      abbr: abbreviations[0],
      aliases: abbreviations.slice(1),
      testament: i < matt ? "AT" : "NT",
      verses: chapterVerses.slice(ci, ci + n),
      firstChapter: ci,
      firstVerse: chapterFirst[ci],
    });
    ci += n;
  }
  return { books, chapterVerses, chapterBook, chapterFirst, verseCount, npz, stats };
}

export type Blivre = {
  /** text per global verse index */
  text: string[];
  /** VPL book codes in file order */
  codes: string[];
  /** the about page shipped inside the zip (licence statement) */
  about: string;
};

const VPL_LINE = /^([1-3A-Z]{3}) (\d+):(\d+) (.*)$/;

export function loadBlivre(canon: Canon): Blivre {
  const files = unzipSync(readFileSync(SRC.blivreZip));
  const txtName = Object.keys(files).find((f) => f.endsWith("_vpl.txt")) ?? fail("no _vpl.txt in BLIVRE zip");
  const aboutName = Object.keys(files).find((f) => f.endsWith("_about.htm")) ?? fail("no _about.htm in BLIVRE zip");
  const lines = new TextDecoder("utf-8", { fatal: true }).decode(files[txtName]).split("\n").filter((l) => l.length > 0);

  const codes: string[] = [];
  const text = new Array<string | undefined>(canon.verseCount);
  for (const line of lines) {
    const m = VPL_LINE.exec(line.replace(/\r$/, "")) ?? fail(`bad VPL line: ${line.slice(0, 40)}`);
    const [, code, c, v, t] = m;
    if (codes[codes.length - 1] !== code) {
      if (codes.includes(code)) fail(`book ${code} is not contiguous`);
      codes.push(code);
    }
    const book = canon.books[codes.length - 1] ?? fail(`more than ${canon.books.length} books in BLIVRE`);
    const chapter = Number(c);
    const verse = Number(v);
    if (chapter < 1 || chapter > book.verses.length) fail(`${code} ${chapter} outside the grid`);
    if (verse < 1 || verse > book.verses[chapter - 1]) fail(`${code} ${chapter}:${verse} outside the grid`);
    const gv = canon.chapterFirst[book.firstChapter + chapter - 1] + verse - 1;
    if (text[gv] !== undefined) fail(`${code} ${chapter}:${verse} repeated`);
    if (!t.trim()) fail(`${code} ${chapter}:${verse} is empty`);
    text[gv] = t;
  }
  if (codes.length !== canon.books.length) fail(`BLIVRE has ${codes.length} books`);
  const missing = text.findIndex((t) => t === undefined);
  if (missing >= 0) fail(`BLIVRE misses global verse ${missing}`);
  codes.forEach((code, i) => (canon.books[i].vpl = code));
  const about = new TextDecoder("utf-8").decode(files[aboutName]);
  return { text: text as string[], codes, about };
}
