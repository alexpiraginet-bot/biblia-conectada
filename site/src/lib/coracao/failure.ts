import { AssistantFault } from "@/lib/assistant/input";

/** Fixed reason codes only. Never put provider messages, prompts or generated text in diagnostics. */
export type CoracaoFailureReason =
  | "provider_http" | "invalid_envelope" | "output_limit" | "refusal" | "unexpected_stop"
  | "invalid_content" | "invalid_json" | "invalid_shape" | "invalid_fields" | "invalid_prose"
  | "invalid_reference" | "divine_identity" | "invalid_citations" | "invalid_suggested_reply";

export class CoracaoFailure extends AssistantFault {
  constructor(readonly reason: CoracaoFailureReason) {
    super("provider", 502, reason === "output_limit"
      ? "A resposta foi interrompida antes de terminar. Tente novamente."
      : "Não consegui concluir e conferir a resposta desta vez. Tente novamente.");
  }
}

export type CoracaoProviderDiagnostics = {
  stopReason: "end_turn" | "max_tokens" | "refusal" | "other";
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
};
