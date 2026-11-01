import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { adminSecurity, audienceLogin, audienceLogout, changeAdminPassword, credentialKey, hashPassword, passwordMatches, readCredential, removeAdminPasskey, REMEMBER_SECONDS, SESSION_SECONDS, verifySessionToken } from "../src/lib/audience/admin-security";
import { adminPasskeyOptions, adminPasskeyVerify } from "../src/lib/audience/admin-passkeys";
import { audienceConfig, digest, type AudienceConfig } from "../src/lib/audience/runtime";
import { journeyRedis, type JourneyRedis } from "../src/lib/rewards/redis";
import { adminStore, responseCookie } from "./helpers/admin-auth";
import { testAuthenticator } from "./helpers/test-authenticator";

const bootstrap = "test-bootstrap-password-with-entropy";
const nextPassword = "My new long private passphrase 2026";
const origin = "https://www.bibliaconectada.company";
const config = audienceConfig({ VERCEL: "1", VERCEL_ENV: "production", KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-token", ASSISTANT_RATE_LIMIT_SECRET: "test-secret-with-more-than-32-characters", AUDIENCE_ENABLED: "true", AUDIENCE_ADMIN_PASSWORD_HASH: digest(bootstrap) })!;
const initialNow = new Date("2026-11-01T12:00:00Z");
function fixture(remote?: JourneyRedis, customConfig = config) {
  const memory = adminStore(); let now = initialNow; let token = ""; let challenge = "";
  const command = remote ?? memory.command;
  const deps = { config: customConfig, command, now: () => now };
  const req = (path: string, body?: unknown, extra: Record<string, string> = {}, method = "POST") => new Request(origin + "/api/admin/" + path, { method, headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.40", cookie: `${customConfig.cookieName}=${token}; ${customConfig.cookieName}-webauthn=${challenge}`, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const adopt = (response: Response) => { for (const part of response.headers.getSetCookie()) { if (part.startsWith(customConfig.cookieName + "=")) token = responseCookie(response, customConfig.cookieName); if (part.startsWith(customConfig.cookieName + "-webauthn=")) challenge = responseCookie(response, customConfig.cookieName + "-webauthn"); } return response; };
  return { deps, values: memory.values, req, adopt, get token() { return token; }, set token(value: string) { token = value; }, get challenge() { return challenge; }, set challenge(value: string) { challenge = value; }, advance(seconds: number) { now = new Date(now.getTime() + seconds * 1000); }, async login(password = bootstrap, remember = true) { return adopt(await audienceLogin(req("session", { password, remember }), deps)); } };
}
async function register(f: ReturnType<typeof fixture>, device = testAuthenticator()) {
  const response = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "register", currentPassword: bootstrap, name: "iPhone pessoal" }), f.deps));
  expect(response.status).toBe(200);
  const { options } = await response.json();
  expect(options.authenticatorSelection.userVerification).toBe("required"); expect(options.rp.id).toBe("bibliaconectada.company");
  const credential = device.register(options, origin);
  const result = f.adopt(await adminPasskeyVerify(f.req("passkeys/verify", { action: "register", credential }), f.deps));
  expect(result.status).toBe(200);
  return device;
}

describe("admin passwords and durable sessions", () => {
  it("salts slow hashes, verifies Unicode passphrases and never accepts the bootstrap after rotation", async () => {
    const f = fixture(); const state = (await readCredential({ ...f.deps, now: initialNow })).state;
    const password = "Minha senha é uma frase muito longa 🔐";
    const first = await hashPassword(password); const second = await hashPassword(password);
    expect(first).not.toBe(second); expect(first).not.toContain(password);
    expect(await passwordMatches(password, { ...state, password: first })).toBe(true);
    expect(await passwordMatches(bootstrap, { ...state, password: first })).toBe(false);
    expect(await passwordMatches(password + "x", { ...state, password: first })).toBe(false);
    await expect(hashPassword("short")).rejects.toThrow(); await expect(hashPassword("a".repeat(129))).rejects.toThrow();
  });
  it.each([true, false])("supports remember=%s with a revocable, host-only session", async remember => {
    const f = fixture(); const response = await f.login(bootstrap, remember);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(`Max-Age=${remember ? REMEMBER_SECONDS : SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`);
    expect(response.headers.get("set-cookie")).not.toContain("Domain=");
    const token = f.token;
    expect(verifySessionToken(token, config, initialNow.getTime())).toBe(true);
    expect(verifySessionToken(token + "x", config, initialNow.getTime())).toBe(false);
    expect(verifySessionToken(token, { ...config, passwordHash: digest("rotated") }, initialNow.getTime())).toBe(false);
    expect(verifySessionToken(token, { ...config, environment: "preview" }, initialNow.getTime())).toBe(false);
    const security = await (await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).json();
    expect(security.remember).toBe(remember); expect(Object.keys(security).sort()).toEqual(["expiresAt", "passkeys", "passwordChangedAt", "remember"]);
    expect(f.adopt(await audienceLogout(f.req("session", undefined, {}, "DELETE"), f.deps)).status).toBe(200);
    f.token = token;
    expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401);
  });
  it("expires long sessions and does not accept legacy stateless cookies", async () => {
    const f = fixture(); await f.login(); f.advance(REMEMBER_SECONDS);
    expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401);
    f.token = "1793620800." + "a".repeat(32) + "." + "a".repeat(64);
    expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401);
  });
  it("changes the password atomically, keeps this browser, rejects old passwords and revokes every older session", async () => {
    const f = fixture(); await f.login(); const first = f.token; await f.login(); const second = f.token;
    const changed = f.adopt(await changeAdminPassword(f.req("password", { currentPassword: bootstrap, newPassword: nextPassword, confirmPassword: nextPassword }), f.deps));
    expect(changed.status).toBe(200); const renewed = f.token;
    expect(renewed).not.toBe(second);
    expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(200);
    for (const token of [first, second]) { f.token = token; expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401); }
    expect((await f.login(bootstrap)).status).toBe(401); expect((await f.login(nextPassword)).status).toBe(200);
    const state = JSON.parse(f.values.get(credentialKey(config))!);
    expect(state.password).toMatch(/^scrypt:/); expect(state.changedAt).toBe(initialNow.toISOString());
    expect(JSON.stringify([...f.values])).not.toContain(nextPassword);
  });
  it("rejects unauthenticated, foreign-origin, wrong-current, mismatched and oversized changes without mutation", async () => {
    const f = fixture(); const body = { currentPassword: bootstrap, newPassword: nextPassword, confirmPassword: nextPassword };
    expect((await changeAdminPassword(f.req("password", body), f.deps)).status).toBe(401);
    await f.login(); const original = f.values.get(credentialKey(config));
    expect((await changeAdminPassword(f.req("password", body, { origin: "https://evil.test" }), f.deps)).status).toBe(403);
    for (const changed of [{ currentPassword: "wrong-current-password" }, { confirmPassword: "another password" }, { newPassword: "short" }, { extra: "forbidden" }]) expect((await changeAdminPassword(f.req("password", { ...body, ...changed }), f.deps)).status).toBe(400);
    expect((await changeAdminPassword(f.req("password", { ...body, newPassword: "a".repeat(5000) }), f.deps)).status).toBe(400);
    expect(f.values.get(credentialKey(config))).toBe(original);
  });
  it("lets only one concurrent password change win and does not restore the old credential on storage failure", async () => {
    const f = fixture(); await f.login();
    const change = (value: string) => changeAdminPassword(f.req("password", { currentPassword: bootstrap, newPassword: value, confirmPassword: value }), f.deps);
    const responses = await Promise.all([change(nextPassword), change(nextPassword + " second")]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = responses.findIndex(r => r.status === 200); f.adopt(responses[winner]);
    expect((await f.login(winner === 0 ? nextPassword : nextPassword + " second")).status).toBe(200);
    const original = f.values.get(credentialKey(config));
    const failed = await changeAdminPassword(f.req("password", { currentPassword: winner === 0 ? nextPassword : nextPassword + " second", newPassword: "Another very long password", confirmPassword: "Another very long password" }), { ...f.deps, command: async args => { if (args[0] === "EVAL" && Number(args[2]) === 3) throw new Error("backend private detail"); return f.deps.command(args); } });
    expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("private detail"); expect(f.values.get(credentialKey(config))).toBe(original);
  });
  it("fails closed on corrupted state and limits repeated password attempts", async () => {
    const f = fixture(); f.values.set(credentialKey(config), "broken"); expect((await f.login()).status).toBe(503);
    f.values.delete(credentialKey(config));
    for (let n = 0; n < 4; n++) expect((await f.login("wrong-password-long-enough")).status).toBe(401);
    expect((await f.login()).status).toBe(429);
  });
  it("does not revive a logged-out session when a password change is already in flight", async () => {
    const f = fixture(); await f.login(); const original = f.values.get(credentialKey(config));
    const response = await changeAdminPassword(f.req("password", { currentPassword: bootstrap, newPassword: nextPassword, confirmPassword: nextPassword }), { ...f.deps, command: async args => {
      if (args[0] === "EVAL" && Number(args[2]) === 3) expect((await audienceLogout(f.req("session", undefined, {}, "DELETE"), f.deps)).status).toBe(200);
      return f.deps.command(args);
    } });
    expect(response.status).toBe(401); expect(f.values.get(credentialKey(config))).toBe(original);
  });
});

describe("passkeys with real ES256 signatures", () => {
  it("enrolls with current password, signs in with UV, updates counters and revokes a removed key", async () => {
    const f = fixture(); await f.login(); const device = await register(f);
    const security = await (await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).json();
    expect(security.passkeys).toEqual([{ id: device.id, name: "iPhone pessoal", createdAt: initialNow.toISOString() }]);
    expect(JSON.stringify(security)).not.toMatch(/publicKey|counter|bootstrap|revision/);
    f.adopt(await audienceLogout(f.req("session", undefined, {}, "DELETE"), f.deps));
    const optionsResponse = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate", remember: false }), f.deps));
    const { options } = await optionsResponse.json();
    const credential = device.authenticate(options, origin); const consumedCookie = f.challenge;
    const result = f.adopt(await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential }), f.deps));
    expect(result.status).toBe(200); expect(result.headers.get("set-cookie")).toContain("Max-Age=28800");
    f.challenge = consumedCookie;
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential }), f.deps)).status).toBe(400);
    expect(JSON.parse(f.values.get(credentialKey(config))!).passkeys[0].counter).toBe(1);
    expect((await removeAdminPasskey(f.req("passkeys", { id: device.id, currentPassword: "incorrect-current-password" }), f.deps)).status).toBe(400);
    const oldToken = f.token;
    expect(f.adopt(await removeAdminPasskey(f.req("passkeys", { id: device.id, currentPassword: bootstrap }), f.deps)).status).toBe(200);
    f.token = oldToken; expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401);
    expect((await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate", remember: true }), f.deps)).status).toBe(400);
  });
  it.each(["origin", "challenge", "rp", "uv", "signature", "counter", "userHandle"])("rejects invalid authentication %s", async invalid => {
    const f = fixture(); await f.login(); const device = await register(f);
    const optionsResponse = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate", remember: true }), f.deps));
    const { options } = await optionsResponse.json();
    const assertion = device.authenticate({ ...options, ...(invalid === "challenge" ? { challenge: "wrong-challenge" } : {}), ...(invalid === "rp" ? { rpId: "evil.test" } : {}) }, invalid === "origin" ? "https://evil.test" : origin, invalid !== "uv");
    if (invalid === "signature") assertion.response.signature = Buffer.alloc(70).toString("base64url");
    if (invalid === "userHandle") assertion.response.userHandle = "wrong-user";
    if (invalid === "counter") { const state = JSON.parse(f.values.get(credentialKey(config))!); state.passkeys[0].counter = 99; f.values.set(credentialKey(config), JSON.stringify(state)); }
    const response = await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential: assertion }), f.deps);
    expect(response.status).toBe(400); expect(response.headers.getSetCookie().some(c => c.startsWith(config.cookieName + "="))).toBe(false);
  });
  it("requires login and current password to enroll; consumes ceremonies once and binds registration to its browser session", async () => {
    const f = fixture(); const body = { action: "register", currentPassword: bootstrap, name: "iPhone" };
    expect((await adminPasskeyOptions(f.req("passkeys/options", body), f.deps)).status).toBe(401);
    await f.login();
    expect((await adminPasskeyOptions(f.req("passkeys/options", { ...body, currentPassword: "wrong-current-password" }), f.deps)).status).toBe(400);
    const response = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", body), f.deps));
    const { options } = await response.json(); const credential = testAuthenticator().register(options, origin);
    await f.login();
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "register", credential }), f.deps)).status).toBe(409);
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "register", credential }), f.deps)).status).toBe(400);
  });
  it("invalidates pending ceremonies on password change, rejects expired and cross-origin requests", async () => {
    const f = fixture(); await f.login(); const device = await register(f);
    const optionResponse = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate", remember: true }), f.deps));
    const { options } = await optionResponse.json(); const credential = device.authenticate(options, origin);
    f.adopt(await changeAdminPassword(f.req("password", { currentPassword: bootstrap, newPassword: nextPassword, confirmPassword: nextPassword }), f.deps));
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential }), f.deps)).status).toBe(409);
    const pending = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate", remember: true }), f.deps));
    const next = device.authenticate((await pending.json()).options, origin); f.advance(301);
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential: next }), f.deps)).status).toBe(400);
    expect((await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate" }, { origin: "https://evil.test" }), f.deps)).status).toBe(403);
  });
  it("rejects registration without verified user presence", async () => {
    const f = fixture(); await f.login(); const result = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "register", currentPassword: bootstrap, name: "Test" }), f.deps));
    const credential = testAuthenticator().register((await result.json()).options, origin, false);
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "register", credential }), f.deps)).status).toBe(400);
    expect(JSON.parse(f.values.get(credentialKey(config))!).passkeys).toEqual([]);
  });
  it("rejects malformed authenticator metadata before it can corrupt the credential record", async () => {
    const f = fixture(); await f.login(); const result = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "register", currentPassword: bootstrap, name: "Test" }), f.deps));
    const credential = testAuthenticator().register((await result.json()).options, origin);
    credential.response.transports = Array.from({ length: 20 }, () => "invalid-transport");
    expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "register", credential }), f.deps)).status).toBe(400);
    expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(200);
  });
});

describe.skipIf(process.env.AUDIENCE_INTEGRATION !== "1")("admin real Redis integration", () => {
  it("persists credential changes, revokes sessions, consumes challenges and verifies real passkeys atomically", async () => {
    const live = audienceConfig({ ...process.env, VERCEL: "1", VERCEL_ENV: "production", AUDIENCE_ADMIN_PASSWORD_HASH: digest(bootstrap) }); expect(live).not.toBeNull();
    const isolated: AudienceConfig = { ...live!, prefix: `bc:{admin-qa}:preview:${randomBytes(12).toString("hex")}:` };
    const remote = journeyRedis(isolated); const keys = new Set<string>();
    const command: JourneyRedis = async args => {
      const touched = args[0] === "EVAL" ? args.slice(3, 3 + Number(args[2])) : args[0] === "DEL" ? args.slice(1) : args.slice(1, 2);
      for (const key of touched) { if (typeof key !== "string" || !key.startsWith(isolated.prefix)) throw new Error("Unsafe QA key"); keys.add(key); }
      return remote(args);
    };
    const f = fixture(command, isolated);
    try {
      expect((await f.login()).status).toBe(200); const old = f.token;
      const device = await register(f);
      const option = f.adopt(await adminPasskeyOptions(f.req("passkeys/options", { action: "authenticate", remember: true }), f.deps));
      const credential = device.authenticate((await option.json()).options, origin);
      const nonce = f.challenge;
      expect(f.adopt(await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential }), f.deps)).status).toBe(200);
      f.challenge = nonce; expect((await adminPasskeyVerify(f.req("passkeys/verify", { action: "authenticate", credential }), f.deps)).status).toBe(400);
      const changed = f.adopt(await changeAdminPassword(f.req("password", { currentPassword: bootstrap, newPassword: nextPassword, confirmPassword: nextPassword }), f.deps)); expect(changed.status).toBe(200);
      const current = f.token; f.token = old; expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401); f.token = current;
      expect((await f.login(bootstrap)).status).toBe(401); expect((await f.login(nextPassword)).status).toBe(200);
      expect(f.adopt(await removeAdminPasskey(f.req("passkeys", { id: device.id, currentPassword: nextPassword }), f.deps)).status).toBe(200);
      const final = f.token; expect(f.adopt(await audienceLogout(f.req("session", undefined, {}, "DELETE"), f.deps)).status).toBe(200); f.token = final;
      expect((await adminSecurity(f.req("security", undefined, {}, "GET"), f.deps)).status).toBe(401);
    } finally { if (keys.size) await remote(["DEL", ...keys]); }
  });
});
