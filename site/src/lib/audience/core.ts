/** Only coarse, enumerated dimensions may enter the audience store. */
export const AUDIENCE_AREAS = { home: "Início", reading: "Leitura bíblica", liturgy: "Liturgia diária", connections: "Conexões e arcos", timeline: "Cronologia", map: "Mapas", heart: "Coração e estudo", search: "Busca", journey: "Jornada", other: "Outras seções" } as const;
export const AUDIENCE_CHANNELS = { direct: "Direto / não identificado", google: "Google orgânico / não marcado", google_ads: "Google Ads (link marcado)", instagram: "Instagram", whatsapp: "WhatsApp (link marcado)", other: "Outras origens" } as const;
export const AUDIENCE_CAMPAIGNS = { none: "Sem campanha identificada", bible_search: "Busca · Bíblia", liturgy_search: "Busca · Liturgia", social: "Redes sociais" } as const;
export type AudienceEvent = { id: string; event: "view" | "engaged"; area: keyof typeof AUDIENCE_AREAS; channel: keyof typeof AUDIENCE_CHANNELS; campaign: keyof typeof AUDIENCE_CAMPAIGNS };
export function parseAudienceEvent(value: unknown): AudienceEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "area,campaign,channel,event,id" || typeof v.id !== "string" || !/^[a-f0-9]{32}$/.test(v.id)
    || typeof v.event !== "string" || !["view", "engaged"].includes(v.event) || typeof v.area !== "string" || !Object.hasOwn(AUDIENCE_AREAS, v.area)
    || typeof v.channel !== "string" || !Object.hasOwn(AUDIENCE_CHANNELS, v.channel) || typeof v.campaign !== "string" || !Object.hasOwn(AUDIENCE_CAMPAIGNS, v.campaign)) return null;
  return v as AudienceEvent;
}
export const audienceDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export function reportDays(now: Date, count: number): string[] {
  const last = Date.parse(`${audienceDay(now)}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(last - (count - 1 - i) * 86400000).toISOString().slice(0, 10));
}
export const AUDIENCE_RETENTION_DAYS = 400;
export const AUDIENCE_DAILY_CAP = 25000;
export const AUDIENCE_METHOD = "Instrumentação própria · contadores agregados, sem identificador de visitante. Visualizações podem incluir recargas. Engajamento significa página visível por 30 segundos, não leitura concluída. Origem e campanha dependem do link/referrer e podem ficar não identificadas. Bots conhecidos e automação de teste são filtrados; isso não certifica ausência de fraude. Bloqueadores, recusas, falhas e limites podem reduzir a cobertura. Não há histórico anterior ao início da coleta, visitantes únicos nem alcance auditado por terceiro.";
export type AudienceRow = { date: string; covered: boolean; views: number; engaged: number; capped: number; areas: Record<string, number>; channels: Record<string, number>; campaigns: Record<string, number> };
export type AudienceReport = { source: string; generatedAt: string; environment: string; timezone: string; startedAt: string | null; enabled: boolean; days: number; from: string; to: string; todayPartial: true; uniqueVisitors: null; returningVisitors: null; rows: AudienceRow[]; totals: { views: number; engaged: number; capped: number }; methodology: string; retentionDays: number; dailyEventCap: number; google: { account: string; measurementConfigured: boolean; adsConfigured: false }; };
export function buildAudienceReport(raw: unknown, dates: string[], now: Date, environment: string, enabled: boolean, measurementConfigured: boolean): AudienceReport {
  if (!Array.isArray(raw) || raw.length !== dates.length + 1) throw new Error("Invalid audience response");
  const startedAt = typeof raw[0] === "string" && Number.isFinite(Date.parse(raw[0])) ? raw[0] : null;
  const firstDay = startedAt ? audienceDay(new Date(startedAt)) : null;
  const rows = dates.map((date, i): AudienceRow => {
    const pairs = raw[i + 1];
    if (!Array.isArray(pairs) || pairs.length % 2) throw new Error("Invalid audience row");
    const values = new Map<string, number>();
    for (let n = 0; n < pairs.length; n += 2) {
      const value = Number(pairs[n + 1]);
      if (typeof pairs[n] !== "string" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid audience count");
      values.set(pairs[n], value);
    }
    const dimensions = (prefix: string, keys: object) => Object.fromEntries(Object.keys(keys).map((key) => [key, values.get(`${prefix}:${key}`) ?? 0]));
    return { date, covered: !!firstDay && date >= firstDay, views: values.get("views") ?? 0, engaged: values.get("engaged") ?? 0, capped: values.get("capped") ?? 0,
      areas: dimensions("area", AUDIENCE_AREAS), channels: dimensions("channel", AUDIENCE_CHANNELS), campaigns: dimensions("campaign", AUDIENCE_CAMPAIGNS) };
  });
  return { source: "Bíblia Conectada · agregados próprios v1", generatedAt: now.toISOString(), environment, timezone: "America/Sao_Paulo", startedAt, enabled, days: dates.length,
    from: dates[0], to: dates.at(-1)!, todayPartial: true, uniqueVisitors: null, returningVisitors: null, rows,
    totals: rows.reduce((total, row) => ({ views: total.views + row.views, engaged: total.engaged + row.engaged, capped: total.capped + row.capped }), { views: 0, engaged: 0, capped: 0 }),
    methodology: AUDIENCE_METHOD, retentionDays: AUDIENCE_RETENTION_DAYS, dailyEventCap: AUDIENCE_DAILY_CAP,
    google: { account: "alex.piragine@gmail.com", measurementConfigured, adsConfigured: false } };
}
export function audienceCsv(report: AudienceReport): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines: unknown[][] = [["fonte", report.source], ["gerado_em", report.generatedAt], ["ambiente", report.environment], ["fuso", report.timezone], ["coleta_iniciada_em", report.startedAt ?? "Ainda não iniciada"], ["metodologia", report.methodology], [], ["data", "coberta", "visualizacoes", "paginas_visiveis_30s", "eventos_acima_limite"]];
  for (const row of report.rows) lines.push([row.date, row.covered ? "sim" : "não", row.covered ? row.views : "", row.covered ? row.engaged : "", row.covered ? row.capped : ""]);
  for (const [name, key, labels] of [["Área", "areas", AUDIENCE_AREAS], ["Origem", "channels", AUDIENCE_CHANNELS], ["Campanha", "campaigns", AUDIENCE_CAMPAIGNS]] as const) {
    lines.push([], [name, "visualizacoes"]);
    for (const [id, label] of Object.entries(labels)) lines.push([label, report.rows.reduce((sum, row) => sum + (row[key][id] ?? 0), 0)]);
  }
  return "\ufeff" + lines.map((line) => line.map(cell).join(",")).join("\r\n");
}
