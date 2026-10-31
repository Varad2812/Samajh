/**
 * Turn a student's request into a CustomTrack: the Gemini prompt, cleaning the model's JSON into a valid
 * acyclic topic graph with shuffled options, and the offline fallback (seeded Class 10 Physics bank only:
 * an arbitrary syllabus cannot be invented without the model). Pure: no fetch, no Date.now().
 */
import { CHAPTERS, CONCEPTS, type Chapter } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { QUESTIONS, type OptionIndex } from "@/lib/data/questions";
import { makeGraph, PHYSICS_GRAPH } from "@/lib/galaxy/graph";
import { mulberry32 } from "@/lib/rng";
import type { CustomTestRequest, CustomTrack, TrackAI, TrackQuestion } from "./types";

const DIFFICULTY_TEXT: Record<CustomTestRequest["difficulty"], string> = {
  easy: "mostly difficulty 1-2 (recall and direct application)",
  mixed: "a spread from 1 to 5, centred on 3",
  hard: "mostly difficulty 3-5 (multi-step, application and analysis)",
};

export function customTestPrompt(req: CustomTestRequest): { system: string; user: string } {
  return {
    system:
      "You are an experienced school teacher and exam setter. You write accurate, syllabus-aligned multiple-choice " +
      "diagnostic tests whose wrong options each reflect a real, common student misconception. Every fact, number and " +
      "unit must be correct for the stated board and standard; work each numerical answer out carefully before writing it. " +
      "Reply with strict JSON only, no prose.",
    user: [
      `Subject: ${req.subject}`,
      `Standard / class: ${req.standard}`,
      req.board ? `Board / curriculum: ${req.board}` : "",
      `What the student wants to study:\n${req.syllabus}`,
      "",
      `Build a diagnostic test of exactly ${req.count} questions, difficulty ${DIFFICULTY_TEXT[req.difficulty]}.`,
      "First map the syllabus: 2-4 units (ids U1, U2, ...) and 5-12 specific topics (ids T1, T2, ...), in teaching order.",
      "A topic's prereqs may only list topic ids that come before it. weight is exam importance 1-3.",
      "Cover every topic at least once if the question count allows, weighting important topics more.",
      'Each question: 4 distinct options, exactly one correct (correctIndex 0-3), no "all/none of the above".',
      "distractorWhy has 4 entries: for each wrong option, the misconception that leads a student to pick it (one sentence); \"\" for the correct option.",
      "explanation: 1-3 sentences on why the answer is right.",
      "",
      'JSON shape: {"title","units":[{"id","name","short"}],"topics":[{"id","name","unit","prereqs","weight","summary"}],' +
        '"questions":[{"topicId","difficulty","stem","options","correctIndex","explanation","distractorWhy"}]}',
      'title: a short name for this test, e.g. "Class 9 Chemistry: Atoms & Molecules". short: unit label of at most 14 characters.',
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/** Reject model output that cannot make a usable test (counts as a failed attempt so the retry runs). */
export function verifyTrackAI(ai: TrackAI, req: CustomTestRequest): string | null {
  const topicIds = new Set(ai.topics.map((t) => t.id));
  const usable = ai.questions.filter((q) => topicIds.has(q.topicId) && new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4);
  if (usable.length < Math.max(4, Math.ceil(req.count * 0.6))) return "too-few-valid-questions";
  return null;
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Seeded shuffle of the four options (models tend to put the answer first); keeps the answer and reasons aligned. */
function shuffleOptions(q: Omit<TrackQuestion, "id">, seed: number): Omit<TrackQuestion, "id"> {
  const rng = mulberry32(seed);
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]) as TrackQuestion["options"],
    distractorWhy: order.map((i) => q.distractorWhy[i]) as TrackQuestion["distractorWhy"],
    correctIndex: order.indexOf(q.correctIndex) as OptionIndex,
  };
}

/** Clean model JSON into a track. Null when too little survives. */
export function shapeTrack(req: CustomTestRequest, ai: TrackAI, id: string, at: number): CustomTrack | null {
  const units = ai.units.map((u) => ({ id: u.id, name: u.name, short: (u.short || u.name).slice(0, 18) }));
  const graph = makeGraph(id, units, ai.topics.map((t) => ({ id: t.id, name: t.name, chapter: t.unit, prereqs: t.prereqs, weight: t.weight, summary: t.summary })));
  const questions: TrackQuestion[] = [];
  for (const q of ai.questions) {
    if (!graph.byId[q.topicId] || questions.length >= req.count) continue;
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) continue;
    const why = [0, 1, 2, 3].map((i) => (i === q.correctIndex ? "" : (q.distractorWhy[i] ?? "").trim())) as TrackQuestion["distractorWhy"];
    const shaped = shuffleOptions(
      {
        topicId: q.topicId,
        difficulty: q.difficulty,
        stem: q.stem.trim(),
        options: q.options.map((o) => o.trim()) as TrackQuestion["options"],
        correctIndex: q.correctIndex as OptionIndex,
        explanation: q.explanation.trim(),
        distractorWhy: why,
      },
      hash(id + q.stem),
    );
    questions.push({ ...shaped, id: `${id}-q${questions.length + 1}` });
  }
  if (questions.length < 4 || graph.concepts.length < 2) return null;
  return {
    id,
    createdAt: at,
    source: "ai",
    subject: req.subject,
    standard: req.standard,
    board: req.board,
    syllabus: req.syllabus,
    title: ai.title.trim(),
    units: graph.chapters.map((c) => ({ id: c.id, name: c.name, short: c.label })),
    topics: graph.concepts,
    questions,
  };
}

// ───────────── Offline: built-in Class 10 Physics bank ─────────────

const CHAPTER_KEYWORDS: Record<Chapter, string[]> = {
  light: ["light", "reflect", "refract", "mirror", "lens", "snell", "image", "focal"],
  eye: ["eye", "vision", "myopia", "hypermetropia", "prism", "dispersion", "rainbow", "scatter", "sky", "atmospheric"],
  electricity: ["electric", "current", "resist", "ohm", "voltage", "potential", "circuit", "power", "series", "parallel", "heating"],
  magnetism: ["magnet", "field", "solenoid", "motor", "induction", "generator", "fleming", "domestic"],
};

/** True when the built-in question bank can serve the request. */
export function isBuiltInSubject(req: Pick<CustomTestRequest, "subject" | "standard">): boolean {
  return /phys|science/i.test(req.subject) && /\b10\b|\bx\b|tenth/i.test(req.standard);
}

/** Built-in physics test for the requested chapters (all chapters when none are named). Null for other subjects. */
export function offlineTrack(req: CustomTestRequest, id: string, at: number): CustomTrack | null {
  if (!isBuiltInSubject(req)) return null;
  const text = req.syllabus.toLowerCase();
  const named = CHAPTERS.filter((ch) => CHAPTER_KEYWORDS[ch.id].some((k) => text.includes(k))).map((ch) => ch.id);
  const chapters = new Set<Chapter>(named.length ? named : CHAPTERS.map((c) => c.id));
  const concepts = CONCEPTS.filter((c) => chapters.has(c.chapter));
  const conceptIds = new Set(concepts.map((c) => c.id));
  const want = req.difficulty === "easy" ? 2 : req.difficulty === "hard" ? 4 : 3;

  // One question per concept (closest to the wanted difficulty), most important concepts first, then seconds.
  const byConcept = concepts
    .map((c) => ({ c, qs: QUESTIONS.filter((q) => q.conceptId === c.id).sort((a, b) => Math.abs(a.difficulty - want) - Math.abs(b.difficulty - want)) }))
    .filter((x) => x.qs.length)
    .sort((a, b) => b.c.weight - a.c.weight);
  const picked = [];
  for (let round = 0; picked.length < req.count && round < 3; round++) {
    for (const { qs } of byConcept) if (qs[round] && picked.length < req.count) picked.push(qs[round]);
  }
  const questions: TrackQuestion[] = picked.map((q, i) => ({
    id: `${id}-q${i + 1}`,
    topicId: q.conceptId,
    difficulty: q.difficulty,
    stem: q.stem,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    distractorWhy: [0, 1, 2, 3].map((k) => {
      const mc = q.distractorMisconceptions?.[k as OptionIndex];
      return mc ? (MISCONCEPTION_BY_ID[mc]?.wrongBelief ?? "") : "";
    }) as TrackQuestion["distractorWhy"],
  }));
  const label = (id: string) => PHYSICS_GRAPH.chapters.find((c) => c.id === id)?.label ?? id;
  const units = CHAPTERS.filter((ch) => chapters.has(ch.id)).map((ch) => ({ id: ch.id, name: ch.name, short: label(ch.id) }));
  return {
    id,
    createdAt: at,
    source: "offline",
    subject: req.subject,
    standard: req.standard,
    board: req.board,
    syllabus: req.syllabus,
    title: `Class 10 Physics: ${units.map((u) => u.short).join(", ")}`,
    units,
    topics: concepts.map((c) => ({ ...c, prereqs: c.prereqs.filter((p) => conceptIds.has(p)) })),
    questions,
  };
}
