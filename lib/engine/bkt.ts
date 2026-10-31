/**
 * Bayesian Knowledge Tracing weighted by confidence (PROJECT.md §5.2).
 */
import { CONCEPTS, dependentsOf, type Concept } from "@/lib/data/concepts";
import type { ConceptMastery, Verdict } from "@/lib/types";

export interface BktParams {
  pInit: number;
  /** Learning transition. */
  pT: number;
  /** Slip. */
  pS: number;
  /** Guess. */
  pG: number;
}

export const BKT_DEFAULTS: BktParams = { pInit: 0.3, pT: 0.15, pS: 0.1, pG: 0.25 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Bayesian posterior P(known | observation). */
export function bktPosterior(L: number, correct: boolean, p: BktParams = BKT_DEFAULTS): number {
  if (correct) {
    const num = L * (1 - p.pS);
    return num / (num + (1 - L) * p.pG);
  }
  const num = L * p.pS;
  return num / (num + (1 - L) * (1 - p.pG));
}

/** How strongly an observation moves L toward the posterior. */
export function evidenceWeight(verdict: Verdict, confidence: number, opts: { arithmeticSlip?: boolean } = {}): number {
  switch (verdict) {
    case "correct_sound":
      return 0.5 + 0.5 * clamp01(confidence);
    case "correct_flawed":
      return 0.3;
    case "incorrect":
      // Right relation, calculation slip: the concept is likely known (§5.5).
      return opts.arithmeticSlip ? 0.5 : 1.0;
  }
}

export interface BktUpdateOptions {
  arithmeticSlip?: boolean;
  params?: BktParams;
}

/** One BKT step: L → L' (weighted toward posterior) → L'' (learning transition). */
export function bktUpdate(L: number, verdict: Verdict, confidence: number, opts: BktUpdateOptions = {}): number {
  const p = opts.params ?? BKT_DEFAULTS;
  const correct = verdict !== "incorrect";
  const post = bktPosterior(L, correct, p);
  const w = evidenceWeight(verdict, confidence, opts);
  const L1 = L + w * (post - L);
  const L2 = L1 + (1 - L1) * p.pT * (verdict === "correct_sound" ? 1 : 0.5);
  return clamp01(L2);
}

/** Apply an attempt to a concept's state: new p, history point, no longer estimated. */
export function applyAttempt(
  state: ConceptMastery,
  verdict: Verdict,
  confidence: number,
  at: number,
  opts: BktUpdateOptions = {},
): ConceptMastery {
  const p = bktUpdate(state.p, verdict, confidence, opts);
  return {
    p,
    estimated: false,
    // A sound correct answer clears a prerequisite suspicion; anything else keeps it.
    suspect: verdict === "correct_sound" ? false : state.suspect,
    history: [...state.history, { at, p }],
  };
}

export const ESTIMATE_FACTOR = 0.8;

/**
 * After the diagnostic: untested concepts inherit the mean of their tested prereqs and dependents × 0.8,
 * flagged `estimated` (PROJECT.md §4.1). Concepts with no tested neighbour keep pInit.
 */
export function inferUntested(
  tested: Record<string, number>,
  at: number,
  concepts: Concept[] = CONCEPTS,
  pInit = BKT_DEFAULTS.pInit,
): Record<string, ConceptMastery> {
  const out: Record<string, ConceptMastery> = {};
  for (const c of concepts) {
    if (c.id in tested) {
      out[c.id] = { p: tested[c.id], estimated: false, suspect: false, history: [{ at, p: tested[c.id] }] };
      continue;
    }
    const neighbours = [...c.prereqs, ...dependentsOf(c.id).map((d) => d.id)].filter((id) => id in tested);
    const p = neighbours.length
      ? (neighbours.reduce((s, id) => s + tested[id], 0) / neighbours.length) * ESTIMATE_FACTOR
      : pInit;
    out[c.id] = { p, estimated: true, suspect: false, history: [] };
  }
  return out;
}
