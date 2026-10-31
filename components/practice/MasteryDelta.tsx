"use client";

import { ArrowDown, ArrowRight, ArrowUp, CornerDownRight } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { daysBetween } from "@/lib/clock";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import type { AttemptOutcome } from "@/lib/engine/attempt";
import type { ConceptMastery, ReviewItem } from "@/lib/types";
import { fmt2, masteryBand, masteryColor } from "@/lib/utils";

const round = (n: number) => String(Math.round(n));

interface Props {
  conceptId: string;
  mastery: ConceptMastery;
  theta: number;
  review: ReviewItem | undefined;
  at: number | null;
  outcome: AttemptOutcome | null;
  onProbe?: (conceptId: string) => void;
}

/** "Ohm's law 0.42 → 0.58 ▲", θ before → after, next review, and the root-cause hint. */
export function MasteryDelta({ conceptId, mastery, theta, review, at, outcome, onProbe }: Props) {
  const concept = CONCEPT_BY_ID[conceptId];
  const shown = outcome && outcome.conceptId === conceptId ? outcome : null;
  const p = shown ? shown.after : mastery.p;
  const color = masteryColor(mastery.estimated && !shown ? null : p);
  const up = shown ? shown.after >= shown.before : true;
  const reviewItem = shown ? shown.review : review;
  const dueIn = reviewItem && at !== null ? daysBetween(at, reviewItem.due) : null;
  const root = outcome?.rootCause ?? null;

  return (
    <section className="panel flex flex-col gap-2 p-4" aria-label="Mastery">
      <div className="flex items-baseline gap-2">
        <h3 className="label-caps">Mastery · {conceptId}</h3>
        <span className="ml-auto text-xs" style={{ color }}>
          {mastery.estimated && !shown ? "estimated" : masteryBand(p)}
        </span>
      </div>
      <div className="truncate text-xs text-muted-foreground">{concept.name}</div>
      <div className="flex items-baseline gap-2 font-mono tabular">
        {shown ? (
          <>
            <span className="text-lg text-muted-foreground" style={{ color: masteryColor(shown.before) }}>{fmt2(shown.before)}</span>
            <ArrowRight className="size-4 self-center text-muted-foreground" aria-hidden />
            <AnimatedNumber from={shown.before} to={shown.after} format={fmt2} className="text-title leading-none" style={{ color }} />
            {up ? <ArrowUp className="size-4 self-center text-mastered" aria-label="up" /> : <ArrowDown className="size-4 self-center text-weak" aria-label="down" />}
            <span className={up ? "text-xs text-mastered" : "text-xs text-weak"}>
              {up ? "+" : "−"}
              {fmt2(Math.abs(shown.after - shown.before))}
            </span>
          </>
        ) : (
          <span className="text-title leading-none" style={{ color }}>{fmt2(p)}</span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.round(p * 100)}%`, background: color }} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Ability θ</dt>
        <dd className="text-right font-mono tabular">
          {shown ? (
            <>
              {Math.round(shown.thetaBefore)} → <AnimatedNumber from={shown.thetaBefore} to={shown.theta} format={round} className={shown.theta >= shown.thetaBefore ? "text-mastered" : "text-weak"} />
            </>
          ) : (
            Math.round(theta)
          )}
        </dd>
        <dt className="text-muted-foreground">Next review</dt>
        <dd className="text-right font-mono tabular">{dueIn === null ? "not scheduled" : dueIn <= 0 ? (dueIn < 0 ? `${-dueIn}d overdue` : "today") : `in ${dueIn} day${dueIn === 1 ? "" : "s"}`}</dd>
        {reviewItem && (
          <>
            <dt className="text-muted-foreground">SM-2</dt>
            <dd className="text-right font-mono text-muted-foreground tabular">EF {reviewItem.ef.toFixed(2)} · {reviewItem.interval}d</dd>
          </>
        )}
      </dl>
      {root && (
        <button
          type="button"
          onClick={() => onProbe?.(root.conceptId)}
          className="mt-1 flex items-start gap-2 rounded-lg border border-developing/30 bg-developing/10 p-2.5 text-left text-xs transition-colors hover:border-developing/60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-developing" aria-hidden />
          <span>
            <span className="font-medium text-developing">Root cause: likely {root.conceptId}</span> {CONCEPT_BY_ID[root.conceptId]?.name}
            <span className="block text-muted-foreground">
              {root.via === "misconception" ? `${root.misconceptionId} lives there; the next question probes it.` : "A weak prerequisite; the next question probes it."}
            </span>
          </span>
        </button>
      )}
    </section>
  );
}
