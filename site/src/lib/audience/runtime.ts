import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { journeyConfig, type JourneyConfig } from "../rewards/config";
import { journeyRedis, type JourneyRedis } from "../rewards/redis";

export type AudienceConfig = JourneyConfig & { enabled: boolean; passwordHash: string | null; measurementId: string | null; passkeyOrigin: string | null; passkeyRpId: string | null };
export type Dependencies = { config?: AudienceConfig | null; command?: JourneyRedis; now?: () => Date };
export function audienceConfig(env: Readonly<Record<string, string | undefined>> = process.env): AudienceConfig | null {
  const base = journeyConfig(env); if (!base) return null;
  const id = env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const previewHost = env.VERCEL_URL && /^[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL) ? env.VERCEL_URL : null;
  const host = base.environment === "production" ? "www.bibliaconectada.company" : previewHost;
  return { ...base, prefix: `bc:{audience}:${base.environment}:`, cookieName: base.environment === "production" ? "__Host-bc-admin" : "__Host-bc-admin-preview",
    enabled: env.AUDIENCE_ENABLED === "true", passwordHash: /^[a-f0-9]{64}$/.test(env.AUDIENCE_ADMIN_PASSWORD_HASH ?? "") ? env.AUDIENCE_ADMIN_PASSWORD_HASH! : null,
    measurementId: id && /^G-[A-Z0-9]{6,20}$/.test(id) ? id : null,
    passkeyOrigin: host ? `https://${host}` : null, passkeyRpId: base.environment === "production" ? "bibliaconectada.company" : host };
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const mac = (value: string, config: AudienceConfig) => createHmac("sha256", config.secret).update(`audience:v2:${config.environment}:${value}`).digest("hex");
export const equal = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie", "X-Robots-Tag": "noindex, nofollow, noarchive" };
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
export function sameOrigin(request: Request): boolean { return request.headers.get("origin") === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site"; }
export function cookieValue(request: Request, name: string): string | undefined {
  const found = (request.headers.get("cookie") ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(name + "="));
  return found.length === 1 ? found[0].slice(name.length + 1) : undefined;
}
export async function smallJson(request: Request, limit = 1024): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length")) > limit) throw new AdminFault("invalid", 400, "Confira os dados enviados.");
  const reader = request.body?.getReader(); if (!reader) throw new AdminFault("invalid", 400, "Confira os dados enviados.");
  let size = 0; let body = ""; const decoder = new TextDecoder();
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > limit) throw new Error("Body too large"); body += decoder.decode(part.value, { stream: true }); } return JSON.parse(body + decoder.decode()); }
  catch { throw new AdminFault("invalid", 400, "Confira os dados enviados."); }
  finally { await reader.cancel().catch(() => {}); }
}
export function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function fields(value: unknown, allowed: string[]): value is Record<string, unknown> { return record(value) && Object.keys(value).every(key => allowed.includes(key)); }
export function rateKey(request: Request, config: AudienceConfig, now: number, purpose: string): string {
  const ip = request.headers.get("x-forwarded-for")?.trim() ?? "";
  if (!isIP(ip)) throw new Error("Untrusted edge");
  return `${config.prefix}rate:${purpose}:${mac(`rate:${Math.floor(now / 60000)}:${ip}`, config)}`;
}
export const RATE_LUA = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n";
export async function limitAttempts(request: Request, context: AdminContext, purpose: string, max = 5): Promise<void> {
  const rate = await context.command(["EVAL", RATE_LUA, 1, rateKey(request, context.config, context.now.getTime(), purpose)]);
  if (typeof rate !== "number") throw new Error("Invalid rate");
  if (rate > max) throw new AdminFault("limit", 429, "Aguarde um minuto antes de tentar novamente.");
}
export type AdminContext = { config: AudienceConfig; command: JourneyRedis; now: Date };
export function adminContext(dependencies: Dependencies): AdminContext {
  const config = dependencies.config === undefined ? audienceConfig() : dependencies.config;
  if (!config?.passwordHash) throw new AdminFault("setup", 503, "O acesso privado ainda precisa ser configurado.");
  return { config, command: dependencies.command ?? journeyRedis(config), now: (dependencies.now ?? (() => new Date()))() };
}
export class AdminFault extends Error { constructor(public code: string, public status: number, message: string) { super(message); } }
export const loginRequired = () => new AdminFault("login", 401, "Entre novamente para acessar o painel.");
export function adminError(error: unknown): Response {
  return error instanceof AdminFault ? json({ error: error.code, message: error.message }, error.status) : json({ error: "unavailable", message: "O acesso está temporariamente indisponível. Tente novamente." }, 503);
}
export function requireOrigin(request: Request): void { if (!sameOrigin(request)) throw new AdminFault("origin", 403, "Abra o painel neste site para continuar."); }
