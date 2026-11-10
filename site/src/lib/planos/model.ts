// Reading plans: each plan is a list of books cut into daily portions by code, from the verse counts of the canon
// grid (the Bíblia Livre's, the one every count of this site uses). No portion is typed by hand. The reader's
// progress in a plan is not stored: it is what the personal reading progress says about the plan's chapters
// (lib/reading-progress), so reading a chapter anywhere advances every plan that has it. Rules: docs/PLANOS.md.
// Pure: no storage, no data imports.

export type PlanBook = { slug: string; name: string; verses: readonly number[]; testament?: string };
export type PlanChapter = { book: string; chapter: number; verses: number };
/** One day's reading: consecutive chapters, in the plan's order. `day` starts at 1. */
export type Portion = { day: number; chapters: PlanChapter[]; verses: number };
export type PlanDef = {
  id: string;
  title: string;
  /** one sentence, no numbers: the numbers come from the portions */
  summary: string;
  days: number;
  /** the plan's books, in reading order, out of the canon */
  books: (canon: readonly PlanBook[]) => PlanBook[];
};

const GOSPELS = ["mateus", "marcos", "lucas", "joao"];
const only = (slugs: readonly string[]) => (canon: readonly PlanBook[]) => slugs.map((slug) => {
  const book = canon.find((b) => b.slug === slug);
  if (!book) throw new Error(`[planos] the canon has no book "${slug}"`);
  return book;
});

export const PLANS: readonly PlanDef[] = [
  { id: "biblia-em-um-ano", title: "A Bíblia em um ano", summary: "De Gênesis a Apocalipse, na ordem dos livros.", days: 365, books: (canon) => [...canon] },
  { id: "novo-testamento-em-90-dias", title: "O Novo Testamento em 90 dias", summary: "De Mateus a Apocalipse, na ordem dos livros.", days: 90, books: (canon) => canon.filter((b) => b.testament === "NT") },
  { id: "evangelhos-em-30-dias", title: "Os Evangelhos em 30 dias", summary: "Mateus, Marcos, Lucas e João, um depois do outro.", days: 30, books: only(GOSPELS) },
  { id: "salmos-em-30-dias", title: "Os Salmos em 30 dias", summary: "Os 150 salmos, do primeiro ao último.", days: 30, books: only(["salmos"]) },
  { id: "proverbios-em-um-mes", title: "Provérbios em um mês", summary: "Um capítulo de Provérbios por dia.", days: 31, books: only(["proverbios"]) },
];

export const planById = (id: string): PlanDef | undefined => PLANS.find((p) => p.id === id);

/** Every chapter of some books, in order, with its verse count. */
export function chaptersOf(books: readonly PlanBook[]): PlanChapter[] {
  return books.flatMap((b) => b.verses.map((verses, i) => ({ book: b.slug, chapter: i + 1, verses })));
}

/**
 * Cuts chapters into `days` consecutive portions of about the same number of verses. Portion d ends at the chapter
 * where the running total of verses is closest to d/days of the whole, always with one chapter at least and never
 * leaving fewer chapters than days still to fill. Deterministic; chapters are never split.
 */
export function splitIntoPortions(chapters: readonly PlanChapter[], days: number): Portion[] {
  if (!Number.isInteger(days) || days < 1 || days > chapters.length) throw new Error(`[planos] ${chapters.length} chapters cannot make ${days} portions`);
  const total = chapters.reduce((sum, c) => sum + c.verses, 0);
  const portions: Portion[] = [];
  let next = 0;
  let read = 0;
  for (let day = 1; day <= days; day++) {
    const start = next;
    const target = (total * day) / days;
    const last = chapters.length - (days - day); // exclusive: what must stay for the days after this one
    do {
      read += chapters[next].verses;
      next++;
    } while (next < last && (day === days || Math.abs(read + chapters[next].verses - target) <= Math.abs(read - target)));
    const own = chapters.slice(start, next);
    portions.push({ day, chapters: own, verses: own.reduce((sum, c) => sum + c.verses, 0) });
  }
  return portions;
}

export function planPortions(plan: PlanDef, canon: readonly PlanBook[]): Portion[] {
  return splitIntoPortions(chaptersOf(plan.books(canon)), plan.days);
}

/** "Gênesis 49–50 · Êxodo 1": the chapters of a portion by book, with the canon's names. */
export function portionLabel(portion: Pick<Portion, "chapters">, canon: readonly PlanBook[]): string {
  const runs: { book: string; from: number; to: number }[] = [];
  for (const c of portion.chapters) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && lastRun.book === c.book && lastRun.to === c.chapter - 1) lastRun.to = c.chapter;
    else runs.push({ book: c.book, from: c.chapter, to: c.chapter });
  }
  return runs.map((r) => `${canon.find((b) => b.slug === r.book)?.name ?? r.book} ${r.from}${r.to > r.from ? `–${r.to}` : ""}`).join(" · ");
}

export type PlanFigures = { days: number; chapters: number; verses: number; books: number; versesPerDay: { min: number; median: number; max: number } };

/** The numbers a plan shows, all counted from its portions. */
export function planFigures(portions: readonly Portion[]): PlanFigures {
  const sizes = portions.map((p) => p.verses).sort((a, b) => a - b);
  const mid = sizes.length >> 1;
  const chapters = portions.flatMap((p) => p.chapters);
  return {
    days: portions.length,
    chapters: chapters.length,
    verses: sizes.reduce((sum, n) => sum + n, 0),
    books: new Set(chapters.map((c) => c.book)).size,
    versesPerDay: { min: sizes[0], median: sizes.length % 2 ? sizes[mid] : Math.round((sizes[mid - 1] + sizes[mid]) / 2), max: sizes[sizes.length - 1] },
  };
}

// ---- progress, derived from what the reader marked as read

/** Whether a chapter is wholly read, as the personal reading progress says for the edition being followed. */
export type ChapterRead = (book: string, chapter: number) => boolean;
export type PlanProgress = {
  /** days whose every chapter is read */
  done: number[];
  /** the first portion with something still to read; null when the plan is finished */
  next: Portion | null;
  chaptersRead: number;
  chapters: number;
  finished: boolean;
};

export function planProgress(portions: readonly Portion[], isRead: ChapterRead): PlanProgress {
  const done: number[] = [];
  let next: Portion | null = null;
  let chaptersRead = 0;
  let chapters = 0;
  for (const portion of portions) {
    const read = portion.chapters.filter((c) => isRead(c.book, c.chapter)).length;
    chapters += portion.chapters.length;
    chaptersRead += read;
    if (read === portion.chapters.length) done.push(portion.day);
    else next ??= portion;
  }
  return { done, next, chaptersRead, chapters, finished: next === null };
}

// ---- the plans being followed on this device

export const PLANS_KEY = "bc:planos:v1";
export const PLANS_EVENT = "bc:planos";
export const PLAN_EDITIONS = ["blivre", "open-nbv"] as const;
export type PlanEdition = (typeof PLAN_EDITIONS)[number];
/** `inicio`: the day the reader began, "YYYY-MM-DD" in Brasília; `edicao`: whose reading marks count */
export type Following = { inicio: string; edicao: PlanEdition };
export type PlansState = { v: 1; planos: Record<string, Following> };

export const emptyPlans = (): PlansState => ({ v: 1, planos: {} });
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isFollowing = (x: unknown): x is Following => {
  if (!x || typeof x !== "object") return false;
  const { inicio, edicao } = x as Record<string, unknown>;
  return typeof inicio === "string" && DAY.test(inicio) && !Number.isNaN(Date.parse(`${inicio}T00:00:00Z`)) && (PLAN_EDITIONS as readonly unknown[]).includes(edicao);
};

/** The stored plans; unknown plans and odd entries are left out, never thrown (nothing here is written by hand). */
export function parsePlans(raw: string | null | undefined): PlansState {
  if (!raw) return emptyPlans();
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || (data as { v?: unknown }).v !== 1) return emptyPlans();
    const planos = (data as { planos?: unknown }).planos;
    if (!planos || typeof planos !== "object" || Array.isArray(planos)) return emptyPlans();
    return { v: 1, planos: Object.fromEntries(Object.entries(planos).filter(([id, f]) => planById(id) !== undefined && isFollowing(f))) as Record<string, Following> };
  } catch {
    return emptyPlans();
  }
}

export function followPlan(state: PlansState, id: string, today: string, edicao: PlanEdition = "blivre"): PlansState {
  if (!planById(id) || !isFollowing({ inicio: today, edicao })) return state;
  const old = state.planos[id];
  if (old && old.edicao === edicao) return state;
  // changing the edition keeps the day the plan began
  return { v: 1, planos: { ...state.planos, [id]: { inicio: old?.inicio ?? today, edicao } } };
}

export function leavePlan(state: PlansState, id: string): PlansState {
  if (!(id in state.planos)) return state;
  const planos = { ...state.planos };
  delete planos[id];
  return { v: 1, planos };
}

/** The key is removed when no plan is followed. */
export const serializePlans = (state: PlansState): string | null => (Object.keys(state.planos).length ? JSON.stringify(state) : null);
