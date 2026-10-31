/**
 * Signature 3D moments as store events (DESIGN.md §4.2 items 1–3).
 * The store emits these automatically (mastery change → shockwave, misconception added → strike,
 * removed → shatter, demo profile / diagnostic done → ignition); `fx.*` triggers them explicitly.
 * Canvases subscribe and play only events that arrive while they are mounted.
 */
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";

export type FxInput =
  | { kind: "ignition" }
  | { kind: "strike"; conceptId: string; misconceptionId: string }
  | { kind: "shatter"; conceptId: string; misconceptionId: string }
  | { kind: "shockwave"; conceptId: string; from: number; to: number };

export type FxEvent = FxInput & { id: number; at: number };

export const FX_LIFETIME_MS: Record<FxInput["kind"], number> = {
  ignition: 4500,
  strike: 2000,
  shatter: 1400,
  shockwave: 1600,
};
/** Comet flight time before impact; the new satellite appears at impact. */
export const STRIKE_IMPACT_MS = 900;
export const MASTERED = 0.85;
/** Smaller mastery changes don't fire a shockwave. */
export const SHOCKWAVE_MIN_DELTA = 0.005;
const MAX_EVENTS = 24;

export function shockwaveFor(conceptId: string, from: number, to: number): FxInput | null {
  return Math.abs(to - from) >= SHOCKWAVE_MIN_DELTA ? { kind: "shockwave", conceptId, from, to } : null;
}

/** Strikes for newly active misconceptions, shatters for cleared ones. */
export function misconceptionFx(prev: string[], next: string[]): FxInput[] {
  const out: FxInput[] = [];
  for (const id of next) {
    if (!prev.includes(id) && MISCONCEPTION_BY_ID[id]) out.push({ kind: "strike", conceptId: MISCONCEPTION_BY_ID[id].conceptId, misconceptionId: id });
  }
  for (const id of prev) {
    if (!next.includes(id) && MISCONCEPTION_BY_ID[id]) out.push({ kind: "shatter", conceptId: MISCONCEPTION_BY_ID[id].conceptId, misconceptionId: id });
  }
  return out;
}

export const crossesMastered = (from: number, to: number): boolean => from < MASTERED && to >= MASTERED;

/** Append events with ids, keeping the queue short. */
export function appendFx(queue: FxEvent[], inputs: FxInput[], nextId: number, at: number): { fx: FxEvent[]; fxSeq: number } {
  const added = inputs.map((e, i) => ({ ...e, id: nextId + i, at }) as FxEvent);
  return { fx: [...queue, ...added].slice(-MAX_EVENTS), fxSeq: nextId + inputs.length };
}
