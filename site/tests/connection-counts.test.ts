import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConnectionCount, ChapterPanel, VersePanel } from "../src/components/sculpture/Panel";
import { chapterConnectionCounts } from "../src/components/sculpture/connection-counts";
import { contentOf } from "../src/components/sculpture/snapshot";
import { AtlasMap } from "../src/components/explore/AtlasMap";
import { buildGeometry, decodeArcs, type SkyMeta } from "../src/components/sky/model";
import { atlasOf, defaultConnection } from "../src/lib/explore/atlas-data";
import { chapterKey } from "../src/lib/explore/data";
import { OUT } from "../scripts/data/sources";
import { books } from "./generated";

vi.mock("next/navigation", () => ({ useSelectedLayoutSegments: () => [] }));

const meta = JSON.parse(readFileSync(join(OUT.publicData, "sky.json"), "utf8")) as SkyMeta;
const geo = buildGeometry(meta);
const raw = readFileSync(join(OUT.publicData, "arcs.bin"));
const arcs = decodeArcs(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), true);

describe("complete connection counts", () => {
  it("counts internal pairs once, each endpoint's partners, and negative votes without treating votes as counts", () => {
    expect(chapterConnectionCounts(10, [[11, 99, 50, -5, 10, 10], [10, 99, 60, 0]])).toEqual({ total: 3, byVerse: [2, 2] });
    expect(chapterConnectionCounts(10, [[], []])).toEqual({ total: 0, byVerse: [0, 0] });
  });

  it("matches the complete binary and metadata for every chapter and every verse", () => {
    const totals = new Uint32Array(geo.nch);
    const verses = new Uint32Array(geo.nverses);
    for (let i = 0; i < arcs.n; i++) {
      const a = arcs.a[i], b = arcs.b[i], ca = geo.chapOfGv[a], cb = geo.chapOfGv[b];
      totals[ca]++;
      if (ca !== cb) totals[cb]++;
      verses[a]++;
      verses[b]++;
    }
    for (const book of books()) {
      for (let c = 0; c < book.verses.length; c++) {
        const ci = book.firstChapter + c, first = geo.chapterFirst[ci];
        const rows = JSON.parse(readFileSync(join(OUT.publicData, "verse-links", book.slug, `${c + 1}.json`), "utf8")) as number[][];
        const counted = chapterConnectionCounts(first, rows);
        expect(counted.total, `${book.slug}/${c + 1}`).toBe(totals[ci]);
        expect(geo.chapterPairs[ci]).toBe(totals[ci]);
        expect(counted.byVerse).toEqual(Array.from(verses.slice(first, first + book.verses[c])));
      }
    }
  });

  it("renders loading and failed counts distinctly from a true zero", () => {
    const render = (props: ComponentProps<typeof ConnectionCount>) => renderToStaticMarkup(createElement(ConnectionCount, props));
    expect(render({ total: null })).toContain("Contando conexões…");
    const failed = render({ total: null, failed: true, onRetry: () => {} });
    expect(failed).toContain("Contagem indisponível.");
    expect(failed).toContain("Tentar de novo");
    expect(failed).not.toContain("0 conexões");
    expect(render({ total: 0 })).toContain("0 conexões");
    expect(render({ total: 1 })).toContain("1 conexão");
  });

  it("shows the chapter's complete total before its text, independently of a small drawing sample", () => {
    const book = books().find((b) => b.slug === "2-corintios")!;
    const ci = book.firstChapter + 5;
    const html = renderToStaticMarkup(createElement(ChapterPanel, {
      ci, nch: geo.nch, first: geo.chapterFirst[ci], verses: geo.chapterVerses[ci], total: geo.chapterPairs[ci],
      highlights: [], snippets: new Map(), sceneControl: createElement("p", null, "2 arcos em destaque"),
      onVerse: () => {}, onChapter: () => {}, save: null, headingId: "chapter", headingRef: null,
    }));
    expect(html).toContain(`data-connection-total="${geo.chapterPairs[ci]}"`);
    expect(html.indexOf("data-connection-total")).toBeLessThan(html.indexOf("Texto de 2 Coríntios 6"));
    expect(html).toContain("2 arcos em destaque");
  });

  it("keeps the full verse count when its list is filtered, and does not call network failure zero", () => {
    const props: ComponentProps<typeof VersePanel> = {
      gv: 0, nt: false, partners: [{ gv: 1, votes: 900 }, { gv: 24000, votes: -1 }],
      text: "Texto", textFailed: false, onTextRetry: () => {}, snippets: new Map(), filter: "novo", onFilter: () => {},
      listed: [{ gv: 24000, votes: -1, i: 1 }], counts: { todas: 2, antigo: 1, novo: 1 }, shown: 20,
      onMore: () => {}, focus: -1, onFocus: () => {}, onChapter: () => {}, copied: false, onCopy: () => {},
      save: null, onPath: async () => null, headingId: "verse", headingRef: null,
    };
    const html = renderToStaticMarkup(createElement(VersePanel, props));
    expect(html).toContain('data-connection-total="2"');
    expect(html).toContain("1 no filtro Novo Testamento");
    const failed = renderToStaticMarkup(createElement(VersePanel, { ...props, partners: null, linksFailed: true }));
    expect(failed).toContain("Contagem indisponível.");
    expect(failed).not.toContain("não tem ligações");
  });

  it("exports the complete chapter total separately from the drawn sample", () => {
    const book = books().find((b) => b.slug === "2-corintios")!;
    const ci = book.firstChapter + 5;
    vi.stubGlobal("window", { location: new URL("https://www.bibliaconectada.company/arcos#2-corintios/6") });
    try {
      const content = contentOf({
        sel: { kind: "chapter", ci }, labels: [], data: null,
        partners: null, chapterLinks: geo.chapterPairs[ci], chapterDrawn: 2, verseText: null,
        full: false, hops: null, wordVerses: null, wordLinks: null, groups: [], strength: null,
        counts: meta.counts, credits: [],
      });
      expect(content.title).toBe("2 Coríntios 6");
      expect(content.subtitle).toBe(`${geo.chapterPairs[ci]} ligações na base`);
      expect(content.body).toContain("2 arcos em destaque, da amostra mais votada");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("explore shows every cross-chapter pair, not merely the nodes drawn on the map", async () => {
    const book = books().find((b) => b.slug === "2-corintios")!;
    const chapter = 6, ci = book.firstChapter + chapter - 1;
    const atlas = await atlasOf(book, chapter);
    const selected = (await defaultConnection(book, chapter))!;
    let external = 0;
    const partners = new Set<number>();
    for (let i = 0; i < arcs.n; i++) {
      const a = geo.chapOfGv[arcs.a[i]], b = geo.chapOfGv[arcs.b[i]];
      if (a !== b && (a === ci || b === ci)) { external++; partners.add(a === ci ? b : a); }
    }
    const html = renderToStaticMarkup(createElement(AtlasMap, { atlas, selected: { key: chapterKey(selected.other), group: selected.group } }));
    expect(atlas.partners).toBe(partners.size);
    expect(html).toContain(`data-chapter-connections="${external}"`);
    expect(external).toBeGreaterThan(atlas.wide.nodes.length);
    expect(html).toContain("com outros capítulos");
    expect(html.indexOf("data-chapter-connections")).toBeLessThan(html.indexOf('data-variant="wide"'));
  });
});
