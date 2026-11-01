export type MetricState = "unconfigured" | "ready" | "empty" | "unavailable";
export type SourceResult<T> = { state: MetricState; data: T | null; queriedAt: string | null; stale: boolean };
export type AnalyticsMetrics = { activeUsers: number; sessions: number; pageViews: number };
export type AdsCampaign = { id: string; name: string; status: string; primaryStatus: string; startDate: string; endDate: string };
export type AdsMetrics = { clicks: number; impressions: number; spend: number; conversions: number; currency: "BRL" };
export type MarketingReport = { from: string; to: string; generatedAt: string; provider: "Google via Windsor.ai"; analytics: SourceResult<AnalyticsMetrics>; campaign: SourceResult<AdsCampaign>; ads: SourceResult<AdsMetrics> };

function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function rows(body: unknown): Record<string, unknown>[] {
  if (!object(body) || body.error || (body.status && body.status !== "done") || !Array.isArray(body.data) || !body.data.every(object)) throw new Error("Invalid provider response");
  return body.data;
}
function number(value: unknown, integer = false): number {
  if (!(typeof value === "number" || typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))) throw new Error("Missing provider metric");
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > Number.MAX_SAFE_INTEGER || integer && !Number.isSafeInteger(result)) throw new Error("Invalid provider metric");
  return result;
}
function date(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid provider date");
  const result = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new Error("Invalid provider date");
  return result;
}
export function parseAnalytics(body: unknown): AnalyticsMetrics | null {
  const data = rows(body).filter(row => row.hostname === "www.bibliaconectada.company"); if (!data.length) return null;
  // One range-level aggregate. Never add daily distinct-user counts together.
  if (data.length !== 1 || "date" in data[0]) throw new Error("Analytics must be a range aggregate");
  const row = data[0];
  return { activeUsers: number(row.active_users, true), sessions: number(row.sessions, true), pageViews: number(row.screen_page_views, true) };
}
export function parseCampaign(body: unknown, campaignId: string): AdsCampaign | null {
  const data = rows(body).filter(row => String(row.campaign_id) === campaignId); if (!data.length) return null;
  if (data.length !== 1) throw new Error("Duplicate campaign response");
  const row = data[0];
  if (typeof row.campaign_name !== "string" || row.campaign_name.length > 200 || typeof row.campaign_status !== "string" || typeof row.campaign_primary_status !== "string") throw new Error("Invalid campaign response");
  return { id: campaignId, name: row.campaign_name, status: row.campaign_status, primaryStatus: row.campaign_primary_status, startDate: date(row.start_date), endDate: date(row.end_date) };
}
export function parseAdsMetrics(body: unknown, campaignId: string): AdsMetrics | null {
  const data = rows(body).filter(row => String(row.campaign_id) === campaignId); if (!data.length) return null;
  if (data.length !== 1 || "date" in data[0] || data[0].currency !== "BRL") throw new Error("Invalid campaign metric scope");
  const row = data[0];
  return { clicks: number(row.clicks, true), impressions: number(row.impressions, true), spend: number(row.spend), conversions: number(row.conversions), currency: "BRL" };
}
export function campaignStatus(campaign: AdsCampaign, today: string): string {
  if (campaign.status === "PAUSED") return "Pausada";
  if (campaign.status === "REMOVED") return "Removida";
  if (campaign.status !== "ENABLED") return "Conferir no Google";
  if (today < campaign.startDate) return "Programada";
  if (today > campaign.endDate) return "Encerrada";
  if (campaign.primaryStatus === "ELIGIBLE") return "Apta a exibir";
  if (campaign.primaryStatus === "LIMITED") return "Com limitações";
  if (campaign.primaryStatus === "NOT_ELIGIBLE" || campaign.primaryStatus === "MISCONFIGURED") return "Requer atenção";
  return "Aguardando o Google";
}
