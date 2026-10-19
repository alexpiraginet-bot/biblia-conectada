// Portuguese names of the Theographic places, read from the BLIVRE text of the verses each place is linked to
// (CLAUDE.md rule 4: never translated by hand). For a place, every capitalised word of its verses is a candidate,
// scored by how much it belongs to that place: the Dice coefficient between the verses that have the word and the
// verses of the place. The English names only break ties between candidates that look alike ("Jericho" and
// "Jericó"); they never produce a name. A place with no clear winner gets no name and is left out of the site.
// tests/timeline.test.ts lists the most cited places with their names for review.
import { stripAccents } from "../../src/lib/canon/text";

/** Capitalised words of the text, hyphenated compounds kept whole ("Ramote-Gileade"). */
const CAPITALISED = /\p{Lu}[\p{L}'-]*\p{L}|\p{Lu}/gu;

export const PLACE_RULE = {
  /** a candidate that looks like the English name is enough with this Dice */
  similarDice: 0.2,
  /** "looks like": letter-bigram Dice between the normalised names */
  similarity: 0.5,
  /** otherwise the best candidate needs this Dice … */
  aloneDice: 0.5,
  /** … and this lead over the second */
  margin: 0.15,
  /** a lowercase geographic word before the name in at least this share of its verses joins the name ("mar Vermelho") */
  phraseShare: 0.5,
} as const;

/** Lowercase words that the BLIVRE writes before a place name; with them the name reads "monte das Oliveiras". */
const GEO_WORDS = new Set(["monte", "montes", "mar", "rio", "ribeiro", "vale", "deserto", "lago", "torrente", "ilha", "planície", "campo", "fonte"]);
const CONNECTORS = new Set(["de", "do", "da", "dos", "das"]);

export type PlaceInput = { id: string; placeID: number; names: string[]; verses: number[] };
export type PlaceName = {
  id: string;
  placeID: number;
  en: string;
  /** the name as the BLIVRE writes it */
  pt: string;
  /** the capitalised word the name was found by (equal to pt unless a geographic word joined it) */
  core: string;
  dice: number;
  similarity: number;
  verses: number;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Two capitalised words joined by "de/do/da/dos/das" ("Ramote de Gileade"), also candidates. */
const JOINED = /(?=(\p{Lu}[\p{L}'-]*\p{L} d(?:e|o|a|os|as) \p{Lu}[\p{L}'-]*\p{L}))/gu;

function capitalised(text: string): Set<string> {
  const out = new Set(text.match(CAPITALISED) ?? []);
  for (const m of text.matchAll(JOINED)) out.add(m[1]);
  return out;
}

/** Lowercase, no accents, Greek transliterations aligned (y→i, ph→f, th→t), letters only. */
function norm(s: string): string {
  return stripAccents(s.toLowerCase()).replace(/ph/g, "f").replace(/th/g, "t").replace(/y/g, "i").replace(/[^a-z]/g, "");
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
  return m;
}

/** Letter-bigram Dice similarity of two names, 0–1. */
export function nameSimilarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (x === y) return x ? 1 : 0;
  if (x.length < 2 || y.length < 2) return 0;
  const bx = bigrams(x);
  const by = bigrams(y);
  let common = 0;
  for (const [g, n] of bx) common += Math.min(n, by.get(g) ?? 0);
  return (2 * common) / (x.length - 1 + y.length - 1);
}

export function createPlaceNamer(text: readonly string[]) {
  const caps = text.map(capitalised);
  const background = new Map<string, number>();
  for (const set of caps) for (const w of set) background.set(w, (background.get(w) ?? 0) + 1);

  /** The geographic word (and connector) before `core` in most of its verses, if any: "mar", "monte das". */
  function phrase(core: string, verses: number[]): string {
    const before = new RegExp(`(?:^|[^\\p{L}])(\\p{Ll}+)(?: (\\p{Ll}+))? ${escapeRe(core)}(?![\\p{L}])`, "u");
    const counts = new Map<string, number>();
    let total = 0;
    for (const gv of verses) {
      if (!caps[gv].has(core)) continue;
      total++;
      const m = before.exec(text[gv]);
      if (!m) continue;
      let lead: string | null = null;
      if (m[2] !== undefined && GEO_WORDS.has(m[1]) && CONNECTORS.has(m[2])) lead = `${m[1]} ${m[2]}`;
      else if (m[2] !== undefined && GEO_WORDS.has(m[2])) lead = m[2];
      else if (m[2] === undefined && GEO_WORDS.has(m[1])) lead = m[1];
      if (lead) counts.set(lead, (counts.get(lead) ?? 0) + 1);
    }
    const best = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return best && total > 0 && best[1] / total >= PLACE_RULE.phraseShare ? `${best[0]} ${core}` : core;
  }

  function name(place: PlaceInput): PlaceName | null {
    const verses = [...new Set(place.verses)].sort((a, b) => a - b);
    if (verses.length === 0) return null;
    const n = new Map<string, number>();
    for (const gv of verses) for (const w of caps[gv]) n.set(w, (n.get(w) ?? 0) + 1);
    const scored = [...n].map(([w, k]) => ({
      w,
      dice: (2 * k) / ((background.get(w) ?? 0) + verses.length),
      similarity: Math.max(0, ...place.names.map((en) => nameSimilarity(w, en))),
    }));
    const byDice = (a: (typeof scored)[0], b: (typeof scored)[0]) => b.dice - a.dice || b.similarity - a.similarity || a.w.localeCompare(b.w);
    const alike = scored.filter((s) => s.similarity >= PLACE_RULE.similarity && s.dice >= PLACE_RULE.similarDice).sort(byDice);
    let pick = alike[0];
    if (!pick) {
      const [top, second] = scored.sort(byDice);
      if (top && top.dice >= PLACE_RULE.aloneDice && top.dice - (second?.dice ?? 0) >= PLACE_RULE.margin) pick = top;
    }
    if (!pick) return null;
    return {
      id: place.id,
      placeID: place.placeID,
      en: place.names[0],
      pt: phrase(pick.w, verses),
      core: pick.w,
      dice: Math.round(pick.dice * 1000) / 1000,
      similarity: Math.round(pick.similarity * 1000) / 1000,
      verses: verses.length,
    };
  }

  return { name };
}

/** True when the text has the name as whole words, exactly as written (case kept). */
export function textHasName(text: string, name: string): boolean {
  return new RegExp(`(?:^|[^\\p{L}'-])${escapeRe(name)}(?![\\p{L}'-])`, "u").test(text);
}
