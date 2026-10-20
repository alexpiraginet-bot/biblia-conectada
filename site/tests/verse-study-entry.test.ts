import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VerseStudyLink } from "../src/components/assistant/VerseStudyLink";
import { AncientJourneyMap } from "../src/components/journey/AncientJourneyMap";
import { ChronologicalReading } from "../src/components/journey/ChronologicalReading";
import { ChapterText } from "../src/components/reader/ChapterText";
import { VersePanel } from "../src/components/sculpture/Panel";
import { verseOf } from "../src/components/sculpture/state";
import { BOOKS } from "../src/lib/community/books-client";
import { jesusJourney } from "../src/lib/caminhos";
import { loadChronologicalReading } from "../src/lib/chronological-reading";
import { bookFile, books } from "./generated";

const entries = (html: string) => [...html.matchAll(/<a\b[^>]*href="\/assistente\?ref=([^"]+)"[^>]*>/g)].map((match) => match[1]);
const gv = (slug: string, chapter: number, verse: number) => verseOf(BOOKS.find((book) => book.slug === slug)!, chapter, verse);

describe("verse study entry points", () => {
  it("offers an ordinary link to the exact verse without issuing a request", () => {
    const html = renderToStaticMarkup(createElement(VerseStudyLink, { path: "/jeremias/17/8", label: "Jeremias 17:8" }));
    expect(entries(html)).toEqual(["jeremias/17/8"]);
    expect(html).toContain('aria-label="Entender Jeremias 17:8 com IA"');
    expect(html).not.toContain("<button");
  });

  it("keeps the 3D origin and each connected verse distinct, even with an active connection", () => {
    const origin = gv("jeremias", 17, 8), other = gv("salmos", 1, 3);
    const html = renderToStaticMarkup(createElement(VersePanel, {
      gv: origin, nt: false, partners: [{ gv: other, votes: 1 }],
      text: bookFile("jeremias").chapters[16][7].t, snippets: new Map([[other, bookFile("salmos").chapters[0][2].t]]),
      filter: "todas", onFilter: () => {}, listed: [{ gv: other, votes: 1, i: 0 }], counts: { todas: 1, antigo: 1, novo: 0 },
      shown: 20, onMore: () => {}, focus: 0, onFocus: () => {}, onChapter: () => {}, copied: false, onCopy: () => {},
      save: null, onPath: async () => null, headingId: "verse-title", headingRef: null,
    }));
    expect(entries(html)).toEqual(["jeremias/17/8", "salmos/1/3"]);
    expect(html.indexOf("jeremias/17/8")).toBeLessThan(html.indexOf("Filtrar ligações"));
    for (const button of html.matchAll(/<button\b[^>]*>([^]*?)<\/button>/g)) expect(button[1]).not.toContain("<a ");
  });

  it("keeps reader text separate from the study actions and addresses every verse independently", () => {
    const book = books().find((item) => item.slug === "genesis")!;
    const rows = bookFile("genesis").chapters[5].map((item, index) => ({ n: index + 1, text: item.t, links: item.l }));
    const html = renderToStaticMarkup(createElement(ChapterText, { book, chapter: 6, verses: rows }));
    expect(entries(html)).toEqual(rows.map((item) => `genesis/6/${item.n}`));
    const scripture = [...html.matchAll(/<span data-scripture="">([^]*?)<\/span>/g)].map((match) => match[1]);
    expect(scripture).toHaveLength(rows.length);
    expect(scripture.every((text) => !text.includes("Entender com IA"))).toBe(true);
  });

  it("uses each chronological verse, rather than repeating the first verse of a passage", async () => {
    const moments = await loadChronologicalReading(async (slug, chapter, verse) => bookFile(slug).chapters[chapter - 1][verse - 1].t);
    const html = renderToStaticMarkup(createElement(ChronologicalReading, { moments }));
    expect(entries(html)).toEqual(["lucas/2/6", "lucas/2/7"]);
  });

  it("uses the exact destination of map connections and preserves individual passage verses", async () => {
    const data = await jesusJourney();
    const html = renderToStaticMarkup(createElement(AncientJourneyMap, { data }));
    const stop = data.stops[0];
    const expected = [stop.passage, ...stop.parallels].flatMap((passage) => passage.verses.map((verse) => `${passage.slug}/${passage.chapter}/${verse.n}`));
    expected.push(...stop.connections.map((connection) => connection.versePath.slice(1)));
    expect(entries(html)).toEqual(expected);
  });
});
