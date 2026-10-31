import { describe, expect, it } from "vitest";
import { directRootCause, propagateIncorrect, rootCauseOf, rootCausePath } from "../rootCause";
import { masteryMap } from "./helpers";

describe("propagateIncorrect", () => {
  it("each prereq loses 0.05·(1 − conf) and is marked suspect; others untouched; input not mutated", () => {
    const m = masteryMap({ C4: 0.6, C6: 0.3 });
    const next = propagateIncorrect(m, "C7", 0.2); // C7 prereqs: C4, C6
    expect(next.C4.p).toBeCloseTo(0.6 - 0.05 * 0.8, 10);
    expect(next.C6.p).toBeCloseTo(0.3 - 0.04, 10);
    expect(next.C4.suspect && next.C6.suspect).toBe(true);
    expect(next.C7).toBe(m.C7);
    expect(next.L1).toBe(m.L1);
    expect(m.C4).toMatchObject({ p: 0.6, suspect: false });
  });
  it("never pushes a prereq below 0.05", () => {
    expect(propagateIncorrect(masteryMap({ C4: 0.07 }), "C6", 0).C4.p).toBe(0.05);
  });
  it("confident wrong answers barely move prereqs", () => {
    expect(propagateIncorrect(masteryMap({ C4: 0.6 }), "C6", 1).C4.p).toBe(0.6);
  });
  it("concepts without prereqs change nothing", () => {
    const m = masteryMap();
    expect(propagateIncorrect(m, "C1", 0)).toEqual(m);
  });
});

describe("directRootCause", () => {
  it("weak concept (< 0.4) with a weak prereq (< 0.5) → that prereq", () => {
    expect(directRootCause(masteryMap({ C6: 0.28, C4: 0.45 }), "C6")).toBe("C4");
  });
  it("a suspect prereq qualifies even when its mastery is fine", () => {
    expect(directRootCause(masteryMap({ C6: 0.28, C4: { p: 0.7, suspect: true } }), "C6")).toBe("C4");
  });
  it("no root cause when prereqs are healthy or the concept isn't weak", () => {
    expect(directRootCause(masteryMap({ C6: 0.28, C4: 0.6 }), "C6")).toBeNull();
    expect(directRootCause(masteryMap({ C6: 0.45, C4: 0.2 }), "C6")).toBeNull();
  });
  it("picks the weakest qualifying prereq", () => {
    expect(directRootCause(masteryMap({ C7: 0.2, C4: 0.45, C6: 0.3 }), "C7")).toBe("C6");
  });
});

describe("rootCausePath", () => {
  it("traces down the DAG while each step qualifies", () => {
    const m = masteryMap({ C6: 0.2, C4: 0.3, C2: 0.2, C3: 0.45, C1: 0.8 });
    expect(rootCausePath(m, "C6")).toEqual(["C4", "C2"]);
    expect(rootCauseOf(m, "C6")).toBe("C2");
  });
  it("goes all the way to a root concept", () => {
    const m = masteryMap({ C6: 0.2, C4: 0.3, C2: 0.2, C1: 0.25 });
    expect(rootCausePath(m, "C6")).toEqual(["C4", "C2", "C1"]);
  });
  it("after a wrong answer, propagation creates the probe", () => {
    const m = masteryMap({ C6: 0.28, C4: 0.6 });
    expect(rootCauseOf(m, "C6")).toBeNull();
    expect(rootCauseOf(propagateIncorrect(m, "C6", 0.38), "C6")).toBe("C4");
  });
});
