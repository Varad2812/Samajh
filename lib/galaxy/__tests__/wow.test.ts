import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/lib/data/concepts";
import { DUST_COUNT, generateDust } from "../dust";
import { IGNITION, igniteAt, igniteOrder, smoothstep } from "../ignition";
import { CHAPTER_ANGLE, RING_RADIUS } from "../layout";

describe("igniteOrder", () => {
  it("is a permutation of all concepts", () => {
    const order = igniteOrder();
    expect(Object.keys(order)).toHaveLength(CONCEPTS.length);
    expect(new Set(Object.values(order)).size).toBe(CONCEPTS.length);
  });
  it("every prerequisite ignites before its dependents", () => {
    for (const c of CONCEPTS) for (const p of c.prereqs) expect(igniteAt(p), `${p} → ${c.id}`).toBeLessThan(igniteAt(c.id));
  });
  it("fits inside the node ignition window", () => {
    const times = CONCEPTS.map((c) => igniteAt(c.id));
    expect(Math.min(...times)).toBe(IGNITION.nodesStart);
    expect(Math.max(...times)).toBeCloseTo(IGNITION.nodesEnd, 10);
    expect(IGNITION.nodesEnd).toBeLessThan(IGNITION.duration);
  });
  it("smoothstep clamps and eases", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
});

describe("generateDust", () => {
  const dust = generateDust();

  it(`makes ${DUST_COUNT} finite points with colours, sizes and seeds`, () => {
    expect(dust.positions).toHaveLength(DUST_COUNT * 3);
    expect(dust.colors).toHaveLength(DUST_COUNT * 3);
    expect(dust.sizes).toHaveLength(DUST_COUNT);
    expect(dust.positions.every(Number.isFinite)).toBe(true);
    expect(Math.max(...dust.colors)).toBeLessThanOrEqual(1);
  });

  it("is deterministic", () => {
    expect(generateDust().positions).toEqual(dust.positions);
  });

  it("each spiral arm passes through its chapter cluster", () => {
    for (const angle of Object.values(CHAPTER_ANGLE)) {
      const cx = Math.cos(angle) * RING_RADIUS;
      const cz = Math.sin(angle) * RING_RADIUS;
      let near = 0;
      for (let i = 0; i < DUST_COUNT; i++) {
        if (Math.hypot(dust.positions[i * 3] - cx, dust.positions[i * 3 + 2] - cz) < 2) near++;
      }
      expect(near / DUST_COUNT).toBeGreaterThan(0.01);
    }
  });
});
