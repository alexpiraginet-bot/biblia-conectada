import "server-only";
import { randomBytes, scrypt } from "node:crypto";
import { AdminFault, adminContext, adminError, cookieValue, digest, equal, fields, json, limitAttempts, loginRequired, mac, record, requireOrigin, smallJson, type AdminContext, type AudienceConfig, type Dependencies } from "./runtime";

export const SESSION_SECONDS = 8 * 3600;
export const REMEMBER_SECONDS = 30 * 86400;
const PASSWORD_PATTERN = /^scrypt:32768:8:3:[a-f0-9]{32}:[a-f0-9]{128}$/;
export type StoredPasskey = { id: string; publicKey: string; counter: number; transports: string[]; deviceType: "singleDevice" | "multiDevice"; backedUp: boolean; name: string; createdAt: string };
export type CredentialState = { version: 1; bootstrap: string; revision: string; userId: string; password: string | null; changedAt: string | null; passkeys: StoredPasskey[] };
export type StoredCredential = { state: CredentialState; raw: string | null };
export type SessionState = { revision: string; remember: boolean; issuedAt: number; expiresAt: number };
export type AdminAccess = StoredCredential & { session: SessionState; token: string };
export const credentialKey = (config: AudienceConfig) => config.prefix + "admin:credential";
export const sessionKey = (config: AudienceConfig, token: string) => config.prefix + "admin:session:" + digest(token);
export const freshRevision = () => randomBytes(16).toString("hex");
export const validPassword = (value: unknown): value is string => typeof value === "string" && value.length >= 16 && value.length <= 128;
const isoDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const base64url = (value: unknown, max: number): value is string => typeof value === "string" && value.length > 0 && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value);
export function validPasskey(value: unknown): value is StoredPasskey {
  return record(value) && base64url(value.id, 2048) && base64url(value.publicKey, 4096) && Number.isSafeInteger(value.counter) && (value.counter as number) >= 0 && Array.isArray(value.transports) && value.transports.length <= 10 && value.transports.every(v => typeof v === "string" && v.length <= 32) && ["singleDevice", "multiDevice"].includes(value.deviceType as string) && typeof value.backedUp === "boolean" && typeof value.name === "string" && value.name.length > 0 && value.name.length <= 64 && isoDate(value.createdAt);
}
export async function readCredential(context: AdminContext): Promise<StoredCredential> {
  const raw = await context.command(["GET", credentialKey(context.config)]);
  if (raw === null) return { raw: null, state: { version: 1, bootstrap: context.config.passwordHash!, revision: digest("bootstrap:" + context.config.passwordHash).slice(0, 32), userId: mac("passkey-user", context.config), password: null, changedAt: null, passkeys: [] } };
  if (typeof raw !== "string" || raw.length > 65536) throw new Error("Invalid credential store");
  const state: unknown = JSON.parse(raw);
  if (!record(state) || state.version !== 1 || state.bootstrap !== context.config.passwordHash || typeof state.revision !== "string" || !/^[a-f0-9]{32}$/.test(state.revision) || typeof state.userId !== "string" || !/^[a-f0-9]{64}$/.test(state.userId) || !(state.password === null || typeof state.password === "string" && PASSWORD_PATTERN.test(state.password)) || !(state.changedAt === null || isoDate(state.changedAt)) || (state.password === null) !== (state.changedAt === null) || !Array.isArray(state.passkeys) || state.passkeys.length > 5 || !state.passkeys.every(validPasskey) || new Set(state.passkeys.map(p => p.id)).size !== state.passkeys.length) throw new Error("Invalid credential store");
  return { raw, state: state as CredentialState };
}
function derive(password: string, salt: string): Promise<Buffer> {
  // OWASP's equivalent 32 MiB scrypt configuration; async work keeps the event loop free.
  return new Promise((resolve, reject) => scrypt(password, Buffer.from(salt, "hex"), 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  if (!validPassword(password)) throw new AdminFault("password", 400, "Use uma senha de 16 a 128 caracteres. Uma frase longa também funciona.");
  const salt = randomBytes(16).toString("hex");
  return `scrypt:32768:8:3:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function passwordMatches(password: unknown, state: CredentialState): Promise<boolean> {
  if (!validPassword(password)) return false;
  if (!state.password) return equal(digest(password), state.bootstrap);
  if (!PASSWORD_PATTERN.test(state.password)) throw new Error("Invalid password hash");
  const parts = state.password.split(":");
  return equal((await derive(password, parts[4])).toString("hex"), parts[5]);
}
export function verifySessionToken(token: string | undefined, config: AudienceConfig, now: number): boolean {
  if (!token || !/^v2\.\d{10}\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  const [, expiry, nonce, signature] = token.split("."); const remaining = Number(expiry) - Math.floor(now / 1000);
  return remaining > 0 && remaining <= REMEMBER_SECONDS && equal(signature, mac(`session:${config.prefix}:${expiry}.${nonce}:${config.passwordHash}`, config));
}
export async function readAdmin(token: string | undefined, context: AdminContext): Promise<AdminAccess | null> {
  if (!verifySessionToken(token, context.config, context.now.getTime())) return null;
  const raw = await context.command(["GET", sessionKey(context.config, token!)]);
  if (raw === null) return null;
  if (typeof raw !== "string") throw new Error("Invalid session");
  const session: unknown = JSON.parse(raw);
  const now = Math.floor(context.now.getTime() / 1000);
  if (!record(session) || typeof session.revision !== "string" || typeof session.remember !== "boolean" || !Number.isSafeInteger(session.issuedAt) || !Number.isSafeInteger(session.expiresAt) || (session.issuedAt as number) > now || (session.expiresAt as number) <= now || session.expiresAt !== Number(token!.split(".")[1]) || (session.expiresAt as number) - (session.issuedAt as number) !== (session.remember ? REMEMBER_SECONDS : SESSION_SECONDS)) throw new Error("Invalid session");
  const credential = await readCredential(context);
  return session.revision === credential.state.revision ? { ...credential, session: session as SessionState, token: token! } : null;
}
export async function requireAdmin(request: Request, context: AdminContext): Promise<AdminAccess> {
  const access = await readAdmin(cookieValue(request, context.config.cookieName), context);
  if (!access) throw loginRequired();
  return access;
}
// Compare and swap credentials and session together. A stale request cannot undo a password change.
export const COMMIT_SESSION_LUA = `
local previous = redis.call('GET', KEYS[1]) or ''
if previous ~= ARGV[1] then return 0 end
if ARGV[5] == '1' and redis.call('EXISTS', KEYS[3]) == 0 then return -1 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
if KEYS[3] ~= KEYS[2] then redis.call('DEL', KEYS[3]) end
return 1`;
export async function commitSession(context: AdminContext, previous: StoredCredential, next: CredentialState, remember: boolean, response: Response, oldToken?: string): Promise<Response> {
  const duration = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const issuedAt = Math.floor(context.now.getTime() / 1000); const expiresAt = issuedAt + duration;
  const nonce = randomBytes(32).toString("hex");
  const token = `v2.${expiresAt}.${nonce}.${mac(`session:${context.config.prefix}:${expiresAt}.${nonce}:${context.config.passwordHash}`, context.config)}`;
  const session: SessionState = { revision: next.revision, remember, issuedAt, expiresAt };
  const stored = await context.command(["EVAL", COMMIT_SESSION_LUA, 3, credentialKey(context.config), sessionKey(context.config, token), oldToken ? sessionKey(context.config, oldToken) : sessionKey(context.config, token), previous.raw ?? "", JSON.stringify(next), JSON.stringify(session), duration, oldToken ? "1" : "0"]);
  if (stored === -1) throw loginRequired();
  if (stored !== 1) throw new AdminFault("changed", 409, "O acesso mudou em outra aba. Entre novamente e repita a operação.");
  response.headers.append("Set-Cookie", `${context.config.cookieName}=${token}; Path=/; Max-Age=${duration}; Secure; HttpOnly; SameSite=Strict`);
  return response;
}
export async function audienceLogin(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies);
    await limitAttempts(request, context, "login");
    const body = await smallJson(request, 2048);
    if (!fields(body, ["password", "remember"]) || !(body.remember === undefined || typeof body.remember === "boolean")) throw new AdminFault("invalid", 400, "Confira a senha e tente novamente.");
    const previous = await readCredential(context);
    if (!await passwordMatches(body.password, previous.state)) throw new AdminFault("credentials", 401, "Não foi possível entrar. Confira a senha.");
    return await commitSession(context, previous, previous.state, body.remember !== false, json({ ok: true }));
  } catch (error) { return adminError(error); }
}
export async function audienceLogout(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies); const token = cookieValue(request, context.config.cookieName);
    if (verifySessionToken(token, context.config, context.now.getTime())) await context.command(["DEL", sessionKey(context.config, token!)]);
    const response = json({ ok: true });
    response.headers.set("Set-Cookie", `${context.config.cookieName}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
    return response;
  } catch (error) { return adminError(error); }
}
export async function adminSecurity(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    const access = await requireAdmin(request, adminContext(dependencies));
    return json({ passwordChangedAt: access.state.changedAt, passkeys: access.state.passkeys.map(({ id, name, createdAt }) => ({ id, name, createdAt })), remember: access.session.remember, expiresAt: new Date(access.session.expiresAt * 1000).toISOString() });
  } catch (error) { return adminError(error); }
}
export async function changeAdminPassword(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies); const access = await requireAdmin(request, context);
    await limitAttempts(request, context, "security");
    const body = await smallJson(request, 4096);
    if (!fields(body, ["currentPassword", "newPassword", "confirmPassword"]) || !validPassword(body.newPassword) || body.newPassword !== body.confirmPassword) throw new AdminFault("password", 400, "Use de 16 a 128 caracteres e repita a nova senha nos dois campos.");
    if (!await passwordMatches(body.currentPassword, access.state)) throw new AdminFault("password", 400, "A senha atual não confere.");
    if (body.currentPassword === body.newPassword) throw new AdminFault("password", 400, "Escolha uma senha diferente da atual.");
    const state = { ...access.state, password: await hashPassword(body.newPassword), changedAt: context.now.toISOString(), revision: freshRevision() };
    return await commitSession(context, access, state, access.session.remember, json({ ok: true, message: "Senha alterada. Os outros acessos foram encerrados." }), access.token);
  } catch (error) { return adminError(error); }
}
export async function removeAdminPasskey(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies); const access = await requireAdmin(request, context);
    await limitAttempts(request, context, "security");
    const body = await smallJson(request, 4096);
    if (!fields(body, ["id", "currentPassword"]) || !base64url(body.id, 2048)) throw new AdminFault("invalid", 400, "Escolha uma chave de acesso cadastrada.");
    if (!await passwordMatches(body.currentPassword, access.state)) throw new AdminFault("password", 400, "A senha atual não confere.");
    if (!access.state.passkeys.some(key => key.id === body.id)) throw new AdminFault("missing", 404, "Essa chave de acesso já foi removida.");
    const state = { ...access.state, revision: freshRevision(), passkeys: access.state.passkeys.filter(key => key.id !== body.id) };
    return await commitSession(context, access, state, access.session.remember, json({ ok: true, message: "Chave removida. Os outros acessos foram encerrados." }), access.token);
  } catch (error) { return adminError(error); }
}
