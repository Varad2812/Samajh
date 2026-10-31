"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { TimeBar } from "@/components/student/StudyPlanPanel";
import { StudyVideoRow } from "@/components/student/StudyVideoRow";
import { studyPlan as requestPlan } from "@/lib/ai/api";
import { MAX_TOPICS, PLAN_MINUTES, type StudyTopicInput } from "@/lib/ai/studyPlan";
import { useStore } from "@/lib/store";
import type { CustomTrack, TrackResult } from "@/lib/tracks/types";
import { masteryColor, pct } from "@/lib/utils";

/** Weakest tested topics, each carrying the beliefs behind the wrong options the student actually picked. */
function weakTopics(track: CustomTrack, result: TrackResult): StudyTopicInput[] {
  const beliefs: Record<string, string[]> = {};
  const qById = Object.fromEntries(track.questions.map((q) => [q.id, q]));
  for (const a of result.answers) {
    const q = qById[a.questionId];
    if (!q || a.correct) continue;
    const why = a.selectedIndex !== null ? q.distractorWhy[a.selectedIndex] : "";
    (beliefs[q.topicId] ??= []).push(why || `Couldn't answer: ${q.stem.slice(0, 80)}`);
  }
  const weakness = (id: string) => result.topics[id].p - (beliefs[id]?.length ?? 0) * 0.1;
  const picked = track.topics
    .filter((t) => result.topics[t.id]?.tested && result.topics[t.id].p < 0.8)
    .sort((a, b) => weakness(a.id) - weakness(b.id))
    .slice(0, MAX_TOPICS);
  const ids = new Set(picked.map((t) => t.id));
  return picked.map((t) => ({
    conceptId: t.id,
    name: t.name,
    prereqs: t.prereqs.filter((p) => ids.has(p)),
    p: result.topics[t.id].p,
    misconceptions: (beliefs[t.id] ?? []).slice(0, 3),
  }));
}

export function TrackVideoPlan({ track, result, onFocus }: { track: CustomTrack; result: TrackResult; onFocus?: (topicId: string) => void }) {
  const plan = useStore((s) => s.trackPlans[track.id] ?? null);
  const setTrackPlan = useStore((s) => s.setTrackPlan);
  const toggle = useStore((s) => s.toggleTrackPlanItem);
  const [busy, setBusy] = useState(false);
  const topics = useMemo(() => weakTopics(track, result), [track, result]);
  const watched = plan ? plan.items.filter((v) => v.done).reduce((s, v) => s + v.minutes, 0) : 0;

  const build = async () => {
    setBusy(true);
    const env = await requestPlan({ topics, budgetMinutes: PLAN_MINUTES, subject: track.subject, standard: `Class ${track.standard}${track.board ? ` ${track.board}` : ""}` });
    setTrackPlan(track.id, env.data);
    setBusy(false);
  };

  return (
    <section className="panel p-4" aria-label="45-minute video plan for this test">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="label-caps">Fix it in {PLAN_MINUTES} min</h2>
        {plan && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{plan.source === "ai" ? "Gemini picks" : "search links"}</span>}
        {topics.length > 0 && (
          <button
            onClick={build}
            disabled={busy}
            className="ml-auto flex h-7 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : plan ? <RefreshCw className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
            {busy ? "Finding videos…" : plan ? "Rebuild" : "Build video plan"}
          </button>
        )}
      </div>
      {topics.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing to fix here. Try a harder test or a new chapter.</p>
      ) : !plan ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">YouTube videos for your weakest topics, in order, chosen to clear up the mistakes you actually made:</p>
          <ol className="flex flex-col gap-1">
            {topics.map((t, i) => (
              <li key={t.conceptId}>
                <button onClick={() => onFocus?.(t.conceptId)} className="grid w-full grid-cols-[18px_minmax(0,1fr)_44px] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                  <span className="font-mono text-muted-foreground tabular">{i + 1}</span>
                  <span className="truncate">{t.name}</span>
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
              <StudyVideoRow key={v.id} index={i + 1} video={v} p={plan.topics.find((t) => t.conceptId === v.conceptId)?.p ?? 0} onToggle={() => toggle(track.id, v.id)} onFocus={() => onFocus?.(v.conceptId)} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
