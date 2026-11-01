import { emptyReadingProgress, markReading, MAX_READING_BYTES, mergeReadingProgress, parseReadingBackup, parseReadingProgress, readingBytes, ReadingProgressError, rememberPosition, serializeReadingBackup, undoReading, validateReadingProgress, type ChapterScope, type ReadingCatalog, type ReadingProgressState, type ReadingUndoToken } from "./model";

export const READING_PROGRESS_KEY = "bc:reading-progress:v1";
export const READING_PROGRESS_EVENT = "bc:reading-progress";
export const READING_RECOVERY_KEY = "bc:reading-progress:recovery:v1";
export const MAX_READING_RECOVERY_BYTES = 3_000_000;
const RECOVERY_FORMAT = "biblia-conectada/reading-recovery@1";
type RecoveryCopy = { preservedAt: string | null; raw: string };
function recoveryCopies(raw: string | null): RecoveryCopy[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const archive = value as Record<string, unknown>;
      if (Object.keys(archive).length === 2 && archive.format === RECOVERY_FORMAT && Array.isArray(archive.originals) && archive.originals.every(copy => copy && typeof copy === "object" && !Array.isArray(copy) && Object.keys(copy).length === 2 && typeof copy.raw === "string" && (copy.preservedAt === null || typeof copy.preservedAt === "string" && Number.isFinite(Date.parse(copy.preservedAt))))) return archive.originals as RecoveryCopy[];
    }
  } catch { /* The first release kept the exact original string, without an envelope. */ }
  // Preserve unknown/legacy envelopes verbatim rather than dropping any bytes.
  return [{ preservedAt: null, raw }];
}
function recoveryArchive(previous: string | null, original: string | null, at: string): string {
  const originals = recoveryCopies(previous);
  if (original !== null && !originals.some(copy => copy.raw === original)) originals.push({ preservedAt: at, raw: original });
  return JSON.stringify({ format: RECOVERY_FORMAT, originals });
}
export type ReadingSnapshot = { state: ReadingProgressState; status: "loading" | "ready" | "unavailable" | "corrupt"; hasRecovery: boolean; message?: string };
export type ReadingMutationResult = { ok: boolean; message: string; undo?: ReadingUndoToken };
export type ReadingExportResult = { ok: boolean; message: string; text?: string; filename?: string };
export type ReadingStorage = Pick<Storage, "getItem" | "setItem">;
type Environment = {
  storage: () => ReadingStorage | null;
  subscribe?: (callback: () => void) => () => void;
  publish?: () => void;
  lock?: <T>(operation: () => T) => Promise<T>;
  now?: () => Date;
  revision?: () => string;
};
export const SERVER_READING_SNAPSHOT: ReadingSnapshot = { state: emptyReadingProgress(), status: "loading", hasRecovery: false };
const unavailable = "O navegador não permitiu acessar as marcações. Nada foi substituído; confira se o armazenamento do site está liberado.";
const corrupt = "Os dados locais não puderam ser lidos. Eles foram preservados; você pode restaurar um backup válido sem descartar o original.";
function errorMessage(error: unknown): string { return error instanceof ReadingProgressError ? error.message : "Não foi possível salvar neste navegador. Nenhuma confirmação de salvamento foi emitida. Tente liberar espaço ou exportar seu progresso."; }

/** A testable browser-only adapter. No API, telemetry, login or rewards dependency. */
export function createReadingProgressStore(environment: Environment) {
  let snapshot = SERVER_READING_SNAPSHOT, cachedRaw: string | null | undefined;
  const now = () => (environment.now?.() ?? new Date()).toISOString();
  const revision = () => environment.revision?.() ?? globalThis.crypto?.randomUUID?.() ?? `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const listeners = new Set<() => void>();
  function refresh(): ReadingSnapshot {
    try {
      const storage = environment.storage(); if (!storage) throw new Error("Storage unavailable");
      const raw = storage.getItem(READING_PROGRESS_KEY), hasRecovery = storage.getItem(READING_RECOVERY_KEY) !== null;
      if (cachedRaw === raw && snapshot.hasRecovery === hasRecovery && (snapshot.status === "ready" || snapshot.status === "corrupt")) return snapshot;
      cachedRaw = raw;
      try { snapshot = { state: parseReadingProgress(raw), status: "ready", hasRecovery }; }
      catch { snapshot = { state: snapshot.status === "ready" ? snapshot.state : emptyReadingProgress(), status: "corrupt", hasRecovery, message: corrupt }; }
    } catch { if (snapshot.status !== "unavailable") snapshot = { state: snapshot.state, status: "unavailable", hasRecovery: snapshot.hasRecovery, message: unavailable }; }
    return snapshot;
  }
  function notify() { refresh(); for (const listener of listeners) listener(); environment.publish?.(); }
  function subscribe(callback: () => void): () => void {
    listeners.add(callback);
    const external = environment.subscribe?.(() => { refresh(); callback(); });
    return () => { listeners.delete(callback); external?.(); };
  }
  function exclusive<T>(operation: () => T): Promise<T> {
    if (environment.lock) return environment.lock(operation);
    return Promise.reject(new ReadingProgressError("Não foi possível coordenar o salvamento entre abas. As marcações foram preservadas; a leitura e a exportação continuam disponíveis."));
  }
  type Change = { state: ReadingProgressState; undo?: ReadingUndoToken; message?: string };
  async function mutate(operation: (state: ReadingProgressState) => Change): Promise<ReadingMutationResult> {
    try {
      return await exclusive(() => {
        const storage = environment.storage(); if (!storage) throw new Error("Storage unavailable");
        for (let attempt = 0; attempt < 3; attempt++) {
          const current = refresh();
          if (current.status !== "ready") return { ok: false, message: current.message ?? unavailable };
          const beforeRaw = storage.getItem(READING_PROGRESS_KEY), state = parseReadingProgress(beforeRaw), result = operation(state);
          if (result.state === state) return { ok: true, message: result.message ?? "A marcação já estava assim." };
          const raw = JSON.stringify(result.state); if (readingBytes(raw) > MAX_READING_BYTES) throw new ReadingProgressError("O progresso ultrapassou o limite local. Exporte uma cópia antes de continuar.");
          if (storage.getItem(READING_PROGRESS_KEY) !== beforeRaw) continue;
          storage.setItem(READING_PROGRESS_KEY, raw);
          if (storage.getItem(READING_PROGRESS_KEY) !== raw) { notify(); return { ok: false, message: "O progresso mudou em outra aba durante o salvamento. Confira as marcações atuais antes de tentar novamente." }; }
          notify(); return { ok: true, message: result.message ?? "Marcação salva neste navegador.", ...(result.undo ? { undo: result.undo } : {}) };
        }
        return { ok: false, message: "Outra aba está alterando o progresso. Confira as marcações e tente novamente." };
      });
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  const markVerseRead = (scope: ChapterScope, verse: number, read: boolean, options: { source?: "manual" | "automatic" } = {}) => mutate(state => {
    const result = markReading(state, scope, verse, read, now(), revision(), options.source);
    return { ...result, message: !read ? "Versículo desmarcado. Marcação automática pausada." : options.source === "automatic" && !state.automatic ? "A marcação automática está pausada." : "Versículo marcado neste navegador." };
  });
  const markChapterRead = (scope: ChapterScope, read: boolean) => mutate(state => ({ ...markReading(state, scope, null, read, now(), revision()), message: read ? "Capítulo marcado neste navegador." : "Capítulo desmarcado. Marcação automática pausada." }));
  const setAutomaticReading = (enabled: boolean) => mutate(state => ({ state: state.automatic === enabled ? state : { ...state, automatic: enabled, updatedAt: now() }, message: enabled ? "Marcação automática ativada neste navegador." : "Marcação automática pausada." }));
  const rememberReadingPosition = (scope: ChapterScope, verse: number) => mutate(state => ({ state: rememberPosition(state, scope, verse, now()) }));
  const undoReadingChange = (token: ReadingUndoToken) => mutate(state => ({ state: undoReading(state, token, now(), revision()), message: "Última marcação desfeita. Marcação automática pausada." }));
  function exportReadingBackup(catalog: ReadingCatalog): ReadingExportResult {
    const current = refresh(); if (current.status !== "ready") return { ok: false, message: current.message ?? unavailable };
    try { return { ok: true, message: "Backup preparado. Guarde o arquivo em um local seguro.", text: serializeReadingBackup(current.state, catalog, now()), filename: `biblia-conectada-leitura-${now().slice(0, 10)}.json` }; }
    catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  async function importReadingBackup(raw: string, catalog: ReadingCatalog, options: { recoverCorrupt?: boolean } = {}): Promise<ReadingMutationResult> {
    let incoming: ReadingProgressState;
    try { incoming = parseReadingBackup(raw, catalog); }
    catch (error) { return { ok: false, message: errorMessage(error) }; }
    if (!options.recoverCorrupt) return mutate(state => ({ state: mergeReadingProgress(validateReadingProgress(state, catalog), incoming, now(), revision), message: "Backup mesclado. Suas marcações anteriores foram mantidas; a preferência de marcação automática não mudou." }));
    try {
      return await exclusive(() => {
        const storage = environment.storage(); if (!storage) throw new Error("Storage unavailable");
        const original = storage.getItem(READING_PROGRESS_KEY);
        try { parseReadingProgress(original); return { ok: false, message: "Os dados locais estão legíveis. Use Importar e mesclar para manter o progresso existente." }; } catch { /* Explicit recovery only. */ }
        if (original === null) throw new ReadingProgressError("Não há dados locais ilegíveis para recuperar.");
        const previousRecovery = storage.getItem(READING_RECOVERY_KEY);
        const archive = recoveryArchive(previousRecovery, original, now());
        if (readingBytes(archive) > MAX_READING_RECOVERY_BYTES) throw new ReadingProgressError("As cópias de recuperação atingiram o limite local. Todos os originais continuam preservados; baixe o arquivo de recuperação para tratar os dados fora deste navegador. A restauração não foi executada.");
        const recovered = mergeReadingProgress(emptyReadingProgress(), incoming, now(), revision), next = JSON.stringify(recovered);
        if (readingBytes(next) > MAX_READING_BYTES) throw new ReadingProgressError("O backup ultrapassou o limite local.");
        if (storage.getItem(READING_RECOVERY_KEY) !== previousRecovery || storage.getItem(READING_PROGRESS_KEY) !== original) throw new ReadingProgressError("Os dados mudaram em outra aba. A restauração foi interrompida para preservar as cópias.");
        storage.setItem(READING_RECOVERY_KEY, archive);
        if (storage.getItem(READING_RECOVERY_KEY) !== archive || storage.getItem(READING_PROGRESS_KEY) !== original) throw new ReadingProgressError("Não foi possível preservar o original com segurança. A restauração foi interrompida.");
        storage.setItem(READING_PROGRESS_KEY, next);
        if (storage.getItem(READING_PROGRESS_KEY) !== next) throw new ReadingProgressError("Outra aba alterou o progresso. Confira os dados atuais; a cópia original foi preservada.");
        notify(); return { ok: true, message: "Backup restaurado com marcação automática pausada. Todos os originais das recuperações continuam preservados neste navegador." };
      });
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  function exportReadingRecovery(): ReadingExportResult {
    try {
      const storage = environment.storage(); if (!storage) throw new Error("Storage unavailable");
      const previous = storage.getItem(READING_RECOVERY_KEY), current = refresh().status === "corrupt" ? storage.getItem(READING_PROGRESS_KEY) : null;
      if (previous === null && current === null) return { ok: false, message: "Não há cópia de recuperação neste navegador." };
      return { ok: true, message: "Arquivo com todos os originais preservados, incluindo os dados locais ilegíveis atuais. Ele serve para recuperação e não substitui um backup validado.", text: recoveryArchive(previous, current, now()), filename: "biblia-conectada-leitura-recuperacao.json" };
    } catch (error) { return { ok: false, message: errorMessage(error) }; }
  }
  return { subscribeReadingProgress: subscribe, getReadingProgressSnapshot: refresh, getServerReadingProgressSnapshot: () => SERVER_READING_SNAPSHOT, markVerseRead, markChapterRead, setAutomaticReading, rememberReadingPosition, undoReadingChange, exportReadingBackup, importReadingBackup, exportReadingRecovery };
}
