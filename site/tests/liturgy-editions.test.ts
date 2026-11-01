import { describe, it, expect, vi } from "vitest";
import { createLiturgyResult, type LiturgyMetadata } from "../src/lib/liturgy/core";
import { parseLiturgyEdition, liturgyEditionQuery } from "../src/lib/liturgy/edition";
import { translatedChapter, translationBooks } from "../src/lib/translation-reading";
import { getTranslation } from "../src/lib/translations";
import { books, verseText } from "../src/lib/data";
import { GET } from "../src/app/api/liturgia/route";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const calendar = (references = ["Fl 1,18-26", "Sl 41(42),2.3.5bcd", "Lc 14,1.7-11"]): LiturgyMetadata => ({
  date: "2026-10-31", celebration: "Celebração de teste", color: "green", colorLabel: "Verde",
  readings: references.map((reference, i) => ({ id: `reading-${i}`, kind: i === 1 ? "psalm" : i === 2 ? "gospel" : "first", label: "Leitura", reference })),
});
const dependencies = (references?: string[]) => ({
  books, readVerse: vi.fn(verseText), metadata: vi.fn(async () => calendar(references)), now: new Date("2026-10-31T12:00:00Z"),
  contextBooks: translationBooks("open-nbv")!,
  readContextChapter: (slug: string, chapter: number) => translatedChapter("open-nbv", slug, chapter),
});
vi.mock("../src/lib/liturgy/service", () => ({
  getDailyLiturgy: (date?: string, edition?: string | string[]) => createLiturgyResult(date, dependencies(), edition),
}));

describe("daily study editions without invented verse alignment", () => {
  it.each(["", "CNBB", "ave-maria", "nvi", "OPEN-NBV", ["open-nbv"], ["blivre", "open-nbv"]])("rejects unsupported or repeated edition %j before fetching", async (edition) => {
    const deps = dependencies();
    expect(parseLiturgyEdition(edition)).toBeNull();
    expect(await createLiturgyResult("2026-10-31", deps, edition)).toMatchObject({ ok: false, code: "invalid-edition", date: "2026-10-31" });
    expect(deps.metadata).not.toHaveBeenCalled();
    expect(deps.readVerse).not.toHaveBeenCalled();
  });
  it("defaults only an absent selection to BLIVRE", () => {
    expect(parseLiturgyEdition(undefined)).toBe("blivre");
    expect(liturgyEditionQuery("blivre")).toBe("");
    expect(liturgyEditionQuery("open-nbv")).toBe("?edition=open-nbv");
  });
  it("preserves calendar references and uses every exact NBV chapter row, never BLIVRE verse selections", async () => {
    const deps = dependencies();
    const result = await createLiturgyResult("2026-10-31", deps, "open-nbv");
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(getTranslation("open-nbv")!.verseAlignment).toBe("unreviewed");
    expect(result.edition.id).toBe("open-nbv");
    expect(result.readings.map((r) => r.reference)).toEqual(calendar().readings.map((r) => r.reference));
    for (const [i, slug, chapter] of [[0, "filipenses", 1], [1, "salmos", 42], [2, "lucas", 14]] as const) {
      const passage = result.readings[i].passages[0];
      const original = await translatedChapter("open-nbv", slug, chapter);
      expect(passage.verses.map((v) => v.text)).toEqual(original);
      expect(passage.verses.map((v) => v.number)).toEqual(original!.map((_, n) => n + 1));
      expect(passage.path).toBe(`/ler/open-nbv/${slug}/${chapter}`);
      expect(passage.verses.every((v) => v.path === `${passage.path}/${v.number}`)).toBe(true);
      expect(result.readings[i].notice).toContain("não foi revisado");
    }
    expect(deps.readVerse).not.toHaveBeenCalled();
  });
  it("preserves additional NBV positions and chapter-spanning context without selecting equivalent verses", async () => {
    const result = await createLiturgyResult("2026-10-31", dependencies(["3Jo 1,5-8", "Is 52,13-53,12"]), "open-nbv");
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.readings[0].passages[0].verses.at(-1)?.path).toBe("/ler/open-nbv/3-joao/1/15");
    expect(result.readings[1].passages.map((p) => p.path)).toEqual(["/ler/open-nbv/isaias/52", "/ler/open-nbv/isaias/53"]);
    expect(result.readings[1].passages[0].verses[0].number).toBe(1);
  });
  it.each(["Sl 41,2-4", "Dn 3,14-20", "Est 4,1-3", "Sb 3,1-9", "Eclo 2,1-4"])("keeps unsupported %s explicit with no borrowed text", async (ref) => {
    const result = await createLiturgyResult("2026-10-31", dependencies([ref]), "open-nbv");
    expect(result.ok && result.readings[0]).toMatchObject({ reference: ref, passages: [], unavailableReason: expect.any(String) });
  });
  it("fails explicitly if the edition chapter cannot be validated or loaded, retaining the edition", async () => {
    for (const override of [{ contextBooks: [] }, { readContextChapter: async () => null }, { readContextChapter: async () => ["incomplete"] }]) {
      const result = await createLiturgyResult("2026-10-31", { ...dependencies(), ...override }, "open-nbv");
      expect(result).toMatchObject({ ok: false, code: "unavailable", date: "2026-10-31", edition: { id: "open-nbv" } });
      expect(result).not.toHaveProperty("readings");
    }
  });
  it("retains BLIVRE disjoint verse selection and exact paths for existing Connections actions", async () => {
    const result = await createLiturgyResult("2026-10-31", dependencies(), "blivre");
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.readings[2].passages[0].verses.map((v) => v.number)).toEqual([1, 7, 8, 9, 10, 11]);
    expect(result.readings[2].passages[0].verses[0].path).toBe("/lucas/14/1");
  });
});

describe("edition-aware daily API", () => {
  it("returns a dated NBV context response without cache", async () => {
    const response = await GET(new Request("https://test.local/api/liturgia?date=2026-10-31&edition=open-nbv"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const result = await response.json();
    expect(result.edition.id).toBe("open-nbv");
    expect(result.readings[2].passages[0].path).toBe("/ler/open-nbv/lucas/14");
  });
  it.each(["edition=CNBB", "edition=", "edition=blivre&edition=open-nbv", "edition=open-nbv&edition=open-nbv", "date=bad&edition=open-nbv", "date=2026-10-31&date=2026-11-01&edition=open-nbv"])("rejects malformed query %s", async (query) => {
    const response = await GET(new Request(`https://test.local/api/liturgia?${query}`));
    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });
});
