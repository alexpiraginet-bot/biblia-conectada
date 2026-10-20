/** Public, serializable contract. No provider configuration belongs in this module. */
export type AssistantMode = "entender" | "explorar" | "narrar";
export type AssistantStyle = "simples" | "contexto" | "cotidiano";
export type AssistantPassage = { book: string; chapter: number; verse?: number };
export type AssistantRequest = {
  requestId: string;
  mode: AssistantMode;
  /** Omission preserves the contextual explanation used by existing clients. */
  style?: AssistantStyle;
  question: string;
  passage: AssistantPassage;
};
export type AssistantCitation = { id: string; reference: string; text: string; href: string };
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
};
export type AssistantErrorCode = "unavailable" | "limit" | "invalid" | "provider" | "in_progress";
export type AssistantError = {
  ok: false;
  code: AssistantErrorCode;
  message: string;
  retryAfterSeconds?: number;
};
export type AssistantResponse = AssistantSuccess | AssistantError;
export type AssistantAvailability = { available: boolean; message: string };
