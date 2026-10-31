/**
 * Elo ability / difficulty calibration (PROJECT.md §5.3).
 */
import type { Verdict } from "@/lib/types";

export const INITIAL_THETA = 1100;
export const K_STUDENT = 32;
export const K_QUESTION = 16;
export const TARGET_SUCCESS = 0.7;

/** P(correct) for ability θ against difficulty d. */
export function expectedScore(theta: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (difficulty - theta) / 400));
}

export function outcomeOf(verdict: Verdict): number {
  return verdict === "correct_sound" ? 1 : verdict === "correct_flawed" ? 0.6 : 0;
}

export interface EloUpdate {
  theta: number;
  difficulty: number;
  expected: number;
  outcome: number;
}

export function eloUpdate(theta: number, difficulty: number, verdict: Verdict): EloUpdate {
  const expected = expectedScore(theta, difficulty);
  const outcome = outcomeOf(verdict);
  return {
    theta: theta + K_STUDENT * (outcome - expected),
    difficulty: difficulty - K_QUESTION * (outcome - expected),
    expected,
    outcome,
  };
}

/** Difficulty giving the target success rate: d = θ + 400·log10(1/p − 1) (≈ θ − 147 for p = 0.7). */
export function targetDifficulty(theta: number, success = TARGET_SUCCESS): number {
  return theta + 400 * Math.log10(1 / success - 1);
}
