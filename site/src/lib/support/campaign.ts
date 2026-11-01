/** Campaign instructions supplied by Alex on 2026-11-01. Receiving details are intentionally public. */
export const CAMPAIGN = {
  id: "palavra-e-cuidado-2026", title: "A Palavra vira cuidado.", goalCents: 500_000,
  presets: [500, 1000, 2000, 3000, 5000] as readonly number[],
  historyYears: 12, historyReportedOn: "2026-11-01", receiver: "ALEX PIRAGINE TEIXEIRA",
  provider: "PicPay", contact: "alexbmh@icloud.com",
  giftTermsReady: true, giftMinimumCents: 1,
  social: [
    { handle: "teixeira.alex1", label: "Alex · nossa história e nossas ações" },
    { handle: "bento3dlabs", label: "Bentô 3D Labs · criação e produção" },
    { handle: "bentogelateria", label: "Bentô Gelateria · conheça nosso trabalho" },
  ],
} as const;
export const SUPPORT_CATEGORIES = { project: "Bíblia Conectada", mini: "Mini Jesus · Bentô 3D Labs", baskets: "Cestas básicas" } as const;
export type SupportCategory = keyof typeof SUPPORT_CATEGORIES;
export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const validCents = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 99_999_999_999;
/** Decimal input, never floating-point multiplication or ambiguous thousands separators. */
export function parseAmount(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,9}(?:[,.]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(/[,.]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return validCents(cents) ? cents : null;
}
