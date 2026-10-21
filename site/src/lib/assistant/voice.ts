import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { AssistantFault, isRecord } from "./input";
import type { AssistantAudio, AssistantSuccess } from "./types";

export const VOICE_MAX_CHARACTERS = 1200;
export const VOICE_TICKET_SECONDS = 900;
export const VOICE_UNAVAILABLE = "A voz está indisponível agora. A resposta continua disponível em texto.";

function digest(text: string) { return createHash("sha256").update(text).digest("hex"); }
function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update("bible-voice-v1:").update(payload).digest("base64url");
}

/** Only call after validateAnswer. Original prose is retained; a long narration ends at a word boundary. */
export function issueVoiceTicket(answer: AssistantSuccess, requestId: string, visitor: string, secret: string, profile: string, now = Date.now()): AssistantAudio {
  const complete = [answer.title, ...(answer.scenes ?? []).map((scene) => `${scene.title}. ${scene.text}`), ...answer.blocks.map((block) => block.text)].join("\n\n");
  return issueVoiceTextTicket(complete, requestId, visitor, secret, profile, now);
}

/** Call only on server-validated prose. This is a prefix, never another generated summary. */
export function issueVoiceTextTicket(complete: string, requestId: string, visitor: string, secret: string, profile: string, now = Date.now()): AssistantAudio {
  const partial = complete.length > VOICE_MAX_CHARACTERS;
  const clipped = complete.slice(0, VOICE_MAX_CHARACTERS - 1);
  const boundary = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf(".\n"), clipped.lastIndexOf("! "), clipped.lastIndexOf("? "));
  const wordBoundary = clipped.lastIndexOf(" ");
  const text = partial ? `${clipped.slice(0, boundary > clipped.length * .7 ? boundary + 1 : wordBoundary > 0 ? wordBoundary : clipped.length).trim()}…` : complete;
  const expiresAt = Math.floor(now / 1000) + VOICE_TICKET_SECONDS;
  const payload = Buffer.from(JSON.stringify({ id: requestId, expiresAt, visitor, profile, hash: digest(text) })).toString("base64url");
  return { ticket: `${payload}.${sign(payload, secret)}`, text, expiresAt, partial };
}

/** A client can replay a capability, but cannot change its text, visitor, expiry or request ID. */
export function verifyVoiceTicket(value: unknown, visitor: string, secret: string, profile: string, now = Date.now()): { requestId: string; text: string; fingerprint: string } {
  const invalid = () => { throw new AssistantFault("invalid", 400, "O áudio desta resposta expirou ou não está disponível. O texto continua aqui."); };
  if (!isRecord(value) || Object.keys(value).some((key) => !["ticket", "text"].includes(key)) ||
    typeof value.ticket !== "string" || value.ticket.length > 1024 || typeof value.text !== "string" ||
    !value.text.trim() || value.text.length > VOICE_MAX_CHARACTERS) return invalid();
  const parts = value.ticket.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return invalid();
  const expected = Buffer.from(sign(parts[0], secret));
  const supplied = Buffer.from(parts[1]);
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) return invalid();
  let claims: unknown;
  try { claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { return invalid(); }
  const seconds = Math.floor(now / 1000);
  if (!isRecord(claims) || typeof claims.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.id) ||
    !Number.isSafeInteger(claims.expiresAt) || (claims.expiresAt as number) <= seconds ||
    (claims.expiresAt as number) > seconds + VOICE_TICKET_SECONDS || claims.visitor !== visitor || claims.profile !== profile || claims.hash !== digest(value.text)) return invalid();
  return { requestId: claims.id, text: value.text, fingerprint: digest(value.ticket) };
}

