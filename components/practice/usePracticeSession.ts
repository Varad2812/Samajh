"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeReasoning, generateQuestion } from "@/lib/ai/api";
import { needsConfirmation } from "@/lib/ai/confirm";
import type { AiSource, AnalysisResult } from "@/lib/ai/schemas";
import { now as virtualNow } from "@/lib/clock";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { QUESTIONS, type OptionIndex, type Question } from "@/lib/data/questions";
import { candidateMisconceptionIds, processAttempt, type AttemptOutcome } from "@/lib/engine/attempt";
import { selectNext, type Selection } from "@/lib/engine/selector";
import { dueConceptIds } from "@/lib/engine/sm2";
import { fx, useStore } from "@/lib/store";
import type { AttemptEdit, AttemptMode } from "@/lib/types";

export type Phase = "answer" | "analyzing" | "confirm" | "result";

/** What the next question should be about. */
export interface Target {
  mode: "auto" | "concept" | "review";
  /** URL concept (mode "concept") or the current due concept (mode "review"). */
  conceptId?: string;
  /** Root-cause probe after a misconception / weak prerequisite. */
  probe?: { conceptId: string; misconceptionId: string | null; from: string };
}

export interface SessionStats {
  attempts: number;
  correct: number;
  confidenceSum: number;
}

/** Strike lands after the MiniGalaxy camera has flown to the misconception's concept (~800ms ease). */
const FLY_DELAY_MS = 1100;
const STRIKE_AFTER_FLY_MS = 250;
const MIN_ANALYSIS_MS = 900;

function choose(target: Target): Selection {
  const s = useStore.getState();
  const conceptId = target.probe?.conceptId ?? target.conceptId;
  return selectNext({
    mastery: s.mastery,
    schedule: s.schedule,
    attempts: s.attempts,
    theta: s.student.theta,
    now: virtualNow(s.settings.offsetDays),
    activeMisconceptions: s.student.misconceptions,
    questions: [...QUESTIONS, ...s.generated],
    questionElo: s.questionElo,
    conceptId: target.mode === "auto" && !target.probe ? undefined : conceptId,
  });
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function usePracticeSession(initial: Target) {
  const [target, setTarget] = useState(initial);
  const [selection, setSelection] = useState<Selection>(() => choose(initial));
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<OptionIndex | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [phase, setPhase] = useState<Phase>("answer");
  const [pending, setPending] = useState<{ analysis: AnalysisResult; source: AiSource } | null>(null);
  const [result, setResult] = useState<{ analysis: AnalysisResult; source: AiSource; outcome: AttemptOutcome; raw: string } | null>(null);
  const [focusId, setFocusId] = useState(selection.conceptId);
  const [stats, setStats] = useState<SessionStats>({ attempts: 0, correct: 0, confidenceSum: 0 });
  const [question, setQuestion] = useState<Question | null>(selection.question);
  const timers = useRef<number[]>([]);
  /** Misconception change waiting for the Strike timing; flushed early if the student moves on. */
  const deferred = useRef<string[] | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const flush = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (deferred.current) useStore.getState().setStudentMisconceptions(deferred.current);
    deferred.current = null;
  }, []);
  useEffect(() => flush, [flush]);

  // No seeded question within ±150 Elo → ask for a targeted one; swap it in if the student hasn't answered yet.
  useEffect(() => {
    if (!selection.needsGeneration) return;
    let live = true;
    const concept = CONCEPT_BY_ID[selection.conceptId];
    const s = useStore.getState();
    const avoidStems = [...QUESTIONS, ...s.generated].filter((q) => q.conceptId === selection.conceptId).map((q) => q.stem);
    const difficulty = Math.min(5, Math.max(1, Math.round((selection.targetElo - 600) / 200)));
    Promise.resolve()
      .then(() => live && setGenerating(true))
      .then(() => generateQuestion({ conceptId: concept.id, conceptName: concept.name, targetDifficulty: difficulty, misconceptionId: selection.misconceptionId ?? undefined, avoidStems }))
      .then((env) => {
        if (!live) return;
        setGenerating(false);
        if (env.source !== "ai") return; // the nearest seeded question is already showing
        useStore.getState().addGeneratedQuestion(env.data);
        if (selectedRef.current === null) setQuestion(env.data);
      });
    return () => {
      live = false;
    };
  }, [selection]);

  const loadNext = useCallback((next: Target) => {
    flush();
    const sel = choose(next);
    setTarget(next);
    setSelection(sel);
    setQuestion(sel.question);
    setFocusId(sel.conceptId);
    setSelected(null);
    setReasoning("");
    setPending(null);
    setResult(null);
    setPhase("answer");
  }, [flush]);

  const grade = useCallback(
    (analysis: AnalysisResult, source: AiSource, edits: AttemptEdit[]) => {
      if (!question || selected === null) return;
      const s = useStore.getState();
      const mode: AttemptMode = target.mode === "review" ? "review" : "practice";
      const outcome = processAttempt(
        { studentId: s.student.id, mastery: s.mastery, schedule: s.schedule, theta: s.student.theta, misconceptions: s.student.misconceptions, attempts: s.attempts },
        {
          id: crypto.randomUUID(),
          question,
          questionElo: s.questionElo[question.id],
          selectedIndex: selected,
          verdict: analysis.verdict,
          confidence: analysis.confidence,
          misconceptionId: analysis.misconception?.id ?? null,
          calculationSlip: analysis.calculationSlip,
          rawTranscript: reasoning,
          cleanedReasoning: analysis.cleanedReasoning,
          edits,
          mode,
          now: virtualNow(s.settings.offsetDays),
        },
      );
      s.applyOutcome(outcome); // → Mastery Shockwave on the practised node
      setResult({ analysis, source, outcome, raw: reasoning });
      setPhase("result");
      setStats((st) => ({ attempts: st.attempts + 1, correct: st.correct + (outcome.attempt.correct ? 1 : 0), confidenceSum: st.confidenceSum + analysis.confidence }));

      // Misconception Strike / shatter: fly the MiniGalaxy to the misconception's concept first, then strike.
      // A re-detected misconception (already held) still strikes: it reinforces the existing satellite.
      const detected = outcome.attempt.misconceptionId;
      if (detected || outcome.cleared.length) {
        if (outcome.added.length || outcome.cleared.length) deferred.current = outcome.misconceptions;
        const strikeConcept = detected ? MISCONCEPTION_BY_ID[detected].conceptId : null;
        const flies = strikeConcept !== null && strikeConcept !== outcome.conceptId;
        const fast = reducedMotion();
        if (flies) timers.current.push(window.setTimeout(() => setFocusId(strikeConcept), fast ? 0 : FLY_DELAY_MS));
        timers.current.push(
          window.setTimeout(() => {
            if (deferred.current) useStore.getState().setStudentMisconceptions(deferred.current); // → strike / shatter
            deferred.current = null;
            if (detected && strikeConcept && !outcome.added.includes(detected)) fx.strike(strikeConcept, detected);
          }, fast ? 0 : flies ? FLY_DELAY_MS + STRIKE_AFTER_FLY_MS : 600),
        );
      } else if (outcome.rootCause) {
        timers.current.push(window.setTimeout(() => setFocusId(outcome.rootCause!.conceptId), reducedMotion() ? 0 : FLY_DELAY_MS));
      }
    },
    [question, selected, reasoning, target.mode],
  );

  const submit = useCallback(async () => {
    if (!question || selected === null || phase !== "answer") return;
    setPhase("analyzing");
    const s = useStore.getState();
    const candidates = candidateMisconceptionIds(question, s.student.misconceptions).map((id) => MISCONCEPTION_BY_ID[id]);
    const [env] = await Promise.all([
      analyzeReasoning({
        question: question.stem,
        options: question.options,
        selectedIndex: selected,
        correctIndex: question.correctIndex,
        conceptId: question.conceptId,
        rawTranscript: reasoning,
        candidateMisconceptions: candidates,
        questionId: question.id,
      }),
      sleep(reducedMotion() ? 0 : MIN_ANALYSIS_MS),
    ]);
    if (needsConfirmation(env.data)) {
      setPending({ analysis: env.data, source: env.source });
      setPhase("confirm");
    } else grade(env.data, env.source, []);
  }, [question, selected, phase, reasoning, grade]);

  const confirm = useCallback(
    (patched: AnalysisResult, edits: AttemptEdit[]) => {
      if (pending) grade(patched, pending.source, edits);
    },
    [pending, grade],
  );

  /** Where "Next question" goes: probe the root cause, else back to the mode's own rule. */
  const nextTarget = useCallback((): Target => {
    const o = result?.outcome;
    const home: Target = { mode: target.mode, conceptId: target.probe?.from ?? target.conceptId };
    if (o?.rootCause && o.attempt.verdict !== "correct_sound") {
      return { ...home, probe: { conceptId: o.rootCause.conceptId, misconceptionId: o.rootCause.misconceptionId, from: home.conceptId ?? o.conceptId } };
    }
    if (target.mode === "review") {
      const s = useStore.getState();
      const due = dueConceptIds(s.schedule, virtualNow(s.settings.offsetDays));
      return due.length ? { mode: "review", conceptId: due[0] } : { mode: "auto" };
    }
    return home;
  }, [result, target]);

  const next = useCallback(() => loadNext(nextTarget()), [loadNext, nextTarget]);

  return {
    target, selection, question, generating, selected, setSelected, reasoning, setReasoning,
    phase, pending, result, focusId, stats, submit, confirm, next, nextTarget, loadNext,
  };
}
