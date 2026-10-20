// What the remodelled Linha do tempo, Temas and Palavras pages compute on top of the generated data: the periods of the
// timeline, the links between events (the sky's arcs and the linked events of an event page), the passages and words
// of a theme, and the word marks. Recounted here by brute force from the book files (CLAUDE.md rule 3).
import { describe, expect, it } from "vitest";
import { createGrid } from "../src/lib/canon/grid";
import { yearSpanShort } from "../src/lib/eras";
import { ARCS_SHOWN, crossArcs, eventLinks, passagePairs, rankPassages, relatedOf, RELATED_SHOWN, sharedWords, WORDS_SHOWN } from "../src/lib/timeline-graph";
import { PERIODS, splitPeriods } from "../src/lib/timeline-periods";
import { contentKeys, splitOnWord, tokenize } from "../src/lib/words";
import { bookFile, books, generated } from "./generated";

type Link = [number, number, number];
type Ev = { id: number; ref: string; titleEn: string; year: number; verses: number[] };
type Theme = { slug: string; key: string; passages: { osis: string; from: number; to: number; score: number }[] };

const grid = createGrid(books());
const text: string[] = [];
const links: Link[][] = [];
for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) {
  text.push(v.t);
  links.push(v.l);
}
const events = generated<{ events: Ev[] }>("linha-do-tempo/events.json").events;
const themes = generated<{ themes: Theme[] }>("temas.json").themes;
const ref = (osis: string, c: number, v: number) => grid.verseIndex(books().find((b) => b.osis === osis)!, c, v);
const byId = (id: number) => events.findIndex((e) => e.id === id);

describe("periods of the timeline (src/lib/timeline-periods.ts)", () => {
  const periods = splitPeriods(events);
  it("split every event once, in order, into the ten periods", () => {
    expect(periods.map((p) => p.id)).toEqual(PERIODS.map((p) => p.id));
    expect(new Set(PERIODS.map((p) => p.id)).size).toBe(PERIODS.length);
    expect(periods.flatMap((p) => p.events.map((e) => e.id))).toEqual(events.map((e) => e.id));
    for (const p of periods) {
      expect(p.events.length, p.id).toBeGreaterThan(0);
      expect(p.events[0].id, p.id).toBe(p.from);
      expect(p.first).toBe(Math.min(...p.events.map((e) => e.year)));
      expect(p.last).toBe(Math.max(...p.events.map((e) => e.year)));
    }
    expect(periods.map((p) => p.events.length)).toEqual([64, 54, 10, 26, 8, 80, 5, 18, 103, 82]);
  });
  it("open where the anchors say", () => {
    const at = (id: string) => periods.find((p) => p.id === id)!.events[0].titleEn;
    expect(at("patriarcas")).toBe("Lifetime of Abraham");
    expect(at("exodo")).toBe("Birth of Moses");
    expect(at("reino-unido")).toBe("Reign of Saul");
    expect(at("nascimento")).toBe("Espousal of Mary");
    expect(at("atos")).toBe("The Holy Spirit is promised");
  });
  it("fail loudly when an anchor is missing or out of order", () => {
    expect(() => splitPeriods(events, [{ id: "x", label: "X", from: 999999 }])).toThrow(/missing/);
    expect(() => splitPeriods(events, [PERIODS[1], PERIODS[0]])).toThrow(/order/);
  });
  it("name people as the BLIVRE text names them (rule 4)", () => {
    const PEOPLE = ["Moisés", "Jesus"];
    const words = new Set(text.flatMap(tokenize));
    for (const n of PEOPLE) expect(words.has(n), n).toBe(true);
    expect(books().some((b) => b.name === "Atos")).toBe(true);
    // every capitalised word of a label is a person above, the book of Atos, or the label's first word
    for (const p of PERIODS) {
      const [head, ...rest] = tokenize(p.label);
      for (const w of [head, ...rest].filter((x, k) => k > 0 || PEOPLE.includes(x))) {
        if (/^\p{Lu}/u.test(w)) expect([...PEOPLE, "Atos"], p.label).toContain(w);
      }
    }
  });
  it("write short spans of years", () => {
    expect(yearSpanShort(-4003, -1997)).toBe("4004–1998 a.C.");
    expect(yearSpanShort(26, 30)).toBe("26–30 d.C.");
    expect(yearSpanShort(-5, 9)).toBe("6 a.C.–9 d.C.");
    expect(yearSpanShort(29, 29)).toBe("29 d.C.");
  });
});

describe("links between events (src/lib/timeline-graph.ts)", () => {
  const byEvent = eventLinks(events, links);
  const sets = events.map((e) => new Set(e.verses));

  it("count, for sample events, every pair with one verse only here and the other only there", () => {
    for (const id of [423, 1, 443, 217, 444]) {
      const i = byId(id);
      for (let j = 0; j < events.length; j++) {
        if (j === i) continue;
        let pairs = 0;
        let votes = 0;
        let best = -Infinity;
        for (const u of events[i].verses) {
          if (sets[j].has(u)) continue;
          for (const [v, w] of links[u]) {
            if (!sets[j].has(v) || sets[i].has(v)) continue;
            pairs++;
            votes += w;
            best = Math.max(best, w);
          }
        }
        const got = byEvent[i].get(j);
        if (pairs === 0) expect(got, `${id}→${events[j].id}`).toBeUndefined();
        else expect([got?.pairs, got?.votes, got?.best[0]], `${id}→${events[j].id}`).toEqual([pairs, votes, best]);
      }
    }
  });

  it("are the same seen from either event", () => {
    byEvent.forEach((m, i) => {
      for (const [j, l] of m) {
        const back = byEvent[j].get(i)!;
        expect([back.pairs, back.votes, back.best[0]]).toEqual([l.pairs, l.votes, l.best[0]]);
      }
    });
  });

  it("list an event's most linked events, the precise one first and none nested in another", () => {
    const i = byId(423);
    const related = relatedOf(byEvent[i], events, RELATED_SHOWN);
    expect(related.length).toBe(RELATED_SHOWN);
    // the parable's strongest link: Lucas 10:27 and Mateus 22:37, placed at the Debates in the Temple, not Holy Week
    expect(events[related[0].event].titleEn).toBe("Debates in the Temple");
    expect(related[0].best).toEqual([247, ref("Luke", 10, 27), ref("Matt", 22, 37)]);
    expect(related.some((l) => events[l.event].id === 443)).toBe(false);
    for (let k = 1; k < related.length; k++) expect(related[k].best[0]).toBeLessThanOrEqual(related[k - 1].best[0]);
    for (const a of related) for (const b of related) {
      if (a === b) continue;
      const [x, y] = [sets[a.event], sets[b.event]];
      expect([...x].every((v) => y.has(v)) || [...y].every((v) => x.has(v))).toBe(false);
    }
  });

  it("draw the most voted links between verses of different events, ties at the cut kept", () => {
    const arcs = crossArcs(events, links, ARCS_SHOWN);
    expect(arcs.length).toBeGreaterThanOrEqual(ARCS_SHOWN);
    const cut = arcs[ARCS_SHOWN - 1].votes;
    expect(arcs.every((a) => a.votes >= cut)).toBe(true);
    for (let k = 1; k < arcs.length; k++) expect(arcs[k].votes).toBeLessThanOrEqual(arcs[k - 1].votes);
    // every verse sits at the smallest event that holds it, and the two ends are in different events
    const home = (gv: number) => {
      let h = -1;
      events.forEach((e, i) => {
        if (sets[i].has(gv) && (h < 0 || events[h].verses.length > e.verses.length)) h = i;
      });
      return h;
    };
    for (const a of arcs) {
      expect(a.a).toBeLessThan(a.b);
      expect([home(a.a), home(a.b)]).toEqual([a.ea, a.eb]);
      expect(sets[a.ea].has(a.b) || sets[a.eb].has(a.a)).toBe(false);
      expect(links[a.a].find((l) => l[0] === a.b)?.[1]).toBe(a.votes);
    }
    // no link left out is stronger than the cut
    let stronger = 0;
    for (let u = 0; u < links.length; u++) {
      const hu = home(u);
      if (hu < 0) continue;
      for (const [v, w] of links[u]) {
        if (v <= u || w <= cut) continue;
        const hv = home(v);
        if (hv < 0 || hv === hu || sets[hu].has(v) || sets[hv].has(u)) continue;
        stronger++;
      }
    }
    expect(arcs.filter((a) => a.votes > cut).length).toBe(stronger);
    expect([arcs[0].a, arcs[0].b, arcs[0].votes]).toEqual([ref("Isa", 55, 8), ref("Jer", 29, 11), 1296]);
    const christmas = arcs.find((a) => a.a === ref("Isa", 7, 14) && a.b === ref("Matt", 1, 23))!;
    expect(christmas.votes).toBe(333);
    expect(events[christmas.eb].titleEn).toBe("An Angel Speaks to Joseph in a Dream");
  });
});

describe("theme pages (src/lib/timeline-graph.ts)", () => {
  const luz = themes.find((t) => t.slug === "luz")!;
  it("count the links touching each passage", () => {
    for (const t of themes) {
      for (const p of t.passages) {
        const keys = new Set<string>();
        for (let gv = p.from; gv <= p.to; gv++) for (const [o] of links[gv]) keys.add(`${Math.min(gv, o)}-${Math.max(gv, o)}`);
        expect(passagePairs(p, links), `${t.slug} ${p.osis}`).toBe(keys.size);
      }
    }
    const one = luz.passages.find((p) => p.from === p.to)!;
    expect(passagePairs(one, links)).toBe(links[one.from].length);
  });
  it("list the passages most linked first", () => {
    for (const t of themes) {
      const r = rankPassages(t.passages, links);
      expect(r.map((p) => p.osis).sort()).toEqual(t.passages.map((p) => p.osis).sort());
      for (let k = 1; k < r.length; k++) {
        const [a, b] = [r[k - 1], r[k]];
        expect(a.pairs > b.pairs || (a.pairs === b.pairs && (a.score > b.score || (a.score === b.score && a.from < b.from)))).toBe(true);
      }
    }
    expect(rankPassages(luz.passages, links)[0].pairs).toBe(194);
  });
  it("show the words most passages share, counted in the BLIVRE, the theme's own word first", () => {
    for (const t of themes as (Theme & { coverage: { with: number } })[]) {
      const words = sharedWords(t.passages, text, WORDS_SHOWN, t.key);
      expect(words.length).toBeLessThanOrEqual(WORDS_SHOWN);
      for (const w of words) {
        const n = t.passages.filter((p) => {
          for (let gv = p.from; gv <= p.to; gv++) if (contentKeys(text[gv]).has(w.key)) return true;
          return false;
        }).length;
        expect(w.passages, `${t.slug} ${w.key}`).toBe(n);
        expect(n).toBeGreaterThanOrEqual(2);
      }
      // the theme is named after the word in most of its passages: the same count as the pipeline's
      expect([words[0].key, words[0].passages], t.slug).toEqual([t.key, t.coverage.with]);
      for (let k = 2; k < words.length; k++) expect(words[k].passages).toBeLessThanOrEqual(words[k - 1].passages);
    }
    expect(sharedWords(luz.passages, text, WORDS_SHOWN, "luz").slice(0, 2)).toEqual([{ key: "luz", passages: 14 }, { key: "trevas", passages: 6 }]);
    // without a lead the order is by count alone
    const plain = sharedWords(luz.passages, text, WORDS_SHOWN);
    for (let k = 1; k < plain.length; k++) expect(plain[k].passages).toBeLessThanOrEqual(plain[k - 1].passages);
  });
});

describe("word marks (src/lib/words.ts splitOnWord)", () => {
  it("cut a text around a word, as containsWord matches it", () => {
    expect(splitOnWord("E disse Deus: Haja luz; e houve luz.", "luz")).toEqual(["E disse Deus: Haja ", "luz", "; e houve ", "luz", "."]);
    expect(splitOnWord("Luz e LUZ", "luz")).toEqual(["", "Luz", " e ", "LUZ", ""]);
    expect(splitOnWord("as luzes do céu", "luz")).toEqual(["as luzes do céu"]);
    expect(splitOnWord("o céu e a terra", "ceu")).toEqual(["o ", "céu", " e a terra"]);
    for (const gv of [ref("Gen", 1, 3), ref("John", 1, 5), ref("Isa", 9, 2)]) expect(splitOnWord(text[gv], "luz").join("")).toBe(text[gv]);
  });
});
