import { describe, expect, it } from "vitest";
import { areEquivalent, chooseReading, evaluateExpression, freeSymbols, latexToMathjs } from "../mathEval";

// "log 6 plus one by three log three plus three squared" — two plausible groupings (PROJECT.md §5.5).
const READINGS = [
  { latex: "\\log 6+\\frac{1}{3\\log 3}+3^{2}", mathjs: "log(6) + 1/(3*log(3)) + 3^2" },
  { latex: "\\log 6+\\frac{1}{3}\\log 3+3^{2}", mathjs: "log(6) + (1/3)*log(3) + 3^2" },
];

describe("evaluateExpression", () => {
  it("log 6 + 1/(3 log 3) + 3^2 ≈ 10.477", () => {
    expect(evaluateExpression(READINGS[0].mathjs)).toBeCloseTo(10.477, 3);
  });
  it("log 6 + (1/3) log 3 + 3^2 ≈ 9.937", () => {
    expect(evaluateExpression(READINGS[1].mathjs)).toBeCloseTo(9.937, 3);
  });
  it("3^4 = 81", () => {
    expect(evaluateExpression("3^4")).toBe(81);
  });
  it("log is base 10, ln is natural", () => {
    expect(evaluateExpression("log(1000)")).toBeCloseTo(3, 12);
    expect(evaluateExpression("ln(e)")).toBeCloseTo(1, 12);
  });
  it("physics numericals with a scope", () => {
    expect(evaluateExpression("V/R", { V: 12, R: 3 })).toBe(4);
    expect(evaluateExpression("1/(1/v - 1/u)", { v: 30, u: -15 })).toBeCloseTo(10, 10); // lens formula → f
  });
  it("returns null for undefined symbols, non-real or invalid input", () => {
    expect(evaluateExpression("x + 1")).toBeNull();
    expect(evaluateExpression("log(-1)")).toBeNull();
    expect(evaluateExpression("sqrt(-4)")).toBeNull();
    expect(evaluateExpression("1/0")).toBeNull();
    expect(evaluateExpression("3 +* 4")).toBeNull();
  });
});

describe("chooseReading", () => {
  it("auto-picks the reading matching the spoken result within 2%", () => {
    expect(chooseReading(READINGS, 10.5)).toMatchObject({ pickedIndex: 0 });
    expect(chooseReading(READINGS, 9.9)).toMatchObject({ pickedIndex: 1 });
    const { values } = chooseReading(READINGS, 10.5);
    expect(values[0]).toBeCloseTo(10.477, 3);
    expect(values[1]).toBeCloseTo(9.937, 3);
  });
  it("asks 'A or B?' when nothing was spoken or nothing matches", () => {
    expect(chooseReading(READINGS).pickedIndex).toBeNull();
    expect(chooseReading(READINGS, 50).pickedIndex).toBeNull();
    expect(chooseReading(READINGS, 10.2).pickedIndex).toBeNull(); // 2.6% from 10.477, 2.6% from 9.937
  });
  it("a single unambiguous reading is picked without a spoken result", () => {
    expect(chooseReading([READINGS[0]]).pickedIndex).toBe(0);
  });
});

describe("areEquivalent", () => {
  it("'3 squared' ≡ '9' ≡ '3^2'", () => {
    expect(areEquivalent("3^2", "9")).toBe(true);
    expect(areEquivalent("3*3", "3^2")).toBe(true);
    expect(areEquivalent("3^2", "6")).toBe(false);
  });
  it("symbolic forms are compared at sample points", () => {
    expect(areEquivalent("V/R", "V*R^-1")).toBe(true);
    expect(areEquivalent("I*R", "R*I")).toBe(true);
    expect(areEquivalent("V*R", "V/R")).toBe(false);
    expect(areEquivalent("1/v - 1/u", "(u - v)/(u*v)")).toBe(true);
  });
  it("uses given values when provided", () => {
    expect(areEquivalent("I*R", "V", { I: 2, R: 3, V: 6 })).toBe(true);
    expect(areEquivalent("I*R", "V", { I: 2, R: 3, V: 5 })).toBe(false);
  });
  it("finds free variables but not functions or constants", () => {
    expect(freeSymbols("log(V) + sqrt(R) * pi").sort()).toEqual(["R", "V"]);
  });
});

describe("latexToMathjs (MathLive edits)", () => {
  it("converts both readings of the ambiguous example back to the right values", () => {
    expect(evaluateExpression(latexToMathjs(READINGS[0].latex))).toBeCloseTo(10.477, 3);
    expect(evaluateExpression(latexToMathjs(READINGS[1].latex))).toBeCloseTo(9.937, 3);
  });
  it("handles fractions, roots, powers, products and delimiters", () => {
    const cases: [string, number][] = [
      ["\\frac{12}{3}", 4],
      ["\\sqrt{16}", 4],
      ["\\sqrt[3]{27}", 3],
      ["3^{4}", 81],
      ["2\\times 3\\cdot 4", 24],
      ["\\left(1+2\\right)^{2}", 9],
      ["\\log_{10}(1000)", 3],
      ["\\log_{2}{8}", 3],
      ["\\ln e", 1],
      ["\\frac{\\frac{1}{2}}{4}", 0.125],
      ["2\\pi", 2 * Math.PI],
    ];
    for (const [latex, value] of cases) expect(evaluateExpression(latexToMathjs(latex)), latex).toBeCloseTo(value, 10);
  });
  it("subscripted symbols become identifiers", () => {
    expect(evaluateExpression(latexToMathjs("R_{1}+R_{2}"), { R1: 4, R2: 8 })).toBe(12);
    expect(areEquivalent(latexToMathjs("\\frac{1}{R_1}+\\frac{1}{R_2}"), "(R1 + R2)/(R1*R2)")).toBe(true);
  });
});
