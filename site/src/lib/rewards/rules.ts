import type { JourneyArea, JourneyTask } from "./types";

export const JOURNEY_TARGET_POINTS = 4_800;
export const JOURNEY_TARGET_ACTIVE_DAYS = 60;
export const JOURNEY_DAILY_POINTS = 20;
export const JOURNEY_BONUS_POINTS = 80;
export const JOURNEY_BONUS_DAYS = 7;
export const JOURNEY_REQUIRED_AREAS = 2;
export const JOURNEY_INTERVAL_MS = 15_000;
export const JOURNEY_MAX_GAP_MS = 30_000;
export const JOURNEY_TTL_SECONDS = 365 * 86_400;
export const JOURNEY_TASK_SECONDS: Record<JourneyTask, number> = { reading: 120, liturgy: 180, explore: 90 };
export const JOURNEY_AREAS: readonly JourneyArea[] = ["reading", "liturgy", "arcs", "explore", "map", "chronology", "timeline", "interlinear", "heart", "bridge", "trail", "themes", "words"];
export const JOURNEY_READING_AREAS: readonly JourneyArea[] = ["reading", "liturgy"];
export const JOURNEY_EXPLORATION_AREAS: readonly JourneyArea[] = ["arcs", "explore", "map", "chronology", "timeline", "interlinear"];
export const JOURNEY_TIME_ZONE = "America/Sao_Paulo";

export function journeyDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JOURNEY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
