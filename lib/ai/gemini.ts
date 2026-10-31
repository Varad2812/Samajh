/**
 * Server-only Gemini wrapper: strict JSON validated by zod, timeout, one retry. The first attempt uses Google
 * Search grounding so suggested videos are real; the retry drops grounding and asks for JSON mode.
 */
import type { z } from "zod";
import { extractJson, type AiResult } from "./client";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
const GROUNDED_TIMEOUT_MS = 20_000;
const PLAIN_TIMEOUT_MS = 12_000;

export const hasGeminiKey = (): boolean => Boolean(process.env.GEMINI_API_KEY?.trim());

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function attempt<S extends z.ZodType>(system: string, user: string, schema: S, grounded: boolean): Promise<AiResult<z.output<S>>> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, reason: "no-key" };
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    // JSON mode cannot be combined with tools, so the grounded call parses JSON out of the text.
    ...(grounded ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { temperature: 0.4, ...(grounded ? {} : { responseMimeType: "application/json" }) },
  };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(grounded ? GROUNDED_TIMEOUT_MS : PLAIN_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `api-error:${res.status}` };
    const json = (await res.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let data: unknown;
    try {
      data = extractJson(text);
    } catch {
      return { ok: false, reason: "invalid-json" };
    }
    const parsed = schema.safeParse(data);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: "schema-mismatch" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

/** Grounded call, then one plain JSON-mode retry. Never throws. */
export async function callGeminiJson<S extends z.ZodType>(system: string, user: string, schema: S): Promise<AiResult<z.output<S>>> {
  if (!hasGeminiKey()) return { ok: false, reason: "no-key" };
  const first = await attempt(system, user, schema, true);
  return first.ok ? first : attempt(system, user, schema, false);
}

interface OEmbed {
  title?: string;
  author_name?: string;
}

/** Confirms a video exists (YouTube oEmbed needs no key); returns its real title and channel. */
export async function verifyVideo(videoId: string): Promise<{ title: string; channel: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const j = (await res.json()) as OEmbed;
    return j.title ? { title: j.title, channel: j.author_name ?? "" } : null;
  } catch {
    return null;
  }
}
