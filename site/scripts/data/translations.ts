// Preserve each edition's own reference positions. No verse crosswalk is inferred from counts.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { unzipSync } from "fflate";
import type { Book } from "../../src/lib/canon/types";
import { getTranslation } from "../../src/lib/translations";
import { OUT, REPO, sha256 } from "./sources";

export const OPEN_NBV_SOURCE = join(REPO, "fontes/ebible/poronbv/poronbv_vpl.zip");
export const OPEN_NBV_SHA256 = "1c43e141446ddd43d8377907c15d1c0c5bfe3dddd29302cd5d676c44f23085c4";
export type TranslationBookFile = { osis: string; chapters: string[][] };
export type TranslationCorpus = {
  /** firstVerse is edition-local, NEVER an index into the BLIVRE/OpenBible graph. */
  books: Book[];
  files: TranslationBookFile[];
  counts: { books: number; chapters: number; verses: number };
  additionalReferences: string[];
  missingReferences: string[];
};

function fail(message: string): never {
  throw new Error(`[translations] ${message}`);
}

/** Keep the text after the first reference delimiter byte-for-byte after UTF-8 decoding. */
export function parseTranslationVpl(text: string, canonicalBooks: readonly Book[]): TranslationCorpus {
  const byCode = new Map(canonicalBooks.map((book, index) => [book.vpl, index]));
  if (!canonicalBooks.length || byCode.size !== canonicalBooks.length || byCode.has("")) fail("book codes are missing or repeated");
  const files: TranslationBookFile[] = canonicalBooks.map((book) => ({ osis: book.osis, chapters: [] }));
  let lastBook = -1;
  let lastChapter = 0;
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (line === "") continue;
    const match = /^([1-3A-Z]{3}) ([1-9]\d*):([1-9]\d*) (.*)$/.exec(line);
    if (!match) fail(`invalid VPL reference: ${line.slice(0, 35)}`);
    const [, code, rawChapter, rawVerse, verseText] = match;
    const index = byCode.get(code);
    if (index === undefined) fail(`unknown book ${code}`);
    const chapter = Number(rawChapter);
    const verse = Number(rawVerse);
    if (!Number.isSafeInteger(chapter) || !Number.isSafeInteger(verse)) fail(`invalid position ${code} ${rawChapter}:${rawVerse}`);
    if (!verseText.trim()) fail(`empty verse ${code} ${chapter}:${verse}`);
    if (index !== lastBook) {
      if (index !== lastBook + 1 || chapter !== 1 || verse !== 1) fail(`book order or opening reference: ${code} ${chapter}:${verse}`);
      lastBook = index;
      lastChapter = 0;
    }
    if (chapter > canonicalBooks[index].verses.length) fail(`chapter count differs: ${code} ${chapter}`);
    const chapters = files[index].chapters;
    if (chapter !== lastChapter) {
      if (chapter !== lastChapter + 1 || verse !== 1) fail(`chapter order or opening reference: ${code} ${chapter}:${verse}`);
      chapters.push([]);
      lastChapter = chapter;
    }
    const rows = chapters[chapter - 1];
    if (verse !== rows.length + 1) fail(`duplicate, gap or verse order: ${code} ${chapter}:${verse}`);
    rows.push(verseText);
  }
  let firstChapter = 0;
  let firstVerse = 0;
  const additionalReferences: string[] = [];
  const missingReferences: string[] = [];
  const books = canonicalBooks.map((book, index) => {
    const chapters = files[index].chapters;
    if (chapters.length !== book.verses.length) fail(`missing chapters in ${book.vpl}: ${chapters.length}/${book.verses.length}`);
    const verses = chapters.map((rows, c) => {
      for (let v = book.verses[c] + 1; v <= rows.length; v++) additionalReferences.push(`${book.vpl} ${c + 1}:${v}`);
      for (let v = rows.length + 1; v <= book.verses[c]; v++) missingReferences.push(`${book.vpl} ${c + 1}:${v}`);
      return rows.length;
    });
    const adapted = { ...book, aliases: [...book.aliases], verses, firstChapter, firstVerse };
    firstChapter += verses.length;
    firstVerse += verses.reduce((sum, n) => sum + n, 0);
    return adapted;
  });
  return { books, files, counts: { books: books.length, chapters: firstChapter, verses: firstVerse }, additionalReferences, missingReferences };
}

export function loadOpenNbv(canonicalBooks: readonly Book[]): TranslationCorpus {
  if (sha256(OPEN_NBV_SOURCE) !== OPEN_NBV_SHA256) fail("Open NBV source SHA-256 changed; review the new edition before importing it");
  const files = unzipSync(readFileSync(OPEN_NBV_SOURCE));
  const member = (suffix: string) => {
    const names = Object.keys(files).filter((name) => name.endsWith(suffix));
    if (names.length !== 1) fail(`expected one ${suffix} in Open NBV source`);
    return new TextDecoder("utf-8", { fatal: true }).decode(files[names[0]]);
  };
  const about = member("_about.htm");
  if (!about.includes("creativecommons.org/licenses/by-sa/4.0/") || !about.includes("2007, 2010")) fail("Open NBV license notice changed");
  return parseTranslationVpl(member("_vpl.txt"), canonicalBooks);
}

export function buildTranslations(canonicalBooks: readonly Book[], write: (path: string, data: string) => void): TranslationCorpus {
  const corpus = loadOpenNbv(canonicalBooks);
  const edition = getTranslation("open-nbv")!;
  write(join(OUT.generated, "translations/open-nbv-books.json"), JSON.stringify(corpus.books));
  for (const book of corpus.books) {
    const file = corpus.files[book.index];
    write(join(OUT.generated, "translations/open-nbv", `${book.slug}.json`), JSON.stringify(file));
    file.chapters.forEach((chapter, index) => {
      write(join(OUT.publicData, "translations/open-nbv", book.slug, `${index + 1}.json`), JSON.stringify(chapter));
    });
  }
  const manifest = {
    format: "biblia-conectada/translation@1",
    edition,
    source: { file: relative(REPO, OPEN_NBV_SOURCE).replaceAll("\\", "/"), sha256: OPEN_NBV_SHA256 },
    counts: corpus.counts,
    textChanged: false,
    transformation: "VPL references separated from their exact text into JSON arrays; no text rewriting, omission or verse merging.",
    alignment: {
      status: "unreviewed",
      chapterIdentity: "Book identities and chapter counts verified; this is not a semantic verse alignment.",
      firstVerse: "Edition-local offset, not a BLIVRE/OpenBible global verse index.",
      additionalReferences: corpus.additionalReferences,
      missingReferences: corpus.missingReferences,
      knownSameNumberDifference: "1 John 5:7–8: the pinned editions contain different text within the same numbered positions.",
    },
  };
  const serialized = JSON.stringify(manifest);
  write(join(OUT.generated, "translations/open-nbv-manifest.json"), serialized);
  write(join(OUT.publicData, "translations/open-nbv/manifest.json"), serialized);
  write(join(OUT.publicData, "translations/open-nbv/LICENSE.txt"), [
    edition.name, edition.credit, edition.sourceNotice, edition.trademarkNotice, edition.license, edition.licenseUrl,
    `Fonte e condições: ${edition.sourceUrl}`,
    "Texto preservado da fonte VPL; apenas a organização em arquivos JSON foi alterada.",
    "Alinhamento de versículos com a BLIVRE/OpenBible ainda não revisado. Não reutilize os índices de uma edição na outra.",
    "",
  ].join("\n"));
  return corpus;
}
