import "server-only";
import type { AssistantAvailability } from "./types";

export const MODEL = "claude-opus-5-5";
export const MAX_OUTPUT_TOKENS = 1600;
export const MONTHLY_LIMIT_MICROS = 20_000_000;
export const INPUT_TOKEN_MICROS = 4;
export const OUTPUT_TOKEN_MICROS = 20;
export const UNAVAILABLE_MESSAGE = "O companheiro de estudo está em preparação. Você já pode ler as passagens e explorar suas conexões.";

export type AssistantConfig = {
  apiKey: string;
  redisUrl: string;
  redisToken: string;
  rateSecret: string;
};

/** Read at request time. Never return this configuration to the browser. */
export function assistantConfig(env: Readonly<Record<string, string | undefined>> = process.env): AssistantConfig | null {
  if (env.ASSISTANT_ENABLED !== "true") return null;
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const redisToken = (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)?.trim();
  const rateSecret = env.ASSISTANT_RATE_LIMIT_SECRET;
  if (!apiKey || !redisToken || !rateSecret || rateSecret.length < 32) return null;
  try {
    const url = new URL(env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL ?? "");
    if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io") ||
      url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") return null;
    return { apiKey, redisToken, rateSecret, redisUrl: url.origin };
  } catch { return null; }
}

/** Configuration readiness only; the endpoint also checks the persistent ledger. */
export function assistantAvailability(): AssistantAvailability {
  return assistantConfig()
    ? { available: true, message: "Escolha uma passagem e comece a explorar." }
    : { available: false, message: UNAVAILABLE_MESSAGE };
}
