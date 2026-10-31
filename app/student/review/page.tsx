"use client";

import Link from "next/link";
import { CalendarClock, FastForward, Play } from "lucide-react";
import { daysBetween, formatVirtualDate, startOfDay } from "@/lib/clock";
import { generateDemoStudent } from "@/lib/data/students";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { dueConceptIds, useHydrated, useStore, useVirtualNow } from "@/lib/store";
import { cn, fmt2, masteryColor } from "@/lib/utils";

export default function ReviewPage() {
  const hydrated = useHydrated();
  const at = useVirtualNow();
  const schedule = useStore((s) => s.schedule);
  const mastery = useStore((s) => s.mastery);
  const offsetDays = useStore((s) => s.settings.offsetDays);
  const activeMcs = useStore((s) => s.student.misconceptions);
  const fastForward = useStore((s) => s.fastForward);
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);

  const ready = hydrated && at !== null;
  const due = ready ? dueConceptIds(schedule, at) : [];
  const upcoming = Object.entries(schedule)
    .filter(([id]) => !due.includes(id))
    .sort(([, a], [, b]) => a.due - b.due)
    .slice(0, 5)
    .map(([id]) => id);
  const rows = due.length > 0 ? due : upcoming;
  const overdue = ready ? due.filter((id) => daysBetween(at, schedule[id].due) < 0).length : 0;
  const next3 = ready ? Object.values(schedule).filter((i) => i.due > at && daysBetween(at, i.due) <= 3).length : 0;
  const mcOn = (id: string) => activeMcs.filter((m) => MISCONCEPTION_BY_ID[m]?.conceptId === id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Review queue</h1>
          <p className="text-sm text-muted-foreground">Concepts due by SM-2 at the virtual date. Reviews run practice in review mode.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 font-mono text-xs tabular">
            <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
            {ready ? formatVirtualDate(at) : "…"}
            <span className={offsetDays > 0 ? "text-developing" : "text-muted-foreground"}>Day +{offsetDays}</span>
          </span>
          <button
            type="button"
            onClick={() => fastForward(3)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:translate-y-px"
          >
            <FastForward className="size-3.5" aria-hidden /> Fast-forward 3 days
          </button>
          {due.length > 0 && (
            <Link
              href={`/student/practice?mode=review&concept=${due[0]}`}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
            >
              <Play className="size-3.5" aria-hidden /> Start review ({due.length})
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Due now", String(due.length), due.length ? "text-developing" : "text-foreground"],
          ["Overdue", String(overdue), overdue ? "text-weak" : "text-foreground"],
          ["Due in next 3 days", String(next3), "text-foreground"],
          ["Scheduled", String(Object.keys(schedule).length), "text-foreground"],
        ].map(([k, v, c]) => (
          <div key={k} className="panel p-3">
            <div className="label-caps">{k}</div>
            <div className={cn("font-mono text-xl tabular", c)}>{ready ? v : "–"}</div>
          </div>
        ))}
      </div>

      <section className="panel overflow-x-auto" aria-label="Review queue">
        {ready && due.length === 0 && upcoming.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            Nothing due on {formatVirtualDate(at)}. The next {upcoming.length} upcoming reviews are below; try ⏩ Fast-forward 3 days.
          </div>
        )}
        <table className={cn("w-full min-w-[720px] text-sm", ready && rows.length === 0 && "hidden")}>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Concept</th>
              <th className="px-2 py-2.5 font-medium">Mastery</th>
              <th className="px-2 py-2.5 font-medium">Last seen</th>
              <th className="px-2 py-2.5 font-medium">Due</th>
              <th className="px-2 py-2.5 font-medium">EF</th>
              <th className="px-2 py-2.5 font-medium">Interval</th>
              <th className="px-2 py-2.5 font-medium">Reps</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {ready &&
              rows.map((id) => {
                const item = schedule[id];
                const delta = daysBetween(at, item.due);
                const color = masteryColor(mastery[id].p);
                const mcs = mcOn(id);
                return (
                  <tr key={id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="font-mono text-xs text-muted-foreground">{id}</span>
                        <span className="truncate">{CONCEPT_BY_ID[id].name}</span>
                        {mcs.map((m) => (
                          <span key={m} className="rounded-full bg-misconception/15 px-1.5 py-0.5 font-mono text-[10px] text-misconception">
                            {m}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-2 font-mono tabular" style={{ color }}>{fmt2(mastery[id].p)}</td>
                    <td className="px-2 font-mono text-xs text-muted-foreground tabular">{item.lastReviewed ? formatVirtualDate(item.lastReviewed) : "—"}</td>
                    <td className="px-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-xs tabular",
                          delta < 0 ? "bg-weak/10 text-weak" : delta === 0 ? "bg-developing/10 text-developing" : "text-muted-foreground",
                        )}
                      >
                        {delta < 0 ? `${-delta}d overdue` : delta === 0 ? "today" : `in ${delta}d · ${formatVirtualDate(item.due)}`}
                      </span>
                    </td>
                    <td className="px-2 font-mono text-xs tabular">{item.ef.toFixed(2)}</td>
                    <td className="px-2 font-mono text-xs tabular">{item.interval}d</td>
                    <td className="px-2 font-mono text-xs tabular">{item.repetition}</td>
                    <td className="px-4 text-right">
                      <Link
                        href={`/student/practice?mode=review&concept=${id}`}
                        className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                      >
                        {delta <= 0 ? "Start" : "Review early"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {ready && rows.length === 0 && <EmptyQueue at={at} onDemo={loadDemoProfile} />}
      </section>
    </div>
  );
}

const LADDER = [
  { q: "Wrong, or a misconception", next: "tomorrow", tone: "text-weak" },
  { q: "Right but shaky reasoning", next: "1 day → 6 days", tone: "text-developing" },
  { q: "Right and confident", next: "1 → 6 → 6×EF days", tone: "text-mastered" },
];

/** Never an empty table: how SM-2 schedules reviews, plus a dimmed sample of Aarav's real queue. */
function EmptyQueue({ at, onDemo }: { at: number; onDemo: () => void }) {
  const demo = generateDemoStudent(startOfDay(at));
  const sample = dueConceptIds(demo.schedule, at).slice(0, 5);
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-3">
        <p className="text-sm">Nothing scheduled yet. Every answer you give schedules its concept for review, spaced by how well you knew it:</p>
        <ul className="flex flex-col gap-1.5">
          {LADDER.map((l) => (
            <li key={l.q} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
              <span className={l.tone}>●</span>
              <span>{l.q}</span>
              <span className="ml-auto font-mono text-muted-foreground tabular">{l.next}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/student/diagnostic" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none">
            Take the diagnostic
          </Link>
          <button onClick={onDemo} className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
            Load demo profile
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border p-3" aria-label="Sample review queue">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">Sample</span>
          <span className="text-muted-foreground">what Aarav&apos;s queue looks like today</span>
        </div>
        <ul className="flex flex-col opacity-70">
          {sample.map((id) => {
            const item = demo.schedule[id];
            const d = daysBetween(at, item.due);
            return (
              <li key={id} className="flex items-center gap-2 border-b border-border/50 py-1.5 text-xs last:border-0">
                <span className="size-2 rounded-full" style={{ background: masteryColor(demo.mastery[id].p) }} />
                <span className="font-mono text-muted-foreground">{id}</span>
                <span className="min-w-0 truncate">{CONCEPT_BY_ID[id].name}</span>
                <span className="ml-auto font-mono tabular" style={{ color: masteryColor(demo.mastery[id].p) }}>{fmt2(demo.mastery[id].p)}</span>
                <span className={cn("w-20 text-right font-mono tabular", d < 0 ? "text-weak" : "text-developing")}>{d < 0 ? `${-d}d overdue` : "today"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
