import "server-only";
import { randomBytes } from "node:crypto";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { commitSession, passwordMatches, readCredential, requireAdmin, validPasskey, type StoredPasskey } from "./admin-security";
import { AdminFault, adminContext, adminError, cookieValue, digest, fields, json, limitAttempts, record, requireOrigin, smallJson, type AdminContext, type Dependencies } from "./runtime";

const CHALLENGE_SECONDS = 300;
type Challenge = { action: "register" | "authenticate"; challenge: string; revision: string; origin: string; rpId: string; sessionHash: string | null; remember: boolean; name: string; expiresAt: number };
const challengeCookie = (context: AdminContext) => context.config.cookieName + "-webauthn";
export const challengeKey = (context: AdminContext, nonce: string) => context.config.prefix + "admin:challenge:" + digest(nonce);
export const CONSUME_CHALLENGE_LUA = "local value=redis.call('GET',KEYS[1]); if value then redis.call('DEL',KEYS[1]) end; return value";
function passkeyScope(request: Request, context: AdminContext): { origin: string; rpId: string } {
  const { passkeyOrigin, passkeyRpId } = context.config;
  if (!passkeyOrigin || !passkeyRpId || new URL(request.url).origin !== passkeyOrigin) throw new AdminFault("origin", 403, "Abra o painel em www.bibliaconectada.company para usar a biometria.");
  return { origin: passkeyOrigin, rpId: passkeyRpId };
}
function challengeCookieHeader(context: AdminContext, nonce: string, maxAge: number): string {
  return `${challengeCookie(context)}=${nonce}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Strict`;
}
async function saveChallenge(context: AdminContext, challenge: Challenge, options: unknown, request: Request): Promise<Response> {
  // Only one ceremony per browser at a time. Starting another invalidates the previous one.
  const previous = cookieValue(request, challengeCookie(context));
  if (previous && /^[a-f0-9]{64}$/.test(previous)) await context.command(["DEL", challengeKey(context, previous)]);
  const nonce = randomBytes(32).toString("hex");
  if (await context.command(["SET", challengeKey(context, nonce), JSON.stringify(challenge), "EX", CHALLENGE_SECONDS, "NX"]) !== "OK") throw new Error("Challenge unavailable");
  const response = json({ options }); response.headers.append("Set-Cookie", challengeCookieHeader(context, nonce, CHALLENGE_SECONDS));
  return response;
}
export async function adminPasskeyOptions(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  try {
    requireOrigin(request); const context = adminContext(dependencies); const scope = passkeyScope(request, context);
    await limitAttempts(request, context, "passkey-options");
    const body = await smallJson(request, 2048);
    if (!record(body) || !["register", "authenticate"].includes(body.action as string)) throw new AdminFault("invalid", 400, "Escolha como deseja usar a biometria.");
    if (body.action === "register") {
      if (!fields(body, ["action", "currentPassword", "name"]) || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 64 || /[\u0000-\u001f\u007f]/.test(body.name)) throw new AdminFault("name", 400, "Dê um nome de até 64 caracteres para este aparelho.");
      const access = await requireAdmin(request, context);
      if (!await passwordMatches(body.currentPassword, access.state)) throw new AdminFault("password", 400, "A senha atual não confere.");
      if (access.state.passkeys.length >= 5) throw new AdminFault("limit", 400, "Você já tem 5 chaves. Remova uma antes de cadastrar outra.");
      const options = await generateRegistrationOptions({ rpName: "Bíblia Conectada · Painel", rpID: scope.rpId, userName: "administrador", userDisplayName: "Administrador da Bíblia Conectada", userID: new Uint8Array(Buffer.from(access.state.userId, "hex")), attestationType: "none", timeout: 60000, supportedAlgorithmIDs: [-7, -257], excludeCredentials: access.state.passkeys.map(key => ({ id: key.id, transports: key.transports })), authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" } });
      return await saveChallenge(context, { action: "register", challenge: options.challenge, revision: access.state.revision, ...scope, sessionHash: digest(access.token), remember: access.session.remember, name: body.name.trim(), expiresAt: context.now.getTime() + CHALLENGE_SECONDS * 1000 }, options, request);
    }
    if (!fields(body, ["action", "remember"]) || !(body.remember === undefined || typeof body.remember === "boolean")) throw new AdminFault("invalid", 400, "Confira os dados e tente novamente.");
    const { state } = await readCredential(context);
    if (!state.passkeys.length) throw new AdminFault("missing", 400, "Entre com sua senha e cadastre a biometria na aba Segurança primeiro.");
    const options = await generateAuthenticationOptions({ rpID: scope.rpId, userVerification: "required", timeout: 60000, allowCredentials: state.passkeys.map(key => ({ id: key.id, transports: key.transports })) });
    return await saveChallenge(context, { action: "authenticate", challenge: options.challenge, revision: state.revision, ...scope, sessionHash: null, remember: body.remember !== false, name: "", expiresAt: context.now.getTime() + CHALLENGE_SECONDS * 1000 }, options, request);
  } catch (error) { return adminError(error); }
}
export async function adminPasskeyVerify(request: Request, dependencies: Dependencies = {}): Promise<Response> {
  let context: AdminContext | undefined;
  let consumed = false;
  try {
    requireOrigin(request); context = adminContext(dependencies); const scope = passkeyScope(request, context);
    await limitAttempts(request, context, "passkey-verify", 10);
    const body = await smallJson(request, 16384);
    if (!fields(body, ["action", "credential"]) || !["register", "authenticate"].includes(body.action as string) || !record(body.credential)) throw new AdminFault("invalid", 400, "Não foi possível confirmar a chave de acesso.");
    const nonce = cookieValue(request, challengeCookie(context));
    if (!nonce || !/^[a-f0-9]{64}$/.test(nonce)) throw new AdminFault("expired", 400, "A confirmação expirou. Toque em biometria para tentar novamente.");
    const raw = await context.command(["EVAL", CONSUME_CHALLENGE_LUA, 1, challengeKey(context, nonce)]); consumed = true;
    if (typeof raw !== "string") throw new AdminFault("expired", 400, "A confirmação expirou. Toque em biometria para tentar novamente.");
    const challenge: Challenge = JSON.parse(raw);
    if (challenge.action !== body.action || challenge.origin !== scope.origin || challenge.rpId !== scope.rpId || challenge.expiresAt <= context.now.getTime() || typeof challenge.challenge !== "string" || typeof challenge.remember !== "boolean") throw new AdminFault("expired", 400, "A confirmação expirou. Comece novamente.");
    const access = challenge.action === "register" ? await requireAdmin(request, context) : null;
    const previous = access ?? await readCredential(context);
    if (previous.state.revision !== challenge.revision || (challenge.action === "register" && (!access || digest(access.token) !== challenge.sessionHash))) throw new AdminFault("changed", 409, "O acesso mudou durante a confirmação. Entre novamente.");
    const credentialId = body.credential.id;
    let passkeys: StoredPasskey[];
    if (challenge.action === "register") {
      if (previous.state.passkeys.length >= 5) throw new AdminFault("limit", 400, "Você já tem 5 chaves de acesso.");
      let result;
      try { result = await verifyRegistrationResponse({ response: body.credential as unknown as RegistrationResponseJSON, expectedChallenge: challenge.challenge, expectedOrigin: scope.origin, expectedRPID: scope.rpId, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] }); }
      catch { throw new AdminFault("verification", 400, "Não foi possível confirmar a biometria. Tente novamente."); }
      if (!result.verified || !result.registrationInfo.userVerified) throw new AdminFault("verification", 400, "Confirme sua identidade no aparelho para cadastrar a chave.");
      const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
      if (previous.state.passkeys.some(key => key.id === credential.id)) throw new AdminFault("duplicate", 409, "Esta chave de acesso já está cadastrada.");
      const storedKey = { id: credential.id, publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter, transports: credential.transports ?? [], deviceType: credentialDeviceType, backedUp: credentialBackedUp, name: challenge.name, createdAt: context.now.toISOString() };
      if (!validPasskey(storedKey)) throw new AdminFault("verification", 400, "O aparelho enviou uma chave incompatível. Tente outro autenticador.");
      passkeys = [...previous.state.passkeys, storedKey];
    } else {
      const key = previous.state.passkeys.find(key => key.id === credentialId);
      if (!key) throw new AdminFault("verification", 400, "Esta chave não está cadastrada neste painel.");
      const assertion = body.credential as unknown as AuthenticationResponseJSON;
      if (assertion.response?.userHandle && assertion.response.userHandle !== Buffer.from(previous.state.userId, "hex").toString("base64url")) throw new AdminFault("verification", 400, "A chave de acesso não corresponde a este painel.");
      let result;
      try { result = await verifyAuthenticationResponse({ response: assertion, expectedChallenge: challenge.challenge, expectedOrigin: scope.origin, expectedRPID: scope.rpId, requireUserVerification: true, credential: { id: key.id, publicKey: new Uint8Array(Buffer.from(key.publicKey, "base64url")), counter: key.counter, transports: key.transports } }); }
      catch { throw new AdminFault("verification", 400, "Não foi possível confirmar a biometria. Tente novamente."); }
      if (!result.verified || !result.authenticationInfo.userVerified) throw new AdminFault("verification", 400, "Confirme sua identidade no aparelho para entrar.");
      passkeys = previous.state.passkeys.map(stored => stored.id === key.id ? { ...stored, counter: result.authenticationInfo.newCounter, backedUp: result.authenticationInfo.credentialBackedUp, deviceType: result.authenticationInfo.credentialDeviceType } : stored);
    }
    const response = json({ ok: true, message: challenge.action === "register" ? "Chave cadastrada. Na próxima entrada, você poderá usar a biometria." : "Acesso confirmado." });
    response.headers.append("Set-Cookie", challengeCookieHeader(context, "", 0));
    return await commitSession(context, previous, { ...previous.state, passkeys }, challenge.remember, response, access?.token);
  } catch (error) {
    const response = adminError(error);
    if (consumed && context) response.headers.append("Set-Cookie", challengeCookieHeader(context, "", 0));
    return response;
  }
}
