"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { studyPlan as requestPlan } from "@/lib/ai/api";
import { conceptName, PLAN_MINUTES, pickWeakTopics, type StudyPlan } from "@/lib/ai/studyPlan";
import { useStore } from "@/lib/store";
import type { ConceptMastery } from "@/lib/types";
import { masteryColor, pct } from "@/lib/utils";
import { StudyVideoRow } from "./StudyVideoRow";

interface Props {
  mastery: Record<string, ConceptMastery>;
  misconceptions: string[];
  onFocus: (conceptId: string) => void;
  /** Called once a new plan is in the store (the page switches the galaxy to the plan lens). */
  onBuilt?: () => void;
}

/** Segmented 45-minute bar: one slice per topic, filled as videos are ticked off. */
function TimeBar({ plan }: { plan: StudyPlan }) {
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
      {plan.topics.map((t) => {
        const items = plan.items.filter((v) => v.conceptId === t.conceptId);
        const done = items.filter((v) => v.done).reduce((s, v) => s + v.minutes, 0);
        const color = masteryColor(t.p);
        return (
          <div key={t.conceptId} className="relative h-full bg-surface-2" style={{ flexGrow: t.minutes }}>
            <div className="absolute inset-y-0 left-0" style={{ width: `${(done / Math.max(1, t.minutes)) * 100}%`, background: color }} />
            <div className="absolute inset-0 opacity-25" style={{ background: color }} />
          </div>
        );
      })}
    </div>
  );
}

export function StudyPlanPanel({ mastery, misconceptions, onFocus, onBuilt }: Props) {
  const plan = useStore((s) => s.studyPlan);
  const setStudyPlan = useStore((s) => s.setStudyPlan);
  const toggle = useStore((s) => s.toggleStudyItem);
  const [busy, setBusy] = useState(false);

  const topics = useMemo(() => pickWeakTopics(mastery, misconceptions), [mastery, misconceptions]);

  const build = async () => {
    setBusy(true);
    const env = await requestPlan({ topics, budgetMinutes: PLAN_MINUTES });
    setStudyPlan(env.data);
    setBusy(false);
    onBuilt?.();
  };

  const watched = plan ? plan.items.filter((v) => v.done).reduce((s, v) => s + v.minutes, 0) : 0;

  return (
    <section className="panel p-4" aria-label="45-minute video plan">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="label-caps">45-min video plan</h2>
        {plan && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {plan.source === "ai" ? `Gemini · ${plan.items.filter((v) => v.videoId).length} verified` : "offline · search links"}
          </span>
        )}
        <button
          onClick={build}
          disabled={busy}
          className="ml-auto flex h-7 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : plan ? <RefreshCw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
          {busy ? "Finding videos…" : plan ? "Rebuild" : "Build plan"}
        </button>
      </div>

      {!plan ? (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Gemini finds real YouTube videos for your weakest concepts, puts prerequisites first and fits them into {PLAN_MINUTES} minutes.
          </p>
          <ol className="flex flex-col gap-1.5">
            {topics.map((t, i) => (
              <li key={t.conceptId}>
                <button
                  onClick={() => onFocus(t.conceptId)}
                  className="grid w-full grid-cols-[18px_minmax(0,1fr)_48px] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <span className="font-mono text-muted-foreground tabular">{i + 1}</span>
                  <span className="truncate">
                    <span className="font-mono text-muted-foreground">{t.conceptId}</span> {conceptName(t.conceptId)}
                  </span>
                  <span className="text-right font-mono tabular" style={{ color: masteryColor(t.p) }}>{pct(t.p)}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {plan.topics.length} topics · {plan.items.length} videos
            </span>
            <span className="font-mono tabular">
              {watched}/{plan.totalMinutes} min
            </span>
          </div>
          <TimeBar plan={plan} />
          <ol className="mt-3 flex flex-col gap-2">
            {plan.items.map((v, i) => (
              <StudyVideoRow
                key={v.id}
                index={i + 1}
                video={v}
                p={plan.topics.find((t) => t.conceptId === v.conceptId)?.p ?? 0}
                onToggle={() => toggle(v.id)}
                onFocus={() => onFocus(v.conceptId)}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
