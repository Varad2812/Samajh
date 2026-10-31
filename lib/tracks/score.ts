/** Score a custom test: BKT per topic from the answers, untested topics estimated from their prerequisites. Pure. */
import { BKT_DEFAULTS, bktUpdate, ESTIMATE_FACTOR } from "@/lib/engine/bkt";
import { NEUTRAL_CONFIDENCE, scoreConfidence } from "@/lib/engine/confidence";
import type { GalaxyNodes } from "@/lib/galaxy/nodes";
import type { CustomTrack, TopicScore, TrackAnswer, TrackQuestion, TrackResult } from "./types";

/** Confidence from the spoken/typed reason (neutral when the student said nothing). */
export const reasoningConfidence = (reasoning: string): number =>
  reasoning.trim() ? scoreConfidence({ rawTranscript: reasoning }).value : NEUTRAL_CONFIDENCE;

export function makeAnswer(q: TrackQuestion, selectedIndex: TrackAnswer["selectedIndex"], reasoning: string, ms: number): TrackAnswer {
  return { questionId: q.id, selectedIndex, correct: selectedIndex === q.correctIndex, reasoning: reasoning.trim(), confidence: reasoningConfidence(reasoning), ms };
}

export function scoreTrack(track: CustomTrack, answers: TrackAnswer[], startedAt: number, finishedAt: number): TrackResult {
  const qById = Object.fromEntries(track.questions.map((q) => [q.id, q]));
  const topics: Record<string, TopicScore> = Object.fromEntries(
    track.topics.map((t) => [t.id, { p: BKT_DEFAULTS.pInit, tested: false, attempts: 0, correct: 0 }]),
  );
  for (const a of answers) {
    const q = qById[a.questionId];
    const s = q && topics[q.topicId];
    if (!s) continue;
    // A correct tap with a shaky explanation counts as weaker evidence; a skip counts as wrong.
    const verdict = !a.correct ? "incorrect" : a.reasoning && a.confidence < 0.45 ? "correct_flawed" : "correct_sound";
    s.p = bktUpdate(s.p, verdict, a.confidence);
    s.tested = true;
    s.attempts++;
    if (a.correct) s.correct++;
  }
  // Untested topics inherit a discounted estimate from their tested prerequisites (topics are in teaching order).
  for (const t of track.topics) {
    const s = topics[t.id];
    if (s.tested) continue;
    const pre = t.prereqs.map((p) => topics[p]).filter((x) => x?.tested);
    if (pre.length) s.p = (pre.reduce((sum, x) => sum + x.p, 0) / pre.length) * ESTIMATE_FACTOR;
  }
  return { trackId: track.id, startedAt, finishedAt, answers, topics };
}

/** Galaxy render state for a track: wrong answers orbit their topic like misconceptions do. */
export function trackNodes(track: CustomTrack, result: TrackResult | null): GalaxyNodes {
  const wrong: Record<string, number> = {};
  if (result) {
    const qById = Object.fromEntries(track.questions.map((q) => [q.id, q]));
    for (const a of result.answers) if (!a.correct && qById[a.questionId]) wrong[qById[a.questionId].topicId] = (wrong[qById[a.questionId].topicId] ?? 0) + 1;
  }
  return Object.fromEntries(
    track.topics.map((t) => {
      const s = result?.topics[t.id];
      return [t.id, { p: s?.p ?? BKT_DEFAULTS.pInit, estimated: !s?.tested, due: false, misconceptions: Math.min(3, wrong[t.id] ?? 0) }];
    }),
  );
}

export interface Mistake {
  question: TrackQuestion;
  answer: TrackAnswer;
  topicName: string;
}

export function mistakesOf(track: CustomTrack, result: TrackResult): Mistake[] {
  const names = Object.fromEntries(track.topics.map((t) => [t.id, t.name]));
  const answerByQ = Object.fromEntries(result.answers.map((a) => [a.questionId, a]));
  return track.questions
    .filter((q) => answerByQ[q.id] && !answerByQ[q.id].correct)
    .map((q) => ({ question: q, answer: answerByQ[q.id], topicName: names[q.topicId] ?? q.topicId }));
}

export function summary(result: TrackResult) {
  const n = result.answers.length;
  const correct = result.answers.filter((a) => a.correct).length;
  const spoken = result.answers.filter((a) => a.reasoning);
  return {
    total: n,
    correct,
    accuracy: n ? correct / n : 0,
    skipped: result.answers.filter((a) => a.selectedIndex === null).length,
    avgConfidence: spoken.length ? spoken.reduce((s, a) => s + a.confidence, 0) / spoken.length : null,
    minutes: Math.max(1, Math.round((result.finishedAt - result.startedAt) / 60_000)),
  };
}
