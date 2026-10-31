/** Galaxy lenses: which stars stay lit for a given view of the learner model. */
import type { StudyPlan } from "@/lib/ai/studyPlan";
import type { GalaxyNodes } from "./nodes";

export type Lens = "all" | "weak" | "due" | "misconceptions" | "plan";

export const LENSES: { id: Lens; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weak", label: "Weak" },
  { id: "due", label: "Review due" },
  { id: "misconceptions", label: "Misconceptions" },
  { id: "plan", label: "Video plan" },
];

const WEAK_P = 0.45;

/** Lit concept ids for a lens (null = everything lit). */
export function lensIds(lens: Lens, nodes: GalaxyNodes, plan: StudyPlan | null): Set<string> | null {
  const pick = (f: (id: string) => boolean) => new Set(Object.keys(nodes).filter(f));
  switch (lens) {
    case "all":
      return null;
    case "weak":
      return pick((id) => !nodes[id].estimated && nodes[id].p < WEAK_P);
    case "due":
      return pick((id) => nodes[id].due);
    case "misconceptions":
      return pick((id) => nodes[id].misconceptions > 0);
    case "plan":
      return new Set(plan?.topics.map((t) => t.conceptId) ?? []);
  }
}
