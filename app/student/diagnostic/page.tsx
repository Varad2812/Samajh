"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { DiagnosticRail } from "@/components/diagnostic/DiagnosticRail";
import { DiagnosticReveal } from "@/components/diagnostic/DiagnosticReveal";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { ReasoningInput } from "@/components/voice/ReasoningInput";
import { analyzeReasoning } from "@/lib/ai/api";
import { now as virtualNow } from "@/lib/clock";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { OptionIndex } from "@/lib/data/questions";
import { candidateMisconceptionIds, type GradedAnswer } from "@/lib/engine/attempt";
import { NEUTRAL_CONFIDENCE } from "@/lib/engine/confidence";
import { DIAGNOSTIC_LENGTH, finishDiagnostic, nextDiagnosticQuestion, type DiagnosticOutcome } from "@/lib/engine/diagnostic";
import { useHydrated, useStore } from "@/lib/store";

export default function DiagnosticPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="panel mx-auto h-[480px] max-w-4xl animate-pulse" />;
  return <Diagnostic />;
}

function Diagnostic() {
  const router = useRouter();
  const [answers, setAnswers] = useState<GradedAnswer[]>([]);
  const [selected, setSelected] = useState<OptionIndex | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ outcome: DiagnosticOutcome; at: number } | null>(null);
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);
  const studentName = useStore((s) => s.student.name);

  const steps = answers.map((a) => ({ questionId: a.question.id, correct: a.selectedIndex === a.question.correctIndex }));
  const question = nextDiagnosticQuestion(steps);

  if (done) {
    const score = answers.filter((a) => a.selectedIndex === a.question.correctIndex).length;
    return <DiagnosticReveal outcome={done.outcome} score={score} total={answers.length} at={done.at} />;
  }
  if (!question) return null;

  const answer = async (withReasoning: boolean) => {
    if (selected === null || busy) return;
    const correct = selected === question.correctIndex;
    const raw = withReasoning ? reasoning.trim() : "";
    let graded: Pick<GradedAnswer, "verdict" | "confidence" | "misconceptionId" | "calculationSlip" | "cleanedReasoning"> = {
      verdict: correct ? "correct_sound" : "incorrect",
      confidence: NEUTRAL_CONFIDENCE,
      misconceptionId: null,
    };
    if (raw) {
      setBusy(true);
      const env = await analyzeReasoning({
        question: question.stem,
        options: question.options,
        selectedIndex: selected,
        correctIndex: question.correctIndex,
        conceptId: question.conceptId,
        rawTranscript: raw,
        candidateMisconceptions: candidateMisconceptionIds(question, []).map((id) => MISCONCEPTION_BY_ID[id]),
        questionId: question.id,
      });
      const a = env.data;
      graded = { verdict: a.verdict, confidence: a.confidence, misconceptionId: a.misconception?.id ?? null, calculationSlip: a.calculationSlip, cleanedReasoning: a.cleanedReasoning };
      setBusy(false);
    }
    const now = virtualNow(useStore.getState().settings.offsetDays);
    const next = [...answers, { id: crypto.randomUUID(), question, selectedIndex: selected, rawTranscript: raw || undefined, now, ...graded }];
    setAnswers(next);
    setSelected(null);
    setReasoning("");
    if (next.length >= DIAGNOSTIC_LENGTH) {
      const s = useStore.getState();
      const outcome = finishDiagnostic(s.student.id, next, now);
      s.applyDiagnostic(outcome);
      setDone({ outcome, at: now });
    }
  };

  const concept = CONCEPT_BY_ID[question.conceptId];
  const last = answers.at(-1);
  const adapt =
    answers.length < 4
      ? "Opening round: one question per chapter at difficulty 2."
      : last && last.question.conceptId !== question.conceptId && concept.prereqs.includes(last.question.conceptId)
        ? `Building on ${last.question.conceptId}: harder, on a dependent concept.`
        : last && CONCEPT_BY_ID[last.question.conceptId].prereqs.includes(question.conceptId)
          ? `Probing ${question.conceptId}, a prerequisite of ${last.question.conceptId}.`
          : `Adapting per chapter: correct → harder dependent, wrong → easier prerequisite.`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <section className="panel flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-xl font-semibold">Diagnostic</h1>
          <span className="text-sm text-muted-foreground">12 adaptive questions, about 4 minutes. Then your galaxy lights up.</span>
          <span className="ml-auto font-mono text-sm tabular">
            {answers.length + 1} / {DIAGNOSTIC_LENGTH}
          </span>
        </div>
        <DiagnosticRail done={answers.map((a) => ({ question: a.question, correct: a.selectedIndex === a.question.correctIndex }))} current={question} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="panel flex min-w-0 flex-col gap-4 p-4">
          <QuestionCard key={question.id} question={question} selected={selected} onSelect={(i) => !busy && setSelected(i)} />
          <div className="border-t border-border pt-4">
            <ReasoningInput
              compact
              value={reasoning}
              onChange={setReasoning}
              onSubmit={() => void answer(true)}
              canSubmit={selected !== null}
              disabled={busy}
              submitLabel={answers.length === DIAGNOSTIC_LENGTH - 1 ? "Finish" : "Next"}
            />
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {busy ? (
                <span className="flex items-center gap-1.5 text-accent">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking your reasoning…
                </span>
              ) : (
                <span>Reasoning is optional here, but it helps us spot misconceptions.</span>
              )}
              <button
                type="button"
                disabled={selected === null || busy}
                onClick={() => void answer(false)}
                className="ml-auto rounded text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-40"
              >
                Skip reasoning →
              </button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="panel flex flex-col gap-2 p-4 text-xs">
            <h2 className="label-caps">Why this question</h2>
            <p className="text-foreground">
              <span className="font-mono text-accent">{concept.id}</span> {concept.name}
            </p>
            <p className="text-muted-foreground">{adapt}</p>
          </section>
          <section className="panel flex flex-col gap-2 p-4 text-xs">
            <h2 className="label-caps">So far</h2>
            {answers.length === 0 ? (
              <p className="text-muted-foreground">Your answers will build your learner model as you go.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {answers.slice(-6).map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span className={a.selectedIndex === a.question.correctIndex ? "size-1.5 rounded-full bg-mastered" : "size-1.5 rounded-full bg-weak"} />
                    <span className="font-mono text-muted-foreground">{a.question.conceptId}</span>
                    <span className="truncate">{CONCEPT_BY_ID[a.question.conceptId].name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel flex flex-col gap-2 p-4 text-xs">
            <h2 className="label-caps">In a hurry?</h2>
            <p className="text-muted-foreground">Load {studentName === "Aarav" ? "Aarav's" : "the"} pre-made demo profile instead (⇧D anywhere).</p>
            <button
              type="button"
              onClick={() => {
                router.push("/student");
                // Load once the home galaxy has mounted, so it plays the Ignition reveal.
                window.setTimeout(loadDemoProfile, 400);
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-foreground transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              <Sparkles className="size-3.5" aria-hidden /> Load demo profile
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
