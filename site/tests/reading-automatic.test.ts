import { describe, expect, it } from "vitest";
import { advanceReadingClock, enoughReadingVisible, requiredReadingMs } from "../src/components/reading-progress/automatic-policy";

describe("optional reading estimates", () => {
  it("gives even a short verse time and scales with the actual visible text", () => {
    expect(requiredReadingMs("Jesus chorou.")).toBe(8_000);
    expect(requiredReadingMs(Array(90).fill("palavra").join(" "))).toBe(30_000);
  });
  it("starts at zero and accrues time for only one unchanged passage", () => {
    let clock = advanceReadingClock(null, "/joao/1/1", 1000);
    expect(clock?.elapsed).toBe(0);
    clock = advanceReadingClock(clock, "/joao/1/1", 1500);
    expect(clock?.elapsed).toBe(500);
    expect(advanceReadingClock(clock, "/joao/1/2", 2000)?.elapsed).toBe(0);
  });
  it("discards hidden, interrupted, throttled and backwards-clock intervals", () => {
    const clock = { key: "verse", elapsed: 7000, previous: 8000 };
    expect(advanceReadingClock(clock, null, 8500)).toBeNull();
    expect(advanceReadingClock(clock, "verse", 12_000)?.elapsed).toBe(0);
    expect(advanceReadingClock(clock, "verse", 7000)?.elapsed).toBe(0);
  });
  it("excludes toolbar-obscured, offscreen, horizontal-overflow and oversized text", () => {
    const view = { width: 375, height: 812, top: 72, bottom: 100 };
    const rect = { left: 20, right: 355, top: 100, bottom: 250, width: 335, height: 150 };
    expect(enoughReadingVisible(rect, view)).toBe(true);
    expect(enoughReadingVisible({ ...rect, top: 0, bottom: 150 }, view)).toBe(false);
    expect(enoughReadingVisible({ ...rect, top: 700, bottom: 850 }, view)).toBe(false);
    expect(enoughReadingVisible({ ...rect, top: 80, bottom: 1000, height: 920 }, view)).toBe(false);
    expect(enoughReadingVisible({ ...rect, right: 600, width: 580 }, view)).toBe(false);
  });
});
