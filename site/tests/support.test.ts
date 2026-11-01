import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { CAMPAIGN, parseAmount } from "../src/lib/support/campaign";
import { campaignPix, ORIGINAL_PIX, pixCrc, pixFields } from "../src/lib/support/pix";
import { appendEntry, emptyLedger, parseLedger, publicSupport, MAX_CAMPAIGN_ENTRIES, MAX_NORMAL_BYTES, MAX_AUDIT_BYTES, encodedBytes, type SupportEntry } from "../src/lib/support/ledger";
import { supportAdminGet, supportAdminPost, supportPublicResponse, SUPPORT_COMMIT_LUA } from "../src/lib/support/server";
import { audienceConfig, digest } from "../src/lib/audience/runtime";
import { audienceLogin, audienceLogout } from "../src/lib/audience/admin-security";
import { adminStore, responseCookie } from "./helpers/admin-auth";

const now = new Date("2026-11-01T16:00:00Z"), origin = "https://www.bibliaconectada.company";
const password = "isolated-test-password-for-support";
const config = audienceConfig({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "support-test.vercel.app", KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-token", ASSISTANT_RATE_LIMIT_SECRET: "isolated-support-secret-at-least-32-chars", AUDIENCE_ADMIN_PASSWORD_HASH: digest(password) })!;
function fixture() {
  const store = adminStore(); let token = "", conflict = false, revokeBeforeCommit = false;
  const command: typeof store.command = async args => {
    if (args[0] === "EVAL" && args[1] === SUPPORT_COMMIT_LUA) {
      const [, , , ledger, credential, session, previous, next, expectedCredential] = args.map(String);
      if (revokeBeforeCommit) store.values.delete(session);
      if ((store.values.get(credential) ?? "") !== expectedCredential || !store.values.has(session)) return -1;
      if (conflict) { conflict = false; return 0; }
      if ((store.values.get(ledger) ?? "") !== previous) return 0;
      store.values.set(ledger, next); return 1;
    }
    return store.command(args);
  };
  const dependencies = { config, command, now: () => now };
  const request = (body?: unknown, headers: Record<string, string> = {}, method = "POST") => new Request(origin + "/api/admin/support", { method, headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.5", cookie: `${config.cookieName}=${token}`, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { dependencies, request, values: store.values, conflict() { conflict = true; }, revoke() { revokeBeforeCommit = true; }, async login() { const response = await audienceLogin(request({ password }), dependencies); expect(response.status).toBe(200); token = responseCookie(response, config.cookieName); }, post: (body: unknown) => supportAdminPost(request(body), dependencies), report: async () => (await supportPublicResponse(dependencies)).json() };
}
const receipt = (overrides = {}) => ({ id: randomUUID(), kind: "receipt", occurredOn: "2026-11-01", amountCents: 2000, reference: "E12345678202611011300ABC1234567890", title: "Contribuição conferida", note: "Private donor note", verified: true, ...overrides });
const entry = (overrides: Partial<SupportEntry> = {}): SupportEntry => ({ id: randomUUID(), kind: "receipt", createdAt: now.toISOString(), occurredOn: "2026-11-01", actor: "private-operator", amountCents: 2000, referenceHash: "a".repeat(64), referenceTail: "ABC123", title: "Contribuição confirmada", note: "Confidential note", ...overrides });

describe("Pix with the receiver supplied by the owner", () => {
  it("matches the independent BCB reference checksum and validates the original PicPay code", () => {
    const standard = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(pixCrc(standard)).toBe("1D3D"); expect(pixCrc(ORIGINAL_PIX.slice(0, -4))).toBe("348C");
    expect(pixFields(ORIGINAL_PIX).get("59")).toBe(CAMPAIGN.receiver);
  });
  it.each([...CAMPAIGN.presets, 1, 1234, 15099, 99_999_999_999])("encodes %i cents without changing receiver, key or reference", cents => {
    const code = campaignPix(cents), original = pixFields(ORIGINAL_PIX), fields = pixFields(code);
    for (const id of ["26", "52", "53", "58", "59", "60", "62"]) expect(fields.get(id)).toBe(original.get(id));
    expect(fields.get("54")).toBe(`${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`);
    expect(fields.get("63")).toBe(pixCrc(code.slice(0, -4)));
  });
  it.each([0, -1, 1.2, NaN, Infinity, 100_000_000_000])("refuses invalid amount %s", cents => expect(() => campaignPix(cents)).toThrow());
  it.each(["0", "-10", "1e3", "1.234,56", "1,234", "10.001", "", "R$20", "<1>"])("refuses ambiguous user input %s", value => expect(parseAmount(value)).toBeNull());
  it("retains exact cent values and accepts any positive contribution", () => { expect(parseAmount("0,01")).toBe(1); expect(parseAmount("12,34")).toBe(1234); expect(parseAmount(" 50 ")).toBe(5000); expect(CAMPAIGN.giftMinimumCents).toBe(1); });
  it("can be decoded from the actual QR matrix by an independent decoder", () => {
    const payload = campaignPix(1234), qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
    const scale = 6, margin = 4, size = (qr.modules.size + margin * 2) * scale, pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < qr.modules.size; y++) for (let x = 0; x < qr.modules.size; x++) if (qr.modules.get(y, x)) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const at = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4; pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
    }
    expect(jsQR(pixels, size, size)?.data).toBe(payload);
  });
});
describe("campaign ledger integrity", () => {
  it("derives totals and counts only from confirmed entries, with distinct production and deliveries", () => {
    const ledger = emptyLedger(); appendEntry(ledger, entry());
    appendEntry(ledger, entry({ kind: "expense", category: "baskets", amountCents: 500, referenceHash: "b".repeat(64), title: "Compra de alimentos", note: "Compra registrada" }));
    appendEntry(ledger, entry({ kind: "production", category: "mini", quantity: 5, referenceHash: undefined, amountCents: undefined }));
    appendEntry(ledger, entry({ kind: "delivery", category: "mini", quantity: 2, referenceHash: undefined, amountCents: undefined }));
    const report = publicSupport(ledger, now, "production"); expect(report).toMatchObject({ raisedCents: 2000, spentCents: 500, availableCents: 1500, contributions: 1, miniProduced: 5, miniDelivered: 2, basketsDelivered: 0 });
    expect(JSON.stringify(report)).not.toContain("private-operator"); expect(JSON.stringify(report)).not.toContain("referenceHash"); expect(report.updates.some(update => update.kind === "receipt")).toBe(false);
  });
  it("preserves an audit trail when correcting a receipt and rejects duplicate corrections", () => {
    const ledger = emptyLedger(), original = entry(); appendEntry(ledger, original);
    const reversal = entry({ kind: "reversal", targetId: original.id, amountCents: undefined, referenceHash: undefined, note: "Valor registrado incorretamente" }); appendEntry(ledger, reversal);
    expect(ledger.entries).toHaveLength(2); expect(publicSupport(ledger, now, "production").raisedCents).toBe(0);
    expect(() => appendEntry(ledger, { ...reversal, id: randomUUID() })).toThrow();
  });
  it("does not silently replace malformed persistence with an empty campaign", () => {
    for (const invalid of ["", "{}", "not-json", JSON.stringify({ ...emptyLedger(), entries: [{ amountCents: -50 }] })]) expect(() => parseLedger(invalid)).toThrow();
  });
  it("retains a correction link and counts only the corrected receipt", () => {
    const ledger = emptyLedger(), original = entry({ amountCents: 500 }); appendEntry(ledger, original);
    appendEntry(ledger, entry({ kind: "reversal", targetId: original.id, amountCents: undefined, referenceHash: undefined, note: "Corrigir o valor informado" }));
    const corrected = entry({ amountCents: 1000 }); appendEntry(ledger, corrected);
    expect(corrected.correctsId).toBe(original.id);
    expect(publicSupport(parseLedger(JSON.stringify(ledger)), now, "production")).toMatchObject({ raisedCents: 1000, contributions: 1 });
    expect(() => appendEntry(ledger, entry({ amountCents: 1000 }))).toThrow();
    expect(appendEntry(ledger, { ...corrected, correctsId: undefined })).toBe(false);
  });
  it("keeps correction capacity when the campaign reaches its normal entry limit", () => {
    const ledger = emptyLedger();
    ledger.entries = Array.from({ length: MAX_CAMPAIGN_ENTRIES }, () => entry({ kind: "update", referenceHash: undefined, referenceTail: undefined, amountCents: undefined }));
    expect(() => appendEntry(ledger, entry())).toThrow();
    appendEntry(ledger, entry({ kind: "reversal", targetId: ledger.entries[0].id, amountCents: undefined, referenceHash: undefined, note: "Registro que precisa ser anulado" }));
    expect(parseLedger(JSON.stringify(ledger)).entries).toHaveLength(MAX_CAMPAIGN_ENTRIES + 1);
  });
  it("rejects duplicate IDs and unlinked bank references in persisted history", () => {
    const original = entry();
    expect(() => parseLedger(JSON.stringify({ ...emptyLedger(), entries: [original, original] }))).toThrow();
    expect(() => parseLedger(JSON.stringify({ ...emptyLedger(), entries: [original, entry()] }))).toThrow();
  });
  it("reserves reversals within UTF-8 export and Redis transport limits", () => {
    // Worst-case JSON escaping can double each UTF-8 ledger when passed as an EVAL argument.
    expect(MAX_NORMAL_BYTES + MAX_CAMPAIGN_ENTRIES * 801).toBeLessThan(MAX_AUDIT_BYTES);
    expect(MAX_AUDIT_BYTES * 4 + 10_000).toBeLessThan(10_000_000);
    expect(MAX_AUDIT_BYTES + 500_000).toBeLessThan(4_500_000);
    expect(encodedBytes("ação")).toBeGreaterThan("ação".length);
    const ledger = emptyLedger(), original = entry(); appendEntry(ledger, original);
    expect(() => appendEntry(ledger, entry({kind:"reversal", targetId:original.id, referenceHash:undefined, amountCents:undefined, note:"a".repeat(161)}))).toThrow();
  });
});
describe("protected campaign endpoints", () => {
  it("requires admin authentication and same-origin writes", async () => {
    const f = fixture(); expect((await f.post(receipt())).status).toBe(401); expect((await supportAdminGet(f.request(undefined, {}, "GET"), f.dependencies)).status).toBe(401);
    await f.login(); expect((await supportAdminPost(f.request(receipt(), { origin: "https://attacker.example" }), f.dependencies)).status).toBe(403);
    expect((await f.report()).raisedCents).toBe(0);
  });
  it("is idempotent on network retries, bank references and competing writes", async () => {
    const f = fixture(); await f.login(); const body = receipt(); f.conflict();
    expect((await f.post(body)).status).toBe(200); expect(await (await f.post(body)).json()).toMatchObject({ duplicate: true });
    expect((await f.post({ ...body, id: randomUUID() })).status).toBe(409);
    expect((await f.post({ ...body, amountCents: 9999 })).status).toBe(409);
    expect(await f.report()).toMatchObject({ raisedCents: 2000, contributions: 1 });
  });
  it.each([{ verified: false }, { amountCents: 0 }, { amountCents: -100 }, { amountCents: 100.5 }, { occurredOn: "2027-01-01" }, { occurredOn: "2026-10-31" }, { reference: "1234" }, { fakeAdmin: true }])("rejects invalid or unverified receipts %j", async changes => {
    const f = fixture(); await f.login(); expect((await f.post(receipt(changes))).status).toBe(400); expect((await f.report()).raisedCents).toBe(0);
  });
  it("rechecks a revoked session atomically before committing", async () => {
    const f = fixture(); await f.login(); f.revoke(); expect((await f.post(receipt())).status).toBe(401); expect((await f.report()).raisedCents).toBe(0);
  });
  it("keeps private data out of public responses and exports with no-store", async () => {
    const f = fixture(); await f.login(); const body = receipt(); await f.post(body);
    const publicJson = JSON.stringify(await f.report()); for (const secret of [body.reference, body.note, "referenceHash", "actor"]) expect(publicJson).not.toContain(secret);
    const admin = await supportAdminGet(f.request(undefined, {}, "GET"), f.dependencies); expect(admin.headers.get("cache-control")).toContain("no-store");
    expect((await admin.json()).ledger.entries[0].referenceTail).toBe(body.reference.slice(-6));
    await audienceLogout(f.request(), f.dependencies); expect((await f.post(receipt())).status).toBe(401);
  });
  it("fails closed on a store outage instead of reporting zero raised", async () => {
    const response = await supportPublicResponse({ config, command: async () => { throw new Error("offline"); } }); expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty("raisedCents");
  });
  it("keeps bank-reference deduplication stable after rotating authentication secrets", async () => {
    const f = fixture(); await f.login(); const body = receipt(); expect((await f.post(body)).status).toBe(200);
    await audienceLogout(f.request(), f.dependencies);
    f.dependencies.config = { ...config, secret: "rotated-isolated-support-secret-at-least-32-chars" };
    await f.login(); expect((await f.post({ ...body, id: randomUUID() })).status).toBe(409);
    expect(await f.report()).toMatchObject({ raisedCents: 2000, contributions: 1 });
  });
});
