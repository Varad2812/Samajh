import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { vocabForPrompt } from "./physicsVocab";
import type { AnalyzeRequest, GenerateQuestionRequest, WorksheetRequest } from "./schemas";

const JSON_ONLY = "Reply with ONE JSON object and nothing else: no prose, no markdown, no code fences.";

// ───────────── analyze-reasoning ─────────────

export const ANALYZE_SYSTEM = `You analyse a CBSE Class 10 Physics student's spoken explanation of why they chose an answer.
The transcript is MESSY SPEECH dictated by voice: fillers (umm, like, basically), digressions, hedges and self-corrections. Never ask for cleaner input.

Rules:
- Treat the transcript as speech. The LAST self-correction wins: judge the student's final belief, but still list every self-correction.
- cleanedReasoning: concise, first person, fillers removed, the final intent kept.
- claims: atomic physics claims the student made, in their final form.
- Match a candidate misconception ONLY when the student's claims actually express that belief. Otherwise misconception.id is null; if they hold a different wrong belief, describe it in novelDescription.
- misconception.evidenceQuote MUST be copied verbatim from the RAW transcript (a contiguous substring). Never edit it.
- Never invent physics. If unsure, say less.
- verdict: "correct_sound" (right answer, sound reasoning), "correct_flawed" (right answer but the reasoning contains a misconception), "incorrect" (wrong answer). The verdict must agree with whether the tapped option is correct.
- confidence (0..1): how sure the student sounded (hedges, self-corrections, fillers lower it). No reasoning given → 0.6.
- feedback: 2–3 sentences, encouraging, addressing the specific flaw. Plain text.
- Speech-to-math: if the student spoke an equation or calculation ("V equals I R", "twelve by three, four amps"), return it in equations as { spoken, latex, mathjs, meaning, alternatives, spokenResult }. "meaning" names the law/relation used. Do NOT compute any numbers yourself; code evaluates every expression. spokenResult is only a number the student SAID aloud after the expression, else null.
- If the grouping is ambiguous (e.g. "log 6 plus one by three log three plus three squared"), put the most likely reading in latex/mathjs and ALL other plausible readings in alternatives ({latex, mathjs}). Never silently guess one grouping.
- mathjs syntax: explicit * for products, ^ for powers, log = base 10, ln = natural, sqrt(). Variables as single letters.
- normalizedTerms: mis-heard speech you corrected, as { heard, meant } (e.g. resisters → resistors, "one by f" → 1/f).
- Grading is by the relation used, not exact spoken arithmetic. Right relation but a wrong arithmetic result → verdict "incorrect", calculationSlip true, and the feedback says "right idea, calculation slip".

${vocabForPrompt()}

${JSON_ONLY}
Schema:
{"cleanedReasoning":string,"claims":string[],"finalAnswerStated":string|null,"selfCorrections":[{"from":string,"to":string}],"hedges":string[],"fillers":string[],"confidence":number,"verdict":"correct_sound"|"correct_flawed"|"incorrect","misconception":{"id":string|null,"novelDescription":string|null,"evidenceQuote":string}|null,"feedback":string,"equations":[{"spoken":string,"latex":string,"mathjs":string,"meaning":string,"alternatives":[{"latex":string,"mathjs":string}],"spokenResult":number|null}],"normalizedTerms":[{"heard":string,"meant":string}],"calculationSlip":boolean}`;

export function analyzeUser(req: AnalyzeRequest): string {
  const letters = ["A", "B", "C", "D"];
  const concept = CONCEPT_BY_ID[req.conceptId]?.name ?? req.conceptId;
  return [
    `Concept: ${concept} (${req.conceptId})`,
    `Question: ${req.question}`,
    ...req.options.map((o, i) => `${letters[i]}. ${o}`),
    `Student tapped: ${letters[req.selectedIndex]}. Correct answer: ${letters[req.correctIndex]}.`,
    "",
    "Candidate misconceptions (match only if the student's claims express the belief):",
    ...(req.candidateMisconceptions.length
      ? req.candidateMisconceptions.map((m) => `- ${m.id} "${m.label}": believes ${m.wrongBelief} (correct: ${m.correctIdea})`)
      : ["- none"]),
    "",
    "RAW transcript (verbatim; evidenceQuote must come from this):",
    JSON.stringify(req.rawTranscript),
  ].join("\n");
}

// ───────────── generate-question ─────────────

export const QUESTION_SYSTEM = `You write ONE multiple-choice question for CBSE Class 10 Physics (NCERT level, SI units, 4 options, exactly one correct).
Rules:
- Physics must be correct and unambiguous. Options must be distinct and plausible; no "all/none of the above".
- Difficulty 1 = direct recall, 3 = one-step application, 5 = multi-step reasoning or a subtle misconception trap.
- If a misconception is given, make exactly one distractor the answer a student holding that belief would pick, and record its option index in distractorMisconceptions (key = option index as a string, value = misconception id).
- For numericals use clean numbers and SELF-CHECK them: put a math.js expression for the correct answer's number in check.mathjs and that number in check.answer (log = base 10). Code re-evaluates it. For conceptual questions omit check.
- Do not repeat any stem the user lists as already used.
- The explanation (2–3 sentences) states why the answer is right and, briefly, why the tempting distractor is wrong.

${JSON_ONLY}
Schema:
{"stem":string,"options":[string,string,string,string],"correctIndex":0|1|2|3,"explanation":string,"distractorMisconceptions":{"<index>":"<MC id>"}?,"check":{"mathjs":string,"answer":number}?}`;

export function questionUser(req: GenerateQuestionRequest): string {
  const mc = req.misconceptionId ? MISCONCEPTION_BY_ID[req.misconceptionId] : undefined;
  return [
    `Concept: ${req.conceptName} (${req.conceptId})`,
    `Target difficulty: ${req.targetDifficulty} of 5`,
    mc ? `Target misconception ${mc.id} "${mc.label}": students believe ${mc.wrongBelief} The correct idea: ${mc.correctIdea}` : "No target misconception.",
    req.avoidStems.length ? `Stems already used (do not repeat or paraphrase):\n${req.avoidStems.map((s) => `- ${s}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ───────────── remedial-worksheet ─────────────

export const WORKSHEET_SYSTEM = `You are a CBSE Class 10 Physics teacher's assistant. Write a short remedial worksheet that fixes specific misconceptions found in a class.
Rules:
- 2–4 sections; each has a heading and 2–4 items { q, answer }. Start with a short concept check, then target each misconception with a "spot the error" or prediction item, and end with one application question.
- Physics must be correct for CBSE Class 10, with SI units. Answers are short but complete (include the reasoning, not only the result).
- intro: 1–2 sentences addressed to students. teacherNotes: 2–4 sentences for the teacher (why students hold these beliefs, how to introduce the fix, what to watch for).
- Use the class statistics given to prioritise; do not invent statistics.

${JSON_ONLY}
Schema:
{"title":string,"intro":string,"sections":[{"heading":string,"items":[{"q":string,"answer":string}]}],"teacherNotes":string}`;

export function worksheetUser(req: WorksheetRequest): string {
  const concept = CONCEPT_BY_ID[req.conceptId];
  const s = req.classStats;
  return [
    `Concept: ${concept?.name ?? req.conceptId} (${req.conceptId})`,
    "Misconceptions to address:",
    ...(req.misconceptionIds.length
      ? req.misconceptionIds.flatMap((id) => {
          const m = MISCONCEPTION_BY_ID[id];
          return m ? [`- ${m.id} "${m.label}" (${s.affectedPct?.[id] ?? "?"}% of class): believe ${m.wrongBelief} Correct: ${m.correctIdea}`] : [];
        })
      : ["- none specified; write a general consolidation worksheet"]),
    `Class: ${s.classSize ?? "?"} students${s.avgMastery !== undefined ? `, average mastery ${Math.round(s.avgMastery * 100)}%` : ""}${s.weakCount !== undefined ? `, ${s.weakCount} weak on this concept` : ""}.`,
  ].join("\n");
}
