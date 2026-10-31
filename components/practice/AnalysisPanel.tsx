"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Cpu, WifiOff, XCircle } from "lucide-react";
import { ConfidenceMeter } from "@/components/voice/ConfidenceMeter";
import { TranscriptDiff } from "@/components/voice/TranscriptDiff";
import type { AiSource, AnalysisResult } from "@/lib/ai/schemas";
import type { Question } from "@/lib/data/questions";
import type { AttemptOutcome } from "@/lib/engine/attempt";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MisconceptionCard } from "./MisconceptionCard";

const LETTERS = ["A", "B", "C", "D"];

const VERDICT: Record<Verdict, { title: string; sub: string; className: string; Icon: typeof CheckCircle2 }> = {
  correct_sound: { title: "Correct", sub: "Sound reasoning", className: "border-mastered/30 bg-mastered/5 text-mastered", Icon: CheckCircle2 },
  correct_flawed: { title: "Correct, flawed reasoning", sub: "Right answer, shaky why", className: "border-developing/30 bg-developing/5 text-developing", Icon: CircleAlert },
  incorrect: { title: "Incorrect", sub: "Let's find out why", className: "border-weak/30 bg-weak/5 text-weak", Icon: XCircle },
};

interface Props {
  raw: string;
  analysis: AnalysisResult;
  source: AiSource;
  question: Question;
  selectedIndex: number;
  outcome: AttemptOutcome;
  onNext: () => void;
  nextLabel: string;
}

/** Staggered analysis reveal: transcript diff, confidence, verdict, misconception card, then actions. */
export function AnalysisPanel({ raw, analysis, source, question, selectedIndex, outcome, onNext, nextLabel }: Props) {
  const [why, setWhy] = useState(false);
  const reduce = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Bring the analysis into view without jumping past it, and make "Next" one keypress away.
    root.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    nextBtn.current?.focus({ preventScroll: true });
  }, [reduce]);
  const v = VERDICT[analysis.verdict];
  const item = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: "easeOut" as const, delay: reduce ? 0 : i * 0.12 },
  });
  const mcId = outcome.attempt.misconceptionId;
  const fromOption = !analysis.misconception && mcId ? LETTERS[selectedIndex] : null;
  const cleared = outcome.cleared[0] ?? null;

  return (
    <section ref={root} className="flex scroll-mt-[72px] flex-col gap-3" aria-label="Analysis">
      <div className="flex items-center gap-2">
        <h2 className="label-caps">Analysis</h2>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", source === "ai" ? "bg-accent/10 text-accent" : "bg-developing/10 text-developing")}>
          {source === "ai" ? <Cpu className="size-3" aria-hidden /> : <WifiOff className="size-3" aria-hidden />}
          {source === "ai" ? "AI analysis" : "Built-in analyzer"}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <motion.div {...item(0)} className="min-w-0 lg:col-span-2">
          <TranscriptDiff raw={raw} analysis={analysis} />
        </motion.div>
        <motion.div {...item(1)}>
          <ConfidenceMeter value={analysis.confidence} detail={analysis.confidenceDetail} fromModel={source === "ai"} />
        </motion.div>
        <motion.section {...item(2)} className={cn("panel flex flex-col gap-2 p-4", v.className)} aria-label="Verdict">
          <h3 className="label-caps">Verdict</h3>
          <div className="flex items-center gap-2">
            <v.Icon className="size-5 shrink-0" aria-hidden />
            <span className="font-display text-lg leading-tight font-semibold">{v.title}</span>
          </div>
          <span className="text-xs opacity-80">{analysis.calculationSlip ? "Right idea, calculation slip" : v.sub}</span>
          <p className="border-t border-current/15 pt-2 text-sm leading-relaxed text-foreground">{analysis.feedback}</p>
          <p className="mt-auto font-mono text-[11px] text-muted-foreground">
            You chose {LETTERS[selectedIndex]} · answer {LETTERS[question.correctIndex]}
          </p>
        </motion.section>
      </div>

      {(mcId || analysis.misconception?.novelDescription || cleared) && (
        <motion.div {...item(3)} className="flex flex-col gap-3">
          {(mcId || analysis.misconception?.novelDescription) && (
            <MisconceptionCard
              misconceptionId={mcId}
              novelDescription={analysis.misconception?.novelDescription}
              evidenceQuote={analysis.misconception?.evidenceQuote}
              fromOption={fromOption}
            />
          )}
          {cleared && <MisconceptionCard misconceptionId={cleared} cleared />}
        </motion.div>
      )}

      <motion.div {...item(4)} className="flex flex-col gap-3">
        {why && (
          <div className="panel flex gap-3 p-4 text-sm leading-relaxed">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <div>
              <div className="mb-1 font-medium">
                Answer {LETTERS[question.correctIndex]}: {question.options[question.correctIndex]}
              </div>
              <p className="text-muted-foreground">{question.explanation}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWhy((w) => !w)}
            aria-expanded={why}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <BookOpen className="size-4" aria-hidden /> Why did I get this?
          </button>
          <button
            type="button"
            ref={nextBtn}
            onClick={onNext}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none active:translate-y-px"
          >
            {nextLabel} <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </motion.div>
    </section>
  );
}

const STEPS = ["Cleaning speech", "Checking reasoning", "Updating model"];

/** Three-step progress shown while the analysis runs (DESIGN.md §5). */
export function AnalysisProgress() {
  const reduce = useReducedMotion();
  return (
    <section className="panel flex flex-col gap-3 p-4" aria-live="polite" aria-label="Analysing">
      <div className="flex flex-wrap items-center gap-3">
        {STEPS.map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : i * 0.3, duration: 0.2 }}
            className="flex items-center gap-2 text-sm"
          >
            <span className="flex size-5 items-center justify-center rounded-full border border-accent/40 font-mono text-[11px] text-accent">{i + 1}</span>
            {s}
            {i < STEPS.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />}
          </motion.span>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="h-36 animate-pulse rounded-lg bg-surface-2 lg:col-span-2" />
        <div className="h-36 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-36 animate-pulse rounded-lg bg-surface-2" />
      </div>
    </section>
  );
}
