"use client";

import { useState } from "react";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { CHAPTERS, CONCEPT_BY_ID, type Chapter } from "@/lib/data/concepts";
import { QUESTIONS, type OptionIndex } from "@/lib/data/questions";
import { cn } from "@/lib/utils";

const DIAGNOSTIC_LENGTH = 12;
const CHAPTER_DOT: Record<Chapter, string> = {
  light: "bg-accent",
  eye: "bg-accent-2",
  electricity: "bg-developing",
  magnetism: "bg-weak",
};

/** Opening questions: one per chapter at difficulty 2 (PROJECT.md §4.1). Adaptive steps arrive with the engine. */
const OPENERS = CHAPTERS.map(
  (ch) => QUESTIONS.find((q) => q.difficulty === 2 && CONCEPT_BY_ID[q.conceptId].chapter === ch.id) ?? QUESTIONS[0],
);

export default function DiagnosticPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<OptionIndex | null>(null);
  const question = OPENERS[step % OPENERS.length];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="panel flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="label-caps">Diagnostic</span>
          <span className="font-mono text-muted-foreground tabular">
            {step + 1} / {DIAGNOSTIC_LENGTH}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: DIAGNOSTIC_LENGTH }, (_, i) => {
            const ch = i < OPENERS.length ? CONCEPT_BY_ID[OPENERS[i].conceptId].chapter : null;
            return (
              <span
                key={i}
                className={cn("h-1.5 flex-1 rounded-full", i <= step && ch ? CHAPTER_DOT[ch] : "bg-surface-2", i > step && "opacity-60")}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {CHAPTERS.map((ch) => (
            <span key={ch.id} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", CHAPTER_DOT[ch.id])} /> {ch.short}
            </span>
          ))}
        </div>
      </div>
      <section className="panel flex flex-col gap-4 p-4">
        <QuestionCard key={question.id} question={question} selected={selected} onSelect={setSelected} />
        <div className="flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Reasoning is optional here: tap an answer and continue.</span>
          <button
            type="button"
            disabled={selected === null || step >= OPENERS.length - 1}
            onClick={() => {
              setStep((s) => s + 1);
              setSelected(null);
            }}
            className="ml-auto rounded-lg bg-accent px-3 py-1.5 font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </section>
    </div>
  );
}
