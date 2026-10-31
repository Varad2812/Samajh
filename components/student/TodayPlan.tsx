"use client";

import Link from "next/link";
import { ArrowRight, Crosshair, RefreshCw, Sparkles, Target } from "lucide-react";
import { CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { rootCauseOf } from "@/lib/engine/rootCause";
import { selectNext } from "@/lib/engine/selector";
import { dueConceptIds } from "@/lib/engine/sm2";
import type { Attempt, ConceptMastery, ReviewItem } from "@/lib/types";
import { fmt2, masteryColor } from "@/lib/utils";

interface Props {
  mastery: Record<string, ConceptMastery>;
  schedule: Record<string, ReviewItem>;
  attempts: Attempt[];
  theta: number;
  misconceptions: string[];
  at: number;
  diagnosticDone: boolean;
  onFocus: (id: string) => void;
  onLoadDemo: () => void;
}

const REASON: Record<string, string> = {
  review: "review is due",
  root_cause: "likely root cause",
  weakest: "weakest high-weight concept",
  unexplored: "not explored yet",
  requested: "requested",
};

export function TodayPlan({ mastery, schedule, attempts, theta, misconceptions, at, diagnosticDone, onFocus, onLoadDemo }: Props) {
  const due = dueConceptIds(schedule, at);
  const measured = CONCEPTS.filter((c) => !mastery[c.id].estimated);
  const focus = measured
    .filter((c) => mastery[c.id].p < 0.6)
    .sort((a, b) => (1 - mastery[b.id].p) * b.weight - (1 - mastery[a.id].p) * a.weight)
    .slice(0, 2);
  const roots = [
    ...new Map(
      measured
        .map((c) => [c.id, rootCauseOf(mastery, c.id)] as const)
        .filter((pair): pair is readonly [string, string] => pair[1] !== null)
        .map(([from, root]) => [root, from]),
    ),
  ].slice(0, 2);
  const next = selectNext({ mastery, schedule, attempts, theta, now: at, activeMisconceptions: misconceptions });

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center">
        <h2 className="label-caps">Today&apos;s plan</h2>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular">θ {Math.round(theta)}</span>
      </div>

      {!diagnosticDone && measured.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
          Every star is still an estimate (.30). A 12-question diagnostic lights up your galaxy.
          <div className="flex gap-2">
            <Link href="/student/diagnostic" className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 font-medium text-bg hover:bg-accent/90">
              Start diagnostic <ArrowRight className="size-3" aria-hidden />
            </Link>
            <button onClick={onLoadDemo} className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-foreground hover:border-accent/40">
              <Sparkles className="size-3" aria-hidden /> Demo profile
            </button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <PlanRow icon={<RefreshCw className="size-3.5 text-accent" />} onClick={due[0] ? () => onFocus(due[0]) : undefined}>
            <span>{due.length === 0 ? "No reviews due" : `${due.length} review${due.length === 1 ? "" : "s"} due`}</span>
            {due.length > 0 && <span className="truncate font-mono text-xs text-muted-foreground">{due.slice(0, 4).join(" · ")}</span>}
          </PlanRow>
          {focus.map((c) => (
            <PlanRow key={c.id} icon={<Target className="size-3.5 text-weak" />} onClick={() => onFocus(c.id)}>
              <span className="text-muted-foreground">Focus</span>
              <span className="truncate">
                <span className="font-mono">{c.id}</span> {c.name}
              </span>
              <span className="ml-auto font-mono tabular" style={{ color: masteryColor(mastery[c.id].p) }}>{fmt2(mastery[c.id].p)}</span>
            </PlanRow>
          ))}
          {roots.map(([root, from]) => (
            <PlanRow key={root} icon={<Crosshair className="size-3.5 text-developing" />} onClick={() => onFocus(root)}>
              <span className="text-muted-foreground">Root cause</span>
              <span className="truncate font-mono">
                {from} → {root}
              </span>
              <span className="ml-auto truncate text-xs text-muted-foreground">{CONCEPT_BY_ID[root].name}</span>
            </PlanRow>
          ))}
        </ul>
      )}

      <Link
        href={`/student/practice?concept=${next.conceptId}`}
        className="mt-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm transition-colors hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span className="text-accent">Next up</span>
        <span className="font-mono">{next.conceptId}</span>
        <span className="truncate text-xs text-muted-foreground">
          {REASON[next.reason]}
          {next.probedFor ? ` of ${next.probedFor}` : ""} · target {Math.round(next.targetElo)}
        </span>
        <ArrowRight className="ml-auto size-4 shrink-0 text-accent" aria-hidden />
      </Link>
    </section>
  );
}

function PlanRow({ icon, onClick, children }: { icon: React.ReactNode; onClick?: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors enabled:hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span aria-hidden>{icon}</span>
        {children}
      </button>
    </li>
  );
}
