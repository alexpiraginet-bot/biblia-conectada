import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  emptyJourney,
  journeyLevel,
  journeyPoints,
  JOURNEY_KEY,
  mergeJourneys,
  parseJourney,
  saveJourney,
  type DiscoveryQuestion,
} from "../src/lib/journey";

const question: DiscoveryQuestion = {
  id: "light-v1",
  reference: "Gênesis 1:3",
  passage: "E disse Deus: Haja luz; e houve luz.",
  prompt: "O que Deus disse?",
  answers: ["Haja luz", "Haja noite", "Haja chuva"],
  correctIndex: 0,
  explanation: "O trecho registra o chamado à luz.",
  href: "/genesis/1/3",
};

describe("discovery journey scoring", () => {
  it("awards once, including after serialization, reload and replay", () => {
    const first = answerQuestion(emptyJourney(), question, 0);
    expect(first.gained).toBe(20);
    expect(journeyPoints(first.progress)).toBe(20);
    const reloaded = parseJourney(JSON.stringify(first.progress));
    const replay = answerQuestion(reloaded, question, 0);
    expect(replay.gained).toBe(0);
    expect(replay.changed).toBe(false);
    expect(journeyPoints(replay.progress)).toBe(20);
    expect(replay.progress.entries).toHaveLength(1);
  });

  it("persists a wrong first attempt so reloading cannot restore its points", () => {
    const wrong = answerQuestion(emptyJourney(), question, 1);
    expect(wrong.correct).toBe(false);
    expect(wrong.progress.entries[0].completed).toBe(false);
    const reloaded = parseJourney(JSON.stringify(wrong.progress));
    const learned = answerQuestion(reloaded, question, 0);
    expect(learned.correct).toBe(true);
    expect(learned.progress.entries[0]).toEqual({ id: "light-v1", attempts: 2, completed: true });
    expect(learned.gained).toBe(0);
    expect(journeyPoints(learned.progress)).toBe(0);
  });

  it("keeps independent questions and has concrete reachable levels", () => {
    const first = answerQuestion(emptyJourney(), question, 0).progress;
    const second = answerQuestion(first, { ...question, id: "second-v1" }, 0).progress;
    expect(journeyLevel(journeyPoints(emptyJourney()))).toBe("Semente");
    expect(journeyLevel(journeyPoints(first))).toBe("Explorador");
    expect(journeyLevel(journeyPoints(second))).toBe("Conector");
    expect(second.entries).toHaveLength(2);
  });

  it("ignores invalid answer events instead of awarding or recording attempts", () => {
    const progress = emptyJourney();
    for (const index of [-1, 3, 0.5, NaN]) {
      expect(answerQuestion(progress, question, index)).toEqual({ progress, correct: false, gained: 0, changed: false });
    }
    expect(answerQuestion(progress, { ...question, correctIndex: 99 }, 0).changed).toBe(false);
  });
});

describe("journey storage", () => {
  it("rejects malformed or incompatible storage and drops invalid entries", () => {
    for (const value of [null, "", "{", "null", "[]", '{"version":2,"entries":[]}']) {
      expect(parseJourney(value)).toEqual(emptyJourney());
    }
    const progress = parseJourney(JSON.stringify({
      version: 1,
      points: 99999,
      entries: [
        { id: "ok", attempts: 1, completed: true },
        { id: "bad", attempts: 0, completed: true },
        { id: "bad", attempts: 1.2, completed: true },
        { id: "bad", attempts: 1, completed: "yes" },
        null,
      ],
    }));
    expect(progress.entries).toEqual([{ id: "ok", attempts: 1, completed: true }]);
    expect(journeyPoints(progress)).toBe(20);
  });

  it("collapses duplicate question completions and preserves prior retries", () => {
    const progress = parseJourney(JSON.stringify({
      version: 1,
      entries: [
        { id: "same", attempts: 1, completed: true },
        { id: "same", attempts: 1, completed: true },
        { id: "retry", attempts: 2, completed: false },
        { id: "retry", attempts: 1, completed: true },
      ],
    }));
    expect(progress.entries).toHaveLength(2);
    expect(journeyPoints(progress)).toBe(20);
  });

  it("merges another tab's discovery without losing local attempts or duplicating points", () => {
    const firstTab = answerQuestion(emptyJourney(), question, 0).progress;
    const secondTab = answerQuestion(emptyJourney(), { ...question, id: "another" }, 1).progress;
    const merged = mergeJourneys(firstTab, secondTab);
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries.find((entry) => entry.id === "another")?.attempts).toBe(1);
    expect(journeyPoints(mergeJourneys(merged, firstTab))).toBe(20);
  });

  it("handles denied storage and quota errors without throwing", () => {
    const denied = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(saveJourney(denied, emptyJourney())).toBe(false);
    expect(saveJourney(null, emptyJourney())).toBe(false);
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const progress = answerQuestion(emptyJourney(), question, 0).progress;
    expect(saveJourney(storage, progress)).toBe(true);
    expect(parseJourney(values.get(JOURNEY_KEY))).toEqual(progress);
  });
});
