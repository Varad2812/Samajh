import type { OptionIndex } from "@/lib/data/questions";

export type Verdict = "correct_sound" | "correct_flawed" | "incorrect";

export type MasteryBand = "weak" | "developing" | "proficient" | "mastered";

export interface MasteryPoint {
  at: number;
  p: number;
}

/** Learner-model state for one concept. */
export interface ConceptMastery {
  /** P(known), 0..1. */
  p: number;
  /** True when inferred from neighbours rather than measured. */
  estimated: boolean;
  /** Flagged by prerequisite propagation after a wrong answer downstream. */
  suspect: boolean;
  history: MasteryPoint[];
}

/** SM-2 state for one concept. */
export interface ReviewItem {
  ef: number;
  /** Days. */
  interval: number;
  repetition: number;
  due: number;
  lastReviewed: number | null;
}

export interface Attempt {
  id: string;
  studentId: string;
  questionId: string;
  conceptId: string;
  selectedIndex: OptionIndex;
  correct: boolean;
  verdict: Verdict;
  confidence: number;
  misconceptionId: string | null;
  rawTranscript?: string;
  masteryBefore?: number;
  masteryAfter?: number;
  at: number;
  mode?: AttemptMode;
  cleanedReasoning?: string;
  /** "Did you mean" corrections the student made before grading (PROJECT.md §5.5). */
  edits?: AttemptEdit[];
}

export type AttemptMode = "practice" | "review" | "diagnostic";

export interface AttemptEdit {
  kind: "equation" | "term" | "reading";
  /** What the analyzer proposed (LaTeX, a term, or the reading index as a string). */
  from: string;
  to: string;
}

export type StudentProfileKind = "strong" | "average" | "struggling";

export interface StudentRecord {
  id: string;
  name: string;
  profile: StudentProfileKind;
  /** Elo ability. */
  theta: number;
  mastery: Record<string, ConceptMastery>;
  /** Active misconception ids. */
  misconceptions: string[];
  attempts: Attempt[];
  schedule: Record<string, ReviewItem>;
}
