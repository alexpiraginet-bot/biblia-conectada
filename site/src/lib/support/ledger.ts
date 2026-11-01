import { CAMPAIGN, SUPPORT_CATEGORIES, validCents, type SupportCategory } from "./campaign";

export type EntryKind = "receipt" | "expense" | "production" | "delivery" | "update" | "reversal";
export type SupportEntry = {
  id: string; kind: EntryKind; createdAt: string; occurredOn: string; actor: string;
  amountCents?: number; referenceHash?: string; referenceTail?: string;
  category?: SupportCategory; quantity?: number; title: string; note: string; targetId?: string; correctsId?: string;
};
export type SupportLedger = { version: 1; campaignId: string; entries: SupportEntry[] };
export type PublicSupport = {
  campaignId: string; goalCents: number; raisedCents: number; spentCents: number; availableCents: number;
  contributions: number; miniProduced: number; miniDelivered: number; basketsDelivered: number;
  expenses: Record<SupportCategory, number>; updates: { id: string; kind: EntryKind; date: string; title: string; text: string; quantity?: number; category?: SupportCategory; amountCents?: number }[];
  updatedAt: string | null; checkedAt: string; environment: "production" | "preview";
};
export const emptyLedger = (): SupportLedger => ({ version: 1, campaignId: CAMPAIGN.id, entries: [] });
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function dateOnly(value: unknown): value is string { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function textField(value: unknown, min: number, max: number): value is string { return typeof value === "string" && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000b-\u001f\u007f<>]/.test(value); }
export class SupportFault extends Error { constructor(public status: number, message: string) { super(message); } }
// Reserve separate room for reversing every normal entry, including a full campaign.
export const MAX_CAMPAIGN_ENTRIES = 1000;
export const MAX_NORMAL_BYTES = 1_000_000;
export const MAX_AUDIT_BYTES = 2_000_000;
export const encodedBytes = (value: string): number => new TextEncoder().encode(value).byteLength;
export function validEntry(value: unknown): value is SupportEntry {
  if (!record(value) || !uuid(value.id) || !["receipt", "expense", "production", "delivery", "update", "reversal"].includes(String(value.kind)) || !textField(value.actor, 8, 80) || !dateOnly(value.occurredOn) || typeof value.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt)) || !textField(value.title, 3, 100) || !textField(value.note, 0, 1000)) return false;
  if (value.correctsId !== undefined && (!uuid(value.correctsId) || !["receipt", "expense"].includes(String(value.kind)))) return false;
  if (value.kind === "receipt" || value.kind === "expense") return validCents(value.amountCents) && typeof value.referenceHash === "string" && /^[a-f0-9]{64}$/.test(value.referenceHash) && typeof value.referenceTail === "string" && /^[A-Z0-9]{6}$/.test(value.referenceTail) && (value.kind === "receipt" || Object.hasOwn(SUPPORT_CATEGORIES, String(value.category)));
  if (value.kind === "production" || value.kind === "delivery") return Number.isSafeInteger(value.quantity) && (value.quantity as number) > 0 && (value.quantity as number) <= 10000 && (value.kind === "production" ? value.category === "mini" : ["mini", "baskets"].includes(String(value.category)));
  return value.kind === "reversal" ? uuid(value.targetId) && value.note.trim().length >= 8 && value.note.length <= 160 && encodedBytes(JSON.stringify(value)) <= 800 : true;
}
type LedgerIndex = { ids: Map<string, SupportEntry>; references: Map<string, SupportEntry>; reversed: Set<string>; normalCount: number };
function accept(index: LedgerIndex, entry: SupportEntry): void {
  if (index.ids.has(entry.id)) throw new SupportFault(409, "Identificador duplicado no histórico da campanha.");
  if (entry.kind === "reversal") {
    const target = index.ids.get(entry.targetId!);
    if (!target || target.kind === "reversal" || index.reversed.has(target.id)) throw new SupportFault(409, "Esse lançamento não pode ser anulado novamente.");
    index.reversed.add(target.id);
  } else {
    if (index.normalCount >= MAX_CAMPAIGN_ENTRIES) throw new SupportFault(409, "Limite desta campanha alcançado. Exporte os registros antes de abrir uma nova etapa. Anulações continuam disponíveis.");
    index.normalCount++;
  }
  if (entry.referenceHash) {
    const previous = index.references.get(entry.referenceHash);
    if (previous && (!index.reversed.has(previous.id) || previous.kind !== entry.kind)) throw new SupportFault(409, "Essa transação já está registrada. Para corrigir um valor, anule o registro anterior primeiro.");
    if (entry.correctsId !== previous?.id) throw new SupportFault(409, "A correção precisa manter o vínculo com o lançamento anterior.");
    index.references.set(entry.referenceHash, entry);
  }
  index.ids.set(entry.id, entry);
}
function indexLedger(entries: SupportEntry[]): LedgerIndex {
  const index: LedgerIndex = { ids: new Map(), references: new Map(), reversed: new Set(), normalCount: 0 };
  for (const entry of entries) accept(index, entry);
  return index;
}
export function parseLedger(raw: unknown): SupportLedger {
  if (raw === null) return emptyLedger();
  if (typeof raw !== "string" || encodedBytes(raw) > MAX_AUDIT_BYTES) throw new Error("Invalid campaign store");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || value.campaignId !== CAMPAIGN.id || !Array.isArray(value.entries) || value.entries.length > MAX_CAMPAIGN_ENTRIES * 2 || !value.entries.every(validEntry)) throw new Error("Invalid campaign store");
  indexLedger(value.entries);
  return { version: 1, campaignId: CAMPAIGN.id, entries: value.entries };
}
/** Pure append-only audit log. No edit or delete can silently rewrite a confirmed receipt. */
export function appendEntry(ledger: SupportLedger, entry: SupportEntry): boolean {
  if (!validEntry(entry)) throw new SupportFault(400, "Confira os dados do lançamento.");
  const index = indexLedger(ledger.entries), previous = index.ids.get(entry.id);
  if (previous) {
    const stable = (value: SupportEntry) => JSON.stringify(Object.entries(value).filter(([key]) => !["createdAt", "actor", "correctsId"].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
    if (stable(previous) !== stable(entry)) throw new SupportFault(409, "Esse envio já foi registrado com outros dados. Atualize o painel.");
    return false;
  }
  const corrected = entry.referenceHash ? index.references.get(entry.referenceHash) : undefined;
  if (corrected) entry.correctsId = corrected.id;
  accept(index, entry);
  ledger.entries.push(entry); return true;
}
export function publicSupport(ledger: SupportLedger, now: Date, environment: "production" | "preview"): PublicSupport {
  const reversed = new Set(ledger.entries.filter(e => e.kind === "reversal").map(e => e.targetId));
  const active = ledger.entries.filter(e => !reversed.has(e.id) && e.kind !== "reversal");
  const receipts = active.filter(e => e.kind === "receipt"), expenses = { project: 0, mini: 0, baskets: 0 };
  for (const entry of active.filter(e => e.kind === "expense")) expenses[entry.category!] += entry.amountCents!;
  const raisedCents = receipts.reduce((sum, e) => sum + e.amountCents!, 0), spentCents = Object.values(expenses).reduce((sum, n) => sum + n, 0);
  if (!Number.isSafeInteger(raisedCents) || !Number.isSafeInteger(spentCents)) throw new Error("Invalid campaign total");
  const quantity = (kind: EntryKind, category: SupportCategory) => active.filter(e => e.kind === kind && e.category === category).reduce((sum, e) => sum + e.quantity!, 0);
  return { campaignId: CAMPAIGN.id, goalCents: CAMPAIGN.goalCents, raisedCents, spentCents, availableCents: raisedCents - spentCents,
    contributions: receipts.length, miniProduced: quantity("production", "mini"), miniDelivered: quantity("delivery", "mini"), basketsDelivered: quantity("delivery", "baskets"), expenses,
    updates: active.filter(e => e.kind !== "receipt").slice(-40).reverse().map(e => ({ id: e.id, kind: e.kind, date: e.occurredOn, title: e.title, text: e.note, ...(e.quantity !== undefined ? { quantity: e.quantity } : {}), ...(e.category ? { category: e.category } : {}), ...(e.amountCents !== undefined ? { amountCents: e.amountCents } : {}) })),
    updatedAt: ledger.entries.at(-1)?.createdAt ?? null, checkedAt: now.toISOString(), environment };
}
