// The light sculpture's posters (public/sculpture/, rendered by scripts/render-sculpture-poster.mjs): every image
// src/components/sculpture/poster.ts declares is committed, at the declared size, at the opening view's aspect, and the
// AVIF keeps full chroma and full range (the glow is a slow gradient on a flat ground; subsampling bands it). The
// renderer clears to the page's ground, so the poster, the loading stage and the live canvas show no seam.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { themeTokens } from "../scripts/contrast";
import { SITE } from "../scripts/data/sources";
import { NARROW } from "../src/components/sculpture/home";
import { SCULPTURE_POSTER } from "../src/components/sculpture/poster";
import { GROUND } from "../src/components/sculpture/renderer";
import { HOME_ASPECT } from "../src/components/sculpture/space";

const IMAGES = (["phone", "wide"] as const).flatMap((size) => (["noite", "dia"] as const).map((theme) => ({ size, theme, ...SCULPTURE_POSTER[size][theme] })));
const file = (path: string) => join(SITE, "public", path);

type Box = { type: string; body: number; end: number };

/** The boxes of an ISO BMFF (AVIF) byte range, one level deep. */
function boxes(b: Buffer, start: number, end: number): Box[] {
  const out: Box[] = [];
  for (let p = start; p + 8 <= end; ) {
    let size = b.readUInt32BE(p);
    let body = p + 8;
    if (size === 1) {
      size = Number(b.readBigUInt64BE(p + 8));
      body = p + 16;
    } else if (size === 0) size = end - p;
    if (size < 8 || p + size > end) throw new Error(`broken box at byte ${p}`);
    out.push({ type: b.toString("latin1", p + 4, p + 8), body, end: p + size });
    p += size;
  }
  return out;
}

function child(b: Buffer, parent: Box, type: string, skip = 0): Box {
  const hit = boxes(b, parent.body + skip, parent.end).find((x) => x.type === type);
  if (!hit) throw new Error(`no ${type} box in ${parent.type}`);
  return hit;
}

/** ftyp brand, size (ispe), chroma (av1C) and range (colr nclx) of an AVIF still. */
function avifInfo(path: string) {
  const b = readFileSync(path);
  const top: Box = { type: "file", body: 0, end: b.length };
  const ftyp = child(b, top, "ftyp");
  const brands = [b.toString("latin1", ftyp.body, ftyp.body + 4)];
  for (let p = ftyp.body + 8; p + 4 <= ftyp.end; p += 4) brands.push(b.toString("latin1", p, p + 4));
  // meta is a full box: version and flags come before its children
  const ipco = child(b, child(b, child(b, top, "meta"), "iprp", 4), "ipco");
  const ispe = child(b, ipco, "ispe");
  const av1c = child(b, ipco, "av1C");
  // colour can come as an ICC profile ("prof") and as code points ("nclx"): the range is in the latter
  const colr = boxes(b, ipco.body, ipco.end).find((x) => x.type === "colr" && b.toString("latin1", x.body, x.body + 4) === "nclx");
  const c = b[av1c.body + 2];
  return {
    brands,
    size: [b.readUInt32BE(ispe.body + 4), b.readUInt32BE(ispe.body + 8)],
    profile: b[av1c.body + 1] >> 5,
    monochrome: (c >> 4) & 1,
    subsampling: [(c >> 3) & 1, (c >> 2) & 1],
    nclx: colr !== undefined,
    fullRange: colr ? b[colr.body + 10] >> 7 : -1,
  };
}

/** width and height stored in a WebP header (VP8 / VP8L / VP8X) */
function webpSize(path: string): [number, number] {
  const b = readFileSync(path);
  if (b.toString("latin1", 0, 4) !== "RIFF" || b.toString("latin1", 8, 12) !== "WEBP") throw new Error(`${path}: not a WebP`);
  const kind = b.toString("latin1", 12, 16);
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === "VP8L") {
    const v = b.readUInt32LE(21);
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
  }
  if (kind === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  throw new Error(`${path}: unknown WebP chunk ${kind}`);
}

describe("sculpture posters", () => {
  it("declare one image per theme and size, at the opening view's aspect", () => {
    expect(IMAGES).toHaveLength(4);
    for (const p of IMAGES) {
      expect(Number.isInteger(p.w) && Number.isInteger(p.h), `${p.size} ${p.theme}`).toBe(true);
      expect(p.w / p.h, `${p.size} ${p.theme}`).toBe(HOME_ASPECT);
      expect(p.avif).toBe(`/sculpture/${p.theme}-${p.w}.avif`);
      expect(p.webp).toBe(`/sculpture/${p.theme}-${p.w}.webp`);
    }
    expect(SCULPTURE_POSTER.phone.noite.w).toBeLessThan(SCULPTURE_POSTER.wide.noite.w);
    // the wide image takes over where the page leaves the phone layout (home.ts)
    expect(SCULPTURE_POSTER.media).toBe(`(min-width: ${NARROW / 16}rem)`);
  });

  it("are committed at the declared sizes", () => {
    for (const p of IMAGES) {
      for (const f of [p.avif, p.webp]) expect(existsSync(file(f)), f).toBe(true);
      expect(avifInfo(file(p.avif)).size, p.avif).toEqual([p.w, p.h]);
      expect(webpSize(file(p.webp)), p.webp).toEqual([p.w, p.h]);
    }
  });

  it("keep full chroma and full range in the AVIF", () => {
    for (const p of IMAGES) {
      const a = avifInfo(file(p.avif));
      expect(a.brands, p.avif).toContain("avif");
      // 4:4:4 needs the AV1 High profile
      expect([a.profile, a.monochrome, ...a.subsampling], p.avif).toEqual([1, 0, 0, 0]);
      expect([a.nclx, a.fullRange], p.avif).toEqual([true, 1]);
    }
  });
});

describe("one ground", () => {
  it("the renderer clears to tokens.json `ground` in both themes, the colour of the stage behind the canvas and the poster", () => {
    const tokens = themeTokens();
    for (const theme of ["noite", "dia"] as const) {
      const hex = tokens[theme]["--ground"];
      const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      want.forEach((v, i) => expect(GROUND[theme][i] * 255, `${theme} ${hex}`).toBeCloseTo(v, 6));
    }
  });
});
