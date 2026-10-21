import { describe, expect, it } from "vitest";
import { parseSharePath, resolveShareCard, shareExcerpt } from "../src/lib/share-card";
import { books, bookFile, generated } from "./generated";

describe("social card route resolution", () => {
  it("uses the actual BLIVRE verse rather than caller-provided copy", async () => {
    const card = await resolveShareCard("/joao/3/16?title=Another%20text&url=https://example.com");
    expect(card?.title).toBe("João 3:16");
    expect(card?.description).toBe(shareExcerpt(bookFile("joao").chapters[2][15].t));
    expect(card?.source).toBe("Bíblia Livre (BLIVRE) · João 3:16");
    expect(card?.description).not.toContain("Another text");
  });

  it("resolves the first and last verse of every canonical book", async () => {
    for (const book of books()) {
      const chapter = book.verses.length, verse = book.verses.at(-1)!;
      const last = await resolveShareCard(`/${book.slug}/${chapter}/${verse}`);
      expect(last?.description, book.name).toBe(shareExcerpt(bookFile(book.slug).chapters[chapter - 1][verse - 1].t));
      expect((await resolveShareCard(`/${book.slug}`))?.title).toBe(book.name);
      expect((await resolveShareCard(`/${book.slug}/1`))?.source).toBe(`Bíblia Livre (BLIVRE) · ${book.name} 1:1`);
    }
  });

  it("rejects external URLs, traversal, markup, malformed paths and nonexistent verses", async () => {
    for (const path of ["https://example.com", "//example.com", "/\\example.com", "/../joao/3/16", "/%2e%2e/joao/3/16", "/joao%2f3%2f16", "/joao/3/16#x", "/joao/3/16\n", "/<script>", "/joao/0", "/joao/03", "/joao/22", "/joao/3/37", "/joao/3/16/extra", "/unknown", "/conexao/joao-99/genesis-1", "/explorar/joao/99", "/tema/not-a-theme", "/linha-do-tempo/not-an-event", "/trilha/antes-do-natal/99", "/ponte/999"]) {
      expect(await resolveShareCard(path), path).toBeNull();
    }
  });

  it("normalizes trailing slash and limits raw input size", () => {
    expect(parseSharePath("/joao/3/16/")?.pathname).toBe("/joao/3/16");
    expect(parseSharePath(`/${"a".repeat(512)}`)).toBeNull();
  });

  it("keeps the selected 3D reference in its image and rejects invented selections", async () => {
    expect((await resolveShareCard("/arcos?ref=joao%2F3%2F16"))?.title).toBe("João 3:16");
    expect((await resolveShareCard("/arcos/plano?ref=daniel/9"))?.source).toBe("Bíblia Livre (BLIVRE) · Daniel 9:1");
    expect((await resolveShareCard("/arcos?ref=caminho/genesis/3/15/apocalipse/12/9"))?.title).toBe("Gênesis 3:15\ne Apocalipse 12:9");
    expect((await resolveShareCard("/arcos?ref=palavra/miseric%C3%B3rdia"))?.title).toBe("misericórdia");
    for (const path of ["/arcos?ref=https://example.com", "/arcos?ref=joao/3/99", "/arcos?ref=palavra/free%20form%20text"]) expect((await resolveShareCard(path))?.title).toBe((await resolveShareCard("/arcos"))?.title);
    expect(await resolveShareCard("/arcos?ref=joao/3&ref=daniel/9")).toBeNull();
  });

  it("gives connections the two real references", async () => {
    expect((await resolveShareCard("/conexao/1-corintios-13-4/1-joao-4-8"))?.title).toBe("1 Coríntios 13:4\ne 1 João 4:8");
    expect((await resolveShareCard("/explorar/isaias/9/lucas/2"))?.title).toBe("Isaías 9\ne Lucas 2");
  });

  it("gives every static page family a deliberate card", async () => {
    for (const path of ["/", "/ler", "/arcos", "/arcos/plano", "/explorar", "/cronologia", "/caminhos", "/linha-do-tempo", "/tema", "/palavra", "/assistente", "/coracao", "/buscar", "/salvos", "/ponte", "/trilha", "/trilha/antes-do-natal", "/mesa", "/sobre", "/dados"]) {
      const card = await resolveShareCard(path);
      expect(card?.title, path).toBeTruthy();
      expect(card?.eyebrow, path).toBeTruthy();
    }
  });

  it("uses dataset labels for themes and events", async () => {
    const theme = generated<{ themes: { slug: string; label: string }[] }>("temas.json").themes[0];
    const event = generated<{ events: { slug: string; ref: string }[] }>("linha-do-tempo/events.json").events[0];
    expect((await resolveShareCard(`/tema/${theme.slug}`))?.title).toBe(theme.label);
    expect((await resolveShareCard(`/linha-do-tempo/${event.slug}`))?.title).toBe(event.ref.split(/[;,]/, 1)[0]);
  });

  it("marks shortened text without cutting a word", () => {
    expect(shareExcerpt("Uma palavra e outra palavra", 18)).toBe("Uma palavra e…");
    expect(shareExcerpt("Curto." )).toBe("Curto.");
  });

  it("accepts actual Bible words but rejects stopwords as the reading page does", async () => {
    expect((await resolveShareCard("/palavra/amor"))?.title).toBe("amor");
    expect(await resolveShareCard("/palavra/porque")).toBeNull();
    expect(await resolveShareCard("/palavra/nonexistentword")).toBeNull();
  });
});
