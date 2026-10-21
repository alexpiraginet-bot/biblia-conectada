import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveShareCard, shareExcerpt } from "../src/lib/share-card";
import { getTranslation } from "../src/lib/translations";
import { SITE_URL } from "../src/lib/site-identity";
import { verseShareOptions, prepareVerseImage } from "../src/components/sharing/share-options";
import { VerseShare } from "../src/components/sharing/VerseShare";
import { GET } from "../src/app/og/route";

afterEach(() => vi.unstubAllGlobals());

// Checked directly against fontes/ebible/poronbv/poronbv_vpl.zip, not the BLIVRE grid.
const sourceVerses = [
  ["joao/3/16", "João 3:16", "Porque Deus amou tanto o mundo que deu o seu Filho único para que todo aquele que crer nele não pereça, mas tenha a vida eterna."],
  ["juizes/5/32", "Juízes 5:32", "Depois dessas coisas, a terra ficou em paz durante quarenta anos."],
  ["1-samuel/20/43", "1 Samuel 20:43", "Assim eles se separaram; Davi tomou outro rumo, e Jônatas voltou à cidade."],
  ["3-joao/1/15", "3 João 1:15", "A paz esteja com você. Os amigos daqui enviam lembranças. Saúde cada um dos amigos daí."],
] as const;

describe("sharing the selected Bible edition", () => {
  it("uses exact Open NBV source text, including verses outside the BLIVRE grid", async () => {
    const edition = getTranslation("open-nbv")!;
    for (const [ref, label, text] of sourceVerses) {
      const path = `/ler/open-nbv/${ref}`;
      const card = await resolveShareCard(`${path}?text=Invented&edition=blivre`);
      expect(card?.path).toBe(path);
      expect(card?.title).toBe(label);
      expect(card?.description).toBe(shareExcerpt(text));
      expect(card?.source).toBe(`${edition.name} · ${label}`);
      expect(card?.attribution).toContain(edition.credit);
      expect(card?.license).toContain(edition.licenseUrl);
      expect(card?.attribution).toContain("Copyright © 2007, 2010 by Biblica, Inc.");
      expect(card?.attribution).toContain("The original Work by its copyright holders is available for free at www.biblica.com and open.bible.");
    }
    const original = await resolveShareCard("/joao/3/16");
    expect(original?.source).toBe("Bíblia Livre (BLIVRE) · João 3:16");
    expect(original?.description).not.toBe(sourceVerses[0][2]);
    expect(original?.attribution).toBeUndefined();
  });

  it("provides covers for the edition index, book and chapter, using that edition", async () => {
    const edition = getTranslation("open-nbv")!;
    expect((await resolveShareCard("/ler/open-nbv"))?.title).toBe(edition.name);
    const book = await resolveShareCard("/ler/open-nbv/joao");
    const chapter = await resolveShareCard("/ler/open-nbv/joao/3");
    expect(book?.title).toBe("João");
    expect(book?.source).toBe(`${edition.name} · João 1:1`);
    expect(chapter?.title).toBe("João 3");
    expect(chapter?.source).toBe(`${edition.name} · João 3:1`);
  });

  it("rejects invalid edition paths and references on the server without substituting another text", async () => {
    for (const path of ["/ler/unknown/joao/3/16", "/ler/open-nbv/unknown/1/1", "/ler/open-nbv/joao/22/1", "/ler/open-nbv/juizes/5/33", "/ler/open-nbv/1-samuel/20/44", "/ler/open-nbv/3-joao/1/16", "/ler/open-nbv/joao/03/16", "/ler/open-nbv/joao/3/0", "/ler/open-nbv/joao/3/16/extra", "/ler/open-nbv/../joao/3/16"]) {
      expect(await resolveShareCard(path), path).toBeNull();
      expect((await GET(new Request(`https://example.test/og?path=${encodeURIComponent(path)}`))).status, path).toBe(404);
    }
  });

  it("keeps edition and verse in WhatsApp, both image URLs and filenames", () => {
    const edition = getTranslation("open-nbv")!;
    for (const [ref, label] of sourceVerses) {
      const path = `/ler/open-nbv/${ref}`;
      const options = verseShareOptions(path.slice(1));
      expect(options.url).toBe(`${SITE_URL}${path}`);
      expect(options.reference).toBe(label);
      expect(options.editionName).toBe(edition.name);
      expect(new URL(options.whatsapp).searchParams.get("text")).toBe(`${label} · ${edition.shortName} · Bíblia Conectada\n${SITE_URL}${path}`);
      for (const format of ["story", "landscape"] as const) {
        expect(new URL(options.image(format), SITE_URL).searchParams.get("path")).toBe(path);
        expect(options.filename(format)).toContain(`open-nbv-${ref.replaceAll("/", "-")}`);
      }
    }
  });

  it("rejects malformed client references without fetching and does not reject extra edition verses", () => {
    for (const value of ["ler/open-nbv/joao/3", "ler/open-nbv/unknown/1/1", "ler/open-nbv/joao/0/16", "ler/open-nbv/joao/3/16?text=x", "//example.test/joao/3/16", "https://example.test/joao/3/16"]) {
      expect(() => verseShareOptions(value), value).toThrow("invalid reference");
    }
    expect(() => verseShareOptions("ler/open-nbv/3-joao/1/15")).not.toThrow();
  });

  it("shows the edition and source license beside the sharing controls", () => {
    const html = renderToStaticMarkup(createElement(VerseShare, { path: "ler/open-nbv/joao/3/16" }));
    expect(html).toContain("Biblica® Open Nova Bíblia Viva™");
    expect(html).toContain("Copyright © 2007, 2010 by Biblica, Inc.");
    expect(html).toContain(getTranslation("open-nbv")!.licenseUrl);
    expect(html).not.toContain("texto da Bíblia Livre");
  });

  it("renders distinct real PNGs and prepares the edition file without sharing it", async () => {
    const path = "/ler/open-nbv/joao/3/16";
    const landscape = await GET(new Request(`https://example.test/og?path=${path}`));
    const nbv = Buffer.from(await landscape.arrayBuffer());
    const blivre = Buffer.from(await (await GET(new Request("https://example.test/og?path=/joao/3/16"))).arrayBuffer());
    expect([nbv.readUInt32BE(16), nbv.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(nbv).not.toEqual(blivre);
    const story = await GET(new Request(`https://example.test/og?path=${path}&format=story`));
    const blob = await story.blob();
    const fetcher = vi.fn(async () => new Response(blob, { headers: { "content-type": "image/png" } }));
    const share = vi.fn();
    vi.stubGlobal("fetch", fetcher); vi.stubGlobal("navigator", { share });
    const file = await prepareVerseImage(path, "story", new AbortController().signal);
    expect(file.name).toBe("biblia-conectada-open-nbv-joao-3-16-stories.png");
    const bytes = Buffer.from(await file.arrayBuffer());
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1080, 1920]);
    expect(share).not.toHaveBeenCalled();
  });
});
