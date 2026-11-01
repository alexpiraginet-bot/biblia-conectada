import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { journeyConfig, type JourneyConfig } from "../rewards/config";
import { journeyRedis, type JourneyRedis } from "../rewards/redis";
import { audienceCsv, audienceDay, buildAudienceReport, parseAudienceEvent, reportDays, AUDIENCE_DAILY_CAP, AUDIENCE_RETENTION_DAYS } from "./core";

export type AudienceConfig = JourneyConfig & { enabled: boolean; passwordHash: string | null; measurementId: string | null };
export const SESSION_SECONDS = 8 * 3600;
export function audienceConfig(env: Readonly<Record<string, string | undefined>> = process.env): AudienceConfig | null {
  const base = journeyConfig(env); if (!base) return null;
  const id = env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  return { ...base, prefix: `bc:{audience}:${base.environment}:`, cookieName: base.environment === "production" ? "__Host-bc-admin" : "__Host-bc-admin-preview",
    enabled: env.AUDIENCE_ENABLED === "true", passwordHash: /^[a-f0-9]{64}$/.test(env.AUDIENCE_ADMIN_PASSWORD_HASH ?? "") ? env.AUDIENCE_ADMIN_PASSWORD_HASH! : null,
    measurementId: id && /^G-[A-Z0-9]{6,20}$/.test(id) ? id : null };
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const mac = (value: string, config: AudienceConfig) => createHmac("sha256", config.secret).update(`audience:v1:${config.environment}:${value}`).digest("hex");
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function adminSession(config: AudienceConfig, now: number): string {
  const body = `${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${body}.${mac(`session:${body}:${config.passwordHash}`, config)}`;
}
export function isAdmin(value: string | undefined, config: AudienceConfig, now: number): boolean {
  if (!config.passwordHash || !value || !/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expires, nonce, signature] = value.split("."); const remaining = Number(expires) - Math.floor(now / 1000);
  return remaining > 0 && remaining <= SESSION_SECONDS && equal(signature, mac(`session:${expires}.${nonce}:${config.passwordHash}`, config));
}
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie", "X-Robots-Tag": "noindex, nofollow, noarchive" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
function sameOrigin(request: Request): boolean { return request.headers.get("origin") === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site"; }
async function smallJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length")) > 1024) throw new Error("Invalid body");
  const reader = request.body?.getReader(); if (!reader) throw new Error("Missing body");
  let size = 0; let body = ""; const decoder = new TextDecoder();
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 1024) throw new Error("Body too large"); body += decoder.decode(part.value, { stream: true }); } return JSON.parse(body + decoder.decode()); }
  finally { await reader.cancel().catch(() => {}); }
}
function rateKey(request: Request, config: AudienceConfig, now: number, purpose: string): string {
  const ip = request.headers.get("x-forwarded-for")?.trim() ?? "";
  if (!isIP(ip)) throw new Error("Untrusted edge");
  // Minute-scoped HMAC is used only for abuse limits, expires in 120 seconds, never in reports.
  const minute = Math.floor(now / 60000);
  return `${config.prefix}rate:${purpose}:${mac(`rate:${minute}:${ip}`, config)}`;
}
export const COLLECT_LUA = `
local rate = redis.call('INCR', KEYS[3]); if rate == 1 then redis.call('EXPIRE', KEYS[3], 120) end
if rate > 180 then return 'rate' end
local prior = redis.call('GET', KEYS[2])
if ARGV[1] == 'view' and prior then return 'duplicate' end
if ARGV[1] == 'engaged' then
  if not prior then return 'missing' end
  local stamp, area = string.match(prior, '^(%d+):(.+)$')
  if not stamp or area ~= ARGV[2] or tonumber(ARGV[5]) - tonumber(stamp) < 30000 then return 'early' end
  if redis.call('EXISTS', KEYS[5]) == 1 then return 'duplicate' end
end
local received = redis.call('HINCRBY', KEYS[1], 'received', 1)
redis.call('EXPIRE', KEYS[1], ARGV[7])
if received > tonumber(ARGV[8]) then redis.call('HINCRBY', KEYS[1], 'capped', 1); return 'cap' end
if ARGV[1] == 'view' then
  redis.call('SET', KEYS[2], ARGV[5] .. ':' .. ARGV[2], 'EX', 3600)
  redis.call('HINCRBY', KEYS[1], 'views', 1)
  redis.call('HINCRBY', KEYS[1], 'area:' .. ARGV[2], 1)
  redis.call('HINCRBY', KEYS[1], 'channel:' .. ARGV[3], 1)
  redis.call('HINCRBY', KEYS[1], 'campaign:' .. ARGV[4], 1)
else
  redis.call('SET', KEYS[5], '1', 'EX', 3600)
  redis.call('HINCRBY', KEYS[1], 'engaged', 1)
end
redis.call('SET', KEYS[4], ARGV[6], 'NX')
return 'ok'`;
type Dependencies = { config?: AudienceConfig | null; command?: JourneyRedis; now?: () => Date };
export async function collectAudience(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  const config = dependencies.config === undefined ? audienceConfig() : dependencies.config;
  if (!config?.enabled) return json({ accepted: false }, 503);
  if (!sameOrigin(request)) return json({ accepted: false }, 403);
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1" || /bot|crawl|spider|headless|lighthouse|playwright|preview|facebookexternalhit/i.test(request.headers.get("user-agent") ?? "")) return json({ accepted: false });
  let event; try { event = parseAudienceEvent(await smallJson(request)); } catch { return json({ accepted: false }, 400); }
  if (!event) return json({ accepted: false }, 400);
  try {
    const now = (dependencies.now ?? (() => new Date()))(); const command = dependencies.command ?? journeyRedis(config);
    const date = audienceDay(now); const nonce = `${config.prefix}nonce:${event.id}`;
    const result = await command(["EVAL", COLLECT_LUA, 5, `${config.prefix}day:${date}`, nonce, rateKey(request, config, now.getTime(), "collect"), `${config.prefix}started`, `${nonce}:engaged`,
      event.event, event.area, event.channel, event.campaign, now.getTime(), now.toISOString(), AUDIENCE_RETENTION_DAYS * 86400, AUDIENCE_DAILY_CAP]);
    return json({ accepted: result === "ok", duplicate: result === "duplicate" }, result === "rate" || result === "cap" ? 429 : result === "missing" || result === "early" ? 422 : 200);
  } catch { return json({ accepted: false }, 503); }
}
export async function audienceReportResponse(request: Request, cookie: string | undefined, dependencies: Dependencies = {}): Promise<Response> {
  const config = dependencies.config === undefined ? audienceConfig() : dependencies.config;
  const now = (dependencies.now ?? (() => new Date()))();
  if (!config?.passwordHash) return json({ error: "setup", message: "O acesso privado ainda precisa ser configurado." }, 503);
  if (!isAdmin(cookie, config, now.getTime())) return json({ error: "login", message: "Entre para consultar o painel." }, 401);
  const query = new URL(request.url).searchParams; const days = Number(query.get("days") ?? 30); const format = query.get("format") ?? "json";
  if (![7, 30, 90].includes(days) || !["json", "csv", "export"].includes(format) || [...query.keys()].some((key) => !["days", "format"].includes(key)) || query.getAll("days").length > 1 || query.getAll("format").length > 1) return json({ error: "range" }, 400);
  try {
    const dates = reportDays(now, days); const command = dependencies.command ?? journeyRedis(config);
    const raw = await command(["EVAL", "local rows={redis.call('GET',KEYS[1]) or false}; for i=2,#KEYS do rows[#rows+1]=redis.call('HGETALL',KEYS[i]) end; return rows", dates.length + 1, `${config.prefix}started`, ...dates.map((date) => `${config.prefix}day:${date}`)]);
    const report = buildAudienceReport(raw, dates, now, config.environment, config.enabled, !!config.measurementId);
    const hash = digest(JSON.stringify(report));
    if (format === "csv") { const csv = audienceCsv(report); return new Response(csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="biblia-audiencia-${report.from}-${report.to}.csv"`, "X-Report-SHA256": digest(csv) } }); }
    return Response.json({ report, sha256: hash }, { headers: { ...headers, ...(format === "export" ? { "Content-Disposition": `attachment; filename="biblia-audiencia-${report.from}-${report.to}.json"` } : {}) } });
  } catch { return json({ error: "unavailable", message: "Não foi possível consultar a fonte agora. Os dados não foram substituídos por zeros." }, 503); }
}
export async function audienceLogin(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  const config = dependencies.config === undefined ? audienceConfig() : dependencies.config;
  if (!config?.passwordHash) return json({ error: "setup", message: "O acesso privado ainda precisa ser configurado." }, 503);
  if (!sameOrigin(request)) return json({ error: "origin" }, 403);
  const now = (dependencies.now ?? (() => new Date()))();
  try {
    const command = dependencies.command ?? journeyRedis(config);
    const rate = await command(["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n", 1, rateKey(request, config, now.getTime(), "login")]);
    if (typeof rate !== "number" || rate > 5) return json({ error: "limit", message: "Aguarde um minuto antes de tentar novamente." }, 429);
    let body: unknown; try { body = await smallJson(request); } catch { return json({ error: "invalid" }, 400); }
    const password = body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 1 && "password" in body ? body.password : null;
    if (typeof password !== "string" || password.length < 16 || password.length > 128 || !equal(digest(password), config.passwordHash)) return json({ error: "login", message: "Não foi possível entrar. Confira a chave de acesso." }, 401);
    const response = json({ ok: true });
    response.headers.set("Set-Cookie", `${config.cookieName}=${adminSession(config, now.getTime())}; Path=/; Max-Age=${SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`);
    return response;
  } catch { return json({ error: "unavailable", message: "O acesso está temporariamente indisponível." }, 503); }
}
export function audienceLogout(request: Request): Response {
  if (!sameOrigin(request)) return json({ error: "origin" }, 403);
  const config = audienceConfig(); const response = json({ ok: true });
  if (config) response.headers.set("Set-Cookie", `${config.cookieName}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
  return response;
}
