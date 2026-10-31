/** Build a custom diagnostic test (any subject) with Gemini; offline it can only serve the built-in Class 10 Physics bank. */
import { randomUUID } from "node:crypto";
import { callGeminiJson } from "@/lib/ai/gemini";
import { aiRoute } from "@/lib/ai/route";
import type { AiEnvelope } from "@/lib/ai/schemas";
import { addLog, currentUser } from "@/lib/server/auth";
import { customTestPrompt, offlineTrack, shapeTrack, verifyTrackAI } from "@/lib/tracks/build";
import { customTestRequestSchema, trackAISchema, type CustomTestRequest, type CustomTrack } from "@/lib/tracks/types";

async function run(req: CustomTestRequest): Promise<AiEnvelope<CustomTrack | null>> {
  const at = Date.now();
  const id = `trk_${randomUUID().slice(0, 8)}`;
  const { system, user } = customTestPrompt(req);
  // A whole test is a long answer: no grounding, generous timeouts (route maxDuration below).
  const res = await callGeminiJson(system, user, trackAISchema, { grounded: false, timeoutMs: 50_000, liteTimeoutMs: 30_000, verify: (d) => verifyTrackAI(d, req) });
  const track = res.ok ? shapeTrack(req, res.data, id, at) : null;
  const env: AiEnvelope<CustomTrack | null> = track
    ? { source: "ai", data: track }
    : { source: "offline", reason: res.ok ? "unusable-test" : res.reason, data: offlineTrack(req, id, at) };

  const account = await currentUser().catch(() => null);
  if (account) {
    await addLog(account.id, "custom_test_created", {
      source: env.source,
      subject: req.subject,
      standard: req.standard,
      board: req.board,
      questions: env.data?.questions.length ?? 0,
      title: env.data?.title ?? null,
    }).catch(() => undefined);
  }
  return env;
}

export const maxDuration = 90;

export const POST = aiRoute(customTestRequestSchema, run);
