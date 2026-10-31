import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
import { GET } from "../src/app/api/app-install/route";

afterEach(() => vi.unstubAllEnvs());

describe("public install configuration", () => {
  it("returns only public store targets and never caches activation state", async () => {
    vi.stubEnv("IOS_APP_AVAILABLE", "false");
    vi.stubEnv("ANDROID_APP_AVAILABLE", "false");
    vi.stubEnv("UNRELATED_PRIVATE_VALUE", "not-for-response");
    const response = await GET();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toEqual({ ios: null, android: null });
  });

  it("exposes one released platform without advertising the other", async () => {
    vi.stubEnv("IOS_APP_AVAILABLE", "true");
    vi.stubEnv("IOS_APP_STORE_URL", "https://apps.apple.com/br/app/biblia-conectada/id123456789");
    vi.stubEnv("ANDROID_APP_AVAILABLE", "false");
    const response = await GET();
    expect(await response.json()).toEqual({ ios: "https://apps.apple.com/br/app/biblia-conectada/id123456789", android: null });
  });
});
