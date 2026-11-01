import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/og/route";
import { createLiturgyShareCard, liturgyDayPath } from "../src/lib/liturgy/share";
import { getDailyLiturgy } from "../src/lib/liturgy/service";
import { resolveShareCard, shareExcerpt } from "../src/lib/share-card";
import { shareMetadata } from "../src/lib/share-metadata";
import { liturgyShareOptions } from "../src/components/liturgy/LiturgyShare";
import { journeyArea } from "../src/components/rewards/eligibility";
import type { LiturgyDay, LiturgyUnavailable } from "../src/lib/liturgy/types";
import { bookFile } from "./generated";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LiturgyShareActions from "../src/components/liturgy/LiturgyShareActions";

vi.mock("../src/lib/liturgy/service", () => ({ getDailyLiturgy: vi.fn() }));
const day = (): LiturgyDay => ({
  ok: true, date: "2026-10-31", today: "2026-11-01", celebration: "Sábado da 30ª Semana do Tempo Comum", color: "green", colorLabel: "Verde",
  source: { name: "Calendário", url: "https://example.test", officialUrl: "https://example.test", notice: "Referências" },
  edition: { id: "blivre", name: "Bíblia Livre (BLIVRE)", notice: "Tradução livre para estudo" }, fetchedAt: "2026-10-31T12:00:00Z",
  readings: [
    { id: "first-1", kind: "first", label: "Primeira leitura", reference: "Fl 1,18-26", passages: [] },
    { id: "psalm-1", kind: "psalm", label: "Salmo", reference: "Sl 41(42)", passages: [] },
    { id: "gospel-1", kind: "gospel", label: "Evangelho", reference: "Lc 14,1.7-11", passages: [{ reference: "Lucas 14:1", path: "/lucas/14/1", verses: [{ number: 1, text: bookFile("lucas").chapters[13][0].t, path: "/lucas/14/1" }] }] },
  ],
});
const unavailable = (): LiturgyUnavailable => ({ ok: false, date: "2026-10-31", today: "2026-11-01", code: "unavailable", message: "Consulta indisponível", source: day().source });
beforeEach(() => { vi.mocked(getDailyLiturgy).mockReset().mockResolvedValue(day()); });

describe("fixed daily sharing", () => {
  it("preserves NBV in aliases, sharing and metadata without quoting a BLIVRE passage", async () => {
    const data = day(); data.edition = { id: "open-nbv", name: "Open NBV", notice: "Contexto" };
    // Deliberately retain BLIVRE fixture verses: the NBV daily card must ignore ALL verse text.
    vi.mocked(getDailyLiturgy).mockResolvedValue(data);
    const card = await resolveShareCard("/dia/2026-10-31?edition=open-nbv");
    expect(card).toEqual(await resolveShareCard("/liturgia?date=2026-10-31&edition=open-nbv"));
    expect(card).toMatchObject({ path: "/dia/2026-10-31?edition=open-nbv", contextOnly: true, source: "Open NBV · leitura de contexto" });
    expect(card?.description).not.toContain(data.readings[2].passages[0].verses[0].text);
    expect(card?.description).toContain("não foi alinhado");
    expect(getDailyLiturgy).toHaveBeenCalledWith("2026-10-31", "open-nbv");
    const options = liturgyShareOptions({ date: data.date, references: data.readings.map((r) => r.reference), edition: "open-nbv" });
    expect(new URL(options.url).search).toBe("?edition=open-nbv");
    expect(new URL(options.whatsapp).searchParams.get("text")).toContain("Open NBV · capítulos de contexto");
    for (const format of ["story", "landscape"] as const) {
      expect(new URL(options.image(format), "https://test.local").searchParams.get("path")).toBe(card!.path);
      expect(options.filename(format)).toContain("open-nbv");
    }
    expect(shareMetadata({ title: options.reference, description: "Contexto", path: card!.path }).alternates?.canonical).toBe(options.url);
    const html = renderToStaticMarkup(createElement(LiturgyShareActions, { date: data.date, references: [], edition: "open-nbv" }));
    expect(html).toContain("sem citação de versículo");
    expect(html).not.toContain("é da Bíblia Livre");
  });
  it("retains NBV on an unavailable day and the permanent today card", async () => {
    vi.mocked(getDailyLiturgy).mockResolvedValue({ ...unavailable(), edition: { id: "open-nbv", name: "Open NBV", notice: "Contexto" } });
    const card = await resolveShareCard("/dia/2026-10-31?edition=open-nbv");
    expect(card).toMatchObject({ path: "/dia/2026-10-31?edition=open-nbv", unavailable: true, readings: [] });
    expect(await resolveShareCard("/liturgia?edition=open-nbv")).toMatchObject({ path: "/liturgia?edition=open-nbv", contextOnly: true });
  });
  it.each(["/liturgia?edition=CNBB", "/liturgia?edition=", "/dia/2026-10-31?edition=ave-maria", "/dia/2026-10-31?edition=blivre&edition=open-nbv", "/liturgia?date=2026-10-31&edition=open-nbv&edition=open-nbv"])("rejects unsupported edition image %s", async (path) => {
    expect(await resolveShareCard(path)).toBeNull();
    expect(getDailyLiturgy).not.toHaveBeenCalled();
  });
  it.each([["landscape", 1200, 630], ["story", 1080, 1920]] as const)("renders an NBV %s cover with no fabricated quotation", async (format, width, height) => {
    const data = day(); data.edition = { id: "open-nbv", name: "Open NBV", notice: "Contexto" };
    vi.mocked(getDailyLiturgy).mockResolvedValue(data);
    const response = await GET(new Request(`https://test.local/og?${new URLSearchParams({ path: "/dia/2026-10-31?edition=open-nbv", format })}`));
    expect(response.status).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([width, height]);
  });
  it("resolves the short day link and query alias to the same actual day, not today", async () => {
    const short = await resolveShareCard("/dia/2026-10-31");
    const query = await resolveShareCard("/liturgia?date=2026-10-31");
    expect(short).toEqual(query);
    expect(short).toMatchObject({ path: "/dia/2026-10-31", title: "31 de outubro de 2026", kind: "liturgy", source: "Bíblia Livre (BLIVRE) · Lucas 14:1" });
    expect(short?.description).toBe(shareExcerpt(bookFile("lucas").chapters[13][0].t, 150));
    expect(short?.readings?.map((reading) => reading.reference)).toEqual(["Fl 1,18-26", "Sl 41(42)", "Lc 14,1.7-11"]);
    expect(getDailyLiturgy).toHaveBeenCalledWith("2026-10-31", "blivre");
  });
  it("never allows query text or another query date to replace a fixed path date", async () => {
    const card = await resolveShareCard("/dia/2026-10-31?date=2026-11-01&title=INVENTED");
    expect(card?.path).toBe("/dia/2026-10-31");
    expect(JSON.stringify(card)).not.toContain("INVENTED");
    expect(getDailyLiturgy).toHaveBeenCalledWith("2026-10-31", "blivre");
  });
  it("rejects malformed, duplicated, impossible or unsupported dates before fetching", async () => {
    for (const path of ["/dia", "/dia/2026-02-31", "/dia/2026-1-01", "/dia/2026-10-31/more", "/dia/2101-01-01", "/liturgia?date=2026-10-31&date=2026-11-01", "/liturgia?date=bad"]) expect(await resolveShareCard(path), path).toBeNull();
    expect(getDailyLiturgy).not.toHaveBeenCalled();
    expect(() => liturgyDayPath("2026-02-31")).toThrow();
  });
  it("keeps unavailable covers honest with no borrowed references or quotation", async () => {
    vi.mocked(getDailyLiturgy).mockResolvedValue(unavailable());
    const card = await resolveShareCard("/dia/2026-10-31");
    expect(card).toMatchObject({ unavailable: true, readings: [], title: "31 de outubro de 2026" });
    expect(card?.description).toContain("temporariamente indisponíveis");
    expect(card?.source).toBeUndefined();
  });
  it("does not invent a Gospel quote when the selected text is unavailable", () => {
    const data = day(); data.readings[2].passages = [];
    expect(createLiturgyShareCard(data).source).toBeUndefined();
    expect(createLiturgyShareCard(data).readings).toHaveLength(3);
  });
  it("uses the stable short link in WhatsApp, canonical metadata and both image formats", () => {
    const options = liturgyShareOptions({ date: day().date, references: day().readings.map((reading) => reading.reference) });
    expect(new URL(options.url).pathname).toBe("/dia/2026-10-31");
    const caption = new URL(options.whatsapp).searchParams.get("text");
    expect(caption).toContain("31 de outubro de 2026");
    expect(caption).toContain("Lc 14,1.7-11");
    expect(caption).toContain(options.url);
    for (const format of ["story", "landscape"] as const) expect(new URL(options.image(format), "https://test.local").searchParams.get("path")).toBe("/dia/2026-10-31");
    const meta = shareMetadata({ title: options.reference, description: "Leituras", path: liturgyDayPath(day().date) });
    expect(meta.alternates?.canonical).toBe(options.url);
    expect(journeyArea("/dia/2026-10-31", true, false)).toBe("reading");
    expect(journeyArea("/dia/2026-10-31", true, true)).toBe("liturgy");
  });
  it.each([["landscape", 1200, 630], ["story", 1080, 1920]] as const)("renders a real %s PNG with factual data", async (format, width, height) => {
    const response = await GET(new Request(`https://test.local/og?path=/dia/2026-10-31&format=${format}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([width, height]);
    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
  });
  it("does not cache an unavailable day image for a week", async () => {
    vi.mocked(getDailyLiturgy).mockResolvedValue(unavailable());
    const response = await GET(new Request("https://test.local/og?path=/dia/2026-10-31"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    await response.arrayBuffer();
  });
});
