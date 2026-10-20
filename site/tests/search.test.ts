// The search: what the box answers without the network (src/components/search/core.ts), and the word index of the text
// (public/data/busca/v1, written by scripts/data/search-index.ts and read by src/components/search/text-index.ts),
// checked against the BLIVRE text of the generated book files: every count the search shows is the index's, and the
// index is the text's.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSearch, describe as describeQuery, emptyText, quoted, type SearchTheme } from "../src/components/search/core";
import { decodeAscending, decodeOrder, INDEX_FORMAT, INDEX_PATH, type IndexMeta, type PositionShard, type WordShard } from "../src/components/search/format";
import { createTextIndex, markVerse, parseTextQuery, type TextQuery } from "../src/components/search/text-index";
import { createGrid } from "../src/lib/canon/grid";
import { tokenize, wordKey } from "../src/lib/words";
import { OUT } from "../scripts/data/sources";
import { bookFile, books, generated, summary } from "./generated";

const themes = generated<SearchTheme[]>("busca-temas.json");
const search = createSearch(books(), themes);
const hrefs = (q: string, group: string, scope?: Parameters<typeof search.results>[1]) =>
  search.results(q, scope).groups.find((g) => g.id === group)?.hits.map((h) => h.href) ?? [];

// the index as the browser reads it, from the files on disk
const read = (path: string) => JSON.parse(readFileSync(join(OUT.publicData, path.replace(/^\/data\//, "")), "utf8")) as unknown;
const index = createTextIndex(async (path) => read(path));
const indexMeta = read(`${INDEX_PATH}/index.json`) as IndexMeta;

// the text and the link counts the reading pages show (book files: t = BLIVRE text, l = links of the verse)
const text: string[] = [];
const links: number[] = [];
for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) {
  text.push(v.t);
  links.push(v.l.length);
}
const keysOf = text.map((t) => tokenize(t).map(wordKey));
const grid = createGrid(books());
const gvOf = (slug: string, c: number, v: number) => grid.verseIndex(books().find((b) => b.slug === slug)!, c, v);

/** Every verse that matches, read straight from the text: most links first, then canonical order. */
function brute(q: TextQuery): number[] {
  const out: number[] = [];
  keysOf.forEach((keys, gv) => {
    const has = new Set(keys);
    if (!q.terms.every((k) => has.has(k))) return;
    if (!q.phrases.every((p) => keys.some((_, i) => p.every((k, j) => keys[i + j] === k)))) return;
    out.push(gv);
  });
  return out.sort((a, b) => links[b] - links[a] || a - b);
}

/** What the search box gets for a query: the verses (global index) in result order, with their link counts. */
async function found(query: string) {
  const q = parseTextQuery(query)!;
  const [meta, ranks] = await Promise.all([index.meta(), index.search(q)]);
  return { q, verses: Array.from(ranks, (r) => meta.verse[r]), links: Array.from(ranks, (r) => meta.links[r]) };
}

describe("search box", () => {
  it("opens a reference in any form first", () => {
    for (const q of ["Is 9:6", "isaías 9 6", "Isaias 9,6", "is 9.6"]) {
      const r = search.results(q);
      expect(r.groups[0].id, q).toBe("ref");
      expect(r.groups[0].hits[0], q).toMatchObject({ href: "/isaias/9/6", title: "Ir para Isaías 9:6" });
      // a reference is not looked up as words ("Is 9:6" is not the word "is")
      expect(r.text, q).toBeNull();
    }
    expect(hrefs("1 Co 13", "ref")).toEqual(["/1-corintios/13"]);
    expect(hrefs("Mq 5,2", "ref")).toEqual(["/miqueias/5/2"]);
  });

  it("offers both books when an abbreviation fits two", () => {
    const r = search.results("Jo 1:1");
    const refs = r.groups.find((g) => g.id === "ref");
    expect(refs?.hits.length).toBeGreaterThanOrEqual(1);
    expect(refs?.hits.every((h) => h.href.endsWith("/1/1"))).toBe(true);
  });

  it("finds books by the start of the name and by abbreviation", () => {
    expect(search.booksFor("ezeq").map((b) => b.slug)).toEqual(["ezequiel"]);
    expect(search.booksFor("corintios").map((b) => b.slug)).toEqual(["1-corintios", "2-corintios"]);
    expect(search.booksFor("Sl").map((b) => b.slug)).toContain("salmos");
    expect(search.booksFor("9")).toEqual([]);
  });

  it("says what is missing instead of a format error", () => {
    const joao = books().find((b) => b.slug === "joao")!;
    expect(search.results("João 22").message).toBe(`Não achei “João 22”: João tem ${joao.verses.length} capítulos.`);
  });

  it("sends the words to the text index and finds the themes of /tema", () => {
    const r = search.results("luz");
    expect(r.text).toMatchObject({ terms: ["luz"], phrases: [] });
    expect(hrefs("luz", "themes")).toEqual(["/tema/luz"]);
    // the English name of the source's topic finds the theme too; the word being typed matches the start of a name
    expect(hrefs("light", "themes")).toEqual(["/tema/luz"]);
    expect(hrefs("lu", "themes").sort()).toEqual(["/tema/lua", "/tema/luz"]);
    expect(hrefs("luz ", "themes")).toEqual(["/tema/luz"]);
    expect(search.results("   ")).toEqual({ groups: [], text: null });
  });

  it("filters the groups by scope, the reference answering in every one", () => {
    expect(search.results("luz", "livros").groups).toEqual([]);
    expect(search.results("luz", "temas").groups.map((g) => g.id)).toEqual(["themes"]);
    expect(search.results("Is 9:6", "texto").groups.map((g) => g.id)).toEqual(["ref"]);
    // "Livros" shows every book that matches, "Tudo" the first ones
    expect(search.results("j", "livros").groups[0].hits.length).toBeGreaterThan(search.results("j").groups[0].hits.length);
    // the text query is the same in every scope (the "Texto" chip keeps its count)
    expect(search.results("luz", "temas").text?.key).toBe(search.results("luz").text?.key);
  });

  it("lists the themes the /tema pages publish", () => {
    type Theme = { slug: string; key: string; label: string; topic: string; passages: unknown[] };
    const temas = generated<{ themes: Theme[] }>("temas.json").themes;
    expect(themes).toEqual(temas.map((t) => ({ slug: t.slug, label: t.label, key: t.key, topic: t.topic, passages: t.passages.length })));
  });
});

describe("text query", () => {
  it("reads words, phrases in quotes of any kind, and an open quote", () => {
    expect(parseTextQuery("Luz  TREVAS")).toMatchObject({ terms: ["luz", "trevas"], phrases: [] });
    for (const q of ['"grande luz"', "“grande luz”", '"grande luz', "„grande luz“"]) {
      expect(parseTextQuery(q), q).toMatchObject({ terms: [], phrases: [["grande", "luz"]] });
    }
    // a word in quotes is a word; a word of a phrase is not asked twice
    expect(parseTextQuery('"luz"')).toMatchObject({ terms: ["luz"], phrases: [] });
    expect(parseTextQuery('luz "grande luz" povo')).toMatchObject({ terms: ["povo"], phrases: [["grande", "luz"]] });
    // the same words in any order or case are the same query; digits and punctuation are not words
    expect(parseTextQuery("trevas luz")?.key).toBe(parseTextQuery("LUZ, trevas!")?.key);
    expect(parseTextQuery("9:6")).toBeNull();
    expect(parseTextQuery("luz 2")?.terms).toEqual(["luz"]);
  });

  it("quotes the query in the sentences", () => {
    expect(quoted("luz")).toBe("“luz”");
    expect(quoted('"grande luz"')).toBe("“grande luz”");
    expect(quoted("“grande luz”")).toBe("“grande luz”");
    expect(describeQuery("luz trevas")).toBe("“luz” e “trevas”");
    expect(describeQuery("o senhor é meu pastor")).toBe("“o”, “senhor”, “é”, “meu” e “pastor”");
    expect(describeQuery('"grande luz"')).toBe("a frase “grande luz”");
    expect(describeQuery('luz "grande luz"')).toBe("“luz” e a frase “grande luz”");
  });
});

describe("text search (public/data/busca/v1)", () => {
  it("finds every verse with “luz”, the most linked first, with the counts of the reading pages", async () => {
    const r = await found("luz");
    expect(r.verses).toEqual(brute(r.q));
    expect(r.verses.length).toBeGreaterThan(0);
    expect(r.links).toEqual(r.verses.map((gv) => links[gv]));
    for (let i = 1; i < r.links.length; i++) expect(r.links[i]).toBeLessThanOrEqual(r.links[i - 1]);
  });

  it("matches a phrase in quotes with its words in order", async () => {
    const phrase = await found('"grande luz"');
    const words = await found("grande luz");
    expect(phrase.verses).toEqual(brute(phrase.q));
    expect(words.verses).toEqual(brute(words.q));
    // Isaías 9:2: "o povo que andava em trevas viu uma grande luz"
    expect(phrase.verses).toContain(gvOf("isaias", 9, 2));
    expect(phrase.verses.every((gv) => words.verses.includes(gv))).toBe(true);
    // one right after the other: as a phrase, "filho do homem" is a part of the verses that have the three words
    const son = await found('"filho do homem"');
    const sonWords = await found("filho do homem");
    expect(son.verses).toEqual(brute(son.q));
    expect(son.verses.length).toBeGreaterThan(0);
    expect(son.verses.length).toBeLessThan(sonWords.verses.length);
    // and in this order
    const reversed = await found('"luz grande"');
    expect(reversed.verses).toEqual(brute(reversed.q));
    expect(reversed.verses).not.toContain(gvOf("isaias", 9, 2));
  });

  it("ignores accents and case", async () => {
    const plain = await found("misericordia");
    expect(plain.verses.length).toBeGreaterThan(0);
    expect(plain.verses).toEqual(brute(plain.q));
    for (const q of ["misericórdia", "MISERICÓRDIA", "Misericórdia"]) expect((await found(q)).verses, q).toEqual(plain.verses);
    expect((await found("coracao")).verses).toEqual((await found("Coração")).verses);
  });

  it("needs every word in the verse", async () => {
    for (const q of ["luz trevas", "o senhor é meu pastor", "deus amor"]) {
      const r = await found(q);
      expect(r.verses, q).toEqual(brute(r.q));
    }
    expect((await found('"o senhor é meu pastor"')).verses).toContain(gvOf("salmos", 23, 1));
  });

  it("says so when the text does not have the word", async () => {
    expect((await found("xyzw")).verses).toEqual([]);
    expect((await found("luz xyzw")).verses).toEqual([]);
    expect(emptyText("xyzw")).toBe("Não achei “xyzw” no texto da Bíblia Livre. Tente outra palavra ou uma referência como Is 9:6.");
  });

  it("marks the words and phrases of the query in a snippet, and cuts a long verse around them", () => {
    const is92 = text[gvOf("isaias", 9, 2)];
    const marks = (t: string, q: string, max?: number) => markVerse(t, parseTextQuery(q)!, max).filter((s) => s.mark).map((s) => s.text);
    expect(marks(is92, "luz")).toEqual(["luz", "luz"]);
    expect(marks(is92, '"grande luz"')).toEqual(["grande luz"]);
    expect(marks(is92, "LUZ povo")).toEqual(["povo", "luz", "luz"]);
    // the segments put the verse back together
    expect(markVerse(is92, parseTextQuery("luz")!).map((s) => s.text).join("")).toBe(is92);
    const long = text.findIndex((t) => tokenize(t).length > 60 && tokenize(t).map(wordKey).includes("rei"));
    const cut = markVerse(text[long], parseTextQuery("rei")!, 40);
    const shown = cut.map((s) => s.text).join("");
    expect(tokenize(shown).length).toBeLessThanOrEqual(40);
    expect(shown.startsWith("… ") || shown.endsWith("…")).toBe(true);
    expect(cut.some((s) => s.mark)).toBe(true);
  });

  it("holds every word of the text, with its verses and places (the whole index)", () => {
    expect(indexMeta.format).toBe(INDEX_FORMAT);
    expect(indexMeta.verses).toBe(summary().counts.verses);
    const { verse, links: byRank } = decodeOrder(indexMeta);
    const rankOf = new Int32Array(verse.length);
    verse.forEach((gv, r) => (rankOf[gv] = r));
    // the rank order is the reading pages' link count, then canonical order; the first is the most linked verse
    expect(new Set(verse).size).toBe(text.length);
    for (let r = 0; r < verse.length; r++) expect(byRank[r]).toBe(links[verse[r]]);
    expect([...verse].sort((a, b) => links[b] - links[a] || a - b)).toEqual([...verse]);
    expect(byRank[0]).toBe(summary().topVerses[0].links);

    // from the text: word -> verse -> places
    const want = new Map<string, Map<number, number[]>>();
    keysOf.forEach((keys, gv) => keys.forEach((k, i) => {
      const m = want.get(k) ?? want.set(k, new Map()).get(k)!;
      const at = m.get(gv) ?? m.set(gv, []).get(gv)!;
      at.push(i);
    }));
    let words = 0;
    let postings = 0;
    const bad: string[] = [];
    for (const s of indexMeta.shards) {
      const w = read(`${INDEX_PATH}/palavras/${s}.json`) as WordShard;
      const p = read(`${INDEX_PATH}/posicoes/${s}.json`) as PositionShard;
      expect(Object.keys(p).sort(), s).toEqual(Object.keys(w).sort());
      for (const [k, diffs] of Object.entries(w)) {
        words++;
        const ranks = decodeAscending(diffs);
        postings += ranks.length;
        const m = want.get(k);
        const expected = m ? [...m.keys()].sort((a, b) => rankOf[a] - rankOf[b]) : [];
        const got = Array.from(ranks, (r) => verse[r]);
        if (k.slice(0, 2) !== s || JSON.stringify(got) !== JSON.stringify(expected)) bad.push(`${k}: verses`);
        else if (JSON.stringify(p[k].map((x) => (typeof x === "number" ? [x] : x))) !== JSON.stringify(expected.map((gv) => m!.get(gv)))) bad.push(`${k}: places`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(words).toBe(want.size);
    expect(indexMeta.words).toBe(want.size);
    expect(postings).toBe(indexMeta.postings);
    expect(postings).toBe([...want.values()].reduce((n, m) => n + m.size, 0));
  });
});
