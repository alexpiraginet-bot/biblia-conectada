import { describe, expect, it } from "vitest";
import { canAdvanceJourney, journeyArea } from "../src/components/rewards/eligibility";
import { isJourneySnapshot } from "../src/components/rewards/storage";
import type { JourneySnapshot } from "../src/lib/rewards/types";

const snapshot = (): JourneySnapshot => ({
  version: 1, points: 20, activeDays: 1, streak: 1, longestStreak: 1, lastActiveDate: "2026-10-31", today: "2026-10-31", todayPoints: 20,
  tasks: { reading: { seconds: 120, targetSeconds: 120, complete: true, points: 20 }, liturgy: { seconds: 120, targetSeconds: 180, complete: false, points: 20 }, explore: { seconds: 15, targetSeconds: 90, complete: false, points: 20 } },
  exploredAreas: 1, requiredAreas: 2, nextBonusInActiveDays: 6, bonusPoints: 80, targetPoints: 4800, targetActiveDays: 60, milestoneReached: false, rewardStatus: "planned", syncedAt: "2026-10-31T14:00:00Z",
});

describe("journey client eligibility", () => {
  it("never counts a reading landing page without visible scripture", () => {
    expect(journeyArea("/ler", false, false)).toBeNull();
    expect(journeyArea("/joao/3/16", false, false)).toBeNull();
    expect(journeyArea("/joao/3/16", true, false)).toBe("reading");
    expect(journeyArea("/coracao", false, false)).toBeNull();
  });
  it("counts only successful current-date liturgy as liturgy; another day is ordinary reading", () => {
    expect(journeyArea("/liturgia", false, true)).toBeNull();
    expect(journeyArea("/liturgia", true, false)).toBe("reading");
    expect(journeyArea("/liturgia", true, true)).toBe("liturgy");
  });
  it.each([
    ["/arcos", "arcs"], ["/arcos/plano", "arcs"], ["/explorar/isaias/9", "explore"], ["/caminhos", "map"],
    ["/cronologia", "chronology"], ["/linha-do-tempo/evento", "timeline"], ["/interlinear", "interlinear"],
  ])("tracks the actual discovery area for %s", (path, area) => expect(journeyArea(path, false, false)).toBe(area));
  it("does not manufacture exploration for pages outside the approved areas", () => {
    for (const path of ["/jornada", "/ponte", "/coracao", "/tema", "/palavra", "/trilha", "/", "/arcos-falso"]) expect(journeyArea(path, false, false)).toBeNull();
  });
  it("stops completed work while keeping liturgy eligible after its reading part is done", () => {
    const state = snapshot();
    expect(canAdvanceJourney(state, "reading")).toBe(false);
    expect(canAdvanceJourney(state, "liturgy")).toBe(true);
    expect(canAdvanceJourney(state, "arcs")).toBe(true);
    state.tasks.liturgy.complete = true;
    state.tasks.explore.complete = true;
    for (const area of ["reading", "liturgy", "arcs", "map", "interlinear"] as const) expect(canAdvanceJourney(state, area)).toBe(false);
  });
});

describe("journey cached snapshot validation", () => {
  it("accepts an ordinary server snapshot for display only", () => expect(isJourneySnapshot(snapshot())).toBe(true));
  it.each([null, {}, { ...snapshot(), today: "anything" }, { ...snapshot(), today: "2026-02-31" }, { ...snapshot(), syncedAt: "broken" }, { ...snapshot(), lastActiveDate: "2026-19-40" }, { ...snapshot(), points: Number.POSITIVE_INFINITY }, { ...snapshot(), points: -1 }, { ...snapshot(), points: 20.5 }, { ...snapshot(), activeDays: Number.MAX_SAFE_INTEGER + 1 }])("rejects corrupted cache without crashing the page", (value) => expect(isJourneySnapshot(value)).toBe(false));
  it("rejects missing or overflowing task counters", () => {
    const state = snapshot();
    state.tasks.reading.seconds = 999;
    expect(isJourneySnapshot(state)).toBe(false);
    expect(isJourneySnapshot({ ...snapshot(), tasks: {} })).toBe(false);
  });
});
