// Medallion illustrations: the manifest matches the shipped files, the byte caps hold, and every book, place type and
// kind has a group computed from the sources (Theographic bookDiv, OpenBible types), not typed by hand.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAPS, GROUPS, KIND_GROUP, MAX_ATTEMPTS, MAX_CALLS, MEDALLION_DIR, PLACE_TYPE_GROUP, SIZES, bookGroupFromTheographic,
  buildManifest, fileName, openBiblePlaces, placeGroup, readReviewLog, sha256File, webpSize, type Manifest,
} from "../scripts/data/medallions";
import { SITE } from "../scripts/data/sources";
import { medalhaoForBook, medalhaoForKind, medalhaoForPlaceTypes, medalhaoGroups } from "../src/lib/medalhoes";
import { books } from "./generated";

const manifest = JSON.parse(readFileSync(join(SITE, "src/data/medalhoes.json"), "utf8")) as Manifest;
const groups = Object.values(manifest.groups);
const log = readReviewLog();

describe("medallion files", () => {
  it("has a group for every definition, and nothing else", () => {
    expect(Object.keys(manifest.groups).sort()).toEqual(GROUPS.map((g) => g.id).sort());
    expect(groups).toHaveLength(20);
  });

  it("ships exactly two square WebP files per group, within the caps", () => {
    const expected = groups.flatMap((g) => SIZES.map((s) => fileName(g.id, s))).sort();
    expect(readdirSync(MEDALLION_DIR).sort()).toEqual(expected);
    for (const g of groups) {
      for (const s of SIZES) {
        const path = join(MEDALLION_DIR, fileName(g.id, s));
        expect(existsSync(path), path).toBe(true);
        const buf = readFileSync(path);
        expect(webpSize(buf), path).toEqual({ width: s, height: s });
        expect(buf.length, `${path}: ${buf.length} B`).toBeLessThanOrEqual(CAPS[s]);
        expect(buf.length).toBe(g.bytes[s]);
      }
      expect(g.src96).toBe(`/medalhoes/${fileName(g.id, 96)}`);
      expect(g.src192).toBe(`/medalhoes/${fileName(g.id, 192)}`);
    }
  });

  it("stays within the total cap", () => {
    const total = groups.reduce((n, g) => n + SIZES.reduce((m, s) => m + readFileSync(join(MEDALLION_DIR, fileName(g.id, s))).length, 0), 0);
    expect(total).toBeLessThanOrEqual(CAPS.total);
  });

  it("records the sha256 of each file", () => {
    for (const g of groups) for (const s of SIZES) expect(g.sha256[s], `${g.id} ${s}`).toBe(sha256File(join(MEDALLION_DIR, fileName(g.id, s))));
  });
});

describe("medallion manifest", () => {
  it("is what scripts/medallions.ts manifest writes (no hand edits)", () => {
    expect(JSON.parse(JSON.stringify(buildManifest()))).toEqual(manifest);
  });

  it("has every field filled", () => {
    expect(manifest.version).toBe(1);
    for (const g of groups) {
      for (const k of ["id", "kind", "category", "label", "alt", "src96", "src192", "prompt", "model", "createdAt"] as const) {
        expect(typeof g[k], `${g.id}.${k}`).toBe("string");
        expect(g[k].trim(), `${g.id}.${k}`).not.toBe("");
      }
      expect(g.alt.startsWith("Ilustração: "), g.id).toBe(true);
      expect(Number.isNaN(Date.parse(g.createdAt)), g.id).toBe(false);
      for (const s of SIZES) expect(g.sha256[s]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("matches the review log: one accepted call per group, prompt and model as sent", () => {
    for (const g of groups) {
      const accepted = log.calls.filter((c) => c.id === g.id && c.status === "accepted");
      expect(accepted, g.id).toHaveLength(1);
      expect(accepted[0].prompt).toBe(g.prompt);
      expect(accepted[0].model).toBe(g.model);
      expect(accepted[0].createdAt).toBe(g.createdAt);
    }
  });

  it("keeps the generation inside its budget, with a reason for every verdict", () => {
    expect(log.calls.length).toBeLessThanOrEqual(MAX_CALLS);
    for (const g of GROUPS) expect(log.calls.filter((c) => c.id === g.id).length, g.id).toBeLessThanOrEqual(MAX_ATTEMPTS);
    for (const c of log.calls) {
      expect(c.status, `${c.id} attempt ${c.attempt}`).not.toBe("pending");
      expect(c.reason.trim(), `${c.id} attempt ${c.attempt}`).not.toBe("");
    }
  });

  it("carries the hard bans in every prompt", () => {
    for (const g of groups) {
      for (const ban of ["text, letters", "faces, hands or children", "light rays", "Bible, open book", "dove", "religious symbol", "weapons", "eagle, fasces"]) {
        expect(g.prompt, `${g.id}: ${ban}`).toContain(ban);
      }
    }
  });
});

describe("medallion groups come from the sources", () => {
  it("gives all 66 books a group from Theographic bookDiv", () => {
    const fromSource = bookGroupFromTheographic();
    expect(manifest.bookGroup).toEqual(fromSource);
    const osis = books().map((b) => b.osis);
    expect(osis).toHaveLength(66);
    expect(Object.keys(manifest.bookGroup)).toEqual(osis);
    for (const o of osis) expect(medalhaoForBook(o), o).not.toBeNull();
  });

  it("puts the books where the source divisions say (spot checks)", () => {
    const bg = manifest.bookGroup;
    expect([bg.Gen, bg.Deut, bg.Josh, bg.Esth, bg.Ps, bg.Lam, bg.Isa, bg.Mal]).toEqual(["pentateuco", "pentateuco", "historicos", "historicos", "poesia", "poesia", "profetas", "profetas"]);
    expect([bg.Matt, bg.John, bg.Acts, bg.Rom, bg.Heb, bg.Jude, bg.Rev]).toEqual(["evangelhos", "evangelhos", "atos", "cartas", "cartas", "cartas", "apocalipse"]);
    const count = (id: string) => Object.values(bg).filter((g) => g === id).length;
    expect([count("pentateuco"), count("historicos"), count("poesia"), count("profetas"), count("evangelhos"), count("atos"), count("cartas"), count("apocalipse")]).toEqual([5, 12, 6, 16, 4, 1, 21, 1]);
  });

  it("gives every OpenBible ancient place a group through its types", () => {
    const places = openBiblePlaces();
    expect(places).toHaveLength(1342);
    for (const p of places) {
      expect(placeGroup(p.types ?? []), p.friendly_id).not.toBeNull();
      expect(medalhaoForPlaceTypes(p.types ?? []), p.friendly_id).not.toBeNull();
    }
    expect(manifest.placeTypeGroup).toEqual(PLACE_TYPE_GROUP);
  });

  it("covers people, people groups and events", () => {
    expect(manifest.kindGroup).toEqual(KIND_GROUP);
    for (const k of ["pessoa", "povo", "evento"] as const) expect(medalhaoForKind(k)?.kind).toBe(k);
  });

  it("uses each group for the kind it was drawn for", () => {
    const placeGroups = new Set(Object.values(PLACE_TYPE_GROUP));
    const bookGroups = new Set(Object.values(manifest.bookGroup));
    for (const g of medalhaoGroups()) {
      if (g.kind === "livro") expect(bookGroups.has(g.id), g.id).toBe(true);
      if (g.kind === "lugar") expect(placeGroups.has(g.id), g.id).toBe(true);
    }
    expect(bookGroups.size + placeGroups.size + Object.keys(KIND_GROUP).length).toBe(20);
  });
});
