"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SkipForward, Timer } from "lucide-react";
import { ReasoningInput } from "@/components/voice/ReasoningInput";
import type { OptionIndex } from "@/lib/data/questions";
import { makeGraph } from "@/lib/galaxy/graph";
import { makeAnswer } from "@/lib/tracks/score";
import type { CustomTrack, TrackAnswer } from "@/lib/tracks/types";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;

interface Props {
  track: CustomTrack;
  onFinish: (answers: TrackAnswer[], startedAt: number) => void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function TestRunner({ track, onFinish }: Props) {
  const graph = useMemo(() => makeGraph(track.id, track.units, track.topics), [track]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionIndex | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [answers, setAnswers] = useState<TrackAnswer[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const shownAt = useRef(startedAt);

  const q = track.questions[index];
  const topic = graph.byId[q.topicId];
  const unit = graph.chapters.find((c) => c.id === topic?.chapter);
  const last = index === track.questions.length - 1;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const advance = (choice: OptionIndex | null) => {
    const next = [...answers, makeAnswer(q, choice, choice === null ? "" : reasoning, Date.now() - shownAt.current)];
    if (last) return onFinish(next, startedAt);
    setAnswers(next);
    setIndex(index + 1);
    setSelected(null);
    setReasoning("");
    shownAt.current = Date.now();
  };

  // 1-4 / A-D pick an option when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable='true']")) return;
      const k = e.key.toLowerCase();
      const i = ["1", "2", "3", "4"].indexOf(k) >= 0 ? ["1", "2", "3", "4"].indexOf(k) : ["a", "b", "c", "d"].indexOf(k);
      if (i >= 0) setSelected(i as OptionIndex);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const perTopic = useMemo(() => {
    const done: Record<string, number> = {};
    for (const a of answers) {
      const tq = track.questions.find((x) => x.id === a.questionId);
      if (tq) done[tq.topicId] = (done[tq.topicId] ?? 0) + 1;
    }
    return done;
  }, [answers, track.questions]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="panel p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-lg font-semibold">{track.title}</h1>
          <span className="text-xs text-muted-foreground">
            {track.subject} · Class {track.standard}
            {track.board ? ` · ${track.board}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular">
            <Timer className="size-3.5" aria-hidden /> {clock((now - startedAt) / 1000)}
          </span>
          <span className="font-mono text-sm tabular">
            {index + 1} / {track.questions.length}
          </span>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {track.questions.map((x, i) => (
            <span key={x.id} className={cn("h-1.5 flex-1 rounded-full", i < index ? "bg-accent" : i === index ? "bg-accent/40 ring-1 ring-accent" : "bg-surface-2")} />
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="panel flex flex-col gap-4 p-5" aria-label={`Question ${index + 1}`}>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border px-2 py-0.5 font-mono" style={{ borderColor: unit?.color, color: unit?.color }}>
              {q.topicId}
            </span>
            <span className="truncate text-muted-foreground">{topic?.name}</span>
            <span className="ml-auto flex items-center gap-1 text-muted-foreground" aria-label={`Difficulty ${q.difficulty} of 5`}>
              Difficulty
              {[1, 2, 3, 4, 5].map((d) => (
                <span key={d} className={cn("size-1.5 rounded-full", d <= q.difficulty ? "bg-accent" : "bg-surface-2")} />
              ))}
            </span>
          </div>
          <p className="text-base leading-relaxed">{q.stem}</p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={selected === i}
                onClick={() => setSelected(i as OptionIndex)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                  selected === i ? "border-accent bg-accent/10" : "border-border bg-surface-2",
                )}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs", selected === i ? "bg-accent text-bg" : "bg-surface text-muted-foreground")}>
                  {LETTERS[i]}
                </span>
                <span className="pt-0.5">{opt}</span>
              </button>
            ))}
          </div>
          <ReasoningInput
            value={reasoning}
            onChange={setReasoning}
            onSubmit={() => selected !== null && advance(selected)}
            canSubmit={selected !== null}
            compact
            submitLabel={last ? "Finish test" : "Next"}
            placeholder="Optional: say why you picked it, in your own words. “I think it's B because…”"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Keys: 1–4 or A–D to pick · Enter for next</span>
            <button onClick={() => advance(null)} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              Skip <SkipForward className="size-3.5" aria-hidden />
            </button>
          </div>
        </section>

        <aside className="panel p-4" aria-label="Topics in this test">
          <h2 className="label-caps mb-3">Topic map</h2>
          <div className="flex flex-col gap-3">
            {graph.chapters.map((u) => (
              <div key={u.id}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium" style={{ color: u.color }}>
                  <span className="size-1.5 rounded-full" style={{ background: u.color }} /> {u.name}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {graph.concepts
                    .filter((t) => t.chapter === u.id)
                    .map((t) => {
                      const total = track.questions.filter((x) => x.topicId === t.id).length;
                      return (
                        <li key={t.id} className={cn("flex items-center gap-2 rounded px-1.5 py-0.5 text-xs", t.id === q.topicId && "bg-surface-2")}>
                          <span className="w-7 font-mono text-muted-foreground">{t.id}</span>
                          <span className="min-w-0 flex-1 truncate">{t.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground tabular">
                            {perTopic[t.id] ?? 0}/{total}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">No marks are shown until the end. Your 3D report replays every wrong answer.</p>
        </aside>
      </div>
    </div>
  );
}
