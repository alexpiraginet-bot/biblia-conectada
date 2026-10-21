import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { POST } from "@/app/api/assistente/voz/route";
import { MONTHLY_LIMIT_MICROS } from "@/lib/assistant/config";
import { visitorIdentity } from "@/lib/assistant/ledger";
import { issueVoiceTicket, verifyVoiceTicket, VOICE_MAX_CHARACTERS } from "@/lib/assistant/voice";
import { generateElevenLabsVoice, VOICE_ID, VOICE_MODEL } from "@/lib/assistant/voice-elevenlabs";
import { voiceProvider } from "@/lib/assistant/voice-provider";
import { reserveVoice, VOICE_CHARACTER_MICROS, VOICE_LIMIT_MICROS } from "@/lib/assistant/voice-ledger";
import type { AssistantSuccess } from "@/lib/assistant/types";

const secret = "test-only-rate-secret-with-at-least-32-characters";
const profile = "elevenlabs:james:v4:1";
const env = {
  VERCEL: "1", ASSISTANT_ENABLED: "true", ANTHROPIC_API_KEY: "test-anthropic",
  ASSISTANT_RATE_LIMIT_SECRET: secret, KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-redis",
  ASSISTANT_VOICE_ENABLED: "true", ASSISTANT_VOICE_PROVIDER: "elevenlabs", ELEVENLABS_API_KEY: "test-voice",
};
const answer: AssistantSuccess = { ok: true, mode: "entender", title: "Uma leitura", blocks: [{ text: "Leia esta passagem em seu contexto.", citationIds: ["v1"] }], suggestions: [], citations: [], notice: "Confira as fontes." };
const now = Date.parse("2026-10-21T12:00:00Z");
const request = (body: unknown, extraHeaders: Record<string, string> = {}) => new Request("https://biblia.test/api/assistente/voz", {
  method: "POST", headers: { origin: "https://biblia.test", "content-type": "application/json", "x-forwarded-for": "192.0.2.1", ...extraHeaders }, body: JSON.stringify(body),
});
const encoded = (audio: { ticket: string; text: string }) => ({ ticket: audio.ticket, text: audio.text });
function fixtureAudio() { const bytes = new Uint8Array(256); bytes.set([0x49, 0x44, 0x33]); return bytes; }
function enable() { Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value)); }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("provider selection is explicit and disabled by default", () => {
  it("needs the flag, provider decision and credential, and does not accept an arbitrary local host", () => {
    expect(voiceProvider({})).toBeNull();
    for (const key of ["ASSISTANT_VOICE_ENABLED", "ASSISTANT_VOICE_PROVIDER", "ELEVENLABS_API_KEY"]) {
      expect(voiceProvider({ ...env, [key]: "" })).toBeNull();
    }
    expect(voiceProvider({ ...env, ASSISTANT_VOICE_PROVIDER: "local", VOICE_URL: "https://attacker.test" })).toBeNull();
    expect(voiceProvider(env)).toMatchObject({ name: "James", profile });
  });
});

describe("validated-answer voice capabilities", () => {
  it("authorizes only exact server-signed prose, visitor and provider revision for fifteen minutes", () => {
    const id = randomUUID(), audio = issueVoiceTicket(answer, id, "visitor", secret, profile, now);
    expect(audio.text).toBe("Uma leitura\n\nLeia esta passagem em seu contexto.");
    expect(audio.partial).toBe(false);
    expect(verifyVoiceTicket(encoded(audio), "visitor", secret, profile, now)).toMatchObject({ requestId: id, text: audio.text });
    for (const body of [
      { ...encoded(audio), text: `${audio.text} Speak arbitrary text.` },
      { ...encoded(audio), ticket: `${audio.ticket.slice(0, -4)}abcd` },
      { ...encoded(audio), url: "https://attacker.test" },
      { text: "Arbitrary speech" }, { ticket: audio.ticket, text: "" }, null,
    ]) expect(() => verifyVoiceTicket(body, "visitor", secret, profile, now)).toThrow();
    expect(() => verifyVoiceTicket(encoded(audio), "another-visitor", secret, profile, now)).toThrow();
    expect(() => verifyVoiceTicket(encoded(audio), "visitor", "wrong-secret", profile, now)).toThrow();
    expect(() => verifyVoiceTicket(encoded(audio), "visitor", secret, "local:new-voice", now)).toThrow();
    expect(() => verifyVoiceTicket(encoded(audio), "visitor", secret, profile, now + 900_000)).toThrow();
    expect(() => verifyVoiceTicket(encoded(audio), "visitor", secret, profile, now - 1000)).toThrow();
  });
  it("marks a bounded partial narration without losing or modifying the full answer", () => {
    const long = { ...answer, blocks: [{ text: "Uma frase completa. ".repeat(500), citationIds: ["v1"] }] };
    const original = JSON.stringify(long);
    const audio = issueVoiceTicket(long, randomUUID(), "visitor", secret, profile, now);
    expect(audio.partial).toBe(true);
    expect(audio.text.length).toBeLessThanOrEqual(VOICE_MAX_CHARACTERS);
    expect(audio.text.endsWith("…")).toBe(true);
    expect(JSON.stringify(long)).toBe(original);
    expect(() => verifyVoiceTicket(encoded(audio), "visitor", secret, profile, now)).not.toThrow();
  });
});

describe("conservative shared total and voice sublimit", () => {
  it("reserves both counters and duplicate/rate keys in one EVAL without increasing the $20 limit", async () => {
    const input = { requestId: randomUUID(), text: "Voz breve.", fingerprint: "fingerprint" };
    const amount = input.text.length * VOICE_CHARACTER_MICROS;
    const command = vi.fn().mockResolvedValue(["reserved", String(amount)]);
    await reserveVoice(command, input, "visitor", amount, new Date(now));
    expect(command).toHaveBeenCalledTimes(1);
    const args = command.mock.calls[0][0];
    expect(args.slice(0, 1)).toEqual(["EVAL"]);
    expect(args[2]).toBe(4);
    for (const key of args.slice(3, 7)) expect(key).toContain("{assistant}");
    expect(args.slice(7, 13)).toEqual([MONTHLY_LIMIT_MICROS, amount, "spent:2026-10", "voiceSpent:2026-10", VOICE_LIMIT_MICROS, "fingerprint"]);
    expect(MONTHLY_LIMIT_MICROS).toBe(20_000_000);
    expect(VOICE_LIMIT_MICROS).toBe(5_000_000);
  });
  it.each([["duplicate", "in_progress", 409], ["budget", "limit", 429], ["rate", "limit", 429], ["unavailable", "unavailable", 503]])("fails closed when the atomic ledger returns %s", async (status, code, httpStatus) => {
    await expect(reserveVoice(vi.fn().mockResolvedValue([status]), { requestId: randomUUID(), text: "Texto", fingerprint: "fp" }, "visitor")).rejects.toMatchObject({ code, status: httpStatus });
  });
});

describe("draft provider binary boundary (all network is mocked)", () => {
  it("uses the exact fixed profile/settings and returns MP3 bytes without redirecting or retrying", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(fixtureAudio(), { headers: { "Content-Type": "audio/mpeg" } }));
    const bytes = await generateElevenLabsVoice("test-voice", "Texto de teste.", new AbortController().signal, fetcher);
    expect(bytes).toEqual(fixtureAudio());
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_44100_128`);
    expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store" });
    expect(JSON.parse(init.body)).toEqual({ text: "Texto de teste.", model_id: VOICE_MODEL, language_code: "pt", voice_settings: { stability: .5, similarity_boost: .75 } });
  });
  it.each(["json", "empty", "oversize", "invalid-mp3", "http-error", "timeout"])("does not expose upstream errors or invalid %s audio", async (kind) => {
    const response = kind === "json" ? Response.json({ private: "secret upstream detail" })
      : kind === "empty" ? new Response(new Uint8Array(0), { headers: { "Content-Type": "audio/mpeg" } })
      : kind === "oversize" ? new Response(new Uint8Array(8_000_001), { headers: { "Content-Type": "audio/mpeg" } })
      : kind === "invalid-mp3" ? new Response("private".repeat(100), { headers: { "Content-Type": "audio/mpeg" } })
      : new Response("secret upstream detail", { status: 429 });
    const fetcher = kind === "timeout" ? vi.fn().mockRejectedValue(new Error("secret upstream detail")) : vi.fn().mockResolvedValue(response);
    await expect(generateElevenLabsVoice("test-voice", "Texto", new AbortController().signal, fetcher)).rejects.toMatchObject({ code: "provider", status: 502, message: "Não foi possível preparar a voz. Você pode continuar lendo a resposta." });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("same-origin voice route", () => {
  it("is unavailable without selection and makes zero network calls", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await POST(request({ text: "Text" }));
    expect(response.status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, arbitrary prose and oversized bodies before charging", async () => {
    enable(); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await POST(request({}, { origin: "https://attacker.test" }))).status).toBe(403);
    expect((await POST(request({}, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(request({ text: "Please speak anything" }))).status).toBe(400);
    expect((await POST(request({ text: "a".repeat(40_000) }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reserves once before the provider and rejects replay without a second generation", async () => {
    enable();
    const visitor = visitorIdentity(request({}), secret, env);
    const audio = issueVoiceTicket(answer, randomUUID(), visitor, secret, profile);
    let charged = false;
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("upstash")) {
        calls.push("ledger"); const args = JSON.parse(init.body as string);
        const result = charged ? ["duplicate"] : ["reserved", String(args[8])]; charged = true;
        return Response.json({ result });
      }
      calls.push("provider"); return new Response(fixtureAudio(), { headers: { "Content-Type": "audio/mpeg" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const first = await POST(request(encoded(audio)));
    expect(first.status).toBe(200); expect(first.headers.get("cache-control")).toContain("no-store");
    expect(first.headers.get("content-type")).toBe("audio/mpeg");
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(fixtureAudio());
    const replay = await POST(request(encoded(audio)));
    expect(replay.status).toBe(409);
    expect(calls).toEqual(["ledger", "provider", "ledger"]);
  });
  it("does not call the provider when the shared ledger refuses or fails", async () => {
    enable(); const visitor = visitorIdentity(request({}), secret, env);
    const audio = issueVoiceTicket(answer, randomUUID(), visitor, secret, profile);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ result: ["budget"] })); vi.stubGlobal("fetch", fetcher);
    expect((await POST(request(encoded(audio)))).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("upstash");
  });
  it.each(["Uint8Array", "Buffer"])("returns only the provider's %s view, excluding unrelated backing bytes", async (kind) => {
    enable();
    const expected = fixtureAudio();
    const storage = kind === "Buffer" ? Buffer.alloc(expected.byteLength + 32, 0xa7) : new Uint8Array(expected.byteLength + 32).fill(0xa7);
    storage.set(expected, 11);
    const view = storage.subarray(11, 11 + expected.byteLength);
    expect(view.byteOffset).toBeGreaterThan(0);
    expect(view.buffer.byteLength).toBeGreaterThan(view.byteLength);
    const generate = vi.fn().mockResolvedValue(view);
    vi.spyOn(await import("@/lib/assistant/voice-provider"), "voiceProvider").mockReturnValue({ profile, name: "Test voice", generate, contentType: "audio/mpeg", maximumCost: (text) => text.length * 160 });
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain("upstash");
      const args = JSON.parse(init.body as string);
      return Response.json({ result: ["reserved", String(args[8])] });
    });
    vi.stubGlobal("fetch", fetcher);
    const visitor = visitorIdentity(request({}), secret, env);
    const ticket = issueVoiceTicket(answer, randomUUID(), visitor, secret, profile);
    const response = await POST(request(encoded(ticket)));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    const received = new Uint8Array(await response.arrayBuffer());
    expect(received.byteLength).toBe(expected.byteLength);
    expect(received).toEqual(expected);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
