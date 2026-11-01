import "server-only";
import { cacheLife } from "next/cache";
import { books, verseText } from "@/lib/data";
import { createLiturgyResult, fetchLiturgyMetadata } from "./core";
export type { LiturgyResult } from "./types";

async function calendarMetadata(date: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 900, expire: 3600 });
  // Only sanitized facts are cached; upstream scripture and prayers are never cached or returned.
  return fetchLiturgyMetadata(date);
}

/** Call from a request-time Server Component or Route Handler, never during static prerender. */
export async function getDailyLiturgy(date?: string, edition?: string | string[]) {
  const context = edition === "open-nbv" ? await import("../translation-reading") : null;
  return createLiturgyResult(date, {
    books, readVerse: verseText, metadata: calendarMetadata,
    ...(context ? { contextBooks: context.translationBooks("open-nbv")!, readContextChapter: (slug: string, chapter: number) => context.translatedChapter("open-nbv", slug, chapter) } : {}),
  }, edition);
}
