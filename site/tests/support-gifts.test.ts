import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { audienceConfig, digest } from "../src/lib/audience/runtime";
import { audienceLogin, audienceLogout } from "../src/lib/audience/admin-security";
import { CAMPAIGN } from "../src/lib/support/campaign";
import { appendEntry, emptyLedger, publicSupport, type SupportEntry } from "../src/lib/support/ledger";
import { emptyGiftStore, giftInput, giftReport, MAX_GIFT_BYTES, normalizeGiftContact, parseGiftStore, saveGift, type GiftInput } from "../src/lib/support/gifts";
import { GIFTS_COMMIT_LUA, giftsAdminGet, giftsAdminPost, giftStoreKey, giftVersion } from "../src/lib/support/gifts-server";
import { adminStore, responseCookie } from "./helpers/admin-auth";

const now = new Date("2026-11-01T18:00:00Z"), origin = "https://www.bibliaconectada.company", password = "isolated-test-password-for-gifts";
const config = audienceConfig({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "gifts-test.vercel.app", KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-token", ASSISTANT_RATE_LIMIT_SECRET: "isolated-gifts-secret-at-least-32-chars", AUDIENCE_ADMIN_PASSWORD_HASH: digest(password) })!;
const financialKey = `bc:{audience}:preview:support:${CAMPAIGN.id}:ledger`;
const receipt = (overrides: Partial<SupportEntry> = {}): SupportEntry => ({ id: randomUUID(), kind: "receipt", amountCents: 500, referenceHash: randomUUID().replaceAll("-", "").repeat(2), referenceTail: "ABC123", title: "Pix conferido no extrato", note: "Confidential financial note", actor: "private-operator", createdAt: now.toISOString(), occurredOn: "2026-11-01", ...overrides });
const input = (receiptId: string, overrides: Partial<GiftInput> = {}): GiftInput => ({ requestId: randomUUID(), id: randomUUID(), revision: 0, receiptId, name: "Apoiador de teste", contact: "supporter@example.test", method: "pickup", status: "waiting", logisticsNote: "Combinar retirada por e-mail", ...overrides });
function fixture() {
  const store = adminStore(), ledger = emptyLedger(); const received = receipt(); appendEntry(ledger, received); store.values.set(financialKey, JSON.stringify(ledger));
  let token = "", beforeCommit: (() => void) | null = null;
  const command: typeof store.command = async args => {
    if (args[0] === "EVAL" && args[1] === GIFTS_COMMIT_LUA) {
      const [, , , gifts, financial, credential, session, previousGiftVersion, previousLedgerVersion, next, expectedCredential] = args.map(String);
      const action = beforeCommit; beforeCommit = null; action?.();
      if ((store.values.get(credential) ?? "") !== expectedCredential || !store.values.has(session)) return -1;
      if (giftVersion(store.values.get(gifts)) !== previousGiftVersion || giftVersion(store.values.get(financial)) !== previousLedgerVersion) return 0;
      store.values.set(gifts, next); return 1;
    }
    return store.command(args);
  };
  const dependencies = { config, command, now: () => now };
  const request = (body?: unknown, headers: Record<string, string> = {}, method = "POST", query = "") => new Request(origin + "/api/admin/support/gifts" + query, { method, headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.5", cookie: `${config.cookieName}=${token}`, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const reverseReceipt = () => { appendEntry(ledger, receipt({ kind: "reversal", targetId: received.id, amountCents: undefined, referenceHash: undefined, note: "Contribuição registrada incorretamente" })); store.values.set(financialKey, JSON.stringify(ledger)); };
  return { values: store.values, dependencies, request, ledger, received, reverseReceipt, beforeCommit(action: () => void) { beforeCommit = action; },
    async login() { const response = await audienceLogin(request({ password }), dependencies); expect(response.status).toBe(200); token = responseCookie(response, config.cookieName); },
    post: (body: unknown) => giftsAdminPost(request(body), dependencies), get: (query = "") => giftsAdminGet(request(undefined, {}, "GET", query), dependencies),
    addReceipt() { const next = receipt(); appendEntry(ledger, next); store.values.set(financialKey, JSON.stringify(ledger)); return next; },
    persistLedger() { store.values.set(financialKey, JSON.stringify(ledger)); },
  };
}
describe("private gift fulfillment", () => {
  it("normalizes equivalent contact formats without pretending to identify a person", () => {
    expect(normalizeGiftContact("  PERSON@EXAMPLE.COM ")).toBe("person@example.com");
    expect(normalizeGiftContact("(11) 99999-8888")).toBe("+5511999998888");
    expect(normalizeGiftContact("55 11 99999-8888")).toBe("+5511999998888");
    expect(normalizeGiftContact("+55 (11) 99999-8888")).toBe("+5511999998888");
    expect(normalizeGiftContact("+1 212 555-1234")).toBe("+12125551234");
    for (const bad of ["not an email", "123", "<x>@test.com", "11abc999998888", "\n123"]) expect(normalizeGiftContact(bad)).toBeNull();
  });
  it("validates fields and the shipped/delivery-method combination", () => {
    expect(() => giftInput(input(randomUUID(), { method: "pickup", status: "shipped" }))).toThrow();
    expect(() => giftInput({ ...input(randomUUID()), address: "not collected here" })).toThrow();
    expect(() => giftInput(input(randomUUID(), { logisticsNote: "x".repeat(241) }))).toThrow();
  });
  it("requires authentication, same origin and valid JSON; outage does not become empty history", async () => {
    const f = fixture(); expect((await f.get()).status).toBe(401); expect((await f.post(input(f.received.id))).status).toBe(401);
    await f.login();
    expect((await giftsAdminPost(f.request(input(f.received.id), { origin: "https://attacker.example" }), f.dependencies)).status).toBe(403);
    expect((await f.post({ ...input(f.received.id), fakeAdmin: true })).status).toBe(400);
    expect((await giftsAdminGet(f.request(undefined, {}, "GET"), { ...f.dependencies, command: async () => { throw new Error("offline"); } })).status).toBe(503);
    expect(f.values.has(giftStoreKey("preview"))).toBe(false);
  });
  it("links a gift to an active receipt and is idempotent without modifying any financial total", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id), financial = f.values.get(financialKey);
    expect((await f.post(body)).status).toBe(200);
    expect(await (await f.post(body)).json()).toEqual({ ok: true, duplicate: true });
    expect((await f.post({ ...body, name: "Changed retry" })).status).toBe(409);
    const report = await (await f.get()).json(); expect(report.gifts).toHaveLength(1); expect(report.gifts[0]).toMatchObject({ id: body.id, revision: 1, receiptActive: true });
    expect(report.receipts[0].assignedGiftId).toBe(body.id); expect(report.counts.waiting).toBe(1);
    expect(f.values.get(financialKey)).toBe(financial); expect(publicSupport(f.ledger, now, "preview")).toMatchObject({ raisedCents: 500, miniDelivered: 0 });
    expect((await f.post(input(randomUUID(), { contact: "other@example.test" }))).status).toBe(409);
  });
  it("rejects stale revisions and handles a lost response after a later successful update", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id); await f.post(body);
    const change = { ...body, requestId: randomUUID(), revision: 1, status: "production" }; expect((await f.post(change)).status).toBe(200);
    expect((await f.post({ ...change, requestId: randomUUID(), status: "ready" })).status).toBe(409);
    expect(await (await f.post(body)).json()).toEqual({ ok: true, duplicate: true });
    expect((await (await f.get()).json()).gifts[0]).toMatchObject({ revision: 2, status: "production" });
  });
  it("keeps one ficha per normalized contact or receipt, including cancelled gifts", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id, { contact: "(11) 99999-8888" }); await f.post(body);
    const second = f.addReceipt();
    expect((await f.post(input(second.id, { contact: "+55 11 99999-8888" }))).status).toBe(409);
    expect((await f.post(input(f.received.id, { contact: "different@example.test" }))).status).toBe(409);
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, status: "cancelled" })).status).toBe(200);
    expect((await f.post(input(second.id, { contact: "5511999998888" }))).status).toBe(409);
  });
  it("preserves a gift after receipt reversal, blocks processing, and permits cancellation", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id); await f.post(body); f.reverseReceipt();
    expect((await (await f.get()).json()).gifts[0]).toMatchObject({ receiptActive: false });
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, status: "production" })).status).toBe(409);
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, status: "cancelled" })).status).toBe(200);
    expect((await (await f.get()).json()).gifts).toHaveLength(1);
  });
  it("only relinks a corrected receipt for the same transaction", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id); await f.post(body);
    const other = f.addReceipt();
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, receiptId: other.id })).status).toBe(409);
    f.reverseReceipt();
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, receiptId: other.id })).status).toBe(409);
    const corrected = receipt({ referenceHash: f.received.referenceHash, amountCents: 1000 }); appendEntry(f.ledger, corrected); f.persistLedger();
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, receiptId: corrected.id })).status).toBe(200);
    expect((await (await f.get()).json()).gifts[0]).toMatchObject({ receiptId: corrected.id, receiptActive: true });
  });
  it("does not create another gift through a corrected receipt, even with a different contact", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id); await f.post(body); f.reverseReceipt();
    const corrected = receipt({ referenceHash: f.received.referenceHash }); appendEntry(f.ledger, corrected); f.persistLedger();
    expect((await f.post(input(corrected.id, { contact: "another@example.test" }))).status).toBe(409);
    expect((await (await f.get()).json()).receipts.find((item: { id: string }) => item.id === corrected.id).assignedGiftId).toBe(body.id);
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, status: "cancelled" })).status).toBe(200);
    expect((await f.post(input(corrected.id, { contact: "another@example.test" }))).status).toBe(409);
  });
  it("rechecks receipt eligibility if the ledger changes during commit", async () => {
    const f = fixture(); await f.login(); f.beforeCommit(f.reverseReceipt);
    expect((await f.post(input(f.received.id))).status).toBe(409); expect(f.values.has(giftStoreKey("preview"))).toBe(false);
  });
  it("rejects an in-flight update when another tab changes the same gift", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id); await f.post(body);
    const conflicting = { ...body, requestId: randomUUID(), revision: 1, status: "ready" as const };
    f.beforeCommit(() => {
      const store = parseGiftStore(f.values.get(giftStoreKey("preview")));
      saveGift(store, f.ledger, conflicting, digest("other request"), "other-operator", now.toISOString());
      f.values.set(giftStoreKey("preview"), JSON.stringify(store));
    });
    expect((await f.post({ ...body, requestId: randomUUID(), revision: 1, status: "production" })).status).toBe(409);
    expect((await (await f.get()).json()).gifts[0].status).toBe("ready");
  });
  it("rechecks revoked sessions and changed credentials atomically", async () => {
    for (const kind of ["session", "credential"]) {
      const f = fixture(); await f.login();
      f.beforeCommit(() => { for (const key of f.values.keys()) if (key.includes(`admin:${kind}`)) f.values.delete(key); });
      expect((await f.post(input(f.received.id))).status).toBe(401); expect(f.values.has(giftStoreKey("preview"))).toBe(false);
    }
  });
  it("has private no-store exports with a bounded audit that does not repeat personal details", async () => {
    const f = fixture(); await f.login(); const body = input(f.received.id); await f.post(body);
    await f.post({ ...body, requestId: randomUUID(), revision: 1, status: "production", name: "Updated name" });
    const response = await f.get("?format=export"); expect(response.headers.get("cache-control")).toContain("private, no-store"); expect(response.headers.get("content-disposition")).toContain("attachment");
    const exportData = await response.json(), audit = JSON.stringify(exportData.audit);
    expect(exportData.audit).toHaveLength(2); for (const value of [body.name, body.contact, body.logisticsNote, "Updated name"]) expect(audit).not.toContain(value);
    expect(JSON.stringify(publicSupport(f.ledger, now, "preview"))).not.toContain(body.contact);
    await audienceLogout(f.request(), f.dependencies); expect((await f.get("?format=export")).status).toBe(401);
  });
  it("does not reset corrupt or truncated records to an empty list", () => {
    expect(() => parseGiftStore("{}")).toThrow(); expect(() => parseGiftStore("invalid")).toThrow();
    const store = emptyGiftStore(), ledger = emptyLedger(), received = receipt(); appendEntry(ledger, received);
    saveGift(store, ledger, input(received.id), digest("test request"), "private-operator", now.toISOString());
    expect(giftReport(parseGiftStore(JSON.stringify(store)), ledger, "preview").counts.waiting).toBe(1);
    expect(() => parseGiftStore(JSON.stringify({ ...store, events: [] }))).toThrow();
    expect(() => parseGiftStore(JSON.stringify({ ...store, gifts: [store.gifts[0], store.gifts[0]] }))).toThrow();
  });
  it("bounds transport below Redis REST and response limits", () => {
    // Only one new snapshot is sent, along with small hashes of the previous versions.
    expect(MAX_GIFT_BYTES * 2 + 10_000).toBeLessThan(10_000_000);
    expect(MAX_GIFT_BYTES + 500_000).toBeLessThan(4_500_000);
  });
});
