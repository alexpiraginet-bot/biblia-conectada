// Themes ("Tema") from OpenBible.info Topics (fontes/openbible-topics/, CC BY 4.0), labelled in Portuguese without
// translating: the label is the BLIVRE word found in most of the topic's passages. A topic is published only when
// (1) it is on the reviewed allow-list below, (2) it has at least THEME_RULE.minPassages passages, and (3) one word is
// in more than half of them and it is the word the list expects. The allow-list keeps out the noise of the source
// (Gn 1:3 is in 78 topic rows, "age difference" among them) and the topics about one person or place.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { STOPWORDS, tokenize, wordKey } from "../../src/lib/words";
import type { Canon } from "./canon";
import { REPO, SRC, sha256 } from "./sources";

export const TOPICS_ZIP = join(REPO, "fontes/openbible-topics/topic-scores.zip");

export const THEME_RULE = {
  /** a published theme lists at least this many passages */
  minPassages: 8,
  /** the label word must be in more than this share of the passages (a strict majority) */
  majority: 0.5,
  /** a verse "has" a theme (event pages, verse lists) only through a passage with at least this score */
  minScoreForVerse: 3,
} as const;

/**
 * Reviewed allow-list: OpenBible topic -> the key of the BLIVRE word the rule must find. The label shown on the site is
 * that word as the BLIVRE writes it; the English name is only shown as the source's name. When two topics give the same
 * word, only one is listed (one page per word). Reviewed on the 2026-10-19 snapshot.
 */
export const THEME_ALLOW: Record<string, string> = {
  light: "luz",
  darkness: "trevas",
  peace: "paz",
  love: "amor",
  faith: "fe",
  hope: "esperanca",
  grace: "graca",
  mercy: "misericordia",
  joy: "alegria",
  wisdom: "sabedoria",
  truth: "verdade",
  neighbor: "proximo",
  righteousness: "justica",
  kingdom: "reino",
  glory: "gloria",
  power: "poder",
  liberty: "liberdade",
  understanding: "entendimento",
  conscience: "consciencia",
  soul: "alma",
  spirit: "espirito",
  flesh: "carne",
  body: "corpo",
  name: "nome",
  word: "palavra",
  law: "lei",
  works: "obras",
  world: "mundo",
  gift: "dom",
  inheritance: "heranca",
  covenants: "pacto",
  mystery: "misterio",
  doctrine: "doutrina",
  zeal: "zelo",
  honor: "honra",
  tears: "lagrimas",
  path: "caminho",
  cross: "cruz",
  crown: "coroa",
  sabbath: "sabado",
  passover: "pascoa",
  tabernacle: "tabernaculo",
  wilderness: "deserto",
  famine: "fome",
  poor: "pobre",
  widow: "viuvas",
  orphan: "orfao",
  foreigners: "estrangeiro",
  wrath: "ira",
  fool: "tolo",
  devil: "diabo",
  angels: "anjos",
  holy: "santo",
  bread: "pao",
  wine: "vinho",
  blood: "sangue",
  salt: "sal",
  fire: "fogo",
  rain: "chuva",
  snow: "neve",
  stars: "estrelas",
  moon: "lua",
  sea: "mar",
  mountains: "montes",
  rock: "rocha",
  sand: "areia",
  dust: "po",
  tree: "arvore",
  fruit: "fruto",
  garden: "jardim",
  shepherd: "pastor",
  sheep: "ovelhas",
  lamb: "cordeiro",
  lions: "leao",
  eagle: "aguia",
  honey: "mel",
  milk: "leite",
  manna: "mana",
  yeast: "fermento",
  silver: "prata",
  swords: "espada",
  shield: "escudo",
  plagues: "pragas",
  pestilence: "pestilencia",
  locusts: "gafanhotos",
};

export type ThemePassage = { osis: string; from: number; to: number; score: number };
export type Theme = {
  slug: string;
  key: string;
  /** the BLIVRE word, as written most often in the passages */
  label: string;
  /** OpenBible's topic name (English), shown only as the source's name */
  topic: string;
  /** passages that have the label word, and all passages */
  coverage: { with: number; total: number };
  passages: ThemePassage[];
  /** OpenBible links between verses of two different passages of the theme: [verse a, verse b, votes], by votes */
  links: [number, number, number][];
};

type Row = { topic: string; osis: string; score: number };

export function readTopics(): { header: string; generated: string; rows: Row[]; sha256: string } {
  const files = unzipSync(readFileSync(TOPICS_ZIP));
  const txt = files["topic-scores.txt"];
  if (!txt) throw new Error("[themes] no topic-scores.txt in the zip");
  const lines = new TextDecoder("utf-8", { fatal: true }).decode(txt).split("\n");
  const header = lines[0];
  const generated = /# Generated (\d{4}-\d{2}-\d{2})\. CC-BY License: www\.openbible\.info\/topics/.exec(header)?.[1];
  if (!generated) throw new Error(`[themes] unexpected header: ${header}`);
  const rows: Row[] = [];
  for (const l of lines.slice(1)) {
    if (!l.trim()) continue;
    const [topic, osis, score] = l.split("\t");
    rows.push({ topic, osis, score: Number(score) });
  }
  return { header, generated, rows, sha256: sha256(TOPICS_ZIP) };
}

/** OSIS reference or range ("Gen.1.3", "Exod.20.1-Exod.20.26", "Ps.23") to global verse indices, or null. */
export function osisRange(osis: string, canon: Canon): [number, number] | null {
  const point = (ref: string, end: boolean): number | null => {
    const m = /^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?$/.exec(ref);
    if (!m) return null;
    const book = canon.books.find((b) => b.osis === m[1]);
    const c = Number(m[2]);
    if (!book || c < 1 || c > book.verses.length) return null;
    const n = book.verses[c - 1];
    const v = m[3] === undefined ? (end ? n : 1) : Number(m[3]);
    if (v < 1 || v > n) return null;
    return canon.chapterFirst[book.firstChapter + c - 1] + v - 1;
  };
  const [a, b] = osis.split("-");
  const from = point(a, false);
  const to = point(b ?? a, true);
  return from !== null && to !== null && to >= from ? [from, to] : null;
}

/** The word in most passages (ties: the rarer word in the whole BLIVRE, then alphabetical), with its count. */
export function dominantWord(passages: [number, number][], verseKeys: Set<string>[], df: Map<string, number>) {
  const count = new Map<string, number>();
  for (const [a, b] of passages) {
    const seen = new Set<string>();
    for (let gv = a; gv <= b; gv++) for (const k of verseKeys[gv]) seen.add(k);
    for (const k of seen) count.set(k, (count.get(k) ?? 0) + 1);
  }
  const [best] = [...count].sort((x, y) => y[1] - x[1] || (df.get(x[0]) ?? 0) - (df.get(y[0]) ?? 0) || x[0].localeCompare(y[0]));
  return best ? { key: best[0], with: best[1] } : null;
}

export function buildThemes(input: {
  canon: Canon;
  text: readonly string[];
  links: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>>;
  write: (rel: string, data: string) => void;
}) {
  const { canon, text, links, write } = input;
  const attribution = readFileSync(SRC.attribution, "utf8");
  const src = readTopics();
  // the credit line in ATTRIBUTION.md names the snapshot date of the file
  const [y, m, d] = src.generated.split("-");
  const credit = `Temas: OpenBible.info Topics (CC BY 4.0), instantâneo de ${d}/${m}/${y}`;
  if (!attribution.includes(credit)) throw new Error(`[themes] ATTRIBUTION.md lacks "${credit}"`);

  const verseKeys = text.map((t) => {
    const s = new Set<string>();
    for (const w of tokenize(t)) {
      const k = wordKey(w);
      if (k.length > 1 && !STOPWORDS.has(k)) s.add(k);
    }
    return s;
  });
  const df = new Map<string, number>();
  for (const s of verseKeys) for (const k of s) df.set(k, (df.get(k) ?? 0) + 1);

  const byTopic = new Map<string, ThemePassage[]>();
  let unreadable = 0;
  for (const r of src.rows) {
    const range = osisRange(r.osis, canon);
    if (!range) {
      unreadable++;
      continue;
    }
    const list = byTopic.get(r.topic) ?? [];
    list.push({ osis: r.osis, from: range[0], to: range[1], score: r.score });
    byTopic.set(r.topic, list);
  }

  const themes: Theme[] = [];
  const rejected: { topic: string; reason: string }[] = [];
  for (const [topic, expected] of Object.entries(THEME_ALLOW)) {
    const passages = (byTopic.get(topic) ?? []).sort((a, b) => b.score - a.score || a.from - b.from || a.to - b.to);
    if (passages.length < THEME_RULE.minPassages) {
      rejected.push({ topic, reason: `${passages.length} passages` });
      continue;
    }
    const dom = dominantWord(passages.map((p) => [p.from, p.to]), verseKeys, df);
    if (!dom || dom.with <= passages.length * THEME_RULE.majority) {
      rejected.push({ topic, reason: `no majority word (${dom?.key} ${dom?.with}/${passages.length})` });
      continue;
    }
    if (dom.key !== expected) throw new Error(`[themes] "${topic}": the rule gives "${dom.key}", the reviewed list expects "${expected}"`);
    // the label as the BLIVRE writes it most often in these passages (lowercase unless always capitalised)
    const forms = new Map<string, number>();
    for (const p of passages) for (let gv = p.from; gv <= p.to; gv++) {
      for (const w of tokenize(text[gv])) if (wordKey(w) === dom.key) forms.set(w.toLowerCase(), (forms.get(w.toLowerCase()) ?? 0) + 1);
    }
    const label = [...forms].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    // links between verses of two different passages
    const owner = new Map<number, Set<number>>();
    passages.forEach((p, i) => {
      for (let gv = p.from; gv <= p.to; gv++) (owner.get(gv) ?? owner.set(gv, new Set()).get(gv)!).add(i);
    });
    const pairs: [number, number, number][] = [];
    for (const [gv, mine] of owner) {
      for (const [other, votes] of links[gv]) {
        if (other <= gv) continue;
        const theirs = owner.get(other);
        if (!theirs) continue;
        // the two verses must sit in different passages (a verse in two passages counts with either)
        const same = mine.size === 1 && theirs.size === 1 && [...mine][0] === [...theirs][0];
        if (!same) pairs.push([gv, other, votes]);
      }
    }
    pairs.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
    themes.push({ slug: dom.key, key: dom.key, label, topic, coverage: { with: dom.with, total: passages.length }, passages, links: pairs });
  }
  const slugs = new Set(themes.map((t) => t.slug));
  if (slugs.size !== themes.length) throw new Error("[themes] two published themes share a label");
  themes.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  write("temas.json", JSON.stringify({
    format: "biblia-conectada/temas@1",
    source: { file: "fontes/openbible-topics/topic-scores.zip", sha256: src.sha256, header: src.header, generated: src.generated },
    credit,
    rule: THEME_RULE,
    topicsInSource: byTopic.size,
    rowsInSource: src.rows.length,
    unreadableRows: unreadable,
    rejected,
    themes,
  }));
  return { themes, credit, generated: src.generated, rejected, topicsInSource: byTopic.size };
}

/** Published themes a set of verses touches through passages scored at least THEME_RULE.minScoreForVerse. */
export function themesOfVerses(themes: readonly Theme[], verses: ReadonlySet<number>) {
  const out: { slug: string; label: string; passages: number }[] = [];
  for (const t of themes) {
    let n = 0;
    for (const p of t.passages) {
      if (p.score < THEME_RULE.minScoreForVerse) continue;
      for (let gv = p.from; gv <= p.to; gv++) if (verses.has(gv)) {
        n++;
        break;
      }
    }
    if (n) out.push({ slug: t.slug, label: t.label, passages: n });
  }
  return out;
}
