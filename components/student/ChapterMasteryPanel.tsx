"use client";

import { Sparkline } from "@/components/shared/Sparkline";
import { DAY_MS } from "@/lib/clock";
import { CHAPTERS, CONCEPTS, type Chapter } from "@/lib/data/concepts";
import { CHAPTER_COLOR } from "@/lib/galaxy/layout";
import type { ConceptMastery } from "@/lib/types";
import { cn, fmt2, masteryColor } from "@/lib/utils";

const POINTS = 8;
const SPAN_DAYS = 21;

/** Concept mastery as of time t: last history point at or before t (else the first known point). */
function pAt(m: ConceptMastery, t: number): number {
  let p = m.history[0]?.p ?? m.p;
  for (const h of m.history) if (h.at <= t) p = h.p;
  return p;
}

function chapterTrend(mastery: Record<string, ConceptMastery>, chapter: Chapter, at: number): number[] {
  const cs = CONCEPTS.filter((c) => c.chapter === chapter);
  return Array.from({ length: POINTS }, (_, i) => {
    const t = at - ((POINTS - 1 - i) / (POINTS - 1)) * SPAN_DAYS * DAY_MS;
    return cs.reduce((s, c) => s + pAt(mastery[c.id], t), 0) / cs.length;
  });
}

export function ChapterMasteryPanel({ mastery, at }: { mastery: Record<string, ConceptMastery>; at: number }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-baseline">
        <h2 className="label-caps">Chapter mastery</h2>
        <span className="ml-auto text-xs text-muted-foreground">21-day trend</span>
      </div>
      <div className="flex flex-col gap-3">
        {CHAPTERS.map((ch) => {
          const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
          const allEstimated = cs.every((c) => mastery[c.id].estimated);
          const mean = cs.reduce((s, c) => s + mastery[c.id].p, 0) / cs.length;
          const trend = chapterTrend(mastery, ch.id, at);
          const delta = trend[trend.length - 1] - trend[0];
          const color = masteryColor(allEstimated ? null : mean);
          const measured = cs.filter((c) => !mastery[c.id].estimated).length;
          return (
            <div key={ch.id} className="grid grid-cols-[52px_1fr_auto_auto] items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs">
                <span className="size-1.5 rounded-full" style={{ background: CHAPTER_COLOR[ch.id] }} />
                {ch.short}
              </span>
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.round(mean * 100)}%`, background: color }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground tabular">
                  {measured}/{cs.length} measured
                </div>
              </div>
              <Sparkline values={allEstimated ? [] : trend} color={color} label={`${ch.short} trend`} />
              <div className="w-14 text-right">
                <div className="font-mono text-sm tabular" style={{ color }}>{fmt2(mean)}</div>
                {!allEstimated && (
                  <div className={cn("font-mono text-[11px] tabular", delta >= 0 ? "text-proficient" : "text-weak")}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
