// Rule 1 of CLAUDE.md: only free sources. Protected translations (ACF, AA, NVI, ARA, NAA, NTLH…) never reach
// fontes/, the generated data or public/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createReferenceParser } from "../src/lib/canon/reference";
import { OUT, SITE, SRC } from "../scripts/data/sources";
import { bookFile, books } from "./generated";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const PROTECTED_NAME = /(^|[^a-z])(acf|aa|nvi|ara|arc|naa|ntlh|nvt|a21|kja|nbv-?p|almeida[-_ ]?(corrigida|revista|atualizada))([^a-z]|$)/i;
const PROTECTED_TITLE = /Almeida Corrigida|Revista e Atualizada|Revista e Corrigida|Nova Versão Internacional|Linguagem de Hoje|Nova Almeida Atualizada|Nova Versão Transformadora/i;

describe("fontes/", () => {
  it("holds only README.md, SHA256SUMS and files listed there with matching SHA-256", () => {
    const sums = new Map(
      readFileSync(SRC.fontesSums, "utf8").trim().split("\n").map((l) => {
        const [hash, ...name] = l.split("  ");
        return [name.join("  "), hash] as const;
      }),
    );
    for (const file of walk(SRC.fontesDir)) {
      const rel = relative(SRC.fontesDir, file);
      if (rel === "README.md" || rel === "SHA256SUMS") continue;
      expect(sums.has(rel), `${rel} is not in fontes/SHA256SUMS`).toBe(true);
      expect(createHash("sha256").update(readFileSync(file)).digest("hex"), rel).toBe(sums.get(rel));
      expect(rel).not.toMatch(PROTECTED_NAME);
    }
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

  it("does not contain the ACF/AA quotes of the videos, unless BLIVRE has the very same words", () => {
    const quotes = JSON.parse(readFileSync(SRC.natalVersesJson, "utf8")) as Record<string, Record<string, unknown>>;
    const parse = createReferenceParser(books());
    const blivreOf = (ref: string) => {
      const r = parse(ref);
      if (!r.ok || r.ref.verse === undefined) throw new Error(`cannot parse ${ref}`);
      return bookFile(r.ref.book.slug).chapters[r.ref.chapter - 1][r.ref.verse - 1].t;
    };
    const texts = outputs.filter((f) => !f.endsWith(".bin")).map((f) => readFileSync(f, "utf8"));
    let checked = 0;
    for (const [translation, verses] of Object.entries(quotes)) {
      expect(["ACF", "AA"]).toContain(translation);
      for (const [ref, quote] of Object.entries(verses)) {
        if (ref.startsWith("_")) continue; // metadata such as _books_sample
        if (typeof quote !== "string") throw new Error(`${translation} ${ref} is not a string`);
        if (quote === blivreOf(ref)) continue;
        const needle = JSON.stringify(quote).slice(1, -1); // as it would appear inside JSON
        for (const t of texts) expect(t.includes(needle) || t.includes(quote), `${translation} ${ref}`).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});
