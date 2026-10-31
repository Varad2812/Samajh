import { describe, expect, it } from "vitest";
import { eloUpdate, expectedScore, INITIAL_THETA, outcomeOf, targetDifficulty } from "../elo";

describe("expectedScore", () => {
  it("P = 1 / (1 + 10^((d − θ)/400))", () => {
    expect(expectedScore(1100, 1100)).toBe(0.5);
    expect(expectedScore(1100, 1500)).toBeCloseTo(1 / 11, 10);
    expect(expectedScore(1500, 1100)).toBeCloseTo(10 / 11, 10);
  });
});

describe("outcomeOf", () => {
  it("1 sound, 0.6 flawed, 0 incorrect", () => {
    expect(outcomeOf("correct_sound")).toBe(1);
    expect(outcomeOf("correct_flawed")).toBe(0.6);
    expect(outcomeOf("incorrect")).toBe(0);
  });
});

describe("eloUpdate", () => {
  it("θ += 32·(o − P), d −= 16·(o − P)", () => {
    expect(eloUpdate(1100, 1100, "correct_sound")).toMatchObject({ theta: 1116, difficulty: 1092, expected: 0.5 });
    expect(eloUpdate(1100, 1100, "incorrect")).toMatchObject({ theta: 1084, difficulty: 1108 });
    const f = eloUpdate(1100, 1100, "correct_flawed");
    expect(f.theta).toBeCloseTo(1103.2, 10);
    expect(f.difficulty).toBeCloseTo(1098.4, 10);
  });
  it("beating a hard question gains more than beating an easy one", () => {
    const hard = eloUpdate(1100, 1400, "correct_sound").theta - 1100;
    const easy = eloUpdate(1100, 800, "correct_sound").theta - 1100;
    expect(hard).toBeGreaterThan(easy);
  });
  it("starts students at θ = 1100", () => {
    expect(INITIAL_THETA).toBe(1100);
  });
});

describe("targetDifficulty", () => {
  it("≈ θ − 147 for 70% target success, and gives P = 0.7 back", () => {
    const d = targetDifficulty(1100);
    expect(d).toBeCloseTo(1100 - 147.19, 1);
    expect(expectedScore(1100, d)).toBeCloseTo(0.7, 10);
  });
});
