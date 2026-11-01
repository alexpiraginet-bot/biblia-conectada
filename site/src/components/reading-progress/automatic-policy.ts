export const MIN_READING_MS = 8_000;
export const READING_WORDS_PER_MINUTE = 180;
export const READING_IDLE_MS = 90_000;
export const READING_VISIBLE_RATIO = 0.85;

export function requiredReadingMs(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(MIN_READING_MS, Math.ceil(words / READING_WORDS_PER_MINUTE * 60_000));
}

export type ReadingClock = { key: string; elapsed: number; previous: number };
/** One visible passage at a time; interruptions never accrue background time. */
export function advanceReadingClock(clock: ReadingClock | null, key: string | null, now: number): ReadingClock | null {
  if (key === null) return null;
  if (!clock || clock.key !== key || now < clock.previous || now - clock.previous > 1_500) return { key, elapsed: 0, previous: now };
  return { key, elapsed: clock.elapsed + Math.max(0, now - clock.previous), previous: now };
}

export function enoughReadingVisible(rect: { top: number; bottom: number; left: number; right: number; width: number; height: number }, viewport: { width: number; height: number; top: number; bottom: number }): boolean {
  if (rect.width <= 0 || rect.height <= 0 || rect.width > viewport.width) return false;
  const width = Math.max(0, Math.min(rect.right, viewport.width) - Math.max(rect.left, 0));
  const height = Math.max(0, Math.min(rect.bottom, viewport.height - viewport.bottom) - Math.max(rect.top, viewport.top));
  return width * height / (rect.width * rect.height) >= READING_VISIBLE_RATIO;
}
