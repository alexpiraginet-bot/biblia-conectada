/** The source token, not a Portuguese word or a Strong-number dictionary entry. */
export type InterlinearToken = {
  id: string;
  original: string;
  transliteration: string;
  gloss: string;
  lemma: string;
  strongs: string[];
  morphology: string;
  grammarLabel?: string;
  note?: string;
  sourceGloss: string;
  sourceType: string;
  /** Unmodified source fields; display removes only the documented segmentation markers. */
  sourceOriginal: string;
  sourceEditions: string;
  sourceMeaningVariant?: string;
  sourceSpellingVariant?: string;
};

export type InterlinearPassageSummary = {
  id: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  reference: string;
  language: "he" | "grc";
  direction: "rtl" | "ltr";
  sourceEdition: string;
};

export type InterlinearVariant = {
  id: string;
  original: string;
  sourceType: string;
  editions: string;
  sourceGloss: string;
};

export type InterlinearPassage = InterlinearPassageSummary & {
  sourceReference: string;
  sourceNote?: string;
  contextNote?: string;
  readingText: string;
  tokens: InterlinearToken[];
  sourceUrl: string;
  licenseUrl: string;
  sourceFile: string;
  sourceSha256: string;
  /** Other readings stay visible in the source record, never joined into the selected text. */
  excludedVariants: InterlinearVariant[];
};

export type InterlinearCorpus = {
  passages: InterlinearPassage[];
  summaries: InterlinearPassageSummary[];
  provenance: {
    source: string;
    commit: string;
    credit: string;
    license: string;
    licenseUrl: string;
    derivedLicense: string;
    derivedLicenseUrl: string;
    sourceUrl: string;
    sources: { file: string; sha256: string }[];
    editorialFile: string;
    editorialSha256: string;
    editorialStatus: "study-glosses-not-scholarly-reviewed";
    changes: string[];
    passageCount: number;
    tokenCount: number;
  };
};
