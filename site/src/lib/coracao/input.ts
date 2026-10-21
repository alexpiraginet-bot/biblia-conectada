import { AssistantFault, isRecord } from "@/lib/assistant/input";
import type { AssistantHistoryTurn } from "@/lib/assistant/types";
import type { CoracaoInput } from "./types";

export const CORACAO_MAX_BODY_BYTES = 16_384;
function invalid(): never {
  throw new AssistantFault("invalid", 400, "Conte o que está procurando em uma pergunta de 3 a 800 caracteres.");
}
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}
export function parseCoracaoRequest(value: unknown): CoracaoInput {
  if (!isRecord(value) || !keys(value, ["requestId", "question", "mode", "translation", "history"]) ||
    typeof value.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId) ||
    !text(value.question, 3, 800) ||
    (value.mode !== undefined && value.mode !== "encontrar" && value.mode !== "jesus") ||
    (value.translation !== undefined && value.translation !== "blivre" && value.translation !== "open-nbv")) return invalid();
  let history: AssistantHistoryTurn[] = [];
  if (value.history !== undefined) {
    if (!Array.isArray(value.history) || value.history.length > 2) return invalid();
    history = value.history.map((turn) => {
      if (!isRecord(turn) || !keys(turn, ["question", "answer"]) || !text(turn.question, 3, 800) || !text(turn.answer, 1, 2000)) return invalid();
      return { question: turn.question.trim(), answer: turn.answer.trim() };
    });
  }
  return {
    requestId: value.requestId.toLowerCase(), question: value.question.trim(),
    mode: value.mode ?? "encontrar", translation: value.translation ?? "open-nbv",
    ...(history.length ? { history } : {}),
  };
}
