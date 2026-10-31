import { describe, expect, it } from "vitest";
import { countMarkers, NEUTRAL_CONFIDENCE, normalizeSpeech, scoreConfidence } from "../confidence";

const DEMO =
  "umm so the first bulb uses up some of the current so the second one is dimmer… wait no I mean, actually I think it's the same? not sure.";

describe("scoreConfidence", () => {
  it("demo transcript: 3 self-corrections, 2 hedges, 1 filler in 29 words → ≈ 0.38", () => {
    const r = scoreConfidence({ rawTranscript: DEMO });
    expect(r).toMatchObject({ selfCorrections: 3, hedges: 2, fillers: 1, wordCount: 29 });
    expect(r.fillerRate).toBeCloseTo(10 / 29, 10);
    expect(r.baseline).toBeCloseTo(1 - 0.45 - 0.16 - 0.04 * (10 / 29), 10);
    expect(r.value).toBeCloseTo(0.38, 2);
    expect(r.reasons).toContain("3 self-corrections");
    expect(r.reasons).toContain("2 hedges");
  });

  it("clear reasoning scores 1", () => {
    const r = scoreConfidence({ rawTranscript: "I used V equals I R, so twelve by three is four amps." });
    expect(r.value).toBe(1);
    expect(r.reasons).toEqual(["Clear, direct reasoning"]);
  });

  it("no reasoning → neutral 0.6", () => {
    expect(scoreConfidence({ rawTranscript: "   " }).value).toBe(NEUTRAL_CONFIDENCE);
    expect(NEUTRAL_CONFIDENCE).toBe(0.6);
  });

  it("answer mismatch costs 0.3", () => {
    const text = "the resistance is the same in both";
    const base = scoreConfidence({ rawTranscript: text }).value;
    expect(base - scoreConfidence({ rawTranscript: text, answerMismatch: true }).value).toBeCloseTo(0.3, 10);
  });

  it("extra self-corrections from the analyzer count 0.15 each", () => {
    const r = scoreConfidence({ rawTranscript: "twenty ohms then five ohms", extraSelfCorrections: 2 });
    expect(r.baseline).toBeCloseTo(0.7, 10);
  });

  it("clamps to [0.1, 1]", () => {
    const r = scoreConfidence({ rawTranscript: "no wait sorry no no actually I mean maybe probably not sure umm uh", answerMismatch: true });
    expect(r.baseline).toBe(0.1);
  });

  it("blends with AI confidence: 0.6·ai + 0.4·baseline", () => {
    const r = scoreConfidence({ rawTranscript: DEMO, aiConfidence: 0.3 });
    expect(r.value).toBeCloseTo(0.6 * 0.3 + 0.4 * r.baseline, 10);
  });
});

describe("marker counting", () => {
  it("matches whole phrases only", () => {
    const t = normalizeSpeech("Likely, umm, the summary is I mean, like, basically fine. Ummm.");
    expect(countMarkers(t, ["like"])).toBe(1); // not "likely"
    expect(countMarkers(t, ["umm", "um"])).toBe(1); // not "ummm"
    expect(countMarkers(t, ["i mean"])).toBe(1);
  });
});
