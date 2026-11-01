import type { TranslationId } from "../translations";

export type ReadingBook = { slug: string; name: string; verses: readonly number[] };
export type ReadingCatalog = Readonly<Record<TranslationId, readonly ReadingBook[]>>;
export type ChapterScope = { edition: TranslationId; book: string; chapter: number; verseCount: number };
export type ReadingPosition = { book: string; chapter: number; verse: number; at: string };
export type ChapterProgress = { verses: number[]; revision: string };
export type EditionProgress = { chapters: Record<string, ChapterProgress>; lastRead: ReadingPosition | null };
export type ReadingProgressState = { version: 1; automatic: boolean; lastEdition: TranslationId; updatedAt: string | null; editions: Record<TranslationId, EditionProgress> };
export type ReadingSummary = { readVerses: number; totalVerses: number; percent: number; completedChapters: number; totalChapters: number; completedBooks: number; totalBooks: number; complete: boolean };
export type ReadingUndoToken = { scope: ChapterScope; before: ChapterProgress | null; afterRevision: string; previousPosition: ReadingPosition | null; afterPosition: ReadingPosition | null; previousEdition: TranslationId };
export const READING_BACKUP_FORMAT = "biblia-conectada/reading-progress@1";
export const MAX_READING_BYTES = 1_000_000;
export const MAX_READING_CHAPTERS = 2500;
export const EDITION_IDS = ["blivre", "open-nbv"] as const;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const editionId = (value: unknown): value is TranslationId => value === "blivre" || value === "open-nbv";
const positive = (value: unknown, maximum = 999): value is number => Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= maximum;
const isoDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const revisionId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value);
export const readingBytes = (text: string) => new TextEncoder().encode(text).byteLength;
export const emptyReadingProgress = (): ReadingProgressState => ({ version: 1, automatic: false, lastEdition: "blivre", updatedAt: null, editions: { blivre: { chapters: {}, lastRead: null }, "open-nbv": { chapters: {}, lastRead: null } } });
export class ReadingProgressError extends Error {}
const invalid = () => new ReadingProgressError("Os dados de leitura não são válidos. Nenhuma marcação foi alterada.");
export function chapterKey(book: string, chapter: number): string { return `${book}/${chapter}`; }
export function validChapterScope(scope: ChapterScope): boolean { return editionId(scope.edition) && typeof scope.book === "string" && scope.book.length <= 60 && slug.test(scope.book) && positive(scope.chapter) && positive(scope.verseCount); }
export function scopeFromCatalog(catalog: ReadingCatalog, edition: TranslationId, book: string, chapter: number): ChapterScope | null {
  const found = catalog[edition]?.find(candidate => candidate.slug === book), verseCount = found?.verses[chapter - 1];
  if (!found || !positive(chapter) || !positive(verseCount)) return null;
  return { edition, book, chapter, verseCount };
}
function position(value: unknown, edition: TranslationId, catalog?: ReadingCatalog): ReadingPosition | null {
  if (value === null) return null;
  if (!record(value) || !keys(value, ["book", "chapter", "verse", "at"]) || typeof value.book !== "string" || value.book.length > 60 || !slug.test(value.book) || !positive(value.chapter) || !positive(value.verse) || !isoDate(value.at)) throw invalid();
  if (catalog) { const scope = scopeFromCatalog(catalog, edition, value.book, value.chapter); if (!scope || value.verse > scope.verseCount) throw invalid(); }
  return { book: value.book, chapter: value.chapter, verse: value.verse, at: value.at };
}
/** Local storage is structurally checked; imports additionally require the real edition catalog. */
export function validateReadingProgress(value: unknown, catalog?: ReadingCatalog): ReadingProgressState {
  if (!record(value) || !keys(value, ["version", "automatic", "lastEdition", "updatedAt", "editions"]) || value.version !== 1 || typeof value.automatic !== "boolean" || !editionId(value.lastEdition) || !(value.updatedAt === null || isoDate(value.updatedAt)) || !record(value.editions) || !keys(value.editions, EDITION_IDS)) throw invalid();
  const result = emptyReadingProgress(); result.automatic = value.automatic; result.lastEdition = value.lastEdition; result.updatedAt = value.updatedAt as string | null;
  for (const edition of EDITION_IDS) {
    const data = value.editions[edition];
    if (!record(data) || !keys(data, ["chapters", "lastRead"]) || !record(data.chapters) || Object.keys(data.chapters).length > MAX_READING_CHAPTERS) throw invalid();
    result.editions[edition].lastRead = position(data.lastRead, edition, catalog);
    for (const [key, chapter] of Object.entries(data.chapters)) {
      const parts = key.split("/"), number = Number(parts[1]);
      if (parts.length !== 2 || parts[0].length > 60 || !slug.test(parts[0]) || !positive(number) || String(number) !== parts[1] || !record(chapter) || !keys(chapter, ["verses", "revision"]) || !Array.isArray(chapter.verses) || chapter.verses.length > 999 || !chapter.verses.every(verse => positive(verse)) || !revisionId(chapter.revision)) throw invalid();
      const scope = catalog ? scopeFromCatalog(catalog, edition, parts[0], number) : null;
      if (catalog && (!scope || chapter.verses.some(verse => verse > scope.verseCount))) throw invalid();
      result.editions[edition].chapters[key] = { verses: [...new Set(chapter.verses)].sort((a, b) => a - b), revision: chapter.revision };
    }
  }
  return result;
}
export function parseReadingProgress(raw: string | null, catalog?: ReadingCatalog): ReadingProgressState {
  if (raw === null) return emptyReadingProgress();
  if (readingBytes(raw) > MAX_READING_BYTES) throw invalid();
  try { return validateReadingProgress(JSON.parse(raw), catalog); } catch { throw invalid(); }
}
export function readChapterVerses(state: ReadingProgressState, scope: ChapterScope): number[] {
  if (!validChapterScope(scope)) return [];
  return [...new Set(state.editions[scope.edition].chapters[chapterKey(scope.book, scope.chapter)]?.verses ?? [])].filter(verse => positive(verse, scope.verseCount)).sort((a, b) => a - b);
}
export function isVerseRead(state: ReadingProgressState, scope: ChapterScope, verse: number): boolean { return positive(verse, scope.verseCount) && readChapterVerses(state, scope).includes(verse); }
function summary(readVerses: number, totalVerses: number, completedChapters: number, totalChapters: number, completedBooks = 0, totalBooks = 0): ReadingSummary {
  return { readVerses, totalVerses, percent: totalVerses ? readVerses / totalVerses * 100 : 0, completedChapters, totalChapters, completedBooks, totalBooks, complete: totalVerses > 0 && readVerses === totalVerses };
}
export function chapterReadingSummary(state: ReadingProgressState, scope: ChapterScope): ReadingSummary {
  const count = readChapterVerses(state, scope).length, total = validChapterScope(scope) ? scope.verseCount : 0;
  return summary(count, total, total > 0 && count === total ? 1 : 0, total > 0 ? 1 : 0);
}
export function bookReadingSummary(state: ReadingProgressState, edition: TranslationId, book: ReadingBook): ReadingSummary {
  let read = 0, total = 0, completed = 0;
  book.verses.forEach((verseCount, index) => { const part = chapterReadingSummary(state, { edition, book: book.slug, chapter: index + 1, verseCount }); read += part.readVerses; total += part.totalVerses; completed += part.completedChapters; });
  return summary(read, total, completed, book.verses.length, total > 0 && read === total ? 1 : 0, 1);
}
export function editionReadingSummary(state: ReadingProgressState, edition: TranslationId, books: readonly ReadingBook[]): ReadingSummary {
  let read = 0, total = 0, chapters = 0, completedChapters = 0, completedBooks = 0;
  for (const book of books) { const part = bookReadingSummary(state, edition, book); read += part.readVerses; total += part.totalVerses; chapters += part.totalChapters; completedChapters += part.completedChapters; completedBooks += part.completedBooks; }
  return summary(read, total, completedChapters, chapters, completedBooks, books.length);
}
function withEdition(state: ReadingProgressState, edition: TranslationId, data: EditionProgress, at: string): ReadingProgressState { return { ...state, lastEdition: edition, updatedAt: at, editions: { ...state.editions, [edition]: data } }; }
function readingPosition(scope: ChapterScope, verse: number, at: string): ReadingPosition { return { book: scope.book, chapter: scope.chapter, verse, at }; }
export function rememberPosition(state: ReadingProgressState, scope: ChapterScope, verse: number, at: string): ReadingProgressState {
  if (!validChapterScope(scope) || !positive(verse, scope.verseCount)) throw invalid();
  const previous = state.editions[scope.edition], last = previous.lastRead;
  if (state.lastEdition === scope.edition && last?.book === scope.book && last.chapter === scope.chapter && last.verse === verse) return state;
  return withEdition(state, scope.edition, { ...previous, lastRead: readingPosition(scope, verse, at) }, at);
}
export function markReading(state: ReadingProgressState, scope: ChapterScope, verse: number | null, read: boolean, at: string, revision: string, source: "manual" | "automatic" = "manual"): { state: ReadingProgressState; undo?: ReadingUndoToken } {
  if (!validChapterScope(scope) || (verse !== null && !positive(verse, scope.verseCount)) || !revisionId(revision)) throw invalid();
  if (source === "automatic" && (!state.automatic || !read)) return { state };
  const key = chapterKey(scope.book, scope.chapter), edition = state.editions[scope.edition], previous = edition.chapters[key] ?? null;
  const before = readChapterVerses(state, scope), numbers = new Set(before);
  if (verse === null) { numbers.clear(); if (read) for (let i = 1; i <= scope.verseCount; i++) numbers.add(i); } else if (read) numbers.add(verse); else numbers.delete(verse);
  const after = [...numbers].sort((a, b) => a - b), changed = JSON.stringify(before) !== JSON.stringify(after);
  let next = rememberPosition(state, scope, verse ?? (read ? scope.verseCount : 1), at);
  if (!read && next.automatic) next = { ...next, automatic: false, updatedAt: at };
  if (!changed) return { state: next };
  const afterPosition = next.editions[scope.edition].lastRead;
  next = withEdition(next, scope.edition, { ...next.editions[scope.edition], chapters: { ...edition.chapters, [key]: { verses: after, revision } } }, at);
  return { state: next, ...(source === "manual" ? { undo: { scope, before: previous, afterRevision: revision, previousPosition: edition.lastRead, afterPosition, previousEdition: state.lastEdition } } : {}) };
}
/** Never rewind a chapter changed by another tab or a later operation. */
export function undoReading(state: ReadingProgressState, token: ReadingUndoToken, at: string, revision: string): ReadingProgressState {
  const key = chapterKey(token.scope.book, token.scope.chapter), edition = state.editions[token.scope.edition];
  if (edition.chapters[key]?.revision !== token.afterRevision) throw new ReadingProgressError("Este capítulo mudou depois dessa marcação. Nada foi desfeito; confira o progresso atual.");
  const chapters = { ...edition.chapters };
  if (token.before) chapters[key] = { verses: [...token.before.verses], revision }; else delete chapters[key];
  const restorePosition = JSON.stringify(edition.lastRead) === JSON.stringify(token.afterPosition);
  return { ...state, automatic: false, updatedAt: at, ...(restorePosition && state.lastEdition === token.scope.edition ? { lastEdition: token.previousEdition } : {}), editions: { ...state.editions, [token.scope.edition]: { chapters, lastRead: restorePosition ? token.previousPosition : edition.lastRead } } };
}
export function parseReadingBackup(raw: string, catalog: ReadingCatalog): ReadingProgressState {
  if (readingBytes(raw) > MAX_READING_BYTES) throw invalid();
  try {
    const data: unknown = JSON.parse(raw);
    if (!record(data) || !keys(data, ["format", "exportedAt", "progress"]) || data.format !== READING_BACKUP_FORMAT || !isoDate(data.exportedAt)) throw invalid();
    return validateReadingProgress(data.progress, catalog);
  } catch { throw invalid(); }
}
export function serializeReadingBackup(state: ReadingProgressState, catalog: ReadingCatalog, now: string): string {
  // Compact JSON keeps both complete editions within the same bounded import limit.
  const verified = validateReadingProgress(state, catalog), result = JSON.stringify({ format: READING_BACKUP_FORMAT, exportedAt: now, progress: verified });
  if (readingBytes(result) > MAX_READING_BYTES) throw invalid();
  return result;
}
/** Union of valid verse numbers. Importing a file never enables automatic marking. */
export function mergeReadingProgress(current: ReadingProgressState, incoming: ReadingProgressState, at: string, newRevision: () => string): ReadingProgressState {
  const result: ReadingProgressState = { ...current, updatedAt: at, editions: { ...current.editions } };
  for (const edition of EDITION_IDS) {
    const chapters = { ...current.editions[edition].chapters };
    for (const [key, value] of Object.entries(incoming.editions[edition].chapters)) {
      const existing = chapters[key], verses = [...new Set([...(existing?.verses ?? []), ...value.verses])].sort((a, b) => a - b);
      if (JSON.stringify(verses) !== JSON.stringify(existing?.verses ?? [])) chapters[key] = { verses, revision: newRevision() };
    }
    const existingPosition = current.editions[edition].lastRead, incomingPosition = incoming.editions[edition].lastRead;
    result.editions[edition] = { chapters, lastRead: !existingPosition || incomingPosition && incomingPosition.at > existingPosition.at ? incomingPosition : existingPosition };
  }
  const mostRecent = EDITION_IDS.filter(edition => result.editions[edition].lastRead).sort((a, b) => result.editions[b].lastRead!.at.localeCompare(result.editions[a].lastRead!.at))[0];
  if (mostRecent) result.lastEdition = mostRecent;
  return result;
}
