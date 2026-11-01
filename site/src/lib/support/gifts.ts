import { CAMPAIGN } from "./campaign";
import { encodedBytes, SupportFault, textField, uuid, type SupportLedger } from "./ledger";

export const GIFT_STATUSES = { waiting: "Aguardando", production: "Em produção", ready: "Pronto", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado" } as const;
export const GIFT_METHODS = { pickup: "Retirada gratuita", shipping: "Frete pelo apoiador" } as const;
export type GiftStatus = keyof typeof GIFT_STATUSES;
export type GiftMethod = keyof typeof GIFT_METHODS;
export type GiftDetails = { receiptId: string; name: string; contact: string; method: GiftMethod; status: GiftStatus; logisticsNote: string };
export type StoredGift = GiftDetails & { id: string; revision: number; createdAt: string; updatedAt: string };
export type GiftRecord = StoredGift & { receiptActive: boolean };
export type GiftInput = GiftDetails & { requestId: string; id: string; revision: number };
/** Audit events contain no copies of names, contacts or logistics notes. */
export type GiftEvent = { requestId: string; fingerprint: string; giftId: string; revision: number; receiptId: string; status: GiftStatus; changedFields: (keyof GiftDetails)[]; actor: string; at: string };
export type GiftStore = { version: 1; campaignId: string; gifts: StoredGift[]; events: GiftEvent[] };
export type GiftReport = { campaignId: string; environment: "production" | "preview"; gifts: GiftRecord[]; receipts: { id: string; date: string; amountCents: number; referenceTail: string; assignedGiftId?: string }[]; counts: Record<GiftStatus, number>; updatedAt: string | null; blockedReceipts: number };
export const MAX_GIFTS = 1000;
export const MAX_GIFT_EVENTS = 8000;
export const MAX_GIFT_BYTES = 3_000_000;
const detailFields = ["receiptId", "name", "contact", "method", "status", "logisticsNote"] as const;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isoDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export const emptyGiftStore = (): GiftStore => ({ version: 1, campaignId: CAMPAIGN.id, gifts: [], events: [] });

/** Contact is a duplicate warning key, not proof of the supporter's identity. */
export function normalizeGiftContact(value: unknown): string | null {
  if (!textField(value, 5, 160)) return null;
  const contact = value.trim().toLowerCase();
  if (/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(contact)) return contact;
  if (!/^\+?[\d ().-]+$/.test(contact)) return null;
  const digits = contact.replace(/\D/g, "");
  if (contact.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (/^[1-9]\d{9,10}$/.test(digits)) return `+55${digits}`;
  return /^55[1-9]\d{9,10}$/.test(digits) ? `+${digits}` : null;
}
function validDetails(value: Record<string, unknown>): boolean {
  const contact = normalizeGiftContact(value.contact);
  return uuid(value.receiptId) && textField(value.name, 2, 80) && typeof value.contact === "string" && contact !== null && contact === value.contact && Object.hasOwn(GIFT_METHODS, String(value.method)) && Object.hasOwn(GIFT_STATUSES, String(value.status)) && textField(value.logisticsNote, 0, 240) && (value.status !== "shipped" || value.method === "shipping");
}
export function giftInput(body: unknown): GiftInput {
  if (!record(body) || Object.keys(body).some(key => !["requestId", "id", "revision", ...detailFields].includes(key)) || !uuid(body.requestId) || !uuid(body.id) || !Number.isSafeInteger(body.revision) || (body.revision as number) < 0) throw new SupportFault(400, "Confira a ficha do presente antes de salvar.");
  const normalized = { ...body, name: typeof body.name === "string" ? body.name.trim() : body.name, contact: normalizeGiftContact(body.contact), logisticsNote: typeof body.logisticsNote === "string" ? body.logisticsNote.trim() : body.logisticsNote };
  if (normalized.contact === null || !validDetails(normalized)) throw new SupportFault(400, "Informe nome, e-mail ou telefone com DDD e a forma de entrega. Apenas envios podem ter o status Enviado.");
  return normalized as GiftInput;
}
export function parseGiftStore(raw: unknown): GiftStore {
  if (raw === null) return emptyGiftStore();
  if (typeof raw !== "string" || encodedBytes(raw) > MAX_GIFT_BYTES) throw new Error("Invalid gift store");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || value.campaignId !== CAMPAIGN.id || !Array.isArray(value.gifts) || value.gifts.length > MAX_GIFTS || !Array.isArray(value.events) || value.events.length > MAX_GIFT_EVENTS) throw new Error("Invalid gift store");
  const gifts = new Map<string, StoredGift>(), contacts = new Set<string>(), receipts = new Set<string>();
  for (const gift of value.gifts) {
    if (!record(gift) || !uuid(gift.id) || !validDetails(gift) || !Number.isSafeInteger(gift.revision) || (gift.revision as number) < 1 || !isoDate(gift.createdAt) || !isoDate(gift.updatedAt) || gift.updatedAt < gift.createdAt || gifts.has(gift.id) || contacts.has(gift.contact as string) || receipts.has(gift.receiptId as string)) throw new Error("Invalid gift store");
    gifts.set(gift.id, gift as StoredGift); contacts.add(gift.contact as string); receipts.add(gift.receiptId as string);
  }
  const requests = new Set<string>(), revisions = new Map<string, number>(), lastEvents = new Map<string, GiftEvent>();
  for (const event of value.events) {
    if (!record(event) || !uuid(event.requestId) || requests.has(event.requestId) || !uuid(event.giftId) || !gifts.has(event.giftId) || event.revision !== (revisions.get(event.giftId) ?? 0) + 1 || !uuid(event.receiptId) || !Object.hasOwn(GIFT_STATUSES, String(event.status)) || !textField(event.actor, 8, 80) || !isoDate(event.at) || typeof event.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(event.fingerprint) || !Array.isArray(event.changedFields) || event.changedFields.some(field => !detailFields.includes(field))) throw new Error("Invalid gift audit");
    const previousEvent = lastEvents.get(event.giftId);
    if (previousEvent && event.at < previousEvent.at || !previousEvent && event.at !== gifts.get(event.giftId)!.createdAt) throw new Error("Invalid gift chronology");
    requests.add(event.requestId); revisions.set(event.giftId, event.revision as number); lastEvents.set(event.giftId, event as GiftEvent);
  }
  if ([...gifts.values()].some(gift => { const last = lastEvents.get(gift.id); return revisions.get(gift.id) !== gift.revision || last?.at !== gift.updatedAt || last?.status !== gift.status || last?.receiptId !== gift.receiptId; })) throw new Error("Invalid gift revision");
  return { version: 1, campaignId: CAMPAIGN.id, gifts: value.gifts as StoredGift[], events: value.events as GiftEvent[] };
}
export function activeGiftReceipts(ledger: SupportLedger) {
  const reversed = new Set(ledger.entries.filter(entry => entry.kind === "reversal").map(entry => entry.targetId));
  return new Map(ledger.entries.filter(entry => entry.kind === "receipt" && !reversed.has(entry.id)).map(entry => [entry.id, entry]));
}
export function giftReport(store: GiftStore, ledger: SupportLedger, environment: "production" | "preview"): GiftReport {
  const active = activeGiftReceipts(ledger), receiptReferences = new Map(ledger.entries.filter(entry => entry.kind === "receipt").map(entry => [entry.id, entry.referenceHash]));
  const assigned = new Map(store.gifts.map(gift => [receiptReferences.get(gift.receiptId), gift.id]));
  const counts: Record<GiftStatus, number> = { waiting: 0, production: 0, ready: 0, shipped: 0, delivered: 0, cancelled: 0 };
  const gifts = store.gifts.map(gift => { counts[gift.status]++; return { ...gift, receiptActive: active.has(gift.receiptId) }; }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { campaignId: CAMPAIGN.id, environment, gifts, counts, blockedReceipts: gifts.filter(gift => !gift.receiptActive && gift.status !== "cancelled").length,
    receipts: [...active.values()].reverse().map(entry => ({ id: entry.id, date: entry.occurredOn, amountCents: entry.amountCents!, referenceTail: entry.referenceTail!, ...(assigned.has(entry.referenceHash) ? { assignedGiftId: assigned.get(entry.referenceHash) } : {}) })), updatedAt: store.events.at(-1)?.at ?? null };
}
/** Updates logistics only. The separate financial/aggregate ledger is never changed. */
export function saveGift(store: GiftStore, ledger: SupportLedger, input: GiftInput, fingerprint: string, actor: string, now: string): boolean {
  const priorRequest = store.events.find(event => event.requestId === input.requestId);
  if (priorRequest) {
    if (priorRequest.fingerprint !== fingerprint) throw new SupportFault(409, "Este envio já foi salvo com outros dados. Atualize o painel.");
    return false;
  }
  const previous = store.gifts.find(gift => gift.id === input.id);
  if (input.revision !== (previous?.revision ?? 0)) throw new SupportFault(409, "Esta ficha mudou em outra aba. Atualize os presentes e confira os dados antes de salvar.");
  if ((!previous && store.gifts.length >= MAX_GIFTS) || store.events.length >= MAX_GIFT_EVENTS) throw new SupportFault(409, "O limite desta etapa foi alcançado. Exporte as fichas antes de abrir uma nova etapa.");
  const active = activeGiftReceipts(ledger), receipt = active.get(input.receiptId);
  if (!receipt && !(previous && previous.receiptId === input.receiptId && input.status === "cancelled")) throw new SupportFault(409, "Vincule uma contribuição ativa, conferida no extrato. O recebimento desta ficha foi anulado ou não existe.");
  if (previous && previous.receiptId !== input.receiptId) {
    const oldReceipt = ledger.entries.find(entry => entry.id === previous.receiptId && entry.kind === "receipt");
    if (active.has(previous.receiptId) || !oldReceipt?.referenceHash || oldReceipt.referenceHash !== receipt?.referenceHash) throw new SupportFault(409, "A troca só é permitida para a correção ativa da mesma transação. Cada ficha mantém seu recebimento de origem.");
  }
  const receiptReferences = new Map(ledger.entries.filter(entry => entry.kind === "receipt").map(entry => [entry.id, entry.referenceHash]));
  if (store.gifts.some(gift => gift.id !== input.id && (gift.receiptId === input.receiptId || gift.contact === input.contact || receiptReferences.get(gift.receiptId) === receiptReferences.get(input.receiptId)))) throw new SupportFault(409, "Já existe uma ficha para esse contato ou contribuição. Localize e atualize o presente existente, inclusive se estiver cancelado.");
  const next: StoredGift = { id: input.id, revision: input.revision + 1, receiptId: input.receiptId, name: input.name, contact: input.contact, method: input.method, status: input.status, logisticsNote: input.logisticsNote, createdAt: previous?.createdAt ?? now, updatedAt: now };
  if (previous) store.gifts[store.gifts.indexOf(previous)] = next; else store.gifts.push(next);
  store.events.push({ requestId: input.requestId, fingerprint, giftId: input.id, revision: next.revision, receiptId: input.receiptId, status: input.status, changedFields: detailFields.filter(field => previous?.[field] !== input[field]), actor, at: now });
  return true;
}
