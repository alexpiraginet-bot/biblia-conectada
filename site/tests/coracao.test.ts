import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { POST } from "@/app/api/coracao/route";
import { MONTHLY_LIMIT_MICROS } from "@/lib/assistant/config";
import { LEDGER_KEY, reserve, RESERVE_LUA, SETTLE_LUA } from "@/lib/assistant/ledger";
import { CORACAO_MODEL, CORACAO_MAX_OUTPUT_TOKENS } from "@/lib/coracao/config";
import { CoracaoFailure } from "@/lib/coracao/failure";
import { parseCoracaoRequest } from "@/lib/coracao/input";
import { callCoracaoProvider, coracaoMaximumCost, coracaoPayload, parseCoracaoProvider } from "@/lib/coracao/provider";
import { clarifyCoracao, validateCoracaoAnswer } from "@/lib/coracao/response";
import { retrieveCoracao } from "@/lib/coracao/retrieval";
import { translatedVerse } from "@/lib/translation-reading";
import type { CoracaoInput } from "@/lib/coracao/types";

const question = "Lembro de algo sobre o limite do conhecimento humano, que Deus não revela tudo para nós.";
const input = (extra: Partial<CoracaoInput> = {}): CoracaoInput => ({ requestId: randomUUID(), question, mode: "encontrar", translation: "open-nbv", ...extra });
const env = { VERCEL: "1", ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "test-key", KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-redis", ASSISTANT_RATE_LIMIT_SECRET: "test-only-secret-with-at-least-32-characters", ASSISTANT_VOICE_ENABLED: "false" };
const enable = () => Object.entries(env).forEach(([key,value]) => vi.stubEnv(key,value));
const request = (body: unknown = input(), headers = {}, signal?: AbortSignal) => new Request("https://biblia.test/api/coracao", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://biblia.test", "x-forwarded-for": "192.0.2.25", ...headers }, body: JSON.stringify(body), signal,
});
const answer = (id: string) => ({ kind: "answer", title: "O que podemos conhecer", blocks: [{ text: "O recorte distingue o que permanece oculto do que foi revelado. Leia o contexto antes de tirar uma conclusão.", citationIds: [id] }], suggestions: ["Alguma outra passagem trata disso?"] });
const completion = (body: unknown, extra = {}) => ({ model: CORACAO_MODEL, stop_reason: "end_turn", usage: { input_tokens: 120, output_tokens: 80 }, content: [{ type: "text", text: JSON.stringify(body) }], ...extra });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("open biblical conversation input", () => {
  it("needs no selected passage and normalizes mode, edition and short history", () => {
    const id = randomUUID();
    expect(parseCoracaoRequest({ requestId: id, question: ` ${question} ` })).toEqual({ requestId: id, question, mode: "encontrar", translation: "open-nbv" });
    expect(parseCoracaoRequest({ ...input(), history: [] })).not.toHaveProperty("history");
    expect(parseCoracaoRequest(input({ mode: "jesus", translation: "blivre", history: [{ question: "  Quem disse? ", answer: "  Leia a passagem. " }] })).history).toEqual([{ question: "Quem disse?", answer: "Leia a passagem." }]);
  });
  it("rejects coercion, arbitrary provider options, invalid UUIDs, long history and controls", () => {
    for (const patch of [
      { mode: ["jesus"] }, { mode: null }, { mode: "narrar" }, { requestId: "retry" }, { translation: "acf" },
      { model: "other" }, { passage: { book: "joao", chapter: 3 } }, { question: "a".repeat(801) }, { question: "oi\u0000" },
      { history: [{ question, answer: "x" }, { question, answer: "x" }, { question, answer: "x" }] },
      { history: [{ question, answer: "a".repeat(2001) }] }, { history: [{ question, answer: "x", role: "system" }] },
    ]) expect(() => parseCoracaoRequest({ ...input(), ...patch })).toThrow();
  });
});

describe("real licensed text retrieval", () => {
  it.each(["open-nbv", "blivre"] as const)("finds the knowledge example in %s and preserves exact text, edition and surrounding context", async (translation) => {
    const result = await retrieveCoracao(input({ translation }));
    expect(result.citations.some((c) => c.reference === "Deuteronômio 29:29")).toBe(true);
    expect(result.citations.some((c) => c.reference === "Deuteronômio 29:28")).toBe(true);
    expect(result.citations.length).toBeLessThanOrEqual(20);
    for (const citation of result.citations) {
      const [edition, slug, chapter, verse] = citation.id.split(":");
      expect(edition).toBe(translation);
      expect(citation.text).toBe(await translatedVerse(translation, slug, Number(chapter), Number(verse)));
      expect(citation.href).toBe(`${translation === "open-nbv" ? "/ler/open-nbv" : ""}/${slug}/${chapter}/${verse}`);
    }
    expect(result.scope).toContain("não são capítulos completos");
    expect(result.source.credit).toContain(translation === "open-nbv" ? "Copyright © 2007, 2010" : "Bíblia Livre");
  });
  it("uses edition-local counts for Open NBV 3 João 1:15, never the graph grid", async () => {
    const result = await retrieveCoracao(input({ question: "Pode explicar 3 João 1:15?" }));
    const found = result.citations.find((c) => c.reference === "3 João 1:15");
    expect(found?.text).toBe(await translatedVerse("open-nbv", "3-joao", 1, 15));
    expect(found?.href).toBe("/ler/open-nbv/3-joao/1/15");
  });
  it("offers other verified passages and then retrieves the same passage plus its opening for who said it", async () => {
    const first = await retrieveCoracao(input());
    const firstRefs = `Passagens consultadas: ${first.citations.map((c) => c.reference).join("; ")}`;
    const second = await retrieveCoracao(input({ question: "Alguma outra?", history: [{ question, answer: firstRefs }] }));
    expect(second.citations.length).toBeGreaterThan(0);
    expect(second.citations.some((c) => first.citations.some((old) => old.id === c.id))).toBe(false);
    const next = second.citations[0];
    const third = await retrieveCoracao(input({ question: "Quem disse?", history: [{ question, answer: firstRefs }, { question: "Alguma outra?", answer: `Passagem consultada: ${next.reference}` }] }));
    expect(third.citations.some((c) => c.id === next.id)).toBe(true);
    const parts = next.id.split(":");
    expect(third.citations.some((c) => c.id === `${parts[0]}:${parts[1]}:${parts[2]}:1`)).toBe(true);
    expect(third.scope).toContain("não comprova autoria histórica");
  });
  it.each(["open-nbv", "blivre"] as const)("does not cycle back to either retained answer after a second other-passage request in %s", async (translation) => {
    const first = await retrieveCoracao(input({ translation }));
    const references = (result: typeof first) => `Passagens consultadas: ${result.citations.map((c) => c.reference).join("; ")}`;
    const firstTurn = { question, answer: references(first) };
    const second = await retrieveCoracao(input({ translation, question: "Alguma outra?", history: [firstTurn] }));
    const third = await retrieveCoracao(input({ translation, question: "Alguma outra?", history: [
      firstTurn, { question: "Alguma outra?", answer: references(second) },
    ] }));
    const alreadyShown = new Set([...first.citations, ...second.citations].map((citation) => citation.id));
    expect(third.citations.length).toBeGreaterThan(0);
    expect(third.citations.filter((citation) => alreadyShown.has(citation.id))).toEqual([]);
    for (const citation of third.citations) {
      const [edition, slug, chapter, verse] = citation.id.split(":");
      expect(citation.text).toBe(await translatedVerse(edition, slug, Number(chapter), Number(verse)));
    }
  });
  it("retrieves relevant Gospel context for a hater or danger, without importing graph neighbours", async () => {
    for (const question of ["Como responder a um hater que me xingou?", "Estou sofrendo abuso e violência. O que fazer?"]) {
      const result = await retrieveCoracao(input({ question, mode: "jesus" }));
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citations.every((c) => ["mateus", "marcos", "lucas", "joao"].includes(c.id.split(":")[1]))).toBe(true);
      expect(result.citations.some((c) => c.reference === "João 18:23")).toBe(true);
    }
  });
  it.each(["open-nbv", "blivre"] as const)("grounds the reported WhatsApp insult in %s without needing a verse reference", async (translation) => {
    const grounding = await retrieveCoracao(input({ question: "Alguém me xingou no WhatsApp", mode: "jesus", translation }));
    expect(grounding.citations.map((c) => c.reference)).toEqual(expect.arrayContaining([
      "Mateus 5:44", "Lucas 6:27", "João 18:23", "Mateus 18:15",
    ]));
    for (const citation of grounding.citations) {
      const [edition, slug, chapter, verse] = citation.id.split(":");
      expect(edition).toBe(translation);
      expect(citation.text).toBe(await translatedVerse(translation, slug, Number(chapter), Number(verse)));
    }
  });
  it("does not invent a match for unknown words", async () => {
    const request = input({ question: "xqzvtrn pzqxv" });
    const grounding = await retrieveCoracao(request);
    expect(grounding.citations).toEqual([]);
    expect(clarifyCoracao(request, grounding)).toMatchObject({ kind: "clarify", citations: [] });
  });
});

describe("source and interpretation boundary", () => {
  it("only accepts source IDs; prose cannot forge URLs, literal text, citations or divine identity", async () => {
    const request = input(), grounding = await retrieveCoracao(request), id = grounding.citations[0].id;
    const result = validateCoracaoAnswer(answer(id), request, grounding);
    expect(result.citations).toEqual([grounding.citations[0]]);
    expect(result.notice).toContain("não garante");
    for (const raw of [
      { ...answer(id), citations: [{ text: "Invented", href: "https://evil.test" }] },
      answer("blivre:not-a-source:1:1"),
      { ...answer(id), blocks: [{ text: "Read https://evil.test", citationIds: [id] }] },
      { ...answer(id), blocks: [{ text: "Como diz João 99:99", citationIds: [id] }] },
      { ...answer(id), blocks: [{ text: "Como diz João99:99", citationIds: [id] }] },
      { ...answer(id), blocks: [{ text: "Leia Deuteronômio 29:29–99", citationIds: [id] }] },
      { ...answer(id), blocks: [{ text: "Eu sou Jesus e Deus me revelou sua resposta.", citationIds: [id] }] },
      { ...answer(id), blocks: [{ text: "Uma afirmação sem fonte.", citationIds: [] }] },
    ]) expect(() => validateCoracaoAnswer(raw, request, grounding)).toThrow();
  });
  it("labels Jesus-mode reflection and keeps a human reply separate from Scripture", async () => {
    const request = input({ mode: "jesus", question: "Como responder a um hater?" }), grounding = await retrieveCoracao(request);
    const raw = { ...answer(grounding.citations[0].id), suggestedReply: "Prefiro conversar com respeito. Vou encerrar por aqui." };
    const result = validateCoracaoAnswer(raw, request, grounding);
    expect(result.suggestedReply).toBe(raw.suggestedReply);
    expect(result.notice).toContain("Não é Jesus falando");
    expect(result.citations.every((c) => c.text !== raw.suggestedReply)).toBe(true);
    expect(() => validateCoracaoAnswer(raw, { ...request, mode: "encontrar" }, grounding)).toThrow();
    expect(validateCoracaoAnswer({ kind: "redirect", title: "Vamos voltar à Bíblia", blocks: [{ text: "Meu foco é a conversa bíblica. Há um tema dessa pergunta que você gostaria de explorar nas Escrituras?", citationIds: [] }], suggestions: [], suggestedReply: null }, request, grounding).kind).toBe("redirect");
  });
});

describe("Sonnet price, budget and provider boundary", () => {
  it("uses the verified fixed model, $2/$10 rates and a conservative reserve within the shared $20 ledger", async () => {
    const request = input(), grounding = await retrieveCoracao(request), payload = coracaoPayload(request, grounding);
    expect(payload).toMatchObject({ model: "claude-sonnet-5-5", max_tokens: 1600, inference_geo: "global", service_tier: "standard_only", thinking: { type: "between_tools" }, output_config: { effort: "low" } });
    expect(payload.system).toContain("NUNCA personifique Jesus");
    expect(payload.system).toContain("não prescreva tolerar abuso");
    expect(payload.system).toContain("retorne kind redirect");
    const amount = coracaoMaximumCost(payload);
    expect(amount).toBeGreaterThan(1600*10);
    expect(amount).toBeLessThan(MONTHLY_LIMIT_MICROS);
    const command = vi.fn().mockResolvedValue(["reserved", String(amount)]);
    await reserve(command, { operation: "coracao-v1", model: CORACAO_MODEL, ...request }, "visitor", amount);
    const args = command.mock.calls[0][0];
    expect(args[1]).toBe(RESERVE_LUA); expect(args[3]).toBe(LEDGER_KEY); expect(args[7]).toBe(20_000_000);
    expect(args[5]).toContain("bc:{assistant}:minute:visitor:");
    expect(parseCoracaoProvider(completion(answer(grounding.citations[0].id))).costMicros).toBe(120*2+80*10);
  });
  it("retains the reserve for unknown billing dimensions and refuses a different model", () => {
    for (const usage of [
      { input_tokens: 1, output_tokens: 2, service_tier: "priority" }, { input_tokens: 1, output_tokens: 2, new_cost: 1 },
      { input_tokens: 1, output_tokens: CORACAO_MAX_OUTPUT_TOKENS+1 }, { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 20 },
    ]) expect(parseCoracaoProvider(completion({}, { usage })).costMicros).toBeNull();
    expect(() => parseCoracaoProvider(completion({}, { model: "claude-opus-5-5" }))).toThrow();
  });
  it("distinguishes output exhaustion from missing sources, even when truncated output contains valid JSON", () => {
    const result = parseCoracaoProvider(completion({ kind: "answer" }, {
      stop_reason: "max_tokens", usage: { input_tokens: 300, output_tokens: 1600, output_tokens_details: { thinking_tokens: 1550 } },
    }));
    expect(result).toMatchObject({ answer: null, failure: "output_limit", costMicros: 16_600,
      diagnostics: { stopReason: "max_tokens", inputTokens: 300, outputTokens: 1600, thinkingTokens: 1550 } });
    expect(new CoracaoFailure(result.failure!).message).not.toContain("pergunta mais específica");
    expect(parseCoracaoProvider(completion({}, { stop_reason: "refusal" })).failure).toBe("refusal");
    expect(parseCoracaoProvider(completion({}, { stop_reason: "private provider text" })).diagnostics.stopReason).toBe("other");
    expect(parseCoracaoProvider(completion({}, { content: [{ type: "text", text: "{incomplete" }] })).failure).toBe("invalid_json");
  });
  it("makes one provider attempt, forwards cancellation and bounds the response", async () => {
    const request = input(), payload = coracaoPayload(request, await retrieveCoracao(request));
    const controller = new AbortController();
    const fetcher = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      expect(options?.redirect).toBe("error");
      controller.abort();
      expect(options?.signal?.aborted).toBe(true);
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(callCoracaoProvider("test", payload, controller.signal, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(callCoracaoProvider("test", payload, new AbortController().signal, vi.fn().mockResolvedValue(new Response("x".repeat(256001))))).rejects.toThrow();
  });
});

describe("API failure and idempotency contract with mocked network only", () => {
  it("stays unavailable without configuration and refuses cross-origin/oversize requests before network", async () => {
    vi.stubEnv("ASSISTANT_ENABLED", "false");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await POST(request())).status).toBe(503);
    enable();
    expect((await POST(request(input(), { origin: "https://evil.test" }))).status).toBe(403);
    expect((await POST(request({ ...input(), question: "x".repeat(20000) }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("asks for a detail without a paid call when retrieval has no evidence", async () => {
    enable(); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await POST(request(input({ question: "qzxv zqxv" })));
    expect(response.status).toBe(200); expect((await response.json()).kind).toBe("clarify");
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("reserves before the sole provider call, settles verified usage and rejects replay", async () => {
    enable(); const calls: string[] = [], body = input(); let charged = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      const args = JSON.parse(options.body as string);
      if (url.includes("upstash")) {
        if (args[1] === SETTLE_LUA) { calls.push("settle"); return Response.json({ result: ["settled"] }); }
        calls.push("reserve"); const result = charged ? ["duplicate"] : ["reserved", String(args[8])]; charged = true;
        return Response.json({ result });
      }
      calls.push("provider");
      const sources = JSON.parse(args.messages[0].content).sources;
      return Response.json(completion(answer(sources[0].id)));
    }));
    const first = await POST(request(body));
    expect(first.status).toBe(200); expect((await first.json()).audio).toBeUndefined();
    expect((await POST(request(body))).status).toBe(409);
    expect(calls).toEqual(["reserve", "provider", "settle", "reserve"]);
  });
  it("uses Anthropic for a concrete Jesus-mode reply and preserves server-owned Gospel quotations", async () => {
    enable(); let providerCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      const args = JSON.parse(options.body as string);
      if (url.includes("upstash")) return Response.json({ result: args[1] === SETTLE_LUA ? ["settled"] : ["reserved", String(args[8])] });
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect(options.headers).toMatchObject({ "x-api-key": env.ANTHROPIC_API_KEY });
      expect(args.thinking).toEqual({ type: "between_tools" });
      providerCalls++;
      const sources = JSON.parse(args.messages[0].content).sources as { id: string; reference: string }[];
      const source = sources.find((source) => source.reference === "João 18:23")!;
      return Response.json(completion({ kind: "answer", title: "Responder com respeito e firmeza", blocks: [{
        text: "João 18:23 mostra Jesus questionando uma agressão. Uma possibilidade é falar com firmeza, sem retribuir o insulto.", citationIds: [source.id],
      }], suggestions: ["Como colocar um limite nessa conversa?"], suggestedReply: "Quero conversar com respeito. Se os insultos continuarem, vou encerrar por aqui." }));
    }));
    const response = await POST(request(input({ question: "Alguém me xingou no WhatsApp", mode: "jesus" })));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, kind: "answer", mode: "jesus" });
    expect(body.citations).toHaveLength(1);
    expect(body.citations[0].text).toBe(await translatedVerse("open-nbv", "joao", 18, 23));
    expect(body.notice).toContain("Não é Jesus falando");
    expect(providerCalls).toBe(1);
  });
  it("settles a truncated response once and logs only fixed diagnostics, never conversation text or credentials", async () => {
    enable(); const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      const args = JSON.parse(options.body as string);
      if (url.includes("upstash")) {
        calls.push(args[1] === SETTLE_LUA ? "settle" : "reserve");
        return Response.json({ result: args[1] === SETTLE_LUA ? ["settled"] : ["reserved", String(args[8])] });
      }
      calls.push("anthropic");
      return Response.json(completion({ private: "private generated text" }, { stop_reason: "max_tokens",
        usage: { input_tokens: 300, output_tokens: 1600, output_tokens_details: { thinking_tokens: 1500 } } }));
    }));
    const response = await POST(request(input({ question: "Alguém me xingou no WhatsApp", mode: "jesus" })));
    expect(response.status).toBe(502);
    expect((await response.json()).message).toContain("interrompida");
    expect(calls).toEqual(["reserve", "anthropic", "settle"]);
    expect(logger).toHaveBeenCalledWith("coracao_failure", expect.objectContaining({ provider: "anthropic",
      phase: "provider", reason: "output_limit", stopReason: "max_tokens", outputTokens: 1600, thinkingTokens: 1500 }));
    const logged = JSON.stringify(logger.mock.calls);
    for (const privateValue of ["Alguém", "WhatsApp", "private generated text", env.ANTHROPIC_API_KEY, env.KV_REST_API_TOKEN]) expect(logged).not.toContain(privateValue);
  });
  it("does not call the provider after budget refusal or an abort during reservation", async () => {
    enable(); const controller = new AbortController();
    const refused = vi.fn().mockResolvedValue(Response.json({ result: ["budget"] })); vi.stubGlobal("fetch", refused);
    expect((await POST(request())).status).toBe(429); expect(refused).toHaveBeenCalledTimes(1);
    const aborted = vi.fn(async (_url: string, options: RequestInit) => {
      const args = JSON.parse(options.body as string); controller.abort();
      return Response.json({ result: ["reserved", String(args[8])] });
    });
    vi.stubGlobal("fetch", aborted);
    expect((await POST(request(input(), {}, controller.signal))).status).toBe(502);
    expect(aborted).toHaveBeenCalledTimes(1);
  });
});
