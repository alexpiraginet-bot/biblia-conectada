import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import booksData from "../src/data/generated/books.json";
import type { Book } from "../src/lib/canon/types";
import { createLiturgyResult, extractLiturgyMetadata, fetchLiturgyMetadata } from "../src/lib/liturgy/core";
import { formatLiturgyDate, isLiturgyDate, liturgyToday, shiftLiturgyDate } from "../src/lib/liturgy/dates";
import { resolveLiturgyReference } from "../src/lib/liturgy/references";

const books = booksData as Book[];
const now = new Date("2026-11-01T01:00:00Z"); // still October 31 in Brazil
const fixture = () => ({
  data: "31/10/2026", liturgia: "Sábado da 30ª Semana do Tempo Comum", cor: "Verde",
  oracoes: { coleta: "PROTECTED_PRAYER_MUST_NOT_LEAVE" },
  leituras: {
    primeiraLeitura: [{ referencia: "Fl 1,18-26", titulo: "PROTECTED_TITLE_MUST_NOT_LEAVE", texto: "PROTECTED_TEXT_MUST_NOT_LEAVE" }],
    salmo: [{ referencia: "Sl 41(42)", refrao: "PROTECTED_REFRAIN_MUST_NOT_LEAVE", texto: "PROTECTED_PSALM_MUST_NOT_LEAVE" }],
    segundaLeitura: [], evangelho: [{ referencia: "Lc 14,1.7-11¬¬", texto: "PROTECTED_GOSPEL_MUST_NOT_LEAVE" }], extras: [],
  },
});
const readVerse = async (slug: string, chapter: number, verse: number): Promise<string> => {
  const content = JSON.parse(readFileSync(join(process.cwd(), "src/data/generated/books", `${slug}.json`), "utf8"));
  return content.chapters[chapter - 1][verse - 1].t;
};
const metadata = async (date: string) => extractLiturgyMetadata(fixture(), date);

describe("daily liturgy date semantics", () => {
  it("uses the actual Brazil day across UTC midnight, not the build date", () => {
    expect(liturgyToday(now)).toBe("2026-10-31");
    expect(liturgyToday(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11-01");
  });
  it("rejects rollover dates, URL input, overlong values and dates outside the supported query window", () => {
    for (const bad of ["2026-02-29", "2026-11-31", "2026-13-01", "2026-1-1", "https://example.com", "2019-01-01", "2101-01-01", ""]) {
      expect(isLiturgyDate(bad)).toBe(false);
    }
    expect(isLiturgyDate("2028-02-29")).toBe(true);
    expect(shiftLiturgyDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftLiturgyDate("2020-01-01", -1)).toBeNull();
    expect(formatLiturgyDate("2026-10-31")).toContain("31 de outubro de 2026");
  });
});

describe("factual-only calendar boundary", () => {
  it("extracts citations and calendar facts while discarding every liturgical text field", () => {
    const result = extractLiturgyMetadata(fixture(), "2026-10-31");
    expect(result.readings.map((row) => row.reference)).toEqual(["Fl 1,18-26", "Sl 41(42)", "Lc 14,1.7-11"]);
    expect(JSON.stringify(result)).not.toContain("PROTECTED_");
    expect(result.color).toBe("green");
  });
  it("rejects a different upstream date, malformed lists and missing Gospel", () => {
    expect(() => extractLiturgyMetadata(fixture(), "2026-11-01")).toThrow(/date mismatch/);
    expect(() => extractLiturgyMetadata({ ...fixture(), leituras: {} }, "2026-10-31")).toThrow();
    const missing = fixture(); missing.leituras.evangelho = [];
    expect(() => extractLiturgyMetadata(missing, "2026-10-31")).toThrow(/Incomplete/);
    expect(() => extractLiturgyMetadata({ ...fixture(), liturgia: "<script>x</script>" }, "2026-10-31")).toThrow();
  });
  it("keeps extra biblical readings while excluding non-biblical rites in that group", () => {
    const source = fixture();
    const extra = { ...source, leituras: { ...source.leituras, extras: [
      { titulo: "Proclamação da Páscoa", texto: "PROTECTED_PRAYER_MUST_NOT_LEAVE" },
      { tipo: "Terceira Leitura", referencia: "Ex 14,15-15,1", texto: "PROTECTED_TEXT_MUST_NOT_LEAVE" },
    ] } };
    const result = extractLiturgyMetadata(extra, "2026-10-31");
    expect(result.readings.at(-1)).toMatchObject({ kind: "extra", reference: "Ex 14,15-15,1" });
    expect(JSON.stringify(result)).not.toContain("PROTECTED_");
  });
  it("uses a fixed host, validated explicit date, no raw-response cache and a bounded request", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(fixture()));
    await expect(fetchLiturgyMetadata("2026-10-31", fetcher)).resolves.toMatchObject({ date: "2026-10-31" });
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe("https://liturgia.up.railway.app/v2/?dia=31&mes=10&ano=2026");
    expect(options).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    await expect(fetchLiturgyMetadata("https://attacker.invalid", fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects upstream HTTP errors, oversized responses, wrong content type and invalid JSON", async () => {
    const responses = [
      new Response("unavailable", { status: 503 }),
      new Response("{}", { headers: { "content-type": "application/json", "content-length": "500001" } }),
      new Response("{}", { headers: { "content-type": "text/html" } }),
      new Response("bad", { headers: { "content-type": "application/json" } }),
      new Response("x".repeat(500001), { headers: { "content-type": "application/json" } }),
    ];
    for (const response of responses) await expect(fetchLiturgyMetadata("2026-10-31", async () => response)).rejects.toThrow();
  });
});

describe("lectionary citations mapped conservatively to licensed scripture", () => {
  it("keeps disjoint Gospel verses in source order and expands subverses with a visible notice", () => {
    const gospel = resolveLiturgyReference("Lc 14,1.7-11", books);
    expect("coordinates" in gospel && gospel.coordinates.map((row) => row.verse)).toEqual([1, 7, 8, 9, 10, 11]);
    const part = resolveLiturgyReference("Fl 1,18b-26", books);
    expect("notice" in part && part.notice).toContain("inteiros");
    expect("book" in part && part.book.osis).toBe("Phil");
    expect("book" in resolveLiturgyReference("1Cor 15,20-26", books)).toBe(true);
    expect("book" in resolveLiturgyReference("Gn 1,1-2,2 (Forma Longa)", books)).toBe(true);
  });
  it("handles chapter-spanning selections without dropping verses", () => {
    const result = resolveLiturgyReference("Is 52,13-53,12", books);
    expect("coordinates" in result && result.coordinates).toEqual([
      { chapter: 52, verse: 13 }, { chapter: 52, verse: 14 }, { chapter: 52, verse: 15 },
      ...Array.from({ length: 12 }, (_, i) => ({ chapter: 53, verse: i + 1 })),
    ]);
  });
  it("uses the explicitly paired Hebrew Psalm chapter and labels the entire Psalm as context", () => {
    const result = resolveLiturgyReference("Sl 41(42),2.3.5bcd", books);
    expect("coordinates" in result && result.coordinates).toHaveLength(11);
    expect("coordinates" in result && result.coordinates[0]).toEqual({ chapter: 42, verse: 1 });
    expect("notice" in result && result.notice).toContain("Salmo completo para contexto");
    expect(resolveLiturgyReference("Sl 41,2.3.5", books)).toHaveProperty("unavailableReason");
  });
  it("does not invent deuterocanonical text, uncertain Daniel/Esther mappings or unsupported notation", () => {
    for (const reference of ["Sb 3,1-9", "2Mc 7,1-2.9-14", "Dn 3,52-57", "Est 4,17", "Lc 14,0-2", "Lc 14,100-200", "Lc 14,11-7", "Lc 14,1 ou 7-11", "Lc 14,1<script>"]) {
      expect(resolveLiturgyReference(reference, books)).toHaveProperty("unavailableReason");
    }
  });
});

describe("daily liturgy result", () => {
  it("returns only exact local BLIVRE verse text and genuine reader links", async () => {
    const result = await createLiturgyResult(undefined, { books, readVerse, metadata, now });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.date).toBe("2026-10-31");
    expect(result.edition.name).toBe("Bíblia Livre (BLIVRE)");
    expect(result.source.officialUrl).toBe("https://liturgiadiaria.edicoescnbb.com.br/");
    const verses = result.readings.flatMap((reading) => reading.passages.flatMap((passage) => passage.verses));
    for (const verse of verses) {
      const [, slug, chapter, number] = verse.path.split("/");
      expect(verse.text).toBe(await readVerse(slug, Number(chapter), Number(number)));
    }
    expect(JSON.stringify(result)).not.toContain("PROTECTED_");
    const psalm = result.readings.find((reading) => reading.kind === "psalm")!;
    expect(psalm.passages[0].reference).toBe("Salmos 42");
    expect(psalm.passages[0].verses[0].text).toContain("corça");
  });
  it("preserves unavailable readings instead of silently dropping them", async () => {
    const source = fixture(); source.leituras.primeiraLeitura[0].referencia = "Sb 3,1-9";
    const result = await createLiturgyResult("2026-10-31", { books, readVerse, metadata: async (date) => extractLiturgyMetadata(source, date), now });
    expect(result.ok && result.readings[0]).toMatchObject({ reference: "Sb 3,1-9", passages: [], unavailableReason: expect.any(String) });
  });
  it("returns an explicit retryable failure with the requested date and no fabricated fallback", async () => {
    for (const broken of [async () => { throw new Error("provider down"); }, async () => ({ ...await metadata("2026-10-31"), date: "2026-11-01" })]) {
      const result = await createLiturgyResult("2026-10-31", { books, readVerse, metadata: broken, now });
      expect(result).toMatchObject({ ok: false, code: "unavailable", date: "2026-10-31" });
      expect(result).not.toHaveProperty("readings");
      expect(JSON.stringify(result)).not.toContain("provider down");
    }
  });
  it("rejects invalid input without contacting the calendar provider", async () => {
    const spy = vi.fn(metadata);
    expect(await createLiturgyResult("2026-02-30", { books, readVerse, metadata: spy, now })).toMatchObject({ ok: false, code: "invalid-date", date: "2026-10-31" });
    expect(spy).not.toHaveBeenCalled();
  });
});
