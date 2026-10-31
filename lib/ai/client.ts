/**
 * Server-only Claude wrapper (CLAUDE.md "AI calls"): strict JSON validated by zod, 8 s timeout, one retry.
 * Without ANTHROPIC_API_KEY it uses Gemini (GEMINI_API_KEY) with the same schema and checks.
 * Never imported by client code; the keys stay in process.env.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { callGeminiJson, hasGeminiKey } from "./gemini";
import { extractJson, type AiResult } from "./json";

export { extractJson, type AiResult };

export const MODEL = "claude-haiku-5-5";
export const TIMEOUT_MS = 8000;
export const RETRIES = 1;

export const hasApiKey = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

export interface CallOptions<S extends z.ZodType> {
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
  /** Extra check after zod passes; return a message to reject (counts as a failed attempt). */
  verify?: (data: z.output<S>) => string | null;
}

let cached: { key: string; client: Anthropic } | null = null;
function clientFor(key: string): Anthropic {
  if (!cached || cached.key !== key) cached = { key, client: new Anthropic({ apiKey: key, maxRetries: 0 }) };
  return cached.client;
}

async function attempt<S extends z.ZodType>(o: CallOptions<S>, timeoutMs: number): Promise<AiResult<z.output<S>>> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { ok: false, reason: "no-key" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await clientFor(key).messages.create(
      {
        model: MODEL,
        max_tokens: o.maxTokens ?? 1200,
        system: o.system,
        messages: [{ role: "user", content: o.user }],
      },
      { signal: controller.signal },
    );
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    let json: unknown;
    try {
      json = extractJson(text);
    } catch {
      return { ok: false, reason: "invalid-json" };
    }
    const parsed = o.schema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "schema-mismatch" };
    const rejected = o.verify?.(parsed.data);
    if (rejected) return { ok: false, reason: rejected };
    return { ok: true, data: parsed.data };
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    return { ok: false, reason: controller.signal.aborted ? "timeout" : `api-error${status ? `:${status}` : ""}` };
  } finally {
    clearTimeout(timer);
  }
}

/** One call + `retries` more on any failure. Never throws; `reason` explains why the caller should fall back. */
export async function callClaudeJson<S extends z.ZodType>(o: CallOptions<S>): Promise<AiResult<z.output<S>>> {
  if (!hasApiKey()) {
    // Fast budget: these routes sit behind a 20 s client timeout.
    if (hasGeminiKey()) return callGeminiJson(o.system, o.user, o.schema, { grounded: false, timeoutMs: 11_000, liteTimeoutMs: 7_000, verify: o.verify });
    return { ok: false, reason: "no-key" };
  }
  let last: AiResult<z.output<S>> = { ok: false, reason: "unknown" };
  for (let i = 0; i <= (o.retries ?? RETRIES); i++) {
    last = await attempt(o, o.timeoutMs ?? TIMEOUT_MS);
    if (last.ok) return last;
  }
  return last;
}
