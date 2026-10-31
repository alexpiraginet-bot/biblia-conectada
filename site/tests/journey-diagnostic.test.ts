import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/server", () => ({ connection: async () => {} }));
import { GET } from "../src/app/api/jornada-diagnostico/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("temporary preview-only read-only diagnostic", () => {
  it.each(["production", "development", ""])('is 404 without network in %s', async (environment) => {
    vi.stubEnv("VERCEL_ENV", environment);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await GET();
    expect(response.status).toBe(404); expect(fetch).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("uses no keys or writes and never returns credentials or raw provider errors", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("VERCEL", "1");
    vi.stubEnv("KV_REST_API_URL", "https://diagnostic-test.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "secret-test-value");
    vi.stubEnv("ASSISTANT_RATE_LIMIT_SECRET", "s".repeat(32));
    const commands: unknown[][] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      commands.push(JSON.parse(String(init.body)));
      return Response.json(commands.length === 1 ? { result: "PONG" } : { error: "NOPERM secret-test-value diagnostic-test.upstash.io" }, { status: commands.length === 1 ? 200 : 400 });
    }));
    const response = await GET();
    const body = await response.text();
    expect(commands.map(command => command[0])).toEqual(["PING", "EVAL_RO"]);
    expect(commands[1][2]).toBe(0); expect(commands[1]).toHaveLength(3);
    expect(commands[1][1]).not.toMatch(/redis\.(call|pcall)/);
    expect(JSON.parse(body).evalReadOnly.error).toBe("permission");
    expect(body).not.toContain("secret-test-value"); expect(body).not.toContain("diagnostic-test.upstash.io");
  });
});
