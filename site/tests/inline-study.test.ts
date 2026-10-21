import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { studyLinkFromEvent } from "../src/components/assistant/verse-intent-events";
import { VerseStudyLink } from "../src/components/assistant/VerseStudyLink";
import { loadStudyPassage } from "../src/components/assistant/StudyOverlay";

const chapter = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/community/fetchers", () => ({ loadChapterText: chapter }));
vi.mock("../src/components/assistant/StudyChat", () => ({ StudyChat: () => null }));

class ElementStub {
  dataset = { studyRef: "jeremias/17/8" };
  target = "";
  download = false;
  closest() { return this; }
  hasAttribute(name: string) { return name === "download" && this.download; }
}
const event = (link: ElementStub, extra: Partial<MouseEvent> = {}) => ({ target: link, button: 0, ...extra }) as unknown as MouseEvent;

describe("inline study entry", () => {
  beforeEach(() => { vi.stubGlobal("Element", ElementStub); chapter.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a canonical ordinary href and marks the exact passage for progressive enhancement", () => {
    const html = renderToStaticMarkup(createElement(VerseStudyLink, { path: "/jeremias/17/8", label: "Jeremias 17:8" }));
    expect(html).toContain('href="/assistente?ref=jeremias/17/8"');
    expect(html).toContain('data-study-ref="jeremias/17/8"');
    expect(html).toContain('data-study-label="Jeremias 17:8"');
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("only intercepts an unmodified primary click", () => {
    const link = new ElementStub();
    expect(studyLinkFromEvent(event(link))).toBe(link);
    for (const extra of [{ button: 1 }, { button: 2 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) {
      expect(studyLinkFromEvent(event(link, extra))).toBeNull();
    }
    link.target = "_blank";
    expect(studyLinkFromEvent(event(link))).toBeNull();
    link.target = "_self";
    expect(studyLinkFromEvent(event(link))).toBe(link);
    link.download = true;
    expect(studyLinkFromEvent(event(link))).toBeNull();
  });

  it("does not intercept an unrelated click or malformed reference", () => {
    expect(studyLinkFromEvent({ button: 0, target: null } as MouseEvent)).toBeNull();
    for (const value of ["jeremias/17", "../17/8", "jeremias/0/8", "jeremias/17/08", "https://example.test/17/8"]) {
      const link = new ElementStub(); link.dataset.studyRef = value;
      expect(studyLinkFromEvent(event(link))).toBeNull();
    }
  });

  it("rejects noncanonical references before requesting any text", async () => {
    for (const value of ["unknown/1/1", "jeremias/99/8", "jeremias/17/99", "genesis/0/1", "genesis/1", "../genesis/1/1"]) {
      await expect(loadStudyPassage(value)).rejects.toThrow("invalid reference");
    }
    expect(chapter).not.toHaveBeenCalled();
  });

  it("takes the chosen verse, not the first verse of the chapter", async () => {
    chapter.mockResolvedValue(["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "exact eighth"]);
    await expect(loadStudyPassage("jeremias/17/8")).resolves.toEqual({ book: "jeremias", chapter: 17, verse: 8, reference: "Jeremias 17:8", text: "exact eighth" });
    expect(chapter).toHaveBeenCalledExactlyOnceWith("jeremias", 17);
  });

  it("fails visibly instead of sending a missing or malformed text to chat", async () => {
    for (const response of [[], [null], [""], ["   "], [{}]]) {
      chapter.mockResolvedValue(response);
      await expect(loadStudyPassage("genesis/1/1")).rejects.toThrow("missing verse");
    }
    chapter.mockRejectedValue(new Error("offline"));
    await expect(loadStudyPassage("genesis/1/1")).rejects.toThrow("offline");
  });
});
