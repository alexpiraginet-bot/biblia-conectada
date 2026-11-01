import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { THEME_SCRIPT } from "../src/components/header/theme";

describe("appearance before the first paint", () => {
  it.each([null, "", "invalid"])("uses the temporary night default when storage is %s", (stored) => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("noite");
  });
  it.each(["dia", "noite", "sistema"])("applies night without overwriting the stored %s preference", (stored) => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("noite");
  });
  it("still uses night when browser storage is unavailable", () => {
    let theme = "";
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: () => { throw new Error("Storage blocked"); } },
      document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
    });
    expect(theme).toBe("noite");
  });
});
