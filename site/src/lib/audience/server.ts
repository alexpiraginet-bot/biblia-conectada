import "server-only";
import { journeyRedis } from "../rewards/redis";
import { audienceCsv, audienceDay, buildAudienceReport, parseAudienceEvent, reportDays, AUDIENCE_DAILY_CAP, AUDIENCE_RETENTION_DAYS } from "./core";
import { audienceConfig, digest, headers, json, rateKey, sameOrigin, smallJson, type Dependencies } from "./runtime";
import { readAdmin, verifySessionToken } from "./admin-security";
import { googleMeasurementConfig } from "./google-config";
export { audienceConfig, digest, type AudienceConfig } from "./runtime";
export { audienceLogin, audienceLogout } from "./admin-security";
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
  if (!verifySessionToken(cookie, config, now.getTime())) return json({ error: "login", message: "Entre para consultar o painel." }, 401);
  const query = new URL(request.url).searchParams; const days = Number(query.get("days") ?? 30); const format = query.get("format") ?? "json";
  if (![7, 30, 90].includes(days) || !["json", "csv", "export"].includes(format) || [...query.keys()].some((key) => !["days", "format"].includes(key)) || query.getAll("days").length > 1 || query.getAll("format").length > 1) return json({ error: "range" }, 400);
  try {
    const dates = reportDays(now, days); const command = dependencies.command ?? journeyRedis(config);
    if (!await readAdmin(cookie, { config, command, now })) return json({ error: "login", message: "Entre para consultar o painel." }, 401);
    const raw = await command(["EVAL", "local rows={redis.call('GET',KEYS[1]) or false}; for i=2,#KEYS do rows[#rows+1]=redis.call('HGETALL',KEYS[i]) end; return rows", dates.length + 1, `${config.prefix}started`, ...dates.map((date) => `${config.prefix}day:${date}`)]);
    const google = googleMeasurementConfig(process.env);
    const report = buildAudienceReport(raw, dates, now, config.environment, config.enabled, !!config.measurementId, !!google.adsId && !!google.adsConversionLabel);
    const hash = digest(JSON.stringify(report));
    if (format === "csv") { const csv = audienceCsv(report); return new Response(csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="biblia-audiencia-${report.from}-${report.to}.csv"`, "X-Report-SHA256": digest(csv) } }); }
    return Response.json({ report, sha256: hash }, { headers: { ...headers, ...(format === "export" ? { "Content-Disposition": `attachment; filename="biblia-audiencia-${report.from}-${report.to}.json"` } : {}) } });
  } catch { return json({ error: "unavailable", message: "Não foi possível consultar a fonte agora. Os dados não foram substituídos por zeros." }, 503); }
}
