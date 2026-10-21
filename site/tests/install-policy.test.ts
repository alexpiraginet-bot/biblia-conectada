import { afterEach, describe, expect, it, vi } from "vitest";
import { canOfferInstall } from "../src/components/install/device";
import { dismissInstall, installDismissed, INSTALL_DISMISS_MS, INSTALL_DISMISSED_KEY } from "../src/components/install/policy";

afterEach(() => vi.unstubAllGlobals());

describe("iOS installation guide", () => {
  it.each([
    ["iPhone", "iPhone", 5, false, false, true],
    ["iPad", "iPad", 5, false, false, true],
    ["Macintosh", "MacIntel", 5, false, false, true],
    ["Macintosh", "MacIntel", 0, false, false, false],
    ["Android", "Linux armv8l", 5, false, false, false],
    ["iPhone", "iPhone", 5, true, false, false],
    ["iPhone", "iPhone", 5, false, true, false],
  ])("checks %s / %s / touch %i / installed %s,%s", (userAgent, platform, maxTouchPoints, standalone, displayMode, expected) => {
    expect(canOfferInstall({ userAgent, platform, maxTouchPoints, standalone }, displayMode)).toBe(expected);
  });

  it("persists dismissal for exactly thirty days", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    const now = 1_800_000_000_000;
    expect(installDismissed(now)).toBe(false);
    dismissInstall(now);
    expect(values.get(INSTALL_DISMISSED_KEY)).toBe(String(now + INSTALL_DISMISS_MS));
    expect(installDismissed(now + INSTALL_DISMISS_MS - 1)).toBe(true);
    expect(installDismissed(now + INSTALL_DISMISS_MS)).toBe(false);
    values.set(INSTALL_DISMISSED_KEY, "broken");
    expect(installDismissed(now)).toBe(false);
  });

  it("does not break the site when private browsing denies storage", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("Storage unavailable"); } });
    expect(installDismissed()).toBe(false);
    expect(() => dismissInstall()).not.toThrow();
  });
});
