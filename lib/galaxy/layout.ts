/**
 * Deterministic Knowledge Galaxy layout (DESIGN.md §4).
 * Chapter clusters on a tilted ring; inside each, a seeded force layout where prerequisite depth
 * sets the radius (roots near the cluster core, dependents further out). Works for any GalaxyGraph.
 */
import type { Chapter } from "@/lib/data/concepts";
import { mulberry32 } from "@/lib/rng";
import { PHYSICS_CHAPTER_COLOR, PHYSICS_GRAPH, type GalaxyGraph } from "./graph";

export type Vec3 = [number, number, number];

export const RING_RADIUS = 7;
export const RING_TILT = (16 * Math.PI) / 180;
/** Constellation tints per chapter (nebula + legend). */
export const CHAPTER_COLOR = PHYSICS_CHAPTER_COLOR as Record<Chapter, string>;
export const CHAPTER_ANGLE = Object.fromEntries(PHYSICS_GRAPH.chapters.map((c) => [c.id, c.angle])) as Record<Chapter, number>;

export interface GalaxyLayout {
  positions: Record<string, Vec3>;
  clusterCenters: Record<string, Vec3>;
  /** prereq → dependent pairs. */
  edges: [string, string][];
  /** Bounding radius of the whole galaxy. */
  radius: number;
  /** Overview camera: the physics view, or one framed around a custom graph's actual extent. */
  home: { position: Vec3; target: Vec3 };
}

const PHYSICS_HOME = { position: [0, 13, 22] as Vec3, target: [0, 0, 0] as Vec3 };

function frameHome(positions: Vec3[]): GalaxyLayout["home"] {
  const n = Math.max(1, positions.length);
  const c = positions.reduce<Vec3>((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
  const extent = Math.max(1, ...positions.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])));
  const dist = Math.max(8, extent * 2.4 + 4);
  const len = Math.hypot(0, 13, 22);
  return { position: [c[0], c[1] + (13 / len) * dist, c[2] + (22 / len) * dist], target: c };
}

/** Longest prerequisite chain inside the concept's own chapter. */
function chapterDepth(g: GalaxyGraph, id: string, memo: Record<string, number> = {}): number {
  if (id in memo) return memo[id];
  memo[id] = 0; // guards against a cycle
  const c = g.byId[id];
  const inChapter = c.prereqs.filter((p) => g.byId[p]?.chapter === c.chapter);
  memo[id] = inChapter.length ? 1 + Math.max(...inChapter.map((p) => chapterDepth(g, p, memo))) : 0;
  return memo[id];
}

const tilt = ([x, y, z]: Vec3): Vec3 => [
  x,
  y * Math.cos(RING_TILT) - z * Math.sin(RING_TILT),
  y * Math.sin(RING_TILT) + z * Math.cos(RING_TILT),
];

function layoutCluster(g: GalaxyGraph, chapter: string, seed: number): Record<string, [number, number, number]> {
  const rng = mulberry32(seed);
  const ids = g.concepts.filter((c) => c.chapter === chapter).map((c) => c.id);
  const memo: Record<string, number> = {};
  const depth = Object.fromEntries(ids.map((id) => [id, chapterDepth(g, id, memo)]));
  const maxDepth = Math.max(...Object.values(depth), 1);
  const spread = 0.75 + ids.length * 0.07; // larger chapters get a larger cluster
  const targetR = (id: string) => 0.35 + (depth[id] / maxDepth) * spread * 1.6;

  // Initial: spiral by depth with seeded angles.
  const pos: Record<string, [number, number]> = {};
  ids.forEach((id, i) => {
    const a = i * 2.39996 + rng() * 0.6; // golden angle
    pos[id] = [Math.cos(a) * targetR(id), Math.sin(a) * targetR(id)];
  });

  const springs = ids.flatMap((id) => g.byId[id].prereqs.filter((p) => ids.includes(p)).map((p) => [p, id] as const));
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

const cache = new Map<string, GalaxyLayout>();
const MAX_CACHED = 12;

export function galaxyLayout(g: GalaxyGraph = PHYSICS_GRAPH): GalaxyLayout {
  const hit = cache.get(g.key);
  if (hit) return hit;
  const positions: Record<string, Vec3> = {};
  const clusterCenters: Record<string, Vec3> = {};
  // Fewer clusters sit closer together so a small custom galaxy still fills the frame.
  const ring = g.chapters.length <= 2 ? RING_RADIUS * 0.6 : RING_RADIUS;
  g.chapters.forEach((ch, k) => {
    const center: Vec3 = [Math.cos(ch.angle) * ring, 0, Math.sin(ch.angle) * ring];
    clusterCenters[ch.id] = tilt(center);
    const local = layoutCluster(g, ch.id, 42 + k);
    for (const [id, [x, y, z]] of Object.entries(local)) positions[id] = tilt([center[0] + x, center[1] + y, center[2] + z]);
  });
  const edges = g.concepts.flatMap((c) => c.prereqs.map((p) => [p, c.id] as [string, string]));
  const radius = Math.max(1, ...Object.values(positions).map(([x, y, z]) => Math.hypot(x, y, z)));
  const home = g.key === PHYSICS_GRAPH.key ? PHYSICS_HOME : frameHome(Object.values(positions));
  const layout = { positions, clusterCenters, edges, radius, home };
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(g.key, layout);
  return layout;
}

/** The node plus its direct prerequisites and dependents. */
export function oneHop(id: string, g: GalaxyGraph = PHYSICS_GRAPH): string[] {
  const deps = g.concepts.filter((c) => c.prereqs.includes(id)).map((c) => c.id);
  return [id, ...(g.byId[id]?.prereqs ?? []), ...deps];
}

export const nodeRadius = (weight: 1 | 2 | 3): number => 0.18 + 0.08 * weight;
