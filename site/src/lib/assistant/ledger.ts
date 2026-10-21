import "server-only";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { MONTHLY_LIMIT_MICROS, UNAVAILABLE_MESSAGE, type AssistantConfig } from "./config";
import { AssistantFault, isRecord } from "./input";

// The hash tag keeps all keys in one Redis cluster slot. Never include deployment IDs.
export const LEDGER_KEY = "bc:{assistant}:ledger";
export const PER_MINUTE = 4;
export const PER_DAY = 12;

/** All acceptance checks and mutations happen in one atomic Redis EVAL. No auto-initialization. */
export const RESERVE_LUA = `
local schema = redis.call('HGET', KEYS[1], 'schema')
local limit = tonumber(redis.call('HGET', KEYS[1], 'limitMicros'))
local blocked = redis.call('HGET', KEYS[1], 'blocked')
if schema ~= '1' or not limit or limit ~= tonumber(ARGV[1]) or blocked ~= '0' then return {'unavailable'} end
if redis.call('EXISTS', KEYS[2]) == 1 then return {'duplicate'} end
local amount = tonumber(ARGV[2])
local spentRaw = redis.call('HGET', KEYS[1], ARGV[3])
local spent = tonumber(spentRaw or '0')
if not amount or amount <= 0 or amount ~= math.floor(amount) or not spent or spent < 0 or spent ~= math.floor(spent) then return {'unavailable'} end
if spent + amount > limit then return {'budget'} end
local minute = tonumber(redis.call('GET', KEYS[3]) or '0')
local day = tonumber(redis.call('GET', KEYS[4]) or '0')
if not minute or not day or minute < 0 or day < 0 or minute ~= math.floor(minute) or day ~= math.floor(day) then return {'unavailable'} end
if minute >= tonumber(ARGV[6]) then return {'minute'} end
if day >= tonumber(ARGV[7]) then return {'day'} end
redis.call('HINCRBY', KEYS[1], ARGV[3], amount)
redis.call('HSET', KEYS[2], 'state', 'reserved', 'amount', amount, 'field', ARGV[3], 'fingerprint', ARGV[4])
redis.call('EXPIRE', KEYS[2], 3888000)
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], 120)
redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], 172800)
return {'reserved', tostring(amount)}
`;

/** Only a completed response with verified usage can release unused reservation, once. */
export const SETTLE_LUA = `
if redis.call('HGET', KEYS[1], 'schema') ~= '1' then return {'unavailable'} end
if redis.call('HGET', KEYS[2], 'state') ~= 'reserved' then return {'unchanged'} end
if redis.call('HGET', KEYS[2], 'fingerprint') ~= ARGV[1] then return {'unavailable'} end
local amount = tonumber(redis.call('HGET', KEYS[2], 'amount'))
local field = redis.call('HGET', KEYS[2], 'field')
local actual = tonumber(ARGV[2])
local spent = field and tonumber(redis.call('HGET', KEYS[1], field))
if not amount or not actual or actual < 0 or actual ~= math.floor(actual) or not spent or spent < amount then return {'unavailable'} end
if actual > amount then
  redis.call('HSET', KEYS[1], 'blocked', '1')
  redis.call('HSET', KEYS[2], 'state', 'overrun', 'actual', actual)
  redis.call('HINCRBY', KEYS[1], field, actual - amount)
  return {'blocked'}
end
redis.call('HSET', KEYS[2], 'state', 'settled', 'actual', actual)
redis.call('HINCRBY', KEYS[1], field, actual - amount)
return {'settled'}
`;

export type Reservation = { key: string; fingerprint: string; amount: number };
export type RedisCommand = (command: (string | number)[]) => Promise<unknown>;
export function redisCommand(config: AssistantConfig, fetcher: typeof fetch = fetch): RedisCommand {
  return async (command) => {
    try {
      const response = await fetcher(config.redisUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${config.redisToken}`, "content-type": "application/json" },
        body: JSON.stringify(command), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error("ledger");
      const body: unknown = await response.json();
      if (!isRecord(body) || body.error || !("result" in body)) throw new Error("ledger");
      return body.result;
    } catch { throw new AssistantFault("unavailable", 503, UNAVAILABLE_MESSAGE); }
  };
}

export async function ledgerReady(command: RedisCommand): Promise<boolean> {
  try {
    const result = await command(["HMGET", LEDGER_KEY, "schema", "limitMicros", "blocked"]);
    return Array.isArray(result) && result[0] === "1" && result[1] === String(MONTHLY_LIMIT_MICROS) && result[2] === "0";
  } catch { return false; }
}

/** Vercel overwrites x-forwarded-for with the public client IP. No trust in arbitrary proxy chains.
 * Other hosting environments must supply their own verified identity adapter before activation.
 */
export function visitorIdentity(request: Request, secret: string, env: Readonly<Record<string, string | undefined>> = process.env): string {
  if (env.VERCEL !== "1") throw new AssistantFault("unavailable", 503, UNAVAILABLE_MESSAGE);
  const address = request.headers.get("x-forwarded-for")?.trim() ?? "";
  if (!isIP(address)) throw new AssistantFault("unavailable", 503, UNAVAILABLE_MESSAGE);
  return createHmac("sha256", secret).update(address).digest("hex");
}

export async function reserve<T extends { requestId: string }>(
  command: RedisCommand, request: T, visitor: string, amount: number, now = new Date(),
): Promise<Reservation> {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MONTHLY_LIMIT_MICROS) {
    throw new AssistantFault("unavailable", 503, UNAVAILABLE_MESSAGE);
  }
  const day = now.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const minute = Math.floor(now.getTime() / 60_000);
  const key = `bc:{assistant}:request:${request.requestId}`;
  const fingerprint = createHash("sha256").update(visitor).update(JSON.stringify(request)).digest("hex");
  const result = await command([
    "EVAL", RESERVE_LUA, 4, LEDGER_KEY, key,
    `bc:{assistant}:minute:${visitor}:${minute}`, `bc:{assistant}:day:${visitor}:${day}`,
    MONTHLY_LIMIT_MICROS, amount, `spent:${month}`, fingerprint, "unused", PER_MINUTE, PER_DAY,
  ]);
  const parts: unknown[] = Array.isArray(result) ? result : [];
  const status = parts[0];
  if (status === "reserved" && parts[1] === String(amount)) return { key, fingerprint, amount };
  if (status === "duplicate") throw new AssistantFault("in_progress", 409, "Esta consulta já foi recebida. Aguarde a resposta ou faça uma nova pergunta.");
  if (status === "minute" || status === "day") {
    throw new AssistantFault("limit", 429, status === "minute"
      ? "Vamos com calma. Aguarde um minuto antes de começar outro estudo."
      : "Você chegou ao limite de estudos de hoje. As leituras e conexões continuam disponíveis.",
    status === "minute" ? 60 : 86_400);
  }
  if (status === "budget") throw new AssistantFault("limit", 429, "As consultas assistidas estão em pausa neste mês. Continue explorando as passagens e suas conexões.");
  throw new AssistantFault("unavailable", 503, UNAVAILABLE_MESSAGE);
}

export async function settle(command: RedisCommand, reservation: Reservation, actual: number | null): Promise<void> {
  if (actual === null || !Number.isSafeInteger(actual) || actual < 0) return;
  try {
    await command(["EVAL", SETTLE_LUA, 2, LEDGER_KEY, reservation.key, reservation.fingerprint, actual]);
  } catch {
    // A reservation is a charge until proven otherwise. A failed refund is conservative.
  }
}
