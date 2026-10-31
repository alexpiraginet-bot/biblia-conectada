import { isRecord, JourneyFault, JOURNEY_UNAVAILABLE } from "./input";
import type { JourneyState } from "./ledger";
import { JOURNEY_BONUS_DAYS, JOURNEY_BONUS_POINTS, JOURNEY_DAILY_POINTS, JOURNEY_REQUIRED_AREAS, JOURNEY_TARGET_ACTIVE_DAYS, JOURNEY_TARGET_POINTS, JOURNEY_TASK_SECONDS, journeyDay } from "./rules";
import type { JourneySnapshot, JourneyTask } from "./types";

export function previousJourneyDay(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

/** Refuse corrupted storage rather than showing an invented balance. */
export function parseJourneyState(raw: unknown): JourneyState {
  try {
    const state: unknown = typeof raw === "string" ? JSON.parse(raw) : null;
    if (!isRecord(state) || state.version !== 1 || !isRecord(state.day) || !isRecord(state.pulse)
      || typeof state.lastActiveDate !== "string" || !isRecord(state.day.areas) || !isRecord(state.day.completed)
      || typeof state.day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(state.day.date)
      || typeof state.pulse.nonce !== "string" || !/^[a-f0-9]{32}$/.test(state.pulse.nonce)) throw new Error("state");
    for (const value of [state.points, state.activeDays, state.streak, state.longestStreak, state.createdAt, state.updatedAt, state.day.points, state.pulse.at]) {
      if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error("state");
    }
    for (const task of Object.keys(JOURNEY_TASK_SECONDS) as JourneyTask[]) {
      const value = state.day[`${task}Ms`];
      if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > JOURNEY_TASK_SECONDS[task] * 1000) throw new Error("state");
    }
    return state as JourneyState;
  } catch { throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE); }
}

export function journeySnapshot(state: JourneyState, now = new Date()): JourneySnapshot {
  const today = journeyDay(now);
  const sameDay = state.day.date === today;
  const tasks = Object.fromEntries((Object.keys(JOURNEY_TASK_SECONDS) as JourneyTask[]).map((task) => [task, {
    seconds: sameDay ? Math.floor(state.day[`${task}Ms`] / 1000) : 0,
    targetSeconds: JOURNEY_TASK_SECONDS[task], complete: sameDay && state.day.completed[task] === true,
    points: JOURNEY_DAILY_POINTS,
  }])) as JourneySnapshot["tasks"];
  return {
    version: 1, points: state.points, activeDays: state.activeDays,
    streak: state.lastActiveDate === today || state.lastActiveDate === previousJourneyDay(today) ? state.streak : 0,
    longestStreak: state.longestStreak, lastActiveDate: state.lastActiveDate || null,
    today, todayPoints: sameDay ? state.day.points : 0, tasks,
    exploredAreas: sameDay ? Object.values(state.day.areas).filter(Boolean).length : 0,
    requiredAreas: JOURNEY_REQUIRED_AREAS,
    nextBonusInActiveDays: JOURNEY_BONUS_DAYS - state.activeDays % JOURNEY_BONUS_DAYS,
    bonusPoints: JOURNEY_BONUS_POINTS, targetPoints: JOURNEY_TARGET_POINTS, targetActiveDays: JOURNEY_TARGET_ACTIVE_DAYS,
    milestoneReached: state.points >= JOURNEY_TARGET_POINTS && state.activeDays >= JOURNEY_TARGET_ACTIVE_DAYS,
    rewardStatus: "planned", syncedAt: now.toISOString(),
  };
}
