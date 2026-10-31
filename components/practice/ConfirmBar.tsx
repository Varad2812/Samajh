"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCheck, Pencil } from "lucide-react";
import { Tex } from "@/components/shared/Tex";
import { applyConfirmations, type ConfirmChoices } from "@/lib/ai/confirm";
import type { AnalysisResult, EvaluatedEquation } from "@/lib/ai/schemas";
import type { AttemptEdit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MathEdit } from "./MathEdit";

const fmt = (v: number | null) => (v === null ? "—" : String(Number(v.toPrecision(5))));
const chip = "flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs transition-colors";
const iconBtn =
  "flex size-6 items-center justify-center rounded-full border border-border bg-surface hover:border-accent/50 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

interface Props {
  analysis: AnalysisResult;
  onConfirm: (patched: AnalysisResult, edits: AttemptEdit[]) => void;
}

/** "Did you mean?": spoken maths as KaTeX chips and normalized terms, each ✓ / ✎, A-or-B for ambiguous readings. */
export function ConfirmBar({ analysis, onConfirm }: Props) {
  const [choices, setChoices] = useState<ConfirmChoices>({ readings: {}, equationEdits: {}, termEdits: {} });
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [termDraft, setTermDraft] = useState("");

  const accept = (key: string) => setAccepted((s) => new Set(s).add(key));
  const confirmAll = () => {
    const { analysis: patched, edits } = applyConfirmations(analysis, choices);
    onConfirm(patched, edits);
  };

  const renderEquation = (eq: EvaluatedEquation, i: number) => {
    const key = `eq${i}`;
    const editedLatex = choices.equationEdits[i];
    if (editing === key) {
      return (
        <div key={key} className="w-full">
          <MathEdit
            latex={editedLatex ?? eq.latex}
            onCancel={() => setEditing(null)}
            onSave={(latex) => {
              setChoices((c) => ({ ...c, equationEdits: { ...c.equationEdits, [i]: latex } }));
              accept(key);
              setEditing(null);
            }}
          />
        </div>
      );
    }
    const readings = [{ latex: eq.latex, mathjs: eq.mathjs }, ...eq.alternatives];
    if (readings.length > 1 && editedLatex === undefined) {
      const picked = choices.readings[i] ?? eq.pickedIndex;
      return (
        <div key={key} className="flex w-full flex-col gap-1.5 rounded-lg border border-developing/30 bg-developing/5 p-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">&ldquo;{eq.spoken}&rdquo;</span>
            <span className="text-developing">{eq.pickedIndex === null ? "Did you mean A or B?" : "Two readings. Check the grouping."}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Reading of "${eq.spoken}"`}>
            {readings.map((r, k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={picked === k}
                onClick={() => setChoices((c) => ({ ...c, readings: { ...c.readings, [i]: k } }))}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-left transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                  picked === k && "border-accent/60 bg-accent/10",
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-bg font-mono text-xs text-muted-foreground">{"AB"[k] ?? k + 1}</span>
                <Tex latex={r.latex} className="min-w-0 overflow-x-auto" />
                <span className="ml-auto shrink-0 font-mono text-xs text-accent tabular">= {fmt(eq.values[k] ?? null)}</span>
                {eq.pickedIndex === k && <span className="shrink-0 rounded-full bg-mastered/15 px-1.5 py-0.5 text-[10px] text-mastered">matches what you said</span>}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setEditing(key)} className="self-start text-xs text-muted-foreground hover:text-accent">
            ✎ Neither, let me type it
          </button>
        </div>
      );
    }
    const latex = editedLatex ?? eq.latex;
    return (
      <span key={key} className={cn(chip, "flex-col items-start gap-0.5 rounded-lg py-1.5", accepted.has(key) && "border-mastered/40")}>
        <span className="font-mono text-[11px] text-muted-foreground">&ldquo;{eq.spoken}&rdquo;</span>
        <span className="flex items-center gap-2">
          <Tex latex={latex} className="text-sm" />
          {eq.values[0] !== null && editedLatex === undefined && !latex.includes("=") && <span className="font-mono text-accent tabular">= {fmt(eq.values[0])}</span>}
          <button type="button" className={iconBtn} aria-label="Accept" onClick={() => accept(key)}>
            <Check className="size-3" aria-hidden />
          </button>
          <button type="button" className={iconBtn} aria-label="Edit equation" onClick={() => setEditing(key)}>
            <Pencil className="size-3" aria-hidden />
          </button>
        </span>
      </span>
    );
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="panel flex flex-col gap-3 border-accent/25 p-4"
      aria-label="Did you mean"
    >
      <div className="flex items-center gap-2">
        <h3 className="label-caps text-accent">Did you mean?</h3>
        <span className="text-xs text-muted-foreground">One tap to confirm what we heard, before we grade it.</span>
        <button
          type="button"
          onClick={confirmAll}
          autoFocus
          className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-bg hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
        >
          <CheckCheck className="size-4" aria-hidden /> ✓ all
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {analysis.equations.map(renderEquation)}
        {analysis.normalizedTerms.map((t, i) => {
          // Spoken maths already has its own KaTeX chip above.
          if (analysis.equations.some((eq) => eq.spoken.toLowerCase() === t.heard.toLowerCase())) return null;
          const key = `t${i}`;
          const meant = choices.termEdits[i] ?? t.meant;
          if (editing === key) {
            return (
              <form
                key={key}
                className={cn(chip, "border-accent/40")}
                onSubmit={(e) => {
                  e.preventDefault();
                  setChoices((c) => ({ ...c, termEdits: { ...c.termEdits, [i]: termDraft } }));
                  accept(key);
                  setEditing(null);
                }}
              >
                <span className="text-muted-foreground line-through">{t.heard}</span>
                <ArrowRight className="size-3" aria-hidden />
                <input autoFocus value={termDraft} onChange={(e) => setTermDraft(e.target.value)} onBlur={() => setEditing(null)} className="w-28 bg-transparent font-mono outline-none" aria-label={`Correct "${t.heard}"`} />
              </form>
            );
          }
          return (
            <span key={key} className={cn(chip, accepted.has(key) && "border-mastered/40")}>
              <span className="text-muted-foreground line-through">{t.heard}</span>
              <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
              <span className="font-mono">{meant}</span>
              <button type="button" className={iconBtn} aria-label={`Accept ${meant}`} onClick={() => accept(key)}>
                <Check className="size-3" aria-hidden />
              </button>
              <button
                type="button"
                className={iconBtn}
                aria-label={`Edit ${meant}`}
                onClick={() => {
                  setTermDraft(meant);
                  setEditing(key);
                }}
              >
                <Pencil className="size-3" aria-hidden />
              </button>
            </span>
          );
        })}
      </div>
    </motion.section>
  );
}
