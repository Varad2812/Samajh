"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ConfidenceDetail } from "@/lib/ai/schemas";
import { fmt2, masteryColor } from "@/lib/utils";

const R = 52;
const ARC = Math.PI * R;

/** Semicircular gauge + the reasons behind the number ("2 self-corrections, 3 hedges"). */
export function ConfidenceMeter({ value, detail, fromModel }: { value: number; detail: ConfidenceDetail; fromModel: boolean }) {
  const reduce = useReducedMotion();
  const color = masteryColor(value);
  const label = value >= 0.75 ? "Confident" : value >= 0.5 ? "Somewhat sure" : "Unsure";
  return (
    <section className="panel flex flex-col gap-2 p-4" aria-label={`Confidence ${fmt2(value)}`}>
      <h3 className="label-caps">Confidence</h3>
      <div className="relative mx-auto h-[70px] w-[124px]">
        <svg viewBox="0 0 124 70" className="absolute inset-0" aria-hidden>
          <path d="M 10 62 A 52 52 0 0 1 114 62" fill="none" stroke="var(--surface-2)" strokeWidth="9" strokeLinecap="round" />
          <motion.path
            d="M 10 62 A 52 52 0 0 1 114 62"
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={ARC}
            initial={{ strokeDashoffset: ARC }}
            animate={{ strokeDashoffset: ARC * (1 - value) }}
            transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="font-mono text-xl leading-none tabular" style={{ color }}>
            {fmt2(value)}
          </div>
        </div>
      </div>
      <div className="text-center text-xs" style={{ color }}>
        {label}
      </div>
      <ul className="flex flex-col gap-0.5 border-t border-border pt-2 text-xs text-muted-foreground">
        {detail.reasons.map((r) => (
          <li key={r} className="flex gap-1.5">
            <span className="text-developing">•</span> {r}
          </li>
        ))}
      </ul>
      <p className="font-mono text-[11px] text-muted-foreground tabular">
        {fromModel ? `0.6·AI + 0.4·baseline (${fmt2(detail.baseline)})` : `baseline ${fmt2(detail.baseline)} (offline)`}
      </p>
    </section>
  );
}
