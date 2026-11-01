import { describe, expect, it, vi } from "vitest";
import { campaignStatus, parseAdsMetrics, parseAnalytics, parseCampaign } from "../src/lib/audience/marketing-core";
import { marketingConfig, marketingReportResponse } from "../src/lib/audience/marketing-server";
import { audienceConfig, digest } from "../src/lib/audience/runtime";
import { audienceLogin } from "../src/lib/audience/admin-security";
import { adminStore, responseCookie } from "./helpers/admin-auth";

const password = "test-admin-key-with-at-least-32-characters";
const env = { VERCEL: "1", VERCEL_ENV: "preview", KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-token", ASSISTANT_RATE_LIMIT_SECRET: "test-secret-with-more-than-32-characters", AUDIENCE_ENABLED: "true", AUDIENCE_ADMIN_PASSWORD_HASH: digest(password) };
const config = audienceConfig(env)!;
const marketing = { apiKey: "test-private-windsor-key", propertyId: "561809611", adsAccount: "625-087-8348", campaignId: "24419681243" };
const now = new Date("2026-11-01T16:00:00Z");
const ga = { data: [{ active_users: 5, sessions: 7, screen_page_views: 12 }] };
const campaign = { data: [{ campaign_id: marketing.campaignId, campaign_name: "BC test", campaign_status: "ENABLED", campaign_primary_status: "PENDING", start_date: "2026-11-04", end_date: "2026-11-08" }] };
const metrics = { data: [{ campaign_id: marketing.campaignId, clicks: 2, impressions: 20, spend: 1.8, conversions: 1, currency: "BRL" }] };
async function fixture() {
  const store = adminStore();
  const dependencies = { config, command: store.command, now: () => now, marketing };
  const login = await audienceLogin(new Request("https://biblia.test/api/admin/session", { method: "POST", headers: { origin: "https://biblia.test", "content-type": "application/json", "x-forwarded-for": "192.0.2.10" }, body: JSON.stringify({ password }) }), dependencies);
  const cookie = responseCookie(login, config.cookieName);
  const request = (query = "days=30") => new Request(`https://biblia.test/api/admin/marketing?${query}`, { headers: { cookie: `${config.cookieName}=${cookie}` } });
  const load = vi.fn(async (_config: unknown, query: { connector: string; fields: string[] }) => query.connector === "googleanalytics4" ? ga : query.fields.includes("campaign_status") ? campaign : metrics);
  return { store, request, load, dependencies: { ...dependencies, load } };
}

describe("official measurement integrity", () => {
  it("uses one distinct-user aggregate for the entire range, never a sum of daily users", () => {
    expect(parseAnalytics(ga)).toEqual({ activeUsers: 5, sessions: 7, pageViews: 12 });
    expect(() => parseAnalytics({ data: [ga.data[0], ga.data[0]] })).toThrow();
    expect(() => parseAnalytics({ data: [{ ...ga.data[0], date: "2026-11-01" }] })).toThrow();
  });
  it("distinguishes a measured zero from missing or pending data", () => {
    expect(parseAnalytics({ data: [] })).toBeNull();
    expect(parseAnalytics({ data: [{ active_users: 0, sessions: 0, screen_page_views: 0 }] })?.activeUsers).toBe(0);
    for (const body of [{ error: "secret details", data: [] }, { status: "pending", data: [] }, { data: [{ active_users: null }] }, { data: [{ ...ga.data[0], sessions: -1 }] }]) expect(() => parseAnalytics(body)).toThrow();
  });
  it("isolates the authorized campaign from other businesses in the same account", () => {
    const result = parseAdsMetrics({ data: [{ ...metrics.data[0], campaign_id: "unrelated", spend: 9999 }, ...metrics.data] }, marketing.campaignId);
    expect(result?.spend).toBe(1.8);
    expect(parseCampaign(campaign, "unrelated")).toBeNull();
    expect(() => parseAdsMetrics({ data: [{ ...metrics.data[0], currency: "USD" }] }, marketing.campaignId)).toThrow();
  });
  it("does not equate enabled, future, paused or eligible with actual delivery", () => {
    const value = parseCampaign(campaign, marketing.campaignId)!;
    expect(campaignStatus(value, "2026-11-01")).toBe("Programada");
    expect(campaignStatus({ ...value, status: "PAUSED" }, "2026-11-01")).toBe("Pausada");
    expect(campaignStatus(value, "2026-11-09")).toBe("Encerrada");
    expect(campaignStatus({ ...value, primaryStatus: "ELIGIBLE" }, "2026-11-08")).toBe("Apta a exibir");
  });
});

describe("private reporting integration", () => {
  it("requires a valid and unrevoked admin session before any provider call", async () => {
    const f = await fixture();
    expect((await marketingReportResponse(new Request("https://biblia.test/api/admin/marketing"), f.dependencies)).status).toBe(401);
    f.store.values.clear();
    expect((await marketingReportResponse(f.request(), f.dependencies)).status).toBe(401);
    expect(f.load).not.toHaveBeenCalled();
  });
  it("restricts account and campaign scope, excludes daily-user dimensions and keeps credentials server-side", async () => {
    const f = await fixture();
    const response = await marketingReportResponse(f.request(), f.dependencies), body = await response.json();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.report.analytics.data.activeUsers).toBe(5);
    expect(body.report.ads.data.spend).toBe(1.8);
    expect(body.report.campaign.data.startDate).toBe("2026-11-04");
    expect(JSON.stringify(body)).not.toContain(marketing.apiKey);
    expect(f.load.mock.calls[0][1]).toMatchObject({ account: marketing.propertyId, from: "2026-10-03", to: "2026-11-01" });
    expect(f.load.mock.calls[0][1].fields).not.toContain("date");
    expect(f.load.mock.calls[1][1]).toMatchObject({ account: marketing.adsAccount, campaignId: marketing.campaignId });
    expect(body.sha256).toBe(digest(JSON.stringify(body.report)));
  });
  it("caches successful reads and preserves the last valid values during a provider failure", async () => {
    const f = await fixture();
    await marketingReportResponse(f.request(), f.dependencies);
    await marketingReportResponse(f.request(), f.dependencies);
    expect(f.load).toHaveBeenCalledTimes(3);
    for (const key of f.store.values.keys()) if (key.endsWith(":poll")) f.store.values.delete(key);
    f.load.mockRejectedValue(new Error("private-key-and-provider-details"));
    const response = await marketingReportResponse(f.request(), { ...f.dependencies, now: () => new Date(now.getTime() + 700_000) });
    const body = await response.json();
    expect(body.report.analytics).toMatchObject({ state: "ready", stale: true, data: { activeUsers: 5 } });
    expect(JSON.stringify(body)).not.toContain("private-key");
  });
  it("shows unavailable rather than zero when the provider fails, without losing other sources", async () => {
    const f = await fixture(); f.load.mockImplementation(async (_config, query) => { if (query.connector === "googleanalytics4") throw new Error("private"); return query.fields.includes("campaign_status") ? campaign : metrics; });
    const body = await (await marketingReportResponse(f.request(), f.dependencies)).json();
    expect(body.report.analytics).toMatchObject({ state: "unavailable", data: null });
    expect(body.report.campaign.state).toBe("ready");
  });
  it("never presents an empty GA4 response as zero people", async () => {
    const f = await fixture(); f.load.mockResolvedValue({ data: [] });
    const body = await (await marketingReportResponse(f.request(), f.dependencies)).json();
    expect(body.report.analytics).toMatchObject({ state: "empty", data: null, stale: false });
  });
  it("reports missing server credentials without silently using the assistant connector", async () => {
    const f = await fixture();
    const body = await (await marketingReportResponse(f.request(), { ...f.dependencies, marketing: null })).json();
    expect(body.report.analytics.state).toBe("unconfigured"); expect(f.load).not.toHaveBeenCalled();
    expect(marketingConfig({ WINDSOR_API_KEY: "" })).toBeNull();
  });
  it("rejects arbitrary ranges and source selectors before making provider requests", async () => {
    const f = await fixture();
    for (const query of ["days=5", "days=30&days=7", "days=30&account=elsewhere"]) expect((await marketingReportResponse(f.request(query), f.dependencies)).status).toBe(400);
    expect(f.load).not.toHaveBeenCalled();
  });
});
