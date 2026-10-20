import type { AssistantHistoryTurn, AssistantRequest, AssistantStyle } from "./types";

export const MAX_BODY_BYTES = 8192;
export class AssistantFault extends Error {
  constructor(
    public readonly code: "unavailable" | "limit" | "invalid" | "provider" | "in_progress",
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) { super(message); }
}
export function invalid(): never {
  throw new AssistantFault("invalid", 400, "Escolha uma passagem válida e escreva uma pergunta com até 800 caracteres.");
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
function boundedText(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}
export function parseAssistantRequest(value: unknown): AssistantRequest & { style: AssistantStyle } {
  if (!isRecord(value) || !onlyKeys(value, ["requestId", "mode", "style", "question", "passage", "history"])) return invalid();
  if (typeof value.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) return invalid();
  if (typeof value.mode !== "string" || !["entender", "explorar", "narrar"].includes(value.mode)) return invalid();
  if (value.style !== undefined && (typeof value.style !== "string" ||
    !["simples", "contexto", "cotidiano"].includes(value.style))) return invalid();
  if (!boundedText(value.question, 3, 800)) return invalid();
  let history: AssistantHistoryTurn[] = [];
  if (value.history !== undefined) {
    if (!Array.isArray(value.history) || value.history.length > 2) return invalid();
    history = value.history.map((turn) => {
      if (!isRecord(turn) || !onlyKeys(turn, ["question", "answer"]) ||
        !boundedText(turn.question, 3, 800) || !boundedText(turn.answer, 1, 2000)) return invalid();
      return { question: turn.question.trim(), answer: turn.answer.trim() };
    });
  }
  const p = value.passage;
  if (!isRecord(p) || !onlyKeys(p, ["book", "chapter", "verse"]) || typeof p.book !== "string" ||
    !/^[a-z0-9-]{2,30}$/.test(p.book) || !Number.isSafeInteger(p.chapter) ||
    (p.chapter as number) < 1 || (p.chapter as number) > 150 ||
    (p.verse !== undefined && (!Number.isSafeInteger(p.verse) || (p.verse as number) < 1 || (p.verse as number) > 176))) return invalid();
  return {
    requestId: value.requestId.toLowerCase(),
    mode: value.mode as AssistantRequest["mode"],
    style: (value.style ?? "contexto") as AssistantStyle,
    question: value.question.trim(),
    passage: { book: p.book, chapter: p.chapter as number, ...(p.verse === undefined ? {} : { verse: p.verse as number }) },
    // Empty history keeps the same fingerprint as older clients that omit it.
    ...(history.length ? { history } : {}),
  };
}

/** Content-Length is not trusted: stop reading a chunked request at the same bound. */
export async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) invalid();
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) invalid();
  if (!request.body) invalid();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); invalid(); }
      chunks.push(value);
    }
    const all = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) { all.set(chunk, at); at += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all));
  } catch { return invalid(); }
  finally { reader.releaseLock(); }
}
