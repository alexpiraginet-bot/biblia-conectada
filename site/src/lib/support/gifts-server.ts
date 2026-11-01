import "server-only";
import { createHash } from "node:crypto";
import { adminContext, adminError, digest, json, limitAttempts, requireOrigin, smallJson, type Dependencies } from "../audience/runtime";
import { credentialKey, requireAdmin, sessionKey } from "../audience/admin-security";
import { CAMPAIGN } from "./campaign";
import { encodedBytes, parseLedger, SupportFault } from "./ledger";
import { giftInput, giftReport, MAX_GIFT_BYTES, parseGiftStore, saveGift } from "./gifts";

export const giftStoreKey = (environment: string) => `bc:{audience}:${environment}:support:${CAMPAIGN.id}:gifts`;
const ledgerKey = (environment: string) => `bc:{audience}:${environment}:support:${CAMPAIGN.id}:ledger`;
// Digests are optimistic concurrency checks, never authorization. Avoid sending the
// multi-megabyte old ledger/store twice through the Redis REST transport.
export const giftVersion = (raw: unknown) => createHash("sha1").update(typeof raw === "string" ? raw : "").digest("hex");
export const GIFTS_COMMIT_LUA = `
if (redis.call('GET', KEYS[3]) or '') ~= ARGV[4] or redis.call('EXISTS', KEYS[4]) == 0 then return -1 end
if redis.sha1hex(redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
if redis.sha1hex(redis.call('GET', KEYS[2]) or '') ~= ARGV[2] then return 0 end
redis.call('SET', KEYS[1], ARGV[3])
return 1`;
function failure(error: unknown): Response { return error instanceof SupportFault ? json({ message: error.message }, error.status) : adminError(error); }
export async function giftsAdminGet(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    const context = adminContext(dependencies); await requireAdmin(request, context);
    const [giftRaw, ledgerRaw] = await Promise.all([context.command(["GET", giftStoreKey(context.config.environment)]), context.command(["GET", ledgerKey(context.config.environment)])]);
    const store = parseGiftStore(giftRaw), report = giftReport(store, parseLedger(ledgerRaw), context.config.environment);
    const exporting = new URL(request.url).searchParams.get("format") === "export";
    const response = json(exporting ? { ...report, audit: store.events } : report);
    if (exporting) response.headers.set("Content-Disposition", `attachment; filename="biblia-conectada-presentes-${context.now.toISOString().slice(0, 10)}.json"`);
    return response;
  } catch (error) { return failure(error); }
}
export async function giftsAdminPost(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies), access = await requireAdmin(request, context);
    await limitAttempts(request, context, "support-gifts-write", 30);
    const input = giftInput(await smallJson(request, 4096));
    const fingerprint = digest(JSON.stringify(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))));
    const key = giftStoreKey(context.config.environment), financialKey = ledgerKey(context.config.environment);
    for (let attempt = 0; attempt < 4; attempt++) {
      const [raw, ledgerRaw] = await Promise.all([context.command(["GET", key]), context.command(["GET", financialKey])]);
      const store = parseGiftStore(raw), ledger = parseLedger(ledgerRaw);
      if (!saveGift(store, ledger, input, fingerprint, access.state.userId, context.now.toISOString())) return json({ ok: true, duplicate: true });
      const next = JSON.stringify(store);
      if (encodedBytes(next) > MAX_GIFT_BYTES) throw new SupportFault(409, "O arquivo de presentes atingiu o limite desta etapa. Exporte as fichas antes de continuar em uma nova etapa.");
      const committed = await context.command(["EVAL", GIFTS_COMMIT_LUA, 4, key, financialKey, credentialKey(context.config), sessionKey(context.config, access.token), giftVersion(raw), giftVersion(ledgerRaw), next, access.raw ?? ""]);
      if (committed === -1) return json({ error: "login", message: "Entre novamente para salvar o presente." }, 401);
      if (committed === 1) return json({ ok: true, duplicate: false });
      if (committed !== 0) throw new Error("Invalid gift store response");
    }
    throw new SupportFault(409, "A campanha mudou durante o envio. Atualize o painel e confira a ficha; o mesmo envio não será duplicado.");
  } catch (error) { return failure(error); }
}
