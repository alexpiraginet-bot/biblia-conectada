import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerseActions } from "@/components/assistant/VerseActions";
import { verseActionFromEvent } from "@/components/assistant/verse-intent-events";
import { loadVerseConnections } from "@/components/reader/verse-connections-data";
import { BASE, verseFromPath } from "@/lib/community/books-client";

const loaders = vi.hoisted(() => ({ text: vi.fn(), links: vi.fn() }));
vi.mock("@/lib/community/fetchers", () => ({ loadChapterText: loaders.text, loadVerseLinks: loaders.links }));
const json = async (file: string) => JSON.parse(await readFile(new URL(`../public/data/${file}`, import.meta.url), "utf8"));

beforeEach(() => { loaders.text.mockReset(); loaders.links.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe("inline verse connections", () => {
  it("offers connections before study and share, with an exact ordinary verse URL", () => {
    const html = renderToStaticMarkup(createElement(VerseActions, { path: "/filipenses/1/18", label: "Filipenses 1:18" }));
    expect(html).toContain('href="/filipenses/1/18"');
    expect(html).toContain('data-connections-ref="filipenses/1/18"');
    expect(html).toContain('aria-label="Conexões de Filipenses 1:18"');
    expect(html.indexOf("Conexões</a>")).toBeLessThan(html.indexOf("Entender com IA"));
    expect(html).toContain('data-share-ref="filipenses/1/18"');
  });

  it("preserves Open NBV study/share without an unreviewed exact-verse mapping", () => {
    const html = renderToStaticMarkup(createElement(VerseActions, { path: "/ler/open-nbv/joao/3/16", label: "João 3:16" }));
    expect(html).not.toContain("data-connections-ref");
    expect(html).toContain('data-study-ref="ler/open-nbv/joao/3/16"');
    expect(html).toContain('data-share-ref="ler/open-nbv/joao/3/16"');
  });

  it("lets existing reader counters avoid a redundant connection action", () => {
    const html = renderToStaticMarkup(createElement(VerseActions, { path: "/joao/3/16", label: "João 3:16", connections: false }));
    expect(html).not.toContain("data-connections-ref");
    expect(html).toContain("Entender com IA");
    expect(html).toContain("Compartilhar");
  });

  it("intercepts only valid primary connections clicks and preserves browser gestures", () => {
    class LinkStub {
      dataset = { connectionsRef: "filipenses/1/18", connectionsLabel: "Filipenses 1:18" };
      target = "";
      closest() { return this; }
      hasAttribute() { return false; }
    }
    vi.stubGlobal("Element", LinkStub);
    const link = new LinkStub();
    const event = (extra = {}) => ({ target: link, button: 0, ...extra }) as unknown as MouseEvent;
    expect(verseActionFromEvent(event())).toEqual({ path: "filipenses/1/18", label: "Filipenses 1:18", kind: "connections", opener: link });
    for (const extra of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) expect(verseActionFromEvent(event(extra))).toBeNull();
    for (const invalid of ["../1/18", "https://other.test/1/18", "ler/open-nbv/joao/3/16"]) {
      link.dataset.connectionsRef = invalid;
      expect(verseActionFromEvent(event())).toBeNull();
    }
  });

  it("rejects invalid or other-edition references before loading any file", async () => {
    for (const path of ["joao/3/100", "joao/99/1", "unknown/1/1", "../joao/3/16", "ler/open-nbv/joao/3/16"]) await expect(loadVerseConnections(path)).rejects.toThrow("invalid reference");
    expect(loaders.text).not.toHaveBeenCalled();
    expect(loaders.links).not.toHaveBeenCalled();
  });

  it("keeps every partner and vote, including zero and negative votes, strongest first", async () => {
    const first = verseFromPath("/genesis/1/1")!, second = first + 1, third = first + 2;
    loaders.text.mockResolvedValue(["source", "second", "third"]);
    loaders.links.mockResolvedValue([[third, -1, second, 0]]);
    const result = await loadVerseConnections("genesis/1/1");
    expect(result.text).toBe("source");
    expect(result.links.map(({ path, votes, text }) => ({ path, votes, text }))).toEqual([
      { path: "/genesis/1/2", votes: 0, text: "second" }, { path: "/genesis/1/3", votes: -1, text: "third" },
    ]);
  });

  it("separates a real zero from missing, malformed or failed data", async () => {
    loaders.text.mockResolvedValue(["source"]);
    loaders.links.mockResolvedValue([[]]);
    expect((await loadVerseConnections("genesis/1/1")).links).toEqual([]);
    for (const data of [[], [null], [[1]], [[1, 4, 1, 2]], [[0, 3]], [[BASE.verseCount, 2]], [[1, "2"]]]) {
      loaders.links.mockResolvedValue(data);
      await expect(loadVerseConnections("genesis/1/1")).rejects.toThrow("invalid connections");
    }
    loaders.links.mockRejectedValue(new Error("offline"));
    await expect(loadVerseConnections("genesis/1/1")).rejects.toThrow("offline");
    loaders.links.mockResolvedValue([[1, 2]]);
    await expect(loadVerseConnections("genesis/1/1")).rejects.toThrow("missing verse text");
  });

  it.each(["filipenses/1/18", "joao/3/16", "genesis/2/6"])("uses exact generated partners and full BLIVRE texts for %s", async (path) => {
    loaders.text.mockImplementation((slug: string, chapter: number) => json(`text/${slug}/${chapter}.json`));
    loaders.links.mockImplementation((slug: string, chapter: number) => json(`verse-links/${slug}/${chapter}.json`));
    const result = await loadVerseConnections(path);
    const { book, chapter, verse } = BASE.locate(verseFromPath(`/${path}`)!);
    const sourceText = await json(`text/${book.slug}/${chapter}.json`);
    const expected = (await json(`verse-links/${book.slug}/${chapter}.json`))[verse - 1] as number[];
    expect(result.path).toBe(`/${path}`);
    expect(result.text).toBe(sourceText[verse - 1]);
    expect(result.links.length).toBe(expected.length / 2);
    for (const link of result.links) {
      const gv = verseFromPath(link.path)!;
      expect(expected.indexOf(gv) % 2).toBe(0);
      expect(link.votes).toBe(expected[expected.indexOf(gv) + 1]);
      const target = BASE.locate(gv);
      expect(link.text).toBe((await json(`text/${target.book.slug}/${target.chapter}.json`))[target.verse - 1]);
    }
  });
});
