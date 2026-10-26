import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadBlivre, loadCanon } from "../scripts/data/canon";
import {
  alignInterlinearEditorial, buildInterlinear, extractInterlinearSources, INTERLINEAR_EDITORIAL_SOURCE,
  INTERLINEAR_SOURCE_COMMIT, INTERLINEAR_SOURCES, parseInterlinearRows,
  type InterlinearEditorial,
} from "../scripts/data/interlinear";
import { REPO, sha256 } from "../scripts/data/sources";
import { INTERLINEAR_REFERENCES, interlinearPathForReading } from "../src/lib/interlinear/paths";

const canon = loadCanon();
const blivre = loadBlivre(canon);
const sources = extractInterlinearSources();
const corpus = buildInterlinear(canon, blivre);
const editorial = JSON.parse(readFileSync(INTERLINEAR_EDITORIAL_SOURCE, "utf8")) as InterlinearEditorial;
const readingTexts = Object.fromEntries(corpus.passages.map((passage) => [passage.id, passage.readingText]));
const passage = (id: string) => corpus.passages.find((passage) => passage.id === id)!;

describe("interlinear source fidelity", () => {
  it("pins the source revision and checks the complete original files, not reconstructed strings", () => {
    expect(readFileSync(join(REPO, "fontes/stepbible/COMMIT"), "utf8").trim()).toBe(INTERLINEAR_SOURCE_COMMIT);
    for (const source of INTERLINEAR_SOURCES) expect(sha256(join(REPO, source.file))).toBe(source.sha256);
    expect(corpus.provenance.editorialSha256).toBe(sha256(INTERLINEAR_EDITORIAL_SOURCE));
    expect(corpus.provenance.license).toBe("CC BY 4.0");
    expect(corpus.provenance.derivedLicense).toBe("CC BY-SA 4.0");
    expect(corpus.provenance.derivedLicenseUrl).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(corpus.provenance.editorialStatus).toBe("study-glosses-not-scholarly-reviewed");
  });

  it("retains every selected original occurrence, lexical tag and source spelling without position-based gloss joins", () => {
    for (const source of INTERLINEAR_SOURCES) {
      const rawRows = new Map(readFileSync(join(REPO, source.file), "utf8").split(/\r?\n/)
        .map((line) => line.split("\t")).filter((row) => /#\d+=/.test(row[0])).map((row) => [row[0], row]));
      for (const item of corpus.passages.filter((item) => item.sourceFile === source.file)) {
        for (const token of item.tokens) {
          const row = rawRows.get(token.id)!;
          expect(row, token.id).toBeDefined();
          expect(token.sourceOriginal).toBe(row[1]);
          expect(token.sourceGloss).toBe(row[source.kind === "he" ? 3 : 2]);
          expect(token.sourceMeaningVariant ?? "").toBe(row[6]);
          expect(token.sourceSpellingVariant ?? "").toBe(row[7]);
          const expectedOriginal = source.kind === "he"
            ? row[1].replaceAll("/", "").replaceAll("\\", "")
            : row[1].slice(0, row[1].lastIndexOf(" (")).replaceAll("¶", "");
          expect(token.original).toBe(expectedOriginal);
          expect(token.gloss).toBe(editorial[item.id].tokens[token.id].gloss);
        }
      }
    }
  });

  it("preserves Hebrew versification and Psalm titles instead of shifting the word sequence", () => {
    expect(passage("salmos/22/1").sourceReference).toBe("Psa.22.1(22.2)");
    expect(passage("salmos/22/6").sourceReference).toBe("Psa.22.6(22.7)");
    expect(passage("salmos/23/1").tokens.map((token) => token.id)).toEqual([
      "Psa.23.1#03=L", "Psa.23.1#04=L", "Psa.23.1#05=L", "Psa.23.1#06=L",
    ]);
    const worm = passage("salmos/22/6").tokens[1];
    expect(worm.strongs).toEqual(["H8438B"]);
    expect(worm.sourceGloss).toBe("[am] a worm");
    expect(worm.gloss.toLocaleLowerCase("pt-BR")).toContain("verme");
    expect(worm.gloss.toLocaleLowerCase("pt-BR")).not.toContain("carmesim");
  });

  it("keeps Greek edition variants outside the selected reading and documents them", () => {
    const john = passage("joao/3/16");
    expect(john.excludedVariants.map((variant) => variant.id)).toEqual(["Jhn.3.16#11=ko"]);
    expect(john.tokens.some((token) => token.id === "Jhn.3.16#11=ko")).toBe(false);
    const mark = passage("marcos/15/34");
    expect(mark.tokens).toHaveLength(26);
    expect(mark.excludedVariants.map((variant) => variant.id)).toEqual(["Mrk.15.34#04=k", "Mrk.15.34#11=k"]);
    expect(mark.sourceNote).toContain("Mrk.15.34#04=k");
    for (const item of corpus.passages.filter((item) => item.language === "grc")) {
      expect(item.sourceNote).toContain("não é uma transcrição independente do SBLGNT");
      expect(item.tokens.every((token) => token.sourceEditions.split("+").includes("SBL"))).toBe(true);
    }
  });

  it("retains bound Hebrew segments and multiple Strong tags rather than flattening their grammar", () => {
    const beginning = passage("genesis/1/1").tokens[0];
    expect(beginning.strongs).toEqual(["H9003", "H7225G"]);
    expect(beginning.morphology).toBe("HR/Ncfsa");
    expect(beginning.sourceOriginal).toContain("/");
    expect(beginning.original).not.toContain("/");
    const compound = passage("mateus/27/46").tokens.find((token) => token.id.startsWith("Mat.27.46#22="))!;
    expect(compound.strongs).toEqual(["G2443", "G5101"]);
    expect(compound.morphology).toBe("CONJ + I-NSN");
    expect(passage("marcos/15/34").tokens.some((token) => token.morphology.endsWith("-ARAM"))).toBe(true);
  });

  it("uses exact BLIVRE comparison text without treating it as the interlinear Portuguese gloss", () => {
    for (const item of corpus.passages) {
      const book = canon.books.find((book) => book.slug === item.bookSlug)!;
      const gv = canon.chapterFirst[book.firstChapter + item.chapter - 1] + item.verse - 1;
      expect(item.readingText).toBe(blivre.text[gv]);
    }
  });
});

describe("explicit interlinear coverage and failures", () => {
  it("publishes only the covered occurrences and provides metadata-only summaries", () => {
    expect(corpus.passages.map((item) => item.id)).toEqual(INTERLINEAR_REFERENCES);
    expect(corpus.provenance.passageCount).toBe(22);
    expect(corpus.provenance.tokenCount).toBe(282);
    expect(new Set(corpus.passages.flatMap((item) => item.tokens.map((token) => token.id))).size).toBe(282);
    expect(corpus.summaries).toHaveLength(22);
    expect(corpus.summaries.every((summary) => !("tokens" in summary) && !("readingText" in summary))).toBe(true);
  });

  it("does not advertise missing verses, chapter-only links, edition namespaces or synthetic paths", () => {
    for (const id of INTERLINEAR_REFERENCES) expect(interlinearPathForReading(`/${id}`)).toBe(`/interlinear/${id}`);
    for (const path of ["/genesis/1/6", "/salmos/22/2", "/joao/1/6", "/joao/1", "/joao/01/1",
      "/traducao/open-nbv/joao/1/1", "/open-nbv/joao/1/1", "/joao/1/1?traducao=open-nbv", "/joao/1/1#2",
      "https://example.com/joao/1/1", "/joao/1/1/extra", "/joao/1/1/"]) {
      expect(interlinearPathForReading(path), path).toBeNull();
    }
  });

  it("fails closed for missing or surplus editorial tokens and unsupported passages", () => {
    const first = sources[0];
    const missing = structuredClone(editorial);
    delete missing[first.id].tokens[first.tokens[0].id];
    expect(() => alignInterlinearEditorial(sources, missing, readingTexts)).toThrow("Portuguese gloss missing");
    const extra = structuredClone(editorial);
    extra[first.id].tokens["Gen.1.1#99=L"] = { gloss: "inventado" };
    expect(() => alignInterlinearEditorial(sources, extra, readingTexts)).toThrow("editorial token not in source");
    expect(() => alignInterlinearEditorial(sources, { ...editorial, "genesis/1/6": editorial[first.id] }, readingTexts))
      .toThrow("editorial passage not in coverage");
    expect(() => alignInterlinearEditorial(sources, editorial, {})).toThrow("BLIVRE comparison text missing");
  });

  it("refuses malformed source rows, duplicates and unimplemented SBL reordering", () => {
    const text = readFileSync(join(REPO, INTERLINEAR_SOURCES[2].file), "utf8");
    const row = text.split(/\r?\n/).find((line) => line.startsWith("Jhn.1.1#01="))!;
    expect(() => parseInterlinearRows(`${row}\n${row}`, "grc", "Jhn.1.1")).toThrow("duplicate source row");
    expect(() => parseInterlinearRows(row.replace("+SBL+", "+SBL»1+"), "grc", "Jhn.1.1")).toThrow("word-order variant requires alignment");
    expect(() => parseInterlinearRows("Jhn.1.1#01=NKO\tbad", "grc", "Jhn.1.1")).toThrow("malformed source row");
    expect(() => parseInterlinearRows(row, "grc", "Jhn.1.2")).toThrow("source passage missing");
  });
});
