import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/lib/data/concepts";
import type { ConceptMastery } from "@/lib/types";
import {
  allocateMinutes,
  offlinePlan,
  orderByPrereqs,
  parseVideoId,
  pickWeakTopics,
  shapeModelPlan,
  studyPlanRequestSchema,
  type StudyPlanRequest,
} from "../studyPlan";

const mastery = (overrides: Record<string, number>): Record<string, ConceptMastery> =>
  Object.fromEntries(
    CONCEPTS.map((c) => [c.id, { p: overrides[c.id] ?? 0.9, estimated: false, suspect: false, history: [] }]),
  );

const req = (ids: [string, number][], misconceptions: Record<string, string[]> = {}): StudyPlanRequest =>
  studyPlanRequestSchema.parse({ topics: ids.map(([conceptId, p]) => ({ conceptId, p, misconceptions: misconceptions[conceptId] ?? [] })) });

describe("pickWeakTopics", () => {
  it("ranks by weakness, with a misconception lifting a concept above a weaker-by-p one", () => {
    const picked = pickWeakTopics(mastery({ C6: 0.4, L6: 0.2, C1: 0.55 }), ["MC01"]);
    // C1 (55%, MC01) jumps C6 (40%) but not L6 (20%).
    expect(picked.map((t) => t.conceptId)).toEqual(["L6", "C1", "C6"]);
    expect(picked[1].misconceptions).toEqual(["MC01"]);
  });
  it("still suggests something when nothing is weak", () => {
    expect(pickWeakTopics(mastery({}), [])).toHaveLength(5);
  });
});

describe("orderByPrereqs", () => {
  it("puts a prerequisite before the concept that needs it", () => {
    // L6 (mirror formula) depends on L4/L5, which depend on L3.
    const order = orderByPrereqs([{ conceptId: "L6" }, { conceptId: "L3" }]).map((t) => t.conceptId);
    expect(order).toEqual(["L3", "L6"]);
  });
});

describe("allocateMinutes", () => {
  it("sums exactly to the budget and gives weaker topics more time", () => {
    const r = req([["L6", 0.1], ["C6", 0.55], ["C1", 0.4]]);
    const mins = allocateMinutes(r.topics, 45);
    expect(mins.reduce((a, b) => a + b, 0)).toBe(45);
    expect(mins[0]).toBeGreaterThan(mins[1]);
    expect(Math.min(...mins)).toBeGreaterThanOrEqual(6);
  });
});

describe("parseVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=30", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?list=x&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://example.com/watch?v=dQw4w9WgXcQ", null],
    ["", null],
  ])("%s", (url, id) => expect(parseVideoId(url)).toBe(id));
});

describe("plans", () => {
  const r = req([["C6", 0.3], ["C1", 0.2]], { C1: ["MC01"] });

  it("offline plan fits the 45 minutes and maps every video to a requested concept", () => {
    const plan = offlinePlan(r, 1);
    expect(plan.totalMinutes).toBe(45);
    expect(plan.source).toBe("offline");
    expect(plan.items.every((v) => ["C1", "C6"].includes(v.conceptId) && v.url.startsWith("https://www.youtube.com/results"))).toBe(true);
  });

  it("model plan is reordered, capped per topic and stripped of unknown concepts", () => {
    const plan = shapeModelPlan(
      r,
      {
        items: [
          { conceptId: "C6", title: "Series circuits", channel: "X", url: "https://youtu.be/abcdefghijk", minutes: 90, why: "" },
          { conceptId: "ZZ", title: "Off topic", channel: "Y", url: "", minutes: 10, why: "" },
          { conceptId: "C1", title: "Current", channel: "Z", url: "made up", minutes: 10, why: "" },
        ],
      },
      1,
    );
    expect(plan).not.toBeNull();
    expect(plan!.items.map((v) => v.conceptId)).toEqual(["C1", "C6"].sort((a, b) => plan!.topics.findIndex((t) => t.conceptId === a) - plan!.topics.findIndex((t) => t.conceptId === b)));
    expect(plan!.totalMinutes).toBeLessThanOrEqual(45);
    const c6 = plan!.items.find((v) => v.conceptId === "C6")!;
    expect(c6.videoId).toBe("abcdefghijk");
    expect(c6.minutes).toBe(plan!.topics.find((t) => t.conceptId === "C6")!.minutes);
    expect(plan!.items.find((v) => v.conceptId === "C1")!.url).toContain("results?search_query=");
  });

  it("rejects a model plan that covers too few topics", () => {
    const three = req([["C6", 0.3], ["C1", 0.2], ["L6", 0.1]]);
    expect(shapeModelPlan(three, { items: [{ conceptId: "C6", title: "a", channel: "", url: "", minutes: 5, why: "" }] }, 1)).toBeNull();
  });
});
