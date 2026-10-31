/**
 * Browser-side callers for the AI routes. If a route is unreachable (no network, 5xx) the same deterministic
 * fallback runs locally, so the app never breaks, and the store's `offline` flag drives the OfflineChip.
 */
import type { Question } from "@/lib/data/questions";
import { useStore } from "@/lib/store";
import { offlineAnalysis } from "./offlineAnalyzer";
import { finalizeAnalysis } from "./postprocess";
import { offlineQuestion } from "./questions";
import type {
  AiEnvelope,
  AnalysisResult,
  AnalyzeRequest,
  GenerateQuestionRequest,
  Worksheet,
  WorksheetRequest,
} from "./schemas";
import { offlineWorksheet } from "./worksheet";

/** Mirrors handlers.ts: an empty explanation is not a failure, so it must not light the chip. */
const NO_REASONING = "no-reasoning";
const CLIENT_TIMEOUT_MS = 20_000;

async function post<T>(path: string, body: unknown, local: () => T): Promise<AiEnvelope<T>> {
  let env: AiEnvelope<T>;
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    env = (await res.json()) as AiEnvelope<T>;
  } catch (err) {
    env = { source: "offline", reason: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "unreachable", data: local() };
  }
  useStore.getState().setOffline(env.source === "offline" && env.reason !== NO_REASONING);
  return env;
}

export const analyzeReasoning = (req: AnalyzeRequest) =>
  post<AnalysisResult>("/api/analyze-reasoning", req, () => finalizeAnalysis(offlineAnalysis(req), req, { fromModel: false }));

export const generateQuestion = (req: GenerateQuestionRequest) =>
  post<Question>("/api/generate-question", req, () => offlineQuestion(req));

export const remedialWorksheet = (req: WorksheetRequest) =>
  post<Worksheet>("/api/remedial-worksheet", req, () => offlineWorksheet(req));

export const ai = { analyzeReasoning, generateQuestion, remedialWorksheet };
