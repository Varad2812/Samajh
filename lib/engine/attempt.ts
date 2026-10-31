/**
 * One graded attempt → the whole learner-model update (PROJECT.md §5.2–5.4), as a pure function:
 * BKT on the concept, prerequisite propagation, misconception bookkeeping, Elo, SM-2 and root cause.
 */
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { QUESTION_BY_ID, type OptionIndex, type Question } from "@/lib/data/questions";
import type { Attempt, AttemptEdit, AttemptMode, ConceptMastery, ReviewItem, Verdict } from "@/lib/types";
import { applyAttempt } from "./bkt";
import { eloUpdate } from "./elo";
import { PREREQ_FLOOR, PROPAGATION_RATE, propagateIncorrect, rootCauseOf } from "./rootCause";
import { qualityOf, sm2Review } from "./sm2";

/** Sound correct answers on a concept, in a row, that clear a misconception (DESIGN.md §4.2 item 2). */
export const CLEAR_AFTER = 2;

export interface LearnerState {
  studentId: string;
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  theta: number;
  misconceptions: string[];
  attempts: Attempt[];
}

export interface GradedAnswer {
  id: string;
  question: Question;
  /** Calibrated difficulty (defaults to the question's own Elo). */
  questionElo?: number;
  selectedIndex: OptionIndex;
  verdict: Verdict;
  confidence: number;
  /** From the analyzer; null → fall back to the distractor the student tapped. */
  misconceptionId: string | null;
  calculationSlip?: boolean;
  rawTranscript?: string;
  cleanedReasoning?: string;
  edits?: AttemptEdit[];
  mode?: AttemptMode;
  now: number;
}

export interface RootCause {
  conceptId: string;
  via: "misconception" | "prerequisite";
  misconceptionId: string | null;
}

export interface AttemptOutcome {
  attempt: Attempt;
  conceptId: string;
  before: number;
  after: number;
  thetaBefore: number;
  theta: number;
  questionElo: number;
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  review: ReviewItem;
  misconceptions: string[];
  added: string[];
  cleared: string[];
  rootCause: RootCause | null;
}

/** The analyzer's misconception, else the one wired to the wrong option the student tapped. */
export function resolveMisconception(question: Question, selectedIndex: OptionIndex, fromAnalysis: string | null, verdict: Verdict): string | null {
  if (fromAnalysis && MISCONCEPTION_BY_ID[fromAnalysis]) return fromAnalysis;
  if (verdict !== "incorrect") return null;
  return question.distractorMisconceptions?.[selectedIndex] ?? null;
}

/** Misconceptions worth sending to the analyzer: the concept's, its ancestors', the distractors' and the student's own. */
export function candidateMisconceptionIds(question: Question, active: string[] = []): string[] {
  const concepts = new Set<string>();
  const visit = (id: string) => {
    if (concepts.has(id)) return;
    concepts.add(id);
    CONCEPT_BY_ID[id]?.prereqs.forEach(visit);
  };
  visit(question.conceptId);
  const ids = new Set<string>(Object.values(question.distractorMisconceptions ?? {}).filter((x): x is string => Boolean(x)));
  for (const m of Object.values(MISCONCEPTION_BY_ID)) if (concepts.has(m.conceptId)) ids.add(m.id);
  for (const id of active) if (MISCONCEPTION_BY_ID[id] && concepts.has(MISCONCEPTION_BY_ID[id].conceptId)) ids.add(id);
  return [...ids];
}

/** Does this attempt count as evidence against misconception `mcId`? */
function exercises(a: Attempt, mcId: string): boolean {
  const mc = MISCONCEPTION_BY_ID[mcId];
  if (!mc) return false;
  if (a.conceptId === mc.conceptId) return true;
  return Object.values(QUESTION_BY_ID[a.questionId]?.distractorMisconceptions ?? {}).includes(mcId);
}

/** Active misconceptions cleared by CLEAR_AFTER sound answers in a row on questions that exercise them. */
export function clearedMisconceptions(active: string[], attempts: Attempt[]): string[] {
  return active.filter((mcId) => {
    const relevant = attempts.filter((a) => exercises(a, mcId));
    const tail = relevant.slice(-CLEAR_AFTER);
    return tail.length === CLEAR_AFTER && tail.every((a) => a.verdict === "correct_sound" && a.misconceptionId === null);
  });
}

export function processAttempt(state: LearnerState, g: GradedAnswer): AttemptOutcome {
  const conceptId = g.question.conceptId;
  const prev = state.mastery[conceptId];
  const misconceptionId = resolveMisconception(g.question, g.selectedIndex, g.misconceptionId, g.verdict);

  // 1) BKT on the practised concept, then push doubt down to its prerequisites on a wrong answer.
  const updated = applyAttempt(prev, g.verdict, g.confidence, g.now, { arithmeticSlip: g.calculationSlip });
  let mastery = { ...state.mastery, [conceptId]: updated };
  if (g.verdict === "incorrect" && !g.calculationSlip) mastery = propagateIncorrect(mastery, conceptId, g.confidence);

  // 2) A misconception that lives on another concept makes that concept the prime suspect.
  const mcConcept = misconceptionId ? MISCONCEPTION_BY_ID[misconceptionId].conceptId : null;
  if (mcConcept && mcConcept !== conceptId && mastery[mcConcept]) {
    const cur = mastery[mcConcept];
    mastery[mcConcept] = { ...cur, p: Math.max(PREREQ_FLOOR, cur.p - PROPAGATION_RATE * (1 - g.confidence)), suspect: true };
  }

  // 3) Elo and SM-2.
  const elo = eloUpdate(state.theta, g.questionElo ?? g.question.elo, g.verdict);
  const review = sm2Review(state.schedule[conceptId], qualityOf(g.verdict, g.confidence, misconceptionId !== null), g.now);

  const attempt: Attempt = {
    id: g.id,
    studentId: state.studentId,
    questionId: g.question.id,
    conceptId,
    selectedIndex: g.selectedIndex,
    correct: g.selectedIndex === g.question.correctIndex,
    verdict: g.verdict,
    confidence: g.confidence,
    misconceptionId,
    rawTranscript: g.rawTranscript,
    cleanedReasoning: g.cleanedReasoning,
    edits: g.edits?.length ? g.edits : undefined,
    masteryBefore: prev.p,
    masteryAfter: updated.p,
    mode: g.mode,
    at: g.now,
  };
  const attempts = [...state.attempts, attempt];

  // 4) Misconception set: add the new one, clear any that two sound answers in a row have disproved.
  const withNew = misconceptionId && !state.misconceptions.includes(misconceptionId) ? [...state.misconceptions, misconceptionId] : state.misconceptions;
  const cleared = clearedMisconceptions(withNew, attempts);
  const misconceptions = withNew.filter((id) => !cleared.includes(id));
  const added = misconceptions.filter((id) => !state.misconceptions.includes(id));

  // 5) Root cause: a misconception on another concept wins; otherwise trace weak/suspect prerequisites.
  let rootCause: RootCause | null = null;
  if (g.verdict !== "correct_sound") {
    if (mcConcept && mcConcept !== conceptId) rootCause = { conceptId: mcConcept, via: "misconception", misconceptionId };
    else {
      const root = rootCauseOf(mastery, conceptId);
      if (root) rootCause = { conceptId: root, via: "prerequisite", misconceptionId: null };
    }
  }

  return {
    attempt,
    conceptId,
    before: prev.p,
    after: updated.p,
    thetaBefore: state.theta,
    theta: elo.theta,
    questionElo: elo.difficulty,
    mastery,
    schedule: { ...state.schedule, [conceptId]: review },
    review,
    misconceptions,
    added,
    cleared,
    rootCause,
  };
}
