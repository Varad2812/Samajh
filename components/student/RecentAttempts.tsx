"use client";

import { daysBetween } from "@/lib/clock";
import { QUESTION_BY_ID } from "@/lib/data/questions";
import type { Attempt, Verdict } from "@/lib/types";
import { fmt2 } from "@/lib/utils";

const VERDICT: Record<Verdict, { label: string; color: string }> = {
  correct_sound: { label: "sound", color: "var(--mastered)" },
  correct_flawed: { label: "flawed", color: "var(--developing)" },
  incorrect: { label: "wrong", color: "var(--weak)" },
};

export function RecentAttempts({ attempts, at, onFocus }: { attempts: Attempt[]; at: number; onFocus: (id: string) => void }) {
  const recent = [...attempts].sort((a, b) => b.at - a.at).slice(0, 6);
  return (
    <section className="panel p-4">
      <div className="mb-2 flex items-baseline">
        <h2 className="label-caps">Recent attempts</h2>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular">{attempts.length} total</span>
      </div>
      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground">Your answers and how confidently you reasoned will appear here.</p>
      ) : (
        <ul className="flex flex-col">
          {recent.map((a) => {
            const v = VERDICT[a.verdict];
            const ago = daysBetween(a.at, at);
            return (
              <li key={a.id}>
                <button
                  onClick={() => onFocus(a.conceptId)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors hover:bg-surface-2"
                >
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: v.color }} />
                  <span className="w-8 shrink-0 font-mono text-muted-foreground">{a.conceptId}</span>
                  <span className="min-w-0 truncate">{QUESTION_BY_ID[a.questionId]?.stem ?? a.questionId}</span>
                  <span className="ml-auto shrink-0 font-mono tabular" style={{ color: v.color }}>{v.label}</span>
                  <span className="w-8 shrink-0 text-right font-mono text-muted-foreground tabular">{fmt2(a.confidence)}</span>
                  <span className="w-7 shrink-0 text-right font-mono text-muted-foreground tabular">{ago <= 0 ? "now" : `${ago}d`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
