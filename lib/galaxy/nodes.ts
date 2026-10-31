import { CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { isDue } from "@/lib/engine/sm2";
import type { ConceptMastery, ReviewItem } from "@/lib/types";

/** Per-concept render state for the galaxy. */
export interface GalaxyNodeData {
  p: number;
  estimated: boolean;
  /** SM-2 review due at the virtual time → rotating halo. */
  due: boolean;
  /** Active misconceptions on this concept → orbiting violet satellites. */
  misconceptions: number;
}

export type GalaxyNodes = Record<string, GalaxyNodeData>;

/** Derive per-node galaxy render state from the learner model at virtual time `at`. */
export function buildGalaxyNodes(
  mastery: Record<string, ConceptMastery>,
  schedule: Record<string, ReviewItem>,
  activeMisconceptions: string[],
  at: number | null,
): GalaxyNodes {
  const mcCount: Record<string, number> = {};
  for (const id of activeMisconceptions) {
    const cid = MISCONCEPTION_BY_ID[id]?.conceptId;
    if (cid) mcCount[cid] = (mcCount[cid] ?? 0) + 1;
  }
  return Object.fromEntries(
    CONCEPTS.map((c) => {
      const m = mastery[c.id];
      const item = schedule[c.id];
      return [
        c.id,
        {
          p: m.p,
          estimated: m.estimated,
          due: at !== null && item !== undefined && isDue(item, at),
          misconceptions: mcCount[c.id] ?? 0,
        },
      ];
    }),
  );
}
