import type { AssistantAudio } from "@/lib/assistant/types";

export type StudyVoiceState = {
  status: "idle" | "waiting" | "generating" | "playing" | "ready" | "blocked" | "error";
  message: string; partial: boolean;
};
const IDLE: StudyVoiceState = { status: "idle", message: "Voz gerada por IA", partial: false };
type AudioSession = { type: string };
type Clip = { data: ArrayBuffer; url: string; partial: boolean };

/** A conversation owns its player. No speechSynthesis and no persistent audio cache. */
export class StudyVoice {
  private state = IDLE;
  private listeners = new Set<() => void>();
  private generation = 0;
  private requestId: string | null = null;
  private fetcher: AbortController | null = null;
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audio: HTMLAudioElement | null = null;
  private clips = new Map<string, Clip>();
  private attempted = new Set<string>();
  private lastTicket: string | null = null;
  private session: { value: AudioSession; previous: string } | null = null;

  snapshot = () => this.state;
  serverSnapshot = () => IDLE;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: StudyVoiceState) { this.state = next; this.listeners.forEach((listener) => listener()); }

  private arm() {
    if (typeof window === "undefined") return;
    try {
      const value = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
      if (value && !this.session) { this.session = { value, previous: value.type }; value.type = "playback"; }
    } catch { /* AudioSession is optional; it cannot override volume or all iOS policies. */ }
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") void this.context.resume().catch(() => {});
    } catch { /* HTMLAudio is the fallback, still subject to browser gesture policies. */ }
    this.audio ??= new Audio();
    this.audio.preload = "auto";
  }

  /** Must run synchronously in the original send gesture, before the text request awaits. */
  prepare = (requestId: string) => {
    this.stop(); this.requestId = requestId; this.arm();
    this.publish({ status: "waiting", message: "A voz começa quando a resposta estiver pronta.", partial: false });
  };

  receive = (requestId: string, descriptor?: AssistantAudio) => {
    if (requestId !== this.requestId) return;
    if (!descriptor) { this.stop(); return; }
    this.lastTicket = descriptor.ticket;
    void this.load(descriptor);
  };

  private async load(descriptor: AssistantAudio) {
    const sequence = this.generation, cached = this.clips.get(descriptor.ticket);
    if (cached) { void this.play(cached, sequence); return; }
    if (this.attempted.has(descriptor.ticket)) {
      this.publish({ status: "error", message: "Este áudio já foi solicitado. Continue pelo texto.", partial: descriptor.partial }); return;
    }
    this.attempted.add(descriptor.ticket);
    const abort = new AbortController(); this.fetcher = abort;
    const timeout = window.setTimeout(() => abort.abort(), 60_000);
    this.publish({ status: "generating", message: "Preparando voz…", partial: descriptor.partial });
    try {
      const response = await fetch("/api/assistente/voz", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: abort.signal,
        body: JSON.stringify({ ticket: descriptor.ticket, text: descriptor.text }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(typeof error?.message === "string" && error.message.length < 300 ? error.message : "A voz não está disponível agora. Continue pelo texto.");
      }
      const type = response.headers.get("content-type")?.split(";")[0];
      if (type !== "audio/wav" && type !== "audio/mpeg") throw new Error("O áudio não pôde ser preparado. Continue pelo texto.");
      const data = await response.arrayBuffer();
      if (data.byteLength < 44 || data.byteLength > 4_000_044) throw new Error("O áudio não pôde ser preparado. Continue pelo texto.");
      if (sequence !== this.generation || abort.signal.aborted) return;
      const clip: Clip = { data, url: URL.createObjectURL(new Blob([data], { type })), partial: descriptor.partial };
      this.clips.set(descriptor.ticket, clip);
      while (this.clips.size > 3) { const oldest = this.clips.keys().next().value!; URL.revokeObjectURL(this.clips.get(oldest)!.url); this.clips.delete(oldest); }
      await this.play(clip, sequence);
    } catch (error) {
      if (sequence !== this.generation) return;
      this.restoreSession();
      this.publish({ status: "error", message: error instanceof Error && error.name !== "AbortError" ? error.message : "A preparação da voz foi interrompida. Continue pelo texto.", partial: descriptor.partial });
    } finally { window.clearTimeout(timeout); if (this.fetcher === abort) this.fetcher = null; }
  }

  private async play(clip: Clip, sequence: number) {
    const ended = () => {
      if (sequence !== this.generation) return;
      this.source = null; this.restoreSession();
      this.publish({ status: "ready", message: "Áudio concluído · Voz gerada por IA", partial: clip.partial });
    };
    try {
      if (this.context?.state === "running") {
        const decoded = await this.context.decodeAudioData(clip.data.slice(0));
        if (sequence !== this.generation) return;
        const source = this.context.createBufferSource(); source.buffer = decoded;
        source.connect(this.context.destination); source.onended = ended; this.source = source; source.start();
      } else {
        this.audio ??= new Audio(); this.audio.src = clip.url; this.audio.onended = ended;
        this.audio.onerror = () => { if (sequence === this.generation) { this.restoreSession(); this.publish({ status: "error", message: "Não foi possível tocar o áudio. O texto continua disponível.", partial: clip.partial }); } };
        await this.audio.play();
        if (sequence !== this.generation) return;
      }
      this.publish({ status: "playing", message: "Ouvindo · Voz gerada por IA", partial: clip.partial });
    } catch {
      if (sequence !== this.generation) return;
      this.restoreSession();
      this.publish({ status: "blocked", message: "O áudio está pronto. Toque em Ouvir resposta para começar.", partial: clip.partial });
    }
  }

  /** Explicit second gesture for blocked autoplay, or replay from the in-memory clip. */
  replay = (descriptor?: AssistantAudio) => {
    const ticket = descriptor?.ticket ?? this.lastTicket;
    if (!ticket) return;
    this.stop(); this.arm(); this.lastTicket = ticket;
    const clip = this.clips.get(ticket);
    if (clip) void this.play(clip, this.generation);
    else if (descriptor) void this.load(descriptor);
  };

  private restoreSession() {
    if (!this.session) return;
    try { this.session.value.type = this.session.previous; } catch { /* Unsupported transition. */ }
    this.session = null;
  }
  stop = () => {
    this.generation++; this.requestId = null; this.fetcher?.abort(); this.fetcher = null;
    if (this.source) { this.source.onended = null; try { this.source.stop(); } catch { /* Already stopped. */ } this.source = null; }
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); this.audio.removeAttribute("src"); this.audio.load(); }
    this.restoreSession(); this.publish(IDLE);
  };
  dispose = () => {
    this.stop(); for (const clip of this.clips.values()) URL.revokeObjectURL(clip.url);
    this.clips.clear(); this.attempted.clear(); this.lastTicket = null;
    void this.context?.close().catch(() => {}); this.context = null; this.audio = null;
  };
}
