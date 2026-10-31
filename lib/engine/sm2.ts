/**
 * SM-2 spaced repetition per concept (PROJECT.md §5.4). Times are virtual-clock ms passed in by the caller.
 */
import { addDays } from "@/lib/clock";
import type { ReviewItem, Verdict } from "@/lib/types";

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export const INITIAL_EF = 2.5;
export const MIN_EF = 1.3;

/** Map an attempt to SM-2 quality. */
export function qualityOf(verdict: Verdict, confidence: number, hasMisconception: boolean): Quality {
  switch (verdict) {
    case "correct_sound":
      return confidence > 0.75 ? 5 : 4;
    case "correct_flawed":
      return 3;
    case "incorrect":
      return hasMisconception ? 1 : 2;
  }
}

export function nextEf(ef: number, q: Quality): number {
  return Math.max(MIN_EF, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
}

/** Review a concept at `now`. `prev` undefined = first time this concept is scheduled. */
export function sm2Review(prev: ReviewItem | undefined, q: Quality, now: number): ReviewItem {
  const ef = nextEf(prev?.ef ?? INITIAL_EF, q);
  let repetition: number;
  let interval: number;
  if (q < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition = (prev?.repetition ?? 0) + 1;
    interval = repetition === 1 ? 1 : repetition === 2 ? 6 : Math.round((prev?.interval ?? 6) * ef);
  }
  return { ef, interval, repetition, due: addDays(now, interval), lastReviewed: now };
}

export function isDue(item: ReviewItem, now: number): boolean {
  return item.due <= now;
}

/** Concept ids due at `now`, most overdue first. */
export function dueConceptIds(schedule: Record<string, ReviewItem>, now: number): string[] {
  return Object.entries(schedule)
    .filter(([, item]) => isDue(item, now))
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([id]) => id);
}
