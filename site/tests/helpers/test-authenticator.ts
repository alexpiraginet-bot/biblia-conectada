import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

function cbor(value: unknown): Buffer {
  const size = (major: number, length: number): Buffer => length < 24 ? Buffer.from([major * 32 + length]) : length < 256 ? Buffer.from([major * 32 + 24, length]) : Buffer.from([major * 32 + 25, length >> 8, length & 255]);
  if (typeof value === "number") return value >= 0 ? size(0, value) : size(1, -1 - value);
  if (typeof value === "string") { const text = Buffer.from(value); return Buffer.concat([size(3, text.length), text]); }
  if (Buffer.isBuffer(value)) return Buffer.concat([size(2, value.length), value]);
  if (value instanceof Map) return Buffer.concat([size(5, value.size), ...[...value.entries()].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
  throw new Error("Unsupported fixture CBOR");
}
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest();
/** A cryptographically real ES256 authenticator, used to verify the server without mocking WebAuthn. */
export function testAuthenticator() {
  const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" }); const jwk = pair.publicKey.export({ format: "jwk" });
  const id = randomBytes(32); let userHandle = ""; let counter = 0;
  const key = cbor(new Map<number, unknown>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, "base64url")], [-3, Buffer.from(jwk.y!, "base64url")]]));
  const client = (type: string, challenge: string, origin: string) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  return {
    id: id.toString("base64url"),
    register(options: PublicKeyCredentialCreationOptionsJSON, origin: string, uv = true): RegistrationResponseJSON {
      userHandle = options.user.id;
      const length = Buffer.alloc(2); length.writeUInt16BE(id.length);
      const data = Buffer.concat([sha(options.rp.id!), Buffer.from([uv ? 0x45 : 0x41]), Buffer.alloc(4), Buffer.alloc(16), length, id, key]);
      return { id: id.toString("base64url"), rawId: id.toString("base64url"), type: "public-key", clientExtensionResults: {}, authenticatorAttachment: "platform", response: { clientDataJSON: client("webauthn.create", options.challenge, origin).toString("base64url"), attestationObject: cbor(new Map<string, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", data]])).toString("base64url"), transports: ["internal"] } };
    },
    authenticate(options: PublicKeyCredentialRequestOptionsJSON, origin: string, uv = true, forcedCounter?: number): AuthenticationResponseJSON {
      const count = Buffer.alloc(4); count.writeUInt32BE(forcedCounter ?? ++counter);
      const data = Buffer.concat([sha(options.rpId!), Buffer.from([uv ? 0x05 : 0x01]), count]);
      const clientData = client("webauthn.get", options.challenge, origin);
      return { id: id.toString("base64url"), rawId: id.toString("base64url"), type: "public-key", clientExtensionResults: {}, authenticatorAttachment: "platform", response: { clientDataJSON: clientData.toString("base64url"), authenticatorData: data.toString("base64url"), signature: sign("sha256", Buffer.concat([data, sha(clientData)]), pair.privateKey).toString("base64url"), userHandle } };
    },
  };
}
