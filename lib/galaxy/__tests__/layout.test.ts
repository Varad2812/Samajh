import { describe, expect, it } from "vitest";
import { CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { galaxyLayout, nodeRadius, oneHop } from "../layout";

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("galaxyLayout", () => {
  const layout = galaxyLayout();

  it("places all 34 concepts with finite coordinates", () => {
    expect(Object.keys(layout.positions)).toHaveLength(CONCEPTS.length);
    for (const p of Object.values(layout.positions)) expect(p.every(Number.isFinite)).toBe(true);
  });

  it("no two nodes overlap", () => {
    const ids = CONCEPTS.map((c) => c.id);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const gap = dist(layout.positions[ids[i]], layout.positions[ids[j]]);
        const minGap = nodeRadius(CONCEPT_BY_ID[ids[i]].weight) + nodeRadius(CONCEPT_BY_ID[ids[j]].weight) + 0.15;
        expect(gap, `${ids[i]}–${ids[j]}`).toBeGreaterThan(minGap);
      }
  });

  it("each node is closer to its own cluster centre than to any other", () => {
    for (const c of CONCEPTS) {
      const own = dist(layout.positions[c.id], layout.clusterCenters[c.chapter]);
      for (const [ch, center] of Object.entries(layout.clusterCenters)) {
        if (ch !== c.chapter) expect(own, c.id).toBeLessThan(dist(layout.positions[c.id], center));
      }
    }
  });

  it("chapter roots sit nearer the cluster core than their deepest dependents", () => {
    const d = (id: string) => dist(layout.positions[id], layout.clusterCenters[CONCEPT_BY_ID[id].chapter]);
    expect(d("C1")).toBeLessThan(d("C7"));
    expect(d("L1")).toBeLessThan(d("L13"));
  });

  it("is deterministic and lists every prerequisite edge", () => {
    expect(JSON.stringify(galaxyLayout())).toBe(JSON.stringify(layout));
    expect(layout.edges).toHaveLength(CONCEPTS.reduce((n, c) => n + c.prereqs.length, 0));
  });

  it("oneHop returns the node, its prereqs and dependents", () => {
    expect(oneHop("C4").sort()).toEqual(["C2", "C3", "C4", "C5", "C6", "C7", "C8"].sort());
  });
});
