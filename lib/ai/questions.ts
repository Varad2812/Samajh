/** generate-question: validate/convert the model's question, and the offline "nearest seeded question" fallback. */
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { difficultyToElo, QUESTIONS, type Difficulty, type OptionIndex, type Question } from "@/lib/data/questions";
import { evaluateExpression, relativelyClose } from "@/lib/engine/mathEval";
import type { GenerateQuestionRequest, QuestionAI } from "./schemas";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function similarity(a: string, b: string): number {
  const x = new Set(norm(a).split(" "));
  const y = new Set(norm(b).split(" "));
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.max(1, Math.min(x.size, y.size));
}

const plainNumbers = (s: string): number[] => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

/** A rejection message, or null when the model's question is acceptable. Numbers are re-checked with math.js. */
export function checkGeneratedQuestion(q: QuestionAI, req: GenerateQuestionRequest): string | null {
  const opts = q.options.map(norm);
  if (new Set(opts).size !== 4) return "duplicate-options";
  if (req.avoidStems.some((s) => similarity(s, q.stem) >= 0.85)) return "repeats-avoided-stem";
  for (const [key, id] of Object.entries(q.distractorMisconceptions ?? {})) {
    if (!["0", "1", "2", "3"].includes(key) || Number(key) === q.correctIndex || !MISCONCEPTION_BY_ID[id]) return "bad-distractor-map";
  }
  if (q.check) {
    const v = evaluateExpression(q.check.mathjs);
    if (v === null || !relativelyClose(v, q.check.answer, 0.01)) return "numeric-self-check-failed";
    const correctNums = plainNumbers(q.options[q.correctIndex]);
    if (correctNums.length && !correctNums.some((n) => relativelyClose(n, v, 0.01))) return "correct-option-disagrees-with-check";
  }
  return null;
}

export function toQuestion(q: QuestionAI, req: GenerateQuestionRequest): Question {
  const difficulty = req.targetDifficulty as Difficulty;
  const map: Partial<Record<OptionIndex, string>> = {};
  for (const [k, id] of Object.entries(q.distractorMisconceptions ?? {})) map[Number(k) as OptionIndex] = id;
  return {
    id: `AI-${req.conceptId}-${Math.random().toString(36).slice(2, 8)}`,
    conceptId: req.conceptId,
    stem: q.stem.trim(),
    options: q.options.map((o) => o.trim()) as Question["options"],
    correctIndex: q.correctIndex,
    difficulty,
    elo: difficultyToElo(difficulty),
    explanation: q.explanation.trim(),
    distractorMisconceptions: Object.keys(map).length ? map : undefined,
    source: "ai",
  };
}

/** Nearest seeded question: same concept, closest Elo, preferring one that targets the misconception. */
export function offlineQuestion(req: GenerateQuestionRequest): Question {
  const avoid = new Set(req.avoidStems.map(norm));
  const own = QUESTIONS.filter((q) => q.conceptId === req.conceptId);
  const chapter = CONCEPT_BY_ID[req.conceptId]?.chapter;
  const sameChapter = QUESTIONS.filter((q) => CONCEPT_BY_ID[q.conceptId]?.chapter === chapter);
  const tiers = [own, sameChapter, QUESTIONS];
  const target = difficultyToElo(req.targetDifficulty as Difficulty);
  for (const tier of tiers) {
    const fresh = tier.filter((q) => !avoid.has(norm(q.stem)));
    // Everything in this concept already used → better a repeat of the right concept than a wrong-concept question.
    const pool = fresh.length ? fresh : tier === own && own.length ? own : [];
    if (!pool.length) continue;
    const score = (q: Question) =>
      Math.abs(q.elo - target) - (req.misconceptionId && Object.values(q.distractorMisconceptions ?? {}).includes(req.misconceptionId) ? 400 : 0);
    return [...pool].sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id))[0];
  }
  return QUESTIONS[0];
}
