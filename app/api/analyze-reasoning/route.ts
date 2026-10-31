import { runAnalyze } from "@/lib/ai/handlers";
import { aiRoute } from "@/lib/ai/route";
import { analyzeRequestSchema } from "@/lib/ai/schemas";

export const POST = aiRoute(analyzeRequestSchema, runAnalyze);
