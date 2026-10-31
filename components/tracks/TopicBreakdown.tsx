"use client";

import type { GalaxyGraph } from "@/lib/galaxy/graph";
import type { TrackResult } from "@/lib/tracks/types";
import { masteryBand, masteryColor, pct } from "@/lib/utils";

/** Mastery per topic, grouped by unit, after the test. */
export function TopicBreakdown({ graph, result }: { graph: GalaxyGraph; result: TrackResult }) {
  return (
    <section className="panel p-4" aria-label="Topic mastery">
      <div className="mb-3 flex items-baseline">
        <h2 className="label-caps">Topic mastery</h2>
        <span className="ml-auto text-xs text-muted-foreground">right / asked</span>
      </div>
      <div className="flex flex-col gap-4">
        {graph.chapters.map((u) => {
          const topics = graph.concepts.filter((t) => t.chapter === u.id);
          return (
            <div key={u.id}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: u.color }}>
                <span className="size-1.5 rounded-full" style={{ background: u.color }} /> {u.name}
              </div>
              <ul className="flex flex-col gap-1.5">
                {topics.map((t) => {
                  const s = result.topics[t.id];
                  const color = s?.tested ? masteryColor(s.p) : "var(--muted)";
                  return (
                    <li key={t.id} className="grid grid-cols-[30px_minmax(0,1fr)_88px_52px] items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{t.id}</span>
                      <span className="truncate" title={t.summary || t.name}>
                        {t.name}
                      </span>
                      <span className="relative h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(s?.p ?? 0), background: color, opacity: s?.tested ? 1 : 0.5 }} />
                      </span>
                      <span className="text-right font-mono tabular" style={{ color }} title={s?.tested ? masteryBand(s.p) : "not asked: estimated from prerequisites"}>
                        {s?.tested ? `${s.correct}/${s.attempts}` : "est."}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
