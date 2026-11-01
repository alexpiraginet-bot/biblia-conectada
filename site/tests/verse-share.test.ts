import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerseActions } from "../src/components/assistant/VerseActions";
import { verseActionFromEvent } from "../src/components/assistant/verse-intent-events";
import { canShareImage, prepareVerseImage, verseShareOptions } from "../src/components/sharing/share-options";
import { SITE_URL } from "../src/lib/site-identity";
import { GET } from "../src/app/og/route";

afterEach(() => vi.unstubAllGlobals());

describe("verse sharing", () => {
  it("keeps independent, exact-verse study and sharing links useful without JavaScript", () => {
    const html = renderToStaticMarkup(createElement(VerseActions, { path: "/jeremias/17/8", label: "Jeremias 17:8" }));
    expect(html).toContain('href="/assistente?ref=jeremias/17/8"');
    expect(html).toContain('href="/og?path=/jeremias/17/8"');
    expect(html).toContain('data-share-ref="jeremias/17/8"');
    expect(html).toContain('aria-label="Compartilhar Jeremias 17:8"');
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(3);
  });

  it("uses the public exact-verse URL and local PNG endpoint in both formats", () => {
    const options = verseShareOptions("joao/3/16");
    expect(options.url).toBe(`${SITE_URL}/joao/3/16`);
    const whatsapp = new URL(options.whatsapp);
    expect(whatsapp.origin + whatsapp.pathname).toBe("https://wa.me/");
    expect(whatsapp.searchParams.get("text")).toBe(`João 3:16 · Bíblia Conectada\n${SITE_URL}/joao/3/16`);
    for (const format of ["landscape", "story"] as const) {
      const image = new URL(options.image(format), "http://localhost:3008");
      expect(image.origin + image.pathname).toBe("http://localhost:3008/og");
      expect(image.searchParams.get("path")).toBe("/joao/3/16");
      expect(image.searchParams.get("format")).toBe(format);
      expect(options.filename(format)).toMatch(/^biblia-conectada-joao-3-16-(stories|capa)\.png$/);
    }
  });

  it("rejects missing, out-of-canon and external references without fetching", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    for (const value of ["joao/3", "joao/3/100", "joao/99/1", "desconhecido/1/1", "../joao/3/16", "https://other.test/joao/3/16"]) {
      await expect(prepareVerseImage(value, "story", new AbortController().signal)).rejects.toThrow("invalid reference");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("prepares a real local PNG with its abort signal, expected dimensions and safe filename", async () => {
    const rendered = await GET(new Request("http://localhost:3008/og?path=/joao/3/16&format=story"));
    const png = await rendered.blob();
    const fetcher = vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    const file = await prepareVerseImage("joao/3/16", "story", signal);
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("biblia-conectada-joao-3-16-stories.png");
    expect(file.size).toBeGreaterThan(1000);
    expect(fetcher).toHaveBeenCalledWith(verseShareOptions("joao/3/16").image("story"), { signal, credentials: "same-origin" });
  });

  it("never offers an HTTP error, HTML page or wrong-sized image for file sharing", async () => {
    const actual = await GET(new Request("http://localhost:3008/og?path=/joao/3/16"));
    const wrongSize = await actual.blob();
    for (const response of [new Response("offline", { status: 503 }), new Response("html", { headers: { "content-type": "text/html" } }), new Response("not a png", { headers: { "content-type": "image/png" } }), new Response(wrongSize, { headers: { "content-type": "image/png" } })]) {
      vi.stubGlobal("fetch", vi.fn(async () => response));
      await expect(prepareVerseImage("joao/3/16", "story", new AbortController().signal)).rejects.toThrow();
    }
  });

  it("detects native file sharing without invoking it and falls back when unsupported or denied", () => {
    const file = new File(["png"], "verse.png", { type: "image/png" });
    const share = vi.fn(); const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", { share, canShare });
    expect(canShareImage(file)).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
    expect(share).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", {}); expect(canShareImage(file)).toBe(false);
    vi.stubGlobal("navigator", { share, canShare: () => { throw new Error("denied"); } }); expect(canShareImage(file)).toBe(false);
  });

  it("intercepts only valid unmodified sharing clicks and preserves browser link gestures", () => {
    class LinkStub {
      dataset = { shareRef: "joao/3/16", shareLabel: "João 3:16" };
      target = "";
      closest() { return this; }
      hasAttribute() { return false; }
    }
    vi.stubGlobal("Element", LinkStub);
    const link = new LinkStub();
    const event = (extra = {}) => ({ target: link, button: 0, ...extra }) as unknown as MouseEvent;
    expect(verseActionFromEvent(event())).toEqual({ path: "joao/3/16", label: "João 3:16", kind: "share", opener: link });
    for (const extra of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) expect(verseActionFromEvent(event(extra))).toBeNull();
    link.target = "_blank"; expect(verseActionFromEvent(event())).toBeNull();
    link.target = ""; link.dataset.shareRef = "../3/16"; expect(verseActionFromEvent(event())).toBeNull();
  });
});
