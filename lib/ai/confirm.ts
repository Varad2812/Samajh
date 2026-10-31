/** Apply the "Did you mean?" step (PROJECT.md §5.5) to an analysis: chosen readings, MathLive edits, term edits. */
import { evaluateReading, latexToMathjs } from "@/lib/engine/mathEval";
import type { AttemptEdit } from "@/lib/types";
import type { AnalysisResult } from "./schemas";

export interface ConfirmChoices {
  /** Equation index → chosen reading index (into [primary, ...alternatives]). */
  readings: Record<number, number>;
  /** Equation index → edited LaTeX. */
  equationEdits: Record<number, string>;
  /** Normalized-term index → edited "meant" text. */
  termEdits: Record<number, string>;
}

export const NO_CHOICES: ConfirmChoices = { readings: {}, equationEdits: {}, termEdits: {} };

/** Anything for the student to confirm? */
export const needsConfirmation = (a: AnalysisResult) => a.equations.length > 0 || a.normalizedTerms.length > 0;

export function applyConfirmations(analysis: AnalysisResult, choices: ConfirmChoices): { analysis: AnalysisResult; edits: AttemptEdit[] } {
  const edits: AttemptEdit[] = [];
  const equations = analysis.equations.map((eq, i) => {
    const edited = choices.equationEdits[i];
    if (edited !== undefined && edited.trim() && edited !== eq.latex) {
      edits.push({ kind: "equation", from: eq.latex, to: edited });
      const mathjs = latexToMathjs(edited);
      return { ...eq, latex: edited, mathjs, alternatives: [], values: [evaluateReading(mathjs)], pickedIndex: 0, needsChoice: false };
    }
    const pick = choices.readings[i];
    if (pick !== undefined && pick !== eq.pickedIndex) {
      edits.push({ kind: "reading", from: String(eq.pickedIndex ?? "none"), to: String(pick) });
      return { ...eq, pickedIndex: pick, needsChoice: false };
    }
    // "✓ all" with an unresolved ambiguity accepts the first (most likely) reading.
    return eq.needsChoice ? { ...eq, pickedIndex: 0, needsChoice: false } : eq;
  });
  const normalizedTerms = analysis.normalizedTerms.map((t, i) => {
    const edited = choices.termEdits[i];
    if (edited === undefined || !edited.trim() || edited === t.meant) return t;
    edits.push({ kind: "term", from: t.meant, to: edited });
    return { ...t, meant: edited };
  });
  return { analysis: { ...analysis, equations, normalizedTerms }, edits };
}
