import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateOpenAIVoice, maximumOpenAIVoiceCost, OPENAI_VOICE_MODEL, pcmWave, VOICE_OUTPUT_TOKENS, VOICE_SAMPLE_RATE, VOICE_SECONDS, VOICE_TIMEOUT_MS, voiceTranscriptMatches, type VoiceSocketFactory } from "@/lib/assistant/voice-openai";
import { voiceProvider } from "@/lib/assistant/voice-provider";
import { VOICE_MAX_CHARACTERS } from "@/lib/assistant/voice";

class Socket extends EventEmitter {
  readyState = 1;
  send = vi.fn(); terminate = vi.fn(() => { this.readyState = 3; });
  event(value: unknown) { this.emit("message", Buffer.from(JSON.stringify(value))); }
}
function setup(text = "Uma palavra de esperança.") {
  const socket = new Socket(), signal = new AbortController();
  const factory = vi.fn(() => socket) as unknown as VoiceSocketFactory;
  const pending = generateOpenAIVoice("test-key", text, signal.signal, factory);
  const begin = () => {
    socket.event({ type: "session.created" }); socket.event({ type: "session.updated" });
    socket.event({ type: "response.created", response: { id: "r1" } });
  };
  const finish = (transcript = text, status = "completed", usage = { input_tokens: 100, output_tokens: 20 }) => {
    socket.event({ type: "response.output_audio.delta", response_id: "r1", delta: Buffer.alloc(4800, 1).toString("base64") });
    socket.event({ type: "response.output_audio_transcript.done", response_id: "r1", transcript });
    socket.event({ type: "response.done", response: { id: "r1", status, usage } });
  };
  return { socket, signal, factory, pending, begin, finish };
}
beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("OpenAI profile and maximum cost", () => {
  it("selects the explicit profile with the standard server credential, never a client-selected host", () => {
    const base = { ASSISTANT_VOICE_ENABLED: "true", ASSISTANT_VOICE_PROVIDER: "openai" };
    expect(voiceProvider(base)).toBeNull();
    expect(voiceProvider({ ...base, OPENAI_API_KEY: "test" })).toMatchObject({ name: "Cedar", contentType: "audio/wav", profile: `openai:${OPENAI_VOICE_MODEL}:cedar:1` });
    expect(voiceProvider({ ...base, OPENAI_API_KEY: "test", ASSISTANT_VOICE_ENABLED: "false" })).toBeNull();
    expect(maximumOpenAIVoiceCost("Esperança.")).toBeGreaterThan(4096 * 20);
    expect(maximumOpenAIVoiceCost("漢".repeat(VOICE_MAX_CHARACTERS))).toBeLessThan(90_000);
  });
  it("normalizes punctuation/accents only and refuses missing, added or reordered words", () => {
    expect(voiceTranscriptMatches("Olá, João!", "Ola João.")).toBe(true);
    for (const text of ["João olá", "Olá", "Olá, João! Entenda assim.", "Olá, Pedro!"]) expect(voiceTranscriptMatches("Olá, João!", text)).toBe(false);
  });
});

describe("one-shot Realtime audio (mock socket, no API calls)", () => {
  it("waits for session acknowledgment, caps tokens and returns only faithful complete PCM in a valid WAV", async () => {
    const test = setup();
    expect(test.socket.send).not.toHaveBeenCalled();
    test.begin(); test.finish();
    const wave = await test.pending;
    const [url, config] = vi.mocked(test.factory).mock.calls[0];
    expect(url).toBe(`wss://api.openai.com/v1/realtime?model=${OPENAI_VOICE_MODEL}`);
    expect(config).toMatchObject({ headers: { Authorization: "Bearer test-key" }, followRedirects: false, handshakeTimeout: 10000 });
    const sent = test.socket.send.mock.calls.map(([body]) => JSON.parse(body));
    expect(sent).toHaveLength(2);
    expect(sent[0].session).toMatchObject({ type: "realtime", output_modalities: ["audio"], max_output_tokens: VOICE_OUTPUT_TOKENS, tools: [], tool_choice: "none", audio: { input: { turn_detection: null }, output: { voice: "cedar", format: { type: "audio/pcm", rate: 24000 } } } });
    expect(sent[1].response).toMatchObject({ conversation: "none", max_output_tokens: VOICE_OUTPUT_TOKENS, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "Uma palavra de esperança." }] }] });
    expect(Buffer.from(wave.subarray(0, 4)).toString()).toBe("RIFF");
    expect(new DataView(wave.buffer).getUint32(24, true)).toBe(VOICE_SAMPLE_RATE);
    expect(new DataView(wave.buffer).getUint32(40, true)).toBe(4800);
    expect(wave.length).toBe(4844);
    expect(test.socket.terminate).toHaveBeenCalledTimes(1);
  });
  it.each(["Uma explicação diferente.", "Uma palavra."])("refuses changed or incomplete narration: %s", async (text) => {
    const test = setup(); test.begin(); test.finish(text);
    await expect(test.pending).rejects.toMatchObject({ code: "provider" });
    expect(test.socket.terminate).toHaveBeenCalledTimes(1);
  });
  it.each(["incomplete", "failed", "cancelled"])("does not present %s response as complete audio", async (status) => {
    const test = setup(); test.begin(); test.finish(undefined, status);
    await expect(test.pending).rejects.toMatchObject({ code: "provider" });
  });
  it("cancels an in-progress response on client abort without reconnect or retry", async () => {
    const test = setup(); test.begin(); test.signal.abort();
    await expect(test.pending).rejects.toMatchObject({ code: "provider" });
    expect(test.socket.send.mock.calls.at(-1)?.[0]).toContain("response.cancel");
    expect(test.factory).toHaveBeenCalledTimes(1);
  });
  it("stops after 45 seconds even without a terminal event", async () => {
    vi.useFakeTimers(); const test = setup(); test.begin();
    const rejected = expect(test.pending).rejects.toMatchObject({ code: "provider" });
    await vi.advanceTimersByTimeAsync(VOICE_TIMEOUT_MS); await rejected;
    expect(test.socket.terminate).toHaveBeenCalledTimes(1);
  });
  it("aborts before accepting audio longer than 80 seconds", async () => {
    const test = setup(); test.begin();
    test.socket.event({ type: "response.output_audio.delta", response_id: "r1", delta: Buffer.alloc((VOICE_SECONDS + 1) * VOICE_SAMPLE_RATE * 2).toString("base64") });
    await expect(test.pending).rejects.toMatchObject({ code: "provider" });
    expect(test.socket.send.mock.calls.at(-1)?.[0]).toContain("response.cancel");
  });
  it("refuses output usage beyond the reserved token cap", async () => {
    const test = setup(); test.begin(); test.finish(undefined, "completed", { input_tokens: 100, output_tokens: 4097 });
    await expect(test.pending).rejects.toMatchObject({ code: "provider" });
  });
  it("rejects malformed messages, close, errors and wrong response ids without leaking upstream details", async () => {
    for (const event of ["close", "error", "badJSON", "wrongID"]) {
      const test = setup(); test.begin();
      if (event === "close") test.socket.emit("close");
      else if (event === "error") test.socket.emit("error", new Error("SECRET upstream diagnostic"));
      else if (event === "badJSON") test.socket.emit("message", Buffer.from("broken"));
      else test.socket.event({ type: "response.output_audio.delta", response_id: "wrong", delta: "AAAA" });
      await expect(test.pending).rejects.toMatchObject({ message: expect.not.stringContaining("SECRET") });
    }
  });
  it("does not connect for an aborted caller or oversized text", async () => {
    const factory = vi.fn() as unknown as VoiceSocketFactory, abort = new AbortController(); abort.abort();
    await expect(generateOpenAIVoice("test", "Text", abort.signal, factory)).rejects.toThrow();
    await expect(generateOpenAIVoice("test", "x".repeat(VOICE_MAX_CHARACTERS + 1), new AbortController().signal, factory)).rejects.toThrow();
    expect(factory).not.toHaveBeenCalled();
    expect(() => pcmWave(new Uint8Array(3))).toThrow();
  });
});

describe("allowlisted voice failure diagnostics", () => {
  const diagnostic = () => vi.mocked(console.warn).mock.calls.at(-1)?.[1] as Record<string, unknown>;
  it("records handshake status and phase without reading or logging the response body", async () => {
    const test = setup("PRIVATE conversation text");
    const resume = vi.fn();
    test.socket.emit("unexpected-response", { headers: { Authorization: "Bearer SECRET" } }, {
      statusCode: 401, resume, body: "SECRET response body", headers: { secret: "SECRET header" },
    });
    await expect(test.pending).rejects.toMatchObject({ status: 502 });
    expect(resume).toHaveBeenCalledTimes(1);
    expect(diagnostic()).toMatchObject({ phase: "connecting", reason: "handshake_http", upstreamHttpStatus: 401, audioBytes: 0, inputCharacters: 25 });
    expect(diagnostic().trace).toMatch(/^[a-f0-9-]{36}$/);
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    for (const secret of ["SECRET", "PRIVATE", "test-key", "Authorization", "headers", "stack", "transcript:", "ticket"]) expect(logged).not.toContain(secret);
    expect(vi.mocked(console.warn)).toHaveBeenCalledTimes(1);
    test.socket.emit("error", new Error("SECRET after terminate"));
    expect(vi.mocked(console.warn)).toHaveBeenCalledTimes(1);
  });
  it("accepts only known provider error codes; never records message, stack, event or custom code", async () => {
    for (const code of ["invalid_api_key", "insufficient_quota", "unknown_parameter", "SECRET_untrusted_code"]) {
      const test = setup("PRIVATE text"); test.socket.event({ type: "session.created" });
      test.socket.event({ type: "error", error: { code, message: "SECRET payload", stack: "SECRET stack", param: "PRIVATE text" } });
      await expect(test.pending).rejects.toMatchObject({ message: expect.not.stringContaining("SECRET") });
      expect(diagnostic()).toMatchObject({ phase: "configuring", reason: "provider_event" });
      if (code.startsWith("SECRET")) expect(diagnostic()).not.toHaveProperty("upstreamCode");
      else expect(diagnostic().upstreamCode).toBe(code);
    }
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).not.toContain("SECRET"); expect(logged).not.toContain("PRIVATE"); expect(logged).not.toContain("test-key");
  });
  it.each([
    ["Incorrect API key provided: SECRET-key.", "authentication"],
    ["Your organization must be verified to use this model. SECRET organization.", "organization_verification"],
    ["You exceeded your current quota, please check billing. SECRET project.", "billing_quota"],
    ["Rate limit reached for SECRET project.", "rate_limit"],
    ["The model 'SECRET-model' does not exist or you do not have access to it.", "model_access"],
    ["You have insufficient permissions. Missing scopes: SECRET-scope.", "permissions"],
    ["Unknown parameter: SECRET-input.", "request_contract"],
    ["The server encountered an error. SECRET-request.", "provider_fault"],
  ])("classifies a connection rejection with null code without retaining its message: %s", async (message, category) => {
    const test = setup("PRIVATE question");
    test.socket.event({ type: "error", error: { type: "invalid_request_error", code: null, message } });
    await expect(test.pending).rejects.toMatchObject({ status: 502 });
    expect(test.socket.send).not.toHaveBeenCalled();
    expect(test.factory).toHaveBeenCalledTimes(1);
    expect(diagnostic()).toMatchObject({
      phase: "connecting", reason: "provider_event", upstreamType: "invalid_request_error",
      upstreamCodeState: "absent", upstreamCategory: category, upstreamClassification: "message_pattern",
    });
    expect(diagnostic()).not.toHaveProperty("upstreamCode");
    for (const secret of ["SECRET", "PRIVATE", "test-key", message]) expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(secret);
  });
  it("prioritizes explicit codes and treats unknown diagnostic fields as unknown", async () => {
    const typed = setup();
    typed.socket.event({ type: "error", error: { type: "insufficient_quota", message: "PRIVATE text contains Invalid API key" } });
    await expect(typed.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ upstreamType: "insufficient_quota", upstreamCategory: "billing_quota", upstreamClassification: "code_or_type" });
    const unknown = setup();
    unknown.socket.event({ type: "error", error: { type: "PRIVATE type", code: "SECRET code", message: { secret: "SECRET value" } } });
    await expect(unknown.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ upstreamCodeState: "unrecognized", upstreamTypeState: "unrecognized", upstreamCategory: "unclassified", upstreamClassification: "none" });
    expect(diagnostic()).not.toHaveProperty("upstreamCode"); expect(diagnostic()).not.toHaveProperty("upstreamType");
    for (const secret of ["SECRET", "PRIVATE", "test-key"]) expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(secret);
  });
  it("distinguishes timeout, caller abort and transcript mismatch with bounded numeric metadata", async () => {
    const aborted = setup(); aborted.begin(); aborted.signal.abort();
    await expect(aborted.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ phase: "receiving", reason: "caller_abort", audioBytes: 0 });
    const mismatch = setup(); mismatch.begin(); mismatch.finish("PRIVATE divergent transcript");
    await expect(mismatch.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ phase: "verifying", reason: "transcript_mismatch", audioBytes: 4800, transcriptCharacters: 28 });
    vi.useFakeTimers(); const timeout = setup(); timeout.begin();
    const rejection = expect(timeout.pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(VOICE_TIMEOUT_MS); await rejection;
    expect(diagnostic()).toMatchObject({ reason: "timeout", durationMs: VOICE_TIMEOUT_MS });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("PRIVATE");
  });
  it("allows only exact sent parameter names and extracts allowlisted errors from failed status_details", async () => {
    const invalid = setup(); invalid.socket.event({ type: "session.created" });
    invalid.socket.event({ type: "error", error: { code: "unknown_parameter", param: "session.reasoning.effort", message: "SECRET" } });
    await expect(invalid.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ upstreamCode: "unknown_parameter", upstreamParam: "session.reasoning.effort" });
    const failed = setup(); failed.begin(); failed.socket.event({ type: "response.done", response: {
      id: "r1", status: "failed", status_details: { error: { code: "insufficient_quota", param: "SECRET private parameter", message: "SECRET billing" } },
    } });
    await expect(failed.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ phase: "verifying", reason: "response_incomplete", upstreamCode: "insufficient_quota" });
    expect(diagnostic()).not.toHaveProperty("upstreamParam");
    const unsafe = setup(); unsafe.begin(); unsafe.socket.event({ type: "response.done", response: {
      id: "r1", status: "failed", status_details: { error: { code: "SECRET code", param: "session.audio.SECRET", message: "SECRET" } },
    } });
    await expect(unsafe.pending).rejects.toThrow();
    expect(diagnostic()).not.toHaveProperty("upstreamCode"); expect(diagnostic()).not.toHaveProperty("upstreamParam");
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("SECRET");
  });
  it("logs neither a success nor a raw transport error", async () => {
    const success = setup(); success.begin(); success.finish(); await success.pending;
    expect(console.warn).not.toHaveBeenCalled();
    const fail = setup(); fail.socket.emit("error", Object.assign(new Error("SECRET from socket"), { code: "ECONNRESET" }));
    await expect(fail.pending).rejects.toThrow();
    expect(diagnostic()).toMatchObject({ phase: "connecting", reason: "transport", upstreamCode: "ECONNRESET" });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("SECRET");
  });
});
