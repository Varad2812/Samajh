import { describe, expect, it } from "vitest";
import { shapeTrack } from "../build";
import { customTestRequestSchema, trackAISchema } from "../types";

describe("option shuffle", () => {
  it("spreads the correct answer across A-D even when the model always puts it first", () => {
    const req = customTestRequestSchema.parse({ subject: "History", standard: "8", syllabus: "Mughal empire", count: 20 });
    const counts = [0, 0, 0, 0];
    for (let run = 0; run < 10; run++) {
      const ai = trackAISchema.parse({
        title: "t",
        units: [{ id: "U1", name: "u" }],
        topics: [{ id: "T1", name: "a", unit: "U1" }, { id: "T2", name: "b", unit: "U1" }],
        questions: Array.from({ length: 20 }, (_, i) => ({ topicId: "T1", stem: `Question number ${i} about things`, options: ["right", "w1", "w2", "w3"], correctIndex: 0, explanation: "e" })),
      });
      for (const q of shapeTrack(req, ai, `trk_${run}abc`, 1)!.questions) counts[q.correctIndex]++;
    }
    // 200 questions: each position should get roughly 50.
    for (const c of counts) expect(c).toBeGreaterThan(30);
  });
});

describe("leaked model working", () => {
  it("drops questions whose options contain the model's own corrections", () => {
    const req = customTestRequestSchema.parse({ subject: "Chemistry", standard: "9", syllabus: "Atoms", count: 6 });
    const base = { topicId: "T1", explanation: "e", correctIndex: 0 };
    const ai = trackAISchema.parse({
      title: "t",
      units: [{ id: "U1", name: "u" }],
      topics: [{ id: "T1", name: "a", unit: "U1" }, { id: "T2", name: "b", unit: "U1" }],
      questions: [
        { ...base, stem: "Clean question one?", options: ["a", "b", "c", "d"] },
        { ...base, stem: "Clean question two?", options: ["a", "b", "c", "d"] },
        { ...base, stem: "Clean question three?", options: ["a", "b", "c", "d"] },
        { ...base, stem: "Clean question four?", options: ["a", "b", "c", "d"] },
        { ...base, stem: "Leaky question?", options: ["11.3 g", "No, products 11.3 g wait...", "c", "d"] },
      ],
    });
    const t = shapeTrack(req, ai, "trk_leak", 1)!;
    expect(t.questions.map((q) => q.stem)).not.toContain("Leaky question?");
    expect(t.questions).toHaveLength(4);
  });
});
