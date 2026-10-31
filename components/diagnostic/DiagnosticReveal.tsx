"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Orbit, TrendingDown, TrendingUp } from "lucide-react";
import { KnowledgeGalaxy } from "@/components/galaxy";
import { SeeIn3D } from "@/components/lab/SeeIn3D";
import { MasteryBar } from "@/components/shared/MasteryBar";
import { CHAPTERS, CONCEPTS } from "@/lib/data/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/data/misconceptions";
import type { DiagnosticOutcome } from "@/lib/engine/diagnostic";
import { buildGalaxyNodes } from "@/lib/galaxy/nodes";
import { fmt2 } from "@/lib/utils";

interface Props {
  outcome: DiagnosticOutcome;
  score: number;
  total: number;
  at: number;
}

/** Full-height Galaxy Ignition reveal + summary column (DESIGN.md §3.4). */
export function DiagnosticReveal({ outcome, score, total, at }: Props) {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const nodes = useMemo(() => buildGalaxyNodes(outcome.mastery, outcome.schedule, outcome.misconceptions, at), [outcome, at]);
  const chapters = CHAPTERS.map((ch) => {
    const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
    return { ...ch, mean: cs.reduce((s, c) => s + outcome.mastery[c.id].p, 0) / cs.length };
  }).sort((a, b) => b.mean - a.mean);
  const strongest = chapters[0];
  const weakest = chapters[chapters.length - 1];
  const tested = CONCEPTS.filter((c) => !outcome.mastery[c.id].estimated).length;
  const reveal = (i: number) => ({
    initial: { opacity: 0, x: reduce ? 0 : 12 },
    animate: { opacity: 1, x: 0 },
    // Let Ignition (~4s) carry the moment before the numbers arrive.
    transition: { duration: 0.25, delay: reduce ? 0 : 3.2 + i * 0.15 },
  });

  return (
    <div className="grid h-[calc(100dvh-7.5rem)] min-h-[560px] grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="panel relative min-h-[360px] overflow-hidden" aria-label="Galaxy reveal">
        <KnowledgeGalaxy nodes={nodes} selectedId={selected} onSelect={setSelected} igniteOnMount />
        <div className="pointer-events-none absolute top-4 left-4">
          <div className="label-caps flex items-center gap-1.5 text-accent">
            <Orbit className="size-3.5" aria-hidden /> Your Knowledge Galaxy
          </div>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {tested} concepts measured, {CONCEPTS.length - tested} estimated from their neighbours (dashed rings).
          </p>
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-3 overflow-y-auto">
        <motion.section {...reveal(0)} className="panel p-4">
          <h2 className="label-caps mb-1">Diagnostic complete</h2>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-title tabular">
              {score}/{total}
            </span>
            <span className="text-sm text-muted-foreground">correct · θ {outcome.theta}</span>
          </div>
        </motion.section>
        <motion.section {...reveal(1)} className="panel grid grid-cols-2 gap-3 p-4 text-sm">
          <div>
            <div className="label-caps mb-1 flex items-center gap-1 text-mastered">
              <TrendingUp className="size-3.5" aria-hidden /> Strongest
            </div>
            <div className="font-medium">{strongest.short === "Elec" ? "Electricity" : strongest.short === "Mag" ? "Magnetism" : strongest.short}</div>
            <div className="font-mono text-xs text-muted-foreground tabular">{fmt2(strongest.mean)}</div>
          </div>
          <div>
            <div className="label-caps mb-1 flex items-center gap-1 text-weak">
              <TrendingDown className="size-3.5" aria-hidden /> Weakest
            </div>
            <div className="font-medium">{weakest.short === "Elec" ? "Electricity" : weakest.short === "Mag" ? "Magnetism" : weakest.short}</div>
            <div className="font-mono text-xs text-muted-foreground tabular">{fmt2(weakest.mean)}</div>
          </div>
        </motion.section>
        <motion.section {...reveal(2)} className="panel flex flex-col gap-2.5 p-4">
          <h2 className="label-caps">Chapter mastery</h2>
          {CHAPTERS.map((ch) => {
            const c = chapters.find((x) => x.id === ch.id)!;
            return <MasteryBar key={ch.id} label={ch.short} value={c.mean} />;
          })}
        </motion.section>
        <motion.section {...reveal(3)} className="panel flex flex-col gap-2 p-4">
          <h2 className="label-caps">Detected misconceptions</h2>
          {outcome.misconceptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">None detected yet. Explaining your answers in practice helps us spot them.</p>
          ) : (
            outcome.misconceptions.map((id) => (
              <div key={id} className="rounded-lg border border-misconception/20 bg-misconception/5 p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-misconception">{id}</span> {MISCONCEPTION_BY_ID[id].label}
                  <SeeIn3D mcId={id} compact className="ml-auto" />
                </div>
                <div className="mt-0.5 text-muted-foreground">{MISCONCEPTION_BY_ID[id].wrongBelief}</div>
              </div>
            ))
          )}
        </motion.section>
        <motion.div {...reveal(4)}>
          <Link
            href="/student"
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-bg transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
          >
            Start your plan <ArrowRight className="size-4" aria-hidden />
          </Link>
        </motion.div>
      </aside>
    </div>
  );
}
