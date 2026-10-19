/** One of the 66 books, as written by scripts/build-data.ts to src/data/generated/books.json. */
export type Book = {
  /** 0–65, canonical order of estudos/biblia-referencias/data/stats.json */
  index: number;
  /** OSIS id used by OpenBible.info ("Isa") */
  osis: string;
  /** book code in the BLIVRE VPL file ("ISA") */
  vpl: string;
  /** Portuguese name from stats.json books_pt ("Isaías") */
  name: string;
  /** URL segment derived from the name ("isaias") */
  slug: string;
  /** display abbreviation ("Is") */
  abbr: string;
  /** every other accepted abbreviation, as authored in src/lib/canon/aliases.ts */
  aliases: string[];
  testament: "AT" | "NT";
  /** verses per chapter (KJV/OpenBible grid); verses[0] is chapter 1 */
  verses: number[];
  /** global chapter index (0–1188) of chapter 1 */
  firstChapter: number;
  /** global verse index (0–31101) of chapter 1, verse 1 */
  firstVerse: number;
};

/** A parsed reference. `verse`/`verseEnd` are absent for a whole chapter; `chapterEnd` marks a chapter range. */
export type Ref = {
  book: Book;
  chapter: number;
  chapterEnd?: number;
  verse?: number;
  verseEnd?: number;
};
