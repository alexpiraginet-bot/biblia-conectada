// The theme a page opens in (components/header/theme.ts). Since 10/11/2026 the app opens in the light theme for
// everyone and night is a choice of the reader (asked by Alex); before, it followed the device, and from 01/11 to
// 10/11 a guard showed night to everyone.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { DEFAULT_CHOICE, FIRST_THEME, NIGHT_MODE_ONLY, THEME_COLOR, THEME_SCRIPT, themeChoice } from "../src/components/header/theme";

function run(stored: string | null | Error) {
  let theme = "";
  runInNewContext(THEME_SCRIPT, {
    localStorage: { getItem: () => { if (stored instanceof Error) throw stored; return stored; } },
    document: { documentElement: { setAttribute: (_name: string, value: string) => { theme = value; } } },
  });
  return theme;
}

describe("appearance before the first paint", () => {
  it("opens in the light theme: the default is Dia and the night guard is off", () => {
    expect(DEFAULT_CHOICE).toBe("dia");
    expect(NIGHT_MODE_ONLY).toBe(false);
    expect(FIRST_THEME).toBe("dia");
  });

  it.each([null, "", "invalid", "NOITE", "dark", "0"])("uses the light default when storage holds %s", (stored) => {
    expect(run(stored)).toBe("dia");
    expect(themeChoice(stored)).toBe("dia");
  });

  it.each(["dia", "noite", "sistema"])("keeps the reader's stored %s choice", (stored) => {
    expect(run(stored)).toBe(stored);
    expect(themeChoice(stored)).toBe(stored);
  });

  it("uses the light default when browser storage is unavailable", () => {
    expect(run(new Error("Storage blocked"))).toBe("dia");
  });

  it("runs in old browsers", () => {
    expect(THEME_SCRIPT).not.toMatch(/=>|\blet\b|\bconst\b|`/);
  });
});

describe("the first HTML and the browser's chrome", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

  it("carry the default theme before any script, on every kind of page", () => {
    expect(read("app/layout.tsx")).toContain("data-theme={FIRST_THEME}");
    expect(read("lib/install-page.ts")).toContain('data-theme="${FIRST_THEME}"');
    // nothing decides the opening theme by itself any more
    for (const file of ["app/layout.tsx", "lib/install-page.ts", "app/manifest.webmanifest/route.ts", "components/header/Appearance.tsx"]) {
      expect(read(file), file).not.toMatch(/"sistema"\s*[:)]\s*$|\? "noite" : "sistema"/m);
    }
  });

  it("give the installed app the light ground", async () => {
    const { GET } = await import("../src/app/manifest.webmanifest/route");
    const manifest = (await GET().json()) as { background_color: string; theme_color: string };
    expect(manifest.background_color).toBe(THEME_COLOR.dia);
    expect(manifest.theme_color).toBe(THEME_COLOR.dia);
  });
});
