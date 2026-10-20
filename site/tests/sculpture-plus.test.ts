// The sculpture's five additions (/arcos, design/README.md §15.10): the strength steps and their counts, the book
// groups along the axis, the path between two verses, the address of a path and of a word, the lit shares of a path,
// the marks of a word, and the image's line breaking. The numbers are checked against public/data and the pipeline.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import medalhoes from "../src/data/medalhoes.json";
import { buildGeometry, decodeArcs, STRENGTH_MIN, type ArcSet, type Geometry, type SkyMeta } from "../src/components/sky/model";
import { axisLines, GROUP_BAND, litPath, newTestament, pathFlags, wordLinks, wordMarks, type Hop } from "../src/components/sculpture/arcs";
import { axisGroups, groupNames, type AxisGroup } from "../src/components/sculpture/groups";
import { buildGraph, distances, findPath, PATH_MIN_VOTES, type Graph } from "../src/components/sculpture/path";
import { readPathEnd, readQuery } from "../src/components/sculpture/query";
import { wrap } from "../src/components/sculpture/snapshot";
import { hashOf, parseHash, verseOf, WORD_MAX } from "../src/components/sculpture/state";
import { GROUP_NAMES, GROUPS, type GroupId } from "../src/lib/explore/atlas";
import { createTextIndex } from "../src/components/search/text-index";
import { versesFrom } from "../src/components/sculpture/word";
import { tokenize, wordKey } from "../src/lib/words";
import { bookFile, books, generated } from "./generated";

const pub = (f: string) => join(OUT.publicData, f);
const asBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const bookGroup = (medalhoes as unknown as { bookGroup: Record<string, string> }).bookGroup;
const at = (slug: string, chapter: number, verse: number) => verseOf(books().find((b) => b.slug === slug)!, chapter, verse);

let meta: SkyMeta;
let geo: Geometry;
let full: ArcSet;
let nt: Uint8Array;
let graph: Graph;
let groups: AxisGroup[];
beforeAll(() => {
  meta = JSON.parse(readFileSync(pub("sky.json"), "utf8")) as SkyMeta;
  geo = buildGeometry(meta);
  nt = newTestament(meta, geo);
  full = decodeArcs(asBuffer(readFileSync(pub(meta.files.full.file))), true);
  graph = buildGraph(full, geo.nverses);
  groups = axisGroups(books(), (osis) => bookGroup[osis] ?? null, (id) => GROUP_NAMES[id as GroupId].short);
});

describe("strength of the links", () => {
  it("counts the arcs at each step in summary.json as arcs.bin has them", () => {
    const strength = generated<{ strength: { min: number; arcs: number }[] }>("summary.json").strength;
    expect(strength.map((s) => s.min)).toEqual([...STRENGTH_MIN]);
    for (const s of strength) {
      let n = 0;
      for (let k = 0; k < full.n; k++) if (full.votes[k] >= s.min) n++;
      expect(s.arcs).toBe(n);
    }
    // each step keeps fewer arcs than the one before, and the file's order (votes, most first) makes them its first ones
    expect(strength[0].arcs).toBeLessThan(full.n);
    for (let i = 1; i < strength.length; i++) expect(strength[i].arcs).toBeLessThan(strength[i - 1].arcs);
    for (const s of strength) {
      expect(full.votes[s.arcs - 1]).toBeGreaterThanOrEqual(s.min);
      expect(full.votes[s.arcs]).toBeLessThan(s.min);
    }
  });
});

describe("book groups on the axis", () => {
  it("cuts the 1,189 chapters into stretches of the medallions' groups, in canon order, without a gap", () => {
    expect(groups[0].first).toBe(0);
    expect(groups[groups.length - 1].end).toBe(geo.nch);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i].first).toBe(groups[i - 1].end);
      expect(groups[i].id).not.toBe(groups[i - 1].id);
    }
    // every book of a stretch has the stretch's group
    for (const b of books()) {
      const s = groups.find((g) => b.firstChapter >= g.first && b.firstChapter < g.end)!;
      expect(bookGroup[b.osis]).toBe(s.id);
      expect(b.firstChapter + b.verses.length).toBeLessThanOrEqual(s.end);
    }
  });

  it("names each of the eight groups once, on its longest stretch, in canon order", () => {
    const names = groupNames(groups);
    expect(names.map((g) => g.id)).toEqual([...GROUPS]);
    expect(names.map((g) => g.name)).toEqual(GROUPS.map((id) => GROUP_NAMES[id].short));
    for (const n of names) for (const s of groups) if (s.id === n.id) expect(s.end - s.first).toBeLessThanOrEqual(n.end - n.first);
    // Theographic counts Lamentações among the poetic books: the Profetas run in two stretches around it
    const lam = books().find((b) => b.slug === "lamentacoes")!;
    const lamStretch = groups.find((g) => lam.firstChapter >= g.first && lam.firstChapter < g.end)!;
    expect(lamStretch.id).toBe("poesia");
    expect(groups.filter((g) => g.id === "profetas").length).toBe(2);
  });

  it("refuses a book without a group", () => {
    expect(() => axisGroups(books().slice(0, 3), () => null, (id) => id)).toThrow(/no group/);
  });

  it("draws one band per group under the axis, between its first and last chapter", () => {
    const { bands } = axisLines(meta, geo, groups);
    expect(bands.length).toBe(groups.length * 6 * 4);
    groups.forEach((g, k) => {
      const xs = [0, 1, 2, 3, 4, 5].map((v) => bands[(k * 6 + v) * 4]);
      const ys = [0, 1, 2, 3, 4, 5].map((v) => bands[(k * 6 + v) * 4 + 1]);
      expect(Math.min(...xs)).toBeCloseTo((g.first / geo.nch) * 2 - 1 + GROUP_BAND.gap / 2, 6);
      expect(Math.max(...xs)).toBeCloseTo((g.end / geo.nch) * 2 - 1 - GROUP_BAND.gap / 2, 6);
      expect(Math.max(...ys)).toBeLessThan(0);
    });
  });
});

describe("the path between two verses", () => {
  // a small graph: 0-1-3 strong, 0-2-3 weak, 3-4; 5 alone
  const tiny = (): Graph =>
    buildGraph(
      { n: 6, a: new Uint16Array([0, 1, 0, 2, 3, 0]), b: new Uint16Array([1, 3, 2, 3, 4, 5]), votes: new Int16Array([10, 9, 50, 2, 5, 0]), full: true },
      6,
    );

  it("takes the fewest links, and among them the one whose weakest link has the most votes", () => {
    const g = tiny();
    // 0-1-3 (weakest 9) beats 0-2-3 (weakest 2), though 0-2 alone has the most votes
    expect(findPath(g, 0, 3)).toEqual([
      { from: 0, to: 1, votes: 10 },
      { from: 1, to: 3, votes: 9 },
    ]);
    expect(findPath(g, 0, 4)?.length).toBe(3);
    expect(findPath(g, 2, 2)).toEqual([]);
  });

  it("walks no link with fewer than PATH_MIN_VOTES votes", () => {
    // 0-5 has 0 votes: 5 is out of reach
    expect(PATH_MIN_VOTES).toBe(1);
    expect(findPath(tiny(), 0, 5)).toBeNull();
  });

  it("joins Gênesis 3:15 and Apocalipse 12:9 through real links, in as few as any path can", () => {
    const from = at("genesis", 3, 15);
    const to = at("apocalipse", 12, 9);
    const hops = findPath(graph, from, to)!;
    expect(hops.length).toBeGreaterThan(0);
    expect(hops[0].from).toBe(from);
    expect(hops[hops.length - 1].to).toBe(to);
    // every hop is a pair of arcs.bin with its votes, and links two consecutive steps
    hops.forEach((h, i) => {
      if (i > 0) expect(h.from).toBe(hops[i - 1].to);
      const [a, b] = h.from < h.to ? [h.from, h.to] : [h.to, h.from];
      let votes: number | null = null;
      for (let k = 0; k < full.n; k++) if (full.a[k] === a && full.b[k] === b) votes = full.votes[k];
      expect(votes).toBe(h.votes);
      expect(h.votes).toBeGreaterThanOrEqual(PATH_MIN_VOTES);
    });
    // no shorter path: a plain breadth-first walk over the arcs (not the graph) gives the same distance
    const dist = new Map<number, number>([[from, 0]]);
    let frontier = [from];
    const adj = new Map<number, number[]>();
    for (let k = 0; k < full.n; k++) {
      if (full.votes[k] < PATH_MIN_VOTES) continue;
      (adj.get(full.a[k]) ?? adj.set(full.a[k], []).get(full.a[k])!).push(full.b[k]);
      (adj.get(full.b[k]) ?? adj.set(full.b[k], []).get(full.b[k])!).push(full.a[k]);
    }
    while (frontier.length && !dist.has(to)) {
      const next: number[] = [];
      for (const u of frontier) {
        for (const v of adj.get(u) ?? []) {
          if (dist.has(v)) continue;
          dist.set(v, dist.get(u)! + 1);
          next.push(v);
        }
      }
      frontier = next;
    }
    expect(hops.length).toBe(dist.get(to));
    expect(distances(graph, from)[to]).toBe(hops.length);
  });

  it("finds none for a verse without links", () => {
    const lonely = Array.from({ length: geo.nverses }, (_, gv) => gv).find((gv) => graph.offsets[gv + 1] === graph.offsets[gv])!;
    expect(lonely).toBeDefined();
    expect(findPath(graph, at("joao", 3, 16), lonely)).toBeNull();
  });

  it("lights a path hop after hop, each with its share of the growth", () => {
    const hops: Hop[] = [
      { from: 10, to: 900, votes: 5 },
      { from: 900, to: 20000, votes: 7 },
      { from: 20000, to: 31000, votes: 9 },
    ];
    const lit = litPath(geo, nt, hops);
    expect(lit.n).toBe(3);
    expect(lit.at).toBeCloseTo(((geo.xOfGv[10] * 2 - 1) as number), 6);
    hops.forEach((h, i) => {
      expect(lit.geo[i * 4]).toBeCloseTo(geo.xOfGv[h.from] * 2 - 1, 6);
      expect(lit.geo[i * 4 + 1]).toBeCloseTo(geo.xOfGv[h.to] * 2 - 1, 6);
      expect(lit.flags[i * 4]).toBeCloseTo(i / 3, 6);
      expect(lit.flags[i * 4 + 1]).toBeCloseTo(1 / 3, 6);
    });
    const focus = pathFlags(3, 1);
    expect(Array.from(focus)).toEqual(Array.from(lit.flags).map((v, j) => (j % 4 === 3 ? (j === 7 ? 1 : 0) : v)));
  });
});

describe("the address of a path and of a word", () => {
  it("writes and reads a path between two verses", () => {
    const sel = { kind: "path" as const, from: at("genesis", 3, 15), to: at("apocalipse", 12, 9) };
    expect(hashOf(sel)).toBe("#caminho/genesis/3/15/apocalipse/12/9");
    expect(parseHash(hashOf(sel))).toEqual(sel);
    // the same verse twice is that verse; a verse that does not exist is nothing
    expect(parseHash("#caminho/joao/3/16/joao/3/16")).toEqual({ kind: "verse", gv: at("joao", 3, 16) });
    expect(parseHash("#caminho/joao/3/99/apocalipse/12/9")).toBeNull();
    expect(parseHash("#caminho/joao/3/16")).toBeNull();
  });

  it("writes and reads a word, with accents, spaces and quotes", () => {
    for (const q of ["cordeiro", "pão da vida", "“cordeiro de Deus”"]) {
      const h = hashOf({ kind: "word", q });
      expect(h.startsWith("#palavra/")).toBe(true);
      expect(parseHash(h)).toEqual({ kind: "word", q });
    }
    expect(parseHash("#palavra/" + "a".repeat(WORD_MAX + 1))).toBeNull();
    expect(parseHash("#palavra/")).toBeNull();
  });
});

describe("the verses of a word", () => {
  it("marks every verse once and lights only the links between two of them", () => {
    const verses = Int32Array.from([at("genesis", 22, 8), at("joao", 1, 29), at("apocalipse", 5, 6)]);
    const marks = wordMarks(geo, verses);
    expect(marks.length).toBe(verses.length * 8);
    const has = new Uint8Array(geo.nverses);
    for (const gv of verses) has[gv] = 1;
    const links = wordLinks(full, has);
    for (const l of links) expect(has[l.a] && has[l.b]).toBe(1);
    // most voted first, as the file
    for (let i = 1; i < links.length; i++) expect(links[i].votes).toBeLessThanOrEqual(links[i - 1].votes);
  });
});

describe("what the field asks for", () => {
  it("reads a verse, a chapter, a path and a word, and says what is wrong", () => {
    expect(readQuery("Is 53:5")).toEqual({ sel: { kind: "verse", gv: at("isaias", 53, 5) } });
    expect(readQuery("Jo 3")).toEqual({ sel: { kind: "chapter", ci: books().find((b) => b.slug === "joao")!.firstChapter + 2 } });
    const path = { sel: { kind: "path", from: at("genesis", 3, 15), to: at("apocalipse", 12, 9) } };
    expect(readQuery("Gn 3:15 até Ap 12:9")).toEqual(path);
    expect(readQuery("Gn 3:15 -> Ap 12:9")).toEqual(path);
    expect(readQuery("gn 3:15 > ap 12:9")).toEqual(path);
    expect(readQuery("  pão  da vida ")).toEqual({ sel: { kind: "word", q: "pão da vida" } });
    expect(readQuery("Gn 3 até Ap 12:9")).toHaveProperty("error");
    expect(readQuery("João 22")).toEqual({ error: "Esse capítulo não existe nesse livro." });
    expect(readQuery("a".repeat(WORD_MAX + 1))).toHaveProperty("error");
    expect(readPathEnd(at("rute", 1, 16), "Jo 15:13")).toEqual({ sel: { kind: "path", from: at("rute", 1, 16), to: at("joao", 15, 13) } });
    expect(readPathEnd(at("rute", 1, 16), "Rt 1:16")).toEqual({ error: "Escolha outro versículo." });
  });
});

describe("a word's verses and links", () => {
  it("finds every verse of the BLIVRE with the word, as the text has it, and every link between two of them", async () => {
    const read = (path: string) => JSON.parse(readFileSync(join(OUT.publicData, path.replace(/^\/data\//, "")), "utf8")) as unknown;
    const found = (await versesFrom(createTextIndex(async (p) => read(p)), "cordeiro"))!;
    // straight from the text of the book files, verse by verse in canon order
    const want: number[] = [];
    let gv = 0;
    for (const b of books()) {
      for (const ch of bookFile(b.slug).chapters) {
        for (const v of ch) {
          if (tokenize(v.t).some((w) => wordKey(w) === "cordeiro")) want.push(gv);
          gv++;
        }
      }
    }
    expect(want.length).toBeGreaterThan(0);
    expect([...found.verses].sort((x, y) => x - y)).toEqual(want);
    const inWord = new Set(want);
    let pairs = 0;
    for (let k = 0; k < full.n; k++) if (inWord.has(full.a[k]) && inWord.has(full.b[k])) pairs++;
    const has = new Uint8Array(geo.nverses);
    for (const g of want) has[g] = 1;
    expect(wordLinks(full, has).length).toBe(pairs);
  });
});

describe("the image's lines", () => {
  const width = (s: string) => s.length;
  it("breaks at spaces within the width and ends the last line in … when more would follow", () => {
    expect(wrap(width, "um dois três quatro", 9, 4)).toEqual(["um dois", "três", "quatro"]);
    const two = wrap(width, "um dois três quatro cinco seis", 9, 2);
    expect(two.length).toBe(2);
    expect(two[1].endsWith("…")).toBe(true);
    expect(two.every((l) => l.length <= 9)).toBe(true);
  });
});
