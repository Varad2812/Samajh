"use client";

import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import type { OptionIndex, Question } from "@/lib/data/questions";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;

interface Props {
  question: Question;
  selected: OptionIndex | null;
  onSelect: (i: OptionIndex) => void;
  /** After grading: reveal correct / chosen-wrong states. */
  revealed?: boolean;
}

export function QuestionCard({ question, selected, onSelect, revealed = false }: Props) {
  const concept = CONCEPT_BY_ID[question.conceptId];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-accent">{concept.id}</span>
        <span className="text-muted-foreground">{concept.name}</span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground" aria-label={`Difficulty ${question.difficulty} of 5`}>
          Difficulty
          {[1, 2, 3, 4, 5].map((d) => (
            <span key={d} className={cn("size-1.5 rounded-full", d <= question.difficulty ? "bg-accent" : "bg-surface-2")} />
          ))}
          <span className="ml-1 font-mono tabular">· {question.elo}</span>
        </span>
      </div>
      <p className="text-base leading-relaxed">{question.stem}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {question.options.map((opt, idx) => {
          const i = idx as OptionIndex;
          const isSel = selected === i;
          const isCorrect = revealed && i === question.correctIndex;
          const isWrong = revealed && isSel && i !== question.correctIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={isSel}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3 text-left text-sm transition-colors duration-150 hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                isSel && "border-accent/60 bg-accent/10",
                isCorrect && "border-mastered/60 bg-mastered/10",
                isWrong && "border-weak/60 bg-weak/10",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-bg font-mono text-xs text-muted-foreground">
                {LETTERS[i]}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
