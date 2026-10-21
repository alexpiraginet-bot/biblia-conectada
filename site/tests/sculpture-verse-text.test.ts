import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VersePanel } from "../src/components/sculpture/Panel";
import { verseOf, verseText } from "../src/components/sculpture/state";
import { BOOKS } from "../src/lib/community/books-client";

const props: ComponentProps<typeof VersePanel> = {
  gv: verseOf(BOOKS.find((book) => book.slug === "joao")!, 3, 16), nt: true,
  partners: [], text: null, textFailed: false, onTextRetry: () => {}, snippets: new Map(),
  filter: "todas", onFilter: () => {}, listed: [], counts: { todas: 0, antigo: 0, novo: 0 },
  shown: 20, onMore: () => {}, focus: -1, onFocus: () => {}, onChapter: () => {},
  copied: false, onCopy: () => {}, save: null, onPath: async () => null,
  headingId: "verse-title", headingRef: null,
};
const render = (updates: Partial<typeof props>) => renderToStaticMarkup(createElement(VersePanel, { ...props, ...updates }));
afterEach(() => vi.unstubAllGlobals());

describe("3D verse text feedback", () => {
  it("announces which verse is loading without presenting an ellipsis as scripture", () => {
    const html = render({});
    expect(html).toContain('role="status"');
    expect(html).toContain("Carregando texto de João 3:16…");
    expect(html).not.toContain("<blockquote");
    expect(html).not.toContain("Tentar novamente");
  });

  it("offers a manual recovery while preserving the selected verse's actions", () => {
    const html = render({ textFailed: true });
    expect(html).toContain('role="status"');
    expect(html).toContain("Não foi possível carregar o texto.");
    expect(html).toMatch(/<button[^>]*>Tentar novamente<\/button>/);
    expect(html).toContain('data-study-ref="joao/3/16"');
    expect(html).toContain('href="/joao/3"');
    expect(html).not.toContain("Carregando texto");
  });

  it("renders recovered text as scripture and removes error and retry controls", () => {
    const html = render({ text: "Texto recuperado." });
    expect(html).toMatch(/<blockquote[^>]*>Texto recuperado\.<\/blockquote>/);
    expect(html).not.toContain("Tentar novamente");
    expect(html).not.toContain("Carregando texto");
    expect(html).not.toContain("Não foi possível carregar");
  });

  it("forgets a failed chapter and fetches the exact verse on a new attempt", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json(Array.from({ length: 16 }, (_, i) => `Versículo ${i + 1}`)));
    vi.stubGlobal("fetch", fetch);
    await expect(verseText(props.gv)).rejects.toThrow("503");
    await expect(verseText(props.gv)).resolves.toBe("Versículo 16");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe("/data/text/joao/3.json");
  });
});
