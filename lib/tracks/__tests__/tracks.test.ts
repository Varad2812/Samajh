import { describe, expect, it } from "vitest";
import { makeGraph } from "@/lib/galaxy/graph";
import { galaxyLayout, oneHop } from "@/lib/galaxy/layout";
import { igniteOrder } from "@/lib/galaxy/ignition";
import { isBuiltInSubject, offlineTrack, shapeTrack, verifyTrackAI } from "../build";
import { makeAnswer, mistakesOf, scoreTrack, summary, trackNodes } from "../score";
import { customTestRequestSchema, trackAISchema, type TrackAI } from "../types";

const req = customTestRequestSchema.parse({ subject: "Chemistry", standard: "9", board: "CBSE", syllabus: "Atoms and molecules", count: 6 });

/** "right" sits at correctIndex; each wrong option has its matching belief. */
const q = (topicId: string, stem: string, correctIndex = 0) => {
  const wrong = ["wrong one", "wrong two", "wrong three"];
  const beliefs = ["belief one", "belief two", "belief three"];
  const options = [...wrong];
  const distractorWhy = [...beliefs];
  options.splice(correctIndex, 0, "right");
  distractorWhy.splice(correctIndex, 0, "");
  return { topicId, difficulty: 2, stem, options, correctIndex, explanation: "Because.", distractorWhy };
};

const ai: TrackAI = trackAISchema.parse({
  title: "Class 9 Chemistry: Atoms",
  units: [
    { id: "U1", name: "Atoms", short: "Atoms" },
    { id: "U2", name: "Molecules", short: "Molecules" },
  ],
  topics: [
    // T2 lists a later topic and itself as prereqs: both must be dropped (keeps the graph acyclic).
    { id: "T1", name: "Atomic mass", unit: "U1", prereqs: [], weight: 2 },
    { id: "T2", name: "Mole concept", unit: "U1", prereqs: ["T1", "T3", "T2"], weight: 3 },
    { id: "T3", name: "Molecular formula", unit: "U2", prereqs: ["T2"], weight: "5" },
    { id: "T4", name: "Orphan", unit: "U9", prereqs: [] },
  ],
  questions: [
    q("T1", "What is the atomic mass unit?"),
    q("T2", "How many particles in a mole?", 2),
    q("T2", "Molar mass of water?"),
    q("T3", "Formula of ammonia?"),
    q("T3", "Formula of methane?"),
    q("ZZ", "Unknown topic question"),
    { ...q("T1", "Duplicate options"), options: ["a", "a", "b", "c"] },
  ],
});

describe("makeGraph", () => {
  it("drops forward/self prereqs and topics in unknown units", () => {
    const g = makeGraph("t", ai.units, ai.topics.map((t) => ({ id: t.id, name: t.name, chapter: t.unit, prereqs: t.prereqs, weight: t.weight })));
    expect(g.concepts.map((c) => c.id)).toEqual(["T1", "T2", "T3"]);
    expect(g.byId.T2.prereqs).toEqual(["T1"]);
    expect(g.byId.T3.prereqs).toEqual(["T2"]);
    expect(g.byId.T3.weight).toBe(3);
  });

  it("lays out every topic and orders ignition by prerequisites", () => {
    const g = makeGraph("t-layout", ai.units, ai.topics.map((t) => ({ id: t.id, name: t.name, chapter: t.unit, prereqs: t.prereqs, weight: t.weight })));
    const layout = galaxyLayout(g);
    expect(Object.keys(layout.positions).sort()).toEqual(["T1", "T2", "T3"]);
    expect(Object.keys(layout.clusterCenters).sort()).toEqual(["U1", "U2"]);
    const order = igniteOrder(g);
    expect(order.T1).toBeLessThan(order.T2);
    expect(order.T2).toBeLessThan(order.T3);
    expect(oneHop("T2", g).sort()).toEqual(["T1", "T2", "T3"]);
  });
});

describe("shapeTrack", () => {
  const track = shapeTrack(req, ai, "trk_test", 1)!;

  it("keeps only valid questions, capped at the requested count", () => {
    expect(track).not.toBeNull();
    expect(track.questions).toHaveLength(5);
    expect(track.questions.every((x) => ["T1", "T2", "T3"].includes(x.topicId))).toBe(true);
  });

  it("shuffles options but keeps the answer and the misconception reasons aligned", () => {
    for (const x of track.questions) {
      expect(x.options[x.correctIndex]).toBe("right");
      expect(x.distractorWhy[x.correctIndex]).toBe("");
      const wrong = x.options.findIndex((o) => o === "wrong one");
      expect(x.distractorWhy[wrong]).toBe("belief one");
    }
  });

  it("verify rejects output with too few usable questions", () => {
    expect(verifyTrackAI(ai, req)).toBeNull();
    expect(verifyTrackAI({ ...ai, questions: ai.questions.slice(5) }, req)).toBe("too-few-valid-questions");
  });
});

describe("offline fallback", () => {
  it("only serves the built-in Class 10 Physics bank", () => {
    expect(isBuiltInSubject({ subject: "Physics", standard: "10" })).toBe(true);
    expect(isBuiltInSubject({ subject: "Science", standard: "Class X" })).toBe(true);
    expect(offlineTrack(req, "x", 1)).toBeNull();
  });

  it("picks the chapters named in the syllabus", () => {
    const t = offlineTrack(customTestRequestSchema.parse({ subject: "Physics", standard: "10", syllabus: "series and parallel resistance, electric power", count: 8 }), "x", 1)!;
    expect(t.units.map((u) => u.id)).toEqual(["electricity"]);
    expect(t.questions).toHaveLength(8);
    expect(t.questions.every((x) => x.topicId.startsWith("C"))).toBe(true);
  });
});

describe("scoring", () => {
  const track = shapeTrack(req, ai, "trk_score", 1)!;
  const [first, ...rest] = track.questions;
  const answers = [
    makeAnswer(first, first.correctIndex, "I'm sure, it's defined that way", 5000),
    ...rest.map((x) => makeAnswer(x, ((x.correctIndex + 1) % 4) as 0 | 1 | 2 | 3, "", 4000)),
  ];
  const result = scoreTrack(track, answers, 0, 120_000);

  it("raises mastery for right answers and lowers it for wrong ones", () => {
    const t1 = result.topics[first.topicId];
    expect(t1.tested).toBe(true);
    expect(t1.p).toBeGreaterThan(0.3);
    const wrongTopic = rest.find((x) => x.topicId !== first.topicId)!.topicId;
    expect(result.topics[wrongTopic].p).toBeLessThan(0.3);
  });

  it("lists mistakes, galaxy nodes and a summary", () => {
    expect(mistakesOf(track, result)).toHaveLength(rest.length);
    const nodes = trackNodes(track, result);
    expect(Object.keys(nodes).sort()).toEqual(["T1", "T2", "T3"]);
    expect(nodes.T3.misconceptions).toBeGreaterThan(0);
    const s = summary(result);
    expect(s).toMatchObject({ total: 5, correct: 1, minutes: 2 });
  });
});
