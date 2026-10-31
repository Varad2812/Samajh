import { describe, expect, it } from "vitest";
import { CHAPTERS, CONCEPTS } from "@/lib/data/concepts";
import { generateClass } from "@/lib/data/students";
import { filterByMisconception, kpis, misconceptionStats, sortRoster, studentMean, weakestConcepts } from "../stats";

const AT = new Date("2026-10-31T10:00:00").getTime();
const roster = generateClass(AT);

describe("class X-ray aggregates", () => {
  it("planted misconception counts: MC01 12/30, MC03 9/30, MC13 8/30; MC01 leads", () => {
    const stats = misconceptionStats(roster);
    expect(stats[0]).toMatchObject({ id: "MC01", count: 12, rate: 0.4 });
    expect(stats.find((s) => s.id === "MC03")?.count).toBe(9);
    expect(stats.find((s) => s.id === "MC13")?.count).toBe(8);
    expect(stats.map((s) => s.count)).toEqual([...stats.map((s) => s.count)].sort((a, b) => b - a));
  });

  it("Electricity is the weakest chapter and the weakest concepts are mostly electricity", () => {
    const chapterMeans = CHAPTERS.map((ch) => {
      const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
      return { ch: ch.id, m: roster.reduce((a, s) => a + cs.reduce((b, c) => b + s.mastery[c.id].p, 0) / cs.length, 0) / roster.length };
    }).sort((a, b) => a.m - b.m);
    expect(chapterMeans[0].ch).toBe("electricity");
    const weakest = weakestConcepts(roster, 8);
    expect(weakest.filter((w) => w.conceptId.startsWith("C")).length).toBeGreaterThanOrEqual(5);
    expect(weakest.map((w) => w.mean)).toEqual([...weakest.map((w) => w.mean)].sort((a, b) => a - b));
  });

  it("weak concept rows carry class-level root causes and their misconceptions", () => {
    const all = weakestConcepts(roster, 34);
    const withRoot = all.filter((w) => w.rootCause);
    for (const w of withRoot) expect(w.rootCause).not.toBe(w.conceptId);
    const c1 = all.find((w) => w.conceptId === "C1");
    expect(c1?.misconceptions.map((m) => m.id)).toContain("MC01");
  });

  it("KPIs are consistent with the roster", () => {
    const k = kpis(roster, AT);
    expect(k.size).toBe(30);
    expect(k.classMean).toBeCloseTo(roster.reduce((a, s) => a + studentMean(s), 0) / 30, 10);
    expect(k.atRisk).toBe(roster.filter((s) => studentMean(s) < 0.4).length);
    expect(k.topMisconception?.id).toBe("MC01");
    expect(k.overdue).toBeGreaterThan(0);
    // Fast-forwarding the virtual clock makes more reviews overdue.
    expect(kpis(roster, AT + 3 * 86_400_000).overdue).toBeGreaterThan(k.overdue);
  });

  it("sorts weakest-first by mean, by a concept, and by name; filters by misconception", () => {
    const byMean = sortRoster(roster, "mean").map(studentMean);
    expect(byMean).toEqual([...byMean].sort((a, b) => a - b));
    const byC1 = sortRoster(roster, "concept:C1").map((s) => s.mastery.C1.p);
    expect(byC1).toEqual([...byC1].sort((a, b) => a - b));
    const names = sortRoster(roster, "name").map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(filterByMisconception(roster, "MC01")).toHaveLength(12);
    expect(filterByMisconception(roster, null)).toHaveLength(30);
  });
});
