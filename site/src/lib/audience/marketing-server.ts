import "server-only";
import { request as httpsRequest } from "node:https";
import { reportDays } from "./core";
import { parseAnalytics, parseCampaign, parseAdsMetrics, type SourceResult, type MarketingReport } from "./marketing-core";
import { adminContext, adminError, digest, json, type AdminContext, type Dependencies } from "./runtime";
import { requireAdmin } from "./admin-security";

type MarketingConfig = { apiKey: string; propertyId: string | null; adsAccount: string | null; campaignId: string | null };
type Query = { connector: "googleanalytics4" | "google_ads"; account: string; fields: string[]; from: string; to: string; campaignId?: string; hostname?: string; includeInactive?: boolean };
type Loader = (config: MarketingConfig, query: Query) => Promise<unknown>;
export type MarketingDependencies = Dependencies & { marketing?: MarketingConfig | null; load?: Loader };
export function marketingConfig(env: Readonly<Record<string, string | undefined>> = process.env): MarketingConfig | null {
  const apiKey = env.WINDSOR_API_KEY?.trim(); if (!apiKey || apiKey.length < 16 || apiKey.length > 512 || /\s/.test(apiKey)) return null;
  return { apiKey, propertyId: /^\d{6,15}$/.test(env.GA4_PROPERTY_ID ?? "") ? env.GA4_PROPERTY_ID! : null,
    adsAccount: /^\d{3}-\d{3}-\d{4}$/.test(env.GOOGLE_ADS_CUSTOMER_ID ?? "") ? env.GOOGLE_ADS_CUSTOMER_ID! : null,
    campaignId: /^\d{6,20}$/.test(env.GOOGLE_ADS_CAMPAIGN_ID ?? "") ? env.GOOGLE_ADS_CAMPAIGN_ID! : null };
}
/** Fixed HTTPS destination; no redirects, raw error logging, browser key or Next fetch tracing. */
const loadWindsor: Loader = async (config, query) => {
  const url = new URL(`https://connectors.windsor.ai/${query.connector}`);
  url.search = new URLSearchParams({ api_key: config.apiKey, select_accounts: query.account, fields: query.fields.join(","), date_from: query.from, date_to: query.to, _max_rows: "10" }).toString();
  if (query.campaignId) url.searchParams.set("filter", JSON.stringify([["campaign_id", "eq", query.campaignId]]));
  if (query.hostname) url.searchParams.set("filter", JSON.stringify([["hostname", "eq", query.hostname]]));
  if (query.includeInactive) url.searchParams.set("options", JSON.stringify({ [query.connector]: { include_inactive: "true" } }));
  return new Promise((resolve, reject) => {
    const failure = () => reject(new Error("Measurement provider unavailable"));
    const request = httpsRequest(url, { method: "GET", headers: { accept: "application/json" } }, response => {
      if (response.statusCode !== 200) { response.resume(); failure(); return; }
      const chunks: Buffer[] = []; let size = 0;
      response.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 65536) { request.destroy(); failure(); } else chunks.push(chunk); });
      response.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { failure(); } });
      response.on("error", failure);
    });
    const timer = setTimeout(() => { request.destroy(); failure(); }, 10_000);
    request.on("close", () => clearTimeout(timer)); request.on("error", failure); request.end();
  });
};
const unavailable = <T>(state: "unconfigured" | "unavailable"): SourceResult<T> => ({ state, data: null, queriedAt: null, stale: false });
async function source<T>(name: string, config: MarketingConfig, query: Query, parse: (body: unknown) => T | null, context: AdminContext, load: Loader): Promise<SourceResult<T>> {
  const scope = digest(JSON.stringify({ name, query, keyVersion: digest(config.apiKey) })).slice(0, 32);
  const key = `${context.config.prefix}marketing:v1:${scope}`;
  let previous: SourceResult<T> | null = null;
  const raw = await context.command(["GET", key]);
  if (typeof raw === "string" && raw.length < 65536) {
    try { const value = JSON.parse(raw) as SourceResult<T>; if (["ready", "empty"].includes(value.state) && value.queriedAt && Number.isFinite(Date.parse(value.queriedAt))) previous = value; } catch { /* Re-read the provider if the cache is invalid. */ }
  }
  const age = previous?.queriedAt ? context.now.getTime() - Date.parse(previous.queriedAt) : Infinity;
  if (previous && age >= 0 && age < 600_000) return previous;
  // A shared cooldown also limits retries after errors and parallel refreshes.
  const lock = await context.command(["SET", key + ":poll", "1", "EX", 60, "NX"]);
  if (lock !== "OK") return previous ? { ...previous, stale: true } : unavailable("unavailable");
  try {
    const data = parse(await load(config, query));
    const result: SourceResult<T> = { state: data === null ? "empty" : "ready", data, queriedAt: context.now.toISOString(), stale: false };
    await context.command(["SET", key, JSON.stringify(result), "EX", 604800]);
    return result;
  } catch { return previous ? { ...previous, stale: true } : unavailable("unavailable"); }
}
export async function marketingReportResponse(request: Request, dependencies: MarketingDependencies = {}): Promise<Response> {
  try {
    const context = adminContext(dependencies); await requireAdmin(request, context);
    const params = new URL(request.url).searchParams, days = Number(params.get("days") ?? 30);
    if (![7, 30, 90].includes(days) || [...params.keys()].some(key => key !== "days") || params.getAll("days").length > 1) return json({ error: "range" }, 400);
    const dates = reportDays(context.now, days), from = dates[0], to = dates.at(-1)!;
    const config = dependencies.marketing === undefined ? marketingConfig() : dependencies.marketing;
    const report: MarketingReport = { from, to, generatedAt: context.now.toISOString(), provider: "Google via Windsor.ai", analytics: unavailable("unconfigured"), campaign: unavailable("unconfigured"), ads: unavailable("unconfigured") };
    if (config) {
      const load = dependencies.load ?? loadWindsor;
      const results = await Promise.allSettled([
        config.propertyId ? source("ga4", config, { connector: "googleanalytics4", account: config.propertyId, from, to, hostname: "www.bibliaconectada.company", fields: ["hostname", "active_users", "sessions", "screen_page_views"] }, parseAnalytics, context, load) : Promise.resolve(report.analytics),
        config.adsAccount && config.campaignId ? source("campaign", config, { connector: "google_ads", account: config.adsAccount, from, to, campaignId: config.campaignId, includeInactive: true, fields: ["campaign_id", "campaign_name", "campaign_status", "campaign_primary_status", "start_date", "end_date"] }, body => parseCampaign(body, config.campaignId!), context, load) : Promise.resolve(report.campaign),
        config.adsAccount && config.campaignId ? source("ads", config, { connector: "google_ads", account: config.adsAccount, from, to, campaignId: config.campaignId, fields: ["campaign_id", "clicks", "impressions", "spend", "conversions", "currency"] }, body => parseAdsMetrics(body, config.campaignId!), context, load) : Promise.resolve(report.ads),
      ]);
      report.analytics = results[0].status === "fulfilled" ? results[0].value : unavailable("unavailable");
      report.campaign = results[1].status === "fulfilled" ? results[1].value : unavailable("unavailable");
      report.ads = results[2].status === "fulfilled" ? results[2].value : unavailable("unavailable");
    }
    return json({ report, sha256: digest(JSON.stringify(report)) });
  } catch (error) { return adminError(error); }
}
