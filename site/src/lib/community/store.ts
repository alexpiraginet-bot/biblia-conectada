// What the community pages keep, only on this device (localStorage). Every read and write is guarded: private
// windows, blocked storage and full quotas make the pages work without memory instead of failing.
// No server, no account, no analytics: nothing here leaves the browser.

export const STORE_PREFIX = "bc:";
export const KEYS = {
  ponte: "bc:ponte",
  /** "1" while the strip on the reading pages has something to say (a bridge in progress or just finished) */
  ponteStrip: "bc:ponte-faixa",
  trail: (slug: string) => `bc:trilha:${slug}`,
  mesa: "bc:mesa",
} as const;

/** Same-tab signal: the storage event only reaches other tabs. */
export const STORE_EVENT = "bc:store";

export function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeRaw(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the page keeps working for this visit only
  }
  try {
    window.dispatchEvent(new Event(STORE_EVENT));
  } catch {}
}

export function writeJSON(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

/** "Apagar tudo deste aparelho": removes every key the community pages wrote (the theme choice stays). */
export function clearDevice(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(STORE_PREFIX)) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {}
  try {
    window.dispatchEvent(new Event(STORE_EVENT));
  } catch {}
}

export function subscribeStore(cb: () => void): () => void {
  window.addEventListener(STORE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(STORE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Progress of one bridge on this device. Verses are global indices. */
export type BridgeProgress = {
  n: number;
  start: number;
  target: number;
  min: number;
  /** verses visited, start first; each step is a real link from the previous verse */
  path: number[];
  /** votes of each hop of `path` (sum of both directions) */
  votes: number[];
  state: "playing" | "arrived" | "gaveUp";
  /** page of this bridge (/ponte/<n> or /ponte#<n>) */
  home: string;
};
export type PonteStore = { current?: number; bridges: Record<string, BridgeProgress> };

export function readPonte(): PonteStore {
  const s = readJSON<PonteStore>(KEYS.ponte, { bridges: {} });
  return s && typeof s === "object" && s.bridges ? s : { bridges: {} };
}
