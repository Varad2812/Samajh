"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { markTranscript, type Mark } from "@/lib/ai/transcriptMarks";
import type { AnalysisResult, EvaluatedEquation } from "@/lib/ai/schemas";
import { Tex } from "@/components/shared/Tex";
import { cn } from "@/lib/utils";

const MARK_CLASS: Record<Mark, string> = {
  filler: "text-muted-foreground/70 line-through",
  hedge: "underline decoration-dotted decoration-muted-foreground underline-offset-4",
  marker: "rounded-sm bg-developing/20 text-developing px-0.5",
  retracted: "rounded-sm bg-developing/10 line-through decoration-developing/70",
  evidence: "underline decoration-misconception decoration-2 underline-offset-4",
};
const MARK_TITLE: Partial<Record<Mark, string>> = {
  filler: "filler",
  hedge: "hedge",
  marker: "self-correction",
  retracted: "retracted (the last self-correction wins)",
  evidence: "evidence for the misconception",
};

const fmtValue = (v: number | null) => (v === null ? null : Number(v.toPrecision(4)).toString());

/** The reading the student confirmed (or the auto-pick), with its math.js value. */
export function chosenReading(eq: EvaluatedEquation) {
  const readings = [{ latex: eq.latex, mathjs: eq.mathjs }, ...eq.alternatives];
  const i = eq.pickedIndex ?? 0;
  return { ...readings[i], value: eq.values[i] ?? null };
}

/** A spoken-maths chip: the phrase in small mono above, the KaTeX rendering (with its computed value) below. */
export function EquationChip({ eq }: { eq: EvaluatedEquation }) {
  const r = chosenReading(eq);
  const value = fmtValue(r.value);
  return (
    <span className="inline-flex flex-col gap-0.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
      <span className="font-mono text-[11px] text-muted-foreground">&ldquo;{eq.spoken}&rdquo;</span>
      <span className="flex items-baseline gap-1.5 text-sm">
        <Tex latex={r.latex} />
        {value !== null && !r.latex.includes("=") && (
          <>
            <span className="text-muted-foreground">=</span>
            <span className="font-mono tabular text-accent">{value}</span>
          </>
        )}
      </span>
      {eq.meaning && <span className="text-[11px] text-muted-foreground">{eq.meaning}</span>}
    </span>
  );
}

export function TranscriptDiff({ raw, analysis }: { raw: string; analysis: AnalysisResult }) {
  const segments = useMemo(
    () =>
      markTranscript(raw, {
        fillers: analysis.fillers,
        hedges: analysis.hedges,
        retracted: analysis.selfCorrections.map((c) => c.from),
        evidenceQuote: analysis.misconception?.evidenceQuote ?? null,
      }),
    [raw, analysis],
  );

  return (
    <section className="panel flex min-w-0 flex-col gap-3 p-4" aria-label="Transcript diff">
      <h3 className="label-caps">Transcript diff</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-xs text-muted-foreground">Raw (what you said)</div>
          <p className="rounded-lg bg-surface-2 p-3 font-mono text-[13px] leading-relaxed break-words">
            {raw.trim() ? (
              segments.map((s, i) => (
                <span key={i} className={cn(s.marks.map((m) => MARK_CLASS[m]))} title={s.marks.map((m) => MARK_TITLE[m]).filter(Boolean).join(" · ") || undefined}>
                  {s.text}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">No reasoning given. Confidence is neutral (0.60).</span>
            )}
          </p>
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-xs text-muted-foreground">Cleaned (what you meant)</div>
          <div className="rounded-lg border border-accent/15 bg-accent/5 p-3 text-sm leading-relaxed">
            {analysis.cleanedReasoning || <span className="text-muted-foreground">Nothing to clean.</span>}
            {analysis.claims.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted-foreground">
                {analysis.claims.map((c, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-accent">•</span> {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {analysis.selfCorrections.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {analysis.selfCorrections.map((c, i) => (
            <li key={i} className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-developing/10 px-2 py-0.5 text-developing line-through decoration-developing/60">{c.from || "…"}</span>
              <ArrowRight className="size-3 text-developing" aria-hidden />
              <span className="rounded-full bg-developing/15 px-2 py-0.5 text-developing">{c.to || "…"}</span>
            </li>
          ))}
        </ul>
      )}

      {analysis.equations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {analysis.equations.map((eq, i) => (
            <EquationChip key={i} eq={eq} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground" aria-label="Legend">
        <span><span className="line-through">umm</span> filler</span>
        <span><span className="rounded-sm bg-developing/20 px-0.5 text-developing">wait no</span> self-correction</span>
        <span><span className="underline decoration-dotted underline-offset-4">I think</span> hedge</span>
        <span><span className="underline decoration-misconception decoration-2 underline-offset-4">quote</span> evidence</span>
      </div>
    </section>
  );
}
