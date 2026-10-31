"use client";

import { Sparkline } from "@/components/shared/Sparkline";
import { daysBetween } from "@/lib/clock";
import type { Attempt } from "@/lib/types";
import { fmt2, pct } from "@/lib/utils";

/** Consecutive days with at least one attempt, ending today (or yesterday). */
function streak(attempts: Attempt[], at: number): number {
  const days = new Set(attempts.map((a) => daysBetween(a.at, at)));
  let d = days.has(0) ? 0 : 1;
  let n = 0;
  while (days.has(d)) {
    n++;
    d++;
  }
  return n;
}

/** Rolling accuracy over windows of 5 attempts. */
function rollingAccuracy(attempts: Attempt[]): number[] {
  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  const out: number[] = [];
  for (let i = 4; i < sorted.length; i++) out.push(sorted.slice(i - 4, i + 1).filter((a) => a.correct).length / 5);
  return out.slice(-12);
}

export function StatsRow({ attempts, misconceptions, at }: { attempts: Attempt[]; misconceptions: number; at: number }) {
  const n = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  const sound = attempts.filter((a) => a.verdict === "correct_sound").length;
  const avgConf = n ? attempts.reduce((s, a) => s + a.confidence, 0) / n : 0;
  const confTrend = [...attempts].sort((a, b) => a.at - b.at).slice(-12).map((a) => a.confidence);

  return (
    <section className="panel grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-5">
      <Stat label="Accuracy" value={n ? pct(correct / n) : "—"} sub={n ? `${sound} sound · ${correct - sound} flawed` : "no attempts yet"}>
        <Sparkline values={rollingAccuracy(attempts)} color="var(--proficient)" label="Rolling accuracy" />
      </Stat>
      <Stat label="Avg confidence" value={n ? fmt2(avgConf) : "—"} sub="from your spoken reasoning">
        <Sparkline values={confTrend} color="var(--accent)" label="Confidence trend" />
      </Stat>
      <Stat label="Attempts" value={String(n)} sub={n ? `${new Set(attempts.map((a) => a.conceptId)).size} concepts touched` : "take the diagnostic"} />
      <Stat label="Streak" value={`${streak(attempts, at)}d`} sub="consecutive active days" />
      <Stat label="Misconceptions" value={String(misconceptions)} sub={misconceptions ? "orbiting their stars" : "none active"} tone="text-misconception" />
    </section>
  );
}

function Stat({ label, value, sub, tone, children }: { label: string; value: string; sub: string; tone?: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xl tabular ${tone ?? ""}`}>{value}</span>
        {children}
      </div>
      <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
