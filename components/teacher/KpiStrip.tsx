"use client";

import { AlertTriangle, CalendarClock, Gauge, Zap, type LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/shared/Sparkline";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { Kpis } from "@/lib/teacher/stats";
import { cn, fmt2, masteryColor, pct } from "@/lib/utils";

interface Props {
  kpis: Kpis;
  /** Class mean over the last weeks, for the sparkline. */
  trend: number[];
  onTopMisconception: (id: string) => void;
}

function Tile({ icon: Icon, label, color, children, foot }: { icon: LucideIcon; label: string; color: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="label-caps flex items-center gap-1.5">
        <Icon className="size-3.5" style={{ color }} aria-hidden /> {label}
      </div>
      <div className="flex items-baseline gap-2 font-mono text-title leading-none tabular" style={{ color }}>
        {children}
      </div>
      <div className="min-h-4 text-xs text-muted-foreground">{foot}</div>
    </div>
  );
}

/** Class mastery · at risk · top misconception · overdue reviews. */
export function KpiStrip({ kpis, trend, onTopMisconception }: Props) {
  const top = kpis.topMisconception;
  const mc = top ? MISCONCEPTION_BY_ID[top.id] : null;
  const down = kpis.trend < 0;
  return (
    <section className="panel grid grid-cols-2 gap-x-6 gap-y-4 p-4 lg:grid-cols-4 lg:divide-x lg:divide-border [&>*:not(:first-child)]:lg:pl-6" aria-label="Class KPIs">
      <Tile
        icon={Gauge}
        label="Class mastery"
        color={masteryColor(kpis.classMean)}
        foot={
          <span className="flex items-center gap-2">
            <span className={cn("font-mono tabular", down ? "text-weak" : "text-mastered")}>
              {down ? "▼" : "▲"} {fmt2(Math.abs(kpis.trend))}
            </span>
            vs 7 days ago
          </span>
        }
      >
        {fmt2(kpis.classMean)}
        <Sparkline values={trend} color={masteryColor(kpis.classMean)} label="Class mean, last 21 days" width={72} height={22} min={Math.min(...trend) - 0.02} max={Math.max(...trend) + 0.02} />
      </Tile>
      <Tile icon={AlertTriangle} label="At risk (< .40)" color="var(--weak)" foot="students with mean mastery under .40">
        {kpis.atRisk}
        <span className="text-base text-muted-foreground">/{kpis.size}</span>
      </Tile>
      <Tile
        icon={Zap}
        label="Top misconception"
        color="var(--misconception)"
        foot={
          top && mc ? (
            <button type="button" onClick={() => onTopMisconception(top.id)} className="truncate rounded text-left hover:text-misconception focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              {mc.label} · {top.count} students · filter heatmap →
            </button>
          ) : (
            "none detected"
          )
        }
      >
        {top ? (
          <>
            {top.id}
            <span className="text-base">{pct(top.rate)}</span>
          </>
        ) : (
          "–"
        )}
      </Tile>
      <Tile icon={CalendarClock} label="Reviews overdue" color="var(--developing)" foot={`across ${kpis.overdueStudents} of ${kpis.size} students`}>
        {kpis.overdue}
      </Tile>
    </section>
  );
}
