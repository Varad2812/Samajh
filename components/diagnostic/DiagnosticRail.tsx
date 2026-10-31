import { Check, X } from "lucide-react";
import { CHAPTERS, CONCEPT_BY_ID, type Chapter } from "@/lib/data/concepts";
import type { Question } from "@/lib/data/questions";
import { DIAGNOSTIC_LENGTH } from "@/lib/engine/diagnostic";
import { CHAPTER_COLOR } from "@/lib/galaxy/layout";
import { cn } from "@/lib/utils";

interface Props {
  /** Questions asked so far (answered), with correctness. */
  done: { question: Question; correct: boolean }[];
  current: Question | null;
}

/** 12-step progress rail in chapter colours; answered steps carry ✓ / ✗. */
export function DiagnosticRail({ done, current }: Props) {
  const color = (ch: Chapter) => CHAPTER_COLOR[ch];
  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-12 gap-1" aria-label={`Step ${Math.min(done.length + 1, DIAGNOSTIC_LENGTH)} of ${DIAGNOSTIC_LENGTH}`}>
        {Array.from({ length: DIAGNOSTIC_LENGTH }, (_, i) => {
          const d = done[i];
          const q = d?.question ?? (i === done.length ? current : null);
          const ch = q ? CONCEPT_BY_ID[q.conceptId].chapter : null;
          const isCurrent = i === done.length;
          return (
            <li key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn("h-1.5 w-full rounded-full bg-surface-2 transition-colors", isCurrent && "animate-pulse")}
                style={ch ? { background: color(ch), opacity: d ? 1 : 0.55 } : undefined}
              />
              <span className="flex h-4 items-center font-mono text-[10px] text-muted-foreground tabular">
                {d ? d.correct ? <Check className="size-3 text-mastered" aria-label="correct" /> : <X className="size-3 text-weak" aria-label="wrong" /> : i + 1}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {CHAPTERS.map((ch) => (
          <span key={ch.id} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: color(ch.id) }} /> {ch.short}
          </span>
        ))}
      </div>
    </div>
  );
}
