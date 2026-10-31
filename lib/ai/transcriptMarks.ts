/** Character-level marks for the raw-transcript diff (DESIGN.md §3.3 "Transcript Diff marks"). */
import { SELF_CORRECTION_MARKERS } from "@/lib/engine/confidence";

export type Mark = "filler" | "hedge" | "marker" | "retracted" | "evidence";

export interface Segment {
  text: string;
  marks: Mark[];
}

export interface MarkInput {
  fillers: string[];
  hedges: string[];
  /** Retracted statements (selfCorrections[].from). */
  retracted: string[];
  evidenceQuote: string | null;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrase = (p: string) => new RegExp(`(?<![A-Za-z0-9'])${p.trim().split(/\s+/).map(esc).join("[^A-Za-z0-9']+")}(?![A-Za-z0-9'])`, "gi");

/** Split `raw` into runs of text carrying the same set of marks. Every character of `raw` is preserved. */
export function markTranscript(raw: string, input: MarkInput): Segment[] {
  const flags: Set<Mark>[] = Array.from({ length: raw.length }, () => new Set<Mark>());
  const paint = (start: number, end: number, m: Mark) => {
    for (let i = start; i < end; i++) flags[i].add(m);
  };
  const paintAll = (phrases: string[], m: Mark) => {
    for (const p of new Set(phrases.map((x) => x.trim()).filter(Boolean))) for (const hit of raw.matchAll(phrase(p))) paint(hit.index, hit.index + hit[0].length, m);
  };
  const paintFirst = (text: string | null, m: Mark) => {
    const t = text?.trim();
    if (!t) return;
    const at = raw.toLowerCase().indexOf(t.toLowerCase());
    if (at >= 0) paint(at, at + t.length, m);
  };

  input.retracted.forEach((r) => paintFirst(r, "retracted"));
  paintAll(SELF_CORRECTION_MARKERS, "marker");
  paintAll(input.hedges, "hedge");
  paintAll(input.fillers, "filler");
  paintFirst(input.evidenceQuote, "evidence");

  const out: Segment[] = [];
  const key = (s: Set<Mark>) => [...s].sort().join(",");
  for (let i = 0; i < raw.length; i++) {
    const last = out[out.length - 1];
    if (last && key(new Set(last.marks)) === key(flags[i])) last.text += raw[i];
    else out.push({ text: raw[i], marks: [...flags[i]].sort() });
  }
  return out;
}
