/** Route logic: try the model, fall back to the offline implementation on ANY failure. Never throws. */
import type { Question } from "@/lib/data/questions";
import { callClaudeJson } from "./client";
import { offlineAnalysis } from "./offlineAnalyzer";
import { finalizeAnalysis } from "./postprocess";
import { analyzeUser, ANALYZE_SYSTEM, QUESTION_SYSTEM, questionUser, WORKSHEET_SYSTEM, worksheetUser } from "./prompts";
import { checkGeneratedQuestion, offlineQuestion, toQuestion } from "./questions";
import {
  analysisAISchema,
  questionAISchema,
  worksheetSchema,
  type AiEnvelope,
  type AnalysisResult,
  type AnalyzeRequest,
  type GenerateQuestionRequest,
  type Worksheet,
  type WorksheetRequest,
} from "./schemas";
import { offlineWorksheet } from "./worksheet";

/** Reason used when there is simply nothing to send to the model; not a failure, so no offline chip. */
export const NO_REASONING = "no-reasoning";

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export async function runAnalyze(req: AnalyzeRequest): Promise<AiEnvelope<AnalysisResult>> {
  const offline = (reason: string): AiEnvelope<AnalysisResult> => ({
    source: "offline",
    reason,
    data: finalizeAnalysis(offlineAnalysis(req), req, { fromModel: false }),
  });
  if (wordCount(req.rawTranscript) < 3) return offline(NO_REASONING);

  const res = await callClaudeJson({ system: ANALYZE_SYSTEM, user: analyzeUser(req), schema: analysisAISchema, maxTokens: 1600 });
  if (!res.ok) return offline(res.reason);
  return { source: "ai", data: finalizeAnalysis(res.data, req, { fromModel: true }) };
}

export async function runGenerateQuestion(req: GenerateQuestionRequest): Promise<AiEnvelope<Question>> {
  const res = await callClaudeJson({
    system: QUESTION_SYSTEM,
    user: questionUser(req),
    schema: questionAISchema,
    maxTokens: 900,
    verify: (q) => checkGeneratedQuestion(q, req),
  });
  if (!res.ok) return { source: "offline", reason: res.reason, data: offlineQuestion(req) };
  return { source: "ai", data: toQuestion(res.data, req) };
}

export async function runWorksheet(req: WorksheetRequest): Promise<AiEnvelope<Worksheet>> {
  const res = await callClaudeJson({ system: WORKSHEET_SYSTEM, user: worksheetUser(req), schema: worksheetSchema, maxTokens: 2200 });
  if (!res.ok) return { source: "offline", reason: res.reason, data: offlineWorksheet(req) };
  return { source: "ai", data: res.data };
}
