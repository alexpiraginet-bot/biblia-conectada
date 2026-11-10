// Persistence of the notebook (model.ts) in one versioned localStorage key. Nothing is sent anywhere. A change is
// confirmed only after the browser stored it and gave it back; blocked storage, a full quota and unreadable data are
// said as they are, never turned into an empty notebook. Testable: the browser is passed in (store.ts binds it).
import { CadernoError, cadernoBytes, emptyCaderno, isEmptyCaderno, MAX_CADERNO_BYTES, parseCaderno, type Caderno } from "./model";

import { CADERNO_KEY, CADERNO_RECOVERY_KEY } from "./keys";

export { CADERNO_EVENT, CADERNO_KEY, CADERNO_RECOVERY_KEY } from "./keys";
export const MAX_CADERNO_RECOVERY_BYTES = 3_000_000;

export type CadernoStatus = "loading" | "ready" | "unavailable" | "corrupt";
export type CadernoSnapshot = { status: CadernoStatus; state: Caderno; message?: string };
export type CadernoResult = { ok: boolean; changed: boolean; message: string };
export type CadernoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Environment = { storage: () => CadernoStorage | null; subscribe?: (callback: () => void) => () => void; publish?: () => void; now?: () => Date };

export const SERVER_CADERNO_SNAPSHOT: CadernoSnapshot = { status: "loading", state: emptyCaderno() };
const UNAVAILABLE = "O navegador não deixou acessar o caderno neste aparelho. Nada foi alterado; confira se o armazenamento do site está liberado.";
const CORRUPT = "Os dados do caderno neste navegador não puderam ser lidos. Eles continuam guardados, e nada novo será gravado por cima.";
const NOT_SAVED = "Não foi possível guardar neste navegador. Nada foi confirmado; libere espaço ou baixe uma cópia do caderno.";

export function createCadernoStore(environment: Environment) {
  let snapshot = SERVER_CADERNO_SNAPSHOT;
  let cachedRaw: string | null | undefined;
  const listeners = new Set<() => void>();

  /** The current snapshot; the same object while the stored string is the same (useSyncExternalStore needs that). */
  function refresh(): CadernoSnapshot {
    let raw: string | null;
    try {
      const storage = environment.storage();
      if (!storage) throw new Error("Storage unavailable");
      raw = storage.getItem(CADERNO_KEY);
    } catch {
      if (snapshot.status !== "unavailable") snapshot = { status: "unavailable", state: snapshot.state, message: UNAVAILABLE };
      cachedRaw = undefined;
      return snapshot;
    }
    if (raw === cachedRaw && (snapshot.status === "ready" || snapshot.status === "corrupt")) return snapshot;
    cachedRaw = raw;
    try {
      snapshot = { status: "ready", state: parseCaderno(raw) };
    } catch {
      snapshot = { status: "corrupt", state: emptyCaderno(), message: CORRUPT };
    }
    return snapshot;
  }

  function notify() {
    refresh();
    for (const listener of listeners) listener();
    environment.publish?.();
  }

  function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    const external = environment.subscribe?.(() => {
      refresh();
      callback();
    });
    return () => {
      listeners.delete(callback);
      external?.();
    };
  }

  /**
   * Reads the stored notebook, applies one change and writes it back, all in the same task. `done` is said when the
   * notebook changed and `same` when it already was that way.
   */
  function change(operation: (state: Caderno) => Caderno, done: string, same = done): CadernoResult {
    try {
      const storage = environment.storage();
      if (!storage) return { ok: false, changed: false, message: UNAVAILABLE };
      let state: Caderno;
      try {
        state = parseCaderno(storage.getItem(CADERNO_KEY));
      } catch {
        refresh();
        return { ok: false, changed: false, message: CORRUPT };
      }
      const next = operation(state);
      if (next === state) return { ok: true, changed: false, message: same };
      if (isEmptyCaderno(next)) {
        storage.removeItem(CADERNO_KEY);
        if (storage.getItem(CADERNO_KEY) !== null) return { ok: false, changed: false, message: NOT_SAVED };
      } else {
        const raw = JSON.stringify(next);
        if (cadernoBytes(raw) > MAX_CADERNO_BYTES) throw new CadernoError("O caderno chegou ao limite de espaço neste aparelho. Baixe uma cópia e apague o que não usa mais.");
        storage.setItem(CADERNO_KEY, raw);
        if (storage.getItem(CADERNO_KEY) !== raw) return { ok: false, changed: false, message: NOT_SAVED };
      }
      notify();
      return { ok: true, changed: true, message: done };
    } catch (error) {
      return { ok: false, changed: false, message: error instanceof CadernoError ? error.message : NOT_SAVED };
    }
  }

  /** The unreadable string, for "Baixar os dados ilegíveis"; null when the notebook is readable or out of reach. */
  function unreadableRaw(): string | null {
    try {
      return refresh().status === "corrupt" ? (environment.storage()?.getItem(CADERNO_KEY) ?? null) : null;
    } catch {
      return null;
    }
  }

  /**
   * Starts an empty notebook after unreadable data, by the reader's explicit choice. The unreadable string is first
   * set aside under CADERNO_RECOVERY_KEY; if that copy cannot be stored and read back, nothing is removed.
   */
  function restart(): CadernoResult {
    try {
      const storage = environment.storage();
      if (!storage) return { ok: false, changed: false, message: UNAVAILABLE };
      const raw = storage.getItem(CADERNO_KEY);
      try {
        parseCaderno(raw);
        return { ok: false, changed: false, message: "O caderno deste aparelho está legível; não há o que recomeçar." };
      } catch {
        /* unreadable: the only state this is for */
      }
      if (raw === null) return { ok: false, changed: false, message: "Não há dados ilegíveis neste navegador." };
      let copies: { em: string; raw: string }[] = [];
      const previous = storage.getItem(CADERNO_RECOVERY_KEY);
      if (previous !== null) {
        const parsed: unknown = JSON.parse(previous);
        if (!Array.isArray(parsed)) throw new CadernoError("A cópia de segurança anterior não pôde ser lida. Nada foi apagado; baixe os dados ilegíveis antes de continuar.");
        copies = parsed as { em: string; raw: string }[];
      }
      if (!copies.some((copy) => copy.raw === raw)) copies.push({ em: (environment.now?.() ?? new Date()).toISOString(), raw });
      const archive = JSON.stringify(copies);
      if (cadernoBytes(archive) > MAX_CADERNO_RECOVERY_BYTES) throw new CadernoError("As cópias de segurança chegaram ao limite neste aparelho. Nada foi apagado; baixe os dados ilegíveis antes de continuar.");
      storage.setItem(CADERNO_RECOVERY_KEY, archive);
      if (storage.getItem(CADERNO_RECOVERY_KEY) !== archive) return { ok: false, changed: false, message: "Não foi possível guardar a cópia de segurança. Nada foi apagado." };
      storage.removeItem(CADERNO_KEY);
      notify();
      return { ok: true, changed: true, message: "Caderno recomeçado. Os dados ilegíveis continuam guardados neste navegador, à parte." };
    } catch (error) {
      return { ok: false, changed: false, message: error instanceof CadernoError ? error.message : "Não foi possível recomeçar o caderno. Nada foi apagado." };
    }
  }

  return { subscribe, getSnapshot: refresh, change, unreadableRaw, restart };
}
