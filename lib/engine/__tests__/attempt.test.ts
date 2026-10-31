import { describe, expect, it } from "vitest";
import { offlineAnalysis } from "@/lib/ai/offlineAnalyzer";
import { finalizeAnalysis } from "@/lib/ai/postprocess";
import { DAY_MS } from "@/lib/clock";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { QUESTION_BY_ID, QUESTIONS, type OptionIndex, type Question } from "@/lib/data/questions";
import { generateDemoStudent } from "@/lib/data/students";
import { masteryBand } from "@/lib/utils";
import { candidateMisconceptionIds, clearedMisconceptions, processAttempt, resolveMisconception, type LearnerState } from "../attempt";
import { DIAGNOSTIC_LENGTH, DIAGNOSTIC_OPENERS, finishDiagnostic, nextDiagnosticQuestion } from "../diagnostic";
import { selectNext } from "../selector";
import { dueConceptIds } from "../sm2";

const NOW = new Date("2026-10-31T10:00:00").getTime();
const DEMO_RAW = "umm so the first bulb uses up some of the current so the second one is dimmer… wait no I mean, actually I think it's the same? not sure.";

function demoState(): LearnerState {
  const d = generateDemoStudent(NOW);
  return { studentId: d.id, mastery: d.mastery, schedule: d.schedule, theta: d.theta, misconceptions: d.misconceptions, attempts: d.attempts };
}

function analyse(q: Question, selectedIndex: OptionIndex, raw: string, active: string[]) {
  const req = {
    question: q.stem, options: q.options, selectedIndex, correctIndex: q.correctIndex, conceptId: q.conceptId, rawTranscript: raw,
    candidateMisconceptions: candidateMisconceptionIds(q, active).map((id) => ({ ...MISCONCEPTION_BY_ID[id] })), questionId: q.id,
  };
  return finalizeAnalysis(offlineAnalysis(req), req, { fromModel: false });
}

describe("demo script steps 2–5 through the real pipeline (offline)", () => {
  it("series question → MC01 root cause in C1 → probe targets MC01 → amber C1 → fast-forward fills the queue", () => {
    let state = { ...demoState(), misconceptions: ["MC02", "MC12"] }; // MC01 not yet known, so the Strike is new
    // Step 2: C6 practice picks the series-bulbs question.
    const sel = selectNext({ ...state, now: NOW, activeMisconceptions: state.misconceptions, conceptId: "C6" });
    expect(sel.question?.id).toBe("C6-4");
    const q = sel.question!;

    // Step 3: dimmer (A, wrong) + the demo transcript.
    const a = analyse(q, 0, DEMO_RAW, state.misconceptions);
    expect(a.misconception?.id).toBe("MC01");
    expect(a.confidence).toBeCloseTo(0.38, 2);
    const o = processAttempt(state, { id: "x1", question: q, selectedIndex: 0, verdict: a.verdict, confidence: a.confidence, misconceptionId: a.misconception?.id ?? null, now: NOW });
    expect(o.added).toEqual(["MC01"]);
    expect(o.rootCause).toEqual({ conceptId: "C1", via: "misconception", misconceptionId: "MC01" });
    expect(o.mastery.C1.suspect).toBe(true);
    expect(o.after).not.toBe(o.before);
    expect(o.theta).toBeLessThan(o.thetaBefore);
    state = { ...state, mastery: o.mastery, schedule: o.schedule, theta: o.theta, misconceptions: o.misconceptions, attempts: [...state.attempts, o.attempt] };

    // Step 4: the next question probes C1 and targets MC01 at the right difficulty.
    const probe = selectNext({ ...state, now: NOW, activeMisconceptions: state.misconceptions, conceptId: "C1" });
    expect(Object.values(probe.question!.distractorMisconceptions ?? {})).toContain("MC01");
    expect(Math.abs(probe.question!.elo - probe.targetElo)).toBeLessThanOrEqual(150);
    expect(masteryBand(state.mastery.C1.p)).toBe("weak");
    const good = analyse(probe.question!, probe.question!.correctIndex, "the current is the same everywhere in a series circuit so the reading is the same", state.misconceptions);
    expect(good.verdict).toBe("correct_sound");
    const o2 = processAttempt(state, { id: "x2", question: probe.question!, selectedIndex: probe.question!.correctIndex, verdict: good.verdict, confidence: good.confidence, misconceptionId: null, now: NOW + 60_000 });
    expect(masteryBand(o2.mastery.C1.p)).toBe("developing"); // red → amber
    expect(o2.rootCause).toBeNull();

    // Step 5: fast-forward 3 days → more concepts due (C6 scheduled for tomorrow after the wrong answer).
    const sched = o2.schedule;
    expect(dueConceptIds(sched, NOW + 3 * DAY_MS)).toEqual(expect.arrayContaining(["C6", "C1"]));
    expect(dueConceptIds(sched, NOW + 3 * DAY_MS).length).toBeGreaterThan(dueConceptIds(sched, NOW).length);
  });
});

describe("processAttempt details", () => {
  const q = QUESTION_BY_ID["C1-2"];
  it("falls back to the tapped distractor's misconception when the analyzer found none", () => {
    expect(resolveMisconception(q, 1, null, "incorrect")).toBe("MC01");
    expect(resolveMisconception(q, 0, null, "correct_sound")).toBeNull();
    expect(resolveMisconception(q, 1, "MC07", "incorrect")).toBe("MC07");
  });
  it("candidates include the concept's ancestors and the distractors", () => {
    const ids = candidateMisconceptionIds(QUESTION_BY_ID["C6-4"]);
    expect(ids).toEqual(expect.arrayContaining(["MC01", "MC02", "MC04", "MC07"]));
    expect(ids).not.toContain("MC11");
  });
  it("two sound answers in a row on a misconception's concept clear it (→ shatter)", () => {
    const base = { ...demoState(), misconceptions: ["MC01"] };
    const sound = (id: string, s: LearnerState, t: number) =>
      processAttempt(s, { id, question: q, selectedIndex: 0, verdict: "correct_sound", confidence: 0.9, misconceptionId: null, now: t });
    const o1 = sound("a", base, NOW);
    expect(o1.cleared).toEqual([]);
    const s1 = { ...base, mastery: o1.mastery, schedule: o1.schedule, misconceptions: o1.misconceptions, attempts: [...base.attempts, o1.attempt] };
    const o2 = sound("b", s1, NOW + 1);
    expect(o2.cleared).toEqual(["MC01"]);
    expect(o2.misconceptions).not.toContain("MC01");
  });
  it("a calculation slip halves the evidence and does not punish prerequisites", () => {
    const s = demoState();
    const c4 = QUESTIONS.find((x) => x.conceptId === "C4")!;
    const slip = processAttempt(s, { id: "s", question: c4, selectedIndex: ((c4.correctIndex + 1) % 4) as OptionIndex, verdict: "incorrect", confidence: 0.8, misconceptionId: null, calculationSlip: true, now: NOW });
    const plain = processAttempt(s, { id: "p", question: c4, selectedIndex: ((c4.correctIndex + 1) % 4) as OptionIndex, verdict: "incorrect", confidence: 0.8, misconceptionId: null, now: NOW });
    expect(slip.after).toBeGreaterThan(plain.after);
    expect(slip.mastery.C2.p).toBe(s.mastery.C2.p);
    expect(plain.mastery.C2.suspect).toBe(true);
  });
  it("clearedMisconceptions ignores misconceptions with fewer than two exercising attempts", () => {
    expect(clearedMisconceptions(["MC05"], [])).toEqual([]);
  });
});

describe("adaptive diagnostic", () => {
  it("opens with one difficulty-2 question per chapter, then adapts without repeats", () => {
    expect(DIAGNOSTIC_OPENERS.map((q) => q.difficulty)).toEqual([2, 2, 2, 2]);
    const steps: { questionId: string; correct: boolean }[] = [];
    for (let i = 0; i < DIAGNOSTIC_LENGTH; i++) {
      const q = nextDiagnosticQuestion(steps);
      expect(q).not.toBeNull();
      steps.push({ questionId: q!.id, correct: i % 3 !== 0 });
    }
    expect(nextDiagnosticQuestion(steps)).toBeNull();
    expect(new Set(steps.map((s) => s.questionId)).size).toBe(DIAGNOSTIC_LENGTH);
  });
  it("correct → harder dependent; wrong → easier prerequisite", () => {
    const openers = DIAGNOSTIC_OPENERS.map((q) => ({ questionId: q.id, correct: true }));
    const after = nextDiagnosticQuestion(openers)!; // chapter 0 again (light), opener was correct
    const opener = DIAGNOSTIC_OPENERS[0];
    expect(after.difficulty).toBeGreaterThanOrEqual(opener.difficulty);

    const wrong = DIAGNOSTIC_OPENERS.map((q) => ({ questionId: q.id, correct: false }));
    const probe = nextDiagnosticQuestion(wrong)!;
    expect(probe.difficulty).toBeLessThanOrEqual(opener.difficulty);
  });
  it("finishDiagnostic measures tested concepts and estimates the rest (×0.8 of neighbours)", () => {
    const steps: { questionId: string; correct: boolean }[] = [];
    const answers = [];
    for (let i = 0; i < DIAGNOSTIC_LENGTH; i++) {
      const q = nextDiagnosticQuestion(steps)!;
      const ok = i % 2 === 0;
      steps.push({ questionId: q.id, correct: ok });
      const sel = (ok ? q.correctIndex : (q.correctIndex + 1) % 4) as OptionIndex;
      answers.push({ id: `d${i}`, question: q, selectedIndex: sel, verdict: ok ? ("correct_sound" as const) : ("incorrect" as const), confidence: 0.6, misconceptionId: null, now: NOW });
    }
    const out = finishDiagnostic("aarav", answers, NOW);
    const tested = new Set(answers.map((a) => a.question.conceptId));
    for (const id of tested) expect(out.mastery[id].estimated).toBe(false);
    expect(Object.values(out.mastery).some((m) => m.estimated)).toBe(true);
    expect(out.attempts).toHaveLength(DIAGNOSTIC_LENGTH);
    expect(out.attempts.every((a) => a.mode === "diagnostic")).toBe(true);
    expect(Object.keys(out.schedule).length).toBe(tested.size);
  });
});
