"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";

interface Props {
  misconceptionId: string | null;
  novelDescription?: string | null;
  evidenceQuote?: string | null;
  /** The detection came from the tapped distractor rather than the speech. */
  fromOption?: string | null;
  cleared?: boolean;
}

/** Violet card: wrong belief → correct idea, with the verbatim evidence quote from the student's speech. */
export function MisconceptionCard({ misconceptionId, novelDescription, evidenceQuote, fromOption, cleared }: Props) {
  const mc = misconceptionId ? MISCONCEPTION_BY_ID[misconceptionId] : undefined;
  if (cleared && mc) {
    return (
      <section className="panel flex items-center gap-3 border-mastered/30 bg-mastered/5 p-4 text-sm">
        <Sparkles className="size-4 shrink-0 text-mastered" aria-hidden />
        <span>
          <span className="font-mono text-mastered">{mc.id}</span> {mc.label} cleared: two sound answers in a row. The satellite shatters.
        </span>
      </section>
    );
  }
  if (!mc && !novelDescription) return null;
  return (
    <section className="panel flex flex-col gap-3 border-misconception/30 bg-misconception/5 p-4" aria-label="Misconception detected">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-misconception/15 px-2 py-0.5 font-mono text-xs text-misconception">{mc?.id ?? "Novel"}</span>
        <h3 className="font-display text-base font-semibold text-misconception">{mc?.label ?? "Possible misconception"}</h3>
        {mc && (
          <span className="ml-auto text-xs text-muted-foreground">
            lives in <span className="font-mono text-foreground">{mc.conceptId}</span> {CONCEPT_BY_ID[mc.conceptId]?.name}
          </span>
        )}
      </div>
      <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg border border-weak/20 bg-weak/5 p-3 text-sm">
          <div className="label-caps mb-1 text-weak">What you believed</div>
          {mc?.wrongBelief ?? novelDescription}
        </div>
        <ArrowRight className="mx-auto size-4 rotate-90 text-muted-foreground md:rotate-0" aria-hidden />
        <div className="rounded-lg border border-mastered/20 bg-mastered/5 p-3 text-sm">
          <div className="label-caps mb-1 text-mastered">What really happens</div>
          {mc?.correctIdea ?? "Compare your claim with the explanation below."}
        </div>
      </div>
      {evidenceQuote ? (
        <blockquote className="border-l-2 border-misconception pl-3 font-mono text-[13px] text-muted-foreground">
          &ldquo;{evidenceQuote}&rdquo;
          <span className="ml-2 text-[11px] not-italic">(from your words)</span>
        </blockquote>
      ) : (
        fromOption && <p className="text-xs text-muted-foreground">Option {fromOption} is the answer this belief leads to.</p>
      )}
    </section>
  );
}
