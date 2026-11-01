"use client";
import { useSyncExternalStore } from "react";
import { createReadingProgressStore, READING_PROGRESS_EVENT, READING_PROGRESS_KEY, READING_RECOVERY_KEY, SERVER_READING_SNAPSHOT } from "./store-core";
import { withReadingProgressLock } from "./browser-lock";
export { READING_PROGRESS_EVENT, READING_PROGRESS_KEY, READING_RECOVERY_KEY } from "./store-core";
export type { ReadingSnapshot, ReadingMutationResult, ReadingExportResult } from "./store-core";

const store = createReadingProgressStore({
  storage: () => typeof window === "undefined" ? null : window.localStorage,
  subscribe(callback) {
    if (typeof window === "undefined") return () => {};
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === READING_PROGRESS_KEY || event.key === READING_RECOVERY_KEY) callback(); };
    window.addEventListener("storage", onStorage); window.addEventListener(READING_PROGRESS_EVENT, callback);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(READING_PROGRESS_EVENT, callback); };
  },
  publish: () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(READING_PROGRESS_EVENT)); },
  lock: withReadingProgressLock,
});
export const { subscribeReadingProgress, getServerReadingProgressSnapshot, markVerseRead, markChapterRead, setAutomaticReading, rememberReadingPosition, undoReadingChange, exportReadingBackup, importReadingBackup, exportReadingRecovery } = store;
export const getReadingProgressSnapshot = () => typeof window === "undefined" ? SERVER_READING_SNAPSHOT : store.getReadingProgressSnapshot();
export function useReadingProgress() { return useSyncExternalStore(subscribeReadingProgress, getReadingProgressSnapshot, getServerReadingProgressSnapshot); }
