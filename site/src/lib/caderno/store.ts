"use client";
// The notebook bound to this browser's localStorage (store-core.ts has the rules; model.ts the data).
import { useSyncExternalStore } from "react";
import { newId, readSalvos, writeSalvos } from "@/lib/salvos";
import {
  addMemo, cadernoDay, emptyCaderno, exportCaderno, isEmptyCaderno, markVerses, mergeCaderno, mergeSalvos, parseCadernoBackup, removeMemo, removeNota, reviewMemo, samePassage, saveNota, unmarkVerses,
  CadernoError, type CadernoCatalog, type MarkColor, type Passage,
} from "./model";
import { CADERNO_EVENT, CADERNO_KEY, CADERNO_RECOVERY_KEY, createCadernoStore, SERVER_CADERNO_SNAPSHOT, type CadernoResult } from "./store-core";

export { CADERNO_EVENT, CADERNO_KEY } from "./store-core";
export type { CadernoResult, CadernoSnapshot } from "./store-core";

const store = createCadernoStore({
  storage: () => (typeof window === "undefined" ? null : window.localStorage),
  subscribe(callback) {
    if (typeof window === "undefined") return () => {};
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CADERNO_KEY || event.key === CADERNO_RECOVERY_KEY) callback();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CADERNO_EVENT, callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CADERNO_EVENT, callback);
    };
  },
  publish: () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(CADERNO_EVENT));
  },
});

export const subscribeCaderno = store.subscribe;
export const getCadernoSnapshot = () => (typeof window === "undefined" ? SERVER_CADERNO_SNAPSHOT : store.getSnapshot());
export const unreadableCaderno = store.unreadableRaw;
export const restartCaderno = store.restart;
export function useCaderno() {
  return useSyncExternalStore(subscribeCaderno, getCadernoSnapshot, () => SERVER_CADERNO_SNAPSHOT);
}

const now = () => new Date().toISOString();
/** Today in Brasília, the day the review schedule counts by. */
export const today = () => cadernoDay(new Date());

export const markPassage = (livro: string, cap: number, verses: readonly { vers: number; texto: string }[], cor: MarkColor): CadernoResult =>
  store.change((c) => markVerses(c, livro, cap, verses, cor, now()), verses.length === 1 ? "Versículo grifado neste aparelho." : "Versículos grifados neste aparelho.");
export const unmarkPassage = (livro: string, cap: number, verses: readonly number[]): CadernoResult =>
  store.change((c) => unmarkVerses(c, livro, cap, verses), "Grifo tirado.", "Não havia grifo neste trecho.");
export const writeNota = (passage: Passage, trecho: string, nota: string): CadernoResult =>
  store.change((c) => saveNota(c, passage, trecho, nota, now(), newId()), "Anotação guardada neste aparelho.", "A anotação já estava guardada assim.");
export const eraseNota = (id: string): CadernoResult => store.change((c) => removeNota(c, id), "Anotação apagada.", "A anotação já tinha sido apagada.");
export function memorise(passage: Passage, texto: string): CadernoResult {
  const listed = getCadernoSnapshot().state.memos.some((m) => samePassage(m, passage));
  const done = listed ? "Texto atualizado na sua lista para decorar." : "Guardado para decorar. A primeira revisão já está no caderno.";
  return store.change((c) => addMemo(c, passage, texto, today(), now(), newId()), done, "Esta passagem já está na sua lista para decorar.");
}
export const answerReview = (id: string, remembered: boolean): CadernoResult =>
  store.change((c) => reviewMemo(c, id, remembered, today(), now()), remembered ? "Revisão guardada." : "Vai voltar ainda hoje.");
export const eraseMemo = (id: string): CadernoResult => store.change((c) => removeMemo(c, id), "Passagem tirada da lista para decorar.", "A passagem já tinha saído da lista.");

/** Empties the notebook of this device (the saved passages of /salvos have their own "Apagar tudo"). */
export const clearCaderno = (): CadernoResult =>
  store.change((c) => (isEmptyCaderno(c) ? c : emptyCaderno()), "Caderno apagado deste aparelho.", "O caderno deste aparelho já estava vazio.");

/** The backup file: the notebook and the saved passages of /salvos. Null while the notebook cannot be read. */
export function cadernoBackup(): { text: string; filename: string } | null {
  const snapshot = getCadernoSnapshot();
  if (snapshot.status !== "ready") return null;
  const at = new Date();
  return { text: exportCaderno(snapshot.state, readSalvos(), at), filename: `caderno-biblia-conectada-${cadernoDay(at)}.json` };
}

/** Checks a backup file whole, then merges it: the notebook first, the saved passages after it. */
export function importCadernoBackup(raw: string, catalog: CadernoCatalog): CadernoResult {
  let backup: ReturnType<typeof parseCadernoBackup>;
  try {
    backup = parseCadernoBackup(raw, catalog);
  } catch (error) {
    return { ok: false, changed: false, message: error instanceof CadernoError ? error.message : "Este arquivo não é um backup do caderno." };
  }
  const merged = store.change((c) => mergeCaderno(c, backup.caderno), "Backup mesclado ao caderno deste aparelho.", "O caderno deste aparelho já tinha tudo o que está no backup.");
  if (!merged.ok) return merged;
  const salvos = mergeSalvos(readSalvos(), backup.salvos);
  if (!salvos) return merged;
  if (!writeSalvos(salvos)) return { ok: false, changed: merged.changed, message: "O caderno foi mesclado, mas o navegador não deixou guardar os trechos salvos do backup." };
  return { ok: true, changed: true, message: merged.changed ? "Backup mesclado: caderno e trechos salvos." : "Os trechos salvos do backup foram acrescentados aos deste aparelho." };
}
