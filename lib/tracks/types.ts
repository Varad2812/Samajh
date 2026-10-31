/** Custom tests: a student's own subject, standard and syllabus → topic graph + question set (any subject). */
import { z } from "zod";
import type { GraphConcept } from "@/lib/galaxy/graph";
import type { OptionIndex } from "@/lib/data/questions";

export const DIFFICULTY_MODES = ["easy", "mixed", "hard"] as const;
export type DifficultyMode = (typeof DIFFICULTY_MODES)[number];

export const customTestRequestSchema = z.object({
  subject: z.string().trim().min(2).max(60),
  standard: z.string().trim().min(1).max(40),
  board: z.string().trim().max(60).default(""),
  /** What the student wants to study: chapters, topics, or pasted syllabus text. */
  syllabus: z.string().trim().min(3).max(2000),
  count: z.number().int().min(6).max(20).default(12),
  difficulty: z.enum(DIFFICULTY_MODES).default("mixed"),
});
export type CustomTestRequest = z.infer<typeof customTestRequestSchema>;

const weight = z.coerce.number().transform((n) => (n >= 3 ? 3 : n <= 1 ? 1 : 2) as 1 | 2 | 3);
const optionIndex = z.coerce.number().int().min(0).max(3);

/** Strict JSON the model must return. */
export const trackAISchema = z.object({
  title: z.string().min(1).max(120),
  units: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(80), short: z.string().max(24).default("") })).min(1).max(6),
  topics: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(90),
        unit: z.string().min(1),
        prereqs: z.array(z.string()).default([]),
        weight: weight.default(2),
        summary: z.string().max(300).default(""),
      }),
    )
    .min(2)
    .max(18),
  questions: z
    .array(
      z.object({
        topicId: z.string().min(1),
        difficulty: z.coerce.number().int().min(1).max(5).default(3),
        stem: z.string().min(5).max(600),
        options: z.array(z.string().min(1).max(200)).length(4),
        correctIndex: optionIndex,
        explanation: z.string().min(1).max(700),
        /** Why a student might pick each option (the misconception behind it); "" for the correct one. */
        distractorWhy: z.array(z.string().max(300)).default([]),
      }),
    )
    .min(3)
    .max(24),
});
export type TrackAI = z.infer<typeof trackAISchema>;

export interface TrackUnit {
  id: string;
  name: string;
  short: string;
}

export interface TrackQuestion {
  id: string;
  topicId: string;
  difficulty: number;
  stem: string;
  options: [string, string, string, string];
  correctIndex: OptionIndex;
  explanation: string;
  distractorWhy: [string, string, string, string];
}

export interface CustomTrack {
  id: string;
  createdAt: number;
  source: "ai" | "offline";
  subject: string;
  standard: string;
  board: string;
  syllabus: string;
  title: string;
  units: TrackUnit[];
  topics: GraphConcept[];
  questions: TrackQuestion[];
}

export interface TrackAnswer {
  questionId: string;
  /** null = skipped. */
  selectedIndex: OptionIndex | null;
  correct: boolean;
  /** What the student said or typed about why (optional). */
  reasoning: string;
  confidence: number;
  ms: number;
}

export interface TopicScore {
  p: number;
  tested: boolean;
  attempts: number;
  correct: number;
}

export interface TrackResult {
  trackId: string;
  startedAt: number;
  finishedAt: number;
  answers: TrackAnswer[];
  topics: Record<string, TopicScore>;
}
