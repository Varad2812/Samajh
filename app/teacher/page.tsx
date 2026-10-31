"use client";

import { MasteryBar } from "@/components/shared/MasteryBar";
import { CHAPTERS, CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTIONS } from "@/lib/data/misconceptions";
import { dueConceptIds, useClassRoster, useVirtualNow } from "@/lib/store";
import { fmt2, masteryColor, pct } from "@/lib/utils";
import type { StudentRecord } from "@/lib/types";

const meanMastery = (s: StudentRecord) => CONCEPTS.reduce((acc, c) => acc + s.mastery[c.id].p, 0) / CONCEPTS.length;

export default function TeacherPage() {
  const roster = useClassRoster();
  const at = useVirtualNow();

  if (!roster || at === null) return <div className="panel h-[480px] animate-pulse" />;

  const classMean = roster.reduce((s, st) => s + meanMastery(st), 0) / roster.length;
  const atRisk = roster.filter((s) => meanMastery(s) < 0.4).length;
  const overdue = roster.reduce((s, st) => s + dueConceptIds(st.schedule, at).length, 0);
  const mcRates = MISCONCEPTIONS.map((m) => ({ m, rate: roster.filter((s) => s.misconceptions.includes(m.id)).length / roster.length }))
    .sort((a, b) => b.rate - a.rate);
  const top = mcRates[0];

  return (
    <div className="flex flex-col gap-4">
      <section className="panel grid grid-cols-2 gap-4 p-4 lg:grid-cols-4">
        <Kpi label="Class mean mastery" value={fmt2(classMean)} color={masteryColor(classMean)} />
        <Kpi label="Students at risk (< .40)" value={`${atRisk}/${roster.length}`} color="var(--weak)" />
        <Kpi label="Top misconception" value={`${top.m.id} (${pct(top.rate)})`} color="var(--misconception)" />
        <Kpi label="Reviews overdue" value={String(overdue)} color="var(--developing)" />
      </section>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="panel overflow-x-auto p-4">
          <h2 className="label-caps mb-3">Roster · {roster.length} students</h2>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Student</th>
                <th className="py-1.5 font-medium">Profile</th>
                {CHAPTERS.map((ch) => <th key={ch.id} className="py-1.5 font-medium">{ch.short}</th>)}
                <th className="py-1.5 font-medium">Attempts</th>
                <th className="py-1.5 font-medium">MCs</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id} className="border-t border-border/60 hover:bg-surface-2">
                  <td className="py-1.5">{s.name}</td>
                  <td className="py-1.5 text-xs text-muted-foreground">{s.profile}</td>
                  {CHAPTERS.map((ch) => {
                    const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
                    const m = cs.reduce((acc, c) => acc + s.mastery[c.id].p, 0) / cs.length;
                    return <td key={ch.id} className="py-1.5 font-mono text-xs tabular" style={{ color: masteryColor(m) }}>{fmt2(m)}</td>;
                  })}
                  <td className="py-1.5 font-mono text-xs tabular">{s.attempts.length}</td>
                  <td className="py-1.5 font-mono text-xs text-misconception">{s.misconceptions.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <h2 className="label-caps mb-3">Chapter mastery (class)</h2>
            <div className="flex flex-col gap-2.5">
              {CHAPTERS.map((ch) => {
                const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
                const m = roster.reduce((acc, s) => acc + cs.reduce((a, c) => a + s.mastery[c.id].p, 0) / cs.length, 0) / roster.length;
                return <MasteryBar key={ch.id} label={ch.short} value={m} />;
              })}
            </div>
          </section>
          <section className="panel p-4">
            <h2 className="label-caps mb-3">Misconception prevalence</h2>
            <ul className="flex flex-col gap-2">
              {mcRates.filter((r) => r.rate > 0).map(({ m, rate }) => (
                <li key={m.id} className="flex items-center gap-2 text-xs">
                  <span className="w-10 font-mono text-misconception">{m.id}</span>
                  <span className="w-36 truncate text-muted-foreground">{m.label}</span>
                  <span className="h-1.5 flex-1 rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-misconception" style={{ width: pct(rate) }} />
                  </span>
                  <span className="w-9 text-right font-mono tabular">{pct(rate)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xl tabular" style={{ color }}>{value}</div>
    </div>
  );
}
