"use client";

import Link from "next/link";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { daysBetween, formatVirtualDate } from "@/lib/clock";
import { dueConceptIds, useStore, useVirtualNow } from "@/lib/store";
import { cn, fmt2, masteryColor } from "@/lib/utils";

export default function ReviewPage() {
  const at = useVirtualNow();
  const schedule = useStore((s) => s.schedule);
  const mastery = useStore((s) => s.mastery);
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);

  const due = at === null ? [] : dueConceptIds(schedule, at);
  const upcoming = Object.entries(schedule)
    .filter(([id]) => !due.includes(id))
    .sort(([, a], [, b]) => a.due - b.due)
    .slice(0, 5)
    .map(([id]) => id);
  const rows = due.length > 0 ? due : upcoming;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold">Review queue</h1>
        <span className="text-sm text-muted-foreground">
          {at === null ? "…" : `${due.length} due on ${formatVirtualDate(at)}`} · scheduled by SM-2
        </span>
      </div>
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Concept</th>
              <th className="px-2 py-2.5 font-medium">Mastery</th>
              <th className="px-2 py-2.5 font-medium">Last seen</th>
              <th className="px-2 py-2.5 font-medium">Due</th>
              <th className="px-2 py-2.5 font-medium">EF</th>
              <th className="px-2 py-2.5 font-medium">Interval</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {at !== null &&
              rows.map((id) => {
                const item = schedule[id];
                const delta = daysBetween(at, item.due);
                const color = masteryColor(mastery[id].p);
                return (
                  <tr key={id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: color }} />
                        <span className="font-mono text-xs text-muted-foreground">{id}</span>
                        {CONCEPT_BY_ID[id].name}
                      </span>
                    </td>
                    <td className="px-2 font-mono tabular" style={{ color }}>{fmt2(mastery[id].p)}</td>
                    <td className="px-2 font-mono text-xs text-muted-foreground tabular">
                      {item.lastReviewed ? formatVirtualDate(item.lastReviewed) : "—"}
                    </td>
                    <td className={cn("px-2 font-mono text-xs tabular", delta < 0 ? "text-weak" : delta === 0 ? "text-developing" : "text-muted-foreground")}>
                      {delta < 0 ? `${-delta}d overdue` : delta === 0 ? "today" : `in ${delta}d`}
                    </td>
                    <td className="px-2 font-mono text-xs tabular">{item.ef.toFixed(2)}</td>
                    <td className="px-2 font-mono text-xs tabular">{item.interval}d</td>
                    <td className="px-4 text-right">
                      <Link href={`/student/practice?concept=${id}`} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-bg hover:bg-accent/90">
                        Start
                      </Link>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {at !== null && rows.length === 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
            Reviews are scheduled after you answer questions. Load Aarav&apos;s demo profile to see a populated queue.
            <button onClick={loadDemoProfile} className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-foreground hover:border-accent/40">
              Load demo profile
            </button>
          </div>
        )}
      </section>
      {due.length === 0 && upcoming.length > 0 && (
        <p className="text-xs text-muted-foreground">Nothing due today. The next 5 upcoming reviews are shown; try ⏩ +3 days.</p>
      )}
    </div>
  );
}
