import { runGenerateQuestion } from "@/lib/ai/handlers";
import { aiRoute } from "@/lib/ai/route";
import { generateQuestionRequestSchema } from "@/lib/ai/schemas";

export const POST = aiRoute(generateQuestionRequestSchema, runGenerateQuestion);
