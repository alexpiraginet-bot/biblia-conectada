// Reading plans (docs/PLANOS.md): every portion is cut by code from the canon grid; progress derives from what the
// reader marked as read. No number here is typed: each expectation is recomputed from the generated books.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chaptersOf, emptyPlans, followPlan, leavePlan, parsePlans, planById, planFigures, planPortions, planProgress, PLANS, portionLabel, serializePlans, splitIntoPortions,
  PLANS_EVENT, PLANS_KEY, type PlanChapter,
} from "../src/lib/planos/model";
import { emptyReadingProgress, chapterReadingSummary, markReading, scopeFromCatalog, type ReadingCatalog } from "../src/lib/reading-progress/model";
import { books } from "./generated";
import nbvBooks from "../src/data/generated/translations/open-nbv-books.json";

const canon = books();
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe("the plans", () => {
  it("have distinct ids made for an address, a title and a sentence without numbers of their own", () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
    for (const p of PLANS) {
      expect(p.id, p.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(p.title.length).toBeGreaterThan(5);
      expect(p.summary).toMatch(/\.$/);
      expect(planById(p.id)).toBe(p);
    }
    expect(planById("nada")).toBeUndefined();
  });

  it.each(PLANS.map((p) => [p.id, p] as const))("%s reads each of its chapters once, in order, in the days it says", (_id, plan) => {
    const all = chaptersOf(plan.books(canon));
    const portions = planPortions(plan, canon);
    expect(portions).toHaveLength(plan.days);
    expect(portions.map((p) => p.day)).toEqual(Array.from({ length: plan.days }, (_, i) => i + 1));
    expect(portions.flatMap((p) => p.chapters)).toEqual(all);
    for (const p of portions) {
      expect(p.chapters.length, `day ${p.day}`).toBeGreaterThanOrEqual(1);
      expect(p.verses).toBe(sum(p.chapters.map((c) => c.verses)));
    }
    const figures = planFigures(portions);
    expect(figures.chapters).toBe(all.length);
    expect(figures.verses).toBe(sum(all.map((c) => c.verses)));
    expect(figures.days).toBe(plan.days);
    expect(figures.versesPerDay.min).toBeLessThanOrEqual(figures.versesPerDay.median);
    expect(figures.versesPerDay.median).toBeLessThanOrEqual(figures.versesPerDay.max);
    // balanced: no day is longer than the plan's longest chapter or twice the average, whichever is larger
    const average = figures.verses / plan.days;
    expect(figures.versesPerDay.max).toBeLessThanOrEqual(Math.max(Math.max(...all.map((c) => c.verses)), 2 * average));
    // the same input always gives the same plan
    expect(planPortions(plan, canon)).toEqual(portions);
  });

  it("cover the books they name, out of the generated canon", () => {
    const of = (id: string) => planPortions(planById(id)!, canon);
    const whole = planFigures(of("biblia-em-um-ano"));
    expect(whole.books).toBe(canon.length);
    expect(whole.chapters).toBe(sum(canon.map((b) => b.verses.length)));
    expect(whole.verses).toBe(sum(canon.flatMap((b) => b.verses)));
    const nt = canon.filter((b) => b.testament === "NT");
    expect(planFigures(of("novo-testamento-em-90-dias")).books).toBe(nt.length);
    expect(of("novo-testamento-em-90-dias")[0].chapters[0]).toMatchObject({ book: nt[0].slug, chapter: 1 });
    expect([...new Set(of("evangelhos-em-30-dias").flatMap((p) => p.chapters.map((c) => c.book)))]).toEqual(nt.slice(0, 4).map((b) => b.slug));
    const proverbs = canon.find((b) => b.slug === "proverbios")!;
    expect(of("proverbios-em-um-mes").every((p) => p.chapters.length === 1)).toBe(true);
    expect(planById("proverbios-em-um-mes")!.days).toBe(proverbs.verses.length);
    expect(planFigures(of("salmos-em-30-dias")).chapters).toBe(canon.find((b) => b.slug === "salmos")!.verses.length);
  });
});

describe("cutting chapters into portions", () => {
  const ch = (verses: number[]): PlanChapter[] => verses.map((v, i) => ({ book: "x", chapter: i + 1, verses: v }));

  it("follows the running share of verses and never splits or skips a chapter", () => {
    expect(splitIntoPortions(ch([10, 10, 10, 10]), 2).map((p) => p.chapters.map((c) => c.chapter))).toEqual([[1, 2], [3, 4]]);
    expect(splitIntoPortions(ch([30, 5, 5]), 2).map((p) => p.verses)).toEqual([30, 10]);
    expect(splitIntoPortions(ch([5, 5, 30]), 2).map((p) => p.verses)).toEqual([10, 30]);
    // one chapter per day when there are as many days as chapters, whatever their sizes
    expect(splitIntoPortions(ch([1, 100, 1]), 3).map((p) => p.verses)).toEqual([1, 100, 1]);
    // a giant chapter cannot starve the days after it
    expect(splitIntoPortions(ch([100, 1, 1, 1]), 4).map((p) => p.chapters.length)).toEqual([1, 1, 1, 1]);
    expect(splitIntoPortions(ch([7]), 1)).toEqual([{ day: 1, chapters: ch([7]), verses: 7 }]);
  });

  it("refuses more days than chapters, and days that are no count", () => {
    for (const days of [0, -1, 1.5, 4, NaN]) expect(() => splitIntoPortions(ch([1, 2, 3]), days), String(days)).toThrow();
  });

  it("names a portion by its books and chapters, with the canon's names", () => {
    const g = canon.find((b) => b.slug === "genesis")!;
    const e = canon.find((b) => b.slug === "exodo")!;
    const last = g.verses.length;
    const portion = { chapters: [{ book: "genesis", chapter: last - 1, verses: 1 }, { book: "genesis", chapter: last, verses: 1 }, { book: "exodo", chapter: 1, verses: 1 }] };
    expect(portionLabel(portion, canon)).toBe(`${g.name} ${last - 1}–${last} · ${e.name} 1`);
    expect(portionLabel({ chapters: [{ book: "genesis", chapter: 3, verses: 1 }] }, canon)).toBe(`${g.name} 3`);
    expect(portionLabel(planPortions(planById("biblia-em-um-ano")!, canon)[0], canon)).toMatch(new RegExp(`^${g.name} 1`));
  });
});

describe("progress in a plan", () => {
  const catalog: ReadingCatalog = { blivre: canon, "open-nbv": nbvBooks };
  const plan = planById("evangelhos-em-30-dias")!;
  const portions = planPortions(plan, canon);
  const readIn = (state: ReturnType<typeof emptyReadingProgress>, edition: "blivre" | "open-nbv") => (book: string, chapter: number) => {
    const scope = scopeFromCatalog(catalog, edition, book, chapter);
    return !!scope && chapterReadingSummary(state, scope).complete;
  };
  const markChapter = (state: ReturnType<typeof emptyReadingProgress>, book: string, chapter: number, edition: "blivre" | "open-nbv" = "blivre") =>
    markReading(state, scopeFromCatalog(catalog, edition, book, chapter)!, null, true, "2026-11-10T12:00:00.000Z", `r-${book}-${chapter}-${edition}`).state;

  it("starts at the first portion and follows the chapters marked as read, in any order", () => {
    let state = emptyReadingProgress();
    let progress = planProgress(portions, readIn(state, "blivre"));
    expect(progress).toMatchObject({ done: [], chaptersRead: 0, finished: false });
    expect(progress.next?.day).toBe(1);
    expect(progress.chapters).toBe(sum(portions.map((p) => p.chapters.length)));
    // a portion read out of turn counts, and "next" is still the first with something to read
    for (const c of portions[2].chapters) state = markChapter(state, c.book, c.chapter);
    progress = planProgress(portions, readIn(state, "blivre"));
    expect(progress.done).toEqual([3]);
    expect(progress.next?.day).toBe(1);
    // part of a portion is not the portion
    state = markChapter(state, portions[0].chapters[0].book, portions[0].chapters[0].chapter);
    progress = planProgress(portions, readIn(state, "blivre"));
    expect(progress.done).toEqual([3]);
    expect(progress.chaptersRead).toBe(portions[2].chapters.length + 1);
    for (const c of portions[0].chapters) state = markChapter(state, c.book, c.chapter);
    progress = planProgress(portions, readIn(state, "blivre"));
    expect(progress.done).toEqual([1, 3]);
    expect(progress.next?.day).toBe(2);
  });

  it("counts a verse short of a chapter as not read, and each edition by its own marks", () => {
    let state = emptyReadingProgress();
    const first = portions[0].chapters[0];
    const scope = scopeFromCatalog(catalog, "blivre", first.book, first.chapter)!;
    for (let v = 1; v < scope.verseCount; v++) state = markReading(state, scope, v, true, "2026-11-10T12:00:00.000Z", `revision-verse-${v}`).state;
    expect(planProgress(portions, readIn(state, "blivre")).chaptersRead).toBe(0);
    state = markReading(state, scope, scope.verseCount, true, "2026-11-10T12:00:00.000Z", "revision-last-verse").state;
    expect(planProgress(portions, readIn(state, "blivre")).chaptersRead).toBe(1);
    expect(planProgress(portions, readIn(state, "open-nbv")).chaptersRead).toBe(0);
  });

  it("is finished when every chapter is read", () => {
    let state = emptyReadingProgress();
    for (const c of portions.flatMap((p) => p.chapters)) state = markChapter(state, c.book, c.chapter);
    const progress = planProgress(portions, readIn(state, "blivre"));
    expect(progress).toMatchObject({ next: null, finished: true });
    expect(progress.done).toHaveLength(plan.days);
    expect(progress.chaptersRead).toBe(progress.chapters);
  });

  it("has every chapter of every plan in both editions' catalogs", () => {
    for (const p of PLANS) {
      for (const c of planPortions(p, canon).flatMap((x) => x.chapters)) {
        expect(scopeFromCatalog(catalog, "blivre", c.book, c.chapter), `${c.book} ${c.chapter}`).not.toBeNull();
        expect(scopeFromCatalog(catalog, "open-nbv", c.book, c.chapter), `${c.book} ${c.chapter} (open-nbv)`).not.toBeNull();
      }
    }
  });
});

describe("the plans followed on this device", () => {
  it("begin on a day, keep that day when the edition changes, and stop without a trace", () => {
    const one = followPlan(emptyPlans(), "biblia-em-um-ano", "2026-11-10");
    expect(one.planos).toEqual({ "biblia-em-um-ano": { inicio: "2026-11-10", edicao: "blivre" } });
    expect(followPlan(one, "biblia-em-um-ano", "2026-12-01")).toBe(one);
    const nbv = followPlan(one, "biblia-em-um-ano", "2026-12-01", "open-nbv");
    expect(nbv.planos["biblia-em-um-ano"]).toEqual({ inicio: "2026-11-10", edicao: "open-nbv" });
    expect(followPlan(one, "nada", "2026-11-10")).toBe(one);
    expect(followPlan(one, "salmos-em-30-dias", "10/11/2026")).toBe(one);
    expect(leavePlan(nbv, "biblia-em-um-ano")).toEqual(emptyPlans());
    expect(leavePlan(one, "salmos-em-30-dias")).toBe(one);
    expect(serializePlans(emptyPlans())).toBeNull();
    expect(parsePlans(serializePlans(nbv))).toEqual(nbv);
  });

  it("read stored plans tolerantly", () => {
    for (const raw of [null, "", "{", "[]", '{"v":2,"planos":{}}', '{"v":1,"planos":[]}']) expect(parsePlans(raw), String(raw)).toEqual(emptyPlans());
    const mixed = JSON.stringify({ v: 1, planos: { "biblia-em-um-ano": { inicio: "2026-11-10", edicao: "blivre" }, "plano-que-nao-existe": { inicio: "2026-11-10", edicao: "blivre" }, "salmos-em-30-dias": { inicio: "ontem", edicao: "blivre" }, "evangelhos-em-30-dias": { inicio: "2026-11-10", edicao: "acf" } } });
    expect(Object.keys(parsePlans(mixed).planos)).toEqual(["biblia-em-um-ano"]);
  });
});

// components/planos/store.ts: the browser binding. A plan is said to be followed only after the browser kept it.
describe("following a plan in the browser", () => {
  afterEach(() => vi.unstubAllGlobals());
  const browser = (options: { refuse?: boolean; forget?: boolean } = {}) => {
    const data = new Map<string, string>();
    const events: string[] = [];
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (options.refuse) throw new Error("QuotaExceededError");
          if (!options.forget) data.set(k, v);
        },
        removeItem: (k: string) => void data.delete(k),
      },
      dispatchEvent: (e: Event) => events.push(e.type),
    });
    return { data, events };
  };

  it("writes, reads back and tells the other components", async () => {
    const { data, events } = browser();
    const { follow, leave } = await import("../src/components/planos/store");
    expect(follow("salmos-em-30-dias", "2026-11-10", "open-nbv")).toBe(true);
    expect(parsePlans(data.get(PLANS_KEY)).planos).toEqual({ "salmos-em-30-dias": { inicio: "2026-11-10", edicao: "open-nbv" } });
    expect(events).toEqual([PLANS_EVENT]);
    // nothing to change: no write, no event
    expect(follow("salmos-em-30-dias", "2026-12-01", "open-nbv")).toBe(true);
    expect(events).toHaveLength(1);
    expect(leave("salmos-em-30-dias")).toBe(true);
    expect(data.has(PLANS_KEY)).toBe(false);
    expect(events).toHaveLength(2);
  });

  it("does not say a plan is followed when the browser refused or dropped the write", async () => {
    const { follow } = await import("../src/components/planos/store");
    let { data, events } = browser({ refuse: true });
    expect(follow("salmos-em-30-dias", "2026-11-10", "blivre")).toBe(false);
    expect(data.size).toBe(0);
    expect(events).toEqual([]);
    ({ data, events } = browser({ forget: true }));
    expect(follow("salmos-em-30-dias", "2026-11-10", "blivre")).toBe(false);
    expect(events).toEqual([]);
  });
});

describe("the plan pages", () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  it("are built for every plan, with the portions from the model and nothing typed", () => {
    const page = read("app/(site)/planos/[plano]/page.tsx");
    expect(page).toMatch(/generateStaticParams\(\) \{\s*return PLANS\.map\(\(p\) => \(\{ plano: p\.id \}\)\);/);
    expect(page).toContain("planPortions(plan, books)");
    expect(page).toContain("notFound()");
    const index = read("app/(site)/planos/page.tsx");
    expect(index).toContain("planFigures(portions)");
    // a figure in these pages comes out of formatInt, never out of the keyboard
    for (const source of [page, index, read("components/planos/PlanTracker.tsx")]) {
      const text = source.replace(/\/\/.*$/gm, "").replace(/\{[^{}]*\}/g, "");
      expect(text.match(/>[^<>{}]*\d{2,}[^<>{}]*</g) ?? []).toEqual([]);
    }
  });

  it("measure a chapter read against the edition being followed, and mark one chapter at a time", () => {
    const tracker = read("components/planos/PlanTracker.tsx");
    expect(tracker).toContain("scopeFromCatalog(catalog, edition, book, chapter)");
    expect(tracker).toContain("await markChapterRead(scope, true)");
    expect(tracker).toContain('timeZone: TIME_ZONE');
    expect(tracker).toContain('const TIME_ZONE = "America/Sao_Paulo"');
  });
});
