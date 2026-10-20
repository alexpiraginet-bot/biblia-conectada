// Words of the BLIVRE text: a tokenizer, accent-insensitive matching and a Portuguese stopword list. Shared by the
// data pipeline (theme labels), the /palavra pages and any page that wants the words two passages have in common.
// A word here is only a word of the text: it is never called a theme (design/README.md §11; a theme comes from a source).
import { stripAccents } from "./canon/text";

/** Letters only; hyphens, digits, brackets and punctuation separate words ("disse-lhe" -> "disse", "lhe"). */
const WORD = /\p{L}+/gu;

/** The words of a text, in order, as written (case and accents kept). */
export function tokenize(text: string): string[] {
  return text.match(WORD) ?? [];
}

/** Matching key: lowercase without accents ("Misericórdia" -> "misericordia"). Also the URL slug of /palavra. */
export function wordKey(word: string): string {
  return stripAccents(word.toLowerCase());
}

/** A valid /palavra slug: lowercase ASCII letters, as wordKey writes them. */
export function isWordSlug(s: string): boolean {
  return /^[a-z]{2,40}$/.test(s);
}

// Function words of Portuguese, written as keys (no accents): articles, prepositions and their contractions,
// conjunctions, pronouns, possessives, demonstratives, common adverbs, and the forms of ser, estar, ter, haver.
// They carry grammar, not content, so they are never a theme label, never a /palavra page and never a shared word.
const STOPWORD_LIST = `
a o as os um uma uns umas
de do da dos das d em no na nos nas num numa nuns numas por pelo pela pelos pelas para pra pro com sem sob sobre
entre ate apos ante contra desde perante segundo conforme ao aos
e ou nem mas porem porque pois que se como quando onde quem qual quais cujo cuja cujos cujas quanto quanta quantos
quantas enquanto embora caso logo portanto contudo todavia entretanto senao conquanto
nao sim ja tambem tao tanto tanta tantos tantas mais menos muito muita muitos muitas pouco pouca poucos poucas todo
toda todos todas tudo nada cada qualquer quaisquer algum alguma alguns algumas nenhum nenhuma outro outra outros outras
mesmo mesma mesmos mesmas proprio propria proprios proprias tal tais
este esta estes estas esse essa esses essas aquele aquela aqueles aquelas isto isso aquilo
neste nesta nestes nestas nesse nessa nesses nessas naquele naquela naqueles naquelas nisto nisso naquilo
deste desta destes destas desse dessa desses dessas daquele daquela daqueles daquelas disto disso daquilo
dele dela deles delas nele nela neles nelas
eu tu ele ela nos vos eles elas me te lhe lhes mim ti si comigo contigo consigo conosco convosco lo la los las
meu minha meus minhas teu tua teus tuas seu sua seus suas nosso nossa nossos nossas vosso vossa vossos vossas
aqui ali la ai ca agora entao ainda sempre nunca jamais assim eis ate depois antes
ser sou es e somos sois sao era eras eramos ereis eram fui foste foi fomos fostes foram fora seja sejas sejamos
sejais sejam sera seras seremos sereis serao seria seriam sendo sido fosse fossem for forem
estar estou estas esta estamos estais estao estava estavam esteve estiveram estando estado
ter tenho tens tem temos tendes tinha tinhas tinhamos tinheis tinham teve tiveram tera terao tenha tenham tendo tido
haver hei has ha havemos haveis hao havia haviam houve houveram havera haverao haja hajam havendo havido
`;

export const STOPWORDS: ReadonlySet<string> = new Set(STOPWORD_LIST.split(/\s+/).filter(Boolean));

export function isStopword(key: string): boolean {
  return STOPWORDS.has(key);
}

/** Keys of the content words of a text (stopwords and one-letter words out), each once. */
export function contentKeys(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of tokenize(text)) {
    const k = wordKey(w);
    if (k.length > 1 && !STOPWORDS.has(k)) out.add(k);
  }
  return out;
}

/** True when the text has the word, ignoring case and accents ("Luz" and "luz" match "luz"; "luzes" does not). */
export function containsWord(text: string, key: string): boolean {
  return tokenize(text).some((w) => wordKey(w) === key);
}

/**
 * The text cut around each occurrence of a word, matched as containsWord matches it: [text, word, text, …], the
 * occurrences at the odd places, as written. Joined back, the parts give the text unchanged.
 */
export function splitOnWord(text: string, key: string): string[] {
  const out: string[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (wordKey(m[0]) !== key) continue;
    out.push(text.slice(last, m.index), m[0]);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export type SharedWord = {
  key: string;
  /** the word as the first text writes it (first occurrence, lowercase unless every occurrence is capitalised) */
  form: string;
};

/**
 * Content words two texts have in common, in the order they first appear in the first text. Exact words only (no
 * plural or verb forms joined), accents and case ignored. "Palavras em comum" on a page; never a "tema".
 */
export function palavrasEmComum(textA: string, textB: string): SharedWord[] {
  const inB = contentKeys(textB);
  const seen = new Set<string>();
  const out: SharedWord[] = [];
  for (const w of tokenize(textA)) {
    const key = wordKey(w);
    if (seen.has(key) || !inB.has(key) || key.length < 2 || STOPWORDS.has(key)) continue;
    seen.add(key);
    out.push({ key, form: w });
  }
  // a word capitalised only because it starts a sentence is shown in lowercase; a name keeps its capital
  const lowerInA = new Set(tokenize(textA).filter((w) => w === w.toLowerCase()).map(wordKey));
  const lowerInB = new Set(tokenize(textB).filter((w) => w === w.toLowerCase()).map(wordKey));
  return out.map((s) => (lowerInA.has(s.key) || lowerInB.has(s.key) ? { ...s, form: s.form.toLowerCase() } : s));
}
