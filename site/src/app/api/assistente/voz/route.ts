import { assistantConfig } from "@/lib/assistant/config";
import { AssistantFault, readBoundedJson } from "@/lib/assistant/input";
import { redisCommand, visitorIdentity } from "@/lib/assistant/ledger";
import { verifyVoiceTicket, VOICE_UNAVAILABLE } from "@/lib/assistant/voice";
import { voiceProvider } from "@/lib/assistant/voice-provider";
import { reserveVoice } from "@/lib/assistant/voice-ledger";

export const maxDuration = 60;
const HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  try {
    const config = assistantConfig(), voice = voiceProvider();
    if (!config || !voice) throw new AssistantFault("unavailable", 503, VOICE_UNAVAILABLE);
    if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new AssistantFault("invalid", 403, "Abra o companheiro de estudo no Bíblia Conectada para continuar.");
    }
    const visitor = visitorIdentity(request, config.rateSecret);
    const input = verifyVoiceTicket(await readBoundedJson(request, 32_768), visitor, config.rateSecret, voice.profile);
    request.signal.throwIfAborted();
    await reserveVoice(redisCommand(config), input, visitor, voice.maximumCost(input.text));
    // Once reserved, even an abort retains the conservative charge: delivery may have started.
    request.signal.throwIfAborted();
    const audio = await voice.generate(input.text, request.signal);
    // Copy only the view: providers may return a Buffer or a sliced Uint8Array.
    return new Response(new Uint8Array(audio).buffer, { headers: { ...HEADERS, "Content-Type": voice.contentType } });
  } catch (error) {
    const fault = error instanceof AssistantFault ? error : new AssistantFault("provider", 502, VOICE_UNAVAILABLE);
    return Response.json({ ok: false, code: fault.code, message: fault.message }, { status: fault.status, headers: HEADERS });
  }
}
