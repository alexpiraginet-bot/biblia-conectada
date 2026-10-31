import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { journeyConfig } from "../src/lib/rewards/config";
import { journeyProfileId, journeyVisitor, newJourneyCookie, newJourneyNonce } from "../src/lib/rewards/identity";
import { parseJourneyAction, readJourneyAction } from "../src/lib/rewards/input";
import type { JourneyState } from "../src/lib/rewards/ledger";
import { journeyRedis, type JourneyRedis } from "../src/lib/rewards/redis";
import { journeyDay } from "../src/lib/rewards/rules";
import { handleJourney } from "../src/lib/rewards/service";
import { journeySnapshot, parseJourneyState } from "../src/lib/rewards/snapshot";

const env = {
  VERCEL: "1", VERCEL_ENV: "preview", KV_REST_API_URL: "https://test.upstash.io",
  KV_REST_API_TOKEN: "test-token", ASSISTANT_RATE_LIMIT_SECRET: "test-secret-with-more-than-32-characters",
};
const config = journeyConfig(env)!;
const cookie = "a".repeat(64);
const nonce = "b".repeat(32);
const now = new Date("2026-11-01T01:00:00Z");
const state = (): JourneyState => ({
  version: 1, points: 20, activeDays: 1, streak: 1, longestStreak: 1, lastActiveDate: "2026-10-31",
  createdAt: now.getTime(), updatedAt: now.getTime(),
  day: { date: "2026-10-31", readingMs: 120000, liturgyMs: 120000, exploreMs: 15000,
    areas: { arcs: true }, completed: { reading: true }, points: 20, active: true },
  pulse: { at: now.getTime(), nonce, area: "liturgy", active: true },
});
const request = (body?: unknown, origin = "https://biblia.test") => new Request("https://biblia.test/api/jornada", {
  method: body === undefined ? "GET" : "POST",
  headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.100" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const successCommand = () => vi.fn<JourneyRedis>(async () => ["ok", JSON.stringify(state())]);

describe("journey configuration and private identity", () => {
  it("reuses only the existing KV and rate secret without needing AI keys, and isolates deployments", () => {
    expect(config).toMatchObject({ environment: "preview", prefix: "bc:{journey}:preview:", cookieName: "__Host-bc-journey-preview" });
    const production = journeyConfig({ ...env, VERCEL_ENV: "production" })!;
    expect(production.prefix).toBe("bc:{journey}:production:");
    expect(production.cookieName).toBe("__Host-bc-journey");
    expect(journeyProfileId(cookie, production)).not.toBe(journeyProfileId(cookie, config));
    expect(journeyConfig({ ...env, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", ASSISTANT_ENABLED: "false" })).not.toBeNull();
  });
  it("fails closed for absent credentials, unverified/local hosts and invalid redis endpoints", () => {
    for (const changes of [
      { VERCEL: "" }, { VERCEL_ENV: "development" }, { KV_REST_API_TOKEN: "" }, { ASSISTANT_RATE_LIMIT_SECRET: "short" },
      { KV_REST_API_URL: "http://test.upstash.io" }, { KV_REST_API_URL: "https://evil.example" },
      { KV_REST_API_URL: "https://test.upstash.io/path" }, { KV_REST_API_URL: "https://user:pass@test.upstash.io" },
    ]) expect(journeyConfig({ ...env, ...changes })).toBeNull();
  });
  it("uses 256-bit random identity cookies, opaque HMAC profiles and separate IP-rate hashes", () => {
    expect(newJourneyCookie()).toMatch(/^[a-f0-9]{64}$/);
    expect(newJourneyNonce()).toMatch(/^[a-f0-9]{32}$/);
    expect(newJourneyCookie()).not.toBe(newJourneyCookie());
    const identity = journeyProfileId(cookie, config)!;
    const visitor = journeyVisitor(request(), config);
    expect(identity).toMatch(/^[a-f0-9]{64}$/);
    expect(identity).not.toContain(cookie);
    expect(visitor).not.toBe(createHmac("sha256", config.secret).update("192.0.2.100").digest("hex"));
    expect(journeyProfileId("tampered", config)).toBeNull();
    const chain = new Request("https://biblia.test/api/jornada", { headers: { "x-forwarded-for": "192.0.2.1, 192.0.2.2" } });
    expect(() => journeyVisitor(chain, config)).toThrow();
  });
});

describe("journey input and HTTP trust boundary", () => {
  it("accepts only explicit opt-in, reset or a narrowly typed heartbeat", () => {
    expect(parseJourneyAction({ op: "start" })).toEqual({ op: "start" });
    expect(parseJourneyAction({ op: "pulse", token: nonce, area: "liturgy", active: true })).toEqual({ op: "pulse", token: nonce, area: "liturgy", active: true });
    for (const invalid of [
      { op: "start", points: 4800 }, { op: "pulse", token: nonce, area: "liturgy", active: true, elapsed: 180 },
      { op: "pulse", token: nonce, area: "liturgy", active: true, date: "2030-01-01" },
      { op: "pulse", token: nonce, area: "/joao/3/16", active: true },
      { op: "pulse", token: nonce, area: "liturgy", active: "true" }, { op: "reset", profileId: "other" },
    ]) expect(() => parseJourneyAction(invalid)).toThrow();
  });
  it("bounds request bodies and rejects non-JSON content", async () => {
    await expect(readJourneyAction(new Request("https://biblia.test/api/jornada", { method: "POST", body: "{}" }))).rejects.toThrow();
    await expect(readJourneyAction(new Request("https://biblia.test/api/jornada", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "x".repeat(2000) }),
    }))).rejects.toThrow();
  });
  it("status does not create a profile or identity cookie before opt-in", async () => {
    const command = vi.fn<JourneyRedis>(async () => "PONG");
    const result = await handleJourney(request(), undefined, { config, command, now: () => now });
    expect(result.body).toEqual({ ok: true, available: true, started: false });
    expect(result.cookie).toBeUndefined();
    expect(command.mock.calls).toEqual([[["PING"]]]);
  });
  it("does not report cloud readiness if the database cannot answer", async () => {
    const result = await handleJourney(request(), undefined, { config, command: async () => { throw new Error("secret provider detail"); } });
    expect(result).toMatchObject({ status: 503, body: { ok: false, available: false, started: false } });
    expect(JSON.stringify(result)).not.toContain("secret provider detail");
  });
  it("requires same-origin writes before any database mutation", async () => {
    const command = successCommand();
    const result = await handleJourney(request({ op: "start" }, "https://attacker.example"), undefined, { config, command });
    expect(result.status).toBe(403);
    expect(command).not.toHaveBeenCalled();
  });
  it("rejects forged balances from local storage without sending them to Redis", async () => {
    const command = successCommand();
    const result = await handleJourney(request({ op: "pulse", token: nonce, area: "reading", active: true, points: 999999, activeDays: 60 }), cookie, { config, command });
    expect(result.status).toBe(400);
    expect(command).not.toHaveBeenCalled();
  });
  it("uses server time/day, isolated keys, a nonce and a hashed identity when enrolling", async () => {
    const command = successCommand();
    const result = await handleJourney(request({ op: "start" }), undefined, { config, command, now: () => now, newCookie: () => cookie, newNonce: () => nonce });
    expect(result).toMatchObject({ status: 200, cookie: { name: config.cookieName, value: cookie }, body: { started: true, pulse: { token: nonce, intervalMs: 15000 } } });
    const args = command.mock.calls[0][0];
    expect(args[0]).toBe("EVAL");
    expect(args.slice(3, 8).every((key) => String(key).startsWith("bc:{journey}:preview:"))).toBe(true);
    expect(args.slice(8, 13)).toEqual(["start", journeyProfileId(cookie, config), now.getTime(), "2026-10-31", "2026-10-30"]);
    expect(JSON.stringify(args)).not.toContain(cookie);
    expect(JSON.stringify(args)).not.toContain("192.0.2.100");
    expect(JSON.stringify(args)).not.toContain("bc:{assistant}");
  });
  it("confirms enrollment when Upstash returns empty Lua maps as JSON arrays", async () => {
    const initial = {
      ...state(), points: 0, activeDays: 0, streak: 0, longestStreak: 0, lastActiveDate: "",
      day: { ...state().day, readingMs: 0, liturgyMs: 0, exploreMs: 0, areas: [], completed: [], points: 0, active: false },
      pulse: { at: 0, nonce, area: "", active: false },
    };
    const result = await handleJourney(request({ op: "start" }), undefined, {
      config, command: async () => ["ok", JSON.stringify(initial)], now: () => now, newCookie: () => cookie,
    });
    expect(result).toMatchObject({ status: 200, cookie: { name: config.cookieName, value: cookie }, body: {
      started: true, snapshot: { points: 0, activeDays: 0, todayPoints: 0, exploredAreas: 0 },
    } });
    expect(Object.values(result.body.snapshot!.tasks).every(task => !task.complete && task.seconds === 0)).toBe(true);
  });
  it("never accepts a heartbeat without an opted-in valid identity", async () => {
    const command = successCommand();
    expect(await handleJourney(request({ op: "pulse", token: nonce, area: "reading", active: true }), undefined, { config, command })).toMatchObject({ status: 409, body: { code: "expired", started: false } });
    expect(command).not.toHaveBeenCalled();
  });
  it("returns the authoritative balance and current nonce after a duplicate tab response", async () => {
    const result = await handleJourney(request({ op: "pulse", token: "c".repeat(32), area: "reading", active: true }), cookie,
      { config, command: successCommand(), now: () => now });
    expect(result.body.pulse?.token).toBe(nonce);
    expect(result.body.snapshot?.points).toBe(20);
    expect(result.body.snapshot).not.toHaveProperty("profileId");
    expect(result.body.snapshot).not.toHaveProperty("cookie");
  });
  it("returns a retry delay for rate limits and clears identity on deletion or expiration", async () => {
    expect(await handleJourney(request({ op: "start" }), cookie, { config, command: async () => ["limit"] })).toMatchObject({ status: 429, body: { code: "limit", retryAfterSeconds: 60 } });
    expect(await handleJourney(request({ op: "reset" }), cookie, { config, command: async () => ["reset"] })).toMatchObject({ status: 200, cookie: { name: config.cookieName, clear: true }, body: { started: false } });
    expect(await handleJourney(request(), cookie, { config, command: async () => ["expired"] })).toMatchObject({ status: 200, cookie: { name: config.cookieName, clear: true }, body: { started: false } });
  });
});

describe("journey snapshot and progress semantics", () => {
  it.each(["areas", "completed", "both"])("normalizes only empty Lua maps from %s without changing earned credit", (field) => {
    const original = state();
    const stored = { ...original, day: { ...original.day,
      ...(field !== "completed" ? { areas: [] } : {}), ...(field !== "areas" ? { completed: [] } : {}),
    } };
    const parsed = parseJourneyState(JSON.stringify(stored));
    expect(parsed.day.areas).toEqual(field === "completed" ? original.day.areas : {});
    expect(parsed.day.completed).toEqual(field === "areas" ? original.day.completed : {});
    expect(parsed.points).toBe(original.points); expect(parsed.activeDays).toBe(original.activeDays);
    expect(parsed.pulse).toEqual(original.pulse);
    const snapshot = journeySnapshot(parsed, now);
    expect(snapshot.points).toBe(original.points); expect(snapshot.todayPoints).toBe(original.day.points);
  });
  it.each(["areas", "completed"])("still rejects nonempty arrays and invalid map types for %s", (field) => {
    for (const invalid of [[true], ["arcs"], [{ reading: true }], [null], null, 0, false, ""]) {
      expect(() => parseJourneyState(JSON.stringify({ ...state(), day: { ...state().day, [field]: invalid } }))).toThrow();
    }
  });
  it("does not extend empty-array compatibility to the state, day or pulse", () => {
    for (const invalid of [[], { ...state(), day: [] }, { ...state(), pulse: [] }]) {
      expect(() => parseJourneyState(JSON.stringify(invalid))).toThrow();
    }
  });
  it("uses the Brazil civil date and resets only daily counters on the next day", () => {
    expect(journeyDay(now)).toBe("2026-10-31");
    const tomorrow = journeySnapshot(state(), new Date("2026-11-01T03:00:00Z"));
    expect(tomorrow).toMatchObject({ points: 20, activeDays: 1, streak: 1, todayPoints: 0, exploredAreas: 0 });
    expect(tomorrow.tasks.reading).toMatchObject({ seconds: 0, complete: false });
  });
  it("missing a day resets only the streak feedback, not points or the accumulated bonus cycle", () => {
    const stored = { ...state(), points: 400, activeDays: 6, streak: 3, longestStreak: 3 };
    const snapshot = journeySnapshot(stored, new Date("2026-11-03T12:00:00Z"));
    expect(snapshot).toMatchObject({ points: 400, activeDays: 6, streak: 0, longestStreak: 3, nextBonusInActiveDays: 1 });
  });
  it("requires both milestone conditions and never advertises a redeemable gift", () => {
    expect(journeySnapshot({ ...state(), points: 4800, activeDays: 59 }, now).milestoneReached).toBe(false);
    expect(journeySnapshot({ ...state(), points: 4780, activeDays: 60 }, now).milestoneReached).toBe(false);
    expect(journeySnapshot({ ...state(), points: 4800, activeDays: 68 }, now)).toMatchObject({ milestoneReached: true, rewardStatus: "planned" });
  });
  it("rejects corrupt or impossible stored counters instead of trusting them as credit", () => {
    expect(parseJourneyState(JSON.stringify(state())).points).toBe(20);
    for (const invalid of ["{}", JSON.stringify({ ...state(), points: -20 }), JSON.stringify({ ...state(), day: { ...state().day, readingMs: 999999 } })]) {
      expect(() => parseJourneyState(invalid)).toThrow();
    }
  });
});

describe("journey Redis transport", () => {
  it("keeps credentials server-side, disables caches/redirects and sanitizes provider failures", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ result: "PONG" }));
    expect(await journeyRedis(config, fetcher)(["PING"])).toBe("PONG");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error" });
    await expect(journeyRedis(config, async () => Response.json({ error: "SECRET_DETAIL" }))(["PING"])).rejects.not.toThrow(/SECRET_DETAIL/);
  });
});
