import { JOURNEY_BONUS_DAYS, JOURNEY_BONUS_POINTS, JOURNEY_DAILY_POINTS, JOURNEY_INTERVAL_MS, JOURNEY_MAX_GAP_MS, JOURNEY_REQUIRED_AREAS, JOURNEY_TARGET_ACTIVE_DAYS, JOURNEY_TARGET_POINTS, JOURNEY_TASK_SECONDS, JOURNEY_TTL_SECONDS } from "./rules";

/** Every clock, nonce, daily award, active day and seven-day bonus changes in one Redis transaction. */
export const JOURNEY_LUA = `
local op, id = ARGV[1], ARGV[2]
local now = tonumber(ARGV[3])
local date, yesterday, newNonce, nonce, area = ARGV[4], ARGV[5], ARGV[6], ARGV[7], ARGV[8]
local active = ARGV[9] == '1'
local ttl = ${JOURNEY_TTL_SECONDS}
if not now or now < 0 or now ~= math.floor(now) then return {'unavailable'} end

local minute = tonumber(redis.call('GET', KEYS[4]) or '0')
if not minute or minute >= 24 then return {'limit'} end
redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], 120)

if op == 'reset' then
  redis.call('DEL', KEYS[1])
  redis.call('ZREM', KEYS[2], id)
  redis.call('ZREM', KEYS[3], id)
  return {'reset'}
end

local function emptyDay()
  return {date=date, readingMs=0, liturgyMs=0, exploreMs=0, areas={}, completed={}, points=0, active=false}
end
local raw = redis.call('GET', KEYS[1])
local state
if not raw then
  if op ~= 'start' then return {'expired'} end
  local starts = tonumber(redis.call('GET', KEYS[5]) or '0')
  if not starts or starts >= 3 then return {'start-limit'} end
  redis.call('INCR', KEYS[5])
  redis.call('EXPIRE', KEYS[5], 172800)
  state = {version=1, points=0, activeDays=0, streak=0, longestStreak=0, lastActiveDate='',
    createdAt=now, updatedAt=now, day=emptyDay(), pulse={at=0, nonce=newNonce, area='', active=false}}
else
  local valid
  valid, state = pcall(cjson.decode, raw)
  if not valid or type(state) ~= 'table' or state.version ~= 1 or type(state.day) ~= 'table'
    or type(state.pulse) ~= 'table' or type(state.points) ~= 'number' or state.points < 0
    or state.points ~= math.floor(state.points) or type(state.activeDays) ~= 'number' or state.activeDays < 0
    or type(state.updatedAt) ~= 'number' or now < state.updatedAt then return {'unavailable'} end
end

local function persist()
  state.updatedAt = now
  local encoded = cjson.encode(state)
  redis.call('SET', KEYS[1], encoded, 'EX', ttl)
  redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - ttl * 1000)
  redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now - ttl * 1000)
  redis.call('ZADD', KEYS[2], now, id)
  if state.points >= ${JOURNEY_TARGET_POINTS} and state.activeDays >= ${JOURNEY_TARGET_ACTIVE_DAYS} then
    redis.call('ZADD', KEYS[3], now, id)
  else redis.call('ZREM', KEYS[3], id) end
  redis.call('EXPIRE', KEYS[2], ttl)
  redis.call('EXPIRE', KEYS[3], ttl)
  return {'ok', encoded}
end

if op == 'start' or op == 'status' then return persist() end
if op ~= 'pulse' then return {'unavailable'} end
-- Same token can never credit twice, including simultaneous tabs and retried requests.
if nonce ~= state.pulse.nonce then return {'ok', cjson.encode(state)} end
if state.day.date ~= date then
  if state.day.date > date then return {'unavailable'} end
  state.day = emptyDay()
  state.pulse.at = 0
  state.pulse.active = false
end
local delta = now - state.pulse.at
if active and state.pulse.active and state.pulse.area == area and delta < ${JOURNEY_INTERVAL_MS} then
  return {'ok', cjson.encode(state)}
end
if active and state.pulse.active and state.pulse.area == area
  and delta >= ${JOURNEY_INTERVAL_MS} and delta <= ${JOURNEY_MAX_GAP_MS} then
  local elapsed = math.min(delta, ${JOURNEY_INTERVAL_MS})
  if area == 'reading' or area == 'liturgy' then
    state.day.readingMs = math.min(${JOURNEY_TASK_SECONDS.reading * 1000}, state.day.readingMs + elapsed)
  end
  if area == 'liturgy' then state.day.liturgyMs = math.min(${JOURNEY_TASK_SECONDS.liturgy * 1000}, state.day.liturgyMs + elapsed) end
  if area == 'arcs' or area == 'explore' or area == 'map' or area == 'chronology' or area == 'timeline' or area == 'interlinear' then
    state.day.exploreMs = math.min(${JOURNEY_TASK_SECONDS.explore * 1000}, state.day.exploreMs + elapsed)
    state.day.areas[area] = true
  end
  local areaCount = 0
  for _, _ in pairs(state.day.areas) do areaCount = areaCount + 1 end
  local function award(name, ready)
    if ready and not state.day.completed[name] then
      state.day.completed[name] = true
      state.day.points = state.day.points + ${JOURNEY_DAILY_POINTS}
      state.points = state.points + ${JOURNEY_DAILY_POINTS}
      if not state.day.active then
        state.day.active = true
        state.activeDays = state.activeDays + 1
        if state.lastActiveDate == yesterday then state.streak = state.streak + 1 else state.streak = 1 end
        state.longestStreak = math.max(state.longestStreak, state.streak)
        state.lastActiveDate = date
        if state.activeDays % ${JOURNEY_BONUS_DAYS} == 0 then
          state.points = state.points + ${JOURNEY_BONUS_POINTS}
          state.day.points = state.day.points + ${JOURNEY_BONUS_POINTS}
        end
      end
    end
  end
  award('reading', state.day.readingMs >= ${JOURNEY_TASK_SECONDS.reading * 1000})
  award('liturgy', state.day.liturgyMs >= ${JOURNEY_TASK_SECONDS.liturgy * 1000})
  award('explore', state.day.exploreMs >= ${JOURNEY_TASK_SECONDS.explore * 1000} and areaCount >= ${JOURNEY_REQUIRED_AREAS})
end
state.pulse = {at=now, nonce=newNonce, area=area, active=active}
return persist()
`;

export type JourneyState = {
  version: 1;
  points: number; activeDays: number; streak: number; longestStreak: number; lastActiveDate: string;
  createdAt: number; updatedAt: number;
  day: { date: string; readingMs: number; liturgyMs: number; exploreMs: number; areas: Record<string, boolean>; completed: Record<string, boolean>; points: number; active: boolean };
  pulse: { at: number; nonce: string; area: string; active: boolean };
};
