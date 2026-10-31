import { describe, expect, it } from "vitest";
import { applyConfirmations, NO_CHOICES, needsConfirmation } from "../confirm";
import { offlineAnalysis } from "../offlineAnalyzer";
import { finalizeAnalysis } from "../postprocess";
import type { AnalyzeRequest } from "../schemas";
import { markTranscript } from "../transcriptMarks";

const req = (raw: string): AnalyzeRequest => ({
  question: "Evaluate", options: ["a", "b", "c", "d"], selectedIndex: 0, correctIndex: 0, conceptId: "C4", rawTranscript: raw, candidateMisconceptions: [],
});
const analyse = (raw: string) => finalizeAnalysis(offlineAnalysis(req(raw)), req(raw), { fromModel: false });

describe("Did you mean? confirmations", () => {
  const ambiguous = analyse("log 6 plus one by three log three plus three squared");
  it("an ambiguous reading with no spoken result needs a choice", () => {
    expect(needsConfirmation(ambiguous)).toBe(true);
    expect(ambiguous.equations[0]).toMatchObject({ pickedIndex: null, needsChoice: true });
  });
  it("choosing B records a reading edit", () => {
    const { analysis, edits } = applyConfirmations(ambiguous, { ...NO_CHOICES, readings: { 0: 1 } });
    expect(analysis.equations[0]).toMatchObject({ pickedIndex: 1, needsChoice: false });
    expect(edits).toEqual([{ kind: "reading", from: "none", to: "1" }]);
  });
  it("✓ all accepts the first reading of an unresolved ambiguity", () => {
    const { analysis, edits } = applyConfirmations(ambiguous, NO_CHOICES);
    expect(analysis.equations[0].pickedIndex).toBe(0);
    expect(edits).toEqual([]);
  });
  it("a MathLive edit replaces the equation and is re-evaluated with math.js", () => {
    const { analysis, edits } = applyConfirmations(ambiguous, { ...NO_CHOICES, equationEdits: { 0: "3^{4}" } });
    expect(analysis.equations[0]).toMatchObject({ latex: "3^{4}", alternatives: [], pickedIndex: 0 });
    expect(analysis.equations[0].values[0]).toBe(81);
    expect(edits[0]).toMatchObject({ kind: "equation", to: "3^{4}" });
  });
  it("a term edit changes what was meant", () => {
    const a = analyse("the resisters are in series");
    const { analysis, edits } = applyConfirmations(a, { ...NO_CHOICES, termEdits: { 0: "resistances" } });
    expect(analysis.normalizedTerms[0].meant).toBe("resistances");
    expect(edits).toEqual([{ kind: "term", from: "resistors", to: "resistances" }]);
  });
});

describe("markTranscript", () => {
  it("keeps every character and marks fillers, hedges, markers, retractions and evidence", () => {
    const raw = "umm the first bulb uses up current… wait no, I think it's the same";
    const segs = markTranscript(raw, { fillers: ["umm"], hedges: ["I think"], retracted: ["the first bulb uses up current"], evidenceQuote: "uses up current" });
    expect(segs.map((s) => s.text).join("")).toBe(raw);
    const marksOf = (t: string) => segs.find((s) => s.text.includes(t))?.marks ?? [];
    expect(marksOf("umm")).toContain("filler");
    expect(marksOf("I think")).toContain("hedge");
    expect(marksOf("wait no")).toContain("marker");
    expect(marksOf("uses up")).toEqual(expect.arrayContaining(["retracted", "evidence"]));
  });
});
