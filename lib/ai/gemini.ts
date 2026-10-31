/**
 * Server-only Gemini wrapper: strict JSON validated by zod, with timeouts. The first attempt uses Google Search
 * grounding so suggested videos are real; then plain JSON mode on the main model, then on a fast lite model.
 */
import type { z } from "zod";
import { extractJson, type AiResult } from "./json";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
// Gemini 3 models think before answering; grounded search adds more. Both regularly exceed the 8 s Claude budget.
const GROUNDED_TIMEOUT_MS = 40_000;
const PLAIN_TIMEOUT_MS = 30_000;
const LITE_TIMEOUT_MS = 15_000;
/** Backup when the main model is overloaded (503) or rate-limited (429). */
const LITE_MODEL = "gemini-flash-lite-latest";
/** Free keys often have no grounding quota: after a 429, skip grounding for a while instead of paying for it every call. */
const GROUNDING_COOLDOWN_MS = 10 * 60_000;
let groundingBlockedUntil = 0;

export const hasGeminiKey = (): boolean => Boolean(process.env.GEMINI_API_KEY?.trim());

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

type Verify<S extends z.ZodType> = (data: z.output<S>) => string | null;

interface AttemptOptions<S extends z.ZodType> {
  model: string;
  grounded: boolean;
  timeoutMs: number;
  /** Lower thinking for Gemini 3 models (the lite alias may not accept it). */
  lowThinking: boolean;
  verify?: Verify<S>;
}

export interface GeminiOptions<S extends z.ZodType> {
  /** Try a Google Search grounded call first (needs grounding quota). Default true. */
  grounded?: boolean;
  timeoutMs?: number;
  liteTimeoutMs?: number;
  /** Extra check after zod passes; return a message to reject. */
  verify?: Verify<S>;
}

async function attempt<S extends z.ZodType>(system: string, user: string, schema: S, o: AttemptOptions<S>): Promise<AiResult<z.output<S>>> {
  const { grounded } = o;
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, reason: "no-key" };
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    // JSON mode cannot be combined with tools, so the grounded call parses JSON out of the text.
    ...(grounded ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: {
      temperature: 0.4,
      // Picking videos needs little reasoning; default (high) thinking blows the time budget.
      ...(o.lowThinking ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      ...(grounded ? {} : { responseMimeType: "application/json" }),
    },
  };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${o.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(o.timeoutMs),
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
    if (!parsed.success) return { ok: false, reason: "schema-mismatch" };
    const rejected = o.verify?.(parsed.data);
    return rejected ? { ok: false, reason: rejected } : { ok: true, data: parsed.data };
  } catch (err) {
    return { ok: false, reason: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

/** Grounded call, then plain JSON mode, then the lite model. Never throws; `reason` lists every failure. */
export async function callGeminiJson<S extends z.ZodType>(system: string, user: string, schema: S, opts: GeminiOptions<S> = {}): Promise<AiResult<z.output<S>>> {
  if (!hasGeminiKey()) return { ok: false, reason: "no-key" };
  const { grounded = true, timeoutMs = PLAIN_TIMEOUT_MS, liteTimeoutMs = LITE_TIMEOUT_MS, verify } = opts;
  const failures: string[] = [];
  if (grounded && Date.now() >= groundingBlockedUntil) {
    const r = await attempt(system, user, schema, { model: GEMINI_MODEL, grounded: true, timeoutMs: GROUNDED_TIMEOUT_MS, lowThinking: true, verify });
    if (r.ok) return r;
    if (r.reason === "api-error:429") groundingBlockedUntil = Date.now() + GROUNDING_COOLDOWN_MS;
    failures.push(`grounded:${r.reason}`);
  }
  const plain = await attempt(system, user, schema, { model: GEMINI_MODEL, grounded: false, timeoutMs, lowThinking: true, verify });
  if (plain.ok) return plain;
  failures.push(`plain:${plain.reason}`);
  const lite = await attempt(system, user, schema, { model: LITE_MODEL, grounded: false, timeoutMs: liteTimeoutMs, lowThinking: false, verify });
  if (lite.ok) return lite;
  failures.push(`lite:${lite.reason}`);
  return { ok: false, reason: failures.join(",") };
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
