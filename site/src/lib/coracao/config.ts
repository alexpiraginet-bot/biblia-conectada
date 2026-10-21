import "server-only";
import { assistantConfig } from "@/lib/assistant/config";
import type { CoracaoAvailability } from "./types";

// Verified against https://platform.claude.com/docs/en/models/sonnet-5-5/overview on 2026-10-21.
export const CORACAO_MODEL = "claude-sonnet-5-5";
export const CORACAO_MAX_OUTPUT_TOKENS = 1600;
export const CORACAO_INPUT_TOKEN_MICROS = 2;
export const CORACAO_OUTPUT_TOKEN_MICROS = 10;
export const CORACAO_UNAVAILABLE = "Esta conversa está em preparação. Você pode continuar lendo e explorando a Bíblia.";

/** Uses the same explicit activation and persistent $20 ledger as contextual study. */
export function coracaoAvailability(): CoracaoAvailability {
  return assistantConfig()
    ? { available: true, message: "Conte o que você procura, mesmo sem lembrar a passagem." }
    : { available: false, message: CORACAO_UNAVAILABLE };
}
