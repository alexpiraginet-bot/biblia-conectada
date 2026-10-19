// The numbers HANDOFF.md §4 and §5.5 require. Each expected value below was published by the videos or the handoff;
// the actual value always comes from the generated data or from recomputing the sources.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createGrid } from "../src/lib/canon/grid";
import { readNpz } from "../scripts/data/npz";
import { OUT, SITE, SRC } from "../scripts/data/sources";
import { bookFile, books, generated, summary } from "./generated";

describe("grid and BLIVRE text", () => {
  it("has 66 books, 1,189 chapters and 31,102 verses", () => {
    const b = books();
    const grid = createGrid(b);
    expect(b).toHaveLength(66);
    expect(grid.chapterCount).toBe(1189);
    expect(grid.verseCount).toBe(31102);
    expect(b.filter((x) => x.testament === "AT")).toHaveLength(39);
    expect(b[0].name).toBe("Gênesis");
    expect(b[65].name).toBe("Apocalipse");
  });

  it("carries one non-empty BLIVRE verse for every verse of the grid", () => {
    let verses = 0;
    for (const book of books()) {
      const f = bookFile(book.slug);
      expect(f.osis).toBe(book.osis);
      expect(f.chapters.map((c) => c.length)).toEqual(book.verses);
      for (const c of f.chapters) for (const v of c) {
        expect(v.t.trim().length).toBeGreaterThan(0);
        verses++;
      }
    }
    expect(verses).toBe(31102);
  });

  it("keeps the BLIVRE text unchanged (Is 9:6)", () => {
    const isa = bookFile("isaias");
    expect(isa.chapters[8][5].t).toBe(
      "Porque um menino nos nasceu, um filho nos foi dado; e o governo está sobre seus ombros; e seu nome se chama Maravilhoso, Conselheiro, Deus Forte, Pai da Eternidade, Príncipe da Paz.",
    );
  });
});

describe("cross references", () => {
  it("counts rows, pairs and verses as the videos did", () => {
    const c = summary().counts;
    expect(c.crossrefRows).toBe(344799);
    expect(c.pairs).toBe(301584);
    expect(c.selfPairs).toBe(45);
    expect(c.arcs).toBe(301584 - 45);
    expect(c.versesWithAnyRef).toBe(30303);
    expect(c.versesWithLinks).toBe(30303);
  });

  it("gives Isaías 9:6 212 links (unique partners, any vote)", () => {
    const isa = bookFile("isaias");
    expect(isa.chapters[8][5].l).toHaveLength(212);
    expect(summary().topVerses[0]).toMatchObject({ ref: "Isaías 9:6", links: 212, path: "/isaias/9/6" });
  });

  it("ranks the most linked verses, with a three-way tie at 156", () => {
    const top = summary().topVerses.map((v) => [v.ref, v.links]);
    expect(top.slice(0, 4)).toEqual([["Isaías 9:6", 212], ["1 Pedro 2:9", 194], ["Mateus 28:20", 169], ["Tito 2:14", 157]]);
    // HANDOFF §4.2 lists Ap 11:15 (156) as the 5th; it shares 156 with Is 41:10 and Ap 5:9.
    expect(top.slice(4, 7)).toEqual([["Isaías 41:10", 156], ["Apocalipse 5:9", 156], ["Apocalipse 11:15", 156]]);
    expect(top[7][1]).toBeLessThan(156);
  });

  it("never cuts the top list through a tie (12th place: Zacarias 13:7 and Gálatas 5:22, 145 each)", () => {
    const counts: number[] = [];
    for (const book of books()) for (const c of bookFile(book.slug).chapters) for (const v of c) counts.push(v.l.length);
    counts.sort((x, y) => y - x);
    const cut = counts[11];
    const top = summary().topVerses;
    expect(top.length).toBe(counts.filter((n) => n >= cut).length);
    expect(top[top.length - 1].links).toBe(cut);
    expect(counts[top.length]).toBeLessThan(cut);
    expect(top.filter((v) => v.links === 145).map((v) => v.ref)).toEqual(["Zacarias 13:7", "Gálatas 5:22"]);
  });

  it("stores links symmetrically, sorted by votes, without self-links", () => {
    const b = books();
    const grid = createGrid(b);
    const all = b.map((book) => bookFile(book.slug));
    const linkOf = (gv: number) => {
      const loc = grid.locate(gv);
      return all[loc.book.index].chapters[loc.chapter - 1][loc.verse - 1].l;
    };
    let total = 0;
    for (let gv = 0; gv < grid.verseCount; gv += 1) {
      const l = linkOf(gv);
      total += l.length;
      for (let k = 1; k < l.length; k++) expect(l[k - 1][1] >= l[k][1]).toBe(true);
      if (gv % 97 !== 0) continue; // full symmetry check on a sample of verses
      for (const [partner, votes, dir] of l) {
        expect(partner).not.toBe(gv);
        const back = linkOf(partner).find((x) => x[0] === gv);
        expect(back?.[1]).toBe(votes);
        expect(back?.[2]).toBe(dir === 3 ? 3 : 3 - dir);
      }
    }
    expect(total).toBe(2 * (301584 - 45));
  });
});

describe("arcs.bin", () => {
  let bin: Buffer;
  let manifest: { count: number; bytes: number; arrays: { name: string; offset: number }[] };
  beforeAll(() => {
    bin = readFileSync(join(OUT.publicData, "arcs.bin"));
    manifest = JSON.parse(readFileSync(join(OUT.publicData, "arcs.json"), "utf8"));
  });

  it("is 6 bytes per pair, self-pairs removed", () => {
    expect(manifest.count).toBe(301584 - 45);
    expect(bin.byteLength).toBe(manifest.count * 6);
    expect(manifest.bytes).toBe(bin.byteLength);
  });

  it("decodes to exactly the pairs of xref.npz (written by the Python analysis), sorted by votes", () => {
    const n = manifest.count;
    const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const mine: string[] = [];
    let prev = Infinity;
    for (let k = 0; k < n; k++) {
      const a = dv.getUint16(k * 2, true), b = dv.getUint16(n * 2 + k * 2, true), v = dv.getInt16(n * 4 + k * 2, true);
      expect(a < b).toBe(true);
      expect(v <= prev).toBe(true);
      prev = v;
      mine.push(`${a}-${b}:${v}`);
    }
    const z = readNpz(SRC.xrefNpz);
    const ref: string[] = [];
    for (let i = 0; i < z.a.data.length; i++) if (z.a.data[i] !== z.b.data[i]) ref.push(`${z.a.data[i]}-${z.b.data[i]}:${z.votes.data[i]}`);
    expect(mine.sort()).toEqual(ref.sort());
  });
});

describe("Antes do Natal study", () => {
  type Natal = { pairsAll: number; pairsMaxVoteGt0: number; otVersesAll: number; otBooksAll: number; otBooksMissing: string[];
    birthChapterVerses: number; keyPairs: { ot: string; nt: string; votes: number }[]; top: { max: number }[] };
  it("finds 2,094 OT pairs with Mt 1–2 and Lc 1–2 (180 verses)", () => {
    const n = generated<Natal>("studies/natal.json");
    expect(n.birthChapterVerses).toBe(180);
    expect(n.pairsAll).toBe(2094);
    expect(n.pairsMaxVoteGt0).toBe(2053);
    expect(n.otVersesAll).toBe(1561);
    expect(n.otBooksAll).toBe(38);
    expect(n.otBooksMissing).toEqual(["Jonas"]);
    expect(n.keyPairs).toEqual([
      { ot: "Isaías 7:14", nt: "Mateus 1:23", votes: 333 },
      { ot: "Miqueias 5:2", nt: "Mateus 2:6", votes: 226 },
    ]);
  });

  it("keeps every pair tied with the 40th strongest (the video's top 40 plus ties)", () => {
    const n = generated<Natal>("studies/natal.json");
    const cut = n.top[39].max;
    expect(n.top.length).toBe(42);
    expect(n.top.every((p) => p.max >= cut)).toBe(true);
    expect(n.top.filter((p) => p.max === cut).length).toBe(3);
  });
});

describe("chapter graph", () => {
  type G = { nodes: { x: number; y: number; degree: number; internal: number; book: number; chapter: number }[]; edges: { count: number } };
  it("has one positioned node per chapter and accounts for every non-self pair", () => {
    const g = JSON.parse(readFileSync(join(OUT.publicData, "chapter-graph.json"), "utf8")) as G;
    expect(g.nodes).toHaveLength(1189);
    for (const nd of g.nodes) expect(Number.isFinite(nd.x) && Number.isFinite(nd.y)).toBe(true);
    const edgeBin = readFileSync(join(OUT.publicData, "chapter-edges.bin"));
    expect(edgeBin.byteLength).toBe(g.edges.count * 12);
    const dv = new DataView(edgeBin.buffer, edgeBin.byteOffset, edgeBin.byteLength);
    let between = 0;
    for (let k = 0; k < g.edges.count; k++) between += dv.getUint32(g.edges.count * 4 + k * 4, true);
    const internal = g.nodes.reduce((s, nd) => s + nd.internal, 0);
    expect(between + internal).toBe(301584 - 45);
    expect(g.nodes.find((nd) => nd.book === 22 && nd.chapter === 9)).toBeDefined();
  });
});

describe("manifest", () => {
  it("records the SHA-256 of every generated file", () => {
    const m = generated<{ outputs: Record<string, string> }>("manifest.json");
    expect(Object.keys(m.outputs).length).toBeGreaterThan(70);
    for (const [rel, hash] of Object.entries(m.outputs)) {
      expect(createHash("sha256").update(readFileSync(join(SITE, rel))).digest("hex")).toBe(hash);
    }
  });
});
