"use client";

import { useState } from "react";
import { ArrowRight, FlaskConical, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { LabMisconception } from "@/lib/lab/physics";
import { cn } from "@/lib/utils";
import { CameraSync } from "./CameraSync";
import { LabScene } from "./LabScene";
import { LAB_SIMS } from "./sims";
import type { LabSim } from "./types";

interface Props {
  mcId: LabMisconception;
  open: boolean;
  onClose: () => void;
}

/** Misconception Lab: "What you said" vs "What really happens", side by side (DESIGN.md §4.2 item 4). */
export default function LabDialog({ mcId, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="h-[min(860px,94dvh)] w-[min(1320px,calc(100vw-24px))] bg-bg" closeLabel="Close lab">
        {open && <LabBody sim={LAB_SIMS[mcId]} />}
      </DialogContent>
    </Dialog>
  );
}

function LabBody({ sim }: { sim: LabSim }) {
  const mc = MISCONCEPTION_BY_ID[sim.mcId];
  const [param, setParam] = useState(sim.control?.initial ?? 0);
  const [sync] = useState(() => new CameraSync(sim.camera, sim.target));
  const c = sim.control;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <header className="flex flex-wrap items-start gap-x-6 gap-y-2 pr-12">
        <div>
          <div className="label-caps flex items-center gap-1.5 text-misconception">
            <FlaskConical className="size-3.5" aria-hidden /> Misconception Lab · {mc.id}
          </div>
          <DialogTitle className="font-display text-xl font-semibold">{sim.title}</DialogTitle>
        </div>
        <DialogDescription className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg border border-weak/25 bg-weak/5 px-2.5 py-1 text-foreground/90">{mc.wrongBelief}</span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="rounded-lg border border-mastered/25 bg-mastered/5 px-2.5 py-1 text-foreground/90">{mc.correctIdea}</span>
        </DialogDescription>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        {c?.kind === "slider" && (
          <label className="flex min-w-[260px] flex-1 items-center gap-3">
            <span className="text-muted-foreground">{c.label}</span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={param}
              onChange={(e) => setParam(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
              aria-valuetext={c.format(param)}
            />
            <span className="w-16 text-right font-mono tabular text-accent">{c.format(param)}</span>
          </label>
        )}
        {c?.kind === "toggle" && (
          <div className="flex items-center gap-2" role="radiogroup" aria-label={c.label}>
            <span className="text-muted-foreground">{c.label}</span>
            {c.options.map((o, i) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={param === i}
                onClick={() => setParam(i)}
                className={cn(
                  "h-7 rounded-md border border-border bg-surface-2 px-2.5 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                  param === i && "border-accent/60 bg-accent/10 text-accent",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        )}
        {!c && <span className="text-muted-foreground">Drag either view to orbit; both cameras move together.</span>}
        <button
          type="button"
          onClick={() => sync.reset(sim.camera, sim.target)}
          className="ml-auto flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Reset view
        </button>
      </div>

      <LabScene sim={sim} param={param} sync={sync} />
    </div>
  );
}
