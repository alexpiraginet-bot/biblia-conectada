// The endless list under a verse's links (src/lib/links-feed.ts, design/README.md §6.2), run on the files the browser
// fetches (public/data/verse-links and public/data/text) and checked against the book files the verse panel reads:
// breadth-first in the panel's order, at most FEED_PER_HUB links with a positive vote per section, strongest first,
// every text the BLIVRE's, no verse twice, the next verse of the Bible when an island of the graph runs out, a failed
// fetch that changes nothing, and an end once nothing new is left.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { OUT } from "../scripts/data/sources";
import { createGrid } from "../src/lib/canon/grid";
import {
  FEED_MIN_VOTES,
  FEED_PER_HUB,
  nextSection,
  partnersFromFlat,
  startFeed,
  type FeedLoader,
  type FeedPartner,
  type FeedSection,
} from "../src/lib/links-feed";
import { bookFile, books } from "./generated";

let grid: ReturnType<typeof createGrid>;
/** by global verse, as the panel reads them from the book files */
let text: string[];
let links: [number, number, number][][];

beforeAll(() => {
  grid = createGrid(books());
  text = [];
  links = [];
  for (const b of books()) {
    for (const ch of bookFile(b.slug).chapters) {
      for (const v of ch) {
        text.push(v.t);
        links.push(v.l);
      }
    }
  }
});

/** The page's loader, on the files of public/data. */
function publicLoader(): FeedLoader {
  const files = new Map<string, unknown>();
  const read = <T,>(rel: string): T => {
    if (!files.has(rel)) files.set(rel, JSON.parse(readFileSync(join(OUT.publicData, rel), "utf8")));
    return files.get(rel) as T;
  };
  return {
    async links(gv) {
      const { book, chapter, verse } = grid.locate(gv);
      return partnersFromFlat(read<number[][]>(`verse-links/${book.slug}/${chapter}.json`)[verse - 1]);
    },
    async text(gv) {
      const { book, chapter, verse } = grid.locate(gv);
      return read<string[]>(`text/${book.slug}/${chapter}.json`)[verse - 1];
    },
  };
}

const at = (slug: string, chapter: number, verse: number) => grid.verseIndex(books().find((b) => b.slug === slug)!, chapter, verse);
const start = (gv: number) => startFeed(gv, links[gv].map(([p, votes]) => ({ gv: p, votes })), grid.verseCount);

/** Sections from a verse, asked for the way the page asks (a call that finds nothing is made again). */
async function run(gv: number, count: number, load: FeedLoader) {
  let state = start(gv);
  const sections: FeedSection[] = [];
  while (sections.length < count) {
    const r = await nextSection(state, load);
    if (!r) break;
    state = r.state;
    if (r.section) sections.push(r.section);
  }
  return sections;
}

type Want = { hub: number; from: number | null; votes: number; cards: [number, number][] };

/** The same list written the plain way, from the book files: one queue of verses in the order they appeared. */
function expected(gv: number, count: number): Want[] {
  const seen = new Set<number>([gv, ...links[gv].map(([p]) => p)]);
  const queue: { gv: number; from: number | null; votes: number }[] = links[gv].map(([p, votes]) => ({ gv: p, from: gv, votes }));
  let next = (gv + 1) % grid.verseCount;
  const out: Want[] = [];
  for (let q = 0; out.length < count; ) {
    let hub;
    if (q < queue.length) hub = queue[q++];
    else {
      while (seen.has(next)) next = (next + 1) % grid.verseCount;
      hub = { gv: next, from: null, votes: 0 };
      next = (next + 1) % grid.verseCount;
    }
    const fresh = links[hub.gv]
      .filter(([p, v]) => v >= FEED_MIN_VOTES && p !== hub.gv && !seen.has(p))
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, FEED_PER_HUB);
    if (!fresh.length) {
      if (hub.from === null) seen.add(hub.gv);
      continue;
    }
    seen.add(hub.gv);
    for (const [p, v] of fresh) {
      seen.add(p);
      queue.push({ gv: p, from: hub.gv, votes: v });
    }
    out.push({ hub: hub.gv, from: hub.from, votes: hub.votes, cards: fresh.map(([p, v]) => [p, v]) });
  }
  return out;
}

describe("the endless list of a verse's links", () => {
  it("reads one verse's links from its chapter file", () => {
    expect(partnersFromFlat([26045, 724, 30175, 291])).toEqual([
      { gv: 26045, votes: 724 },
      { gv: 30175, votes: 291 },
    ]);
    expect(partnersFromFlat([])).toEqual([]);
  });

  it("follows the links breadth-first, strongest first, with the BLIVRE text and no verse twice", async () => {
    const load = publicLoader();
    const single = links.findIndex((l) => l.length === 1);
    const starts = [
      at("levitico", 26, 3), // the verse of Alex's screenshot (19/10)
      at("isaias", 9, 6), // the most linked verse
      at("joao", 3, 16),
      at("genesis", 1, 1),
      single,
    ];
    for (const gv of starts) {
      const sections = await run(gv, 120, load);
      const want = expected(gv, 120);
      expect(sections.length, `${gv}`).toBe(120);
      expect(
        sections.map((s) => ({ hub: s.hub, from: s.from, votes: s.votes, cards: s.cards.map((c) => [c.gv, c.votes]) })),
        `${gv}`,
      ).toEqual(want);
      // shown once: the verse, its own list, then every card
      const shown = [gv, ...links[gv].map(([p]) => p), ...sections.flatMap((s) => s.cards.map((c) => c.gv))];
      expect(new Set(shown).size, `${gv}`).toBe(shown.length);
      for (const s of sections) {
        expect(s.text).toBe(text[s.hub]);
        expect(s.cards.length).toBeGreaterThan(0);
        expect(s.cards.length).toBeLessThanOrEqual(FEED_PER_HUB);
        s.cards.forEach((c, i) => {
          expect(c.text).toBe(text[c.gv]);
          expect(c.votes).toBeGreaterThanOrEqual(FEED_MIN_VOTES);
          // a link of the hub in the panel's data, with the same votes
          expect(links[s.hub].find(([p]) => p === c.gv)?.[1]).toBe(c.votes);
          if (i > 0) expect(c.votes).toBeLessThanOrEqual(s.cards[i - 1].votes);
        });
      }
      // the first sections open the verse's own links in the panel's order
      const own = links[gv].map(([p]) => p);
      const opened = sections.filter((s) => s.from === gv).map((s) => s.hub);
      expect(opened).toEqual(own.filter((p) => opened.includes(p)));
    }
  });

  it("goes on from the next verse of the Bible when an island of the graph runs out", async () => {
    // a verse whose only neighbour links back to it alone
    const island = links.findIndex((l, gv) => l.length === 1 && links[l[0][0]].length === 1 && links[l[0][0]][0][0] === gv);
    expect(island).toBeGreaterThanOrEqual(0);
    const sections = await run(island, 30, publicLoader());
    expect(sections[0].from).toBeNull();
    expect(sections[0].hub).toBeGreaterThan(island);
    expect(sections.map((s) => ({ hub: s.hub, from: s.from, votes: s.votes, cards: s.cards.map((c) => [c.gv, c.votes]) }))).toEqual(expected(island, 30));
  });

  it("leaves the state as it was when a file fails, so the same section comes when tried again", async () => {
    const load = publicLoader();
    const gv = at("levitico", 26, 3);
    const s0 = start(gv);
    const before = { seen: [...s0.seen], queue: [...s0.queue], next: s0.next };
    let calls = 0;
    const failing: FeedLoader = {
      links: load.links,
      text: async (v) => {
        if (++calls === 2) throw new Error("offline");
        return load.text(v);
      },
    };
    await expect(nextSection(s0, failing)).rejects.toThrow("offline");
    expect({ seen: [...s0.seen], queue: [...s0.queue], next: s0.next }).toEqual(before);
    expect(await nextSection(s0, load)).toEqual(await nextSection(start(gv), load));
  });

  it("ends once no verse is left with anything new, never showing a link without a positive vote", async () => {
    // 0–1 (3 votes), 1–2 (1), 3–4 (2), 4–5 (−1): two islands and a link voted down
    const graph: Record<number, FeedPartner[]> = {
      0: [{ gv: 1, votes: 3 }],
      1: [
        { gv: 0, votes: 3 },
        { gv: 2, votes: 1 },
      ],
      2: [{ gv: 1, votes: 1 }],
      3: [{ gv: 4, votes: 2 }],
      4: [
        { gv: 3, votes: 2 },
        { gv: 5, votes: -1 },
      ],
      5: [{ gv: 4, votes: -1 }],
    };
    const load: FeedLoader = { links: async (gv) => graph[gv], text: async (gv) => `v${gv}` };
    let state = startFeed(0, [{ gv: 1, votes: 3 }], 6);
    const a = await nextSection(state, load);
    expect(a?.section).toEqual({ hub: 1, from: 0, votes: 3, text: "v1", cards: [{ gv: 2, votes: 1, text: "v2" }] });
    state = a!.state;
    const b = await nextSection(state, load);
    expect(b?.section).toEqual({ hub: 3, from: null, votes: 0, text: "v3", cards: [{ gv: 4, votes: 2, text: "v4" }] });
    state = b!.state;
    expect(await nextSection(state, load)).toBeNull();
  });
});
