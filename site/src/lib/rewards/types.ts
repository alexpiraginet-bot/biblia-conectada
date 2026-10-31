export type JourneyArea = "reading" | "liturgy" | "arcs" | "explore" | "map" | "chronology" | "timeline" | "interlinear" | "heart" | "bridge" | "trail" | "themes" | "words";
export type JourneyTask = "reading" | "liturgy" | "explore";
export type JourneyTaskProgress = { seconds: number; targetSeconds: number; complete: boolean; points: number };
export type JourneySnapshot = {
  version: 1;
  points: number;
  activeDays: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  today: string;
  todayPoints: number;
  tasks: Record<JourneyTask, JourneyTaskProgress>;
  exploredAreas: number;
  requiredAreas: number;
  nextBonusInActiveDays: number;
  bonusPoints: number;
  targetPoints: number;
  targetActiveDays: number;
  /** A progress milestone, never an entitlement to a shipped gift. */
  milestoneReached: boolean;
  rewardStatus: "planned";
  syncedAt: string;
};
export type JourneyPulse = { token: string; intervalMs: number };
export type JourneyResponse = {
  ok: boolean;
  available: boolean;
  started: boolean;
  snapshot?: JourneySnapshot;
  pulse?: JourneyPulse;
  code?: "unavailable" | "invalid" | "limit" | "expired";
  message?: string;
  retryAfterSeconds?: number;
};
export type JourneyAction =
  | { op: "start" }
  | { op: "pulse"; token: string; area: JourneyArea; active: boolean }
  | { op: "reset" };
