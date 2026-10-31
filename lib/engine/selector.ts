/**
 * Next-question selection (PROJECT.md §5.3).
 * Concept priority: due reviews > root-cause probes > lowest mastery × weight > unexplored concepts.
 * Question: nearest Elo to the 70%-success target, not seen in the last 5 attempts, preferring distractors
 * that target the student's active misconception. Nothing within ±150 → ask the AI to generate one.
 */
import { CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { misconceptionsFor } from "@/lib/data/misconceptions";
import { QUESTIONS, type Question } from "@/lib/data/questions";
import type { Attempt, ConceptMastery, ReviewItem } from "@/lib/types";
import { targetDifficulty } from "./elo";
import { rootCauseOf } from "./rootCause";
import { dueConceptIds } from "./sm2";

export const RECENT_WINDOW = 5;
export const ELO_WINDOW = 150;
/** Explored concepts at or above this count as "fine for now"; unexplored ones come next. */
export const WEAKEST_CEILING = 0.6;

export type SelectionReason = "review" | "root_cause" | "weakest" | "unexplored" | "requested";

export interface SelectorInput {
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  attempts: Pick<Attempt, "questionId" | "conceptId" | "at">[];
  theta: number;
  now: number;
  activeMisconceptions?: string[];
  /** Seeded + AI-generated questions. Defaults to the seeded bank. */
  questions?: Question[];
  /** Calibrated difficulty overrides (question id → Elo). */
  questionElo?: Record<string, number>;
  /** Practice a specific concept (practice?concept=ID). */
  conceptId?: string;
}

export interface ConceptChoice {
  conceptId: string;
  reason: SelectionReason;
  /** For root-cause probes: the weak concept that led here. */
  probedFor: string | null;
}

export interface Selection extends ConceptChoice {
  question: Question | null;
  questionElo: number | null;
  targetElo: number;
  /** No question within ±150 Elo: call /api/generate-question (`question` is the nearest fallback). */
  needsGeneration: boolean;
  /** Most relevant misconception to target for this concept. */
  misconceptionId: string | null;
}

const chronological = <T extends { at: number }>(xs: T[]) => [...xs].sort((a, b) => a.at - b.at);

export function chooseConcept(input: SelectorInput): ConceptChoice {
  if (input.conceptId && CONCEPT_BY_ID[input.conceptId]) {
    return { conceptId: input.conceptId, reason: "requested", probedFor: null };
  }

  const due = dueConceptIds(input.schedule, input.now);
  if (due.length > 0) return { conceptId: due[0], reason: "review", probedFor: null };

  const attempts = chronological(input.attempts);
  // Explored concepts, most recently attempted first.
  const explored = [...new Set(attempts.map((a) => a.conceptId).reverse())];
  for (const id of explored) {
    const root = rootCauseOf(input.mastery, id);
    if (root) return { conceptId: root, reason: "root_cause", probedFor: id };
  }

  const weakest = explored
    .filter((id) => input.mastery[id] && input.mastery[id].p < WEAKEST_CEILING)
    .map((id) => ({ id, score: (1 - input.mastery[id].p) * CONCEPT_BY_ID[id].weight }))
    .sort((a, b) => b.score - a.score)[0];
  if (weakest) return { conceptId: weakest.id, reason: "weakest", probedFor: null };

  const exploredSet = new Set(explored);
  const frontier = CONCEPTS.filter((c) => !exploredSet.has(c.id))
    .map((c) => ({ id: c.id, score: c.weight + (c.prereqs.every((p) => exploredSet.has(p)) ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)[0];
  if (frontier) return { conceptId: frontier.id, reason: "unexplored", probedFor: null };

  const lowest = [...CONCEPTS].sort((a, b) => input.mastery[a.id].p - input.mastery[b.id].p)[0];
  return { conceptId: lowest.id, reason: "weakest", probedFor: null };
}

export function relevantMisconception(conceptId: string, active: string[] = []): string | null {
  const catalogued = misconceptionsFor(conceptId).map((m) => m.id);
  return catalogued.find((id) => active.includes(id)) ?? catalogued[0] ?? null;
}

export function selectNext(input: SelectorInput): Selection {
  const choice = chooseConcept(input);
  const bank = (input.questions ?? QUESTIONS).filter((q) => q.conceptId === choice.conceptId);
  const recent = new Set(chronological(input.attempts).slice(-RECENT_WINDOW).map((a) => a.questionId));
  const fresh = bank.filter((q) => !recent.has(q.id));
  const pool = fresh.length > 0 ? fresh : bank;

  const targetElo = targetDifficulty(input.theta);
  const misconceptionId = relevantMisconception(choice.conceptId, input.activeMisconceptions);
  const eloOf = (q: Question) => input.questionElo?.[q.id] ?? q.elo;
  const byDistance = [...pool].sort((a, b) => Math.abs(eloOf(a) - targetElo) - Math.abs(eloOf(b) - targetElo));
  const within = byDistance.filter((q) => Math.abs(eloOf(q) - targetElo) <= ELO_WINDOW);
  const targeting = within.filter(
    (q) => misconceptionId && Object.values(q.distractorMisconceptions ?? {}).includes(misconceptionId),
  );
  const question = targeting[0] ?? within[0] ?? byDistance[0] ?? null;

  return {
    ...choice,
    question,
    questionElo: question ? eloOf(question) : null,
    targetElo,
    needsGeneration: within.length === 0,
    misconceptionId,
  };
}
