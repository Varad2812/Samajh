/** Shared POST wrapper for the three routes: parse + validate the body (400 on bad input), then run the handler. */
import type { z } from "zod";
import type { AiEnvelope } from "./schemas";

export function aiRoute<S extends z.ZodType, T>(schema: S, run: (body: z.output<S>) => Promise<AiEnvelope<T>>) {
  return async function POST(request: Request): Promise<Response> {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return Response.json({ error: "Body must be JSON" }, { status: 400 });
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
    }
    return Response.json(await run(parsed.data), { headers: { "Cache-Control": "no-store" } });
  };
}
