import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OUT, sha256 } from "../scripts/data/sources";
import { buildTranslations, loadOpenNbv, OPEN_NBV_SHA256, OPEN_NBV_SOURCE, parseTranslationVpl } from "../scripts/data/translations";
import type { Book } from "../src/lib/canon/types";
import { getTranslation, parseTranslationPath, translationPath, type TranslationId } from "../src/lib/translations";
import { translatedChapter, translatedVerse, translationBooks } from "../src/lib/translation-reading";

const canonical = JSON.parse(readFileSync(join(OUT.generated, "books.json"), "utf8")) as Book[];
const sourceFiles = unzipSync(readFileSync(OPEN_NBV_SOURCE));
const original = new TextDecoder("utf-8", { fatal: true }).decode(sourceFiles["poronbv_vpl.txt"]);
const originalRows = original.trimEnd().split(/\r?\n/).map((line) => {
  const match = /^(\S+) (\d+):(\d+) (.*)$/.exec(line)!;
  return { code: match[1], chapter: Number(match[2]), verse: Number(match[3]), text: match[4] };
});
const corpus = loadOpenNbv(canonical);

describe("Open NBV source integrity and edition positions", () => {
  it("preserves all 31,105 source positions and exact text without mutating the canonical grid", () => {
    expect(sha256(OPEN_NBV_SOURCE)).toBe(OPEN_NBV_SHA256);
    expect(corpus.counts).toEqual({ books: 66, chapters: 1189, verses: 31105 });
    expect(corpus.additionalReferences).toEqual(["JDG 5:32", "1SA 20:43", "3JO 1:15"]);
    expect(corpus.missingReferences).toEqual([]);
    const imported = corpus.books.flatMap((book, index) => corpus.files[index].chapters.flatMap((chapter, c) =>
      chapter.map((text, v) => ({ code: book.vpl, chapter: c + 1, verse: v + 1, text }))));
    expect(imported).toEqual(originalRows);
    expect(canonical.reduce((sum, book) => sum + book.verses.reduce((n, count) => n + count, 0), 0)).toBe(31102);
    expect(canonical.find((book) => book.osis === "3John")!.verses).toEqual([14]);
    expect(corpus.books.find((book) => book.osis === "3John")!.verses).toEqual([15]);
    const canonicalRuth = canonical.find((book) => book.osis === "Ruth")!;
    const editionRuth = corpus.books.find((book) => book.osis === "Ruth")!;
    expect(editionRuth.firstChapter).toBe(canonicalRuth.firstChapter);
    expect(editionRuth.firstVerse).toBe(canonicalRuth.firstVerse + 1);
  });

  it("publishes every source chapter in its own edition namespace and records provenance", () => {
    let checked = 0;
    for (const book of corpus.books) {
      expect(JSON.parse(readFileSync(join(OUT.generated, "translations/open-nbv", `${book.slug}.json`), "utf8")))
        .toEqual(corpus.files[book.index]);
      corpus.files[book.index].chapters.forEach((chapter, c) => {
        expect(JSON.parse(readFileSync(join(OUT.publicData, "translations/open-nbv", book.slug, `${c + 1}.json`), "utf8")))
          .toEqual(chapter);
        checked++;
      });
    }
    expect(checked).toBe(1189);
    expect(JSON.parse(readFileSync(join(OUT.generated, "translations/open-nbv-books.json"), "utf8"))).toEqual(corpus.books);
    const manifest = JSON.parse(readFileSync(join(OUT.generated, "translations/open-nbv-manifest.json"), "utf8"));
    expect(manifest.source.sha256).toBe(OPEN_NBV_SHA256);
    expect(manifest.textChanged).toBe(false);
    expect(manifest.alignment.status).toBe("unreviewed");
    expect(manifest.alignment.additionalReferences).toEqual(corpus.additionalReferences);
  });

  it("carries literal copyright, original-work, trademark and license notices with the public corpus", () => {
    const written = new Map<string, string>();
    buildTranslations(canonical, (path, value) => written.set(path, value));
    const license = written.get(join(OUT.publicData, "translations/open-nbv/LICENSE.txt"))!;
    const edition = getTranslation("open-nbv")!;
    expect(edition.credit).toBe("Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc.");
    expect(license).toContain(edition.credit);
    expect(license).toContain(edition.sourceNotice);
    expect(license).toContain(edition.trademarkNotice);
    expect(license).toContain(edition.licenseUrl);
    expect(written.size).toBe(66 + 1189 + 4);
  });

  it("does not infer semantic alignment from matching numbers (1 John 5:7–8)", async () => {
    const blivre = await translatedVerse("blivre", "1-joao", 5, 7);
    const nbv = await translatedVerse("open-nbv", "1-joao", 5, 7);
    expect(blivre).toContain("no céu");
    expect(nbv).toBe(originalRows.find((row) => row.code === "1JO" && row.chapter === 5 && row.verse === 7)!.text);
    expect(nbv).not.toContain("no céu");
    expect(getTranslation("open-nbv")!.verseAlignment).toBe("unreviewed");
  });
});

describe("strict VPL parsing", () => {
  const small: Book[] = [
    { ...canonical[0], verses: [1, 1] },
    { ...canonical[1], verses: [1], firstChapter: 2, firstVerse: 2 },
  ];
  const valid = "GEN 1:1  A primeira linha. \r\nGEN 1:2 Outra posição.\r\nGEN 2:1 Capítulo dois.\r\nEXO 1:1 Êxodo.\r\n";

  it("retains spacing, punctuation and extra numbered positions instead of trimming or truncating", () => {
    const parsed = parseTranslationVpl(valid, small);
    expect(parsed.files[0].chapters).toEqual([[" A primeira linha. ", "Outra posição."], ["Capítulo dois."]]);
    expect(parsed.additionalReferences).toEqual(["GEN 1:2"]);
  });

  it.each([
    ["duplicate", valid.replace("GEN 1:2", "GEN 1:1")],
    ["gap", valid.replace("GEN 1:2", "GEN 1:3")],
    ["unknown book", valid.replace("EXO", "XYZ")],
    ["empty verse", valid.replace("Outra posição.", "  ")],
    ["missing book", valid.replace("EXO 1:1 Êxodo.\r\n", "")],
    ["missing chapter", valid.replace("GEN 2:1 Capítulo dois.\r\n", "")],
    ["reordered books", "EXO 1:1 Êxodo.\n" + valid],
    ["extra chapter", valid.replace("GEN 2:1", "GEN 3:1")],
    ["leading zero", valid.replace("GEN 1:1", "GEN 01:1")],
  ])("rejects %s", (_, value) => expect(() => parseTranslationVpl(value, small)).toThrow("[translations]"));
});

describe("edition-aware paths and server reading", () => {
  it("round-trips both edition namespaces without requiring a corpus in the registry", () => {
    for (const id of ["blivre", "open-nbv"] as const) {
      expect(parseTranslationPath(translationPath(id))).toEqual({ id });
      expect(parseTranslationPath(translationPath(id, "3-joao"))).toEqual({ id, slug: "3-joao" });
      expect(parseTranslationPath(translationPath(id, "3-joao", 1, 15))).toEqual({ id, slug: "3-joao", chapter: 1, verse: 15 });
    }
    expect(getTranslation("unknown")).toBeNull();
    expect(() => translationPath("unknown" as TranslationId)).toThrow();
    expect(() => translationPath("open-nbv", "../joao", 1)).toThrow();
    expect(() => translationPath("open-nbv", "joao", 1.5)).toThrow();
    expect(() => translationPath("open-nbv", undefined, 1)).toThrow();
    expect(() => translationPath("open-nbv", "joao", undefined, 1)).toThrow();
  });

  it.each(["", "/", "//joao/1/1", "https://example.org/joao/1/1", "/ler/unknown/joao/1/1", "/ler/open-nbv/joao/01/1", "/ler/open-nbv/joao/1/0", "/ler/open-nbv/../joao/1/1", "/ler/open-nbv/joao/1/1?x=1", "/joao/1/1#v1", "/ler/open-nbv/joao/1/1/extra", "/joao%2f1/1"])("rejects noncanonical URL syntax: %s", (value) => {
    expect(parseTranslationPath(value)).toBeNull();
  });

  it("validates edition-specific coordinates and reads the exact selected edition", async () => {
    expect(translationBooks("open-nbv")).toEqual(corpus.books);
    expect(translationBooks("blivre")).toEqual(canonical);
    expect(translationBooks("unknown")).toBeNull();
    for (const [slug, code, chapter, verse] of [["juizes", "JDG", 5, 32], ["1-samuel", "1SA", 20, 43], ["3-joao", "3JO", 1, 15]] as const) {
      const expected = originalRows.find((row) => row.code === code && row.chapter === chapter && row.verse === verse)!.text;
      expect(await translatedVerse("open-nbv", slug, chapter, verse)).toBe(expected);
      expect(await translatedVerse("blivre", slug, chapter, verse)).toBeNull();
      expect(await translatedVerse("open-nbv", slug, chapter, verse + 1)).toBeNull();
    }
    expect(await translatedChapter("open-nbv", "genesis", 1)).toEqual(corpus.files[0].chapters[0]);
    expect(await translatedChapter("unknown", "genesis", 1)).toBeNull();
    expect(await translatedChapter("open-nbv", "../genesis", 1)).toBeNull();
    for (const chapter of [0, -1, 1.2, NaN, Infinity, 51]) expect(await translatedChapter("open-nbv", "genesis", chapter)).toBeNull();
    for (const verse of [0, -1, 1.2, NaN, Infinity, 32]) expect(await translatedVerse("open-nbv", "genesis", 1, verse)).toBeNull();
  });
});
