import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { audienceCsv, audienceDay, buildAudienceReport, parseAudienceEvent, reportDays } from "../src/lib/audience/core";
import { audienceConfig, audienceLogin, audienceReportResponse, collectAudience, digest, type AudienceConfig } from "../src/lib/audience/server";
import { journeyRedis, type JourneyRedis } from "../src/lib/rewards/redis";

import { adminStore, responseCookie } from "./helpers/admin-auth";

const password = "test-admin-key-with-at-least-32-characters";
const env = { VERCEL: "1", VERCEL_ENV: "preview", KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-token", ASSISTANT_RATE_LIMIT_SECRET: "test-secret-with-more-than-32-characters", AUDIENCE_ENABLED: "true", AUDIENCE_ADMIN_PASSWORD_HASH: digest(password) };
const config = audienceConfig(env)!;
const now = new Date("2026-11-01T12:00:00Z");
const event = { id: "a".repeat(32), event: "view", area: "liturgy", channel: "google_ads", campaign: "liturgy_search" };
const request = (body?: unknown, extra: Record<string, string> = {}) => new Request("https://biblia.test/api/audience", { method: "POST", headers: { origin: "https://biblia.test", "content-type": "application/json", "x-forwarded-for": "192.0.2.100", ...extra }, body: JSON.stringify(body ?? event) });
const reportRequest = (query = "days=7") => new Request(`https://biblia.test/api/admin/audience?${query}`);
const deps = (command: JourneyRedis) => ({ config, command, now: () => now });

describe("audience privacy and measurement boundaries", () => {
  it("accepts only enumerated dimensions and rejects any personal/text fields", () => {
    expect(parseAudienceEvent(event)).toEqual(event);
    for (const changed of [{ url: "/coracao?q=segredo" }, { email: "reader@example.test" }, { verse: "joao/3/16" }, { area: "__proto__" }, { channel: "constructor" }, { campaign: "custom text" }, { id: "visitor-id" }, { event: "purchase" }]) expect(parseAudienceEvent({ ...event, ...changed })).toBeNull();
    for (const body of [null, [], "text", { ...event, area: null }, { ...event, channel: [] }]) expect(parseAudienceEvent(body)).toBeNull();
  });
  it("uses the Sao Paulo calendar across UTC midnight and month boundaries", () => {
    expect(audienceDay(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10-31");
    expect(reportDays(new Date("2026-11-01T01:00:00Z"), 3)).toEqual(["2026-10-29", "2026-10-30", "2026-10-31"]);
  });
  it("distinguishes uncollected history from measured zero and never invents people", () => {
    const report = buildAudienceReport(["2026-11-01T10:00:00Z", [], [], ["views", "12", "engaged", "4", "area:liturgy", "12", "channel:google_ads", "12"]], ["2026-10-30", "2026-10-31", "2026-11-01"], now, "production", true, false);
    expect(report.rows.map(r => r.covered)).toEqual([false, false, true]);
    expect(report.totals).toEqual({ views: 12, engaged: 4, capped: 0 });
    expect(report.uniqueVisitors).toBeNull(); expect(report.returningVisitors).toBeNull();
    expect(report.google.account).toBe("alex.piragine@gmail.com");
    const csv = audienceCsv(report);
    expect(csv).toContain('"2026-10-30","não","","",""');
    expect(csv).toContain('"2026-11-01","sim","12","4","0"');
    expect(csv).toContain("contadores agregados");
  });
  it("reports no history until the first event and rejects corrupt counter responses", () => {
    expect(buildAudienceReport([null, []], ["2026-11-01"], now, "production", true, false).startedAt).toBeNull();
    expect(buildAudienceReport([null, []], ["2026-11-01"], now, "production", true, true, true).google.adsConfigured).toBe(true);
    for (const raw of [null, [], [false, {}], [false, ["views", -1]], [false, ["views", 1.5]], [false, ["views"]]]) expect(() => buildAudienceReport(raw, ["2026-11-01"], now, "production", true, false)).toThrow();
  });
  it("isolates audience from journey, preview from production and never requires AI keys", () => {
    expect(config.prefix).toBe("bc:{audience}:preview:");
    expect(audienceConfig({ ...env, VERCEL_ENV: "production" })!.prefix).toBe("bc:{audience}:production:");
    expect(audienceConfig({ ...env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" })).not.toBeNull();
    expect(audienceConfig({ ...env, VERCEL: "" })).toBeNull();
    expect(audienceConfig({ ...env, AUDIENCE_ADMIN_PASSWORD_HASH: "plaintext" })!.passwordHash).toBeNull();
    expect(audienceConfig({ ...env, NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: '</script>' })!.measurementId).toBeNull();
  });
});

describe("audience authorization and abuse boundary", () => {
  it("protects all report formats before consulting Redis", async () => {
    const command = vi.fn<JourneyRedis>();
    for (const format of ["json", "csv", "export"]) expect((await audienceReportResponse(reportRequest(`days=7&format=${format}`), undefined, deps(command))).status).toBe(401);
    expect(command).not.toHaveBeenCalled();
  });
  it("rejects foreign origins, extra body fields and missing trusted edge before writing", async () => {
    const command = vi.fn<JourneyRedis>();
    for (const [body, headers, status] of [[event, { origin: "https://evil.test" }, 403], [{ ...event, query: "private" }, {}, 400], [event, { "x-forwarded-for": "" }, 503], [event, { "x-forwarded-for": "192.0.2.1,192.0.2.2" }, 503], [event, { "content-type": "text/plain" }, 400]] as const) expect((await collectAudience(request(body, headers), deps(command))).status).toBe(status);
    expect(command).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "HeadlessChrome Playwright" }, { "user-agent": "Googlebot" }])("does not count excluded traffic %j", async headers => {
    const command = vi.fn<JourneyRedis>();
    const response = await collectAudience(request(event, headers), deps(command));
    expect(await response.json()).toEqual({ accepted: false }); expect(command).not.toHaveBeenCalled();
  });
  it("limits body size and refuses disabled collection", async () => {
    const command = vi.fn<JourneyRedis>();
    expect((await collectAudience(request({ ...event, extra: "x".repeat(1100) }), deps(command))).status).toBe(400);
    expect((await collectAudience(request(), { ...deps(command), config: { ...config, enabled: false } })).status).toBe(503);
    expect(command).not.toHaveBeenCalled();
  });
  it("stores only coarse fields, page nonce and short-lived opaque abuse keys", async () => {
    const command = vi.fn<JourneyRedis>(async () => "ok");
    expect(await (await collectAudience(request(), deps(command))).json()).toEqual({ accepted: true, duplicate: false });
    const args = command.mock.calls[0][0];
    expect(JSON.stringify(args)).not.toContain("192.0.2.100");
    expect(JSON.stringify(args)).not.toContain("biblia.test");
    expect(args[4]).toBe(`bc:{audience}:preview:nonce:${event.id}`);
  });
  it("maps duplicate, premature, capped and unavailable writes truthfully", async () => {
    for (const [result, status] of [["duplicate", 200], ["missing", 422], ["early", 422], ["rate", 429], ["cap", 429]] as const) expect((await collectAudience(request(), deps(async () => result))).status).toBe(status);
    expect((await collectAudience(request(), deps(async () => { throw new Error("private backend details"); }))).status).toBe(503);
  });
  it("accepts only the admin key and creates a secure host-only cookie", async () => {
    const command = vi.fn<JourneyRedis>(adminStore().command);
    expect((await audienceLogin(request({ password: "incorrect-key-value" }), deps(command))).status).toBe(401);
    const response = await audienceLogin(request({ password, remember: false }), deps(command));
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toMatch(/__Host-bc-admin-preview=.+; Path=\/; Max-Age=28800; Secure; HttpOnly; SameSite=Strict/);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect((await audienceLogin(request({ password }), deps(async () => 6))).status).toBe(429);
    expect((await audienceLogin(request({ password }, { origin: "https://evil.test" }), deps(command))).status).toBe(403);
  });
  it("bounds reports and exports actual source with an integrity hash", async () => {
    const store = adminStore();
    const login = await audienceLogin(request({ password }), deps(store.command));
    const cookie = responseCookie(login, config.cookieName);
    const command = vi.fn<JourneyRedis>(async args => args[0] === "EVAL" ? [now.toISOString(), ...Array.from({ length: 7 }, () => [])] : store.command(args));
    for (const query of ["days=100000", "days=7&days=90", "days=7&format=html", "days=7&q=private"]) expect((await audienceReportResponse(reportRequest(query), cookie, deps(command))).status).toBe(400);
    expect(command).not.toHaveBeenCalled();
    const response = await audienceReportResponse(reportRequest(), cookie, deps(command));
    const body = await response.json();
    expect(body.sha256).toBe(digest(JSON.stringify(body.report)));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const unavailable = await audienceReportResponse(reportRequest(), cookie, deps(async () => { throw new Error("offline"); }));
    expect(unavailable.status).toBe(503); expect(await unavailable.text()).toContain("não foram substituídos por zeros");
  });
});

// Explicit opt-in only: real atomic Lua, isolated keys and deterministic cleanup. Never writes public metrics.
describe.skipIf(process.env.AUDIENCE_INTEGRATION !== "1")("audience real Redis integration", () => {
  it("deduplicates, enforces time/caps, survives midnight and serves only authenticated aggregates", async () => {
    const live = audienceConfig({ ...process.env, VERCEL: "1", VERCEL_ENV: "preview", AUDIENCE_ENABLED: "true", AUDIENCE_ADMIN_PASSWORD_HASH: digest(password) });
    expect(live).not.toBeNull();
    const isolated: AudienceConfig = { ...live!, prefix: `bc:{audience-qa}:preview:${randomBytes(12).toString("hex")}:` };
    const remote = journeyRedis(isolated); const keys = new Set<string>();
    const command: JourneyRedis = async args => { for (const key of (args[0] === "EVAL" ? args.slice(3, 3 + Number(args[2])) : args[0] === "DEL" ? args.slice(1) : args.slice(1, 2))) { if (typeof key !== "string" || !key.startsWith(isolated.prefix)) throw new Error("Unsafe QA key"); keys.add(key); } return remote(args); };
    let clock = new Date("2026-11-02T02:59:40Z");
    const options = { config: isolated, command, now: () => clock };
    try {
      expect((await collectAudience(request(), options)).status).toBe(200);
      expect(await (await collectAudience(request(), options)).json()).toEqual({ accepted: false, duplicate: true });
      expect((await collectAudience(request({ ...event, event: "engaged" }), options)).status).toBe(422);
      clock = new Date(clock.getTime() + 31000);
      expect(await (await collectAudience(request({ ...event, event: "engaged" }), options)).json()).toEqual({ accepted: true, duplicate: false });
      expect(await (await collectAudience(request({ ...event, event: "engaged" }), options)).json()).toEqual({ accepted: false, duplicate: true });
      const login = await audienceLogin(request({ password }), options); expect(login.status).toBe(200);
      const cookie = login.headers.get("set-cookie")!.split(";")[0].split("=")[1];
      const response = await audienceReportResponse(reportRequest(), cookie, options); const body = await response.json();
      expect(body.report.totals).toEqual({ views: 1, engaged: 1, capped: 0 });
      expect(body.report.rows.at(-2).views).toBe(1); expect(body.report.rows.at(-1).engaged).toBe(1);
      expect(body.sha256).toBe(digest(JSON.stringify(body.report)));
      const dayKey = isolated.prefix + "day:2026-11-02"; keys.add(dayKey);
      await remote(["HSET", dayKey, "received", 25000]);
      expect((await collectAudience(request({ ...event, id: "b".repeat(32) }), options)).status).toBe(429);
      const after = await (await audienceReportResponse(reportRequest(), cookie, options)).json();
      expect(after.report.totals).toEqual({ views: 1, engaged: 1, capped: 1 });
      const csv = await audienceReportResponse(reportRequest("days=7&format=csv"), cookie, options); const text = await csv.text();
      // Fetch normalizes the optional BOM; hash exactly the original UTF-8 CSV returned by the helper.
      expect(csv.headers.get("x-report-sha256")).toBe(digest(audienceCsv(after.report)));
      expect(text).toContain("preview");
    } finally { if (keys.size) await remote(["DEL", ...keys]); }
  });
});
