import { describe, expect, it } from "vitest";
import blivreBooks from "../src/data/generated/books.json";
import nbvBooks from "../src/data/generated/translations/open-nbv-books.json";
import { chapterReadingSummary, emptyReadingProgress, editionReadingSummary, isVerseRead, markReading, MAX_READING_BYTES, mergeReadingProgress, parseReadingBackup, parseReadingProgress, readChapterVerses, readingBytes, serializeReadingBackup, undoReading, type ChapterScope, type ReadingCatalog } from "../src/lib/reading-progress/model";
import { createReadingProgressStore, MAX_READING_RECOVERY_BYTES, READING_PROGRESS_KEY, READING_RECOVERY_KEY, type ReadingStorage } from "../src/lib/reading-progress/store-core";
import { createReadingBrowserLock } from "../src/lib/reading-progress/browser-lock";

const catalog: ReadingCatalog = { blivre: blivreBooks, "open-nbv": nbvBooks };
const scope: ChapterScope = { edition: "blivre", book: "joao", chapter: 1, verseCount: blivreBooks.find(book => book.slug === "joao")!.verses[0] };
const at = "2026-11-01T20:00:00.000Z";
const mark = (verse: number) => markReading(emptyReadingProgress(), scope, verse, true, at, `revision-${verse}`);
function browserFixture() {
  const values = new Map<string, string>(), listeners = new Set<() => void>(); let quota = false, inaccessible = false, serial = 0, time = 0, queue: Promise<unknown> = Promise.resolve();
  const storage: ReadingStorage = { getItem(key) { if (inaccessible) throw new Error("Blocked storage"); return values.get(key) ?? null; }, setItem(key, value) { if (quota) throw new Error("QuotaExceededError"); if (inaccessible) throw new Error("Blocked storage"); values.set(key, value); } };
  const createStore = () => createReadingProgressStore({ storage: () => storage, now: () => new Date(Date.parse(at) + time++), revision: () => `revision-${++serial}`,
    subscribe(callback) { listeners.add(callback); return () => { listeners.delete(callback); }; }, publish() { for (const listener of listeners) listener(); },
    lock<T>(operation: () => T) { const result = queue.then(operation); queue = result.then(() => undefined, () => undefined); return result; },
  });
  return { values, storage, createStore, store: createStore(), quota(value: boolean) { quota = value; }, inaccessible(value: boolean) { inaccessible = value; } };
}
describe("edition-specific reading model", () => {
  it("marks a verse once without merging translations or mutating the prior state", () => {
    const original = emptyReadingProgress(), result = markReading(original, scope, 1, true, at, "revision-first");
    expect(readChapterVerses(original, scope)).toEqual([]); expect(readChapterVerses(result.state, scope)).toEqual([1]);
    const duplicate = markReading(result.state, scope, 1, true, at, "revision-repeat");
    expect(duplicate.state).toBe(result.state); expect(duplicate.undo).toBeUndefined();
    expect(editionReadingSummary(result.state, "blivre", catalog.blivre).readVerses).toBe(1);
    expect(editionReadingSummary(result.state, "open-nbv", catalog["open-nbv"]).readVerses).toBe(0);
    expect(result.state.editions.blivre.lastRead).toMatchObject({ book: "joao", chapter: 1, verse: 1 });
  });
  it("uses each edition's actual chapter counts and rejects out-of-range operations", () => {
    const difference = catalog.blivre.flatMap(book => book.verses.map((count, chapter) => ({ book, count, chapter: chapter + 1, other: catalog["open-nbv"].find(other => other.slug === book.slug)!.verses[chapter] }))).find(row => row.count !== row.other)!;
    expect(difference).toBeTruthy();
    const left = { edition: "blivre" as const, book: difference.book.slug, chapter: difference.chapter, verseCount: difference.count };
    const right = { ...left, edition: "open-nbv" as const, verseCount: difference.other };
    const result = markReading(emptyReadingProgress(), left, null, true, at, "revision-whole").state;
    expect(chapterReadingSummary(result, left)).toMatchObject({ readVerses: difference.count, totalVerses: difference.count, complete: true });
    expect(chapterReadingSummary(result, right)).toMatchObject({ readVerses: 0, totalVerses: difference.other, complete: false });
    for (const verse of [0, -1, 1.5, scope.verseCount + 1, NaN]) expect(() => markReading(result, scope, verse, true, at, "revision-invalid")).toThrow();
  });
  it("computes full Bible completion from real catalogs and fits the complete two-edition backup", () => {
    const state = emptyReadingProgress();
    for (const edition of ["blivre", "open-nbv"] as const) for (const book of catalog[edition]) book.verses.forEach((count, chapter) => {
      state.editions[edition].chapters[`${book.slug}/${chapter + 1}`] = { verses: Array.from({ length: count }, (_, verse) => verse + 1), revision: "revision-full" };
    });
    for (const edition of ["blivre", "open-nbv"] as const) {
      const expectedVerses = catalog[edition].reduce((sum, book) => sum + book.verses.reduce((sum, count) => sum + count, 0), 0), expectedChapters = catalog[edition].reduce((sum, book) => sum + book.verses.length, 0);
      expect(editionReadingSummary(state, edition, catalog[edition])).toMatchObject({ readVerses: expectedVerses, totalVerses: expectedVerses, totalChapters: expectedChapters, completedChapters: expectedChapters, completedBooks: catalog[edition].length, percent: 100 });
    }
    const exported = serializeReadingBackup(state, catalog, at); expect(readingBytes(exported)).toBeLessThan(MAX_READING_BYTES);
    expect(parseReadingBackup(exported, catalog)).toEqual(state);
  });
  it("pauses automatic marking when unmarking or undoing and ignores an obsolete automatic callback", () => {
    const initial = { ...emptyReadingProgress(), automatic: true }, marked = markReading(initial, scope, 1, true, at, "revision-marked");
    const unmarked = markReading(marked.state, scope, 1, false, at, "revision-unmarked");
    expect(unmarked.state.automatic).toBe(false); expect(isVerseRead(unmarked.state, scope, 1)).toBe(false);
    expect(markReading(unmarked.state, scope, 1, true, at, "revision-observer", "automatic").state).toBe(unmarked.state);
    const undone = undoReading(marked.state, marked.undo!, at, "revision-undone"); expect(undone.automatic).toBe(false); expect(readChapterVerses(undone, scope)).toEqual([]);
    expect(markReading(initial, scope, 1, true, at, "revision-auto", "automatic").undo).toBeUndefined();
  });
  it("undo restores only its own chapter and refuses to rewind later changes in that chapter", () => {
    const first = mark(1), otherScope = { ...scope, chapter: 2, verseCount: 25 };
    const second = markReading(first.state, otherScope, 1, true, "2026-11-01T20:01:00.000Z", "revision-other");
    const undone = undoReading(second.state, first.undo!, at, "revision-undo");
    expect(isVerseRead(undone, scope, 1)).toBe(false); expect(isVerseRead(undone, otherScope, 1)).toBe(true); expect(undone.editions.blivre.lastRead?.chapter).toBe(2);
    const concurrent = markReading(first.state, scope, 2, true, at, "revision-concurrent");
    expect(() => undoReading(concurrent.state, first.undo!, at, "revision-stale-undo")).toThrow(/capítulo mudou/);
  });
  it("merges backups by verse union, preserves manual removals in other chapters, and leaves automatic off", () => {
    const current = mark(1).state, incoming = { ...mark(2).state, automatic: true };
    const merged = mergeReadingProgress(current, incoming, at, () => "revision-merge");
    expect(readChapterVerses(merged, scope)).toEqual([1, 2]); expect(merged.automatic).toBe(false); expect(readChapterVerses(current, scope)).toEqual([1]);
  });
  it("deduplicates valid backup verses and rejects unknown editions, books, chapters or verse positions", () => {
    const baseline = JSON.parse(serializeReadingBackup(mark(1).state, catalog, at));
    baseline.progress.editions.blivre.chapters["joao/1"].verses = [2, 1, 1, 2];
    expect(readChapterVerses(parseReadingBackup(JSON.stringify(baseline), catalog), scope)).toEqual([1, 2]);
    const modifications = [
      (data: typeof baseline) => { data.format = "other-app"; },
      (data: typeof baseline) => { data.progress.editions.secret = data.progress.editions.blivre; },
      (data: typeof baseline) => { data.progress.editions.blivre.chapters["unknown/1"] = data.progress.editions.blivre.chapters["joao/1"]; },
      (data: typeof baseline) => { data.progress.editions.blivre.chapters["joao/999"] = data.progress.editions.blivre.chapters["joao/1"]; },
      (data: typeof baseline) => { data.progress.editions.blivre.chapters["joao/1"].verses = [1, 999]; },
      (data: typeof baseline) => { data.progress.editions.blivre.chapters["joao/1"].verses = [1, -1]; },
      (data: typeof baseline) => { data.progress.editions.blivre.lastRead.verse = 999; },
      (data: typeof baseline) => { data.progress.editions.blivre.chapters["joao/1"].verses = ["1"]; },
    ];
    for (const modify of modifications) { const bad = structuredClone(baseline); modify(bad); expect(() => parseReadingBackup(JSON.stringify(bad), catalog)).toThrow(); }
    expect(() => parseReadingBackup(" ".repeat(MAX_READING_BYTES + 1), catalog)).toThrow();
    expect(() => parseReadingProgress("{\"version\":2}")).toThrow();
  });
});
describe("browser-only reading persistence", () => {
  it("refuses writes without cross-tab coordination while leaving reads and exports available", async () => {
    const f = browserFixture(); await f.store.markVerseRead(scope, 1, true); const original = f.values.get(READING_PROGRESS_KEY);
    const noLock = createReadingProgressStore({ storage: () => f.storage });
    expect(noLock.getReadingProgressSnapshot().status).toBe("ready"); expect(noLock.exportReadingBackup(catalog).ok).toBe(true);
    expect((await noLock.markVerseRead(scope, 2, true)).ok).toBe(false); expect(f.values.get(READING_PROGRESS_KEY)).toBe(original);
  });
  it("uses stable snapshots, persists manual marks and notifies subscribers", async () => {
    const f = browserFixture(), first = f.store.getReadingProgressSnapshot(); let notifications = 0; const unsubscribe = f.store.subscribeReadingProgress(() => { notifications++; });
    expect(f.store.getReadingProgressSnapshot()).toBe(first); expect(first.status).toBe("ready"); expect(f.store.getServerReadingProgressSnapshot().status).toBe("loading");
    const result = await f.store.markChapterRead(scope, true); expect(result.ok).toBe(true); expect(result.undo).toBeTruthy(); expect(notifications).toBeGreaterThan(0);
    expect(f.store.getReadingProgressSnapshot().state.editions.blivre.lastRead?.verse).toBe(scope.verseCount);
    const reloaded = f.createStore(); expect(chapterReadingSummary(reloaded.getReadingProgressSnapshot().state, scope).complete).toBe(true);
    unsubscribe();
  });
  it("serializes two tabs through the same browser lock and refuses a stale undo", async () => {
    const f = browserFixture(), second = f.createStore(); let observed = 0; const unsub = second.subscribeReadingProgress(() => { observed++; });
    const [left, right] = await Promise.all([f.store.markVerseRead(scope, 1, true), second.markVerseRead(scope, 2, true)]);
    expect(left.ok && right.ok).toBe(true); expect(readChapterVerses(f.store.getReadingProgressSnapshot().state, scope)).toEqual([1, 2]); expect(observed).toBeGreaterThan(0);
    expect((await f.store.undoReadingChange(left.undo!)).ok).toBe(false); expect(readChapterVerses(second.getReadingProgressSnapshot().state, scope)).toEqual([1, 2]); unsub();
  });
  it("never reports a quota failure as saved and keeps the prior raw progress intact", async () => {
    const f = browserFixture(); await f.store.markVerseRead(scope, 1, true); const original = f.values.get(READING_PROGRESS_KEY); f.quota(true);
    expect((await f.store.markVerseRead(scope, 2, true)).ok).toBe(false); expect(f.values.get(READING_PROGRESS_KEY)).toBe(original); expect(readChapterVerses(f.store.getReadingProgressSnapshot().state, scope)).toEqual([1]);
    expect((await f.store.setAutomaticReading(true)).ok).toBe(false); expect(f.store.getReadingProgressSnapshot().state.automatic).toBe(false);
  });
  it("exposes unavailable storage and recovers without erasing a previously saved mark", async () => {
    const f = browserFixture(); await f.store.markVerseRead(scope, 1, true); f.inaccessible(true);
    expect(f.store.getReadingProgressSnapshot().status).toBe("unavailable"); expect((await f.store.markVerseRead(scope, 2, true)).ok).toBe(false);
    f.inaccessible(false); expect(f.store.getReadingProgressSnapshot().status).toBe("ready"); expect(isVerseRead(f.store.getReadingProgressSnapshot().state, scope, 1)).toBe(true);
  });
  it("does not overwrite a corrupt file through regular writes or import", async () => {
    const f = browserFixture(); const original = "{not-valid-json"; f.values.set(READING_PROGRESS_KEY, original);
    expect(f.store.getReadingProgressSnapshot().status).toBe("corrupt"); expect((await f.store.markChapterRead(scope, true)).ok).toBe(false);
    const backup = serializeReadingBackup(mark(1).state, catalog, at); expect((await f.store.importReadingBackup(backup, catalog)).ok).toBe(false);
    expect(f.values.get(READING_PROGRESS_KEY)).toBe(original); expect(f.store.exportReadingBackup(catalog).ok).toBe(false); expect(JSON.parse(f.store.exportReadingRecovery().text!).originals[0].raw).toBe(original);
  });
  it("restores only with explicit recovery and preserves the unreadable original before replacing it", async () => {
    const f = browserFixture(), original = "{not-valid-json"; f.values.set(READING_PROGRESS_KEY, original);
    const backup = serializeReadingBackup({ ...mark(1).state, automatic: true }, catalog, at);
    const result = await f.store.importReadingBackup(backup, catalog, { recoverCorrupt: true }); expect(result.ok).toBe(true);
    expect(JSON.parse(f.values.get(READING_RECOVERY_KEY)!).originals[0].raw).toBe(original); expect(f.store.getReadingProgressSnapshot()).toMatchObject({ status: "ready", hasRecovery: true });
    expect(isVerseRead(f.store.getReadingProgressSnapshot().state, scope, 1)).toBe(true); expect(f.store.getReadingProgressSnapshot().state.automatic).toBe(false);
    expect(JSON.parse(f.store.exportReadingRecovery().text!).originals[0].raw).toBe(original);
  });
  it("preserves every original through successive recoveries and exports the current corruption before restoring", async () => {
    const f = browserFixture(), backup = serializeReadingBackup(mark(1).state, catalog, at), originals = ["{broken-A", "{broken-B", "{broken-C"];
    // Compatibility with the old single-original storage format.
    f.values.set(READING_RECOVERY_KEY, originals[0]);
    for (let index = 1; index < originals.length; index++) {
      f.values.set(READING_PROGRESS_KEY, originals[index]);
      expect(JSON.parse(f.store.exportReadingRecovery().text!).originals.map((copy: { raw: string }) => copy.raw)).toEqual(originals.slice(0, index + 1));
      expect((await f.store.importReadingBackup(backup, catalog, { recoverCorrupt: true })).ok).toBe(true);
      expect(JSON.parse(f.values.get(READING_RECOVERY_KEY)!).originals.map((copy: { raw: string }) => copy.raw)).toEqual(originals.slice(0, index + 1));
    }
    f.values.set(READING_PROGRESS_KEY, originals[1]);
    expect((await f.store.importReadingBackup(backup, catalog, { recoverCorrupt: true })).ok).toBe(true);
    expect(JSON.parse(f.values.get(READING_RECOVERY_KEY)!).originals).toHaveLength(3);
  });
  it("aborts recovery on quota or bounded archive capacity without replacing any original", async () => {
    const backup = serializeReadingBackup(mark(1).state, catalog, at);
    for (const reason of ["quota", "capacity"]) {
      const f = browserFixture(), original = "{broken"; f.values.set(READING_PROGRESS_KEY, original);
      const earlier = reason === "capacity" ? "A".repeat(MAX_READING_RECOVERY_BYTES) : "older original"; f.values.set(READING_RECOVERY_KEY, earlier);
      if (reason === "quota") f.quota(true);
      expect((await f.store.importReadingBackup(backup, catalog, { recoverCorrupt: true })).ok).toBe(false); expect(f.values.get(READING_PROGRESS_KEY)).toBe(original);
      expect(f.values.get(READING_RECOVERY_KEY)).toBe(earlier);
      expect(JSON.parse(f.store.exportReadingRecovery().text!).originals.map((copy: { raw: string }) => copy.raw)).toEqual([earlier, original]);
    }
  });
  it("merges an imported file without clearing local verses and rejects invalid imports atomically", async () => {
    const f = browserFixture(); await f.store.markVerseRead(scope, 1, true); const original = f.values.get(READING_PROGRESS_KEY);
    expect((await f.store.importReadingBackup("{}", catalog)).ok).toBe(false); expect(f.values.get(READING_PROGRESS_KEY)).toBe(original);
    const backup = serializeReadingBackup(mark(2).state, catalog, at); expect((await f.store.importReadingBackup(backup, catalog)).ok).toBe(true);
    expect(readChapterVerses(f.store.getReadingProgressSnapshot().state, scope)).toEqual([1, 2]);
    const exported = f.store.exportReadingBackup(catalog); expect(exported.ok).toBe(true); expect(readChapterVerses(parseReadingBackup(exported.text!, catalog), scope)).toEqual([1, 2]);
  });
});

describe("cross-tab browser lock adapter", () => {
  it("uses the native shared lock and never runs a write when no coordination API is available", async () => {
    let calls = 0, name = "";
    const native = createReadingBrowserLock(() => ({ locks: { request: async (key: string, callback: () => unknown) => { name = key; return callback(); } } as unknown as LockManager }));
    expect(await native(() => { calls++; return "saved"; })).toBe("saved"); expect(name).toBe(READING_PROGRESS_KEY);
    const denied = createReadingBrowserLock(() => ({})); await expect(denied(() => { calls++; })).rejects.toThrow(/coordenar/); expect(calls).toBe(1);
    const blocked = createReadingBrowserLock(() => { throw new Error("SecurityError"); }); await expect(blocked(() => { calls++; })).rejects.toThrow(/coordenar/); expect(calls).toBe(1);
  });
  it("runs the storage operation inside the readwrite transaction and resolves only on completion", async () => {
    const events: string[] = [];
    const read = { onsuccess: null as (() => void) | null };
    const transaction = { oncomplete: null as (() => void) | null, onabort: null as (() => void) | null, onerror: null as (() => void) | null, objectStore: () => ({ get: () => { events.push("get-requested"); return read; }, put: () => { events.push("put"); } }), abort() { this.onabort?.(); } };
    const database = { objectStoreNames: { contains: () => true }, transaction(name: string, mode: string) { events.push(`transaction:${name}:${mode}`); return transaction; }, close() {} };
    const opening = { result: database, onupgradeneeded: null, onsuccess: null as (() => void) | null, onblocked: null, onerror: null };
    const factory = { open() { queueMicrotask(() => opening.onsuccess?.()); return opening; } } as unknown as IDBFactory;
    const lock = createReadingBrowserLock(() => ({ indexedDB: factory }));
    let complete = false;
    const pending = lock(() => { events.push("local-storage-operation"); return 42; }).then(value => { complete = true; return value; });
    // Open success and the async adapter continuation must settle before the request fires.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(events).toEqual(["transaction:mutex:readwrite", "get-requested"]); expect(complete).toBe(false);
    read.onsuccess?.(); expect(events).toContain("local-storage-operation"); expect(events.at(-1)).toBe("put"); expect(complete).toBe(false);
    transaction.oncomplete?.(); expect(await pending).toBe(42); expect(complete).toBe(true);
  });
  it("does not execute storage writes when IndexedDB refuses opening", async () => {
    const opening = { onerror: null as (() => void) | null };
    const factory = { open() { queueMicrotask(() => opening.onerror?.()); return opening; } } as unknown as IDBFactory;
    const lock = createReadingBrowserLock(() => ({ indexedDB: factory })); let executed = false;
    await expect(lock(() => { executed = true; })).rejects.toThrow(/coordenar/); expect(executed).toBe(false);
  });
});
