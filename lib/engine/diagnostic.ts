/**
 * 12-question adaptive diagnostic (PROJECT.md §4.1): one opener per chapter at difficulty 2, then per chapter
 * correct → harder question on a dependent concept, wrong → easier question on a prerequisite.
 */
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS, dependentsOf } from "@/lib/data/concepts";
import { QUESTIONS, type Question } from "@/lib/data/questions";
import type { Attempt, ConceptMastery, ReviewItem } from "@/lib/types";
import { BKT_DEFAULTS, inferUntested } from "./bkt";
import { INITIAL_THETA } from "./elo";
import { processAttempt, type GradedAnswer, type LearnerState } from "./attempt";

export const DIAGNOSTIC_LENGTH = 12;

export interface DiagnosticStep {
  questionId: string;
  correct: boolean;
}

const chapterOf = (q: Question) => CONCEPT_BY_ID[q.conceptId].chapter;
const byId = (a: Question, b: Question) => a.id.localeCompare(b.id);

/** The four openers: the first difficulty-2 question of each chapter. */
export const DIAGNOSTIC_OPENERS: Question[] = CHAPTERS.map(
  (ch) => [...QUESTIONS].sort(byId).find((q) => q.difficulty === 2 && chapterOf(q) === ch.id) ?? QUESTIONS[0],
);

/** Next question, or null when the diagnostic is complete. Never repeats a question. */
export function nextDiagnosticQuestion(steps: DiagnosticStep[], bank: Question[] = QUESTIONS): Question | null {
  const n = steps.length;
  if (n >= DIAGNOSTIC_LENGTH) return null;
  if (n < DIAGNOSTIC_OPENERS.length) return DIAGNOSTIC_OPENERS[n];

  const used = new Set(steps.map((s) => s.questionId));
  const tested = new Set(steps.map((s) => bank.find((q) => q.id === s.questionId)?.conceptId));
  const chapter = CHAPTERS[n % CHAPTERS.length].id;
  const lastStep = [...steps].reverse().find((s) => {
    const q = bank.find((x) => x.id === s.questionId);
    return q && chapterOf(q) === chapter;
  });
  const last = lastStep ? bank.find((q) => q.id === lastStep.questionId) : undefined;
  const fresh = bank.filter((q) => !used.has(q.id));

  if (last && lastStep) {
    const d = last.difficulty;
    const neighbours = lastStep.correct ? dependentsOf(last.conceptId).map((c) => c.id) : CONCEPT_BY_ID[last.conceptId].prereqs;
    const wanted = lastStep.correct ? d + 1 : d - 1;
    const fits = (q: Question) => (lastStep.correct ? q.difficulty >= d : q.difficulty <= d);
    const rank = (qs: Question[]) => [...qs].sort((a, b) => Math.abs(a.difficulty - wanted) - Math.abs(b.difficulty - wanted) || byId(a, b))[0];
    const tiers = [
      fresh.filter((q) => neighbours.includes(q.conceptId) && !tested.has(q.conceptId) && fits(q)),
      fresh.filter((q) => neighbours.includes(q.conceptId) && fits(q)),
      fresh.filter((q) => chapterOf(q) === chapter && !tested.has(q.conceptId) && fits(q)),
    ];
    for (const t of tiers) if (t.length) return rank(t);
  }
  const sameChapter = fresh.filter((q) => chapterOf(q) === chapter);
  const pool = sameChapter.filter((q) => !tested.has(q.conceptId));
  return [...(pool.length ? pool : sameChapter.length ? sameChapter : fresh)].sort((a, b) => Math.abs(a.difficulty - 2) - Math.abs(b.difficulty - 2) || byId(a, b))[0] ?? null;
}

export interface DiagnosticOutcome {
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  theta: number;
  misconceptions: string[];
  attempts: Attempt[];
}

/** Fold every answer through the normal attempt pipeline from a blank model, then estimate the untested concepts. */
export function finishDiagnostic(studentId: string, answers: GradedAnswer[], now: number): DiagnosticOutcome {
  let state: LearnerState = {
    studentId,
    mastery: Object.fromEntries(CONCEPTS.map((c) => [c.id, { p: BKT_DEFAULTS.pInit, estimated: true, suspect: false, history: [] }])),
    schedule: {},
    theta: INITIAL_THETA,
    misconceptions: [],
    attempts: [],
  };
  for (const a of answers) {
    const o = processAttempt(state, { ...a, mode: "diagnostic" });
    state = { ...state, mastery: o.mastery, schedule: o.schedule, theta: o.theta, misconceptions: o.misconceptions, attempts: [...state.attempts, o.attempt] };
  }
  const testedIds = new Set(answers.map((a) => a.question.conceptId));
  const tested = Object.fromEntries([...testedIds].map((id) => [id, state.mastery[id].p]));
  const inferred = inferUntested(tested, now);
  // Keep the measured concepts' full history; estimates replace everything else.
  const mastery = Object.fromEntries(CONCEPTS.map((c) => [c.id, testedIds.has(c.id) ? { ...state.mastery[c.id], estimated: false } : inferred[c.id]]));
  return { mastery, schedule: state.schedule, theta: Math.round(state.theta), misconceptions: state.misconceptions, attempts: state.attempts };
}
