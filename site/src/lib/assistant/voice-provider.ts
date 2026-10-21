import "server-only";
import { generateElevenLabsVoice } from "./voice-elevenlabs";
import { generateOpenAIVoice, maximumOpenAIVoiceCost, OPENAI_VOICE_MODEL } from "./voice-openai";

export type VoiceProvider = {
  /** Bind tickets to a specific provider/model/voice revision, not a mutable display name. */
  profile: string;
  name: string;
  contentType: "audio/mpeg" | "audio/wav";
  maximumCost: (text: string) => number;
  generate: (text: string, signal: AbortSignal) => Promise<Uint8Array>;
};

/** No default provider. Local hosting and the final voice are still an explicit deployment decision.
 * This draft adapter is available for evaluation only; no browser-supplied host or voice is accepted.
 */
export function voiceProvider(env: Readonly<Record<string, string | undefined>> = process.env): VoiceProvider | null {
  if (env.ASSISTANT_VOICE_ENABLED !== "true") return null;
  if (env.ASSISTANT_VOICE_PROVIDER === "openai") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;
    return { profile: `openai:${OPENAI_VOICE_MODEL}:cedar:1`, name: "Cedar", contentType: "audio/wav", maximumCost: maximumOpenAIVoiceCost, generate: (text, signal) => generateOpenAIVoice(apiKey, text, signal) };
  }
  if (env.ASSISTANT_VOICE_PROVIDER !== "elevenlabs") return null;
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  return { profile: "elevenlabs:james:v4:1", name: "James", contentType: "audio/mpeg", maximumCost: (text) => text.length * 160, generate: (text, signal) => generateElevenLabsVoice(apiKey, text, signal) };
}
