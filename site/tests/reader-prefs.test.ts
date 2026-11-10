// The reader's preferences (Estudo/Leitura and the size of the Bible text; docs/LEITURA.md): the pure rules, the
// script that applies them before the first paint, and the stylesheet and markup hooks they rely on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { SITE } from "../scripts/data/sources";
import {
  DEFAULT_READER_PREFS, nextTextStep, parseReaderPrefs, READER_PREFS_KEY, READER_PREFS_SCRIPT, readerAttributes, serializeReaderPrefs, TEXT_SCALE, TEXT_STEPS,
} from "../src/lib/reader-prefs";

const src = (rel: string) => readFileSync(join(SITE, "src", rel), "utf8");

/** Runs the head's script against a stored string and returns the attributes it set on <html>. */
function head(storedValue: string | null | Error) {
  const set: Record<string, string> = {};
  runInNewContext(READER_PREFS_SCRIPT, {
    localStorage: { getItem: (key: string) => { if (storedValue instanceof Error) throw storedValue; return key === READER_PREFS_KEY ? storedValue : null; } },
    document: { documentElement: { setAttribute: (name: string, value: string) => { set[name] = value; } } },
  });
  return set;
}
const wanted = (raw: string | null) => Object.fromEntries(Object.entries(readerAttributes(parseReaderPrefs(raw))).filter(([, v]) => v !== null));

const STORED: (string | null)[] = [
  null, "", "null", "0", "[]", "{}", "{not json", '"leitura"',
  '{"modo":"leitura"}', '{"modo":"estudo"}', '{"modo":"LEITURA"}', '{"modo":1}',
  ...TEXT_STEPS.map((t) => JSON.stringify({ modo: "leitura", texto: t })),
  ...TEXT_STEPS.map((t) => JSON.stringify({ modo: "estudo", texto: t })),
  '{"texto":4}', '{"texto":-2}', '{"texto":1.5}', '{"texto":"2"}', '{"texto":null}', '{"modo":"leitura","texto":99,"extra":true}',
];

describe("reader preferences", () => {
  it("default to Estudo at the design's own size, whatever is stored wrong", () => {
    for (const raw of [null, "", "null", "[]", "{not json", '{"modo":"outra","texto":7}']) expect(parseReaderPrefs(raw), String(raw)).toEqual(DEFAULT_READER_PREFS);
    expect(parseReaderPrefs('{"modo":"leitura","texto":2}')).toEqual({ modo: "leitura", texto: 2 });
    expect(parseReaderPrefs('{"texto":-1}')).toEqual({ modo: "estudo", texto: -1 });
  });

  it("store nothing for the defaults and round-trip every choice", () => {
    expect(serializeReaderPrefs(DEFAULT_READER_PREFS)).toBeNull();
    expect(serializeReaderPrefs({ modo: "estudo", texto: 9 })).toBeNull();
    for (const modo of ["estudo", "leitura"] as const) {
      for (const texto of TEXT_STEPS) {
        const raw = serializeReaderPrefs({ modo, texto });
        expect(parseReaderPrefs(raw)).toEqual({ modo, texto });
      }
    }
  });

  it("step the text size inside its range", () => {
    expect([...TEXT_STEPS]).toEqual([-1, 0, 1, 2, 3]);
    expect(nextTextStep(0, 1)).toBe(1);
    expect(nextTextStep(3, 1)).toBe(3);
    expect(nextTextStep(-1, -1)).toBe(-1);
    expect(nextTextStep(0, -1)).toBe(-1);
    expect(nextTextStep(42, 1)).toBe(1);
  });
});

describe("before the first paint", () => {
  it.each(STORED)("the head's script sets what the rules say for %s", (raw) => {
    expect(head(raw)).toEqual(wanted(raw));
  });

  it("sets Leitura and the size, and nothing by default", () => {
    expect(head('{"modo":"leitura","texto":2}')).toEqual({ "data-leitor": "leitura", "data-texto": "2" });
    expect(head('{"modo":"estudo","texto":0}')).toEqual({});
    expect(head(null)).toEqual({});
  });

  it("never throws when the browser blocks storage", () => {
    expect(head(new Error("SecurityError"))).toEqual({});
  });

  it("runs in the root layout's head right after the theme", () => {
    expect(src("app/layout.tsx")).toContain("`${THEME_SCRIPT};${READER_PREFS_SCRIPT};${PAGE_SEARCH_SCRIPT};${VERSE_INTENT_SCRIPT}`");
    // plain ES5 in one expression: it is concatenated with the other head snippets by ";"
    expect(READER_PREFS_SCRIPT).toMatch(/^\(function\(\)\{[\s\S]*\}\)\(\)$/);
    expect(READER_PREFS_SCRIPT).not.toMatch(/=>|\blet\b|\bconst\b|`/);
  });
});

describe("the stylesheet and the markup", () => {
  const css = src("components/reader/reader-prefs.css");
  // the size's factors are in the stylesheet every page loads, not in the control's
  const everywhere = src("styles/ds.css");

  it("scale the Bible text by the factors of the rules, and never under 17px", () => {
    for (const step of TEXT_STEPS) {
      const rule = new RegExp(`html\\[data-texto="${step}"\\] \\{ --leitor-escala: ([\\d.]+); \\}`).exec(everywhere);
      if (step === 0) expect(rule).toBeNull();
      else expect(Number(rule?.[1]), String(step)).toBe(TEXT_SCALE[step]);
    }
    expect(css).not.toContain("--leitor-escala");
    expect(TEXT_SCALE[0]).toBe(1);
    const ds = src("styles/ds.css");
    const size = /\.bc-scripture \{[^}]*font-size: calc\(clamp\(([\d.]+)rem, [^)]*\) \* var\(--leitor-escala, 1\)\);/.exec(ds);
    expect(size, "ds.css .bc-scripture multiplies its size by the reader's scale").not.toBeNull();
    // design/README.md §4: Scripture is never under 17px
    expect(Number(size![1]) * 16 * Math.min(...Object.values(TEXT_SCALE))).toBeGreaterThanOrEqual(17);
    // the hanging verse number keeps the line of the scaled text
    expect(src("components/reader/reader.module.css")).toContain("line-height: calc(var(--fs-scripture) * var(--lh-scripture) * var(--leitor-escala, 1));");
  });

  it("hide in Leitura exactly what the two readers mark, and leave the text alone", () => {
    expect(css).toContain('html[data-leitor="leitura"] ol[data-reader] [data-verse-actions]');
    expect(css).toContain('html[data-leitor="leitura"] ol[data-reader] .bc-verse__links');
    expect(css).toContain('html[data-leitor="leitura"] .bc-pager[data-where="topo"]');
    expect(css).not.toMatch(/data-scripture|bc-verse__n\b|\.bc-verse\b[^_]/);
    expect(src("components/reader/ChapterText.tsx")).toContain('data-reader=""');
    expect(src("components/assistant/VerseActions.tsx")).toContain('data-verse-actions=""');
    expect(src("components/reader/InterlinearStudyLink.tsx")).toContain('data-verse-actions=""');
    const nbv = src("components/reader/TranslationReader.tsx");
    expect(nbv).toContain('data-translation="open-nbv" data-reader=""');
    expect(nbv).toContain('className={styles.verseActions} data-verse-actions=""');
    // both readers offer the choice
    expect(nbv).toContain("<ReaderPrefs />");
    expect(src("app/(site)/[livro]/[cap]/layout.tsx")).toContain("<ReaderPrefs />");
  });
});
