import { connection } from "next/server";
import { assistantConfig, UNAVAILABLE_MESSAGE } from "@/lib/assistant/config";
import { ledgerReady, redisCommand } from "@/lib/assistant/ledger";
import { handleStudy } from "@/lib/assistant/service";
import { voiceProvider } from "@/lib/assistant/voice-provider";

export const maxDuration = 60;
const HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  await connection();
  const config = assistantConfig();
  const available = !!config && process.env.VERCEL === "1" && await ledgerReady(redisCommand(config));
  const voice = available ? voiceProvider() : null;
  return Response.json({
    available,
    message: available ? "Escolha uma passagem e comece a explorar." : UNAVAILABLE_MESSAGE,
    voice: { available: !!voice, ...(voice ? { name: voice.name } : {}) },
  }, { headers: HEADERS });
}

export async function POST(request: Request) {
  const { body, status } = await handleStudy(request);
  return Response.json(body, {
    status,
    headers: {
      ...HEADERS,
      ...(!body.ok && body.retryAfterSeconds ? { "Retry-After": String(body.retryAfterSeconds) } : {}),
    },
  });
}
