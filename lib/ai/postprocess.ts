/**
 * Turns a raw analysis (from the model or the offline analyzer) into the final result.
 * Code, not the model, owns: verdict consistency, verbatim evidence quotes, every number (math.js), and confidence.
 */
import { scoreConfidence } from "@/lib/engine/confidence";
import { evaluateReading, isParsable, latexToMathjs, mathjsToLatex, relativelyClose, RESULT_TOLERANCE } from "@/lib/engine/mathEval";
import type { AnalysisAI, AnalysisResult, AnalyzeRequest, EquationAI, EvaluatedEquation, Reading } from "./schemas";

const words = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];

/** A quote the model returned → the matching text copied verbatim from the raw transcript, or null. */
export function verbatimQuote(quote: string, raw: string): string | null {
  const q = quote.trim().replace(/^["“']+|["”']+$/g, "").trim();
  if (!q) return null;
  const at = raw.toLowerCase().indexOf(q.toLowerCase());
  if (at >= 0) return raw.slice(at, at + q.length);
  // Model lightly paraphrased / re-punctuated it: take the raw clause that shares the most words.
  const qw = new Set(words(q));
  let best: { text: string; score: number } | null = null;
  for (const clause of raw.split(/(?<=[.!?…,])\s+|\n/)) {
    const cw = words(clause);
    if (!cw.length) continue;
    const score = cw.filter((w) => qw.has(w)).length / qw.size;
    if (!best || score > best.score) best = { text: clause.trim(), score };
  }
  return best && best.score >= 0.6 ? best.text.replace(/^[\s,]+|[\s,]+$/g, "") : null;
}

/** Which option the student said aloud ("B", "option c", or the option's text), or null. */
export function spokenOptionIndex(stated: string | null, options: readonly string[]): number | null {
  if (!stated) return null;
  const letter = /^(?:option\s+)?([abcd])\b\.?$/i.exec(stated.trim());
  if (letter) return "abcd".indexOf(letter[1].toLowerCase());
  const s = stated.trim().toLowerCase();
  const idx = options.findIndex((o) => o.trim().toLowerCase() === s);
  return idx >= 0 ? idx : null;
}

function evaluateEquation(eq: EquationAI): EvaluatedEquation {
  const fixup = (r: Reading): Reading | null => {
    let mathjs = r.mathjs.trim();
    if (!mathjs || !isParsable(mathjs)) mathjs = r.latex ? latexToMathjs(r.latex) : "";
    if (!mathjs || !isParsable(mathjs)) return null;
    return { mathjs, latex: r.latex || mathjsToLatex(mathjs) };
  };
  const primary = fixup(eq) ?? { mathjs: "", latex: eq.latex };
  const alternatives = eq.alternatives.map(fixup).filter((r): r is Reading => r !== null && r.mathjs !== primary.mathjs);
  const readings = [primary, ...alternatives];
  const values = readings.map((r) => (r.mathjs ? evaluateReading(r.mathjs) : null));

  let pickedIndex: number | null = null;
  if (readings.length === 1) pickedIndex = 0;
  else if (eq.spokenResult !== null) {
    let bestGap = Infinity;
    values.forEach((v, i) => {
      if (v === null || !relativelyClose(v, eq.spokenResult as number, RESULT_TOLERANCE)) return;
      const gap = Math.abs(v - (eq.spokenResult as number));
      if (gap < bestGap) [bestGap, pickedIndex] = [gap, i];
    });
  }
  return { ...eq, mathjs: primary.mathjs, latex: primary.latex || eq.latex, alternatives, values, pickedIndex, needsChoice: readings.length > 1 && pickedIndex === null };
}

export interface FinalizeOptions {
  /** True when `analysis.confidence` came from the model (blended 0.6/0.4 with the baseline). */
  fromModel: boolean;
}

export function finalizeAnalysis(analysis: AnalysisAI, req: AnalyzeRequest, { fromModel }: FinalizeOptions): AnalysisResult {
  const raw = req.rawTranscript;
  const correct = req.selectedIndex === req.correctIndex;
  const candidates = new Set(req.candidateMisconceptions.map((m) => m.id));

  // Misconception: id must be a candidate, quote must be verbatim from the raw transcript.
  let misconception = analysis.misconception;
  if (misconception) {
    const id = misconception.id && candidates.has(misconception.id) ? misconception.id : null;
    const quote = verbatimQuote(misconception.evidenceQuote, raw);
    misconception = quote && (id || misconception.novelDescription) ? { id, novelDescription: id ? null : misconception.novelDescription, evidenceQuote: quote } : null;
  }

  // Verdict must agree with the tapped answer.
  let verdict = analysis.verdict;
  if (!correct) verdict = "incorrect";
  else if (verdict === "incorrect") verdict = misconception ? "correct_flawed" : "correct_sound";
  else if (verdict === "correct_sound" && misconception) verdict = "correct_flawed";
  if (verdict === "correct_sound") misconception = null;

  const equations = analysis.equations.map(evaluateEquation);
  const seen = new Set<string>();
  const normalizedTerms = analysis.normalizedTerms.filter((t) => {
    const k = t.heard.toLowerCase();
    if (k === t.meant.toLowerCase() || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const spoken = spokenOptionIndex(analysis.finalAnswerStated, req.options);
  const base = scoreConfidence({ rawTranscript: raw });
  const conf = scoreConfidence({
    rawTranscript: raw,
    answerMismatch: spoken !== null && spoken !== req.selectedIndex,
    extraSelfCorrections: Math.max(0, analysis.selfCorrections.length - base.selfCorrections),
    aiConfidence: fromModel && raw.trim() ? analysis.confidence : null,
  });

  return {
    ...analysis,
    verdict,
    misconception,
    equations,
    normalizedTerms,
    calculationSlip: verdict === "incorrect" && analysis.calculationSlip,
    confidence: conf.value,
    confidenceDetail: {
      baseline: conf.baseline,
      selfCorrections: conf.selfCorrections,
      hedges: conf.hedges,
      fillers: conf.fillers,
      fillerRate: conf.fillerRate,
      reasons: conf.reasons,
    },
  };
}
