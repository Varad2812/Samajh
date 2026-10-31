"use client";

import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { MisconceptionStat } from "@/lib/teacher/stats";
import { cn, pct } from "@/lib/utils";

interface Props {
  stats: MisconceptionStat[];
  size: number;
  active: string | null;
  onSelect: (id: string | null) => void;
}

/** Misconception leaderboard: horizontal bars (% of students). Click a bar to filter the heatmap. */
export function MisconceptionChart({ stats, size, active, onSelect }: Props) {
  const max = Math.max(0.01, ...stats.map((s) => s.rate));
  return (
    <section className="panel flex flex-col gap-3 p-4" aria-label="Misconception leaderboard">
      <div className="flex items-baseline gap-2">
        <h2 className="label-caps">Misconception leaders</h2>
        <span className="ml-auto text-xs text-muted-foreground">% of {size} students</span>
      </div>
      <ul className="flex flex-col gap-1">
        {stats.slice(0, 8).map((s, i) => {
          const mc = MISCONCEPTION_BY_ID[s.id];
          const on = active === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(on ? null : s.id)}
                aria-pressed={on}
                title={`${mc.wrongBelief} Click to filter the heatmap.`}
                className={cn(
                  "grid w-full grid-cols-[18px_44px_minmax(0,1fr)_72px] items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                  on && "border-misconception/40 bg-misconception/10",
                )}
              >
                <span className="font-mono text-muted-foreground tabular">{i + 1}</span>
                <span className="font-mono text-misconception">{s.id}</span>
                <span className="min-w-0">
                  <span className="block truncate">{mc.label}</span>
                  <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-misconception transition-[width] duration-300" style={{ width: `${(s.rate / max) * 100}%`, opacity: on ? 1 : 0.75 }} />
                  </span>
                </span>
                <span className="text-right font-mono tabular">
                  {pct(s.rate)} <span className="text-muted-foreground">({s.count})</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">{active ? "Filtering the heatmap. Click again to clear." : "Click a bar to filter the heatmap to students holding it."}</p>
    </section>
  );
}
