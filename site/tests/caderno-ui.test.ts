// The notebook on the pages: what keeps the model, the design tokens, the stylesheets and the reading page's loading
// in step (docs/CADERNO.md). The behaviour in a browser is recorded in docs/evidence/2026-11-10-caderno.md.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARKS, themeTokens } from "../scripts/contrast";
import { SITE } from "../scripts/data/sources";
import { NAV } from "../src/components/shell/nav";
import { CADERNO_EVENT, CADERNO_KEY, CADERNO_RECOVERY_KEY } from "../src/lib/caderno/keys";
import { LEITNER_DAYS, MARK_COLORS } from "../src/lib/caderno/model";
import * as core from "../src/lib/caderno/store-core";
import { SALVOS_KEY } from "../src/lib/salvos";

const src = (rel: string) => readFileSync(join(SITE, "src", rel), "utf8");

describe("highlight colours", () => {
  it("are the same four in the model, in the contrast policy and in both themes", () => {
    expect(MARKS).toEqual(MARK_COLORS.map((cor) => `--mark-${cor}`));
    const themes = themeTokens();
    for (const theme of Object.values(themes)) {
      const values = MARKS.map((name) => theme[name]);
      for (const value of values) expect(value).toMatch(/^#[0-9a-f]{6}$/);
      expect(new Set(values).size).toBe(MARKS.length);
      // a highlight is never the band of the selected verse
      expect(values).not.toContain(theme["--highlight"]);
    }
  });

  it("each paint the verse in the reading, the colour dot of the bar and the notebook's lists", () => {
    const reading = src("components/reader/selection.module.css");
    const notebook = src("components/caderno/caderno.module.css");
    for (const cor of MARK_COLORS) {
      expect(reading, cor).toMatch(new RegExp(`\\.swatch\\[data-cor="${cor}"\\],\\s*\\.scope :global\\(li\\[data-grifo="${cor}"\\]\\) \\{\\s*--grifo: var\\(--mark-${cor}\\);`));
      expect(notebook, cor).toMatch(new RegExp(`\\.dot\\[data-cor="${cor}"\\],\\s*\\.marked\\[data-cor="${cor}"\\] \\{\\s*--grifo: var\\(--mark-${cor}\\);`));
    }
    // no stylesheet of the notebook names a colour of its own
    for (const css of [notebook, src("components/caderno/reader.module.css")]) expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("mark a verse with a note or to memorise with the notebook's own icons", () => {
    const icons = src("components/caderno/icons.tsx");
    const reading = src("components/reader/selection.module.css");
    for (const name of ["note", "review"]) {
      const d = new RegExp(`${name}: <path d="([^"]+)"`).exec(icons)?.[1];
      expect(d, name).toBeTruthy();
      expect(reading, name).toContain(`d='${d}'`);
    }
  });
});

describe("the reading pages", () => {
  const bar = src("components/reader/SelectionBar.tsx");

  it("fetch the notebook on first use, never with the page", () => {
    expect(bar).toContain('import("@/components/caderno/reader")');
    const eager = [...bar.matchAll(/^import (?!type )[^;]*from "(@\/(?:lib|components)\/caderno\/[^"]+)";/gm)].map((m) => m[1]);
    // only the storage names and the three icons come with the reading page
    expect(eager.sort()).toEqual(["@/components/caderno/icons", "@/lib/caderno/keys"]);
    expect(src("lib/caderno/keys.ts")).not.toMatch(/^import /m);
  });

  it("offer the notebook's three verbs before the four that act on the selected words", () => {
    const labels = [...bar.matchAll(/\n\s+(Grifar|Anotar|Decorar|Copiar|Salvar)<span className="visually-hidden">|<span>(Compartilhar)<\/span>|\n\s+(Explorar)<span/g)].map((m) => m[1] ?? m[2] ?? m[3]);
    expect(labels).toEqual(["Grifar", "Anotar", "Decorar", "Copiar", "Compartilhar", "Salvar", "Explorar"]);
    expect(bar.match(/data-main=""/g)).toHaveLength(3);
  });
});

describe("storage names", () => {
  it("are versioned, distinct and the ones the store uses", () => {
    expect([CADERNO_KEY, CADERNO_RECOVERY_KEY, CADERNO_EVENT]).toEqual(["bc:caderno:v1", "bc:caderno:recovery:v1", "bc:caderno"]);
    expect(core.CADERNO_KEY).toBe(CADERNO_KEY);
    expect(core.CADERNO_RECOVERY_KEY).toBe(CADERNO_RECOVERY_KEY);
    expect(new Set([CADERNO_KEY, CADERNO_RECOVERY_KEY, SALVOS_KEY]).size).toBe(3);
  });
});

describe("the notebook page", () => {
  it("is in the menu, and the saved passages light the same item", () => {
    const item = NAV.find((n) => n.href === "/caderno");
    expect(item).toMatchObject({ label: "Caderno", group: "Minha jornada", rail: true, pages: ["/salvos"] });
    expect(NAV.some((n) => n.href === "/salvos")).toBe(false);
  });

  it("says the review days from the schedule, never typed", () => {
    const app = src("components/caderno/CadernoApp.tsx");
    const review = src("components/caderno/Review.tsx");
    expect(app).toContain("LEITNER_DAYS.slice(0, -1).join");
    expect(review).toContain("LEITNER_DAYS[current.caixa - 1]");
    for (const text of [app, review]) expect(text).not.toMatch(new RegExp(LEITNER_DAYS.join(", ")));
  });
});
