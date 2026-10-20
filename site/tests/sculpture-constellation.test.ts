import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import { chapterHighlights, chapterLinks } from "../src/components/sculpture/arcs";
import { readQuery } from "../src/components/sculpture/query";
import { buildGeometry, decodeArcs, indexByChapter } from "../src/components/sky/model";

const meta = JSON.parse(readFileSync(join(OUT.publicData, "sky.json"), "utf8"));
const geometry = buildGeometry(meta);
const bytes = readFileSync(join(OUT.publicData, meta.files.full.file));
const arcs = decodeArcs(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), true);
const index = indexByChapter(geometry, arcs);

describe("readable chapter constellation", () => {
  it("keeps real Daniel 9 links and the complete count while highlighting distinct destination chapters", () => {
    const selection = readQuery("Daniel 9");
    if (!("sel" in selection) || selection.sel.kind !== "chapter") throw new Error("Daniel 9 must be a chapter");
    const all = chapterLinks(geometry, arcs, index, selection.sel.ci);
    const original = [...all];
    const highlights = chapterHighlights(geometry, all);
    expect(all).toEqual(original);
    expect(all.length).toBeGreaterThan(32);
    expect(highlights).toHaveLength(32);
    expect(new Set(highlights.map((link) => geometry.chapOfGv[link.there])).size).toBe(32);
    for (const link of highlights) {
      expect(all).toContain(link);
      const sameChapter = all.filter((other) => geometry.chapOfGv[other.there] === geometry.chapOfGv[link.there]);
      expect(link.votes).toBe(Math.max(...sameChapter.map((other) => other.votes)));
    }
  });

  it("handles an empty set and a bounded mobile subset without manufacturing links", () => {
    expect(chapterHighlights(geometry, [])).toEqual([]);
    const sample = [{ here: 0, there: 50, votes: 5 }, { here: 1, there: 50, votes: 12 }, { here: 0, there: 200, votes: 7 }];
    expect(chapterHighlights(geometry, sample, 1)).toEqual([sample[1]]);
    expect(chapterHighlights(geometry, sample, 0)).toEqual([]);
  });
});
