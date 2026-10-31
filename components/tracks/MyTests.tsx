"use client";

import { BarChart3, Play, RotateCcw, Trash2 } from "lucide-react";
import { summary } from "@/lib/tracks/score";
import type { CustomTrack, TrackResult } from "@/lib/tracks/types";
import { masteryColor, pct } from "@/lib/utils";

interface Props {
  tracks: CustomTrack[];
  results: Record<string, TrackResult>;
  onTake: (id: string) => void;
  onReport: (id: string) => void;
  onRemove: (id: string) => void;
}

const iconBtn =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

export function MyTests({ tracks, results, onTake, onReport, onRemove }: Props) {
  return (
    <section className="panel p-4" aria-label="My tests">
      <div className="mb-3 flex items-baseline">
        <h2 className="label-caps">My tests</h2>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular">{tracks.length}</span>
      </div>
      {tracks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Tests you build show up here with your score. Retake one any time, or open its report to replay your mistakes in 3D.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tracks.map((t) => {
            const r = results[t.id];
            const s = r ? summary(r) : null;
            return (
              <li key={t.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-accent/30">
                <span
                  className="flex size-11 items-center justify-center rounded-lg bg-surface-2 font-mono text-sm tabular"
                  style={s ? { color: masteryColor(s.accuracy) } : undefined}
                  aria-label={s ? `Score ${pct(s.accuracy)}` : "Not taken yet"}
                >
                  {s ? pct(s.accuracy) : "—"}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {t.subject} · Class {t.standard}
                    {t.board ? ` · ${t.board}` : ""} · {t.questions.length} Qs · {t.topics.length} topics
                    {t.source === "offline" ? " · built-in bank" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {s && (
                    <button onClick={() => onReport(t.id)} className={iconBtn} aria-label={`Open report for ${t.title}`} title="Report & 3D mistake replay">
                      <BarChart3 className="size-4" aria-hidden />
                    </button>
                  )}
                  <button onClick={() => onTake(t.id)} className={iconBtn} aria-label={`${s ? "Retake" : "Take"} ${t.title}`} title={s ? "Retake" : "Take test"}>
                    {s ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                  </button>
                  <button onClick={() => onRemove(t.id)} className={iconBtn} aria-label={`Delete ${t.title}`} title="Delete">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
