"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, MessageSquareQuote, Plus, RotateCcw, Sparkles, Target } from "lucide-react";
import { TopicBreakdown } from "@/components/tracks/TopicBreakdown";
import { TrackGalaxyPanel } from "@/components/tracks/TrackGalaxyPanel";
import { TrackVideoPlan } from "@/components/tracks/TrackVideoPlan";
import { makeGraph } from "@/lib/galaxy/graph";
import { useStore } from "@/lib/store";
import { summary } from "@/lib/tracks/score";
import { fmt2, masteryColor, pct } from "@/lib/utils";

const btn =
  "flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

export default function ReportPage() {
  const router = useRouter();
  const track = useStore((s) => s.tracks.find((t) => t.id === s.activeTrackId) ?? null);
  const result = useStore((s) => (s.activeTrackId ? (s.trackResults[s.activeTrackId] ?? null) : null));
  const graph = useMemo(() => (track ? makeGraph(track.id, track.units, track.topics) : null), [track]);

  if (!track || !result || !graph) {
    return (
      <div className="panel mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center">
        <Target className="size-6 text-accent" aria-hidden />
        <h1 className="font-display text-lg font-semibold">No report yet</h1>
        <p className="text-sm text-muted-foreground">Finish a test to see your score, your topics in 3D and a replay of every wrong answer.</p>
        <Link href="/student/create" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          Build a test
        </Link>
      </div>
    );
  }

  const s = summary(result);
  const color = masteryColor(s.accuracy);
  const wrong = s.total - s.correct;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="panel flex flex-wrap items-center gap-4 p-4">
        <div
          className="relative flex size-20 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${color} ${s.accuracy * 360}deg, var(--surface-2) 0deg)` }}
          aria-label={`Score ${pct(s.accuracy)}`}
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-surface font-mono text-xl tabular" style={{ color }}>
            {pct(s.accuracy)}
          </span>
        </div>
        <div className="mr-auto min-w-0">
          <p className="label-caps">Test report</p>
          <h1 className="truncate font-display text-xl font-semibold">{track.title}</h1>
          <p className="text-xs text-muted-foreground">
            {track.subject} · Class {track.standard}
            {track.board ? ` · ${track.board}` : ""} · {track.topics.length} topics
            {track.source === "offline" ? " · built-in question bank" : " · written by AI"}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: Target, label: "Correct", value: `${s.correct}/${s.total}` },
            { icon: Sparkles, label: "To review", value: String(wrong), tone: wrong ? "text-weak" : "text-proficient" },
            { icon: Clock, label: "Time", value: `${s.minutes} min` },
            { icon: MessageSquareQuote, label: "Spoken confidence", value: s.avgConfidence === null ? "—" : fmt2(s.avgConfidence) },
          ].map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="min-w-28 rounded-lg bg-surface-2 px-3 py-2">
              <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Icon className="size-3" aria-hidden /> {label}
              </dt>
              <dd className={`font-mono text-lg tabular ${tone ?? ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button onClick={() => router.push("/student/test")} className={btn}>
            <RotateCcw className="size-3.5" aria-hidden /> Retake
          </button>
          <Link href="/student/create" className={btn}>
            <Plus className="size-3.5" aria-hidden /> New test
          </Link>
          <Link href="/student/create" className={btn}>
            <ArrowLeft className="size-3.5" aria-hidden /> My tests
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <TrackGalaxyPanel track={track} result={result} graph={graph} />
        <div className="flex flex-col gap-4">
          <TopicBreakdown graph={graph} result={result} />
        </div>
      </div>
      <TrackVideoPlan track={track} result={result} />
    </div>
  );
}
