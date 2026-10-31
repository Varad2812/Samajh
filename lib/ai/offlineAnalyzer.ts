/**
 * Deterministic stand-in for /api/analyze-reasoning (PROJECT.md §6.1 fallback):
 * regex cue matching against `misconception.cues` + the confidence baseline + the seeded explanation.
 * Produces the same shape as the model so everything downstream is identical.
 */
import { FILLER_MARKERS, HEDGE_MARKERS, scoreConfidence, SELF_CORRECTION_MARKERS } from "@/lib/engine/confidence";
import { QUESTION_BY_ID, QUESTIONS } from "@/lib/data/questions";
import { evaluateReading, relativelyClose, RESULT_TOLERANCE } from "@/lib/engine/mathEval";
import { normalizeTerms, parseSpokenMath } from "./spokenMath";
import type { AnalysisAI, AnalyzeRequest, EquationAI } from "./schemas";

/** Markers that genuinely retract what came before ("actually" alone only adds emphasis). */
const RETRACTING = new Set(["no wait", "wait no", "no no", "sorry", "i mean"]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Phrase regex that tolerates any punctuation/whitespace between the words. */
const phraseRegex = (phrase: string, flags = "gi") =>
  new RegExp(`(?<![A-Za-z0-9'])${phrase.toLowerCase().split(/\s+/).map(esc).join("[^A-Za-z0-9']+")}(?![A-Za-z0-9'])`, flags);

interface Hit {
  text: string;
  index: number;
  end: number;
}

function findAll(raw: string, phrases: readonly string[]): Hit[] {
  const hits: Hit[] = [];
  for (const p of phrases) for (const m of raw.matchAll(phraseRegex(p))) hits.push({ text: m[0], index: m.index, end: m.index + m[0].length });
  return hits.sort((a, b) => a.index - b.index);
}

/** Start of the sentence containing `at` (after . ? ! … or a line break). */
const sentenceStart = (raw: string, at: number) => {
  const before = raw.slice(0, at);
  const m = [...before.matchAll(/[.!?…]+\s*|\n/g)].pop();
  return m ? m.index + m[0].length : 0;
};
const sentenceEnd = (raw: string, from: number) => {
  const m = /[.!?…]+|\n/.exec(raw.slice(from));
  return m ? from + m.index + m[0].length : raw.length;
};

const trimPunct = (s: string) => s.replace(/^[\s,;:.…-]+|[\s,;:.…-]+$/g, "").trim();

interface Correction {
  from: string;
  to: string;
  /** Raw range that was abandoned (only for retracting markers). */
  retracted: [number, number] | null;
}

/** Cluster neighbouring markers ("wait no, I mean, actually …") into one correction each. */
function findCorrections(raw: string): Correction[] {
  const hits = findAll(raw, SELF_CORRECTION_MARKERS);
  const clusters: Hit[][] = [];
  for (const h of hits) {
    const last = clusters[clusters.length - 1];
    const gap = last ? raw.slice(last[last.length - 1].end, h.index) : null;
    if (last && gap !== null && gap.trim().split(/\s+/).filter(Boolean).length <= 2 && !/[.!?…]/.test(gap)) last.push(h);
    else clusters.push([h]);
  }
  return clusters.map((c) => {
    const start = c[0].index;
    const end = c[c.length - 1].end;
    const strong = c.some((h) => RETRACTING.has(h.text.toLowerCase().replace(/[^a-z ]+/g, " ").trim()));
    let from = trimPunct(raw.slice(sentenceStart(raw, start), start));
    let fromStart = sentenceStart(raw, start);
    if (!from) {
      // Marker opens its sentence: the retracted statement is the previous one.
      const boundaries = [...raw.slice(0, start).matchAll(/[.!?…]+\s*|\n/g)];
      const before = boundaries[boundaries.length - 2];
      fromStart = before ? before.index + before[0].length : 0;
      from = trimPunct(raw.slice(fromStart, start));
    }
    const to = trimPunct(raw.slice(end, sentenceEnd(raw, end)));
    return { from, to, retracted: strong && from ? [fromStart, end] : null };
  });
}

function removeRanges(raw: string, ranges: [number, number][]): string {
  let out = "";
  let at = 0;
  for (const [s, e] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (s > at) out += raw.slice(at, s);
    at = Math.max(at, e);
  }
  return out + raw.slice(at);
}

/** Fillers out, retractions out (the last self-correction wins), light tidy-up. */
function cleanReasoning(raw: string, corrections: Correction[]): string {
  let t = removeRanges(raw, corrections.flatMap((c) => (c.retracted ? [c.retracted] : [])));
  for (const f of FILLER_MARKERS) t = t.replace(new RegExp(`(?<![A-Za-z0-9'])${esc(f)}(?![A-Za-z0-9'])[,]?`, "gi"), " ");
  t = t.replace(/\s+([,.?!…])/g, "$1").replace(/^[\s,.…]+/, "").replace(/\s+/g, " ").trim();
  t = t.replace(/(^|[.!?…]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
  return t && !/[.!?…]$/.test(t) ? `${t}.` : t;
}

/** Tapped-option letter or text the student restated aloud. */
function statedAnswer(raw: string): string | null {
  const m = /\b(?:option|answer(?: is)?|it'?s|choose|going with|pick(?:ing)?)\s+([abcd])\b/i.exec(raw);
  return m ? m[1].toUpperCase() : null;
}

const seededExplanation = (req: AnalyzeRequest): string | null =>
  (req.questionId ? QUESTION_BY_ID[req.questionId]?.explanation : undefined) ??
  QUESTIONS.find((q) => q.stem === req.question)?.explanation ??
  null;

const firstSentence = (s: string) => /^.*?[.!?](?=\s|$)/.exec(s)?.[0] ?? s;

interface McMatch {
  id: string;
  quote: string;
  retractedOnly: boolean;
}

function matchMisconception(req: AnalyzeRequest, corrections: Correction[]): McMatch | null {
  const raw = req.rawTranscript;
  const retracted = corrections.flatMap((c) => (c.retracted ? [c.retracted] : []));
  const inRetracted = (i: number) => retracted.some(([s, e]) => i >= s && i < e);
  let best: { id: string; hits: Hit[] } | null = null;
  for (const mc of req.candidateMisconceptions) {
    const hits = findAll(raw, mc.cues);
    if (hits.length && (!best || hits.length > best.hits.length)) best = { id: mc.id, hits };
  }
  if (!best) return null;
  const live = best.hits.find((h) => !inRetracted(h.index));
  const hit = live ?? best.hits[0];
  const s = sentenceStart(raw, hit.index);
  let quote = trimPunct(raw.slice(s, sentenceEnd(raw, hit.end)));
  if (quote.length > 160) quote = trimPunct(raw.slice(Math.max(s, hit.index - 60), Math.min(raw.length, hit.end + 60)));
  return { id: best.id, quote, retractedOnly: !live };
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

export function offlineAnalysis(req: AnalyzeRequest): AnalysisAI {
  const raw = req.rawTranscript.trim();
  const correct = req.selectedIndex === req.correctIndex;
  const explanation = seededExplanation(req);
  const baseline = scoreConfidence({ rawTranscript: raw });

  if (!raw) {
    return {
      cleanedReasoning: "", claims: [], finalAnswerStated: null, selfCorrections: [], hedges: [], fillers: [],
      confidence: baseline.value, verdict: correct ? "correct_sound" : "incorrect", misconception: null,
      feedback: `${correct ? "Correct!" : "Not quite."} ${explanation ?? "Say why you chose it next time, since explaining your thinking helps me spot what to fix."}`.trim(),
      equations: [], normalizedTerms: [], calculationSlip: false,
    };
  }

  const corrections = findCorrections(raw);
  const cleaned = cleanReasoning(raw, corrections);
  const mc = matchMisconception(req, corrections);
  const mcInfo = mc ? req.candidateMisconceptions.find((m) => m.id === mc.id) : undefined;

  const parsed = parseSpokenMath(raw);
  const equations: EquationAI[] = parsed.map((e) => ({
    spoken: e.spoken, latex: e.latex, mathjs: e.mathjs, meaning: e.meaning, alternatives: e.alternatives, spokenResult: e.spokenResult,
  }));
  const normalizedTerms = normalizeTerms(raw, parsed);

  // Right relation (a recognised law) but the spoken result disagrees with the arithmetic → calculation slip.
  const usedRelation = parsed.some((e) => /\(.+\)/.test(e.meaning));
  const slip = parsed.find((e) => {
    if (e.spokenResult === null) return false;
    const values = [e.mathjs, ...e.alternatives.map((a) => a.mathjs)].map(evaluateReading).filter((v): v is number => v !== null);
    return values.length > 0 && !values.some((v) => relativelyClose(v, e.spokenResult as number, RESULT_TOLERANCE));
  });
  const calculationSlip = !correct && usedRelation && slip !== undefined;

  const verdict: AnalysisAI["verdict"] = !correct ? "incorrect" : mc && !mc.retractedOnly ? "correct_flawed" : "correct_sound";
  const attach = mc && (verdict !== "correct_sound") ? mc : null;
  const hint = explanation ? ` ${firstSentence(explanation)}` : "";

  let feedback: string;
  if (calculationSlip && slip) {
    const v = [slip.mathjs, ...slip.alternatives.map((a) => a.mathjs)].map(evaluateReading).find((x): x is number => x !== null);
    feedback = `Right idea: you used the correct relation. It's just a calculation slip: ${slip.spoken} works out to ${fmt(v ?? 0)}, not ${fmt(slip.spokenResult ?? 0)}. Redo the arithmetic and you'll have it.`;
  } else if (verdict === "incorrect" && attach && mcInfo) {
    feedback = `Thanks for explaining your thinking; that's a very common idea, but it doesn't hold. ${mcInfo.correctIdea}${hint}`;
  } else if (verdict === "incorrect") {
    feedback = `Not quite, but explaining your steps is exactly how we find what to fix.${hint || " Re-check which relation applies here and try again."}`;
  } else if (verdict === "correct_flawed" && mcInfo) {
    feedback = `Right answer, but part of your reasoning needs a fix. ${mcInfo.correctIdea}${hint}`;
  } else {
    feedback = `Correct, and your reasoning holds up.${baseline.value < 0.6 ? " You sounded unsure, but you were right, so trust it." : ""}${hint}`;
  }

  const stated = statedAnswer(raw);
  return {
    cleanedReasoning: cleaned,
    claims: cleaned.split(/(?<=[.!?…])\s+/).map(trimPunct).filter((s) => s.length > 3 && !/^(not sure|i guess|maybe)$/i.test(s)).slice(0, 4),
    finalAnswerStated: stated,
    selfCorrections: corrections.map(({ from, to }) => ({ from, to })),
    hedges: findAll(raw, HEDGE_MARKERS).map((h) => h.text),
    fillers: findAll(raw, FILLER_MARKERS).map((h) => h.text),
    confidence: baseline.value,
    verdict,
    misconception: attach ? { id: attach.id, novelDescription: null, evidenceQuote: attach.quote } : null,
    feedback,
    equations,
    normalizedTerms,
    calculationSlip,
  };
}
