"use client";

import { CornerDownRight, FileText } from "lucide-react";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import type { WeakConcept } from "@/lib/teacher/stats";
import { cn, fmt2, masteryColor } from "@/lib/utils";

interface Props {
  weakest: WeakConcept[];
  size: number;
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
  onWorksheet: (w: WeakConcept) => void;
  onMcFilter: (id: string) => void;
}

/** Weakest concepts by class mean, each with its likely root-cause prerequisite and a worksheet button. */
export function WeakestConcepts({ weakest, size, highlighted, onHighlight, onWorksheet, onMcFilter }: Props) {
  return (
    <section className="panel flex flex-col gap-2 p-4" aria-label="Weakest concepts">
      <div className="flex items-baseline gap-2">
        <h2 className="label-caps">Weakest concepts</h2>
        <span className="ml-auto text-xs text-muted-foreground">class mean</span>
      </div>
      <ol className="flex flex-col divide-y divide-border/60">
        {weakest.map((w, i) => {
          const c = CONCEPT_BY_ID[w.conceptId];
          const color = masteryColor(w.mean);
          const root = w.rootCause ? CONCEPT_BY_ID[w.rootCause] : null;
          return (
            <li
              key={w.conceptId}
              onPointerEnter={() => onHighlight(w.conceptId)}
              onPointerLeave={() => onHighlight(null)}
              className={cn("flex flex-col gap-1.5 py-2 transition-colors", highlighted === w.conceptId && "bg-surface-2/60")}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 font-mono text-xs text-muted-foreground tabular">{i + 1}</span>
                <span className="font-mono text-xs" style={{ color }}>{w.conceptId}</span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="font-mono tabular" style={{ color }}>{fmt2(w.mean)}</span>
              </div>
              <div className="ml-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono tabular">{w.weakCount}/{size} below .40</span>
                {root && (
                  <span className="flex items-center gap-1 text-developing">
                    <CornerDownRight className="size-3" aria-hidden /> root: <span className="font-mono">{root.id}</span> {root.name}
                  </span>
                )}
                {w.misconceptions.map((m) => (
                  <button key={m.id} type="button" onClick={() => onMcFilter(m.id)} title="Filter the heatmap" className="rounded-full bg-misconception/15 px-1.5 font-mono text-[10px] text-misconception hover:bg-misconception/25 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                    {m.id} ×{m.count}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onWorksheet(w)}
                  className="ml-auto flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-foreground transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <FileText className="size-3" aria-hidden /> Worksheet
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
