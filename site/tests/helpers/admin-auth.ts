import { COMMIT_SESSION_LUA } from "../../src/lib/audience/admin-security";
import { CONSUME_CHALLENGE_LUA } from "../../src/lib/audience/admin-passkeys";
import { RATE_LUA } from "../../src/lib/audience/runtime";
import type { JourneyRedis } from "../../src/lib/rewards/redis";

/** Small Redis protocol test double. Production Lua is also executed by the opt-in integration suite. */
export function adminStore() {
  const values = new Map<string, string>();
  const command: JourneyRedis = async args => {
    const [operation, ...rest] = args;
    if (operation === "GET") return values.get(String(rest[0])) ?? null;
    if (operation === "SET") { const [key, value] = rest; if (rest.includes("NX") && values.has(String(key))) return null; values.set(String(key), String(value)); return "OK"; }
    if (operation === "DEL") { let removed = 0; for (const key of rest) if (values.delete(String(key))) removed++; return removed; }
    if (operation === "EVAL") {
      const script = rest[0]; const count = Number(rest[1]); const keys = rest.slice(2, 2 + count).map(String); const params = rest.slice(2 + count).map(String);
      if (script === RATE_LUA) { const n = Number(values.get(keys[0]) ?? 0) + 1; values.set(keys[0], String(n)); return n; }
      if (script === CONSUME_CHALLENGE_LUA) { const value = values.get(keys[0]) ?? null; values.delete(keys[0]); return value; }
      if (script === COMMIT_SESSION_LUA) {
        if ((values.get(keys[0]) ?? "") !== params[0]) return 0;
        if (params[4] === "1" && !values.has(keys[2])) return -1;
        values.set(keys[0], params[1]); values.set(keys[1], params[2]);
        if (keys[2] !== keys[1]) values.delete(keys[2]);
        return 1;
      }
    }
    throw new Error("Unexpected test Redis command");
  };
  return { values, command };
}
export function responseCookie(response: Response, name: string): string {
  const value = response.headers.getSetCookie().find(value => value.startsWith(name + "="));
  if (!value) throw new Error("Expected cookie was not issued");
  return value.split(";")[0].slice(name.length + 1);
}
