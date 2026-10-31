/**
 * Deterministic Knowledge Galaxy layout (DESIGN.md §4).
 * Four chapter clusters on a tilted ring; inside each, a seeded force layout where prerequisite depth
 * sets the radius (roots near the cluster core, dependents further out).
 */
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS, type Chapter } from "@/lib/data/concepts";
import { mulberry32 } from "@/lib/rng";

export type Vec3 = [number, number, number];

export const RING_RADIUS = 7;
export const RING_TILT = (16 * Math.PI) / 180;
/** Constellation tints per chapter (nebula + legend). */
export const CHAPTER_COLOR: Record<Chapter, string> = {
  light: "#4FB8FF",
  eye: "#9B7BFF",
  electricity: "#FFB547",
  magnetism: "#FF5C93",
};
const CHAPTER_ANGLE: Record<Chapter, number> = {
  light: (150 * Math.PI) / 180,
  eye: (60 * Math.PI) / 180,
  electricity: (-30 * Math.PI) / 180,
  magnetism: (-120 * Math.PI) / 180,
};

export interface GalaxyLayout {
  positions: Record<string, Vec3>;
  clusterCenters: Record<Chapter, Vec3>;
  /** prereq → dependent pairs. */
  edges: [string, string][];
  /** Bounding radius of the whole galaxy. */
  radius: number;
}

/** Longest prerequisite chain inside the concept's own chapter. */
function chapterDepth(id: string, memo: Record<string, number> = {}): number {
  if (id in memo) return memo[id];
  const c = CONCEPT_BY_ID[id];
  const inChapter = c.prereqs.filter((p) => CONCEPT_BY_ID[p].chapter === c.chapter);
  memo[id] = inChapter.length ? 1 + Math.max(...inChapter.map((p) => chapterDepth(p, memo))) : 0;
  return memo[id];
}

const tilt = ([x, y, z]: Vec3): Vec3 => [
  x,
  y * Math.cos(RING_TILT) - z * Math.sin(RING_TILT),
  y * Math.sin(RING_TILT) + z * Math.cos(RING_TILT),
];

function layoutCluster(chapter: Chapter, seed: number): Record<string, [number, number, number]> {
  const rng = mulberry32(seed);
  const ids = CONCEPTS.filter((c) => c.chapter === chapter).map((c) => c.id);
  const memo: Record<string, number> = {};
  const depth = Object.fromEntries(ids.map((id) => [id, chapterDepth(id, memo)]));
  const maxDepth = Math.max(...Object.values(depth), 1);
  const spread = 0.75 + ids.length * 0.07; // larger chapters get a larger cluster
  const targetR = (id: string) => 0.35 + (depth[id] / maxDepth) * spread * 1.6;

  // Initial: spiral by depth with seeded angles.
  const pos: Record<string, [number, number]> = {};
  ids.forEach((id, i) => {
    const a = i * 2.39996 + rng() * 0.6; // golden angle
    pos[id] = [Math.cos(a) * targetR(id), Math.sin(a) * targetR(id)];
  });

  const springs = ids.flatMap((id) => CONCEPT_BY_ID[id].prereqs.filter((p) => ids.includes(p)).map((p) => [p, id] as const));
  for (let iter = 0; iter < 300; iter++) {
    const step = 0.05 * (1 - iter / 300) + 0.005;
    const force: Record<string, [number, number]> = Object.fromEntries(ids.map((id) => [id, [0, 0]]));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [ax, ay] = pos[ids[i]];
        const [bx, by] = pos[ids[j]];
        const dx = ax - bx;
        const dy = ay - by;
        const d2 = Math.max(dx * dx + dy * dy, 0.01);
        const f = 0.9 / d2;
        const d = Math.sqrt(d2);
        force[ids[i]][0] += (dx / d) * f;
        force[ids[i]][1] += (dy / d) * f;
        force[ids[j]][0] -= (dx / d) * f;
        force[ids[j]][1] -= (dy / d) * f;
      }
    }
    for (const [a, b] of springs) {
      const dx = pos[b][0] - pos[a][0];
      const dy = pos[b][1] - pos[a][1];
      const d = Math.max(Math.hypot(dx, dy), 0.01);
      const f = (d - 1.2) * 0.6;
      force[a][0] += (dx / d) * f;
      force[a][1] += (dy / d) * f;
      force[b][0] -= (dx / d) * f;
      force[b][1] -= (dy / d) * f;
    }
    for (const id of ids) {
      // Radial pull keeps prereqs inward and dependents outward.
      const [x, y] = pos[id];
      const r = Math.max(Math.hypot(x, y), 0.01);
      const f = (targetR(id) - r) * 1.2;
      force[id][0] += (x / r) * f;
      force[id][1] += (y / r) * f;
      pos[id] = [x + force[id][0] * step, y + force[id][1] * step];
    }
  }

  return Object.fromEntries(ids.map((id) => [id, [pos[id][0], (rng() - 0.5) * 0.9 + depth[id] * 0.12, pos[id][1]]]));
}

let cached: GalaxyLayout | null = null;

export function galaxyLayout(): GalaxyLayout {
  if (cached) return cached;
  const positions: Record<string, Vec3> = {};
  const clusterCenters = {} as Record<Chapter, Vec3>;
  CHAPTERS.forEach((ch, k) => {
    const a = CHAPTER_ANGLE[ch.id];
    const center: Vec3 = [Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS];
    clusterCenters[ch.id] = tilt(center);
    const local = layoutCluster(ch.id, 42 + k);
    for (const [id, [x, y, z]] of Object.entries(local)) positions[id] = tilt([center[0] + x, center[1] + y, center[2] + z]);
  });
  const edges = CONCEPTS.flatMap((c) => c.prereqs.map((p) => [p, c.id] as [string, string]));
  const radius = Math.max(...Object.values(positions).map(([x, y, z]) => Math.hypot(x, y, z)));
  cached = { positions, clusterCenters, edges, radius };
  return cached;
}

/** The node plus its direct prerequisites and dependents. */
export function oneHop(id: string): string[] {
  const deps = CONCEPTS.filter((c) => c.prereqs.includes(id)).map((c) => c.id);
  return [id, ...(CONCEPT_BY_ID[id]?.prereqs ?? []), ...deps];
}

export const nodeRadius = (weight: 1 | 2 | 3): number => 0.18 + 0.08 * weight;
