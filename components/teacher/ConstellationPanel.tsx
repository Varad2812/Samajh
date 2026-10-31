"use client";

import { useMemo, useState } from "react";
import { CloudLightning, CornerDownRight } from "lucide-react";
import { ClassConstellation } from "@/components/galaxy";
import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import { misconceptionShareByConcept, stormConcepts, weakestConcepts } from "@/lib/teacher/stats";
import type { StudentRecord } from "@/lib/types";
import { fmt2, masteryColor, pct } from "@/lib/utils";

interface Props {
  roster: StudentRecord[];
  /** Leaderboard filter / weakest-list hover: focus that concept. */
  focusConcept: string | null;
}

/** 3D Class Constellation with a legend and an info card for the selected concept. */
export function ConstellationPanel({ roster, focusConcept }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? focusConcept;
  const all = useMemo(() => weakestConcepts(roster, 34), [roster]);
  const share = useMemo(() => misconceptionShareByConcept(roster), [roster]);
  const storms = useMemo(() => stormConcepts(roster), [roster]);
  const info = selected ? all.find((w) => w.conceptId === selected) : null;

  return (
    <section className="panel relative h-[680px] min-w-0 overflow-hidden" aria-label="Class Constellation">
      <ClassConstellation roster={roster} selectedId={selected} onSelect={setPicked} />

      <div className="pointer-events-none absolute top-3 left-3 flex max-w-[300px] flex-col gap-1.5 rounded-lg border border-border bg-surface/85 p-3 text-xs backdrop-blur">
        <h2 className="label-caps">Class Constellation</h2>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg, var(--weak), var(--developing), var(--proficient), var(--mastered))" }} />
          node colour = class mean
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-3 w-1 rounded-full bg-misconception" /> pillar height = % holding a misconception
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <CloudLightning className="size-3.5 text-misconception" aria-hidden /> storms over {storms.join(", ") || "none"}
        </span>
      </div>

      {info ? (
        <div className="absolute bottom-3 left-3 flex w-[300px] flex-col gap-1.5 rounded-lg border border-border bg-surface/90 p-3 text-xs backdrop-blur">
          <div className="flex items-baseline gap-2">
            <span className="font-mono" style={{ color: masteryColor(info.mean) }}>{info.conceptId}</span>
            <span className="truncate text-sm">{CONCEPT_BY_ID[info.conceptId].name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-surface-2 py-1">
              <div className="font-mono text-sm tabular" style={{ color: masteryColor(info.mean) }}>{fmt2(info.mean)}</div>
              <div className="text-[10px] text-muted-foreground">class mean</div>
            </div>
            <div className="rounded-md bg-surface-2 py-1">
              <div className="font-mono text-sm text-misconception tabular">{pct(share[info.conceptId])}</div>
              <div className="text-[10px] text-muted-foreground">misconception</div>
            </div>
            <div className="rounded-md bg-surface-2 py-1">
              <div className="font-mono text-sm tabular">{info.weakCount}/{roster.length}</div>
              <div className="text-[10px] text-muted-foreground">below .40</div>
            </div>
          </div>
          {info.misconceptions.map((m) => (
            <div key={m.id} className="text-muted-foreground">
              <span className="font-mono text-misconception">{m.id}</span> {MISCONCEPTION_BY_ID[m.id].label} · {m.count} students
            </div>
          ))}
          {info.rootCause && (
            <div className="flex items-center gap-1 text-developing">
              <CornerDownRight className="size-3" aria-hidden /> root cause: <span className="font-mono">{info.rootCause}</span> {CONCEPT_BY_ID[info.rootCause].name}
            </div>
          )}
        </div>
      ) : (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-surface/80 px-3 py-2 text-xs text-muted-foreground">Click a star for class detail · drag to orbit</p>
      )}
    </section>
  );
}
