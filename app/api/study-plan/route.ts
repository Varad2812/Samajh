/** 45-minute YouTube plan mapped to the student's weak concepts. Gemini (grounded) → verified links, else offline. */
import { callGeminiJson, verifyVideo } from "@/lib/ai/gemini";
import { aiRoute } from "@/lib/ai/route";
import type { AiEnvelope } from "@/lib/ai/schemas";
import {
  geminiPlanSchema,
  offlinePlan,
  shapeModelPlan,
  studyPlanPrompt,
  studyPlanRequestSchema,
  youtubeSearchUrl,
  type StudyPlan,
  type StudyPlanRequest,
} from "@/lib/ai/studyPlan";
import { addLog, currentUser } from "@/lib/server/auth";

async function verifyLinks(plan: StudyPlan): Promise<StudyPlan> {
  const items = await Promise.all(
    plan.items.map(async (v) => {
      if (!v.videoId) return v;
      const real = await verifyVideo(v.videoId);
      // A made-up id turns into a search for the suggested title instead of a dead link.
      if (!real) return { ...v, videoId: null, url: youtubeSearchUrl(`${v.title} ${v.channel}`.trim()) };
      return { ...v, title: real.title, channel: real.channel || v.channel };
    }),
  );
  return { ...plan, items };
}

async function run(req: StudyPlanRequest): Promise<AiEnvelope<StudyPlan>> {
  const at = Date.now();
  const { system, user } = studyPlanPrompt(req);
  const res = await callGeminiJson(system, user, geminiPlanSchema);
  const shaped = res.ok ? shapeModelPlan(req, res.data, at) : null;
  const env: AiEnvelope<StudyPlan> = shaped
    ? { source: "ai", data: await verifyLinks(shaped) }
    : { source: "offline", reason: res.ok ? "too-few-topics" : res.reason, data: offlinePlan(req, at) };

  const account = await currentUser().catch(() => null);
  if (account) {
    await addLog(account.id, "study_plan", {
      source: env.source,
      topics: env.data.topics.map((t) => t.conceptId),
      videos: env.data.items.length,
      verified: env.data.items.filter((v) => v.videoId).length,
    }).catch(() => undefined);
  }
  return env;
}

export const POST = aiRoute(studyPlanRequestSchema, run);
