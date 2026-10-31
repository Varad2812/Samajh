import { CONCEPTS } from "@/lib/data/concepts";
import type { ConceptMastery } from "@/lib/types";

/** Mastery map with every concept at `base`, measured (not estimated), with overrides by id. */
export function masteryMap(
  overrides: Record<string, number | Partial<ConceptMastery>> = {},
  base = 0.7,
): Record<string, ConceptMastery> {
  return Object.fromEntries(
    CONCEPTS.map((c) => {
      const o = overrides[c.id];
      const state: ConceptMastery = { p: base, estimated: false, suspect: false, history: [] };
      return [c.id, typeof o === "number" ? { ...state, p: o } : { ...state, ...o }];
    }),
  );
}

export const T0 = Date.UTC(2026, 9, 31, 10, 0, 0);
