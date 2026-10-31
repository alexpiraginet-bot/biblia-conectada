import type { Book } from "../canon/types";

export type LiturgySelection = {
  book: Book;
  coordinates: { chapter: number; verse: number }[];
  notice?: string;
};
export type LiturgyReference = LiturgySelection | { unavailableReason: string };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s.]/g, "").toLowerCase();
const EXTRA_ALIASES: Record<string, string> = {
  "1cor": "1Cor", "2cor": "2Cor", "1tes": "1Thess", "2tes": "2Thess",
  "eclo": "Sir", "sir": "Sir", "sb": "Wis", "tb": "Tob", "jdt": "Jdt", "br": "Bar", "1mc": "1Macc", "2mc": "2Macc",
};
const UNALIGNED = "A numeração desta passagem não foi alinhada à edição do app. Confira a leitura no site da CNBB.";

/** Fail closed for unsupported notation; never turn an unparsed citation into a different reading. */
export function resolveLiturgyReference(reference: string, books: readonly Book[]): LiturgyReference {
  const citation = reference.replace(/\s*\(Forma (?:Longa|Breve)\)\s*$/i, "");
  const match = /^([1-3]?\s*[^\d,()]+?)\s*(\d{1,3})(?:\s*\((\d{1,3})\))?(?:\s*,\s*(.+))?$/.exec(citation);
  if (!match) return { unavailableReason: UNALIGNED };
  const [, name, chapterNumber, parallelNumber, verseExpression] = match;
  const exact = name.trim().toLocaleLowerCase("pt-BR");
  const normalized = normalize(name);
  const book = books.find((candidate) => [candidate.name, candidate.abbr, ...candidate.aliases].some((alias) => alias.toLocaleLowerCase("pt-BR") === exact))
    ?? books.find((candidate) => candidate.osis === EXTRA_ALIASES[normalized])
    ?? books.find((candidate) => [candidate.name, candidate.abbr, ...candidate.aliases].some((alias) => normalize(alias) === normalized));
  if (!book) return { unavailableReason: "Este livro não está na edição BLIVRE disponível no app. Leia esta passagem no site da CNBB." };

  const chapter = Number(parallelNumber ?? chapterNumber);
  if (parallelNumber && book.osis !== "Ps") return { unavailableReason: UNALIGNED };
  if (!book.verses[chapter - 1]) return { unavailableReason: UNALIGNED };

  // Catholic Psalm references can number the title. Only the explicitly paired Hebrew chapter is used;
  // the whole Psalm is shown as context instead of claiming an unreviewed verse-level alignment.
  if (book.osis === "Ps") {
    if (!parallelNumber) return { unavailableReason: UNALIGNED };
    return {
      book,
      coordinates: Array.from({ length: book.verses[chapter - 1] }, (_, i) => ({ chapter, verse: i + 1 })),
      notice: `Salmo completo para contexto na BLIVRE (Salmos ${chapter}). A seleção de versos, a numeração e o refrão do lecionário podem ser diferentes; confira a forma responsorial na CNBB.`,
    };
  }

  // Greek additions make a same-number match unsafe without a reviewed versification map.
  if (book.osis === "Esth" || book.osis === "Dan") return { unavailableReason: UNALIGNED };
  if (!verseExpression) return { unavailableReason: UNALIGNED };
  const expression = verseExpression.replace(/\s+/g, "").replace(/[–—]/g, "-");
  const coordinates: { chapter: number; verse: number }[] = [];
  let currentChapter = chapter;
  for (const segment of expression.split(".")) {
    // 1.7-11; 52,13-53,12; letters denote only part of a verse, which is expanded and labelled.
    const part = /^(?:(\d{1,3}),)?(\d{1,3})[a-f]*(?:-(?:(\d{1,3}),)?(\d{1,3})[a-f]*)?$/.exec(segment);
    if (!part) return { unavailableReason: UNALIGNED };
    const startChapter = part[1] ? Number(part[1]) : currentChapter;
    const startVerse = Number(part[2]);
    const endChapter = part[3] ? Number(part[3]) : startChapter;
    const endVerse = part[4] ? Number(part[4]) : startVerse;
    if (startChapter < 1 || endChapter < startChapter || endChapter - startChapter > 4
      || !book.verses[startChapter - 1] || !book.verses[endChapter - 1]
      || startVerse < 1 || endVerse < 1 || startVerse > book.verses[startChapter - 1] || endVerse > book.verses[endChapter - 1]
      || (startChapter === endChapter && endVerse < startVerse)) return { unavailableReason: UNALIGNED };
    for (let c = startChapter; c <= endChapter; c++) {
      for (let v = c === startChapter ? startVerse : 1; v <= (c === endChapter ? endVerse : book.verses[c - 1]); v++) {
        if (!coordinates.some((row) => row.chapter === c && row.verse === v)) coordinates.push({ chapter: c, verse: v });
        if (coordinates.length > 200) return { unavailableReason: UNALIGNED };
      }
    }
    currentChapter = endChapter;
  }
  if (!coordinates.length) return { unavailableReason: UNALIGNED };
  return {
    book, coordinates,
    notice: /[a-f]/.test(expression)
      ? "A referência indica partes de versículos. Aqui eles aparecem inteiros na BLIVRE, para contexto; o recorte da Missa está na CNBB."
      : undefined,
  };
}
