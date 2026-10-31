import { JOURNEY_AREAS } from "./rules";
import type { JourneyAction, JourneyArea } from "./types";

export class JourneyFault extends Error {
  constructor(public code: "unavailable" | "invalid" | "limit" | "expired", public status: number, message: string, public retryAfterSeconds?: number) {
    super(message);
  }
}
export const JOURNEY_UNAVAILABLE = "A jornada está temporariamente indisponível. Suas leituras continuam abertas; nenhum ponto novo foi confirmado.";
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export function parseJourneyAction(value: unknown): JourneyAction {
  const invalid = () => new JourneyFault("invalid", 400, "Não foi possível reconhecer esta ação. Abra a jornada e tente novamente.");
  if (!isRecord(value)) throw invalid();
  if ((value.op === "start" || value.op === "reset") && Object.keys(value).length === 1) return { op: value.op };
  if (value.op !== "pulse" || Object.keys(value).sort().join(",") !== "active,area,op,token"
    || typeof value.token !== "string" || !/^[a-f0-9]{32}$/.test(value.token)
    || typeof value.area !== "string" || !JOURNEY_AREAS.includes(value.area as JourneyArea)
    || typeof value.active !== "boolean") throw invalid();
  return { op: "pulse", token: value.token, area: value.area as JourneyArea, active: value.active };
}

export async function readJourneyAction(request: Request): Promise<JourneyAction> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new JourneyFault("invalid", 415, "Use o botão da jornada para continuar.");
  }
  if (Number(request.headers.get("content-length")) > 1024) throw new JourneyFault("invalid", 413, "A ação enviada é grande demais.");
  const reader = request.body?.getReader();
  if (!reader) throw new JourneyFault("invalid", 400, "A ação está vazia.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 1024) throw new JourneyFault("invalid", 413, "A ação enviada é grande demais.");
      body += decoder.decode(next.value, { stream: true });
    }
    body += decoder.decode();
    try { return parseJourneyAction(JSON.parse(body)); }
    catch (error) {
      if (error instanceof JourneyFault) throw error;
      throw new JourneyFault("invalid", 400, "A ação não está em um formato válido.");
    }
  } finally { await reader.cancel().catch(() => {}); }
}

export function requireJourneyOrigin(request: Request): void {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new JourneyFault("invalid", 403, "Abra a jornada no Bíblia Conectada para continuar.");
  }
}
