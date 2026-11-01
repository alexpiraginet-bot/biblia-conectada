import "server-only";
import { createHash } from "node:crypto";
import { adminContext, adminError, json, limitAttempts, requireOrigin, smallJson, fields, type Dependencies, type AdminContext } from "../audience/runtime";
import { requireAdmin, credentialKey, sessionKey } from "../audience/admin-security";
import { journeyConfig } from "../rewards/config";
import { journeyRedis } from "../rewards/redis";
import { CAMPAIGN, validCents, SUPPORT_CATEGORIES } from "./campaign";
import { appendEntry, dateOnly, parseLedger, publicSupport, SupportFault, textField, uuid, MAX_AUDIT_BYTES, MAX_NORMAL_BYTES, encodedBytes, type EntryKind, type SupportEntry } from "./ledger";
const ledgerKey = (environment: string) => `bc:{audience}:${environment}:support:${CAMPAIGN.id}:ledger`;
/** Same Redis hash slot as admin auth. CAS and authorization are checked again at commit time. */
export const SUPPORT_COMMIT_LUA = `
if (redis.call('GET', KEYS[2]) or '') ~= ARGV[3] or redis.call('EXISTS', KEYS[3]) == 0 then return -1 end
if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`;
function failure(error: unknown): Response { return error instanceof SupportFault ? json({ message: error.message }, error.status) : adminError(error); }
export async function supportPublicResponse(dependencies: Dependencies = {}): Promise<Response> {
  try {
    const config = dependencies.config === undefined ? journeyConfig() : dependencies.config;
    if (!config) throw new Error("Campaign store unavailable");
    const command = dependencies.command ?? journeyRedis(config), now = (dependencies.now ?? (() => new Date()))();
    const ledger = parseLedger(await command(["GET", ledgerKey(config.environment)]));
    return Response.json(publicSupport(ledger, now, config.environment), { headers: { "Cache-Control": "public, max-age=0, s-maxage=30", "X-Content-Type-Options": "nosniff" } });
  } catch { return Response.json({ message: "Não foi possível consultar a arrecadação agora. Tente novamente em instantes." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
export async function supportAdminGet(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    const context = adminContext(dependencies); await requireAdmin(request, context);
    const ledger = parseLedger(await context.command(["GET", ledgerKey(context.config.environment)]));
    const response = json({ ...publicSupport(ledger, context.now, context.config.environment), ledger });
    if (new URL(request.url).searchParams.get("format") === "export") response.headers.set("Content-Disposition", `attachment; filename="biblia-conectada-campanha-${context.now.toISOString().slice(0, 10)}.json"`);
    return response;
  } catch (error) { return failure(error); }
}
function entryFrom(body: unknown, context: AdminContext, actor: string): SupportEntry {
  if (!fields(body, ["id", "kind", "occurredOn", "amountCents", "reference", "category", "quantity", "title", "note", "targetId", "verified"]) || !uuid(body.id) || !dateOnly(body.occurredOn) || body.occurredOn > context.now.toISOString().slice(0, 10) || body.occurredOn < CAMPAIGN.historyReportedOn || !textField(body.title, 3, 100) || !textField(body.note, 0, 1000)) throw new SupportFault(400, "Confira o valor, a data e a descrição. Registre apenas fatos desta campanha.");
  const entry: SupportEntry = { id: body.id, kind: body.kind as EntryKind, occurredOn: body.occurredOn, createdAt: context.now.toISOString(), actor, title: body.title.trim(), note: body.note.trim() };
  if (body.kind === "receipt" || body.kind === "expense") {
    if (!validCents(body.amountCents) || body.verified !== true || typeof body.reference !== "string") throw new SupportFault(400, "Confirme o lançamento no extrato ou comprovante antes de registrar.");
    const reference = body.reference.trim().toUpperCase().replace(/[\s.-]/g, "");
    if (!/^[A-Z0-9]{16,100}$/.test(reference)) throw new SupportFault(400, "Use o identificador completo e único da transação ou do documento (16 a 100 caracteres).");
    // Stable digest of the complete transaction ID: auth-key rotation cannot reset deduplication.
    entry.amountCents = body.amountCents; entry.referenceHash = createHash("sha256").update(`support:v1:${context.config.environment}:${CAMPAIGN.id}:${reference}`).digest("hex"); entry.referenceTail = reference.slice(-6);
    if (body.kind === "expense") entry.category = body.category as keyof typeof SUPPORT_CATEGORIES;
  } else if (body.kind === "production" || body.kind === "delivery") { entry.category = body.category as keyof typeof SUPPORT_CATEGORIES; entry.quantity = body.quantity as number; }
  else if (body.kind === "reversal") entry.targetId = body.targetId as string;
  return entry;
}
export async function supportAdminPost(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies); const access = await requireAdmin(request, context);
    await limitAttempts(request, context, "support-write", 20);
    const entry = entryFrom(await smallJson(request, 4096), context, access.state.userId);
    const key = ledgerKey(context.config.environment);
    for (let attempt = 0; attempt < 4; attempt++) {
      const raw = await context.command(["GET", key]), ledger = parseLedger(raw);
      if (!appendEntry(ledger, entry)) return json({ ok: true, duplicate: true });
      const next = JSON.stringify(ledger);
      if (encodedBytes(next) > (entry.kind === "reversal" ? MAX_AUDIT_BYTES : MAX_NORMAL_BYTES)) throw new SupportFault(409, "Exporte os registros e abra uma nova etapa da campanha. Anulações têm capacidade reservada.");
      const committed = await context.command(["EVAL", SUPPORT_COMMIT_LUA, 3, key, credentialKey(context.config), sessionKey(context.config, access.token), typeof raw === "string" ? raw : "", next, access.raw ?? ""]);
      if (committed === -1) return json({ error: "login", message: "Entre novamente para registrar o lançamento." }, 401);
      if (committed === 1) return json({ ok: true, duplicate: false });
      if (committed !== 0) throw new Error("Invalid campaign store response");
    }
    throw new SupportFault(409, "O painel recebeu outro lançamento. Tente novamente; o mesmo envio não será contado duas vezes.");
  } catch (error) { return failure(error); }
}
