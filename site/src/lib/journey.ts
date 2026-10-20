/** A small reading challenge. Scores and attempts live only in this browser. */
export const JOURNEY_KEY = "bc:journey:v1";
export const JOURNEY_EVENT = "bc:journey";
export const FIRST_ATTEMPT_POINTS = 20;

export type DiscoveryQuestion = {
  id: string;
  reference: string;
  passage: string;
  prompt: string;
  answers: string[];
  correctIndex: number;
  explanation: string;
  href: string;
};

export type JourneyEntry = {
  id: string;
  attempts: number;
  completed: boolean;
};

export type JourneyProgress = {
  version: 1;
  entries: JourneyEntry[];
};

export function emptyJourney(): JourneyProgress {
  return { version: 1, entries: [] };
}

/** Invalid records cannot add points. Duplicate ids collapse into one conservative record. */
export function parseJourney(raw: string | null | undefined): JourneyProgress {
  if (!raw) return emptyJourney();
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyJourney();
    const candidate = data as Record<string, unknown>;
    if (candidate.version !== 1 || !Array.isArray(candidate.entries)) return emptyJourney();
    const unique = new Map<string, JourneyEntry>();
    for (const item of candidate.entries) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      if (
        typeof entry.id !== "string" ||
        !entry.id.trim() ||
        entry.id.length > 160 ||
        typeof entry.attempts !== "number" ||
        !Number.isSafeInteger(entry.attempts) ||
        entry.attempts < 1 ||
        typeof entry.completed !== "boolean"
      ) continue;
      const previous = unique.get(entry.id);
      unique.set(entry.id, {
        id: entry.id,
        attempts: Math.max(previous?.attempts ?? 0, entry.attempts),
        completed: Boolean(previous?.completed || entry.completed),
      });
    }
    return { version: 1, entries: [...unique.values()] };
  } catch {
    return emptyJourney();
  }
}

export function journeyPoints(progress: JourneyProgress): number {
  return progress.entries.reduce(
    (total, entry) => total + (entry.completed && entry.attempts === 1 ? FIRST_ATTEMPT_POINTS : 0),
    0,
  );
}

/** Preserve completions from another tab, including attempts that have not reached disk yet. */
export function mergeJourneys(left: JourneyProgress, right: JourneyProgress): JourneyProgress {
  return parseJourney(JSON.stringify({ version: 1, entries: [...left.entries, ...right.entries] }));
}

export function journeyLevel(points: number): "Semente" | "Explorador" | "Conector" {
  return points >= 40 ? "Conector" : points >= 20 ? "Explorador" : "Semente";
}

/** Called only by an answer event: reads, hydration and replay never award points. */
export function answerQuestion(
  progress: JourneyProgress,
  question: DiscoveryQuestion,
  answerIndex: number,
): { progress: JourneyProgress; correct: boolean; gained: number; changed: boolean } {
  const valid =
    Number.isInteger(answerIndex) &&
    answerIndex >= 0 &&
    answerIndex < question.answers.length &&
    Number.isInteger(question.correctIndex) &&
    question.correctIndex >= 0 &&
    question.correctIndex < question.answers.length &&
    Boolean(question.id.trim());
  if (!valid) return { progress, correct: false, gained: 0, changed: false };
  const correct = answerIndex === question.correctIndex;
  const previous = progress.entries.find((entry) => entry.id === question.id);
  if (previous?.completed) return { progress, correct, gained: 0, changed: false };
  const entry: JourneyEntry = {
    id: question.id,
    attempts: Math.min((previous?.attempts ?? 0) + 1, Number.MAX_SAFE_INTEGER),
    completed: correct,
  };
  return {
    progress: {
      version: 1,
      entries: [...progress.entries.filter((item) => item.id !== question.id), entry],
    },
    correct,
    gained: correct && entry.attempts === 1 ? FIRST_ATTEMPT_POINTS : 0,
    changed: true,
  };
}

type JourneyStorage = Pick<Storage, "getItem" | "setItem">;

/** Injectable so denied storage and quota errors can be tested without a browser. */
export function saveJourney(storage: JourneyStorage | null, progress: JourneyProgress): boolean {
  try {
    if (!storage) return false;
    storage.setItem(JOURNEY_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

let memoryRaw: string | null = null;
let memoryOnly = false;

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** A primitive snapshot keeps useSyncExternalStore stable and hydration predictable. */
export function readJourneyRaw(): string | null {
  if (typeof window === "undefined") return null;
  if (memoryOnly) return memoryRaw;
  try {
    return browserStorage()?.getItem(JOURNEY_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

export function writeJourney(progress: JourneyProgress): boolean {
  const storage = browserStorage();
  let merged = progress;
  try {
    merged = mergeJourneys(parseJourney(storage?.getItem(JOURNEY_KEY)), progress);
  } catch {
    // A failed read must not discard this visit's progress.
  }
  memoryRaw = JSON.stringify(merged);
  const saved = saveJourney(storage, merged);
  memoryOnly = !saved;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(JOURNEY_EVENT));
  return saved;
}

export function subscribeJourney(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === JOURNEY_KEY || event.key === null) {
      if (memoryOnly) {
        memoryRaw = JSON.stringify(mergeJourneys(parseJourney(event.newValue), parseJourney(memoryRaw)));
      } else {
        memoryRaw = null;
      }
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(JOURNEY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(JOURNEY_EVENT, callback);
  };
}

export const journeyServerSnapshot = (): null => null;
