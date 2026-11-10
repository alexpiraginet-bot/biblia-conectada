// How the reader wants the chapter: "Estudo" (the text with each verse's links and actions, as always) or "Leitura"
// (the text and its numbers alone), and the size of the Bible text. Kept on the device, in one versioned key, and
// applied to <html> before the first paint (READER_PREFS_SCRIPT in the root layout's head), so a link to a verse
// never lands on a page that then changes height. Pure: no storage and no DOM here. Rules: docs/LEITURA.md.

export const READER_PREFS_KEY = "bc:leitor:v1";
/** dispatched on window after this tab changes a preference (other tabs get the "storage" event) */
export const READER_PREFS_EVENT = "bc:leitor";

export type ReaderMode = "estudo" | "leitura";
export type ReaderPrefs = { modo: ReaderMode; texto: number };

/** Steps of the Bible text's size and the factor of each; 0 is the design's own size (19 to 21px). */
export const TEXT_STEPS = [-1, 0, 1, 2, 3] as const;
export const TEXT_SCALE: Record<(typeof TEXT_STEPS)[number], number> = { [-1]: 0.9, 0: 1, 1: 1.12, 2: 1.25, 3: 1.4 };
export const DEFAULT_READER_PREFS: ReaderPrefs = { modo: "estudo", texto: 0 };

const isStep = (n: unknown): n is (typeof TEXT_STEPS)[number] => (TEXT_STEPS as readonly unknown[]).includes(n);

/** The stored preferences; anything missing or odd is the default, never an error. */
export function parseReaderPrefs(raw: string | null | undefined): ReaderPrefs {
  if (!raw) return DEFAULT_READER_PREFS;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return DEFAULT_READER_PREFS;
    const { modo, texto } = data as Record<string, unknown>;
    return { modo: modo === "leitura" ? "leitura" : "estudo", texto: isStep(texto) ? texto : 0 };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

/** What to store; null when everything is the default, so the key goes away. */
export function serializeReaderPrefs(prefs: ReaderPrefs): string | null {
  const modo = prefs.modo === "leitura" ? "leitura" : "estudo";
  const texto = isStep(prefs.texto) ? prefs.texto : 0;
  return modo === "estudo" && texto === 0 ? null : JSON.stringify({ modo, texto });
}

/** The attributes of <html> for some preferences: data-leitor="leitura" and data-texto="<step>", absent by default. */
export function readerAttributes(prefs: ReaderPrefs): { "data-leitor": string | null; "data-texto": string | null } {
  return {
    "data-leitor": prefs.modo === "leitura" ? "leitura" : null,
    "data-texto": isStep(prefs.texto) && prefs.texto !== 0 ? String(prefs.texto) : null,
  };
}

export function nextTextStep(texto: number, direction: 1 | -1): number {
  const at = TEXT_STEPS.indexOf(isStep(texto) ? texto : 0);
  return TEXT_STEPS[Math.min(TEXT_STEPS.length - 1, Math.max(0, at + direction))];
}

/**
 * The same reading and the same attributes as parseReaderPrefs + readerAttributes, as a script for the head: it runs
 * before the stylesheet paints anything. tests/reader-prefs.test.ts runs it against the functions above.
 */
export const READER_PREFS_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${READER_PREFS_KEY}")||"null"),r=document.documentElement;if(!p||typeof p!=="object")return;if(p.modo==="leitura")r.setAttribute("data-leitor","leitura");if(${JSON.stringify(TEXT_STEPS.filter((s) => s !== 0))}.indexOf(p.texto)>=0)r.setAttribute("data-texto",String(p.texto))}catch(e){}})()`;
