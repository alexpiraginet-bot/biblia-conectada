import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { assistantConfig, MAX_OUTPUT_TOKENS, MODEL, MONTHLY_LIMIT_MICROS } from "@/lib/assistant/config";
import { retrieveGrounding } from "@/lib/assistant/grounding";
import { parseAssistantRequest, readBoundedJson } from "@/lib/assistant/input";
import { LEDGER_KEY, ledgerReady, redisCommand, reserve, settle, visitorIdentity } from "@/lib/assistant/ledger";
import { callProvider, maximumCostMicros, parseProviderResult, providerPayload } from "@/lib/assistant/provider";
import { responseSchema, validateAnswer } from "@/lib/assistant/response";
import { handleStudy } from "@/lib/assistant/service";
import { bookBySlug, chapterVerses, grid, verseText } from "@/lib/reading";
import { parseSide } from "@/lib/conexao";
import type { AssistantRequest } from "@/lib/assistant/types";

const input = (): AssistantRequest => ({
  requestId: randomUUID(), mode: "entender", question: "O que este sinal nos convida a perceber?",
  passage: { book: "joao", chapter: 2, verse: 7 },
});
const env = {
  ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "test-key",
  UPSTASH_REDIS_REST_URL: "https://test.upstash.io", UPSTASH_REDIS_REST_TOKEN: "test-token",
  ASSISTANT_RATE_LIMIT_SECRET: "test-only-secret-with-at-least-32-characters", VERCEL: "1",
};
const httpRequest = (body: unknown = input(), origin = "https://biblia.test") => new Request("https://biblia.test/api/assistente", {
  method: "POST",
  headers: { "content-type": "application/json", origin, "x-forwarded-for": "192.0.2.20" },
  body: JSON.stringify(body),
});
const rawAnswer = (id: string) => ({
  title: "O sinal em Caná", blocks: [{ text: "Observe o gesto descrito na passagem e leia também o seu contexto.", citationIds: [id] }],
  suggestions: ["O que acontece antes desse gesto?"],
});
const completion = (answer: unknown, extra: Record<string, unknown> = {}) => ({
  model: MODEL, stop_reason: "end_turn",
  usage: { input_tokens: 100, output_tokens: 20 },
  content: [{ type: "thinking", thinking: "private deliberation" }, { type: "text", text: JSON.stringify(answer) }],
  ...extra,
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("assistant boundary and real grounding", () => {
  it("requires explicit enablement, every credential, and a fixed HTTPS Upstash host", () => {
    expect(assistantConfig({})).toBeNull();
    expect(assistantConfig({ ...env, ASSISTANT_ENABLED: "false" })).toBeNull();
    for (const key of ["ANTHROPIC_API_KEY", "UPSTASH_REDIS_REST_TOKEN", "ASSISTANT_RATE_LIMIT_SECRET"]) {
      expect(assistantConfig({ ...env, [key]: "" })).toBeNull();
    }
    for (const url of ["http://test.upstash.io", "https://evil.test", "https://test.upstash.io?token=x", "https://user@test.upstash.io"]) {
      expect(assistantConfig({ ...env, UPSTASH_REDIS_REST_URL: url })).toBeNull();
    }
    expect(assistantConfig(env)?.redisUrl).toBe("https://test.upstash.io");
    expect(assistantConfig({
      ...env, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined,
      KV_REST_API_URL: "https://native.upstash.io", KV_REST_API_TOKEN: "native-token",
    })?.redisUrl).toBe("https://native.upstash.io");
  });

  it("rejects invalid IDs, arbitrary options, unsupported modes and excessive questions", () => {
    expect(parseAssistantRequest(input()).mode).toBe("entender");
    for (const value of [
      { ...input(), requestId: "retry" }, { ...input(), model: "other-model" },
      { ...input(), mode: "execute" }, { ...input(), question: "a".repeat(801) },
      { ...input(), mode: ["narrar"] }, { ...input(), mode: ["entender"] },
      { ...input(), mode: ["explorar"] }, { ...input(), mode: { toString: "narrar" } },
      { ...input(), mode: null },
      { ...input(), passage: { book: "joao", chapter: 2, verse: -1 } },
    ]) expect(() => parseAssistantRequest(value)).toThrow();
  });

  it("bounds chunked bodies even without a trustworthy Content-Length", async () => {
    const request = new Request("https://biblia.test", {
      method: "POST", headers: { "content-type": "application/json" }, body: `"${"a".repeat(9000)}"`,
    });
    await expect(readBoundedJson(request)).rejects.toMatchObject({ code: "invalid" });
    await expect(readBoundedJson(httpRequest(input()))).resolves.toMatchObject({ mode: "entender" });
  });

  it("uses exact BLIVRE and only actual ranked links with existing canonical connection routes", async () => {
    const request = input();
    const grounding = await retrieveGrounding(request);
    const book = bookBySlug("joao")!;
    const rows = await chapterVerses(book, 2);
    expect(grounding.citations.length).toBe(rows.length + 8);
    for (const citation of grounding.citations) expect(citation.text).toBe(await verseText(Number(citation.id.slice(1))));
    const realPartners = new Set(rows[6].links.map(([gv]) => `v${gv}`));
    for (const edge of grounding.connections) {
      expect(edge.from).toBe(`v${grid.verseIndex(book, 2, 7)}`);
      expect(realPartners.has(edge.to)).toBe(true);
      const segments = edge.href.split("/");
      expect(segments).toHaveLength(4);
      expect(parseSide(segments[2])).not.toBeNull();
      expect(parseSide(segments[3])).not.toBeNull();
    }
    expect(grounding.art.src).toBe("/journey/cana-wedding.webp");
    await expect(retrieveGrounding({ ...request, passage: { book: "joao", chapter: 150 } })).rejects.toMatchObject({ code: "invalid" });
  });

  it("makes long-chapter context limits explicit and preserves the selected verse", async () => {
    const grounding = await retrieveGrounding({ ...input(), passage: { book: "salmos", chapter: 119, verse: 176 } });
    expect(grounding.scope).toContain("Recorte");
    expect(grounding.citations.some((citation) => citation.reference === "Salmos 119:176")).toBe(true);
    expect(grounding.citations.length).toBeLessThanOrEqual(48);
  });

  it("rejects invented citations and arbitrary model routes; scene links and art come from our data", async () => {
    const request = { ...input(), mode: "narrar" as const };
    const grounding = await retrieveGrounding(request);
    const id = grounding.citations[0].id;
    const answer = { ...rawAnswer(id), scenes: Array.from({ length: 3 }, () => ({
      title: "Acompanhe a passagem", text: "Leia o gesto no seu contexto.", citationIds: [id],
    })) };
    const result = validateAnswer(answer, request, grounding);
    expect(result.scenes).toHaveLength(3);
    expect(result.scenes![0].action.href).toBe(grounding.citations[0].href);
    expect(result.scenes![0].art.caption).toContain("Recriação");
    expect(result.citations[0].text).toBe(grounding.citations[0].text);
    expect(() => validateAnswer({ ...answer, href: "https://evil.test" }, request, grounding)).toThrow();
    expect(() => validateAnswer({ ...answer, blocks: [{ text: "Inventado", citationIds: ["v999999"] }] }, request, grounding)).toThrow();
    expect(() => validateAnswer({ ...answer, scenes: answer.scenes.slice(0, 2) }, request, grounding)).toThrow();
    expect(() => validateAnswer({ ...answer, title: "<script>alert(1)</script>" }, request, grounding)).toThrow();
  });
});

describe("provider contract and conservative billing", () => {
  it("uses exact Opus model, adaptive low effort, bounded output, standard tier and JSON schema without tools", async () => {
    const request = input();
    const grounding = await retrieveGrounding(request);
    const payload = providerPayload(request, grounding);
    expect(payload).toMatchObject({
      model: "claude-opus-5-5", max_tokens: 1600, service_tier: "standard_only", inference_geo: "global",
      thinking: { type: "adaptive" }, output_config: { effort: "low", format: { type: "json_schema" } },
    });
    expect(payload).not.toHaveProperty("tools");
    expect(payload).not.toHaveProperty("temperature");
    expect(payload).not.toHaveProperty("cache_control");
    expect(maximumCostMicros(payload)).toBeGreaterThan(MAX_OUTPUT_TOKENS * 20);
    expect(maximumCostMicros(payload)).toBeLessThan(MONTHLY_LIMIT_MICROS);
    expect(responseSchema(["v1"], true).required).toContain("scenes");
    const schema = JSON.stringify(responseSchema(["v1"], true));
    expect(schema).not.toMatch(/"maxItems"|"maxLength"|"minLength"|"minItems":[2-9]/);
  });

  it("never exposes thinking and refuses incomplete output; unknown usage never causes a refund", () => {
    const answer = rawAnswer("v1");
    expect(parseProviderResult(completion(answer))).toEqual({ answer, costMicros: 800 });
    expect(parseProviderResult(completion(answer, { stop_reason: "max_tokens" })).answer).toBeNull();
    for (const usage of [
      { input_tokens: 100, output_tokens: 1601 },
      { input_tokens: -1, output_tokens: 20 },
      { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 5 },
      { input_tokens: 100, output_tokens: 20, speed: "fast" },
      { input_tokens: 100, output_tokens: 20, inference_geo: "us" },
      { input_tokens: 100, output_tokens: 20, unknown_billable_feature: 1 },
      { input_tokens: 100, output_tokens: 20, cache_creation: { ephemeral_1h_input_tokens: 5 } },
      { input_tokens: 100, output_tokens: 20, output_tokens_details: { thinking_tokens: 21 } },
    ]) expect(parseProviderResult(completion(answer, { usage })).costMicros).toBeNull();
    expect(parseProviderResult(completion(answer, { usage: {
      input_tokens: 100, output_tokens: 20, inference_geo: "global", service_tier: "standard", speed: "standard",
      cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      output_tokens_details: { thinking_tokens: 12 },
      server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
    } })).costMicros).toBe(800);
  });

  it("makes one paid attempt only when the provider times out or errors", async () => {
    const payload = providerPayload(input(), await retrieveGrounding(input()));
    const fetcher = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(callProvider("fake-key", payload, new AbortController().signal, fetcher)).rejects.toThrow("timeout");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "error", cache: "no-store" });
  });
});

describe("persistent ledger adapter", () => {
  it("reserves via one EVAL sharing a cluster hash tag and never initializes missing state", async () => {
    const command = vi.fn().mockResolvedValue(["reserved", "100000"]);
    const reservation = await reserve(command, input(), "visitor-hmac", 100000, new Date("2026-10-20T23:59:30Z"));
    expect(command).toHaveBeenCalledTimes(1);
    const args = command.mock.calls[0][0];
    expect(args[0]).toBe("EVAL");
    expect(args[2]).toBe(4);
    expect(args.slice(3, 7).every((key: string) => key.includes("{assistant}"))).toBe(true);
    expect(args).toContain("spent:2026-10");
    expect(reservation.amount).toBe(100000);
    const missing = vi.fn().mockResolvedValue([null, null, null]);
    expect(await ledgerReady(missing)).toBe(false);
    expect(missing.mock.calls[0][0]).toEqual(["HMGET", LEDGER_KEY, "schema", "limitMicros", "blocked"]);
  });

  it("maps budget, rate and duplicate refusals without a second reservation", async () => {
    for (const [status, code] of [["budget", "limit"], ["minute", "limit"], ["day", "limit"], ["duplicate", "in_progress"], ["unavailable", "unavailable"]]) {
      const command = vi.fn().mockResolvedValue([status]);
      await expect(reserve(command, input(), "visitor", 100)).rejects.toMatchObject({ code });
      expect(command).toHaveBeenCalledTimes(1);
    }
  });

  it("does not settle unknown usage; ambiguous settlement failures preserve reservation", async () => {
    const command = vi.fn().mockRejectedValue(new Error("network failed"));
    const reservation = { key: "key", fingerprint: "fingerprint", amount: 100 };
    await settle(command, reservation, null);
    expect(command).not.toHaveBeenCalled();
    await expect(settle(command, reservation, 40)).resolves.toBeUndefined();
    expect(command).toHaveBeenCalledTimes(1);
  });

  it("fails closed on REST errors and never returns token-bearing provider errors", async () => {
    const config = assistantConfig(env)!;
    const command = redisCommand(config, vi.fn().mockResolvedValue(Response.json({ error: "private service error" })));
    await expect(command(["PING"])).rejects.toMatchObject({ code: "unavailable" });
  });

  it("requires a verified Vercel IP and stores only keyed pseudonyms", () => {
    const req = httpRequest();
    const id = visitorIdentity(req, env.ASSISTANT_RATE_LIMIT_SECRET, env);
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain("192.0.2.20");
    expect(() => visitorIdentity(req, "secret", {})).toThrow();
    const spoof = new Request(req.url, { headers: { "x-forwarded-for": "evil, 192.0.2.20" } });
    expect(() => visitorIdentity(spoof, "secret", env)).toThrow();
  });
});

describe("complete service with no external network", () => {
  beforeEach(() => Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value)));

  it("cannot call any external service when disabled, malformed, or cross-origin", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("ASSISTANT_ENABLED", "false");
    expect((await handleStudy(httpRequest())).body).toMatchObject({ ok: false, code: "unavailable" });
    vi.stubEnv("ASSISTANT_ENABLED", "true");
    expect((await handleStudy(httpRequest(input(), "https://evil.test"))).status).toBe(403);
    expect((await handleStudy(httpRequest({ ...input(), question: "a".repeat(900) }))).status).toBe(400);
    expect((await handleStudy(httpRequest({ ...input(), mode: ["narrar"] }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not reach Anthropic when persistent reservation fails", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ result: ["budget"] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await handleStudy(httpRequest());
    expect(result.body).toMatchObject({ ok: false, code: "limit" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://test.upstash.io");
  });

  it("reserves before a single provider call, then settles exactly once and returns exact source text", async () => {
    const request = input();
    const grounding = await retrieveGrounding(request);
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (url.includes("upstash")) {
        const args = JSON.parse(options.body as string);
        if (args[2] === 4) { calls.push("reserve"); return Response.json({ result: ["reserved", String(args[8])] }); }
        calls.push("settle"); return Response.json({ result: ["settled"] });
      }
      calls.push("provider");
      return Response.json(completion(rawAnswer(grounding.citations[0].id)));
    });
    vi.stubGlobal("fetch", fetcher);
    const result = await handleStudy(httpRequest(request));
    expect(result.status).toBe(200);
    expect(calls).toEqual(["reserve", "provider", "settle"]);
    expect(result.body).toMatchObject({ ok: true, citations: [{ text: grounding.citations[0].text }] });
    expect(JSON.stringify(result.body)).not.toContain("private deliberation");
  });

  it("retains the full reservation after ambiguous provider failure, with no automatic retry or refund", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      calls.push(url);
      if (url.includes("upstash")) {
        const args = JSON.parse(options.body as string);
        return Response.json({ result: ["reserved", String(args[8])] });
      }
      throw new Error("secret-bearing network diagnostic");
    });
    vi.stubGlobal("fetch", fetcher);
    const result = await handleStudy(httpRequest());
    expect(result.status).toBe(502);
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(result.body)).not.toContain("secret-bearing");
  });

  it("never calls the provider when a client aborts immediately after the atomic reservation", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      const args = JSON.parse(options.body as string);
      controller.abort();
      return Response.json({ result: ["reserved", String(args[8])] });
    });
    vi.stubGlobal("fetch", fetcher);
    const request = new Request(httpRequest(), { signal: controller.signal });
    const result = await handleStudy(request);
    expect(result.body).toMatchObject({ ok: false, code: "provider" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
