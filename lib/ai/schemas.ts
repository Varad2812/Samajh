/** Zod schemas for every AI route: request bodies and the strict JSON the model must return (PROJECT.md §6). */
import { z } from "zod";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const readingSchema = z.object({ latex: z.string(), mathjs: z.string() });
export type Reading = z.infer<typeof readingSchema>;

export const normalizedTermSchema = z.object({ heard: z.string().min(1), meant: z.string().min(1) });
export type NormalizedTerm = z.infer<typeof normalizedTermSchema>;

export const verdictSchema = z.enum(["correct_sound", "correct_flawed", "incorrect"]);

// ───────────── /api/analyze-reasoning ─────────────

export const misconceptionInputSchema = z.object({
  id: z.string(),
  conceptId: z.string(),
  label: z.string(),
  wrongBelief: z.string(),
  correctIdea: z.string(),
  cues: z.array(z.string()).default([]),
});

export const optionIndexSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const analyzeRequestSchema = z.object({
  question: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  selectedIndex: optionIndexSchema,
  correctIndex: optionIndexSchema,
  conceptId: z.string().min(1),
  rawTranscript: z.string().max(4000),
  candidateMisconceptions: z.array(misconceptionInputSchema).max(20).default([]),
  /** Lets the offline analyzer reuse the seeded explanation. */
  questionId: z.string().optional(),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const equationAISchema = z.object({
  spoken: z.string(),
  latex: z.string(),
  mathjs: z.string().default(""),
  meaning: z.string().default(""),
  /** Other plausible groupings of the same speech (§5.5). */
  alternatives: z.array(readingSchema).max(4).default([]),
  /** A result the student said aloud after the expression, if any (extracted, never computed by the model). */
  spokenResult: z.number().nullable().default(null),
});
export type EquationAI = z.infer<typeof equationAISchema>;

export const analysisAISchema = z.object({
  cleanedReasoning: z.string(),
  claims: z.array(z.string()).default([]),
  finalAnswerStated: z.string().nullable().default(null),
  selfCorrections: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
  hedges: z.array(z.string()).default([]),
  fillers: z.array(z.string()).default([]),
  confidence: z.number().transform(clamp01),
  verdict: verdictSchema,
  misconception: z
    .object({
      id: z.string().nullable().default(null),
      novelDescription: z.string().nullable().default(null),
      evidenceQuote: z.string(),
    })
    .nullable()
    .default(null),
  feedback: z.string().min(1),
  equations: z.array(equationAISchema).max(8).default([]),
  normalizedTerms: z.array(normalizedTermSchema).max(24).default([]),
  /** Right relation, wrong arithmetic → feedback says "calculation slip" and BKT weight is halved (§5.5). */
  calculationSlip: z.boolean().default(false),
});
export type AnalysisAI = z.infer<typeof analysisAISchema>;

/** An equation after code has evaluated every reading with math.js. */
export interface EvaluatedEquation extends EquationAI {
  /** Value of [primary, ...alternatives]; null when a reading has free variables or cannot be evaluated. */
  values: (number | null)[];
  /** Index into [primary, ...alternatives] that matches the spoken result (±2%), or the only reading; null → ask "A or B?". */
  pickedIndex: number | null;
  needsChoice: boolean;
}

export interface ConfidenceDetail {
  baseline: number;
  selfCorrections: number;
  hedges: number;
  fillers: number;
  fillerRate: number;
  reasons: string[];
}

export interface AnalysisResult extends Omit<AnalysisAI, "equations"> {
  /** Final confidence: 0.6·AI + 0.4·baseline when the AI answered, else the baseline (§5.1). */
  confidence: number;
  confidenceDetail: ConfidenceDetail;
  equations: EvaluatedEquation[];
}

// ───────────── /api/generate-question ─────────────

export const generateQuestionRequestSchema = z.object({
  conceptId: z.string().min(1),
  conceptName: z.string().min(1),
  targetDifficulty: z.number().int().min(1).max(5),
  misconceptionId: z.string().optional(),
  avoidStems: z.array(z.string()).max(50).default([]),
});
export type GenerateQuestionRequest = z.infer<typeof generateQuestionRequestSchema>;

export const questionAISchema = z.object({
  stem: z.string().min(10),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctIndex: optionIndexSchema,
  explanation: z.string().min(10),
  /** Option index (as a string key) → misconception id a student holding that belief would pick. */
  distractorMisconceptions: z.record(z.string(), z.string()).optional(),
  /** Self-check for numericals: a math.js expression and the answer the model claims. Verified in code. */
  check: z.object({ mathjs: z.string(), answer: z.number() }).optional(),
});
export type QuestionAI = z.infer<typeof questionAISchema>;

// ───────────── /api/remedial-worksheet ─────────────

export const classStatsSchema = z
  .object({
    classSize: z.number().int().min(0).optional(),
    /** Misconception id → % of the class holding it. */
    affectedPct: z.record(z.string(), z.number().min(0).max(100)).optional(),
    avgMastery: z.number().min(0).max(1).optional(),
    weakCount: z.number().int().min(0).optional(),
  })
  .default({});

export const worksheetRequestSchema = z.object({
  conceptId: z.string().min(1),
  misconceptionIds: z.array(z.string()).max(10).default([]),
  classStats: classStatsSchema,
});
export type WorksheetRequest = z.infer<typeof worksheetRequestSchema>;

export const worksheetSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        items: z.array(z.object({ q: z.string().min(1), answer: z.string().min(1) })).min(1).max(8),
      }),
    )
    .min(1)
    .max(6),
  teacherNotes: z.string().min(1),
});
export type Worksheet = z.infer<typeof worksheetSchema>;

// ───────────── Envelope every route returns ─────────────

export type AiSource = "ai" | "offline";
export interface AiEnvelope<T> {
  source: AiSource;
  /** Why the offline fallback ran (no-key, timeout, invalid-json, …). */
  reason?: string;
  data: T;
}
