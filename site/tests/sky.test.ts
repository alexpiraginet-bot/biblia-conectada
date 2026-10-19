// The sky of links (/arcos) computes its counts in the browser from public/data (src/components/sky/model.ts). These tests check
// that those client-side numbers are the pipeline's numbers, and that the committed posters match their declared sizes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { OUT, SITE } from "../scripts/data/sources";
import {
  BAND,
  buildGeometry,
  chapterName,
  chapterPath,
  decodeArcs,
  highlightFor,
  indexByChapter,
  linkedChapters,
  parseSelectionHash,
  partnerChapters,
  rankChapters,
  selectionHash,
  stepChapter,
  type ArcSet,
  type ChapterIndex,
  type Geometry,
  type SkyMeta,
} from "../src/components/sky/model";
import { POSTER } from "../src/components/sky/poster";
import { bookFile, summary } from "./generated";

const pub = (f: string) => join(OUT.publicData, f);
const asBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

let meta: SkyMeta;
let geo: Geometry;
let full: ArcSet;
let head: ArcSet;
let idx: ChapterIndex;
beforeAll(() => {
  meta = JSON.parse(readFileSync(pub("sky.json"), "utf8")) as SkyMeta;
  geo = buildGeometry(meta);
  full = decodeArcs(asBuffer(readFileSync(pub(meta.files.full.file))), true);
  head = decodeArcs(asBuffer(readFileSync(pub(meta.files.head.file))), false);
  idx = indexByChapter(geo, full);
});

describe("sky geometry", () => {
  it("places 31,102 verses on 1,189 equally spaced chapters, left to right", () => {
    expect(geo.nch).toBe(summary().counts.chapters);
    expect(geo.nverses).toBe(summary().counts.verses);
    for (let gv = 1; gv < geo.nverses; gv++) expect(geo.xOfGv[gv]).toBeGreaterThan(geo.xOfGv[gv - 1]);
    expect(geo.xOfGv[0]).toBeGreaterThan(0);
    expect(geo.xOfGv[geo.nverses - 1]).toBeLessThan(1);
    // arcs.py gv_x for Isaías 9:6
    const gv = meta.topVerses[0].gv, c = geo.chapOfGv[gv];
    expect(geo.xOfGv[gv]).toBeCloseTo((c + (gv - geo.chapterFirst[c] + 0.5) / geo.chapterVerses[c]) / geo.nch, 6);
  });

  it("keeps the band at 8:5, the poster sizes included", () => {
    expect(BAND.aspect).toBe(5 / 8);
    for (const p of [POSTER.head, POSTER.full]) expect(p.h).toBe(p.w * BAND.aspect);
  });
});

describe("sky arcs", () => {
  it("decodes every pair of arcs.bin, and sky-head.bin is its most voted head", () => {
    expect(full.n).toBe(summary().counts.arcs);
    expect(head.n).toBe(meta.files.head.count);
    for (let k = 0; k < head.n; k++) {
      expect(head.a[k]).toBe(full.a[k]);
      expect(head.b[k]).toBe(full.b[k]);
      expect(head.votes[k]).toBe(full.votes[k]);
    }
    expect(head.votes[head.n - 1]).toBe(meta.files.head.minVotes);
  });

  it("counts, per chapter, the same distinct verse pairs as the pipeline (the readout's 'N ligações')", () => {
    for (let c = 0; c < geo.nch; c++) expect(idx.offsets[c + 1] - idx.offsets[c]).toBe(geo.chapterPairs[c]);
  });

  it("splits each chapter's pairs into linked chapters plus pairs inside it", () => {
    for (const c of [0, 22, 687, 688, 1100, geo.nch - 1]) {
      const all = linkedChapters(geo, full, idx, c, Infinity);
      let inside = 0;
      for (let p = idx.offsets[c]; p < idx.offsets[c + 1]; p++) {
        const k = idx.arcs[p];
        if (geo.chapOfGv[full.a[k]] === c && geo.chapOfGv[full.b[k]] === c) inside++;
      }
      expect(all.items.reduce((s, r) => s + r.count, 0) + inside).toBe(geo.chapterPairs[c]);
      expect(all.items.every((r) => r.ci !== c)).toBe(true);
    }
  });

  it("lights all 212 partners of Isaías 9:6, the same list the server reads from the book file", () => {
    const top = summary().topVerses[0];
    const gv = top.gv;
    const fromArcs: number[] = [];
    for (let k = 0; k < full.n; k++) {
      if (full.a[k] === gv) fromArcs.push(full.b[k]);
      else if (full.b[k] === gv) fromArcs.push(full.a[k]);
    }
    const [, slug, chapter, verse] = top.path.split("/");
    const fromBook = bookFile(slug).chapters[Number(chapter) - 1][Number(verse) - 1].l.map(([p]) => p);
    expect(fromArcs.length).toBe(top.links);
    expect([...fromArcs].sort((x, y) => x - y)).toEqual([...fromBook].sort((x, y) => x - y));
    const h = highlightFor(geo, { kind: "verse", gv }, fromBook, null, null);
    expect(h.n).toBe(top.links);
    expect(h.verse).toBe(true);
    const chapterHl = highlightFor(geo, { kind: "chapter", ci: geo.chapOfGv[gv] }, fromBook, full, idx);
    expect(chapterHl.n).toBe(geo.chapterPairs[geo.chapOfGv[gv]]);
  });

  it("ranks the chapters of a verse's partners by count, ties in canonical order, and reports a tie past the cut", () => {
    const top = summary().topVerses[0];
    const [, slug, chapter, verse] = top.path.split("/");
    const partners = bookFile(slug).chapters[Number(chapter) - 1][Number(verse) - 1].l.map(([p]) => p);
    const list = partnerChapters((g) => geo.chapOfGv[g], partners, Infinity);
    expect(list.items.reduce((s, r) => s + r.count, 0)).toBe(top.links);
    for (let i = 1; i < list.items.length; i++) {
      const [a, b] = [list.items[i - 1], list.items[i]];
      expect(a.count > b.count || (a.count === b.count && a.ci < b.ci)).toBe(true);
    }
    const cut = rankChapters(new Map([[5, 3], [1, 2], [9, 2], [4, 2], [7, 1]]), 2);
    expect(cut.items).toEqual([{ ci: 5, count: 3 }, { ci: 1, count: 2 }]);
    expect(cut.tiedBeyond).toBe(2);
  });
});

describe("sky selection", () => {
  it("round-trips every chapter through the URL fragment and rejects the rest", () => {
    for (let c = 0; c < geo.nch; c++) {
      const h = selectionHash(geo.books, { kind: "chapter", ci: c });
      expect(h).toBe(`#${chapterPath(geo.books, c).slice(1)}`);
      expect(parseSelectionHash(geo.books, h)).toBe(c);
    }
    expect(selectionHash(geo.books, { kind: "verse", gv: 0 })).toBe("");
    for (const bad of ["", "#", "#isaias", "#isaias/0", "#isaias/67", "#nada/1", "#isaias/9/6", "#ISAIAS/x"]) {
      expect(parseSelectionHash(geo.books, bad)).toBeNull();
    }
    expect(chapterName(geo.books, parseSelectionHash(geo.books, "#1-corintios/13")!)).toBe("1 Coríntios 13");
  });

  it("steps one chapter or one book along the baseline, clamped at the ends", () => {
    const is9 = parseSelectionHash(geo.books, "#isaias/9")!;
    expect(chapterName(geo.books, stepChapter(geo.books, geo.nch, is9, 1, false))).toBe("Isaías 10");
    expect(chapterName(geo.books, stepChapter(geo.books, geo.nch, is9, 1, true))).toBe("Jeremias 1");
    expect(chapterName(geo.books, stepChapter(geo.books, geo.nch, is9, -1, true))).toBe("Cânticos 1");
    expect(stepChapter(geo.books, geo.nch, 0, -1, false)).toBe(0);
    expect(stepChapter(geo.books, geo.nch, geo.nch - 1, 1, true)).toBe(geo.books[geo.books.length - 1][3]);
  });
});

// width and height stored in a WebP (VP8 / VP8L / VP8X) or AVIF (ispe box) header
function imageSize(file: string): [number, number] {
  const b = readFileSync(file);
  if (b.toString("ascii", 0, 4) === "RIFF") {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === "VP8L") {
      const v = b.readUInt32LE(21);
      return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
    }
    if (kind === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  }
  const i = b.indexOf("ispe");
  if (i > 0) return [b.readUInt32BE(i + 8), b.readUInt32BE(i + 12)];
  throw new Error(`${file}: unknown image header`);
}

describe("sky posters", () => {
  it("are committed at the sizes the page declares", () => {
    for (const p of [POSTER.head, POSTER.headGold, POSTER.full, POSTER.fullGold]) {
      for (const f of [p.avif, p.webp]) {
        const path = join(SITE, "public", f);
        expect(existsSync(path), f).toBe(true);
        expect(imageSize(path), f).toEqual([p.w, p.h]);
      }
    }
  });
});
