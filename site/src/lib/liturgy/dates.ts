export const LITURGY_TIME_ZONE = "America/Sao_Paulo";
export const MIN_LITURGY_DATE = "2020-01-01";
export const MAX_LITURGY_DATE = "2100-12-31";

/** Calendar day in Brazil; never the server's UTC date or the date of the last build. */
export function liturgyToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LITURGY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function isLiturgyDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value < MIN_LITURGY_DATE || value > MAX_LITURGY_DATE) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function shiftLiturgyDate(value: string, days: number): string | null {
  if (!isLiturgyDate(value) || !Number.isInteger(days)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const result = date.toISOString().slice(0, 10);
  return isLiturgyDate(result) ? result : null;
}

export function formatLiturgyDate(value: string): string {
  if (!isLiturgyDate(value)) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}
