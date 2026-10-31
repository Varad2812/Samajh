"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { at: 0, label: "Reading what you want to study" },
  { at: 4, label: "Mapping units, topics and prerequisites" },
  { at: 10, label: "Writing questions" },
  { at: 18, label: "Turning common mistakes into answer options" },
  { at: 28, label: "Putting your test together" },
];

/** Shown while the test is being written (usually 15-60 s). Steps advance on a timer; the last one waits for the reply. */
export function GeneratingSteps({ subject, standard, count }: { subject: string; standard: string; count: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed((Date.now() - t0) / 1000), 500);
    return () => window.clearInterval(id);
  }, []);
  const current = STEPS.findLastIndex((s) => elapsed >= s.at);

  return (
    <div className="starfield-loading relative flex min-h-[420px] flex-col justify-center gap-6 overflow-hidden rounded-xl border border-border p-6" role="status" aria-live="polite">
      <div>
        <p className="label-caps">Building your test</p>
        <h2 className="mt-1 font-display text-xl font-semibold">
          {count} questions · {subject} · Class {standard}
        </h2>
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s.label} className={cn("flex items-center gap-3 text-sm transition-opacity", i > current && "opacity-40")}>
            <span className={cn("flex size-6 items-center justify-center rounded-full border", i < current ? "border-proficient bg-proficient/15 text-proficient" : "border-border")}>
              {i < current ? <Check className="size-3.5" aria-hidden /> : i === current ? <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden /> : null}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
      <p className="font-mono text-xs text-muted-foreground tabular">{Math.floor(elapsed)} s · usually 15–60 s</p>
    </div>
  );
}
