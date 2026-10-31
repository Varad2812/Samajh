/**
 * Galaxy Ignition timeline (DESIGN.md §4.2-1), in seconds from the start:
 * one point → big-bang burst → spiral dust forms → nodes ignite in prerequisite order with pulses along edges →
 * camera settles on the full galaxy.
 */
import { CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";

export const IGNITION = {
  duration: 4.2,
  pointEnd: 0.35,
  bangAt: 0.3,
  bangLife: 1.3,
  dustStart: 0.8,
  dustEnd: 2.4,
  starsAt: 0.9,
  nebulaStart: 1.2,
  nebulaEnd: 3.0,
  nodesStart: 1.4,
  nodesEnd: 3.4,
} as const;

/** Longest prerequisite chain (across chapters). */
function depth(id: string, memo: Record<string, number>): number {
  if (id in memo) return memo[id];
  const pre = CONCEPT_BY_ID[id].prereqs;
  memo[id] = pre.length ? 1 + Math.max(...pre.map((p) => depth(p, memo))) : 0;
  return memo[id];
}

let cachedOrder: Record<string, number> | null = null;

/** Topological ignition order: by prerequisite depth, then syllabus order. */
export function igniteOrder(): Record<string, number> {
  if (cachedOrder) return cachedOrder;
  const memo: Record<string, number> = {};
  const sorted = CONCEPTS.map((c, i) => ({ id: c.id, d: depth(c.id, memo), i })).sort((a, b) => a.d - b.d || a.i - b.i);
  cachedOrder = Object.fromEntries(sorted.map((x, k) => [x.id, k]));
  return cachedOrder;
}

/** Seconds after ignition start at which a concept's node lights up. */
export function igniteAt(id: string): number {
  const k = igniteOrder()[id] ?? 0;
  return IGNITION.nodesStart + (k / Math.max(1, CONCEPTS.length - 1)) * (IGNITION.nodesEnd - IGNITION.nodesStart);
}

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
