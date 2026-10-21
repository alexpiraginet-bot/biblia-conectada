/** Public, serializable contract. No provider configuration belongs in this module. */
import type { TranslationId } from "@/lib/translations";
export type AssistantMode = "entender" | "explorar" | "narrar";
export type AssistantStyle = "simples" | "contexto" | "cotidiano";
export type AssistantTranslation = TranslationId;
export type AssistantPassage = { book: string; chapter: number; verse?: number };
export type AssistantHistoryTurn = { question: string; answer: string };
export type AssistantRequest = {
  requestId: string;
  mode: AssistantMode;
  /** Omission preserves the contextual explanation used by existing clients. */
  style?: AssistantStyle;
  /** Omission retains the existing BLIVRE edition. */
  translation?: AssistantTranslation;
  question: string;
  passage: AssistantPassage;
  /** At most two previous turns, oldest first. Untrusted context, never source evidence. */
  history?: AssistantHistoryTurn[];
};
export type AssistantCitation = { id: string; reference: string; text: string; href: string; source?: string };
export type AssistantBlock = { text: string; citationIds: string[] };
export type AssistantScene = AssistantBlock & {
  id: string;
  title: string;
  art: { src: string; alt: string; caption: string };
  action: { href: string; label: string };
};
export type AssistantSuccess = {
  ok: true;
  mode: AssistantMode;
  title: string;
  blocks: AssistantBlock[];
  citations: AssistantCitation[];
  suggestions: string[];
  scenes?: AssistantScene[];
  notice: string;
  source?: { name: string; credit: string; license: string; licenseUrl: string; sourceNotice?: string; trademarkNotice?: string };
  /** A short-lived, signed capability for this validated answer only. Not a TTS text box. */
  audio?: AssistantAudio;
};
export type AssistantAudio = { ticket: string; text: string; expiresAt: number; partial: boolean };
export type AssistantErrorCode = "unavailable" | "limit" | "invalid" | "provider" | "in_progress";
export type AssistantError = {
  ok: false;
  code: AssistantErrorCode;
  message: string;
  retryAfterSeconds?: number;
};
export type AssistantResponse = AssistantSuccess | AssistantError;
export type AssistantAvailability = { available: boolean; message: string; voice?: { available: boolean; name?: string } };
