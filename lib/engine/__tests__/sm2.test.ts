import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, DAY_MS, now } from "@/lib/clock";
import { dueConceptIds, INITIAL_EF, isDue, nextEf, qualityOf, sm2Review } from "../sm2";
import { T0 } from "./helpers";

describe("qualityOf", () => {
  it("maps verdict + confidence + misconception to q", () => {
    expect(qualityOf("correct_sound", 0.8, false)).toBe(5);
    expect(qualityOf("correct_sound", 0.75, false)).toBe(4); // strictly > 0.75 for 5
    expect(qualityOf("correct_flawed", 0.9, true)).toBe(3);
    expect(qualityOf("incorrect", 0.5, false)).toBe(2);
    expect(qualityOf("incorrect", 0.5, true)).toBe(1);
  });
});

describe("nextEf", () => {
  it("EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02))", () => {
    expect(nextEf(2.5, 5)).toBeCloseTo(2.6, 10);
    expect(nextEf(2.5, 4)).toBeCloseTo(2.5, 10);
    expect(nextEf(2.5, 3)).toBeCloseTo(2.36, 10);
    expect(nextEf(2.5, 2)).toBeCloseTo(2.18, 10);
    expect(nextEf(2.5, 1)).toBeCloseTo(1.96, 10);
  });
  it("never drops below 1.3", () => {
    expect(nextEf(1.35, 1)).toBe(1.3);
  });
});

describe("sm2Review", () => {
  it("intervals go 1, 6, then round(I·EF)", () => {
    const r1 = sm2Review(undefined, 5, T0);
    expect(r1).toMatchObject({ repetition: 1, interval: 1, lastReviewed: T0 });
    expect(r1.ef).toBeCloseTo(INITIAL_EF + 0.1, 10);
    const r2 = sm2Review(r1, 5, addDays(T0, 1));
    expect(r2).toMatchObject({ repetition: 2, interval: 6 });
    const r3 = sm2Review(r2, 4, addDays(T0, 7));
    expect(r3.repetition).toBe(3);
    expect(r3.interval).toBe(Math.round(6 * r3.ef)); // 6 × 2.7 = 16.2 → 16
    expect(r3.interval).toBe(16);
  });
  it("q < 3 resets repetition to 0 with a 1-day interval", () => {
    const strong = { ef: 2.5, interval: 16, repetition: 3, due: T0, lastReviewed: T0 - 16 * DAY_MS };
    const lapse = sm2Review(strong, 1, T0);
    expect(lapse).toMatchObject({ repetition: 0, interval: 1, due: T0 + DAY_MS });
    expect(lapse.ef).toBeCloseTo(1.96, 10);
  });
  it("due = now + interval days", () => {
    expect(sm2Review(undefined, 4, T0).due).toBe(T0 + DAY_MS);
  });
});

describe("dueConceptIds", () => {
  it("returns due concepts, most overdue first", () => {
    const schedule = {
      C4: { ef: 2.5, interval: 1, repetition: 1, due: T0 - 2 * DAY_MS, lastReviewed: null },
      C6: { ef: 2.5, interval: 1, repetition: 1, due: T0 - 5 * DAY_MS, lastReviewed: null },
      L1: { ef: 2.5, interval: 6, repetition: 2, due: T0 + DAY_MS, lastReviewed: null },
    };
    expect(dueConceptIds(schedule, T0)).toEqual(["C6", "C4"]);
  });
});

describe("fast-forward scheduling (virtual clock)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it("a review answered today comes due after ⏩ +3 days, a 6-day one does not", () => {
    const today = now(0);
    const schedule = {
      C6: sm2Review(undefined, 4, today), // 1-day interval
      L1: sm2Review(sm2Review(undefined, 5, addDays(today, -1)), 5, today), // 6-day interval
    };
    expect(dueConceptIds(schedule, now(0))).toEqual([]);
    expect(dueConceptIds(schedule, now(3))).toEqual(["C6"]);
    expect(isDue(schedule.L1, now(3))).toBe(false);
    expect(dueConceptIds(schedule, now(6))).toEqual(["C6", "L1"]);
  });

  it("clock.now applies the day offset to real time", () => {
    expect(now(3) - now(0)).toBe(3 * DAY_MS);
    vi.advanceTimersByTime(60_000);
    expect(now(0)).toBe(T0 + 60_000);
  });
});
