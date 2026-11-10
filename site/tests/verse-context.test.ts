// The context of a verse (docs/CONTEXTO.md): the window of verses around it, its link and the dialog's action.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verseActionFromEvent } from "@/components/assistant/verse-intent-events";
import { VerseContextLink } from "@/components/reader/VerseContextLink";
import {
  bookBounds, CONTEXT_FIRST, CONTEXT_MORE, contextBlocks, contextChapters, firstContext, growContext, hasMore, locateInBook, neighbours, type ContextBook,
} from "@/lib/verse-context";
import { books } from "./generated";

// a book of three chapters with 4, 2 and 5 verses, starting at verse 100 of the whole Bible
const book: ContextBook = { firstVerse: 100, verses: [4, 2, 5] };
const texts = new Map([[1, ["a1", "a2", "a3", "a4"]], [2, ["b1", "b2"]], [3, ["c1", "c2", "c3", "c4", "c5"]]]);

afterEach(() => vi.unstubAllGlobals());

describe("the window of a verse's context", () => {
  it("opens with the verses on each side and stops at the book's edges", () => {
    expect(bookBounds(book)).toEqual({ first: 100, last: 110 });
    expect(firstContext(book, 105)).toEqual({ from: 105 - CONTEXT_FIRST, to: 105 + CONTEXT_FIRST });
    expect(firstContext(book, 100)).toEqual({ from: 100, to: 100 + CONTEXT_FIRST });
    expect(firstContext(book, 110)).toEqual({ from: 110 - CONTEXT_FIRST, to: 110 });
    for (const gv of [99, 111, 100.5, NaN]) expect(() => firstContext(book, gv), String(gv)).toThrow();
  });

  it("grows by a step on one side, never past the book", () => {
    const start = { from: 104, to: 106 };
    expect(growContext(book, start, "before")).toEqual({ from: Math.max(100, 104 - CONTEXT_MORE), to: 106 });
    expect(growContext(book, start, "after")).toEqual({ from: 104, to: Math.min(110, 106 + CONTEXT_MORE) });
    const whole = { from: 100, to: 110 };
    expect(growContext(book, whole, "before")).toEqual(whole);
    expect(growContext(book, whole, "after")).toEqual(whole);
    expect(hasMore(book, start, "before")).toBe(true);
    expect(hasMore(book, whole, "before")).toBe(false);
    expect(hasMore(book, whole, "after")).toBe(false);
  });

  it("crosses chapters inside the book and names each verse by its chapter", () => {
    expect(locateInBook(book, 100)).toEqual({ chapter: 1, verse: 1 });
    expect(locateInBook(book, 104)).toEqual({ chapter: 2, verse: 1 });
    expect(locateInBook(book, 110)).toEqual({ chapter: 3, verse: 5 });
    expect(contextChapters(book, { from: 103, to: 106 })).toEqual([1, 2, 3]);
    expect(contextBlocks(book, { from: 103, to: 106 }, texts)).toEqual([
      { chapter: 1, verses: [{ gv: 103, chapter: 1, verse: 4, text: "a4" }] },
      { chapter: 2, verses: [{ gv: 104, chapter: 2, verse: 1, text: "b1" }, { gv: 105, chapter: 2, verse: 2, text: "b2" }] },
      { chapter: 3, verses: [{ gv: 106, chapter: 3, verse: 1, text: "c1" }] },
    ]);
  });

  it("is not shown with a hole in it", () => {
    expect(() => contextBlocks(book, { from: 103, to: 106 }, new Map([[1, texts.get(1)!], [3, texts.get(3)!]]))).toThrow();
    expect(() => contextBlocks(book, { from: 100, to: 101 }, new Map([[1, ["a1", "  "]]]))).toThrow();
    expect(() => contextBlocks(book, { from: 100, to: 101 }, new Map([[1, ["a1", 7 as unknown as string]]]))).toThrow();
  });

  it("finds the verse before and the verse after, across a chapter and never across a book", () => {
    expect(neighbours(book, 100)).toEqual({ before: null, after: { chapter: 1, verse: 2 } });
    expect(neighbours(book, 104)).toEqual({ before: { chapter: 1, verse: 4 }, after: { chapter: 2, verse: 2 } });
    expect(neighbours(book, 110)).toEqual({ before: { chapter: 3, verse: 4 }, after: null });
    // in the real canon: every book begins without a verse before it and ends without one after it
    for (const b of books()) {
      const { first, last } = bookBounds(b);
      expect(neighbours(b, first).before, b.slug).toBeNull();
      expect(neighbours(b, last).after, b.slug).toBeNull();
      expect(locateInBook(b, last)).toEqual({ chapter: b.verses.length, verse: b.verses[b.verses.length - 1] });
    }
  });
});

describe("the way into the context", () => {
  it("is an ordinary link to the verse inside its chapter, marked for the dialog", () => {
    const html = renderToStaticMarkup(createElement(VerseContextLink, { path: "/joao/3/16", label: "João 3:16" }));
    expect(html).toContain('href="/joao/3#v16"');
    expect(html).toContain('data-context-ref="joao/3/16"');
    expect(html).toContain('data-context-label="João 3:16"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain(">Contexto</a>");
  });

  it("is not offered for a chapter, another edition or an address that is not a verse", () => {
    for (const path of ["/joao/3", "/ler/open-nbv/joao/3/16", "/joao/3/16/1", "joao/3/16", "/joao/0/1", "/João/3/16"]) {
      expect(renderToStaticMarkup(createElement(VerseContextLink, { path, label: "x" })), path).toBe("");
    }
  });

  it("opens the dialog for a Bíblia Livre verse only, and keeps the browser's own gestures", () => {
    class LinkStub {
      dataset: Record<string, string> = { contextRef: "joao/3/16", contextLabel: "João 3:16" };
      target = "";
      closest() { return this; }
      hasAttribute() { return false; }
    }
    vi.stubGlobal("Element", LinkStub);
    const link = new LinkStub();
    const event = (extra = {}) => ({ target: link, button: 0, ...extra }) as unknown as MouseEvent;
    expect(verseActionFromEvent(event())).toMatchObject({ kind: "context", path: "joao/3/16", label: "João 3:16" });
    expect(verseActionFromEvent(event({ ctrlKey: true }))).toBeNull();
    expect(verseActionFromEvent(event({ button: 1 }))).toBeNull();
    link.dataset = { contextRef: "ler/open-nbv/joao/3/16" };
    expect(verseActionFromEvent(event())).toBeNull();
    link.dataset = { contextRef: "joao/3" };
    expect(verseActionFromEvent(event())).toBeNull();
  });
});
