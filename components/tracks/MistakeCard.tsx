"use client";

import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Lightbulb, MessageSquareQuote, X } from "lucide-react";
import type { Mistake } from "@/lib/tracks/score";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

interface Props {
  mistake: Mistake;
  index: number;
  total: number;
  unitColor?: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

/** One wrong answer, overlaid on the 3D galaxy while the camera sits on its topic. */
export function MistakeCard({ mistake, index, total, unitColor, onPrev, onNext, onClose }: Props) {
  const { question: q, answer: a, topicName } = mistake;
  const picked = a.selectedIndex;
  const why = picked !== null ? q.distractorWhy[picked] : "";

  return (
    <motion.aside
      key={q.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute top-3 right-3 bottom-3 z-20 flex w-[min(360px,calc(100%-24px))] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface/92 p-4 shadow-highlight backdrop-blur-md"
      aria-label={`Mistake ${index + 1} of ${total}`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-weak/15 px-2 py-0.5 font-mono text-weak tabular">
          Mistake {index + 1}/{total}
        </span>
        <span className="truncate font-mono" style={{ color: unitColor }}>
          {q.topicId}
        </span>
        <button onClick={onClose} aria-label="Close mistake" className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <X className="size-4" />
        </button>
      </div>
      <h3 className="text-sm font-semibold">{topicName}</h3>
      <p className="text-sm leading-relaxed">{q.stem}</p>

      <ul className="flex flex-col gap-1.5">
        {q.options.map((opt, i) => {
          const correct = i === q.correctIndex;
          const mine = i === picked;
          return (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
                correct ? "border-proficient/50 bg-proficient/10" : mine ? "border-weak/50 bg-weak/10" : "border-border text-muted-foreground",
              )}
            >
              <span className="font-mono">{LETTERS[i]}</span>
              <span className="flex-1">{opt}</span>
              {correct && <Check className="size-3.5 shrink-0 text-proficient" aria-label="Correct answer" />}
              {mine && !correct && <X className="size-3.5 shrink-0 text-weak" aria-label="Your answer" />}
            </li>
          );
        })}
      </ul>
      {picked === null && <p className="text-xs text-developing">You skipped this one.</p>}

      {why && (
        <div className="rounded-lg border border-misconception/30 bg-misconception/10 p-2.5 text-xs">
          <div className="mb-0.5 font-medium text-misconception">Why that option is tempting</div>
          {why}
        </div>
      )}
      <div className="rounded-lg bg-surface-2 p-2.5 text-xs leading-relaxed">
        <div className="mb-0.5 flex items-center gap-1 font-medium text-proficient">
          <Lightbulb className="size-3.5" aria-hidden /> The idea
        </div>
        {q.explanation}
      </div>
      {a.reasoning && (
        <div className="rounded-lg border border-border p-2.5 text-xs text-muted-foreground">
          <div className="mb-0.5 flex items-center gap-1 font-medium text-foreground">
            <MessageSquareQuote className="size-3.5" aria-hidden /> What you said
          </div>
          <span className="italic">&ldquo;{a.reasoning}&rdquo;</span>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
        <button onClick={onPrev} disabled={total < 2} className="flex h-8 items-center justify-center gap-1 rounded-lg border border-border text-xs hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-40">
          <ChevronLeft className="size-3.5" aria-hidden /> Previous
        </button>
        <button onClick={onNext} disabled={total < 2} className="flex h-8 items-center justify-center gap-1 rounded-lg bg-accent text-xs font-medium text-bg hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-40">
          Next mistake <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </motion.aside>
  );
}
