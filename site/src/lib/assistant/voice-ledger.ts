import "server-only";
import { MONTHLY_LIMIT_MICROS } from "./config";
import { AssistantFault } from "./input";
import { LEDGER_KEY, type RedisCommand } from "./ledger";
import { VOICE_MAX_CHARACTERS, VOICE_UNAVAILABLE } from "./voice";

export const VOICE_LIMIT_MICROS = 5_000_000;
// Twice the published v4 list rate ($0.08/1k characters): a conservative app allocation,
// not an invoice or a promise about account-specific voice multipliers/taxes.
export const VOICE_CHARACTER_MICROS = 160;

/** One transaction charges the existing total AND its voice subset. No extra $5 budget. */
export const RESERVE_VOICE_LUA = `
if redis.call('HGET', KEYS[1], 'schema') ~= '1' or redis.call('HGET', KEYS[1], 'blocked') ~= '0' or tonumber(redis.call('HGET', KEYS[1], 'limitMicros')) ~= tonumber(ARGV[1]) then return {'unavailable'} end
if redis.call('EXISTS', KEYS[2]) == 1 then return {'duplicate'} end
local amount = tonumber(ARGV[2])
local total = tonumber(redis.call('HGET', KEYS[1], ARGV[3]) or '0')
local voice = tonumber(redis.call('HGET', KEYS[1], ARGV[4]) or '0')
local minute = tonumber(redis.call('GET', KEYS[3]) or '0')
local day = tonumber(redis.call('GET', KEYS[4]) or '0')
if not amount or amount < 1 or amount ~= math.floor(amount) or not total or total < 0 or total ~= math.floor(total) or not voice or voice < 0 or voice ~= math.floor(voice) or voice > total or not minute or minute < 0 or minute ~= math.floor(minute) or not day or day < 0 or day ~= math.floor(day) then return {'unavailable'} end
if total + amount > tonumber(ARGV[1]) or voice + amount > tonumber(ARGV[5]) then return {'budget'} end
if minute >= 2 or day >= 12 then return {'rate'} end
redis.call('HINCRBY', KEYS[1], ARGV[3], amount)
redis.call('HINCRBY', KEYS[1], ARGV[4], amount)
redis.call('HSET', KEYS[2], 'state', 'reserved', 'amount', amount, 'field', ARGV[3], 'voiceField', ARGV[4], 'fingerprint', ARGV[6])
redis.call('EXPIRE', KEYS[2], 3888000)
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], 120)
redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], 172800)
return {'reserved', tostring(amount)}
`;

export async function reserveVoice(command: RedisCommand, input: { requestId: string; text: string; fingerprint: string }, visitor: string, amount = input.text.length * VOICE_CHARACTER_MICROS, now = new Date()) {
  if (!input.text.length || input.text.length > VOICE_MAX_CHARACTERS) throw new AssistantFault("invalid", 400, VOICE_UNAVAILABLE);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > VOICE_LIMIT_MICROS) throw new AssistantFault("unavailable", 503, VOICE_UNAVAILABLE);
  const day = now.toISOString().slice(0, 10), month = day.slice(0, 7), minute = Math.floor(now.getTime() / 60_000);
  const result = await command(["EVAL", RESERVE_VOICE_LUA, 4, LEDGER_KEY, `bc:{assistant}:voice:${input.requestId}`,
    `bc:{assistant}:voice-minute:${visitor}:${minute}`, `bc:{assistant}:voice-day:${visitor}:${day}`,
    MONTHLY_LIMIT_MICROS, amount, `spent:${month}`, `voiceSpent:${month}`, VOICE_LIMIT_MICROS, input.fingerprint]);
  const parts: unknown[] = Array.isArray(result) ? result : [];
  const status = parts[0];
  if (status === "reserved" && parts[1] === String(amount)) return;
  if (status === "duplicate") throw new AssistantFault("in_progress", 409, "Este áudio já foi solicitado. Se a conexão foi interrompida, continue pelo texto; não faremos uma nova cobrança automática.");
  if (status === "budget") throw new AssistantFault("limit", 429, "A voz chegou ao limite deste mês. Você pode continuar a conversa em texto.");
  if (status === "rate") throw new AssistantFault("limit", 429, "A voz está em pausa por limite de uso. Continue pelo texto.");
  throw new AssistantFault("unavailable", 503, VOICE_UNAVAILABLE);
}
