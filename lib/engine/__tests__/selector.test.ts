import { describe, expect, it } from "vitest";
import { addDays, DAY_MS } from "@/lib/clock";
import { QUESTION_BY_ID } from "@/lib/data/questions";
import { targetDifficulty } from "../elo";
import { chooseConcept, relevantMisconception, selectNext, type SelectorInput } from "../selector";
import { sm2Review } from "../sm2";
import { masteryMap, T0 } from "./helpers";

const attempt = (questionId: string, k: number) => ({
  questionId,
  conceptId: QUESTION_BY_ID[questionId].conceptId,
  at: T0 - (100 - k) * 60_000,
});

const base = (over: Partial<SelectorInput> = {}): SelectorInput => ({
  mastery: masteryMap(),
  schedule: {},
  attempts: [],
  theta: 1100,
  now: T0,
  ...over,
});

describe("chooseConcept priority", () => {
  it("due reviews come first", () => {
    const schedule = { C4: { ef: 2.5, interval: 1, repetition: 1, due: T0 - DAY_MS, lastReviewed: null } };
    const input = base({ schedule, mastery: masteryMap({ C6: 0.2, C4: 0.3 }), attempts: [attempt("C6-1", 1)] });
    expect(chooseConcept(input)).toEqual({ conceptId: "C4", reason: "review", probedFor: null });
  });

  it("fast-forward makes a review win once it falls due", () => {
    const schedule = { L1: sm2Review(undefined, 4, T0) }; // due T0 + 1 day
    const input = base({ schedule, attempts: [attempt("L1-1", 1)] });
    expect(chooseConcept(input).reason).not.toBe("review");
    expect(chooseConcept({ ...input, now: addDays(T0, 3) })).toMatchObject({ conceptId: "L1", reason: "review" });
  });

  it("root-cause probes come next, from the most recently attempted weak concept", () => {
    const input = base({ mastery: masteryMap({ C6: 0.25, C4: 0.45 }), attempts: [attempt("L1-1", 1), attempt("C6-2", 2)] });
    expect(chooseConcept(input)).toEqual({ conceptId: "C4", reason: "root_cause", probedFor: "C6" });
  });

  it("then lowest mastery weighted by exam weight", () => {
    // L2 (w1): (1 − .2)·1 = .8 ; C6 (w3): (1 − .35)·3 = 1.95
    const input = base({ mastery: masteryMap({ L2: 0.2, C6: 0.35 }), attempts: [attempt("L2-1", 1), attempt("C6-1", 2)] });
    expect(chooseConcept(input)).toMatchObject({ conceptId: "C6", reason: "weakest" });
  });

  it("then unexplored concepts, preferring heavy ones whose prereqs are explored", () => {
    const input = base({ attempts: [attempt("L1-1", 1)] }); // L1 at 0.7 ≥ 0.6
    expect(chooseConcept(input)).toMatchObject({ conceptId: "L7", reason: "unexplored" });
  });

  it("a requested concept overrides everything", () => {
    const schedule = { C4: { ef: 2.5, interval: 1, repetition: 1, due: T0 - DAY_MS, lastReviewed: null } };
    expect(chooseConcept(base({ schedule, conceptId: "M4" }))).toMatchObject({ conceptId: "M4", reason: "requested" });
  });
});

describe("selectNext question choice", () => {
  it("targets d ≈ θ − 147", () => {
    // θ 1350 → target ≈ 1203: C4-2 (1200) is within ±150.
    const s = selectNext(base({ conceptId: "C4", theta: 1350 }));
    expect(s.targetElo).toBeCloseTo(targetDifficulty(1350), 10);
    expect(s.question?.id).toBe("C4-2");
    expect(s.needsGeneration).toBe(false);
  });

  it("avoids repeating a question within 5 attempts and asks for generation when nothing is within ±150", () => {
    const s = selectNext(base({ conceptId: "C4", theta: 1350, attempts: [attempt("C4-2", 1)] }));
    expect(s.question?.id).toBe("C4-3"); // nearest fallback (1400)
    expect(s.needsGeneration).toBe(true);
    expect(s.misconceptionId).toBe("MC04");
  });

  it("a question seen more than 5 attempts ago is allowed again", () => {
    const attempts = ["C4-2", "L1-1", "L1-2", "L2-1", "L2-2", "L3-1"].map(attempt);
    expect(selectNext(base({ conceptId: "C4", theta: 1350, attempts })).question?.id).toBe("C4-2");
  });

  it("prefers a question whose distractor targets the active misconception", () => {
    // L4-2 (no MC) is nearest, but L4-1 (distractor → MC09) is also within ±150.
    const questionElo = { "L4-1": 1120, "L4-2": 1180 };
    const theta = 1180 + 147.19;
    const plain = selectNext(base({ conceptId: "L4", theta, questionElo, activeMisconceptions: [] }));
    expect(plain.misconceptionId).toBe("MC09"); // catalogued fallback still targets
    const targeted = selectNext(base({ conceptId: "L4", theta, questionElo, activeMisconceptions: ["MC09"] }));
    expect(targeted.question?.id).toBe("L4-1");
    expect(targeted.questionElo).toBe(1120);
  });

  it("uses calibrated Elo overrides over the seeded rating", () => {
    const s = selectNext(base({ conceptId: "C4", theta: 1100, questionElo: { "C4-3": 960 } }));
    expect(s.question?.id).toBe("C4-3");
  });
});

describe("relevantMisconception", () => {
  it("prefers the student's active misconception, else the catalogued one, else null", () => {
    expect(relevantMisconception("C1", ["MC01"])).toBe("MC01");
    expect(relevantMisconception("C6")).toBe("MC02");
    expect(relevantMisconception("C3")).toBeNull();
  });
});
