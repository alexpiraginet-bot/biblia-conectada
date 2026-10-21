import "server-only";
import { AssistantFault } from "./input";

// Draft adapter matching the previously selected video sample. Not the final project voice.
export const VOICE_ID = "EkK5I93UQWFDigLMpZcX";
export const VOICE_MODEL = "eleven_v4";

/** Bounded binary response, no SDK, retries or alternate voices. Unknown failures remain charged. */
export async function generateElevenLabsVoice(apiKey: string, text: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  const abort = AbortSignal.any([signal, AbortSignal.timeout(45_000)]);
  try {
    const response = await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_44100_128`, {
      method: "POST", headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: VOICE_MODEL, language_code: "pt", voice_settings: { stability: .5, similarity_boost: .75 } }),
      signal: abort, redirect: "error", cache: "no-store",
    });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("audio/mpeg") || !response.body) {
      await response.body?.cancel(); throw new Error("voice");
    }
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8_000_000) { await reader.cancel(); throw new Error("voice size"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (size < 128) throw new Error("voice empty");
    const bytes = new Uint8Array(size); let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
    if (!(bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) && !(bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) throw new Error("voice format");
    return bytes;
  } catch { throw new AssistantFault("provider", 502, "Não foi possível preparar a voz. Você pode continuar lendo a resposta."); }
}
