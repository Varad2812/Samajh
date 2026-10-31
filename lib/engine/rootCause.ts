/**
 * Prerequisite propagation and root-cause tracing (PROJECT.md §5.2).
 */
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import type { ConceptMastery } from "@/lib/types";

export const PROPAGATION_RATE = 0.05;
export const PREREQ_FLOOR = 0.05;
/** A concept below this is a candidate for root-cause probing. */
export const WEAK_CONCEPT = 0.4;
/** A prereq below this (or suspect) is a likely root cause. */
export const WEAK_PREREQ = 0.5;

/**
 * On an incorrect answer, each direct prereq loses 0.05·(1 − conf) (floor 0.05) and is marked suspect.
 * Returns a new mastery map; the input is not mutated.
 */
export function propagateIncorrect(
  mastery: Record<string, ConceptMastery>,
  conceptId: string,
  confidence: number,
): Record<string, ConceptMastery> {
  const next = { ...mastery };
  for (const pid of CONCEPT_BY_ID[conceptId]?.prereqs ?? []) {
    const cur = next[pid];
    if (!cur) continue;
    next[pid] = {
      ...cur,
      p: Math.max(PREREQ_FLOOR, cur.p - PROPAGATION_RATE * (1 - confidence)),
      suspect: true,
    };
  }
  return next;
}

/** The weakest direct prereq that is a likely cause, or null if the concept isn't weak or none qualifies. */
export function directRootCause(mastery: Record<string, ConceptMastery>, conceptId: string): string | null {
  const state = mastery[conceptId];
  if (!state || state.p >= WEAK_CONCEPT) return null;
  const candidates = (CONCEPT_BY_ID[conceptId]?.prereqs ?? [])
    .filter((pid) => mastery[pid] && (mastery[pid].p < WEAK_PREREQ || mastery[pid].suspect))
    .sort((a, b) => mastery[a].p - mastery[b].p);
  return candidates[0] ?? null;
}

/**
 * Follow root causes down the DAG: C6 → C4 → C2 … while each step still qualifies.
 * Returns the path (excluding `conceptId`); the last element is the deepest root cause.
 */
export function rootCausePath(mastery: Record<string, ConceptMastery>, conceptId: string): string[] {
  const path: string[] = [];
  const seen = new Set([conceptId]);
  let cur: string | null = directRootCause(mastery, conceptId);
  while (cur && !seen.has(cur)) {
    path.push(cur);
    seen.add(cur);
    cur = directRootCause(mastery, cur);
  }
  return path;
}

export function rootCauseOf(mastery: Record<string, ConceptMastery>, conceptId: string): string | null {
  return rootCausePath(mastery, conceptId).at(-1) ?? null;
}
