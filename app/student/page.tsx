"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MasteryBar } from "@/components/shared/MasteryBar";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { dueConceptIds, useHydrated, useStore, useVirtualNow } from "@/lib/store";
import { fmt2, masteryBand, masteryColor, pct } from "@/lib/utils";

export default function StudentHome() {
  const hydrated = useHydrated();
  const at = useVirtualNow();
  const { mastery, attempts, schedule, student } = useStore();
  const loadDemoProfile = useStore((s) => s.loadDemoProfile);

  const due = at === null ? [] : dueConceptIds(schedule, at);
  // Lowest mastery first, nudged by exam weight.
  const priority = (id: string) => mastery[id].p - CONCEPT_BY_ID[id].weight * 0.05;
  const focus = [...CONCEPTS].sort((a, b) => priority(a.id) - priority(b.id)).slice(0, 3);
  const correct = attempts.filter((a) => a.correct).length;
  const avgConf = attempts.length ? attempts.reduce((s, a) => s + a.confidence, 0) / attempts.length : 0;
  const mcCounts = attempts.reduce<Record<string, number>>((acc, a) => {
    if (a.misconceptionId) acc[a.misconceptionId] = (acc[a.misconceptionId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="panel p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="label-caps">Concept map · {CONCEPTS.length} concepts</h2>
            <Legend />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {CHAPTERS.map((ch) => (
              <div key={ch.id}>
                <div className="mb-2 text-xs text-muted-foreground">{ch.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {CONCEPTS.filter((c) => c.chapter === ch.id).map((c) => {
                    const m = mastery[c.id];
                    const color = masteryColor(m.estimated ? null : m.p);
                    return (
                      <Link
                        key={c.id}
                        href={`/student/practice?concept=${c.id}`}
                        title={`${c.name} · ${m.estimated ? "estimated" : masteryBand(m.p)} ${fmt2(m.p)}`}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                      >
                        <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                        <span className="font-mono text-muted-foreground">{c.id}</span>
                        <span className="font-mono tabular" style={{ color }}>{fmt2(m.p)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          <Stat label="Accuracy" value={attempts.length ? pct(correct / attempts.length) : "—"} />
          <Stat label="Avg confidence" value={attempts.length ? fmt2(avgConf) : "—"} />
          <Stat label="Attempts" value={String(attempts.length)} />
          <Stat label="Ability θ" value={String(student.theta)} />
          <Stat label="Misconceptions" value={String(student.misconceptions.length)} />
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <section className="panel p-4">
          <h2 className="label-caps mb-3">Today&apos;s plan</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Reviews due</span>
              <Link href="/student/review" className="font-mono text-accent tabular hover:underline">{due.length}</Link>
            </li>
            {focus.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className="text-muted-foreground">Focus</span>
                <span className="truncate">{c.id} {c.name}</span>
                <span className="ml-auto font-mono tabular" style={{ color: masteryColor(mastery[c.id].p) }}>{fmt2(mastery[c.id].p)}</span>
              </li>
            ))}
          </ul>
          {hydrated && !student.diagnosticDone && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
              Every concept starts at an estimated .30. Take the diagnostic to measure it, or load the demo profile.
              <div className="flex gap-2">
                <Link href="/student/diagnostic" className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 font-medium text-bg hover:bg-accent/90">
                  Start diagnostic <ArrowRight className="size-3" aria-hidden />
                </Link>
                <button onClick={loadDemoProfile} className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-foreground hover:border-accent/40">
                  <Sparkles className="size-3" aria-hidden /> Demo profile
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="panel p-4">
          <h2 className="label-caps mb-3">Chapter mastery</h2>
          <div className="flex flex-col gap-2.5">
            {CHAPTERS.map((ch) => {
              const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
              const mean = cs.reduce((s, c) => s + mastery[c.id].p, 0) / cs.length;
              return <MasteryBar key={ch.id} label={ch.short} value={mean} estimated={cs.every((c) => mastery[c.id].estimated)} />;
            })}
          </div>
        </section>
        <section className="panel p-4">
          <h2 className="label-caps mb-3">Active misconceptions</h2>
          {student.misconceptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">None detected yet. They appear here when your spoken reasoning reveals one.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {student.misconceptions.map((id) => (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="rounded-full bg-misconception/15 px-2 py-0.5 font-mono text-xs text-misconception">{id}</span>
                  <span className="truncate">{MISCONCEPTION_BY_ID[id].label}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground tabular">
                    {CONCEPT_BY_ID[MISCONCEPTION_BY_ID[id].conceptId].id} ×{mcCounts[id] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xl tabular">{value}</div>
    </div>
  );
}

function Legend() {
  const items: [string, number | null][] = [["weak", 0.1], ["developing", 0.45], ["proficient", 0.72], ["mastered", 0.95], ["estimated", null]];
  return (
    <div className="ml-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map(([l, v]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: masteryColor(v) }} /> {l}
        </span>
      ))}
    </div>
  );
}
