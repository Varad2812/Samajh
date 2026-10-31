import { addDays, DAY_MS, startOfDay } from "@/lib/clock";
import { gaussian, mulberry32, pick, randInt, type Rng } from "@/lib/rng";
import type {
  Attempt,
  ConceptMastery,
  ReviewItem,
  StudentProfileKind,
  StudentRecord,
  Verdict,
} from "@/lib/types";
import { CONCEPTS, type Chapter } from "./concepts";
import { MISCONCEPTION_BY_ID, MISCONCEPTIONS } from "./misconceptions";
import { questionsFor, type OptionIndex } from "./questions";

export const CLASS_SEED = 42;
export const TEACHER_NAME = "Ms. Kulkarni";
export const DEMO_STUDENT_ID = "aarav";

const NAMES = [
  "Ananya Sharma", "Vihaan Gupta", "Diya Patel", "Arjun Nair", "Saanvi Iyer", "Reyansh Reddy",
  "Ishita Joshi", "Kabir Mehta", "Myra Kapoor", "Aditya Rao", "Kiara Desai", "Vivaan Singh",
  "Anika Bose", "Rohan Pillai", "Meera Chatterjee", "Krish Malhotra", "Tara Menon", "Dhruv Agarwal",
  "Riya Banerjee", "Aryan Kulkarni", "Navya Hegde", "Shaurya Verma", "Pari Saxena", "Ayaan Khan",
  "Avni Mishra", "Ishaan Trivedi", "Sara Fernandes", "Yash Deshpande", "Nisha Bhat", "Laksh Choudhary",
];

const PROFILE_BASE: Record<StudentProfileKind, number> = { strong: 0.76, average: 0.52, struggling: 0.3 };
const PROFILE_THETA: Record<StudentProfileKind, number> = { strong: 1320, average: 1120, struggling: 960 };
/** Class-wide chapter offsets: Electricity is planted as the weakest chapter. */
const CHAPTER_OFFSET: Record<Chapter, number> = { light: 0.02, eye: 0.04, electricity: -0.14, magnetism: 0.06 };

/** Planted misconception rates for the demo story, as exact student counts out of 30. */
const PLANTED: { id: string; count: number }[] = [
  { id: "MC01", count: 12 },
  { id: "MC03", count: 9 },
  { id: "MC13", count: 8 },
];
const BACKGROUND_MC_RATE = 0.07;

const clamp = (x: number, lo = 0.03, hi = 0.97) => Math.min(hi, Math.max(lo, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

function profileFor(i: number): StudentProfileKind {
  // 30 students: 8 strong, 13 average, 9 struggling, interleaved so names don't cluster.
  const pattern: StudentProfileKind[] = ["average", "strong", "struggling", "average", "average", "strong", "struggling", "average", "struggling", "strong"];
  return pattern[i % pattern.length];
}

function baseMastery(rng: Rng, profile: StudentProfileKind, chapterBias: Partial<Record<Chapter, number>> = {}): Record<string, number> {
  const chapterNoise: Record<Chapter, number> = {
    light: gaussian(rng, 0.08), eye: gaussian(rng, 0.08), electricity: gaussian(rng, 0.08), magnetism: gaussian(rng, 0.08),
  };
  const out: Record<string, number> = {};
  for (const c of CONCEPTS) {
    // Deeper concepts (more prereqs) are slightly harder.
    const depthPenalty = c.prereqs.length * 0.025;
    out[c.id] = clamp(
      PROFILE_BASE[profile] + CHAPTER_OFFSET[c.chapter] + chapterNoise[c.chapter] + (chapterBias[c.chapter] ?? 0) - depthPenalty + gaussian(rng, 0.07),
    );
  }
  return out;
}

function historyFor(rng: Rng, final: number, anchor: number): ConceptMastery["history"] {
  const n = randInt(rng, 3, 6);
  const start = clamp(final - 0.1 - rng() * 0.2);
  return Array.from({ length: n }, (_, k) => {
    const t = n === 1 ? 1 : k / (n - 1);
    const p = k === n - 1 ? final : clamp(start + (final - start) * t + gaussian(rng, 0.03));
    return { at: anchor - (n - 1 - k) * randInt(rng, 2, 4) * DAY_MS, p: round2(p) };
  });
}

function scheduleFor(rng: Rng, p: number, lastReviewed: number): ReviewItem {
  const repetition = p >= 0.6 ? 2 : p >= 0.3 ? 1 : 0;
  const interval = p >= 0.85 ? randInt(rng, 8, 15) : p >= 0.6 ? randInt(rng, 3, 7) : p >= 0.3 ? randInt(rng, 1, 3) : 1;
  return {
    ef: round2(Math.min(2.7, Math.max(1.3, 1.6 + p * 1.1 + gaussian(rng, 0.08)))),
    interval,
    repetition,
    due: addDays(lastReviewed, interval),
    lastReviewed,
  };
}

function simulateAttempts(rng: Rng, student: Omit<StudentRecord, "attempts" | "schedule">, count: number, anchor: number): Attempt[] {
  const attempts: Attempt[] = [];
  const weighted = CONCEPTS.flatMap((c) => Array<string>(c.weight).fill(c.id));
  for (let k = 0; k < count; k++) {
    const conceptId = pick(rng, weighted);
    const question = pick(rng, questionsFor(conceptId));
    const m = student.mastery[conceptId].p;
    const heldMc = student.misconceptions.find((id) => MISCONCEPTION_BY_ID[id].conceptId === conceptId);
    const correct = rng() < 0.12 + 0.8 * m - (heldMc ? 0.15 : 0);
    let selectedIndex: OptionIndex = question.correctIndex;
    let verdict: Verdict = "correct_sound";
    let misconceptionId: string | null = null;
    if (correct) {
      if (heldMc && rng() < 0.5) {
        verdict = "correct_flawed";
        misconceptionId = heldMc;
      }
    } else {
      verdict = "incorrect";
      const wrong = ([0, 1, 2, 3] as OptionIndex[]).filter((i) => i !== question.correctIndex);
      const mcOption = wrong.find((i) => heldMc && question.distractorMisconceptions?.[i] === heldMc);
      selectedIndex = mcOption ?? pick(rng, wrong);
      misconceptionId = mcOption !== undefined ? heldMc ?? null : null;
    }
    const confidence = round2(clamp(
      (verdict === "correct_sound" ? 0.55 + 0.35 * m : verdict === "correct_flawed" ? 0.45 : 0.3 + 0.2 * m) + gaussian(rng, 0.08),
      0.1, 1,
    ));
    attempts.push({
      id: `${student.id}-a${k}`,
      studentId: student.id,
      questionId: question.id,
      conceptId,
      selectedIndex,
      correct,
      verdict,
      confidence,
      misconceptionId,
      at: anchor - randInt(rng, 1, 28) * DAY_MS - randInt(rng, 9, 20) * 3_600_000,
    });
  }
  return attempts.sort((a, b) => a.at - b.at);
}

interface BuildOptions {
  id: string;
  name: string;
  profile: StudentProfileKind;
  misconceptions: string[];
  attemptCount: number;
  chapterBias?: Partial<Record<Chapter, number>>;
}

function buildStudent(rng: Rng, anchor: number, o: BuildOptions): StudentRecord {
  const raw = baseMastery(rng, o.profile, o.chapterBias);
  for (const mcId of o.misconceptions) {
    const cid = MISCONCEPTION_BY_ID[mcId].conceptId;
    raw[cid] = clamp(raw[cid] - 0.15);
  }
  const mastery: Record<string, ConceptMastery> = {};
  for (const c of CONCEPTS) {
    const p = round2(raw[c.id]);
    mastery[c.id] = { p, estimated: false, suspect: false, history: historyFor(rng, p, anchor - randInt(rng, 0, 3) * DAY_MS) };
  }
  const meanP = CONCEPTS.reduce((s, c) => s + mastery[c.id].p, 0) / CONCEPTS.length;
  const base = {
    id: o.id,
    name: o.name,
    profile: o.profile,
    theta: Math.round(PROFILE_THETA[o.profile] + (meanP - PROFILE_BASE[o.profile]) * 400),
    mastery,
    misconceptions: o.misconceptions,
  };
  const attempts = simulateAttempts(rng, base, o.attemptCount, anchor);
  const schedule: Record<string, ReviewItem> = {};
  for (const c of CONCEPTS) {
    const last = attempts.filter((a) => a.conceptId === c.id).at(-1)?.at;
    if (last !== undefined) schedule[c.id] = scheduleFor(rng, mastery[c.id].p, startOfDay(last));
  }
  return { ...base, attempts, schedule };
}

/** Deterministic Fisher–Yates shuffle. */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The synthetic class of 30. Fully determined by CLASS_SEED; `anchor` (today, ms) only shifts dates.
 */
export function generateClass(anchor: number): StudentRecord[] {
  const rng = mulberry32(CLASS_SEED);
  const day = startOfDay(anchor);
  const profiles = NAMES.map((_, i) => profileFor(i));

  // Plant misconceptions, biased towards weaker students (struggling first, then average, then strong).
  const rank: Record<StudentProfileKind, number> = { struggling: 0, average: 0.35, strong: 0.7 };
  const held: string[][] = NAMES.map(() => []);
  for (const { id, count } of PLANTED) {
    const keyed = shuffled(rng, NAMES.map((_, i) => i)).map((i) => ({ i, key: rank[profiles[i]] + rng() * 0.6 }));
    keyed.sort((a, b) => a.key - b.key);
    for (const { i } of keyed.slice(0, count)) held[i].push(id);
  }
  const planted = new Set(PLANTED.map((p) => p.id));
  for (let i = 0; i < NAMES.length; i++) {
    for (const mc of MISCONCEPTIONS) {
      if (!planted.has(mc.id) && rng() < BACKGROUND_MC_RATE * (profiles[i] === "strong" ? 0.4 : 1)) held[i].push(mc.id);
    }
  }

  return NAMES.map((name, i) =>
    buildStudent(rng, day, {
      id: `s${String(i + 1).padStart(2, "0")}`,
      name,
      profile: profiles[i],
      misconceptions: held[i],
      attemptCount: randInt(rng, 10, 40),
    }),
  );
}

/**
 * Aarav's pre-made demo state ("Load demo profile", Shift+D): average overall, Electricity weak,
 * 23 attempts, three active misconceptions including MC01.
 */
export function generateDemoStudent(anchor: number): StudentRecord {
  const rng = mulberry32(CLASS_SEED + 1);
  return buildStudent(rng, startOfDay(anchor), {
    id: DEMO_STUDENT_ID,
    name: "Aarav",
    profile: "average",
    misconceptions: ["MC01", "MC02", "MC12"],
    attemptCount: 23,
    chapterBias: { electricity: -0.12, magnetism: 0.12, light: 0.06 },
  });
}
