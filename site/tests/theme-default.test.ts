import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { THEME_SCRIPT } from "../src/components/header/theme";

describe("appearance before the first paint", () => {
  it.each([null, "", "invalid"])("follows the device when storage is %s", (stored) => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("sistema");
  });
  it.each(["dia", "noite", "sistema"])("preserves the explicit %s choice", (stored) => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe(stored);
  });
  it("still follows the device when browser storage is unavailable", () => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => { throw new Error("Storage blocked"); } },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("sistema");
  });
});
