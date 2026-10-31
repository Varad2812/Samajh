/**
 * The concept graph a galaxy draws. Class 10 Physics is the built-in graph; custom tests (any subject)
 * bring their own units and topics, laid out the same way.
 */
import { CHAPTERS, CONCEPTS } from "@/lib/data/concepts";

export interface GraphConcept {
  id: string;
  name: string;
  /** Cluster (chapter / unit) id. */
  chapter: string;
  prereqs: string[];
  weight: 1 | 2 | 3;
  summary?: string;
}

export interface GraphChapter {
  id: string;
  name: string;
  /** Cluster label in the scene. */
  label: string;
  color: string;
  /** Position on the cluster ring, radians. */
  angle: number;
}

export interface GalaxyGraph {
  /** Stable cache key for the layout. */
  key: string;
  concepts: GraphConcept[];
  chapters: GraphChapter[];
  byId: Record<string, GraphConcept>;
}

const deg = (d: number) => (d * Math.PI) / 180;

export const PHYSICS_CHAPTER_COLOR: Record<string, string> = {
  light: "#4FB8FF",
  eye: "#9B7BFF",
  electricity: "#FFB547",
  magnetism: "#FF5C93",
};
const PHYSICS_CHAPTER_ANGLE: Record<string, number> = { light: deg(150), eye: deg(60), electricity: deg(-30), magnetism: deg(-120) };
const PHYSICS_LABEL: Record<string, string> = { light: "Light", eye: "Eye", electricity: "Electricity", magnetism: "Magnetism" };

const index = (concepts: GraphConcept[]) => Object.fromEntries(concepts.map((c) => [c.id, c]));

export const PHYSICS_GRAPH: GalaxyGraph = {
  key: "physics-10",
  concepts: CONCEPTS,
  chapters: CHAPTERS.map((ch) => ({
    id: ch.id,
    name: ch.name,
    label: PHYSICS_LABEL[ch.id],
    color: PHYSICS_CHAPTER_COLOR[ch.id],
    angle: PHYSICS_CHAPTER_ANGLE[ch.id],
  })),
  byId: index(CONCEPTS),
};

/** Cluster tints for custom graphs, in order (distinct from the mastery colours). */
const CUSTOM_PALETTE = ["#4FB8FF", "#FFB547", "#9B7BFF", "#FF5C93", "#38E0D2", "#C8F05A"];

/**
 * Build a graph for a custom test: clusters spread evenly around the ring. A prerequisite must come earlier
 * in the list, which keeps the graph acyclic whatever the model returned.
 */
export function makeGraph(key: string, units: { id: string; name: string; short?: string }[], concepts: GraphConcept[]): GalaxyGraph {
  const unitIds = new Set(units.map((u) => u.id));
  const seen = new Set<string>();
  const clean: GraphConcept[] = [];
  for (const c of concepts) {
    if (!unitIds.has(c.chapter) || seen.has(c.id)) continue;
    clean.push({ ...c, prereqs: [...new Set(c.prereqs)].filter((p) => seen.has(p)) });
    seen.add(c.id);
  }
  const used = units.filter((u) => clean.some((c) => c.chapter === u.id));
  return {
    key,
    concepts: clean,
    chapters: used.map((u, i) => ({
      id: u.id,
      name: u.name,
      label: u.short || u.name,
      color: CUSTOM_PALETTE[i % CUSTOM_PALETTE.length],
      angle: deg(150) - (i * 2 * Math.PI) / Math.max(1, used.length),
    })),
    byId: index(clean),
  };
}
