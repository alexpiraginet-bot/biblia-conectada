import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
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
