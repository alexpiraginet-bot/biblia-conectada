import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyVoice } from "@/components/assistant/study-voice";
import type { AssistantAudio } from "@/lib/assistant/types";

const descriptor: AssistantAudio = { ticket: "signed", text: "Texto validado.", partial: false, expiresAt: 9999999999 };
const players: StudyVoice[] = [];
function setup(contextRuns = true) {
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  const audios: FakeAudio[] = [];
  class FakeAudio {
    src = ""; preload = ""; onended = null; onerror = null;
    play = vi.fn().mockResolvedValue(undefined); pause = vi.fn(); load = vi.fn(); removeAttribute = vi.fn();
    constructor() { audios.push(this); }
  }
  class FakeContext {
    state = "suspended"; destination = {};
    resume = vi.fn(async () => { if (contextRuns) this.state = "running"; });
    decodeAudioData = vi.fn(async () => ({})); close = vi.fn(async () => {});
    createBufferSource() { const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; sources.push(source); return source; }
  }
  vi.stubGlobal("window", { setTimeout, clearTimeout }); vi.stubGlobal("Audio", FakeAudio); vi.stubGlobal("AudioContext", FakeContext);
  const audioSession = { type: "auto" }; vi.stubGlobal("navigator", { audioSession });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const fetcher = vi.fn().mockImplementation(async () => new Response(new Uint8Array(128), { headers: { "Content-Type": "audio/wav" } })); vi.stubGlobal("fetch", fetcher);
  const player = new StudyVoice(); players.push(player);
  return { player, fetcher, sources, audios, audioSession };
}
afterEach(() => { players.splice(0).forEach((player) => player.dispose()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("per-conversation AI audio player", () => {
  it("arms on send, narrates after text and replays without a second paid request", async () => {
    const test = setup(); test.player.prepare("r1");
    expect(test.player.snapshot().status).toBe("waiting"); expect(test.audioSession.type).toBe("playback");
    expect(test.fetcher).not.toHaveBeenCalled();
    test.player.receive("r1", descriptor);
    expect(test.player.snapshot().status).toBe("generating");
    await vi.waitFor(() => expect(test.player.snapshot().status).toBe("playing"));
    expect(test.sources[0].start).toHaveBeenCalledTimes(1);
    test.sources[0].onended?.(); expect(test.player.snapshot().status).toBe("ready"); expect(test.audioSession.type).toBe("auto");
    test.player.replay(); await vi.waitFor(() => expect(test.sources).toHaveLength(2));
    expect(test.fetcher).toHaveBeenCalledTimes(1);
    test.player.dispose(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
  it("keeps a ready clip when autoplay is blocked; the explicit next gesture retries only playback", async () => {
    const test = setup(false); test.player.prepare("r1"); test.audios[0].play.mockRejectedValueOnce(new Error("NotAllowedError"));
    test.player.receive("r1", { ...descriptor, partial: true });
    await vi.waitFor(() => expect(test.player.snapshot().status).toBe("blocked"));
    expect(test.player.snapshot().partial).toBe(true);
    test.player.replay(); await vi.waitFor(() => expect(test.player.snapshot().status).toBe("playing"));
    expect(test.fetcher).toHaveBeenCalledTimes(1); expect(test.audios[0].play).toHaveBeenCalledTimes(2);
  });
  it("aborts generation and ignores a late result when stopped, closed or replaced", async () => {
    const test = setup(); let finish!: (value: Response) => void;
    test.fetcher.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    test.player.prepare("r1"); test.player.receive("r1", descriptor);
    const signal = test.fetcher.mock.calls[0][1].signal;
    test.player.stop(); expect(signal.aborted).toBe(true);
    finish(new Response(new Uint8Array(128), { headers: { "Content-Type": "audio/wav" } }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(test.player.snapshot().status).toBe("idle"); expect(test.sources).toHaveLength(0); expect(URL.createObjectURL).not.toHaveBeenCalled();
    test.player.prepare("r2"); test.player.receive("r1", descriptor); expect(test.fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps text-only usability on provider errors and never automatically requests the same ticket twice", async () => {
    const test = setup(); test.fetcher.mockResolvedValue(Response.json({ message: "A voz chegou ao limite deste mês." }, { status: 429 }));
    test.player.prepare("r1"); test.player.receive("r1", descriptor);
    await vi.waitFor(() => expect(test.player.snapshot().status).toBe("error"));
    expect(test.player.snapshot().message).toContain("limite");
    test.player.replay(descriptor); expect(test.fetcher).toHaveBeenCalledTimes(1); expect(test.player.snapshot().status).toBe("error");
  });
  it("stops only its own source, and ignores end events from an old generation", async () => {
    const first = setup(), second = new StudyVoice(); players.push(second);
    first.player.prepare("r1"); first.player.receive("r1", descriptor);
    await vi.waitFor(() => expect(first.sources).toHaveLength(1));
    const oldEnd = first.sources[0].onended;
    first.player.prepare("r2"); expect(first.sources[0].stop).toHaveBeenCalledTimes(1);
    oldEnd?.(); expect(first.player.snapshot().status).toBe("waiting");
    second.stop(); expect(first.player.snapshot().status).toBe("waiting");
  });
});
