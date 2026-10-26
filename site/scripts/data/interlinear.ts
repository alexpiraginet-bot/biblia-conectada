// Builds a small, explicit study corpus from pinned STEPBible rows and separately authored PT glosses.
// No runtime translation, Strong-number dictionary fallback or cross-edition positional joining.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INTERLINEAR_REFERENCES } from "../../src/lib/interlinear/paths";
import type { InterlinearCorpus, InterlinearPassage, InterlinearPassageSummary, InterlinearToken, InterlinearVariant } from "../../src/lib/interlinear/types";
import { REPO, SITE } from "./sources";
import type { Blivre, Canon } from "./canon";

export const INTERLINEAR_SOURCE_COMMIT = "ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d";
export const INTERLINEAR_SOURCE_URL = "https://github.com/STEPBible/STEPBible-Data";
const SOURCE_DIR = "fontes/stepbible/Translators Amalgamated OT+NT/";
export const INTERLINEAR_SOURCES = [
  { file: `${SOURCE_DIR}TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`, sha256: "e9b8546ee48fe0bfc57c3b70f5f40e98d96580e803526d19026224e31753368b", kind: "he" },
  { file: `${SOURCE_DIR}TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`, sha256: "bb508af3af07822fca84cc43a0eba79eb70eecf672aabc0245b8d8cecf329d96", kind: "he" },
  { file: `${SOURCE_DIR}TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`, sha256: "ab8eaaeb68e17a1dcfa34e1e9350358f22f03bc2a97244d848750ad81044bc8e", kind: "grc" },
] as const;
export const INTERLINEAR_EDITORIAL_SOURCE = join(SITE, "src/data/interlinear-editorial.json");
export const INTERLINEAR_INPUTS = [
  ...INTERLINEAR_SOURCES.map((source) => join(REPO, source.file)),
  join(REPO, "fontes/stepbible/COMMIT"), join(REPO, "fontes/SHA256SUMS"), INTERLINEAR_EDITORIAL_SOURCE,
];
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const BOOKS: Record<string, { code: string; label: string; source: number }> = {
  genesis: { code: "Gen", label: "Gênesis", source: 0 },
  salmos: { code: "Psa", label: "Salmos", source: 1 },
  mateus: { code: "Mat", label: "Mateus", source: 2 },
  marcos: { code: "Mrk", label: "Marcos", source: 2 },
  joao: { code: "Jhn", label: "João", source: 2 },
};

export type EditorialToken = { gloss: string; grammarLabel?: string; note?: string };
export type InterlinearEditorial = Record<string, {
  contextNote?: string;
  tokens: Record<string, EditorialToken>;
}>;
export type SourceToken = Omit<InterlinearToken, "gloss" | "grammarLabel" | "note">;
export type SourcePassage = Omit<InterlinearPassage, "tokens" | "readingText" | "contextNote"> & { tokens: SourceToken[] };

function fail(message: string): never { throw new Error(`[interlinear] ${message}`); }
function digest(value: Uint8Array | string): string { return createHash("sha256").update(value).digest("hex"); }

/** Source IDs retain the edition tag and original position, including gaps caused by omitted variants. */
export function parseInterlinearRows(text: string, sourceKind: "he" | "grc", reference: string): {
  sourceReference: string;
  tokens: SourceToken[];
  excludedVariants: InterlinearVariant[];
} {
  const rows = text.split(/\r?\n/).filter((line) => {
    const match = /^([A-Za-z0-9]+\.\d+\.\d+)(?:[([{]|#)/.exec(line);
    return match?.[1] === reference;
  }).map((line) => line.split("\t"));
  if (!rows.length) fail(`source passage missing: ${reference}`);
  const tokens: SourceToken[] = [];
  const excludedVariants: InterlinearVariant[] = [];
  const ids = new Set<string>();
  const positions = new Set<string>();
  let sourceReference = "";
  for (const columns of rows) {
    const match = /^(.+)#(\d+)=(.+)$/.exec(columns[0]);
    if (!match || columns.length < (sourceKind === "he" ? 12 : 8)) fail(`malformed source row: ${columns[0]}`);
    const [, rawReference, position, sourceType] = match;
    if (ids.has(columns[0])) fail(`duplicate source row: ${columns[0]}`);
    ids.add(columns[0]);
    if (sourceReference && sourceReference !== rawReference) fail(`mixed versification within ${reference}`);
    sourceReference = rawReference;
    const editions = sourceKind === "he" ? sourceType : columns[5];
    const sourceGloss = columns[sourceKind === "he" ? 3 : 2];
    const selected = sourceKind === "he"
      ? /^[LQ]/.test(sourceType)
      : editions.split("+").some((edition) => /^SBL(?:[«»]\d+)?$/.test(edition));
    if (!selected) {
      excludedVariants.push({ id: columns[0], original: columns[1], sourceType, editions, sourceGloss });
      continue;
    }
    // The pilot has no moved SBL tokens. Refuse a future expansion until its ordering is implemented.
    if (sourceKind === "grc" && /(?:^|\+)SBL[«»]/.test(editions)) fail(`SBL word-order variant requires alignment: ${columns[0]}`);
    if (positions.has(position)) fail(`two selected readings at ${reference}#${position}`);
    positions.add(position);
    let original: string, transliteration: string, lemma: string, morphology: string, strongs: string[];
    if (sourceKind === "he") {
      original = columns[1].replace(/[\/\\]/g, "");
      transliteration = columns[2];
      strongs = [...new Set(columns[4].match(/H\d{4}[A-Z]*/g) ?? [])];
      morphology = columns[5];
      lemma = [...columns[11].matchAll(/H\d{4}[A-Z]*=([^=]+)=/g)].map((m) => m[1]).join(" + ");
    } else {
      const greek = /^(.*?) \(([^()]*)\)$/.exec(columns[1]);
      if (!greek) fail(`Greek/transliteration field malformed: ${columns[0]}`);
      original = greek[1].replace(/¶/g, "");
      transliteration = greek[2];
      strongs = [...new Set(columns[3].match(/G\d{4}[A-Z]*/g) ?? [])];
      const tags = columns[3].split(" + ");
      if (tags.some((tag) => !/^G\d{4}[A-Z]*=\S+$/.test(tag))) fail(`Greek morphology malformed: ${columns[0]}`);
      morphology = tags.map((tag) => tag.slice(tag.indexOf("=") + 1)).join(" + ");
      lemma = columns[4].slice(0, columns[4].indexOf("="));
    }
    if (!original || !transliteration || !lemma || !morphology || !strongs.length || !sourceGloss) fail(`incomplete token: ${columns[0]}`);
    tokens.push({
      id: columns[0], original, transliteration, sourceGloss, strongs, lemma, morphology, sourceType,
      sourceOriginal: columns[1], sourceEditions: editions,
      ...(columns[6] ? { sourceMeaningVariant: columns[6] } : {}),
      ...(columns[7] ? { sourceSpellingVariant: columns[7] } : {}),
    });
  }
  if (!tokens.length) fail(`no selected reading: ${reference}`);
  return { sourceReference, tokens, excludedVariants };
}

/** All input files must match both the pin and the existing repository source manifest. */
export function extractInterlinearSources(): SourcePassage[] {
  const recordedCommit = readFileSync(join(REPO, "fontes/stepbible/COMMIT"), "utf8").trim();
  if (recordedCommit !== INTERLINEAR_SOURCE_COMMIT) fail("STEPBible commit changed; review the corpus before rebuilding");
  const sourceManifest = readFileSync(join(REPO, "fontes/SHA256SUMS"), "utf8");
  const contents = INTERLINEAR_SOURCES.map((source) => {
    const bytes = readFileSync(join(REPO, source.file));
    if (digest(bytes) !== source.sha256) fail(`source SHA-256 mismatch: ${source.file}`);
    if (!sourceManifest.split(/\r?\n/).includes(`${source.sha256}  ${source.file.slice("fontes/".length)}`)) {
      fail(`source missing from SHA256SUMS: ${source.file}`);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  });
  return INTERLINEAR_REFERENCES.map((id) => {
    const [bookSlug, chapterString, verseString] = id.split("/");
    const chapter = Number(chapterString), verse = Number(verseString);
    const book = BOOKS[bookSlug];
    const source = INTERLINEAR_SOURCES[book.source];
    const parsed = parseInterlinearRows(contents[book.source], source.kind, `${book.code}.${chapter}.${verse}`);
    const hebrew = source.kind === "he";
    let sourceNote = hebrew
      ? "Texto hebraico do TAHOT, baseado no Códice de Leningrado. A seleção usa L e Q (qere), quando presente; não mistura o ketiv alternativo. As barras de segmentação foram retiradas da exibição; letras, sinais e IDs da fonte foram preservados."
      : "Seleção das leituras marcadas SBL no TAGNT. O TAGNT usa grafia de base NA28 e pontuação THGNT; esta seleção não é uma transcrição independente do SBLGNT. Variantes da fonte permanecem nos dados de cada palavra.";
    if (parsed.sourceReference.includes("(")) sourceNote += ` Numeração da fonte: ${parsed.sourceReference}; entre parênteses aparece a referência hebraica.`;
    if (id === "salmos/23/1") sourceNote += " O título do salmo fica em 23:0 na fonte; este versículo começa no token 03.";
    if (parsed.excludedVariants.length) {
      sourceNote += ` Leituras não incluídas nesta seleção: ${parsed.excludedVariants.map((variant) => `${variant.id} [${variant.editions}]`).join("; ")}.`;
    }
    const sourcePath = source.file.slice("fontes/stepbible/".length).split("/").map(encodeURIComponent).join("/");
    return {
      id, bookSlug, chapter, verse, reference: `${book.label} ${chapter}:${verse}`,
      language: source.kind, direction: hebrew ? "rtl" : "ltr",
      sourceEdition: hebrew ? "STEPBible TAHOT · hebraico" : "STEPBible TAGNT · seleção SBL",
      sourceNote, sourceUrl: `${INTERLINEAR_SOURCE_URL}/blob/${INTERLINEAR_SOURCE_COMMIT}/${sourcePath}`,
      licenseUrl: LICENSE_URL, sourceFile: source.file, sourceSha256: source.sha256, ...parsed,
    };
  });
}

/** Exact occurrence IDs are required: missing, surplus and positional substitutions fail closed. */
export function alignInterlinearEditorial(sources: SourcePassage[], editorial: InterlinearEditorial, readingTexts: Record<string, string>): InterlinearPassage[] {
  const expectedPassages = new Set(sources.map((passage) => passage.id));
  for (const id of Object.keys(editorial)) if (!expectedPassages.has(id)) fail(`editorial passage not in coverage: ${id}`);
  return sources.map((passage) => {
    const entry = editorial[passage.id];
    if (!entry || !entry.tokens) fail(`editorial passage missing: ${passage.id}`);
    const readingText = readingTexts[passage.id];
    if (typeof readingText !== "string" || !readingText.trim()) fail(`BLIVRE comparison text missing: ${passage.id}`);
    const expectedTokens = new Set(passage.tokens.map((token) => token.id));
    for (const id of Object.keys(entry.tokens)) if (!expectedTokens.has(id)) fail(`editorial token not in source: ${id}`);
    const tokens = passage.tokens.map((token): InterlinearToken => {
      const gloss = entry.tokens[token.id];
      if (!gloss || typeof gloss.gloss !== "string" || !gloss.gloss.trim()) fail(`Portuguese gloss missing: ${token.id}`);
      if (gloss.grammarLabel !== undefined && typeof gloss.grammarLabel !== "string") fail(`invalid grammar label: ${token.id}`);
      if (gloss.note !== undefined && typeof gloss.note !== "string") fail(`invalid editorial note: ${token.id}`);
      return { ...token, gloss: gloss.gloss, ...(gloss.grammarLabel ? { grammarLabel: gloss.grammarLabel } : {}), ...(gloss.note ? { note: gloss.note } : {}) };
    });
    return { ...passage, readingText, ...(entry.contextNote ? { contextNote: entry.contextNote } : {}), tokens };
  });
}

export function buildInterlinear(canon: Canon, blivre: Blivre): InterlinearCorpus {
  const editorialFile = "src/data/interlinear-editorial.json";
  const editorialBytes = readFileSync(INTERLINEAR_EDITORIAL_SOURCE);
  const editorial = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(editorialBytes)) as InterlinearEditorial;
  const sources = extractInterlinearSources();
  const readingTexts = Object.fromEntries(sources.map((passage) => {
    const book = canon.books.find((book) => book.slug === passage.bookSlug);
    if (!book || passage.verse > book.verses[passage.chapter - 1]) fail(`BLIVRE reference missing: ${passage.id}`);
    const gv = canon.chapterFirst[book.firstChapter + passage.chapter - 1] + passage.verse - 1;
    return [passage.id, blivre.text[gv]];
  }));
  const passages = alignInterlinearEditorial(sources, editorial, readingTexts);
  const summaries = passages.map(({ id, bookSlug, chapter, verse, reference, language, direction, sourceEdition }): InterlinearPassageSummary =>
    ({ id, bookSlug, chapter, verse, reference, language, direction, sourceEdition }));
  return {
    passages, summaries,
    provenance: {
      source: "STEPBible TAHOT / TAGNT", commit: INTERLINEAR_SOURCE_COMMIT,
      credit: "STEP Bible (STEPBible.org), baseado no trabalho da Tyndale House, Cambridge. Dados sob CC BY 4.0.",
      license: "CC BY 4.0", licenseUrl: LICENSE_URL, sourceUrl: INTERLINEAR_SOURCE_URL,
      derivedLicense: "CC BY-SA 4.0", derivedLicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      sources: INTERLINEAR_SOURCES.map(({ file, sha256 }) => ({ file, sha256 })),
      editorialFile: `site/${editorialFile}`, editorialSha256: digest(editorialBytes),
      editorialStatus: "study-glosses-not-scholarly-reviewed",
      changes: [
        "Recorte explícito de passagens; no hebraico, seleção L/Q; no grego, leituras marcadas SBL no TAGNT, com variantes preservadas.",
        "Na exibição hebraica, remoção de / e \\ que delimitam segmentos; no grego, separação da transliteração e remoção do marcador de parágrafo ¶.",
        "Glosas e notas em português preparadas com apoio de IA para estudo na Bíblia Conectada, ainda sem revisão especializada; não são parte da fonte STEPBible nem uma tradução certificada. O texto corrido de comparação é da Bíblia Livre, preservado sem alterações e não alinhado palavra a palavra.",
      ],
      passageCount: passages.length,
      tokenCount: passages.reduce((total, passage) => total + passage.tokens.length, 0),
    },
  };
}
