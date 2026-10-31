"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MiniGalaxy } from "@/components/galaxy";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { buildGalaxyNodes } from "@/lib/galaxy/nodes";
import { CONCEPT_BY_ID, CONCEPTS } from "@/lib/data/concepts";
import { misconceptionsFor } from "@/lib/data/misconceptions";
import { questionsFor, type OptionIndex } from "@/lib/data/questions";
import { useStore, useVirtualNow } from "@/lib/store";
import { cn, fmt2, masteryColor } from "@/lib/utils";

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
      <Practice />
    </Suspense>
  );
}

function Practice() {
  const params = useSearchParams();
  const conceptId = CONCEPT_BY_ID[params.get("concept") ?? ""] ? (params.get("concept") as string) : "C6";
  const concept = CONCEPT_BY_ID[conceptId];
  const questions = questionsFor(conceptId);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<OptionIndex | null>(null);
  const allMastery = useStore((s) => s.mastery);
  const schedule = useStore((s) => s.schedule);
  const activeMcs = useStore((s) => s.student.misconceptions);
  const at = useVirtualNow();
  const router = useRouter();
  const nodes = useMemo(() => buildGalaxyNodes(allMastery, schedule, activeMcs, at), [allMastery, schedule, activeMcs, at]);
  const mastery = allMastery[conceptId];
  const question = questions[qIndex % questions.length];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="panel flex flex-col gap-4 p-4">
        <QuestionCard key={question.id} question={question} selected={selected} onSelect={setSelected} />
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            Question {(qIndex % questions.length) + 1} of {questions.length} for {concept.id}
          </span>
          <button
            type="button"
            onClick={() => {
              setQIndex((i) => i + 1);
              setSelected(null);
            }}
            className="ml-auto rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-foreground transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            Next question →
          </button>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="panel relative h-56 overflow-hidden" aria-label={`Mini galaxy focused on ${concept.id}`}>
          <MiniGalaxy nodes={nodes} focusId={conceptId} onSelect={(id) => router.push(`/student/practice?concept=${id}`)} />
          <span className="label-caps pointer-events-none absolute top-3 left-3">Mini galaxy · {concept.id}</span>
        </section>
        <section className="panel p-4">
          <h2 className="label-caps mb-2">Mastery · {concept.id}</h2>
          <div className="font-mono text-title tabular" style={{ color: masteryColor(mastery.estimated ? null : mastery.p) }}>
            {fmt2(mastery.p)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{concept.summary}</p>
          {concept.prereqs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="text-muted-foreground">Prereqs</span>
              {concept.prereqs.map((p) => (
                <Link key={p} href={`/student/practice?concept=${p}`} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono hover:text-accent">
                  {p}
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="panel p-4">
          <h2 className="label-caps mb-2">Linked misconceptions</h2>
          {misconceptionsFor(conceptId).length === 0 ? (
            <p className="text-xs text-muted-foreground">No catalogued misconception for {concept.id}. Novel ones are detected from your reasoning.</p>
          ) : (
            misconceptionsFor(conceptId).map((m) => (
              <div key={m.id} className="rounded-lg border border-misconception/20 bg-misconception/5 p-2.5 text-xs">
                <span className="font-mono text-misconception">{m.id}</span> {m.wrongBelief}
              </div>
            ))
          )}
        </section>
        <section className="panel p-4">
          <h2 className="label-caps mb-2">Pick a concept</h2>
          <div className="flex flex-wrap gap-1">
            {CONCEPTS.map((c) => (
              <Link
                key={c.id}
                href={`/student/practice?concept=${c.id}`}
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  c.id === conceptId && "bg-accent/15 text-accent",
                )}
              >
                {c.id}
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
