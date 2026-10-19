// Ponte nº N: every bridge of the calendar is checked with a second breadth-first search written apart from the
// pipeline's (scripts/data/ponte.ts): adjacency lists of plain arrays read from the book files, layer by layer.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PONTE_RULES, ponteCalendar } from "../scripts/data/ponte";
import { OUT } from "../scripts/data/sources";
import {
  PONTE_DAYS,
  PONTE_LAUNCH,
  bridgeDate,
  bridgeNumber,
  decodeDistances,
  distanceAt,
  type PonteBuilt,
  type PonteCalendar,
  type PonteFile,
} from "../src/lib/community/ponte";
import { grid } from "../src/lib/reading";
import { bookFile, books, generated } from "./generated";

const neighbours: number[][] = [];
const votesOf: Map<number, number>[] = [];
const text: string[] = [];
const rawLinks: [number, number, number][][] = [];
for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) {
  neighbours.push(v.l.map(([p]) => p));
  votesOf.push(new Map(v.l.map(([p, w]) => [p, w])));
  text.push(v.t);
  rawLinks.push(v.l);
}
const N = neighbours.length;

/** Layered search: hops from `source` (-1 unreachable) and how many shortest paths reach each verse. */
function layers(source: number, minVotes = -Infinity, stopAfter = Infinity) {
  const hops = new Array<number>(N).fill(-1);
  const paths = new Array<number>(N).fill(0);
  hops[source] = 0;
  paths[source] = 1;
  let frontier = [source];
  for (let depth = 1; frontier.length && depth <= stopAfter; depth++) {
    const next: number[] = [];
    for (const u of frontier) {
      for (const w of neighbours[u]) {
        if (votesOf[u].get(w)! < minVotes) continue;
        if (hops[w] === -1) {
          hops[w] = depth;
          next.push(w);
        }
        if (hops[w] === depth) paths[w] += paths[u];
      }
    }
    frontier = next;
  }
  return { hops, paths };
}

const calendar = JSON.parse(readFileSync(join(OUT.publicData, "ponte", "calendar.json"), "utf8")) as PonteCalendar;
const file = (n: number) => JSON.parse(readFileSync(join(OUT.publicData, "ponte", `${n}.json`), "utf8")) as PonteFile;
const testament = (gv: number) => grid.locate(gv).book.testament;

describe("Ponte calendar", () => {
  it("holds one bridge a day for a year from the launch, all different endpoints", () => {
    expect(calendar.launch).toBe(PONTE_LAUNCH);
    expect(calendar.timeZone).toBe("America/Sao_Paulo");
    expect(calendar.bridges).toHaveLength(PONTE_DAYS);
    const ends = calendar.bridges.flatMap(([s, t]) => [s, t]);
    expect(new Set(ends).size).toBe(ends.length);
  });

  it("prerenders pages only up to the bridge of the build day (no future bridge in the HTML)", () => {
    const built = generated<PonteBuilt>("community/ponte-built.json");
    expect(built.builtThrough).toBe(Math.max(0, Math.min(PONTE_DAYS, bridgeNumber(built.builtOn))));
    expect(calendar.builtThrough).toBe(built.builtThrough);
    expect(built.bridges).toHaveLength(built.builtThrough);
    built.bridges.forEach((b, i) => {
      expect([b.n, b.date, b.start, b.target, b.min]).toEqual([i + 1, bridgeDate(i + 1), ...calendar.bridges[i]]);
      expect(b.texts).toEqual([text[b.start], text[b.target]]);
    });
  });

  it("keeps each date's bridge between builds", () => {
    // the pipeline is deterministic (fixed seed, data pinned by SHA-256 in build-data.ts); this fingerprint changes
    // only if the rules in scripts/data/ponte.ts change, which would move the bridge of dates already published
    const hash = createHash("sha256").update(JSON.stringify(calendar.bridges)).digest("hex");
    expect(hash).toBe(PINNED_CALENDAR_SHA256);
    const again = ponteCalendar(rawLinks, {
      isOT: (gv) => testament(gv) === "AT",
      chapterOf: (gv) => {
        const { book, chapter } = grid.locate(gv);
        return book.firstChapter + chapter - 1;
      },
      textLength: (gv) => text[gv].length,
      days: 12,
    });
    expect(again.map((b) => [b.start, b.target, b.min])).toEqual(calendar.bridges.slice(0, 12));
  });
});

describe("every bridge, checked by a second search", () => {
  it("is solvable in its minimum (3 to 5 hops), with the stated number of shortest routes and distance map", () => {
    for (let n = 1; n <= PONTE_DAYS; n++) {
      const f = file(n);
      const [s, t, min] = calendar.bridges[n - 1];
      expect([f.n, f.date, f.start, f.target, f.min], `nº ${n}`).toEqual([n, bridgeDate(n), s, t, min]);
      expect(min).toBeGreaterThanOrEqual(3);
      expect(min).toBeLessThanOrEqual(5);
      // odd bridges go from the Old to the New Testament, even ones back
      expect([testament(s), testament(t)]).toEqual(n % 2 ? ["AT", "NT"] : ["NT", "AT"]);
      for (const v of [s, t]) {
        expect(neighbours[v].length).toBeGreaterThanOrEqual(PONTE_RULES.minLinks);
        expect(neighbours[v].length).toBeLessThanOrEqual(PONTE_RULES.maxLinks);
      }
      const fromT = layers(t);
      expect(fromT.hops[s], `nº ${n} minimum`).toBe(min);
      expect(fromT.paths[s], `nº ${n} routes`).toBe(f.routes);
      expect(f.routes).toBeGreaterThanOrEqual(PONTE_RULES.minRoutes);
      const packed = decodeDistances(f.dist);
      for (let v = 0; v < N; v++) {
        const want = fromT.hops[v] < 0 ? null : fromT.hops[v];
        if (distanceAt(packed, v) !== want) expect(distanceAt(packed, v), `nº ${n} verse ${v}`).toBe(want);
      }
    }
  });

  it("names as strongest a shortest route whose weakest link no other shortest route beats", () => {
    for (let n = 1; n <= PONTE_DAYS; n++) {
      const f = file(n);
      const route = f.strongest;
      expect(route[0]).toBe(f.start);
      expect(route[route.length - 1]).toBe(f.target);
      expect(route.length - 1, `nº ${n}`).toBe(f.min);
      route.slice(1).forEach((v, i) => expect(votesOf[route[i]].get(v), `nº ${n} hop ${i + 1}`).toBe(f.strongestVotes[i]));
      const weakest = Math.min(...f.strongestVotes);
      expect(weakest).toBeGreaterThanOrEqual(PONTE_RULES.minWeakestVotes);
      // with only links of at least `weakest` votes the minimum still holds; with one vote more it cannot
      expect(layers(f.start, weakest, f.min).hops[f.target], `nº ${n}`).toBe(f.min);
      expect(layers(f.start, weakest + 1, f.min).hops[f.target], `nº ${n}`).toBe(-1);
      for (const v of route) expect(f.texts[String(v)]).toBe(text[v]);
    }
  });
});

const PINNED_CALENDAR_SHA256 = "bd8bf5b74cf53d736103bcaf91a8236954105ebbfafc55a3fb8417012390531d";
