import { describe, expect, it } from "vitest";
import { evaluateReading } from "@/lib/engine/mathEval";
import { finalizeAnalysis } from "../postprocess";
import { normalizeTerms, parseSpokenMath } from "../spokenMath";
import { offlineAnalysis } from "../offlineAnalyzer";
import type { AnalyzeRequest } from "../schemas";

describe("parseSpokenMath", () => {
  it('"V equals I R" → V = IR with Ohm\'s law meaning', () => {
    const [eq] = parseSpokenMath("I used V equals I R so twelve by three, four amps");
    expect(eq.spoken).toBe("V equals I R");
    expect(eq.mathjs).toBe("V = I * R");
    expect(eq.latex).toBe("V = I R");
    expect(eq.meaning).toMatch(/Ohm/);
  });

  it('"twelve by three, four amps" → 12/3 with the spoken result 4', () => {
    const eqs = parseSpokenMath("I used V equals I R, so twelve by three, four amps");
    const calc = eqs.find((e) => e.mathjs === "12 / 3");
    expect(calc).toBeDefined();
    expect(calc?.spokenResult).toBe(4);
    expect(evaluateReading(calc?.mathjs ?? "")).toBe(4);
  });

  it('"one by f equals one by v minus one by u" → the lens formula', () => {
    const [eq] = parseSpokenMath("I'll use one by f equals one by v minus one by u here");
    expect(eq.mathjs).toBe("1 / f = 1 / v - 1 / u");
    expect(eq.meaning).toMatch(/Lens formula/);
    expect(eq.alternatives).toEqual([]);
  });

  it("returns BOTH groupings for the ambiguous log example (§5.5), evaluated in code", () => {
    const [eq] = parseSpokenMath("log 6 plus one by three log three plus three squared, so about 10.5");
    const readings = [eq.mathjs, ...eq.alternatives.map((a) => a.mathjs)];
    expect(readings).toHaveLength(2);
    const values = readings.map((r) => evaluateReading(r));
    expect(values[0]).toBeCloseTo(10.477, 3); // 1/(3 log 3)
    expect(values[1]).toBeCloseTo(9.937, 3); // (1/3) log 3
    expect(eq.spokenResult).toBe(10.5);
    expect(eq.latex).toContain("\\frac");
    expect(eq.latex).toContain("\\log_{10}"); // log is base 10, never rendered as ln
  });

  it("ignores ordinary prose that merely contains operator-ish words", () => {
    expect(parseSpokenMath("the light goes into the glass and bends by a small angle")).toEqual([]);
    expect(parseSpokenMath("I think the first bulb is dimmer because of the square shape")).toEqual([]);
  });
});

describe("normalizeTerms", () => {
  it("fixes mis-heard physics words, 'N home' → ohms and lists spoken equations", () => {
    const raw = "the resisters are 5 home each, V equals I R";
    const terms = normalizeTerms(raw, parseSpokenMath(raw));
    expect(terms).toContainEqual({ heard: "resisters", meant: "resistors" });
    expect(terms).toContainEqual({ heard: "home", meant: "ohms (Ω)" });
    expect(terms.some((t) => t.heard === "V equals I R" && t.meant === "V = IR")).toBe(true);
  });
  it("does not flag 'home' without a number", () => {
    expect(normalizeTerms("I went home", [])).toEqual([]);
  });
});

const SERIES_Q: Omit<AnalyzeRequest, "rawTranscript" | "selectedIndex"> = {
  question: "Two identical bulbs are connected in series to a battery. Compared with the first bulb, the second bulb is:",
  options: ["Dimmer, because current is used up", "Equally bright, because the current is the same", "Brighter", "Off"],
  correctIndex: 1,
  conceptId: "C1",
  candidateMisconceptions: [
    {
      id: "MC01", conceptId: "C1", label: "Current used up",
      wrongBelief: "Current is used up by bulbs, so less flows after each one.",
      correctIdea: "Current is the same everywhere in a series loop; energy is transferred, not charge.",
      cues: ["used up", "uses up", "less current"],
    },
  ],
};

describe("offline analyzer (demo script step 2)", () => {
  const raw = "umm so the first bulb uses up some of the current so the second one is dimmer… wait no I mean, actually I think it's the same? not sure.";
  const req: AnalyzeRequest = { ...SERIES_Q, selectedIndex: 0, rawTranscript: raw };
  const result = finalizeAnalysis(offlineAnalysis(req), req, { fromModel: false });

  it("detects MC01 with a verbatim evidence quote from the RAW transcript", () => {
    expect(result.verdict).toBe("incorrect");
    expect(result.misconception?.id).toBe("MC01");
    expect(raw).toContain(result.misconception?.evidenceQuote ?? "§");
  });
  it("marks hedges/fillers and keeps the last self-correction", () => {
    expect(result.selfCorrections.length).toBeGreaterThanOrEqual(1);
    expect(result.hedges).toEqual(expect.arrayContaining(["I think", "not sure"]));
    expect(result.fillers).toContain("umm");
    expect(result.cleanedReasoning).toMatch(/it's the same/);
    expect(result.cleanedReasoning).not.toMatch(/umm|dimmer/i);
  });
  it("scores confidence ≈ 0.38 from the deterministic baseline", () => {
    expect(result.confidence).toBeCloseTo(0.38, 1);
  });

  it("correct answer + misconception only in the retracted part → correct_sound, no misconception", () => {
    const ok: AnalyzeRequest = { ...req, selectedIndex: 1 };
    const r = finalizeAnalysis(offlineAnalysis(ok), ok, { fromModel: false });
    expect(r.verdict).toBe("correct_sound");
    expect(r.misconception).toBeNull();
  });

  it("correct answer with the flawed belief still held → correct_flawed", () => {
    const flawed: AnalyzeRequest = { ...req, selectedIndex: 1, rawTranscript: "it is the same in both because some current is used up in the first bulb but the rest still flows" };
    const r = finalizeAnalysis(offlineAnalysis(flawed), flawed, { fromModel: false });
    expect(r.verdict).toBe("correct_flawed");
    expect(r.misconception?.id).toBe("MC01");
  });

  it("right relation + wrong arithmetic → incorrect with a calculation-slip note", () => {
    const q: AnalyzeRequest = {
      question: "A 12 V battery drives current through a 3 Ω resistor. What is the current?",
      options: ["36 A", "4 A", "0.25 A", "15 A"],
      selectedIndex: 2,
      correctIndex: 1,
      conceptId: "C4",
      candidateMisconceptions: [],
      rawTranscript: "I used V equals I R so I equals twelve by three, five amps",
    };
    const r = finalizeAnalysis(offlineAnalysis(q), q, { fromModel: false });
    expect(r.verdict).toBe("incorrect");
    expect(r.calculationSlip).toBe(true);
    expect(r.feedback).toMatch(/calculation slip/i);
  });

  it("no reasoning → neutral confidence 0.6 and no invented content", () => {
    const empty: AnalyzeRequest = { ...req, rawTranscript: "" };
    const r = finalizeAnalysis(offlineAnalysis(empty), empty, { fromModel: false });
    expect(r.confidence).toBe(0.6);
    expect(r.misconception).toBeNull();
    expect(r.equations).toEqual([]);
  });
});
