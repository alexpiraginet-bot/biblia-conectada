// What the sculpture's field asks for (/arcos): a verse or a chapter ("Is 53:5", "Jo 3"), the path between two verses
// ("Gn 3:15 até Ap 12:9", also "->" or ">"), or a word of the text (anything without a number), with the words that say
// what is wrong. Loaded when the field is first used: the reference parser stays out of the page's first script.
import { createReferenceParser } from "@/lib/canon/reference";
import { BOOKS } from "@/lib/community/books-client";
import { verseOf, WORD_MAX, type Sel } from "./state";

const parse = createReferenceParser(BOOKS);
/** "Gn 3:15 até Ap 12:9", "Gn 3:15 -> Ap 12:9": the two ends of a path */
const PATH_SPLIT = /\s+(?:até|ate)\s+|\s*(?:->|→|>)\s*/i;

export type Asked = { sel: NonNullable<Sel> } | { error: string };

export function readQuery(input: string): Asked {
  const raw = input.trim().replace(/\s+/g, " ");
  const ends = raw.split(PATH_SPLIT);
  if (ends.length === 2) {
    const [a, b] = ends.map((s) => parse(s));
    if (a.ok && b.ok && a.ref.verse && b.ref.verse) {
      return { sel: { kind: "path", from: verseOf(a.ref.book, a.ref.chapter, a.ref.verse), to: verseOf(b.ref.book, b.ref.chapter, b.ref.verse) } };
    }
    return { error: "Para um caminho, escreva dois versículos: “Gn 3:15 até Ap 12:9”." };
  }
  if (raw && !/\d/.test(raw)) {
    return raw.length > WORD_MAX ? { error: `Escreva até ${WORD_MAX} letras.` } : { sel: { kind: "word", q: raw } };
  }
  const r = raw ? parse(raw) : null;
  if (!r || !r.ok) {
    return {
      error: !r
        ? "Escreva um versículo: “Is 53:5”, “Jo 3:16”."
        : r.error === "book" || r.error === "ambiguous"
          ? "Não achei esse livro. Tente a abreviação: “Gn”, “Sl”, “Jo”."
          : r.error === "chapter"
            ? "Esse capítulo não existe nesse livro."
            : r.error === "verse"
              ? "Esse versículo não existe nesse capítulo."
              : "Escreva livro, capítulo e versículo: “Is 53:5”.",
    };
  }
  const { book, chapter, verse } = r.ref;
  return { sel: verse ? { kind: "verse", gv: verseOf(book, chapter, verse) } : { kind: "chapter", ci: book.firstChapter + chapter - 1 } };
}

/** The other end of a path from verse `from`, typed in its panel: the path, or what is wrong. */
export function readPathEnd(from: number, input: string): Asked {
  const r = parse(input.trim());
  if (!r.ok || !r.ref.verse) return { error: "Escreva um versículo: “Ap 12:9”." };
  const to = verseOf(r.ref.book, r.ref.chapter, r.ref.verse);
  return to === from ? { error: "Escolha outro versículo." } : { sel: { kind: "path", from, to } };
}
