"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Maximize2, Pause, Play } from "lucide-react";
import { KnowledgeGalaxy } from "@/components/galaxy";
import type { GalaxyGraph } from "@/lib/galaxy/graph";
import { oneHop } from "@/lib/galaxy/layout";
import { useStore } from "@/lib/store";
import { mistakesOf, trackNodes } from "@/lib/tracks/score";
import type { CustomTrack, TrackResult } from "@/lib/tracks/types";
import { cn, masteryColor, TOKENS } from "@/lib/utils";
import { MistakeCard } from "./MistakeCard";

const TOUR_MS = 6500;

interface Props {
  track: CustomTrack;
  result: TrackResult;
  graph: GalaxyGraph;
}

/** The test as a 3D galaxy, with a replay that flies to each wrong answer and strikes its topic. */
export function TrackGalaxyPanel({ track, result, graph }: Props) {
  const nodes = useMemo(() => trackNodes(track, result), [track, result]);
  const mistakes = useMemo(() => mistakesOf(track, result), [track, result]);
  const answerByQ = useMemo(() => Object.fromEntries(result.answers.map((a) => [a.questionId, a])), [result]);
  const [idx, setIdx] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const show = (i: number | null) => {
    setIdx(i);
    if (i === null) return setSelectedId(null);
    const m = mistakes[i];
    setSelectedId(m.question.topicId);
    // Let the camera start its flight, then the comet strikes the topic.
    window.setTimeout(() => useStore.getState().triggerFx({ kind: "strike", conceptId: m.question.topicId, misconceptionId: m.question.id }), 350);
  };
  const step = (d: number) => show(idx === null ? 0 : (idx + d + mistakes.length) % mistakes.length);

  useEffect(() => {
    if (!touring || idx === null) return;
    const id = window.setTimeout(() => {
      if (idx + 1 < mistakes.length) return show(idx + 1);
      setTouring(false);
    }, TOUR_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance only when the shown mistake changes
  }, [touring, idx]);

  const highlight = useMemo(() => (selectedId ? new Set(oneHop(selectedId, graph)) : null), [selectedId, graph]);
  const current = idx !== null ? mistakes[idx] : null;
  const unitColor = current ? graph.chapters.find((c) => c.id === graph.byId[current.question.topicId]?.chapter)?.color : undefined;

  return (
    <section className="panel relative min-h-[520px] overflow-hidden" aria-label="3D test map and mistake replay">
      <KnowledgeGalaxy
        nodes={nodes}
        graph={graph}
        selectedId={selectedId}
        onSelect={(id) => {
          setTouring(false);
          const i = id ? mistakes.findIndex((m) => m.question.topicId === id) : -1;
          if (i >= 0) show(i);
          else {
            setIdx(null);
            setSelectedId(id);
          }
        }}
        highlightIds={highlight}
        resetKey={resetKey}
        igniteOnMount
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start gap-3 bg-gradient-to-b from-bg/90 to-transparent p-3 pb-8">
        <div>
          <h2 className="label-caps">Your test in 3D</h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {graph.chapters.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: c.color }} /> {c.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: TOKENS.misconception }} /> wrong answer
            </span>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-end gap-2">
        <button
          onClick={() => {
            setTouring(false);
            show(null);
            setResetKey((k) => k + 1);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/90 px-2.5 py-1.5 text-xs backdrop-blur hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <Maximize2 className="size-3.5" aria-hidden /> Overview
        </button>
        {mistakes.length > 0 && (
          <button
            onClick={() => {
              if (touring) return setTouring(false);
              setTouring(true);
              show(idx ?? 0);
            }}
            aria-pressed={touring}
            className="flex items-center gap-1.5 rounded-lg border border-weak/40 bg-weak/10 px-2.5 py-1.5 text-xs backdrop-blur hover:bg-weak/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {touring ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
            {touring ? "Pause replay" : `Replay ${mistakes.length} mistake${mistakes.length === 1 ? "" : "s"} in 3D`}
          </button>
        )}
        <div className="flex max-w-full flex-wrap gap-1 rounded-lg border border-border bg-surface-2/90 p-1.5 backdrop-blur" aria-label="Every question">
          {track.questions.map((q, i) => {
            const a = answerByQ[q.id];
            const mi = mistakes.findIndex((m) => m.question.id === q.id);
            return (
              <button
                key={q.id}
                onClick={() => {
                  setTouring(false);
                  if (mi >= 0) show(mi);
                  else {
                    setIdx(null);
                    setSelectedId(q.topicId);
                  }
                }}
                title={`Q${i + 1} · ${q.topicId} · ${a?.correct ? "correct" : a?.selectedIndex === null ? "skipped" : "wrong"}`}
                aria-label={`Question ${i + 1}: ${a?.correct ? "correct" : "wrong"}`}
                className={cn(
                  "flex size-6 items-center justify-center rounded font-mono text-[10px] tabular transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                  idx !== null && mi === idx && "ring-2 ring-foreground",
                )}
                style={{ background: a?.correct ? masteryColor(0.8) : a?.selectedIndex === null ? TOKENS.unknown : TOKENS.weak, color: TOKENS.bg }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {current && (
          <MistakeCard
            key={current.question.id}
            mistake={current}
            index={idx ?? 0}
            total={mistakes.length}
            unitColor={unitColor}
            onPrev={() => {
              setTouring(false);
              step(-1);
            }}
            onNext={() => {
              setTouring(false);
              step(1);
            }}
            onClose={() => {
              setTouring(false);
              show(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
