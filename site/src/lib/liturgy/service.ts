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
export function getDailyLiturgy(date?: string) {
  return createLiturgyResult(date, { books, readVerse: verseText, metadata: calendarMetadata });
}
