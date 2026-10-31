import { describe, expect, it } from "vitest";
import { applyAttempt, bktPosterior, bktUpdate, BKT_DEFAULTS, evidenceWeight, inferUntested } from "../bkt";

describe("bktPosterior", () => {
  it("correct: L(1−S) / (L(1−S) + (1−L)G)", () => {
    // 0.3·0.9 / (0.27 + 0.7·0.25) = 0.27 / 0.445
    expect(bktPosterior(0.3, true)).toBeCloseTo(0.27 / 0.445, 10);
  });
  it("incorrect: L·S / (L·S + (1−L)(1−G))", () => {
    // 0.03 / (0.03 + 0.7·0.75) = 0.03 / 0.555
    expect(bktPosterior(0.3, false)).toBeCloseTo(0.03 / 0.555, 10);
  });
});

describe("evidenceWeight", () => {
  it("correct_sound → 0.5 + 0.5·conf", () => {
    expect(evidenceWeight("correct_sound", 1)).toBe(1);
    expect(evidenceWeight("correct_sound", 0.4)).toBeCloseTo(0.7);
  });
  it("correct_flawed → 0.3, incorrect → 1.0, arithmetic slip → 0.5", () => {
    expect(evidenceWeight("correct_flawed", 0.9)).toBe(0.3);
    expect(evidenceWeight("incorrect", 0.9)).toBe(1);
    expect(evidenceWeight("incorrect", 0.9, { arithmeticSlip: true })).toBe(0.5);
  });
});

describe("bktUpdate", () => {
  const postC = 0.27 / 0.445;
  const postI = 0.03 / 0.555;

  it("correct_sound at full confidence: L' = post, L'' = L' + (1−L')·pT", () => {
    expect(bktUpdate(0.3, "correct_sound", 1)).toBeCloseTo(postC + (1 - postC) * 0.15, 10); // ≈ 0.6657
  });
  it("correct_sound at conf 0.4 moves only 70% of the way to the posterior", () => {
    const L1 = 0.3 + 0.7 * (postC - 0.3);
    expect(bktUpdate(0.3, "correct_sound", 0.4)).toBeCloseTo(L1 + (1 - L1) * 0.15, 10);
  });
  it("correct_flawed: weak correct (w = 0.3) and half learning transition", () => {
    const L1 = 0.3 + 0.3 * (postC - 0.3);
    expect(bktUpdate(0.3, "correct_flawed", 0.9)).toBeCloseTo(L1 + (1 - L1) * 0.075, 10); // ≈ 0.4376
  });
  it("incorrect: full weight toward the low posterior, half transition", () => {
    expect(bktUpdate(0.3, "incorrect", 0.5)).toBeCloseTo(postI + (1 - postI) * 0.075, 10); // = 0.125
  });
  it("incorrect with an arithmetic slip is halved (w = 0.5)", () => {
    const L1 = 0.3 + 0.5 * (postI - 0.3);
    expect(bktUpdate(0.3, "incorrect", 0.5, { arithmeticSlip: true })).toBeCloseTo(L1 + (1 - L1) * 0.075, 10);
  });
  it("ordering: sound > flawed > slip > incorrect, and confident sound beats hesitant sound", () => {
    const sound = bktUpdate(0.4, "correct_sound", 0.9);
    const hesitant = bktUpdate(0.4, "correct_sound", 0.3);
    const flawed = bktUpdate(0.4, "correct_flawed", 0.9);
    const slip = bktUpdate(0.4, "incorrect", 0.9, { arithmeticSlip: true });
    const wrong = bktUpdate(0.4, "incorrect", 0.9);
    expect(sound).toBeGreaterThan(hesitant);
    expect(hesitant).toBeGreaterThan(flawed);
    expect(flawed).toBeGreaterThan(0.4);
    expect(slip).toBeGreaterThan(wrong);
    expect(wrong).toBeLessThan(0.4);
  });
  it("stays within [0, 1] at the extremes", () => {
    for (const L of [0, 0.001, 0.5, 0.999, 1]) {
      for (const v of ["correct_sound", "correct_flawed", "incorrect"] as const) {
        const r = bktUpdate(L, v, 0.5);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
      }
    }
  });
  it("uses the documented defaults", () => {
    expect(BKT_DEFAULTS).toEqual({ pInit: 0.3, pT: 0.15, pS: 0.1, pG: 0.25 });
  });
});

describe("applyAttempt", () => {
  it("appends history, clears estimated, and clears suspect only on a sound answer", () => {
    const start = { p: 0.3, estimated: true, suspect: true, history: [] };
    const flawed = applyAttempt(start, "correct_flawed", 0.8, 1000);
    expect(flawed.estimated).toBe(false);
    expect(flawed.suspect).toBe(true);
    expect(flawed.history).toEqual([{ at: 1000, p: flawed.p }]);
    const sound = applyAttempt(flawed, "correct_sound", 0.8, 2000);
    expect(sound.suspect).toBe(false);
    expect(sound.history).toHaveLength(2);
  });
});

describe("inferUntested (diagnostic estimates)", () => {
  it("untested concepts get mean(tested prereqs + dependents) × 0.8, flagged estimated", () => {
    // C6's prereq C4 and dependent C7 are tested.
    const m = inferUntested({ C4: 0.5, C7: 0.3 }, 0);
    expect(m.C6.p).toBeCloseTo(((0.5 + 0.3) / 2) * 0.8, 10);
    expect(m.C6.estimated).toBe(true);
    expect(m.C4).toMatchObject({ p: 0.5, estimated: false });
  });
  it("no tested neighbour → pInit", () => {
    const m = inferUntested({ C4: 0.5 }, 0);
    expect(m.L1).toMatchObject({ p: 0.3, estimated: true });
  });
});
