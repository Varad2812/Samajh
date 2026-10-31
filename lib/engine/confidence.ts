/**
 * Confidence from messy spoken reasoning (PROJECT.md §5.1).
 * Deterministic baseline from self-corrections, hedges and fillers, optionally blended with the AI's estimate.
 */

export const NEUTRAL_CONFIDENCE = 0.6;

export const SELF_CORRECTION_MARKERS = ["no wait", "wait no", "i mean", "actually", "sorry", "no no"];
export const HEDGE_MARKERS = ["i think", "maybe", "probably", "not sure", "i guess", "kind of"];
export const FILLER_MARKERS = ["umm", "um", "uh", "like", "basically", "you know", "so yeah"];

export interface ConfidenceInput {
  rawTranscript: string;
  /** The spoken final answer differs from the tapped option. */
  answerMismatch?: boolean;
  /** Extra self-corrections not visible as markers (e.g. the AI saw the answer change mid-speech). */
  extraSelfCorrections?: number;
  /** AI-estimated confidence 0..1, when available. */
  aiConfidence?: number | null;
}

export interface ConfidenceResult {
  /** Final confidence (blended when the AI value is present). */
  value: number;
  baseline: number;
  selfCorrections: number;
  hedges: number;
  fillers: number;
  wordCount: number;
  /** Fillers per 10 words. */
  fillerRate: number;
  answerMismatch: boolean;
  reasons: string[];
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Lower-case, strip punctuation (keep apostrophes), collapse whitespace. */
export function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Count whole-phrase occurrences of each marker in normalized text. */
export function countMarkers(normalized: string, markers: readonly string[]): number {
  if (!normalized) return 0;
  return markers.reduce((n, m) => n + (normalized.match(new RegExp(`(?:^|\\s)${escape(m)}(?=\\s|$)`, "g"))?.length ?? 0), 0);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function scoreConfidence(input: ConfidenceInput): ConfidenceResult {
  const text = normalizeSpeech(input.rawTranscript);
  const words = text ? text.split(" ").length : 0;
  const answerMismatch = input.answerMismatch ?? false;

  if (words === 0) {
    return {
      value: NEUTRAL_CONFIDENCE, baseline: NEUTRAL_CONFIDENCE, selfCorrections: 0, hedges: 0, fillers: 0,
      wordCount: 0, fillerRate: 0, answerMismatch, reasons: ["No reasoning given (neutral)"],
    };
  }

  const selfCorrections = countMarkers(text, SELF_CORRECTION_MARKERS) + (input.extraSelfCorrections ?? 0);
  const hedges = countMarkers(text, HEDGE_MARKERS);
  const fillers = countMarkers(text, FILLER_MARKERS);
  const fillerRate = (fillers / words) * 10;

  const baseline = clamp(
    1 - 0.15 * selfCorrections - 0.08 * hedges - 0.04 * fillerRate - 0.3 * (answerMismatch ? 1 : 0),
    0.1,
    1,
  );
  const ai = input.aiConfidence;
  const value = ai === null || ai === undefined ? baseline : clamp(0.6 * clamp(ai, 0, 1) + 0.4 * baseline, 0, 1);

  const reasons: string[] = [];
  if (selfCorrections) reasons.push(plural(selfCorrections, "self-correction"));
  if (hedges) reasons.push(plural(hedges, "hedge"));
  if (fillers) reasons.push(`${plural(fillers, "filler")} (${fillerRate.toFixed(1)}/10 words)`);
  if (answerMismatch) reasons.push("Spoken answer differs from the selected option");
  if (reasons.length === 0) reasons.push("Clear, direct reasoning");

  return { value, baseline, selfCorrections, hedges, fillers, wordCount: words, fillerRate, answerMismatch, reasons };
}
