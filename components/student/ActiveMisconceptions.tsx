"use client";

import { MISCONCEPTION_BY_ID, MISCONCEPTIONS } from "@/lib/data/misconceptions";
import type { Attempt } from "@/lib/types";

interface Props {
  active: string[];
  attempts: Attempt[];
  onFocus: (conceptId: string) => void;
}

export function ActiveMisconceptions({ active, attempts, onFocus }: Props) {
  const seen = attempts.reduce<Record<string, number>>((acc, a) => {
    if (a.misconceptionId) acc[a.misconceptionId] = (acc[a.misconceptionId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-baseline">
        <h2 className="label-caps">Active misconceptions</h2>
        <span className="ml-auto font-mono text-xs text-misconception tabular">{active.length}</span>
      </div>
      {active.length === 0 ? (
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          None detected yet. When your spoken reasoning reveals one, it appears here and orbits its star. Common in this class:
          {MISCONCEPTIONS.filter((m) => ["MC01", "MC03", "MC13"].includes(m.id)).map((m) => (
            <button key={m.id} onClick={() => onFocus(m.conceptId)} className="flex gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-left hover:text-foreground">
              <span className="font-mono text-misconception">{m.id}</span>
              {m.wrongBelief}
            </button>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((id) => {
            const m = MISCONCEPTION_BY_ID[id];
            return (
              <li key={id}>
                <button
                  onClick={() => onFocus(m.conceptId)}
                  className="w-full rounded-lg border border-misconception/25 bg-misconception/5 p-2.5 text-left transition-colors hover:border-misconception/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full bg-misconception/15 px-2 py-0.5 font-mono text-xs text-misconception">{id}</span>
                    <span className="truncate">{m.label}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground tabular">
                      {m.conceptId} ×{seen[id] ?? 0}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    <span className="line-through decoration-weak/60">{m.wrongBelief}</span>
                    <span className="mx-1 text-foreground">→</span>
                    <span className="text-foreground/90">{m.correctIdea}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
