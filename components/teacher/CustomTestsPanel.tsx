"use client";

import { WandSparkles } from "lucide-react";
import type { LiveStudent } from "@/lib/teacher/live";
import { masteryColor, pct } from "@/lib/utils";

const ago = (ms: number, now: number) => {
  const m = Math.round((now - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

/** Custom tests (any subject) the real students have taken, newest first. */
export function CustomTestsPanel({ students, now, onOpenStudent }: { students: LiveStudent[]; now: number; onOpenStudent: (id: string) => void }) {
  const rows = students
    .flatMap((s) => s.tests.map((t) => ({ ...t, student: s.record })))
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, 10);
  return (
    <section className="panel p-4" aria-label="Custom tests taken by students">
      <div className="mb-3 flex items-center gap-2">
        <WandSparkles className="size-3.5 text-accent" aria-hidden />
        <h2 className="label-caps">Students&rsquo; own tests</h2>
        <span className="ml-auto text-xs text-muted-foreground">any subject</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">When a student builds and takes a test for any subject, the score appears here within seconds.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const acc = r.total ? r.correct / r.total : 0;
            return (
              <li key={`${r.student.id}-${r.id}-${r.finishedAt}`}>
                <button
                  onClick={() => onOpenStudent(r.student.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      <span className="font-medium">{r.student.name}</span> · {r.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.subject} · Class {r.standard} · {ago(r.finishedAt, now)}
                    </span>
                  </span>
                  <span className="text-right font-mono tabular" style={{ color: masteryColor(acc) }}>
                    {pct(acc)}
                    <span className="block text-[10px] text-muted-foreground">
                      {r.correct}/{r.total}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
