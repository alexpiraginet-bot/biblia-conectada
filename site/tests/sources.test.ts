// Rule 1 of CLAUDE.md: only free sources. Protected translations (ACF, AA, NVI, ARA, NAA, NTLH…) never reach
// fontes/, the generated data or public/.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { findLeaks, loadProtectedQuotes, NGRAM, protectedRuns, textFiles } from "../scripts/data/leak-guard";
import { OUT, SITE, SRC } from "../scripts/data/sources";
import { bookFile, books } from "./generated";

function* blivreTexts() {
  for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) yield v.t;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const PROTECTED_NAME = /(^|[^a-z])(acf|aa|nvi|ara|arc|naa|ntlh|nvt|a21|kja|nbv-?p|almeida[-_ ]?(corrigida|revista|atualizada))([^a-z]|$)/i;
const PROTECTED_TITLE = /Almeida Corrigida|Revista e Atualizada|Revista e Corrigida|Nova Versão Internacional|Linguagem de Hoje|Nova Almeida Atualizada|Nova Versão Transformadora/i;

describe("fontes/", () => {
  // README.md, SHA256SUMS and the index catalogo.json describe the sources; scripts/fetch_sources.sh leaves them out of the sums
  it("holds only README.md, catalogo.json, SHA256SUMS and files listed there with matching SHA-256", () => {
    const sums = new Map(
      readFileSync(SRC.fontesSums, "utf8").trim().split("\n").map((l) => {
        const [hash, ...name] = l.split("  ");
        return [name.join("  "), hash] as const;
      }),
    );
    for (const file of walk(SRC.fontesDir)) {
      const rel = relative(SRC.fontesDir, file).replaceAll("\\", "/");
      if (rel === "README.md" || rel === "SHA256SUMS" || rel === "catalogo.json") continue;
      expect(sums.has(rel), `${rel} is not in fontes/SHA256SUMS`).toBe(true);
      expect(createHash("sha256").update(readFileSync(file)).digest("hex"), rel).toBe(sums.get(rel));
      expect(rel).not.toMatch(PROTECTED_NAME);
    }
  });

  it("indexes in catalogo.json only folders that exist", () => {
    const catalog = JSON.parse(readFileSync(join(SRC.fontesDir, "catalogo.json"), "utf8")) as { fontes: { pasta: string }[] };
    expect(catalog.fontes.length).toBeGreaterThan(0);
    for (const f of catalog.fontes) expect(existsSync(join(SRC.fontesDir, f.pasta)), f.pasta).toBe(true);
  });
});

describe("generated data and public/", () => {
  const outputs = [...walk(OUT.generated), ...walk(join(SITE, "public"))];

  it("has no file named after a protected translation", () => {
    for (const f of outputs) expect(relative(SITE, f)).not.toMatch(PROTECTED_NAME);
  });

  it("does not contain protected translation titles (outside the credits page source)", () => {
    for (const f of outputs) {
      if (f.endsWith(".bin") || f.endsWith("credits.json")) continue;
      expect(readFileSync(f, "utf8"), f).not.toMatch(PROTECTED_TITLE);
    }
  });

  it("does not contain the ACF/AA quotes of the videos, not even in part (runs BLIVRE also has excepted)", () => {
    const runs = protectedRuns(loadProtectedQuotes(SRC.natalVersesJson), blivreTexts());
    const quoted = new Set(runs.values());
    expect(quoted.size, "quotes that differ from BLIVRE").toBeGreaterThan(30);
    const files = [...outputs, ...textFiles(join(SITE, "src"))].filter((f) => !f.endsWith(".bin") && !f.endsWith(".woff2"));
    for (const f of files) expect(findLeaks(readFileSync(f, "utf8"), runs), relative(SITE, f)).toEqual([]);
  });
});

describe("leak guard", () => {
  const quotes = loadProtectedQuotes(SRC.natalVersesJson);
  const runs = protectedRuns(quotes, blivreTexts());

  it("catches a run of a protected quote inside HTML and inside escaped JSON", () => {
    const [run, label] = [...runs][0];
    const asHtml = `<p>Texto do site</p><p>${run.split(" ").join("<!-- --> ")}</p><p>mais texto</p>`;
    const asJson = JSON.stringify({ t: `antes ${run} depois` }).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
    expect(run.split(" ")).toHaveLength(NGRAM);
    expect(findLeaks(asHtml, runs)).toEqual([`${label}: "${run}"`]);
    expect(findLeaks(asJson, runs)).toEqual([`${label}: "${run}"`]);
  });

  it("lets BLIVRE through", () => {
    const leaks = [...blivreTexts()].flatMap((t) => findLeaks(t, runs));
    expect(leaks).toEqual([]);
  });
});
