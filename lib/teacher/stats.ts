/** Class X-ray aggregates (PROJECT.md §4.5). Pure: every number on the teacher page comes from here. */
import { CHAPTERS, CONCEPTS, type Chapter } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID, MISCONCEPTIONS } from "@/lib/data/misconceptions";
import { rootCauseOf } from "@/lib/engine/rootCause";
import { dueConceptIds } from "@/lib/engine/sm2";
import type { ConceptMastery, StudentRecord } from "@/lib/types";

export const AT_RISK_BELOW = 0.4;
export const WEAK_BELOW = 0.4;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const studentMean = (s: StudentRecord): number => mean(CONCEPTS.map((c) => s.mastery[c.id].p));

export const chapterMean = (s: StudentRecord, ch: Chapter): number =>
  mean(CONCEPTS.filter((c) => c.chapter === ch).map((c) => s.mastery[c.id].p));

/** Concept → class mean mastery. */
export function conceptMeans(roster: StudentRecord[]): Record<string, number> {
  return Object.fromEntries(CONCEPTS.map((c) => [c.id, mean(roster.map((s) => s.mastery[c.id].p))]));
}

export interface MisconceptionStat {
  id: string;
  count: number;
  rate: number;
}

/** Misconceptions held by at least one student, most common first. */
export function misconceptionStats(roster: StudentRecord[]): MisconceptionStat[] {
  return MISCONCEPTIONS.map((m) => {
    const count = roster.filter((s) => s.misconceptions.includes(m.id)).length;
    return { id: m.id, count, rate: roster.length ? count / roster.length : 0 };
  })
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

export interface WeakConcept {
  conceptId: string;
  mean: number;
  /** Students below WEAK_BELOW on this concept. */
  weakCount: number;
  /** Deepest likely prerequisite cause, traced on the class-mean learner model. */
  rootCause: string | null;
  /** Catalogued misconceptions on this concept that students hold, with how many. */
  misconceptions: MisconceptionStat[];
}

/** Class-mean mastery as a learner model, so the engine's root-cause tracing works at class level. */
function classModel(roster: StudentRecord[]): Record<string, ConceptMastery> {
  const means = conceptMeans(roster);
  return Object.fromEntries(CONCEPTS.map((c) => [c.id, { p: means[c.id], estimated: false, suspect: false, history: [] }]));
}

export function weakestConcepts(roster: StudentRecord[], limit = 8): WeakConcept[] {
  const model = classModel(roster);
  const mcs = misconceptionStats(roster);
  return CONCEPTS.map((c) => ({
    conceptId: c.id,
    mean: model[c.id].p,
    weakCount: roster.filter((s) => s.mastery[c.id].p < WEAK_BELOW).length,
    rootCause: rootCauseOf(model, c.id),
    misconceptions: mcs.filter((m) => MISCONCEPTION_BY_ID[m.id].conceptId === c.id),
  }))
    .sort((a, b) => a.mean - b.mean || a.conceptId.localeCompare(b.conceptId))
    .slice(0, limit);
}

export interface Kpis {
  classMean: number;
  /** Change vs the class mean 7 days earlier, from each concept's history. */
  trend: number;
  atRisk: number;
  size: number;
  topMisconception: MisconceptionStat | null;
  overdue: number;
  overdueStudents: number;
}

/** Concept mastery as of time t: last history point at or before t (else the first known point). */
function pAt(m: ConceptMastery, t: number): number {
  let p = m.history[0]?.p ?? m.p;
  for (const h of m.history) if (h.at <= t) p = h.p;
  return p;
}

export function kpis(roster: StudentRecord[], at: number): Kpis {
  const week = at - 7 * 86_400_000;
  const classMean = mean(roster.map(studentMean));
  const before = mean(roster.map((s) => mean(CONCEPTS.map((c) => pAt(s.mastery[c.id], week)))));
  const overdueEach = roster.map((s) => dueConceptIds(s.schedule, at).length);
  return {
    classMean,
    trend: classMean - before,
    atRisk: roster.filter((s) => studentMean(s) < AT_RISK_BELOW).length,
    size: roster.length,
    topMisconception: misconceptionStats(roster)[0] ?? null,
    overdue: overdueEach.reduce((a, b) => a + b, 0),
    overdueStudents: overdueEach.filter((n) => n > 0).length,
  };
}

/** Class mean at evenly spaced times ending at `at` (for the KPI sparkline). */
export function classTrend(roster: StudentRecord[], at: number, points = 8, spanDays = 21): number[] {
  return Array.from({ length: points }, (_, i) => {
    const t = at - ((points - 1 - i) / (points - 1)) * spanDays * 86_400_000;
    return mean(roster.map((s) => mean(CONCEPTS.map((c) => pAt(s.mastery[c.id], t)))));
  });
}

/** Concept → share of students holding at least one misconception that lives on it (Constellation pillar height). */
export function misconceptionShareByConcept(roster: StudentRecord[]): Record<string, number> {
  return Object.fromEntries(
    CONCEPTS.map((c) => [
      c.id,
      roster.length ? roster.filter((s) => s.misconceptions.some((id) => MISCONCEPTION_BY_ID[id]?.conceptId === c.id)).length / roster.length : 0,
    ]),
  );
}

/** Concepts with the most misconception holders: where the Constellation's storm clouds gather. */
export function stormConcepts(roster: StudentRecord[], limit = 3, minShare = 0.15): string[] {
  const share = misconceptionShareByConcept(roster);
  return Object.entries(share)
    .filter(([, v]) => v >= minShare)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);
}

export type SortKey = "name" | "mean" | "misconceptions" | `chapter:${Chapter}` | `concept:${string}`;

/** Heatmap row order. Mastery sorts put the weakest first. */
export function sortRoster(roster: StudentRecord[], key: SortKey): StudentRecord[] {
  const value = (s: StudentRecord): number => {
    if (key === "mean") return studentMean(s);
    if (key === "misconceptions") return -s.misconceptions.length;
    if (key.startsWith("chapter:")) return chapterMean(s, key.slice(8) as Chapter);
    if (key.startsWith("concept:")) return s.mastery[key.slice(8)]?.p ?? 0;
    return 0;
  };
  const out = [...roster];
  if (key === "name") return out.sort((a, b) => a.name.localeCompare(b.name));
  return out.sort((a, b) => value(a) - value(b) || a.name.localeCompare(b.name));
}

/** Students holding a misconception (all students when `mcId` is null). */
export const filterByMisconception = (roster: StudentRecord[], mcId: string | null): StudentRecord[] =>
  mcId ? roster.filter((s) => s.misconceptions.includes(mcId)) : roster;

export const CHAPTER_LIST = CHAPTERS;
