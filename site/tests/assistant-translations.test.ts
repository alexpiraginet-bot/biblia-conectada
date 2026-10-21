import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { books } from "@/lib/data";
import { getTranslation } from "@/lib/translations";
import { translatedChapter, translatedVerse } from "@/lib/translation-reading";
import { parseAssistantRequest } from "@/lib/assistant/input";
import { retrieveGrounding } from "@/lib/assistant/grounding";
import { providerPayload } from "@/lib/assistant/provider";
import { validateAnswer } from "@/lib/assistant/response";
import { reserve } from "@/lib/assistant/ledger";
import type { AssistantRequest, AssistantSuccess } from "@/lib/assistant/types";
import { resolveStudyReference } from "@/components/assistant/study-reference";
import { StudyChat, buildStudyRequest } from "@/components/assistant/StudyChat";
import { StudyAnswer } from "@/components/assistant/StudyAnswer";
import { loadStudyPassage } from "@/components/assistant/StudyOverlay";
import { verseActionFromEvent } from "@/components/assistant/verse-intent-events";

const request = (book = "joao", chapter = 3, verse = 16): AssistantRequest => ({
  requestId: randomUUID(), mode: "entender", translation: "open-nbv", question: "Qual o sentido desta passagem?", passage: { book, chapter, verse },
});
const answer = (id: string) => ({ title: "A passagem no contexto", blocks: [{ text: "Confira também o restante do capítulo.", citationIds: [id] }], suggestions: [] });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("edition-aware assistant boundary", () => {
  it("normalizes BLIVRE omission and rejects unsupported or malformed editions", async () => {
    const original = { ...request(), translation: undefined };
    const old = parseAssistantRequest(original);
    expect(old).not.toHaveProperty("translation");
    expect(parseAssistantRequest({ ...original, translation: "blivre" })).toEqual(old);
    for (const translation of [null, "", "nvi", "Open-NBV", ["open-nbv"], {}, true]) {
      expect(() => parseAssistantRequest({ ...original, translation })).toThrow();
    }
    const command = vi.fn().mockResolvedValue(["reserved", "100000"]);
    const normalized = [original, { ...original, translation: "blivre" }, { ...original, translation: "open-nbv" }].map(parseAssistantRequest);
    const reservations = await Promise.all(normalized.map((body) => reserve(command, body, "visitor", 100000)));
    expect(reservations[0].fingerprint).toBe(reservations[1].fingerprint);
    expect(reservations[2].fingerprint).not.toBe(reservations[0].fingerprint);
    expect(new Set(reservations.map((item) => item.key)).size).toBe(1);
  });

  it.each([["juizes", 5, 32], ["1-samuel", 20, 43], ["3-joao", 1, 15]] as const)("grounds the Open NBV extra position %s %i:%i without a BLIVRE index", async (book, chapter, verse) => {
    const input = request(book, chapter, verse);
    const grounding = await retrieveGrounding(input);
    expect(grounding.connections).toEqual([]);
    const selected = grounding.citations.find((citation) => citation.reference.endsWith(`${chapter}:${verse}`));
    expect(selected).toMatchObject({ text: await translatedVerse("open-nbv", book, chapter, verse), href: `/ler/open-nbv/${book}/${chapter}/${verse}` });
    expect(grounding.citations).toHaveLength((await translatedChapter("open-nbv", book, chapter))!.length);
    expect(grounding.citations.every((citation) => citation.id.startsWith("open-nbv:") && citation.href.startsWith("/ler/open-nbv/"))).toBe(true);
    await expect(retrieveGrounding({ ...input, translation: undefined })).rejects.toMatchObject({ code: "invalid" });
  });

  it("does not silently insert BLIVRE wording into the same numbered Open NBV passage", async () => {
    const input = request("1-joao", 5, 7), grounding = await retrieveGrounding(input);
    const selected = grounding.citations.find((citation) => citation.reference === "1 João 5:7")!;
    expect(selected.text).toBe(await translatedVerse("open-nbv", "1-joao", 5, 7));
    expect(selected.text).not.toBe(await translatedVerse("blivre", "1-joao", 5, 7));
    const payload = providerPayload(input, grounding), data = JSON.parse(payload.messages[0].content);
    expect(data.connections).toEqual([]);
    expect(data.edition.name).toBe(getTranslation("open-nbv")!.name);
    expect(data.sources.map((source: { text: string }) => source.text)).toEqual(await translatedChapter("open-nbv", "1-joao", 5));
    expect(payload.system).toContain("não suponha que a mesma numeração representa texto equivalente");
    expect(grounding.scope).toContain("alinhamento desta edição");
    const result = validateAnswer(answer(selected.id), input, grounding);
    expect(result.citations).toEqual([selected]);
    expect(result.source?.credit).toBe(getTranslation("open-nbv")!.credit);
    expect(result.source?.license).toContain("BY-SA");
    expect(result.source?.sourceNotice).toBe(getTranslation("open-nbv")!.sourceNotice);
    expect(result.notice).toContain("Open Nova Bíblia Viva");
    expect(() => validateAnswer(answer("v100"), input, grounding)).toThrow();
    const html = renderToStaticMarkup(createElement(StudyAnswer, { answer: result, onQuestion() {}, disabled: false }));
    expect(html).toContain('href="/ler/open-nbv/1-joao/5/7"');
    expect(html).toContain("Biblica");
    expect(html).toContain("The original Work by its copyright holders");
  });

  it("bounds a long chapter while retaining its selected verse, and rejects positions outside the edition", async () => {
    const grounding = await retrieveGrounding(request("salmos", 119, 176));
    expect(grounding.citations).toHaveLength(40);
    expect(grounding.citations.at(-1)?.reference).toBe("Salmos 119:176");
    expect(grounding.scope).toContain("o restante não foi fornecido");
    for (const input of [request("3-joao", 1, 16), request("3-joao", 2, 1), request("unknown", 1, 1)]) {
      await expect(retrieveGrounding(input)).rejects.toMatchObject({ code: "invalid" });
    }
  });
});

describe("edition-aware study interface", () => {
  it("resolves exact edition paths and keeps unprefixed references in BLIVRE", () => {
    expect(resolveStudyReference("ler/open-nbv/3-joao/1/15", books)).toMatchObject({ translation: "open-nbv", verse: 15, href: "/ler/open-nbv/3-joao/1/15" });
    expect(resolveStudyReference("3 João 1:15", books, "open-nbv")?.verse).toBe(15);
    expect(resolveStudyReference("3-joao/1/15", books)).toBeNull();
    expect(resolveStudyReference("joao/3/16", books)?.href).toBe("/joao/3/16");
    for (const path of ["ler/nvi/joao/3/16", "ler/open-nbv/3-joao/1/16", "ler/open-nbv/../joao/3/16", "ler/open-nbv/joao/03/16", "ler/open-nbv/joao/3/16?x=1", "ler/open-nbv/João 3:16"]) expect(resolveStudyReference(path, books)).toBeNull();
  });

  it("carries the edition into requests and never carries conversation evidence from another edition", async () => {
    const passage = { book: "joao", chapter: 3, verse: 16, reference: "João 3:16", text: (await translatedVerse("open-nbv", "joao", 3, 16))!, translation: "open-nbv" as const };
    const old = buildStudyRequest({ ...passage, translation: undefined }, "Como entender?", "contexto", "entender", []);
    const result: AssistantSuccess = { ok: true, mode: "entender", title: "Anterior", blocks: [], citations: [], suggestions: [], notice: "Confira." };
    const next = buildStudyRequest(passage, "Como entender?", "contexto", "entender", [{ request: old, answer: result }]);
    expect(next.translation).toBe("open-nbv");
    expect(next.history).toBeUndefined();
    const html = renderToStaticMarkup(createElement(StudyChat, { passage, enabled: false }));
    expect(html).toContain("Open Nova Bíblia Viva");
    expect(html).toContain("Como ele se conecta ao capítulo?");
    expect(html).not.toContain("Como ele se conecta à Bíblia?");
    expect(html).toContain("Ver conexões do capítulo na BLIVRE");
    expect(html).toContain(passage.text.slice(0, 40));
  });

  it("recognizes the edition in delegated study links and preserves browser gestures", () => {
    class Link {
      dataset = { studyRef: "ler/open-nbv/3-joao/1/15", studyLabel: "3 João 1:15" };
      target = "";
      closest() { return this; }
      hasAttribute() { return false; }
    }
    vi.stubGlobal("Element", Link);
    const opener = new Link(), event = { button: 0, target: opener } as unknown as MouseEvent;
    expect(verseActionFromEvent(event)).toMatchObject({ path: opener.dataset.studyRef, kind: "study" });
    expect(verseActionFromEvent({ ...event, ctrlKey: true })).toBeNull();
    opener.dataset.studyRef = "ler/nvi/joao/3/16";
    expect(verseActionFromEvent(event)).toBeNull();
  });

  it("fetches exact edition text on demand, independently of the BLIVRE cache", async () => {
    const nbv = await translatedChapter("open-nbv", "3-joao", 1);
    const blivre = await translatedChapter("blivre", "3-joao", 1);
    const fetcher = vi.fn(async (url: string) => Response.json(url.includes("/translations/") ? nbv : blivre));
    vi.stubGlobal("fetch", fetcher);
    const passage = await loadStudyPassage("ler/open-nbv/3-joao/1/15");
    expect(passage).toMatchObject({ translation: "open-nbv", verse: 15, text: nbv![14] });
    await loadStudyPassage("ler/open-nbv/3-joao/1/1");
    const old = await loadStudyPassage("3-joao/1/1");
    expect(old).not.toHaveProperty("translation");
    expect(old.text).toBe(blivre![0]);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/data/translations/open-nbv/3-joao/1.json", "/data/text/3-joao/1.json"]);
  });

  it("rejects invalid edition paths before networking and clears a timed-out chapter for retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: string, options?: RequestInit) => new Promise<Response>((_, reject) => options?.signal?.addEventListener("abort", () => reject(new Error("timeout")))));
    vi.stubGlobal("fetch", fetcher);
    for (const path of ["ler/open-nbv/3-joao/1/16", "ler/nvi/joao/3/16"]) await expect(loadStudyPassage(path)).rejects.toThrow("invalid reference");
    expect(fetcher).not.toHaveBeenCalled();
    const first = loadStudyPassage("ler/open-nbv/juizes/5/32");
    const failure = expect(first).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(10000); await failure;
    fetcher.mockImplementation(async () => Response.json(await translatedChapter("open-nbv", "juizes", 5)));
    await expect(loadStudyPassage("ler/open-nbv/juizes/5/32")).resolves.toMatchObject({ verse: 32, translation: "open-nbv" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not cache a malformed edition chapter as a successful reading", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(["incomplete"])).mockResolvedValueOnce(Response.json(await translatedChapter("open-nbv", "1-samuel", 20)));
    vi.stubGlobal("fetch", fetcher);
    await expect(loadStudyPassage("ler/open-nbv/1-samuel/20/43")).rejects.toThrow("missing verse");
    await expect(loadStudyPassage("ler/open-nbv/1-samuel/20/43")).resolves.toMatchObject({ verse: 43, translation: "open-nbv" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
