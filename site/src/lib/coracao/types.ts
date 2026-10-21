/** Public conversation contract. Contains no corpus, credentials or provider configuration. */
import type { AssistantAudio, AssistantBlock, AssistantCitation, AssistantError, AssistantHistoryTurn, AssistantSuccess } from "@/lib/assistant/types";
import type { TranslationId } from "@/lib/translations";

export type CoracaoMode = "encontrar" | "jesus";
export type CoracaoRequest = {
  requestId: string;
  question: string;
  mode?: CoracaoMode;
  translation?: TranslationId;
  /** At most two turns; context only, never a source of biblical facts. */
  history?: AssistantHistoryTurn[];
};
export type CoracaoInput = CoracaoRequest & { mode: CoracaoMode; translation: TranslationId };
export type CoracaoSuccess = {
  ok: true;
  mode: CoracaoMode;
  kind: "answer" | "clarify" | "redirect";
  title: string;
  blocks: AssistantBlock[];
  citations: AssistantCitation[];
  suggestions: string[];
  /** A human reply to adapt, never presented as Jesus speaking or as Scripture. */
  suggestedReply?: string;
  notice: string;
  source: NonNullable<AssistantSuccess["source"]>;
  audio?: AssistantAudio;
};
export type CoracaoResponse = CoracaoSuccess | AssistantError;
export type CoracaoAvailability = { available: boolean; message: string; voice?: { available: boolean; name?: string } };
