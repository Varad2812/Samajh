/** Shared by the Claude and Gemini wrappers. */
export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: string };

/** First balanced-looking JSON object in the text (tolerates ```json fences and stray prose). */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(body.slice(start, end + 1));
}
