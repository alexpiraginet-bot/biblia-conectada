import "server-only";
import { createReferenceParser } from "@/lib/canon/reference";
import type { Book } from "@/lib/canon/types";
import { translatedChapter, translationBooks } from "@/lib/translation-reading";
import { getTranslation, translationPath, type TranslationId } from "@/lib/translations";
import type { AssistantCitation } from "@/lib/assistant/types";
import type { CoracaoInput, CoracaoSuccess } from "./types";

type Coordinate = readonly [string, number, number];
type Topic = { match: RegExp; passages: readonly Coordinate[] };
/** Editorial search expansion, not a graph or an assertion of verse alignment between editions.
 * Coordinates are independently loaded from the requested edition; surrounding text is always supplied.
 */
export const SEARCH_TOPICS: readonly Topic[] = [
  { match: /\b(misteri\w*|segred\w*|revel\w*|desconhec\w*)\b|(?:conhec\w*|sab\w*|entend\w*|compreend\w*).{0,35}(?:tudo|limit\w*|deus)|(?:deus|limit\w*).{0,35}(?:conhec\w*|sab\w*|entend\w*|compreend\w*)/, passages: [["deuteronomio",29,29],["romanos",11,33],["eclesiastes",3,11],["isaias",55,8],["joao",16,12],["marcos",13,32],["1-corintios",13,9],["jo",38,4],["proverbios",25,2]] },
  { match: /\b(ansied\w*|ansios\w*|preocup\w*|medo|temor|insegur\w*)\b/, passages: [["mateus",6,25],["mateus",6,34],["filipenses",4,6],["joao",14,27]] },
  { match: /\b(hater\w*|odio|odiad\w*|ofens\w*|insult\w*|xing\w*|humilh\w*|comentario\w*|inimig\w*|vingan\w*|brig\w*|conflit\w*|discuss\w*)\b/, passages: [["mateus",5,44],["lucas",6,27],["joao",18,23],["mateus",18,15]] },
  { match: /\b(abus\w*|agress\w*|violen\w*|ameac\w*|perigo|bateu|espanc\w*)\b/, passages: [["mateus",10,23],["joao",18,23],["lucas",10,33]] },
  { match: /\b(luto|morte|morreu|perdi|saudade|chor\w*|triste\w*|sofr\w*)\b/, passages: [["joao",11,35],["mateus",5,4],["salmos",34,18],["joao",16,33]] },
  { match: /\b(perdo\w*|culpa\w*|arrepend\w*|errei|pecad\w*)\b/, passages: [["lucas",15,20],["mateus",18,21],["joao",8,11],["romanos",8,1]] },
  { match: /\b(solidao|sozinh\w*|abandon\w*|rejeit\w*)\b/, passages: [["joao",14,18],["mateus",28,20],["salmos",23,4]] },
  { match: /\b(decis\w*|escolh\w*|sabedoria|orient\w*|caminho)\b/, passages: [["tiago",1,5],["mateus",7,24],["lucas",14,28]] },
  { match: /\b(esperan\w*|desanim\w*|cansad\w*|cansac\w*|descanso|sobrecarreg\w*)\b/, passages: [["mateus",11,28],["joao",16,33],["romanos",15,13]] },
  { match: /\b(amor|amar|amamos|caridad\w*|compaix\w*)\b/, passages: [["joao",13,34],["mateus",22,37],["1-corintios",13,4],["lucas",10,33]] },
  { match: /\b(dinheiro|riquez\w*|avare\w*|gananci\w*|divid\w*)\b/, passages: [["mateus",6,24],["lucas",12,15],["1-timoteo",6,10]] },
];

const GOSPELS = new Set(["mateus", "marcos", "lucas", "joao"]);
const STOP = new Set("a o as os de da do das dos e em no na nos nas um uma uns umas que se por para com ao aos ate eu tu ele ela eles elas meu minha meus minhas seu sua seus suas voce voces me te lhe nos isto isso esse essa esses essas aquele aquela aqui ali ha ser sou somos era foi sao esta estar estou como qual quais quando onde porque porquanto pode posso poderia sobre algo tudo nada coisa coisas quero queria procuro lembro lembrar diz fala falar biblia biblico biblica versiculo versiculos passagem passagens deus jesus senhor sentido ajuda ajudar gostaria saber tem tenho tinha tendo uma muito mais menos sim nao tambem ja ainda so lidar seria lugar diante luz".split(" "));
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
function terms(text: string): string[] {
  return normalizeSearch(text).match(/[a-z]+/g)?.filter((word) => word.length >= 3 && !STOP.has(word)) ?? [];
}
type Row = { book: Book; chapter: number; verse: number; text: string; normalized: string; words: number };
type Corpus = { rows: Row[]; postings: Map<string, number[]>; coordinates: Map<string, number>; books: Book[] };
const corpora = new Map<string, Promise<Corpus>>();
const coordinate = (slug: string, chapter: number, verse: number) => `${slug}:${chapter}:${verse}`;

/** Only immutable licensed corpus is cached; user questions/history are never stored here. */
async function corpus(edition: TranslationId, gospelsOnly: boolean): Promise<Corpus> {
  const key = `${edition}:${gospelsOnly}`;
  let pending = corpora.get(key);
  if (!pending) {
    pending = (async () => {
      const books = translationBooks(edition)!.filter((b) => !gospelsOnly || GOSPELS.has(b.slug));
      const rows: Row[] = [], postings = new Map<string, number[]>(), coordinates = new Map<string, number>();
      // Keep canonical order deterministic and avoid loading all book modules concurrently.
      for (const book of books) {
        for (let chapter = 1; chapter <= book.verses.length; chapter++) {
          const texts = await translatedChapter(edition, book.slug, chapter);
          if (!texts) throw new Error("Missing licensed corpus chapter");
          texts.forEach((text, index) => {
            if (!text.trim()) return;
            const words = terms(text), id = rows.length;
            rows.push({ book, chapter, verse: index + 1, text, normalized: normalizeSearch(text), words: Math.max(words.length, 1) });
            coordinates.set(coordinate(book.slug, chapter, index + 1), id);
            for (const word of new Set(words)) {
              const found = postings.get(word);
              if (found) found.push(id); else postings.set(word, [id]);
            }
          });
        }
      }
      return { rows, postings, coordinates, books };
    })();
    corpora.set(key, pending);
    pending.catch(() => { if (corpora.get(key) === pending) corpora.delete(key); });
  }
  return pending;
}

export type CoracaoGrounding = {
  citations: AssistantCitation[];
  source: CoracaoSuccess["source"];
  contexts: { reference: string; from: number; to: number; selected: string[] }[];
  scope: string;
};

export function coracaoSource(editionId: TranslationId): CoracaoSuccess["source"] {
  const edition = getTranslation(editionId)!;
  return { name: edition.name, credit: edition.credit, license: edition.license, licenseUrl: edition.licenseUrl,
    ...(edition.sourceNotice ? { sourceNotice: edition.sourceNotice } : {}),
    ...(edition.trademarkNotice ? { trademarkNotice: edition.trademarkNotice } : {}) };
}

export async function retrieveCoracao(input: CoracaoInput): Promise<CoracaoGrounding> {
  const data = await corpus(input.translation, input.mode === "jesus");
  const parse = createReferenceParser(data.books, { minPrefix: 4 });
  const current = normalizeSearch(input.question);
  // A short follow-up may inherit the last user's topic. Assistant history is never indexed as evidence.
  const followup = terms(input.question).length < 3 && !!input.history?.length;
  const search = followup ? `${input.history!.map((turn) => turn.question).join(" ")} ${input.question}` : input.question;
  const another = followup && /\b(outr[oa]s?|mais passag\w*|mais algum\w*)\b/.test(current);
  const attribution = followup && /\bquem\b|\bautoria\b/.test(current);
  const normalized = normalizeSearch(search);
  const query = [...new Set(terms(search))].slice(0, 24);
  const scores = new Map<number, { score: number; matches: number; anchored: boolean }>();
  const addAnchor = (slug: string, chapter: number, verse: number, score: number) => {
    const id = data.coordinates.get(coordinate(slug, chapter, verse));
    if (id !== undefined && (scores.get(id)?.score ?? -1) < score) scores.set(id, { score, matches: query.length, anchored: true });
  };
  const referenceCoordinates = (text: string) => {
    const matches: Coordinate[] = [];
    const candidates = [text, ...text.matchAll(/(?:[123]\s*)?[\p{L}.]+(?:\s+[\p{L}.]+){0,2}\s*\d{1,3}(?:\s*[:.,]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?/gu)].map((match) => typeof match === "string" ? match : match[0]);
    for (const candidate of candidates) {
      const words = candidate.split(/\s+/);
      for (let i = 0; i < Math.min(words.length, 4); i++) {
        const found = parse(words.slice(i).join(" "));
        if (found.ok) { matches.push([found.ref.book.slug, found.ref.chapter, found.ref.verse ?? 1]); break; }
      }
    }
    return matches;
  };
  const previous = followup ? referenceCoordinates(input.history!.at(-1)!.answer) : [];
  for (const [slug, chapter, verse] of referenceCoordinates(input.question)) addAnchor(slug, chapter, verse, 1000);
  for (const topic of SEARCH_TOPICS) {
    if (!topic.match.test(normalized)) continue;
    topic.passages.forEach(([slug, chapter, verse], index) => addAnchor(slug, chapter, verse, 100 - index));
  }
  if (attribution) for (const [slug, chapter, verse] of previous) addAnchor(slug, chapter, verse, 2000);
  for (const term of query) {
    const ids = data.postings.get(term) ?? [];
    const weight = Math.log(1 + data.rows.length / (1 + ids.length));
    for (const id of ids) {
      const previous = scores.get(id) ?? { score: 0, matches: 0, anchored: false };
      previous.score += weight / Math.sqrt(3 + data.rows[id].words);
      previous.matches++;
      scores.set(id, previous);
    }
  }
  const quoted = [...current.matchAll(/["“]([^"”]{8,160})["”]/gu)].map((m) => m[1]);
  if (quoted.length) data.rows.forEach((row, id) => {
    if (quoted.some((phrase) => row.normalized.includes(phrase))) scores.set(id, { score: 500, matches: query.length, anchored: true });
  });
  const ranked = [...scores].filter(([, s]) => s.anchored || (s.matches >= Math.min(2, query.length) && s.score >= 1.2))
    .sort((a, b) => b[1].score - a[1].score || a[0] - b[0]);
  const selected: Row[] = [];
  let skip = another && !previous.length ? 4 : 0;
  for (const [id] of ranked) {
    const row = data.rows[id];
    if (another && previous.some(([slug, chapter, verse]) => row.book.slug === slug && row.chapter === chapter && Math.abs(row.verse-verse) <= 4)) continue;
    if (selected.some((other) => row.book.slug === other.book.slug && row.chapter === other.chapter && Math.abs(row.verse-other.verse) <= 4)) continue;
    if (skip > 0) { skip--; continue; }
    selected.push(row);
    if (selected.length === 4) break;
  }
  const citations: AssistantCitation[] = [], seen = new Set<string>();
  const contexts: CoracaoGrounding["contexts"] = [];
  for (const row of selected) {
    const texts = await translatedChapter(input.translation, row.book.slug, row.chapter);
    const from = Math.max(1, row.verse - 2), to = Math.min(texts!.length, row.verse + 2);
    const ids: string[] = [];
    const window = Array.from({ length: to-from+1 }, (_, i) => from+i);
    // For a speaker/author follow-up, the chapter opening can clarify who is speaking.
    const verses = attribution ? [...new Set([1,2,3,...window])].filter((v) => v <= texts!.length).sort((a,b) => a-b) : window;
    for (const verse of verses) {
      const text = texts![verse-1];
      if (!text.trim()) continue;
      const id = `${input.translation}:${coordinate(row.book.slug, row.chapter, verse)}`;
      ids.push(id);
      if (seen.has(id)) continue;
      seen.add(id);
      citations.push({ id, reference: `${row.book.name} ${row.chapter}:${verse}`, text,
        href: translationPath(input.translation, row.book.slug, row.chapter, verse), source: getTranslation(input.translation)!.name });
    }
    contexts.push({ reference: `${row.book.name} ${row.chapter}`, from, to, selected: ids });
  }
  return { citations, contexts, source: coracaoSource(input.translation),
    scope: `Busca no texto da edição indicada, com recortes de contexto de até quatro passagens${input.mode === "jesus" ? " dos quatro evangelhos" : ""}. Os recortes não são capítulos completos.${attribution ? " A abertura de cada capítulo (versículos 1–3) também foi fornecida para procurar o interlocutor; isso não comprova autoria histórica." : ""} Pontos de partida por tema são sugestões editoriais, não referências cruzadas do grafo. Não há equivalência automática de versificação entre edições.` };
}
