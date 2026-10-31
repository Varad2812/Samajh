import { runWorksheet } from "@/lib/ai/handlers";
import { aiRoute } from "@/lib/ai/route";
import { worksheetRequestSchema } from "@/lib/ai/schemas";

export const POST = aiRoute(worksheetRequestSchema, runWorksheet);
