export type JourneyEnvironment = "production" | "preview";
export type JourneyConfig = { redisUrl: string; redisToken: string; secret: string; environment: JourneyEnvironment; prefix: string; cookieName: string };

/** The journey is independent of Anthropic/OpenAI availability; never read their API keys. */
export function journeyConfig(env: Readonly<Record<string, string | undefined>> = process.env): JourneyConfig | null {
  const environment = env.VERCEL_ENV;
  if (env.VERCEL !== "1" || (environment !== "production" && environment !== "preview")) return null;
  const redisToken = (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)?.trim();
  const secret = env.ASSISTANT_RATE_LIMIT_SECRET;
  if (!redisToken || !secret || secret.length < 32) return null;
  try {
    const url = new URL(env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL ?? "");
    if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io") || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") return null;
    return {
      redisUrl: url.origin, redisToken, secret, environment,
      prefix: `bc:{journey}:${environment}:`,
      cookieName: environment === "production" ? "__Host-bc-journey" : "__Host-bc-journey-preview",
    };
  } catch { return null; }
}
