// Passages saved on this device ("Salvar trecho" on the reading pages, listed on /salvos). Stored only in the
// browser's localStorage under one versioned key; nothing is sent anywhere. Every storage access is wrapped in
// try/catch: private windows, blocked site data and full quotas must never break the page.
// Pure helpers plus a thin storage layer, safe to import from client components (no data imports).

export const SALVOS_KEY = "bc:salvos:v1";
/** dispatched on window after this tab writes, so open lists update (other tabs get the "storage" event) */
export const SALVOS_EVENT = "bc:salvos";

export type Salvo = {
  id: string;
  /** "Gênesis 1:3" or "Gênesis 1:3–5" */
  ref: string;
  /** the verse page of the first verse, "/genesis/1/3" */
  path: string;
  livro: string;
  cap: number;
  de: number;
  ate: number;
  /** the selected BLIVRE text, as shown on the page */
  texto: string;
  /** ISO date */
  salvoEm: string;
};

/** "Gênesis 1:3", or "Gênesis 1:3–5" when the passage spans verses */
export function passageRef(book: string, chapter: number, from: number, to: number): string {
  return to > from ? `${book} ${chapter}:${from}–${to}` : `${book} ${chapter}:${from}`;
}

/** Whitespace of a selection folded to single spaces. */
export function cleanQuote(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** "Haja luz; — Gênesis 1:3 (BLIVRE)" */
export function quoteWithRef(text: string, ref: string): string {
  return `${cleanQuote(text)} — ${ref} (BLIVRE)`;
}

/**
 * Text fragment (#:~:text=) that makes the browser scroll to and mark the quote on the linked page. Short quotes go
 * whole; longer ones as their first and last words. Characters with a meaning in the directive are escaped.
 */
export function textFragment(text: string): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, "%2D");
  const words = cleanQuote(text).split(" ");
  if (words.length <= 8) return `#:~:text=${enc(words.join(" "))}`;
  return `#:~:text=${enc(words.slice(0, 4).join(" "))},${enc(words.slice(-4).join(" "))}`;
}

function isSalvo(x: unknown): x is Salvo {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.ref === "string" &&
    typeof o.path === "string" &&
    o.path.startsWith("/") &&
    typeof o.livro === "string" &&
    typeof o.texto === "string" &&
    typeof o.salvoEm === "string" &&
    [o.cap, o.de, o.ate].every((n) => Number.isInteger(n) && (n as number) > 0)
  );
}

/** Saved passages from the stored string; anything malformed is dropped, never thrown. */
export function parseSalvos(raw: string | null | undefined): Salvo[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isSalvo) : [];
  } catch {
    return [];
  }
}

/** Newest first; the same text of the same passage is kept once (saving it again moves it to the top). */
export function addSalvo(list: readonly Salvo[], item: Salvo): Salvo[] {
  return [item, ...list.filter((s) => !(s.path === item.path && s.ate === item.ate && s.texto === item.texto))];
}

export function removeSalvo(list: readonly Salvo[], id: string): Salvo[] {
  return list.filter((s) => s.id !== id);
}

/** The JSON file offered by "Baixar (JSON)". */
export function exportSalvos(list: readonly Salvo[], now: Date): string {
  return JSON.stringify(
    {
      formato: "biblia-conectada/salvos@1",
      exportadoEm: now.toISOString(),
      fonte: "Texto: Bíblia Livre (BLIVRE), CC BY 4.0",
      itens: list,
    },
    null,
    2,
  );
}

// ---- storage (browser only)

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The stored string, or null; also the snapshot read by useSyncExternalStore (a string compares by value). */
export function readRaw(): string | null {
  try {
    return storage()?.getItem(SALVOS_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readSalvos(): Salvo[] {
  return parseSalvos(readRaw());
}

/** Writes the list (an empty list removes the key). Returns false when the browser refuses to store it. */
export function writeSalvos(list: readonly Salvo[]): boolean {
  try {
    const s = storage();
    if (!s) return false;
    if (list.length) s.setItem(SALVOS_KEY, JSON.stringify(list));
    else s.removeItem(SALVOS_KEY);
    window.dispatchEvent(new Event(SALVOS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function subscribeSalvos(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SALVOS_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SALVOS_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SALVOS_EVENT, cb);
  };
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
