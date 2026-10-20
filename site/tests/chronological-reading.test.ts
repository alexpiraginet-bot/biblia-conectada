import { describe, expect, it } from "vitest";
import { CHRONOLOGICAL_MOMENTS, CHRONOLOGY_SOURCES, GOSPEL_COMPOSITION, GOSPELS, loadChronologicalReading, passageReference } from "../src/lib/chronological-reading";
import { bookFile } from "./generated";

const readVerse = async (slug: string, chapter: number, verse: number) => bookFile(slug).chapters[chapter - 1]?.[verse - 1]?.t;

describe("chronological reading", () => {
  it("follows an explicit narrative itinerary instead of gospel composition dates", () => {
    expect(CHRONOLOGICAL_MOMENTS.map((moment) => moment.id)).toEqual(["nascimento", "batismo", "cana", "ensino", "paes", "entrada", "refeicao", "cruz", "tumulo", "reencontros"]);
    expect(new Set(CHRONOLOGICAL_MOMENTS.map((moment) => moment.id)).size).toBe(CHRONOLOGICAL_MOMENTS.length);
    expect(GOSPEL_COMPOSITION.map((item) => item.gospel)).not.toEqual(GOSPELS.map((item) => item.id));
  });

  it("loads every displayed verse byte-for-byte from the real BLIVRE corpus", async () => {
    const loaded = await loadChronologicalReading(readVerse);
    for (const moment of loaded) {
      expect(moment.passages.some((passage) => passage.gospel === moment.defaultGospel)).toBe(true);
      for (const passage of moment.passages) {
        expect(passage.verses.length).toBe(passage.to - passage.from + 1);
        expect(passage.reference).toBe(passageReference(passage));
        expect(passage.href).toBe(`/${passage.gospel}/${passage.chapter}/${passage.from}`);
        for (const verse of passage.verses) {
          expect(verse.text).toBe(bookFile(passage.gospel).chapters[passage.chapter - 1][verse.number - 1].t);
          expect(verse.text.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("does not invent missing gospel parallels or present thematic associations as identical scenes", () => {
    const get = (id: string) => CHRONOLOGICAL_MOMENTS.find((moment) => moment.id === id)!;
    expect(get("cana").passages.map((passage) => passage.gospel)).toEqual(["joao"]);
    expect(get("nascimento").passages.map((passage) => passage.gospel)).toEqual(["mateus", "lucas"]);
    expect(get("batismo").passages.find((passage) => passage.gospel === "joao")?.relation).toBe("relacionado");
    expect(get("ensino").passages.find((passage) => passage.gospel === "lucas")?.relation).toBe("relacionado");
    expect(get("refeicao").passages.find((passage) => passage.gospel === "joao")?.relation).toBe("relacionado");
    expect(get("reencontros").passages.find((passage) => passage.gospel === "marcos")?.to).toBe(7);
  });

  it("fails clearly for missing source text rather than rendering a fabricated or empty verse", async () => {
    await expect(loadChronologicalReading(async () => "")).rejects.toThrow("Missing BLIVRE text");
  });

  it("attaches every composition interval to a visible scholarly reference", () => {
    for (const entry of GOSPEL_COMPOSITION) {
      expect(entry.to).toBeGreaterThan(entry.from);
      expect(CHRONOLOGY_SOURCES.some((source) => source.id === entry.source && source.href.startsWith("https://"))).toBe(true);
    }
    expect(GOSPEL_COMPOSITION.find((entry) => entry.gospel === "joao")?.to).toBe(110);
  });
});
