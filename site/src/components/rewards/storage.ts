import type { JourneySnapshot } from "@/lib/rewards/types";

export const JOURNEY_PREFERENCE_EVENT = "bc:rewards-preference";
export const JOURNEY_OPT_IN_KEY = "bc:rewards:opt-in";
const PAUSE_KEY = "bc:rewards:paused";
const SNAPSHOT_KEY = "bc:rewards:snapshot:v1";
export type JourneySyncStatus = "idle" | "syncing" | "ready" | "offline" | "limited" | "unavailable" | "expired";
export type JourneyClientState = {
  optedIn: boolean;
  paused: boolean;
  snapshot: JourneySnapshot | null;
  status: JourneySyncStatus;
  message: string;
};
const INITIAL: JourneyClientState = { optedIn: false, paused: false, snapshot: null, status: "idle", message: "" };
let state = INITIAL;
let hydrated = false;
const listeners = new Set<() => void>();
const fallback = new Map<string, string>();

function read(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return fallback.get(key) ?? null; }
}
function write(key: string, value: string) {
  fallback.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* This visit still works if storage is unavailable. */ }
}
const validNumber = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const validDay = (day: unknown) => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T12:00:00Z`)) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
/** A cached display value is never sent back as points or used to qualify a reward. */
export function isJourneySnapshot(value: unknown): value is JourneySnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as JourneySnapshot;
  return s.version === 1 && s.rewardStatus === "planned" && validDay(s.today) && typeof s.syncedAt === "string" && Number.isFinite(Date.parse(s.syncedAt))
    && typeof s.milestoneReached === "boolean" && (s.lastActiveDate === null || validDay(s.lastActiveDate))
    && [s.points, s.activeDays, s.streak, s.longestStreak, s.todayPoints, s.exploredAreas, s.requiredAreas, s.nextBonusInActiveDays, s.bonusPoints, s.targetPoints, s.targetActiveDays].every(validNumber)
    && s.targetPoints > 0 && s.targetActiveDays > 0 && s.requiredAreas > 0
    && [s.tasks?.reading, s.tasks?.liturgy, s.tasks?.explore].every((task) => task && [task.seconds, task.targetSeconds, task.points].every(validNumber) && task.targetSeconds > 0 && task.seconds <= task.targetSeconds && typeof task.complete === "boolean");
}
function cachedSnapshot(): JourneySnapshot | null {
  try { const value: unknown = JSON.parse(read(SNAPSHOT_KEY) ?? "null"); return isJourneySnapshot(value) ? value : null; }
  catch { return null; }
}
function publish(update: Partial<JourneyClientState>) {
  state = { ...state, ...update };
  listeners.forEach((listener) => listener());
}
export function hydrateJourney() {
  if (typeof window === "undefined") return;
  if (hydrated) { syncJourneyPreferences(); return; }
  hydrated = true;
  publish({ optedIn: read(JOURNEY_OPT_IN_KEY) === "yes", paused: read(PAUSE_KEY) === "yes", snapshot: cachedSnapshot() });
}
export function subscribeJourney(listener: () => void) {
  if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", syncJourneyPreferences);
  listeners.add(listener);
  hydrateJourney();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", syncJourneyPreferences);
  };
}
export const getJourneyState = () => state;
export const getServerJourneyState = () => INITIAL;
export function setJourneyPreference(optedIn: boolean, paused = false) {
  write(JOURNEY_OPT_IN_KEY, optedIn ? "yes" : "no");
  write(PAUSE_KEY, paused ? "yes" : "no");
  hydrated = true;
  publish({ optedIn, paused });
  window.dispatchEvent(new Event(JOURNEY_PREFERENCE_EVENT));
}
export function syncJourneyPreferences() {
  const optedIn = read(JOURNEY_OPT_IN_KEY) === "yes";
  if (!optedIn && read(SNAPSHOT_KEY) === null) { publish(INITIAL); return; }
  publish({ optedIn, paused: read(PAUSE_KEY) === "yes" });
}
export function confirmJourney(snapshot: JourneySnapshot) {
  if (!isJourneySnapshot(snapshot)) return;
  write(SNAPSHOT_KEY, JSON.stringify(snapshot));
  publish({ snapshot, status: "ready", message: "" });
}
export function setJourneyStatus(status: JourneySyncStatus, message = "") { publish({ status, message }); }
export function clearJourney() {
  for (const key of [JOURNEY_OPT_IN_KEY, PAUSE_KEY, SNAPSHOT_KEY]) {
    fallback.delete(key);
    try { localStorage.removeItem(key); } catch { /* Clear the in-memory mirror as well. */ }
  }
  publish(INITIAL);
  window.dispatchEvent(new Event(JOURNEY_PREFERENCE_EVENT));
}
