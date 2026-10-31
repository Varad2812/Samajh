/**
 * 45-minute YouTube study plan: pick the weakest concepts, order them prerequisites-first, split the time
 * budget, and (offline) build YouTube search links. Pure: no fetch, no Date.now().
 */
import { z } from "zod";
import { CONCEPTS, type Concept } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { ConceptMastery } from "@/lib/types";

export const PLAN_MINUTES = 45;
export const MAX_TOPICS = 5;
const MIN_TOPIC_MINUTES = 6;
const WEAK_P = 0.6;

const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

// ───────────── Schemas ─────────────

export const studyTopicSchema = z.object({
  conceptId: z.string().refine((id) => id in CONCEPT_BY_ID, "unknown concept"),
  p: z.number().min(0).max(1),
  misconceptions: z.array(z.string()).max(10).default([]),
});
export type StudyTopicInput = z.infer<typeof studyTopicSchema>;

export const studyPlanRequestSchema = z.object({
  topics: z.array(studyTopicSchema).min(1).max(MAX_TOPICS),
  budgetMinutes: z.number().int().min(15).max(120).default(PLAN_MINUTES),
});
export type StudyPlanRequest = z.infer<typeof studyPlanRequestSchema>;

/** What Gemini must return (strict JSON). */
export const geminiPlanSchema = z.object({
  items: z
    .array(
      z.object({
        conceptId: z.string(),
        title: z.string().min(1).max(200),
        channel: z.string().max(100).default(""),
        url: z.string().max(300).default(""),
        minutes: z.number().min(1).max(60),
        why: z.string().max(300).default(""),
      }),
    )
    .min(1)
    .max(12),
});
export type GeminiPlan = z.infer<typeof geminiPlanSchema>;

export interface StudyVideo {
  id: string;
  conceptId: string;
  title: string;
  channel: string;
  minutes: number;
  why: string;
  /** Direct watch link when the video was verified to exist, else a YouTube search link. */
  url: string;
  videoId: string | null;
  done: boolean;
}

export interface StudyPlan {
  createdAt: number;
  /** "ai" = Gemini picked the videos; "offline" = deterministic search links. */
  source: "ai" | "offline";
  budgetMinutes: number;
  totalMinutes: number;
  topics: { conceptId: string; minutes: number; p: number }[];
  items: StudyVideo[];
}

// ───────────── Topic selection ─────────────

/** Weakest concepts first: low mastery, active misconceptions, exam weight. */
export function pickWeakTopics(
  mastery: Record<string, ConceptMastery>,
  activeMisconceptions: string[],
  max = MAX_TOPICS,
): StudyTopicInput[] {
  const mcByConcept: Record<string, string[]> = {};
  for (const id of activeMisconceptions) {
    const cid = MISCONCEPTION_BY_ID[id]?.conceptId;
    if (cid) (mcByConcept[cid] ??= []).push(id);
  }
  const score = (c: Concept) => {
    const m = mastery[c.id];
    const p = m?.p ?? 0.3;
    // Measured weakness beats an untested prior; misconceptions and exam weight push a concept up.
    return p - (mcByConcept[c.id]?.length ?? 0) * 0.25 - c.weight * 0.04 + (m?.estimated ? 0.15 : 0);
  };
  const ranked = [...CONCEPTS].sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id));
  const weak = ranked.filter((c) => (mastery[c.id]?.p ?? 0) < WEAK_P || mcByConcept[c.id]);
  return (weak.length ? weak : ranked).slice(0, max).map((c) => ({
    conceptId: c.id,
    p: mastery[c.id]?.p ?? 0.3,
    misconceptions: mcByConcept[c.id] ?? [],
  }));
}

function ancestors(id: string, seen = new Set<string>()): Set<string> {
  for (const pre of CONCEPT_BY_ID[id]?.prereqs ?? []) {
    if (!seen.has(pre)) {
      seen.add(pre);
      ancestors(pre, seen);
    }
  }
  return seen;
}

/** Prerequisites first; otherwise keep the weakness ranking. */
export function orderByPrereqs<T extends { conceptId: string }>(topics: T[]): T[] {
  const ids = new Set(topics.map((t) => t.conceptId));
  const placed = new Set<string>();
  const out: T[] = [];
  const pending = [...topics];
  while (pending.length) {
    const i = pending.findIndex((t) => [...ancestors(t.conceptId)].every((a) => !ids.has(a) || placed.has(a)));
    const [next] = pending.splice(Math.max(0, i), 1);
    placed.add(next.conceptId);
    out.push(next);
  }
  return out;
}

/** Split the budget in proportion to weakness; whole minutes that sum exactly to the budget. */
export function allocateMinutes(topics: StudyTopicInput[], budget = PLAN_MINUTES): number[] {
  if (!topics.length) return [];
  const need = topics.map((t) => 1 - t.p + 0.15 * t.misconceptions.length + 0.1);
  const spare = Math.max(0, budget - MIN_TOPIC_MINUTES * topics.length);
  const total = need.reduce((s, n) => s + n, 0);
  const raw = need.map((n) => MIN_TOPIC_MINUTES + (spare * n) / total);
  const mins = raw.map(Math.floor);
  let left = budget - mins.reduce((s, m) => s + m, 0);
  const byFraction = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of byFraction) {
    if (left <= 0) break;
    mins[i]++;
    left--;
  }
  return mins;
}

// ───────────── Links ─────────────

export const youtubeSearchUrl = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

/** 11-char video id from any common YouTube URL shape, else null. */
export function parseVideoId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  return m ? m[1] : null;
}

export const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

// ───────────── Plan assembly ─────────────

export const conceptName = (id: string) => CONCEPT_BY_ID[id]?.name ?? id;

/** Deterministic plan: one search per topic, split in two (concept + exam numericals) for long slots. */
export function offlinePlan(req: StudyPlanRequest, at: number): StudyPlan {
  const topics = orderByPrereqs(req.topics);
  const minutes = allocateMinutes(topics, req.budgetMinutes);
  const items: StudyVideo[] = topics.flatMap((t, i) => {
    const name = conceptName(t.conceptId);
    const mcs = t.misconceptions.map((id) => MISCONCEPTION_BY_ID[id]?.label).filter(Boolean);
    const why = mcs.length ? `Clears up: ${mcs.join(", ")}.` : `Mastery ${Math.round(t.p * 100)}%: rebuild the core idea.`;
    const base = { conceptId: t.conceptId, channel: "YouTube search", videoId: null, done: false };
    if (minutes[i] < 14) {
      return [{ ...base, id: `${t.conceptId}-0`, title: `${name}: Class 10 explanation`, minutes: minutes[i], why, url: youtubeSearchUrl(`${name} class 10 physics CBSE`) }];
    }
    const first = Math.ceil(minutes[i] * 0.6);
    return [
      { ...base, id: `${t.conceptId}-0`, title: `${name}: concept explained`, minutes: first, why, url: youtubeSearchUrl(`${name} class 10 physics CBSE explanation`) },
      { ...base, id: `${t.conceptId}-1`, title: `${name}: board exam questions`, minutes: minutes[i] - first, why: "Practise the exam-style questions.", url: youtubeSearchUrl(`${name} class 10 numericals PYQ`) },
    ];
  });
  return finishPlan(req, topics, minutes, items, at, "offline");
}

/**
 * Clean a model plan: drop unknown concepts, follow the topic order, cap each topic at its slot and the
 * whole plan at the budget. Links are resolved by the caller (verified watch link or search link).
 */
export function shapeModelPlan(req: StudyPlanRequest, plan: GeminiPlan, at: number): StudyPlan | null {
  const topics = orderByPrereqs(req.topics);
  const minutes = allocateMinutes(topics, req.budgetMinutes);
  const items: StudyVideo[] = [];
  topics.forEach((t, i) => {
    let left = minutes[i];
    plan.items
      .filter((v) => v.conceptId === t.conceptId)
      .forEach((v, j) => {
        if (left < 3) return;
        const m = Math.min(left, Math.max(3, Math.round(v.minutes)));
        left -= m;
        const videoId = parseVideoId(v.url);
        items.push({
          id: `${t.conceptId}-${j}`,
          conceptId: t.conceptId,
          title: v.title,
          channel: v.channel,
          minutes: m,
          why: v.why,
          url: videoId ? watchUrl(videoId) : youtubeSearchUrl(`${v.title} ${v.channel}`.trim()),
          videoId,
          done: false,
        });
      });
  });
  // A plan that skips most topics is worse than the deterministic one.
  const covered = new Set(items.map((v) => v.conceptId)).size;
  if (covered < Math.ceil(topics.length / 2)) return null;
  return finishPlan(req, topics, minutes, items, at, "ai");
}

function finishPlan(
  req: StudyPlanRequest,
  topics: StudyTopicInput[],
  minutes: number[],
  items: StudyVideo[],
  at: number,
  source: StudyPlan["source"],
): StudyPlan {
  return {
    createdAt: at,
    source,
    budgetMinutes: req.budgetMinutes,
    totalMinutes: items.reduce((s, v) => s + v.minutes, 0),
    topics: topics.map((t, i) => ({ conceptId: t.conceptId, minutes: minutes[i], p: t.p })),
    items,
  };
}

/** Prompt text for Gemini. */
export function studyPlanPrompt(req: StudyPlanRequest): { system: string; user: string } {
  const topics = orderByPrereqs(req.topics);
  const minutes = allocateMinutes(topics, req.budgetMinutes);
  const lines = topics.map((t, i) => {
    const c = CONCEPT_BY_ID[t.conceptId];
    const mcs = t.misconceptions.map((id) => MISCONCEPTION_BY_ID[id]).filter(Boolean);
    const mcText = mcs.length ? ` Misconceptions to fix: ${mcs.map((m) => `"${m.wrongBelief}"`).join("; ")}.` : "";
    return `${i + 1}. [${c.id}] ${c.name} (mastery ${Math.round(t.p * 100)}%, ${minutes[i]} min). ${c.summary}${mcText}`;
  });
  return {
    system:
      "You build YouTube study playlists for Indian CBSE Class 10 Physics students. Use Google Search to find REAL, " +
      "currently available YouTube videos (prefer well-known channels such as Physics Wallah, Magnet Brains, Vedantu, " +
      "Khan Academy India, LearnoHub, BYJU'S). Never invent a URL: if you are not sure a video exists, set url to an " +
      'empty string. Reply with strict JSON only, no prose: {"items":[{"conceptId","title","channel","url","minutes","why"}]}.',
    user:
      `Make a ${req.budgetMinutes}-minute plan. Keep the topics in this order (prerequisites come first) and keep each ` +
      `topic within its minutes. Use 1-2 videos per topic; "minutes" is how long to watch (a section of a longer video is fine; ` +
      `say which part in "why"). "why" is one short sentence linking the video to the student's weakness.\n\n${lines.join("\n")}`,
  };
}
