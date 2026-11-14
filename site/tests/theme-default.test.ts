import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { appearanceChoice, DEFAULT_APPEARANCE, THEME_SCRIPT } from "../src/components/header/theme";

describe("appearance before the first paint", () => {
  it.each([null, "", "invalid"])("uses day before paint and after hydration when storage is %s", (stored) => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("dia");
    expect(appearanceChoice(stored)).toBe(theme);
  });
  it.each(["dia", "noite", "sistema"])("restores the explicit %s preference without overwriting it", (stored) => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe(stored);
    expect(appearanceChoice(stored)).toBe(theme);
  });
  it("still uses day when browser storage is unavailable", () => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => { throw new Error("Storage blocked"); } },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("dia");
    expect(theme).toBe(DEFAULT_APPEARANCE);
  });
});
